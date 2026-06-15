# oacp-autogen

AutoGen adapter for OACP — expose agent network capabilities as AutoGen tools or async
callables.

## Install

```bash
pip install -e "integrations/autogen[dev]"
# Optional AutoGen bindings:
pip install -e "integrations/autogen[autogen]"
```

Requires `oacp-sdk` (install from `sdk/python` in the monorepo).

## Quick start

```python
import asyncio
from oacp_sdk import AgentClient, register_dev_agent
from oacp_autogen import create_oacp_callable, execute_oacp_capability_task

async def main() -> None:
    async with AgentClient("http://127.0.0.1:3000") as client:
        await register_dev_agent(
            client,
            agent_id="agent://autogen-coordinator",
            name="AutoGen Coordinator",
            capabilities=["orchestrate"],
        )

        delegate = create_oacp_callable(
            client,
            from_agent="agent://autogen-coordinator",
            capability="startup.plan",
        )
        output = await delegate(prompt="AutoGen connectivity check")
        print(output)

asyncio.run(main())
```

## AutoGen FunctionTool

```python
from oacp_autogen import create_autogen_function_tool

tool = create_autogen_function_tool(
    client,
    from_agent="agent://autogen-coordinator",
    capability="startup.plan",
)
# Pass `tool` to an AutoGen AssistantAgent / team
```

Guide: [`docs/integration-autogen.md`](../../docs/integration-autogen.md)

## License

Apache-2.0
