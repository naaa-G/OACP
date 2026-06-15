"""HTTP client for the OACP reference server."""

from __future__ import annotations

import asyncio
import time
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlencode, urljoin

import httpx

from oacp_sdk.defaults import PROTOCOL_VERSION
from oacp_sdk.errors import ClientError, ClientErrorCode

DEFAULT_TIMEOUT_S = 30.0
DEFAULT_POLL_INTERVAL_S = 0.1


@dataclass(frozen=True)
class TaskResult:
    status: str
    request: dict[str, Any]
    output: dict[str, Any] | None = None
    error: dict[str, Any] | None = None
    response: dict[str, Any] | None = None


@dataclass(frozen=True)
class WorkflowRunResult:
    ok: bool
    run_id: str
    trace_id: str
    workflow_id: str
    steps: list[dict[str, Any]]
    output: dict[str, Any] | None = None
    error: dict[str, Any] | None = None


def create_agent_client(base_url: str, **kwargs: Any) -> AgentClient:
    """Factory for {@link AgentClient}."""
    return AgentClient(base_url, **kwargs)


def _encode_agent_path(agent_id: str) -> str:
    from urllib.parse import quote

    short_id = agent_id.removeprefix('agent://')
    return quote(short_id, safe='')


def _utc_now() -> str:
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'


class AgentClient:
    """Enterprise HTTP client mirroring `@oacp/sdk` `AgentClient`."""

    def __init__(
        self,
        base_url: str,
        *,
        timeout_s: float = DEFAULT_TIMEOUT_S,
        headers: dict[str, str] | None = None,
        client: httpx.AsyncClient | None = None,
        max_retries: int = 3,
    ) -> None:
        self._base_url = base_url.rstrip('/')
        self._timeout_s = timeout_s
        self._headers = headers or {}
        self._max_retries = max_retries
        self._client = client
        self._owns_client = client is None

    @property
    def server_url(self) -> str:
        return self._base_url

    async def __aenter__(self) -> AgentClient:
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=self._timeout_s)
            self._owns_client = True
        return self

    async def __aexit__(self, *args: object) -> None:
        await self.close()

    async def close(self) -> None:
        if self._client is not None and self._owns_client:
            await self._client.aclose()
            self._client = None

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=self._timeout_s)
            self._owns_client = True
        return self._client

    async def health(self) -> dict[str, Any]:
        result = await self._request('GET', '/health')
        if not isinstance(result, dict):
            raise ClientError(ClientErrorCode.INVALID_RESPONSE, 'Empty health response')
        return result

    async def register_agent(
        self,
        identity: dict[str, Any],
        *,
        replace: bool = False,
    ) -> dict[str, Any]:
        result = await self._request(
            'POST',
            '/agents',
            json={'identity': identity, 'replace': replace},
        )
        if not isinstance(result, dict) or 'agent' not in result:
            raise ClientError(ClientErrorCode.INVALID_RESPONSE, 'Empty register response')
        agent = result['agent']
        if not isinstance(agent, dict):
            raise ClientError(ClientErrorCode.INVALID_RESPONSE, 'Invalid register response')
        return agent

    async def list_agents(
        self,
        *,
        capability: str | None = None,
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        query: dict[str, str | int] = {}
        if capability is not None:
            query['capability'] = capability
        if limit is not None:
            query['limit'] = limit
        result = await self._request('GET', '/agents', params=query or None)
        if not isinstance(result, dict) or 'agents' not in result:
            raise ClientError(ClientErrorCode.INVALID_RESPONSE, 'Empty agents list response')
        agents = result['agents']
        if not isinstance(agents, list):
            raise ClientError(ClientErrorCode.INVALID_RESPONSE, 'Invalid agents list')
        return agents

    async def find_agents_by_capability(
        self,
        capability: str,
        *,
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        from urllib.parse import quote

        path = f'/capabilities/{quote(capability, safe="")}/agents'
        params = {'limit': limit} if limit is not None else None
        result = await self._request('GET', path, params=params)
        if not isinstance(result, dict) or 'agents' not in result:
            raise ClientError(
                ClientErrorCode.INVALID_RESPONSE,
                'Empty capability discovery response',
            )
        agents = result['agents']
        if not isinstance(agents, list):
            raise ClientError(ClientErrorCode.INVALID_RESPONSE, 'Invalid discovery response')
        return agents

    async def get_agent(self, agent_id: str) -> dict[str, Any]:
        result = await self._request('GET', f'/agent/{_encode_agent_path(agent_id)}')
        if not isinstance(result, dict) or 'agent' not in result:
            raise ClientError(ClientErrorCode.INVALID_RESPONSE, 'Empty agent lookup response')
        agent = result['agent']
        if not isinstance(agent, dict):
            raise ClientError(ClientErrorCode.INVALID_RESPONSE, 'Invalid agent lookup response')
        return agent

    async def send_message(self, message: dict[str, Any]) -> dict[str, Any]:
        result = await self._request('POST', '/send-message', json=message)
        if not isinstance(result, dict):
            raise ClientError(ClientErrorCode.INVALID_RESPONSE, 'Empty send response')
        return result

    async def receive_message(
        self,
        agent_id: str,
        *,
        timeout_ms: int = 5_000,
    ) -> dict[str, Any] | None:
        result = await self._request(
            'GET',
            f'/agent/{_encode_agent_path(agent_id)}/messages',
            params={'timeoutMs': timeout_ms},
            timeout_s=timeout_ms / 1000 + self._timeout_s,
        )
        if result is None:
            return None
        if not isinstance(result, dict) or 'message' not in result:
            return None
        message = result['message']
        return message if isinstance(message, dict) else None

    async def send_task(
        self,
        *,
        from_agent: str,
        capability: str,
        input_data: dict[str, Any],
        to: str | None = None,
        trace_id: str | None = None,
        wait_for_response: bool = True,
        response_timeout_s: float | None = None,
        poll_interval_s: float = DEFAULT_POLL_INTERVAL_S,
    ) -> TaskResult:
        message_id = str(uuid.uuid4())
        request: dict[str, Any] = {
            'version': PROTOCOL_VERSION,
            'type': 'task_request',
            'message_id': message_id,
            'trace_id': trace_id or str(uuid.uuid4()),
            'timestamp': _utc_now(),
            'from': from_agent,
            'capability': capability,
            'input': input_data,
        }
        if to is not None:
            request['to'] = to

        await self.send_message(request)

        if not wait_for_response:
            return TaskResult(status='success', request=request)

        response = await self._wait_for_task_response(
            from_agent,
            message_id,
            response_timeout_s or self._timeout_s,
            poll_interval_s,
        )
        status = response.get('status', 'success')
        output = response.get('output')
        error = response.get('error')
        return TaskResult(
            status=str(status),
            request=request,
            output=output if isinstance(output, dict) else None,
            error=error if isinstance(error, dict) else None,
            response=response,
        )

    async def run_workflow(
        self,
        workflow_id: str,
        input_data: dict[str, Any] | None = None,
    ) -> WorkflowRunResult:
        from urllib.parse import quote

        response = await self._request(
            'POST',
            f'/workflows/{quote(workflow_id, safe="")}/run',
            json={'input': input_data or {}},
        )
        if not isinstance(response, dict):
            raise ClientError(
                ClientErrorCode.INVALID_RESPONSE,
                f'Empty workflow run response for "{workflow_id}"',
            )
        result = response.get('result')
        if not isinstance(result, dict):
            raise ClientError(
                ClientErrorCode.INVALID_RESPONSE,
                f'Empty workflow run response for "{workflow_id}"',
            )
        steps = result.get('steps', [])
        if not isinstance(steps, list):
            steps = []
        output = result.get('output')
        error = result.get('error')
        return WorkflowRunResult(
            ok=bool(result.get('ok')),
            run_id=str(result.get('runId', '')),
            trace_id=str(result.get('traceId', '')),
            workflow_id=str(result.get('workflowId', workflow_id)),
            steps=steps,
            output=output if isinstance(output, dict) else None,
            error=error if isinstance(error, dict) else None,
        )

    async def _wait_for_task_response(
        self,
        agent_id: str,
        request_message_id: str,
        timeout_s: float,
        poll_interval_s: float,
    ) -> dict[str, Any]:
        deadline = time.monotonic() + timeout_s
        while time.monotonic() < deadline:
            remaining = deadline - time.monotonic()
            wait_ms = min(max(int(remaining * 1000), int(poll_interval_s * 1000)), 5000)
            message = await self.receive_message(agent_id, timeout_ms=wait_ms)
            if (
                isinstance(message, dict)
                and message.get('type') == 'task_response'
                and message.get('in_reply_to') == request_message_id
            ):
                return message
            if remaining <= 0:
                break
            await asyncio.sleep(poll_interval_s)
        raise ClientError(
            ClientErrorCode.RESPONSE_TIMEOUT,
            f'Timed out waiting for task_response to "{request_message_id}"',
        )

    async def _request(
        self,
        method: str,
        path: str,
        *,
        json: dict[str, Any] | None = None,
        params: dict[str, str | int] | None = None,
        timeout_s: float | None = None,
    ) -> Any:
        url = urljoin(self._base_url + '/', path.lstrip('/'))
        if params:
            url = f'{url}?{urlencode(params)}'
        headers = {'Accept': 'application/json', **self._headers}
        if json is not None:
            headers['Content-Type'] = 'application/json'

        last_error: Exception | None = None
        for attempt in range(self._max_retries + 1):
            try:
                client = self._get_client()
                response = await client.request(
                    method,
                    url,
                    json=json,
                    headers=headers,
                    timeout=timeout_s or self._timeout_s,
                )
                if response.status_code >= 400:
                    body: Any = None
                    try:
                        body = response.json()
                    except ValueError:
                        body = None
                    raise self._map_server_error(response.status_code, body)
                if response.status_code == 204 or not response.content:
                    return None
                return response.json()
            except ClientError:
                raise
            except httpx.HTTPError as exc:
                last_error = exc
                if attempt >= self._max_retries:
                    break
                await asyncio.sleep(0.05 * (2**attempt))
        raise ClientError(
            ClientErrorCode.TRANSPORT_ERROR,
            str(last_error) if last_error else 'Transport error',
        )

    @staticmethod
    def _map_server_error(status: int, body: Any) -> ClientError:
        message = f'HTTP {status}'
        code = ClientErrorCode.SERVER_ERROR
        if isinstance(body, dict) and isinstance(body.get('error'), dict):
            err = body['error']
            message = str(err.get('message', message))
            if status == 400:
                code = ClientErrorCode.VALIDATION_FAILED
            elif status == 404:
                code = (
                    ClientErrorCode.AGENT_NOT_FOUND
                    if err.get('code') == 'SERVER_AGENT_NOT_FOUND'
                    else ClientErrorCode.ROUTING_FAILED
                )
        return ClientError(code, message, status_code=status)
