"""AutoGen tool factories."""

from __future__ import annotations

import re
from collections.abc import Awaitable, Callable
from typing import Any

from oacp_sdk.client import AgentClient

from oacp_autogen.execute import execute_oacp_capability_task


def capability_to_tool_name(capability: str) -> str:
    """Normalize capability strings into safe function/tool names."""
    return re.sub(r'[^a-zA-Z0-9]+', '_', capability).strip('_')


def create_oacp_callable(
    client: AgentClient,
    *,
    from_agent: str,
    capability: str,
    to: str | None = None,
) -> Callable[..., Awaitable[dict[str, Any]]]:
    """Return an async callable AutoGen (or any orchestrator) can invoke."""

    async def _delegate(**kwargs: Any) -> dict[str, Any]:
        return await execute_oacp_capability_task(
            client,
            from_agent=from_agent,
            capability=capability,
            input_data=dict(kwargs),
            to=to,
        )

    _delegate.__name__ = capability_to_tool_name(capability)
    _delegate.__doc__ = f'Delegate to OACP capability "{capability}".'
    return _delegate


def create_autogen_function_tool(
    client: AgentClient,
    *,
    from_agent: str,
    capability: str,
    description: str | None = None,
    to: str | None = None,
) -> Any:
    """Wrap an OACP capability as an AutoGen ``FunctionTool`` (requires optional deps).

    Install with: ``pip install "oacp-autogen[autogen]"``
    """
    try:
        from autogen_core.tools import FunctionTool
    except ImportError as exc:  # pragma: no cover - optional dependency
        raise ImportError(
            'AutoGen is not installed. Run: pip install "oacp-autogen[autogen]"',
        ) from exc

    delegate = create_oacp_callable(
        client,
        from_agent=from_agent,
        capability=capability,
        to=to,
    )
    return FunctionTool(
        delegate,
        description=description or f'Delegate work to OACP capability "{capability}".',
        name=capability_to_tool_name(capability),
    )
