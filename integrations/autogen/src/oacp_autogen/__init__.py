"""OACP AutoGen adapter — bridge AutoGen agents to OACP capabilities."""

from oacp_autogen.errors import OacpTaskError
from oacp_autogen.execute import execute_oacp_capability_task
from oacp_autogen.tool import capability_to_tool_name, create_oacp_callable, create_autogen_function_tool

__all__ = [
    'OacpTaskError',
    'capability_to_tool_name',
    'create_autogen_function_tool',
    'create_oacp_callable',
    'execute_oacp_capability_task',
]

__version__ = '1.0.0'
