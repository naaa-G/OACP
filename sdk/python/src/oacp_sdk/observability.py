"""Observability snapshot helpers for MCPLab × Console integration (Day 15)."""

from __future__ import annotations

from typing import Any, Mapping

import httpx

from oacp_sdk.errors import ClientError, ClientErrorCode
from oacp_sdk.mcplab import MCPLAB_FLEET, console_trace_url

OBSERVABILITY_SNAPSHOT_PATH = '/v1/observability/snapshot'
LEGACY_PLAYGROUND_SNAPSHOT_PATH = '/playground/snapshot'


class ObservabilitySnapshotError(ClientError):
    """Raised when snapshot fetch or MCPLab validation fails."""

    def __init__(self, message: str, *, status_code: int | None = None) -> None:
        super().__init__(
            ClientErrorCode.VALIDATION_FAILED,
            message,
            status_code=status_code,
        )


def _normalize_base_url(base_url: str) -> str:
    return base_url.rstrip('/')


def fetch_observability_snapshot(
    base_url: str,
    *,
    trace_id: str | None = None,
    limit: int = 25,
    timeout: float = 30.0,
    client: httpx.Client | None = None,
    require_v1: bool = True,
) -> dict[str, Any]:
    """
    Fetch ``GET /v1/observability/snapshot`` and return the ``snapshot`` object.

    When ``require_v1`` is False, falls back to ``/playground/snapshot`` on HTTP 404
    (older MCPLab Docker images).
    """
    origin = _normalize_base_url(base_url)
    params: dict[str, str | int] = {'limit': limit}
    if trace_id is not None:
        params['trace_id'] = trace_id

    owns_client = client is None
    http = client if client is not None else httpx.Client(timeout=timeout)

    try:
        response = http.get(f'{origin}{OBSERVABILITY_SNAPSHOT_PATH}', params=params)
        if response.status_code == 404 and not require_v1:
            response = http.get(f'{origin}{LEGACY_PLAYGROUND_SNAPSHOT_PATH}', params=params)

        if response.status_code != 200:
            raise ObservabilitySnapshotError(
                f'Snapshot request failed (HTTP {response.status_code})',
                status_code=response.status_code,
            )

        body = response.json()
        if not isinstance(body, Mapping) or body.get('ok') is not True:
            raise ObservabilitySnapshotError(
                'Snapshot envelope missing ok=true',
                status_code=response.status_code,
            )

        snapshot = body.get('snapshot')
        if not isinstance(snapshot, Mapping):
            raise ObservabilitySnapshotError(
                'Snapshot body missing snapshot object',
                status_code=response.status_code,
            )

        return dict(snapshot)
    finally:
        if owns_client:
            http.close()


def assert_console_trace_url(
    url: str,
    *,
    trace_id: str,
    mode: str = 'showcase',
    require_console_path: bool = True,
) -> None:
    """Validate MCPLab Console deep-link format (Day 12 + Day 15)."""
    if require_console_path and '/console/' not in url and not url.rstrip('/').endswith('/console'):
        raise ObservabilitySnapshotError(f'Console URL missing /console/ path: {url}')

    if f'trace_id={trace_id}' not in url:
        raise ObservabilitySnapshotError(f'Console URL missing trace_id={trace_id}: {url}')

    if f'mode={mode}' not in url:
        raise ObservabilitySnapshotError(f'Console URL missing mode={mode}: {url}')


def assert_mcplab_console_snapshot(
    snapshot: Mapping[str, Any],
    trace_id: str,
    *,
    min_agents_in_trace: int = 2,
    min_mcplab_agents: int = 5,
    min_timeline_messages: int = 1,
) -> None:
    """
    Assert snapshot contract for MCPLab full-loop / Console verification (Day 15).

    ``min_mcplab_agents`` — registered agents visible in Console (fleet=mcplab).
    ``min_agents_in_trace`` — participants in the active trace roster or timeline.
    """
    server = snapshot.get('server')
    if not isinstance(server, Mapping) or server.get('status') != 'healthy':
        raise ObservabilitySnapshotError('Snapshot server.status must be healthy')

    agents = snapshot.get('agents')
    if not isinstance(agents, list):
        raise ObservabilitySnapshotError('Snapshot agents must be an array')

    active_trace = snapshot.get('active_trace')
    if not isinstance(active_trace, Mapping):
        raise ObservabilitySnapshotError('active_trace required when validating trace_id')

    if active_trace.get('trace_id') != trace_id:
        raise ObservabilitySnapshotError(
            f'active_trace.trace_id mismatch: expected {trace_id}, got {active_trace.get("trace_id")}',
        )

    trace_agents = active_trace.get('agents')
    if not isinstance(trace_agents, list):
        trace_agents = []

    timeline = active_trace.get('timeline')
    if not isinstance(timeline, list) or len(timeline) < min_timeline_messages:
        raise ObservabilitySnapshotError(
            f'active_trace.timeline must include at least {min_timeline_messages} message(s)',
        )

    participants: set[str] = set(trace_agents)
    for event in timeline:
        if not isinstance(event, Mapping):
            continue
        sender = event.get('from')
        if isinstance(sender, str) and sender:
            participants.add(sender)
        recipient = event.get('to')
        if isinstance(recipient, str) and recipient:
            participants.add(recipient)

    if len(participants) < min_agents_in_trace:
        raise ObservabilitySnapshotError(
            f'active trace must include at least {min_agents_in_trace} participating agent(s)',
        )

    mcplab_agents = [
        row
        for row in agents
        if isinstance(row, Mapping) and row.get('fleet') == MCPLAB_FLEET
    ]
    if len(mcplab_agents) < min_mcplab_agents:
        raise ObservabilitySnapshotError(
            f'Expected at least {min_mcplab_agents} MCPLab agents with fleet={MCPLAB_FLEET!r}',
        )

    for row in mcplab_agents:
        if not row.get('role'):
            agent_id = row.get('id', '<unknown>')
            raise ObservabilitySnapshotError(f'MCPLab agent {agent_id} missing role')


def validate_mcplab_console_loop(
    server_url: str,
    trace_id: str,
    *,
    console_base_url: str | None = None,
    min_mcplab_agents: int = 5,
    min_trace_participants: int = 2,
    timeout: float = 30.0,
) -> dict[str, Any]:
    """
    End-to-end MCPLab Console loop validation: deep link + v1 snapshot contract.

    Returns the snapshot dict on success.
    """
    console_origin = console_base_url or server_url
    url = console_trace_url(console_origin, trace_id)
    assert_console_trace_url(url, trace_id=trace_id)

    snapshot = fetch_observability_snapshot(
        server_url,
        trace_id=trace_id,
        timeout=timeout,
        require_v1=True,
    )
    assert_mcplab_console_snapshot(
        snapshot,
        trace_id,
        min_agents_in_trace=min_trace_participants,
        min_mcplab_agents=min_mcplab_agents,
    )
    return snapshot
