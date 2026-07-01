"""Unit tests for observability snapshot validation (Day 15)."""

import pytest

from oacp_sdk.observability import (
    ObservabilitySnapshotError,
    assert_console_trace_url,
    assert_mcplab_console_snapshot,
    validate_mcplab_console_loop,
)


def _sample_snapshot(trace_id: str, agent_count: int = 5) -> dict:
    roles = ['coordinator', 'planner', 'researcher', 'synthesizer', 'publisher']
    agents = [
        {
            'id': f'agent://mcplab-{role}-crew-demo',
            'name': f'{role.title()} (crew demo)',
            'fleet': 'mcplab',
            'role': role,
            'status': 'active',
        }
        for role in roles[:agent_count]
    ]
    agent_ids = [row['id'] for row in agents]
    return {
        'server': {
            'status': 'healthy',
            'protocol_version': '1.0',
            'registered_agents': agent_count,
            'bus_open': True,
        },
        'agents': agents,
        'traces': [
            {
                'traceId': trace_id,
                'startedAt': '2026-06-20T00:00:00.000Z',
                'lastActivityAt': '2026-06-20T00:01:00.000Z',
                'messageCount': 2,
                'messageTypes': ['task_request', 'task_response'],
                'agents': agent_ids,
            }
        ],
        'trace_count': 1,
        'active_trace': {
            'trace_id': trace_id,
            'started_at': '2026-06-20T00:00:00.000Z',
            'last_activity_at': '2026-06-20T00:01:00.000Z',
            'message_count': 2,
            'message_types': ['task_request', 'task_response'],
            'agents': agent_ids,
            'timeline': [
                {
                    'index': 0,
                    'timestamp': '2026-06-20T00:00:10.000Z',
                    'type': 'task_request',
                    'from': agent_ids[0],
                    'to': agent_ids[1],
                    'message_id': 'msg-1',
                    'summary': 'task_request',
                }
            ],
        },
        'agent_links': [],
    }


def test_assert_console_trace_url_accepts_showcase_link() -> None:
    trace_id = 'ecced9aa-1111-2222-3333-444455556666'
    url = f'http://127.0.0.1:3001/console/?trace_id={trace_id}&mode=showcase'
    assert_console_trace_url(url, trace_id=trace_id)


def test_assert_console_trace_url_rejects_playground_only_path() -> None:
    with pytest.raises(ObservabilitySnapshotError):
        assert_console_trace_url(
            'http://127.0.0.1:3001/playground?trace_id=abc&mode=showcase',
            trace_id='abc',
        )


def test_assert_mcplab_console_snapshot_passes_research_crew_shape() -> None:
    trace_id = 'ecced9aa-1111-2222-3333-444455556666'
    assert_mcplab_console_snapshot(_sample_snapshot(trace_id), trace_id)


def test_assert_mcplab_console_snapshot_requires_timeline() -> None:
    trace_id = 'ecced9aa-1111-2222-3333-444455556666'
    snapshot = _sample_snapshot(trace_id)
    snapshot['active_trace']['timeline'] = []

    with pytest.raises(ObservabilitySnapshotError, match='timeline'):
        assert_mcplab_console_snapshot(snapshot, trace_id)


def test_assert_mcplab_console_snapshot_requires_five_registered_agents() -> None:
    trace_id = 'ecced9aa-1111-2222-3333-444455556666'
    snapshot = _sample_snapshot(trace_id, agent_count=3)

    with pytest.raises(ObservabilitySnapshotError, match='at least 5'):
        assert_mcplab_console_snapshot(snapshot, trace_id, min_mcplab_agents=5)


def test_validate_mcplab_console_loop_with_mock_transport(monkeypatch: pytest.MonkeyPatch) -> None:
    trace_id = 'ecced9aa-1111-2222-3333-444455556666'
    snapshot = _sample_snapshot(trace_id)

    def fake_fetch(base_url: str, **kwargs):  # type: ignore[no-untyped-def]
        assert kwargs['trace_id'] == trace_id
        assert kwargs['require_v1'] is True
        return snapshot

    monkeypatch.setattr('oacp_sdk.observability.fetch_observability_snapshot', fake_fetch)

    result = validate_mcplab_console_loop(
        'http://127.0.0.1:3001',
        trace_id,
        console_base_url='http://127.0.0.1:5173',
        min_mcplab_agents=5,
    )
    assert result['active_trace']['trace_id'] == trace_id
