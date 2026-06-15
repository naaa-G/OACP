# oacp-sdk (Python)

Minimal **async** HTTP client for [`@oacp/server`](../../server) — mirrors the TypeScript
[`AgentClient`](../typescript/src/client/agent-client.ts).

## Status

**Alpha (`0.1.0`)** — remote messaging, discovery, and workflow execution.

## Install

```bash
pip install -e "sdk/python[dev]"
```

## Quick start

```python
import asyncio
from oacp_sdk import AgentClient, register_dev_agent

async def main() -> None:
    async with AgentClient("http://127.0.0.1:3000") as client:
        await register_dev_agent(
            client,
            agent_id="agent://coordinator",
            name="Coordinator",
            capabilities=["orchestrate"],
        )
        result = await client.send_task(
            from_agent="agent://coordinator",
            capability="text.summarize",
            input_data={"text": "Hello from Python"},
        )
        print(result.output)

asyncio.run(main())
```

## Run workflow

```python
result = await client.run_workflow(
    "autonomous-startup-v1",
    {"prompt": "build todo app"},
)
print(result.output)
```

## Development

```bash
cd sdk/python
pip install -e ".[dev]"
pytest
```

Guide: [`docs/sdk-python.md`](../../docs/sdk-python.md)

## License

Apache-2.0
