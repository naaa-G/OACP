"""Dev registration helper."""

from __future__ import annotations

from typing import Any

from oacp_sdk.client import AgentClient
from oacp_sdk.defaults import DEFAULT_DEV_PUBLIC_KEY, PROTOCOL_VERSION


async def register_dev_agent(
    client: AgentClient,
    *,
    agent_id: str,
    name: str,
    capabilities: list[str],
    description: str | None = None,
    replace: bool = True,
) -> dict[str, Any]:
    """Register an agent using the shared development public key.

    Defaults to ``replace=True`` so demo scripts can be re-run idempotently.
    """
    identity: dict[str, Any] = {
        'id': agent_id,
        'name': name,
        'version': PROTOCOL_VERSION,
        'capabilities': capabilities,
        'publicKey': DEFAULT_DEV_PUBLIC_KEY,
    }
    if description is not None:
        identity['description'] = description
    return await client.register_agent(identity, replace=replace)
