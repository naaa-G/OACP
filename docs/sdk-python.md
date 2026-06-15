# Python SDK (`oacp-sdk`)

Minimal **async** HTTP client mirroring TypeScript `AgentClient`.

## Install

```bash
pip install -e "sdk/python[dev]"
```

Requires Python **3.11+** and a running `@oacp/server` node.

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

## Run a workflow

```python
async with AgentClient("http://127.0.0.1:3000", timeout_s=60) as client:
    result = await client.run_workflow(
        "autonomous-startup-v1",
        {"prompt": "build todo app"},
    )
    if result.ok:
        print(result.trace_id, result.output)
```

Start the server with the startup team first:

```bash
pnpm oacp serve --bootstrap startup
```

## API

| Method                        | HTTP                        | Description       |
| ----------------------------- | --------------------------- | ----------------- |
| `health()`                    | `GET /health`               | Server liveness   |
| `register_agent()`            | `POST /agents`              | Register mailbox  |
| `register_dev_agent()`        | helper                      | Dev key bootstrap |
| `find_agents_by_capability()` | `GET /capabilities/...`     | Discovery         |
| `send_task()`                 | `POST /send-message` + poll | Task round-trip   |
| `run_workflow()`              | `POST /workflows/:id/run`   | DAG execution     |

## Errors

Raises `ClientError` with `ClientErrorCode` — mirrors TypeScript `OacpClientError`.

## Example script

[`examples/sdk/hello_remote.py`](../examples/sdk/hello_remote.py)

## Development

```bash
cd sdk/python
pip install -e ".[dev]"
pytest
```

## Related

- [TypeScript SDK](./sdk-typescript.md)
- [Remote client](./remote-client.md) — shared HTTP semantics
