"""Test helpers for mocking OACP HTTP client polling (dev/test use only)."""

from __future__ import annotations

from contextlib import contextmanager
from typing import Any, Iterator
from unittest.mock import patch
from urllib.parse import quote

from oacp_sdk.defaults import PROTOCOL_VERSION

FIXED_MESSAGE_ID = 'msg-1'
FIXED_TRACE_ID = 'trace-1'
DEFAULT_BASE_URL = 'http://127.0.0.1:3999'


class _FixedUuid:
    __slots__ = ('_value',)

    def __init__(self, value: str) -> None:
        self._value = value

    def __str__(self) -> str:
        return self._value


@contextmanager
def fixed_oacp_message_ids(
    message_id: str = FIXED_MESSAGE_ID,
    trace_id: str = FIXED_TRACE_ID,
) -> Iterator[None]:
    """Pin task_request IDs so mocked task_response.in_reply_to matches send_task()."""
    with patch(
        'oacp_sdk.client.uuid.uuid4',
        side_effect=[_FixedUuid(message_id), _FixedUuid(trace_id)],
    ):
        yield


def agent_messages_url(base_url: str, agent_id: str) -> str:
    short_id = agent_id.removeprefix('agent://')
    return f'{base_url.rstrip("/")}/agent/{quote(short_id, safe="")}/messages?timeoutMs=5000'


def register_send_task_exchange(
    httpx_mock: Any,
    *,
    base_url: str = DEFAULT_BASE_URL,
    from_agent: str,
    message_id: str = FIXED_MESSAGE_ID,
    trace_id: str = FIXED_TRACE_ID,
    task_status: str = 'success',
    output: dict[str, Any] | None = None,
    error: dict[str, Any] | None = None,
) -> None:
    """Register POST send-message + reusable GET poll for task_response."""
    httpx_mock.add_response(
        method='POST',
        url=f'{base_url.rstrip("/")}/send-message',
        json={
            'ok': True,
            'message_id': message_id,
            'trace_id': trace_id,
            'type': 'task_request',
            'recipients': ['agent://worker'],
        },
    )

    message: dict[str, Any] = {
        'type': 'task_response',
        'version': PROTOCOL_VERSION,
        'message_id': 'resp-1',
        'trace_id': trace_id,
        'from': 'agent://worker',
        'timestamp': '2026-01-01T00:00:00.000Z',
        'in_reply_to': message_id,
        'status': task_status,
    }
    if output is not None:
        message['output'] = output
    if error is not None:
        message['error'] = error

    httpx_mock.add_response(
        method='GET',
        url=agent_messages_url(base_url, from_agent),
        json={'ok': True, 'message': message},
        is_reusable=True,
    )
