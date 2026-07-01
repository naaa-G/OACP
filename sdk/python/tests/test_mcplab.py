"""Tests for MCPLab metadata helpers."""

from oacp_sdk.mcplab import build_mcplab_identity, build_mcplab_metadata


def test_build_mcplab_metadata() -> None:
    assert build_mcplab_metadata('planner') == {'fleet': 'mcplab', 'role': 'planner'}


def test_build_mcplab_identity_includes_metadata() -> None:
    identity = build_mcplab_identity(
        agent_id='agent://mcplab-planner',
        name='Planner',
        capabilities=['plan'],
        role='planner',
    )
    assert identity['metadata'] == {'fleet': 'mcplab', 'role': 'planner'}
