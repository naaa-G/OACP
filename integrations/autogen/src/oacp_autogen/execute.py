"""Framework-agnostic OACP task execution."""

from __future__ import annotations

from typing import Any

from oacp_sdk.client import AgentClient

from oacp_autogen.errors import OacpTaskError


async def execute_oacp_capability_task(
    client: AgentClient,
    *,
    from_agent: str,
    capability: str,
    input_data: dict[str, Any],
    to: str | None = None,
    trace_id: str | None = None,
    response_timeout_s: float | None = None,
) -> dict[str, Any]:
    """Execute a remote OACP task and return structured output."""
    kwargs: dict[str, Any] = {
        'from_agent': from_agent,
        'capability': capability,
        'input_data': input_data,
    }
    if to is not None:
        kwargs['to'] = to
    if trace_id is not None:
        kwargs['trace_id'] = trace_id
    if response_timeout_s is not None:
        kwargs['response_timeout_s'] = response_timeout_s

    result = await client.send_task(**kwargs)

    if result.status != 'success':
        error = result.error or {}
        raise OacpTaskError(
            str(error.get('message', f'OACP task "{capability}" failed')),
            code=str(error.get('code', 'OACP_TASK_FAILED')),
            details=list(error.get('details', [])) if isinstance(error.get('details'), list) else None,
        )

    return dict(result.output or {})
