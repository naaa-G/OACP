"""
MCPLab full-loop integration test (Day 15).

Reference implementation for ``MCPLab/tests/integration/test_full_loop.py``.
MCPLab crews should import ``validate_mcplab_console_loop`` from ``oacp_sdk`` after
running a research crew and assert the Console deep link + v1 snapshot contract.

Live run (MCPLab Docker on :3001 or local server):

```bash
export MCPLAB_OACP_SERVER_URL=http://127.0.0.1:3001
export MCPLAB_FULL_LOOP_TRACE_ID=<uuid-from-crew-run>
pytest sdk/python/tests/integration/test_full_loop.py -m integration -v
```

When ``MCPLAB_FULL_LOOP_TRACE_ID`` is unset, the test seeds a synthetic MCPLab-like
trace against the live server (requires write access to ``POST /agents``).
"""

from __future__ import annotations

import os
import uuid

import httpx
import pytest

from oacp_sdk import (
    build_mcplab_identity,
    console_trace_url,
    validate_mcplab_console_loop,
)
from oacp_sdk.defaults import PROTOCOL_VERSION

pytestmark = pytest.mark.integration

MCPLAB_RESEARCH_ROLES = (
    'coordinator',
    'planner',
    'researcher',
    'synthesizer',
    'publisher',
)


def _server_url() -> str:
    return os.environ.get('MCPLAB_OACP_SERVER_URL') or os.environ['OACP_SERVER_URL']


def _console_base_url(server_url: str) -> str | None:
    return os.environ.get('MCPLAB_OACP_CONSOLE_URL')


def _seed_mcplab_research_trace(server_url: str, trace_id: str) -> None:
    """Register five MCPLab agents and emit one task_request (dev server / Docker)."""
    with httpx.Client(base_url=server_url.rstrip('/'), timeout=30.0) as client:
        for role in MCPLAB_RESEARCH_ROLES:
            identity = build_mcplab_identity(
                agent_id=f'agent://mcplab-{role}-full-loop',
                name=f'{role.title()} (full loop)',
                capabilities=[role],
                role=role,
            )
            response = client.post('/agents', json={'identity': identity})
            assert response.status_code == 200, response.text

        coordinator = f'agent://mcplab-{MCPLAB_RESEARCH_ROLES[0]}-full-loop'
        planner = f'agent://mcplab-{MCPLAB_RESEARCH_ROLES[1]}-full-loop'
        payload = {
            'type': 'task_request',
            'version': PROTOCOL_VERSION,
            'message_id': str(uuid.uuid4()),
            'trace_id': trace_id,
            'from': coordinator,
            'to': planner,
            'timestamp': '2026-06-20T00:00:00.000Z',
            'capability': 'plan',
            'input': {'goal': 'MCPLab full-loop integration test'},
            'deadline_ms': 30_000,
        }
        response = client.post('/send-message', json=payload)
        assert response.status_code == 200, response.text


@pytest.mark.integration
def test_full_loop_console_snapshot_contract() -> None:
    server_url = _server_url()
    trace_id = os.environ.get('MCPLAB_FULL_LOOP_TRACE_ID')

    if trace_id is None:
        trace_id = str(uuid.uuid4())
        _seed_mcplab_research_trace(server_url, trace_id)

    console_url = console_trace_url(_console_base_url(server_url) or server_url, trace_id)
    assert '/console/' in console_url
    assert 'mode=showcase' in console_url

    snapshot = validate_mcplab_console_loop(
        server_url,
        trace_id,
        console_base_url=_console_base_url(server_url),
        min_mcplab_agents=5,
    )

    assert snapshot['server']['status'] == 'healthy'
    mcplab_rows = [row for row in snapshot['agents'] if row.get('fleet') == 'mcplab']
    assert len(mcplab_rows) >= 5
