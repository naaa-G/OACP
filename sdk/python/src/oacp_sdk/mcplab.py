"""MCPLab fleet metadata helpers for OACP agent registration (Day 11)."""

from __future__ import annotations

from typing import Any

from oacp_sdk.client import AgentClient
from oacp_sdk.defaults import DEFAULT_DEV_PUBLIC_KEY, PROTOCOL_VERSION

MCPLAB_FLEET = 'mcplab'

MCPLAB_ROLES: tuple[str, ...] = (
    'coordinator',
    'planner',
    'researcher',
    'synthesizer',
    'publisher',
    'deliverer',
    'reviewer',
    'triager',
    'scanner',
    'coder',
    'ops',
    'client',
    'architect',
    'designer',
    'analyst',
    'qa',
)


def build_mcplab_metadata(role: str) -> dict[str, str]:
    """Return registration metadata for MCPLab fleet agents."""
    return {'fleet': MCPLAB_FLEET, 'role': role.strip()}


def build_mcplab_identity(
    *,
    agent_id: str,
    name: str,
    capabilities: list[str],
    role: str,
    description: str | None = None,
    public_key: dict[str, Any] | str | None = None,
) -> dict[str, Any]:
    """Build a fully-tagged MCPLab agent identity for ``POST /agents``."""
    identity: dict[str, Any] = {
        'id': agent_id,
        'name': name,
        'version': PROTOCOL_VERSION,
        'capabilities': capabilities,
        'publicKey': public_key if public_key is not None else DEFAULT_DEV_PUBLIC_KEY,
        'metadata': build_mcplab_metadata(role),
    }
    if description is not None:
        identity['description'] = description
    return identity


async def register_mcplab_agent(
    client: AgentClient,
    *,
    agent_id: str,
    name: str,
    capabilities: list[str],
    role: str,
    description: str | None = None,
    replace: bool = True,
) -> dict[str, Any]:
    """Register an MCPLab fleet agent with fleet + role metadata."""
    return await client.register_agent(
        build_mcplab_identity(
            agent_id=agent_id,
            name=name,
            capabilities=capabilities,
            role=role,
            description=description,
        ),
        replace=replace,
    )


DEFAULT_CONSOLE_GRAPH_MODE = 'showcase'


def console_trace_url(
    server_url: str,
    trace_id: str,
    *,
    mode: str = DEFAULT_CONSOLE_GRAPH_MODE,
) -> str:
    """Build OACP Console deep link for a trace."""
    base = server_url.rstrip('/')
    if base.endswith('/playground'):
        base = base[: -len('/playground')]
    if base.endswith('/console'):
        base = base[: -len('/console')]
    from urllib.parse import urlencode

    query = urlencode({'trace_id': trace_id, 'mode': mode})
    return f'{base}/console/?{query}'


def playground_trace_url(server_url: str, trace_id: str) -> str:
    """Deprecated alias — returns the Console deep link."""
    return console_trace_url(server_url, trace_id)
