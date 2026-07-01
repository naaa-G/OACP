"""OACP Python SDK — minimal HTTP client for @oacp/server."""

from oacp_sdk.client import AgentClient, TaskResult, WorkflowRunResult, create_agent_client
from oacp_sdk.defaults import DEFAULT_DEV_PUBLIC_KEY, PROTOCOL_VERSION
from oacp_sdk.dev_helpers import register_dev_agent
from oacp_sdk.mcplab import (
    MCPLAB_FLEET,
    MCPLAB_ROLES,
    build_mcplab_identity,
    build_mcplab_metadata,
    console_trace_url,
    playground_trace_url,
    register_mcplab_agent,
)
from oacp_sdk.observability import (
    LEGACY_PLAYGROUND_SNAPSHOT_PATH,
    OBSERVABILITY_SNAPSHOT_PATH,
    ObservabilitySnapshotError,
    assert_console_trace_url,
    assert_mcplab_console_snapshot,
    fetch_observability_snapshot,
    validate_mcplab_console_loop,
)
from oacp_sdk.errors import ClientError, ClientErrorCode

__all__ = [
    'AgentClient',
    'ClientError',
    'ClientErrorCode',
    'DEFAULT_DEV_PUBLIC_KEY',
    'PROTOCOL_VERSION',
    'TaskResult',
    'WorkflowRunResult',
    'create_agent_client',
    'register_dev_agent',
    'MCPLAB_FLEET',
    'MCPLAB_ROLES',
    'build_mcplab_identity',
    'build_mcplab_metadata',
    'console_trace_url',
    'playground_trace_url',
    'register_mcplab_agent',
    'LEGACY_PLAYGROUND_SNAPSHOT_PATH',
    'OBSERVABILITY_SNAPSHOT_PATH',
    'ObservabilitySnapshotError',
    'assert_console_trace_url',
    'assert_mcplab_console_snapshot',
    'fetch_observability_snapshot',
    'validate_mcplab_console_loop',
]

__version__ = '1.0.0'
