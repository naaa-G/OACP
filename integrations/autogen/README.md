# oacp-autogen

AutoGen adapter for OACP — expose agent network capabilities as AutoGen tools or async
callables.

## Install

From the monorepo root (install SDK first — autogen imports `oacp_sdk`):

```bash
pip install -e "sdk/python[dev]"
pip install -e "integrations/autogen" --no-deps
pip install pytest pytest-asyncio pytest-httpx

# Or use the helper script:
# bash scripts/verify-python.sh   # Linux / CI
# .\scripts\verify-python.ps1     # Windows
```

Optional AutoGen bindings:

```bash
pip install -e "integrations/autogen[autogen]"
```

When published to PyPI, `oacp-autogen` will depend on `oacp-sdk` from PyPI. In the monorepo, install `sdk/python` first.

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
