# AutoGen adapter

`oacp-autogen` bridges Microsoft AutoGen (and other Python orchestrators) to the OACP agent
network via async callables and optional `FunctionTool` wrappers.

## Install

```bash
pip install -e "sdk/python[dev]"
pip install -e "integrations/autogen[dev]"

# Optional — AutoGen FunctionTool wrapper
pip install -e "integrations/autogen[autogen]"
```

## When to use

| Scenario                                       | Use `oacp-autogen`                                         |
| ---------------------------------------------- | ---------------------------------------------------------- |
| AutoGen team delegates specialist work to OACP | ✅ `create_oacp_callable` / `create_autogen_function_tool` |
| Pure OACP DAG / startup team                   | ❌ use `oacp-sdk` `run_workflow`                           |
| TypeScript LangChain stack                     | ❌ use `@oacp/integration-langchain`                       |

## Async callable (no AutoGen required)

```python
import asyncio
from oacp_sdk import AgentClient, register_dev_agent
from oacp_autogen import create_oacp_callable

async def main() -> None:
    async with AgentClient("http://127.0.0.1:3000") as client:
        await register_dev_agent(
            client,
            agent_id="agent://autogen-coordinator",
            name="AutoGen Coordinator",
            capabilities=["orchestrate"],
        )

        plan = create_oacp_callable(
            client,
            from_agent="agent://autogen-coordinator",
            capability="startup.plan",
        )
        output = await plan(prompt="build habit tracker")
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
    description="Delegate product planning to the OACP PM agent.",
)

# Register with your AutoGen AssistantAgent / team
```

Requires `pip install "oacp-autogen[autogen]"` (`autogen-core` ≥ 0.4).

## API

| Export                           | Description                                    |
| -------------------------------- | ---------------------------------------------- |
| `execute_oacp_capability_task()` | Framework-agnostic task execution              |
| `create_oacp_callable()`         | Async `**kwargs` delegate for any orchestrator |
| `create_autogen_function_tool()` | AutoGen `FunctionTool` wrapper (optional dep)  |
| `OacpTaskError`                  | Raised when task status is `error`             |
| `capability_to_tool_name()`      | Sanitize capability for tool names             |

## Runnable example

```bash
pnpm oacp serve --bootstrap startup
python examples/integrations/autogen_delegate.py
```

## Error handling

```python
from oacp_autogen import OacpTaskError, execute_oacp_capability_task

try:
    await execute_oacp_capability_task(
        client,
        from_agent="agent://autogen-coordinator",
        capability="startup.plan",
        input_data={"prompt": "…"},
    )
except OacpTaskError as exc:
    print(exc.code, exc)
```

## Related

- [Integrations overview](./integrations.md)
- [LangChain adapter](./integration-langchain.md)
- [Python SDK](./sdk-python.md)
