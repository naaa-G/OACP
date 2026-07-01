#!/usr/bin/env python3
"""Day 58 — minimal bring-your-own-agents trace (Python, no MCPLab)."""

from __future__ import annotations

import asyncio
import os
import sys
import uuid

from oacp_sdk import AgentClient, register_dev_agent

COORDINATOR_ID = "agent://custom-planner-py"
WORKER_ID = "agent://custom-worker-py"
FLEET = "custom-demo"


def console_trace_url(base_url: str, trace_id: str) -> str:
    origin = base_url.rstrip("/").removesuffix("/console").removesuffix("/playground")
    return f"{origin}/console/?trace_id={trace_id}&mode=showcase"


async def main() -> None:
    base_url = os.environ.get("OACP_BASE_URL", "http://127.0.0.1:3847")
    api_key = os.environ.get("OACP_API_KEY", "").strip()
    headers = {"x-api-key": api_key} if api_key else None

    async with AgentClient(base_url, headers=headers) as client:
        health = await client.health()
        print("[custom-agents] Server:", health.get("status"))

        await register_dev_agent(
            client,
            agent_id=COORDINATOR_ID,
            name="Custom Planner (Python)",
            capabilities=["orchestrate", "plan"],
            metadata={"fleet": FLEET, "role": "planner"},
        )
        await register_dev_agent(
            client,
            agent_id=WORKER_ID,
            name="Custom Worker (Python)",
            capabilities=["work.echo"],
            metadata={"fleet": FLEET, "role": "worker"},
        )

        trace_id = str(uuid.uuid4())
        request_id = str(uuid.uuid4())
        response_id = str(uuid.uuid4())
        timestamp = __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat().replace("+00:00", "Z")

        await client.send_message(
            {
                "type": "task_request",
                "version": "1.0",
                "message_id": request_id,
                "trace_id": trace_id,
                "from": COORDINATOR_ID,
                "to": WORKER_ID,
                "timestamp": timestamp,
                "capability": "work.echo",
                "input": {"value": "Day 58 custom-agents trace (Python)"},
                "deadline_ms": 60_000,
            }
        )

        await client.send_message(
            {
                "type": "task_response",
                "version": "1.0",
                "message_id": response_id,
                "trace_id": trace_id,
                "from": WORKER_ID,
                "in_reply_to": request_id,
                "timestamp": timestamp,
                "status": "success",
                "output": {"echoed": "Day 58 custom-agents trace (Python)", "fleet": FLEET},
            }
        )

        url = console_trace_url(base_url, trace_id)
        print()
        print("[custom-agents] Trace complete")
        print("  trace_id:", trace_id)
        print("  Console: ", url)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as exc:  # noqa: BLE001
        print("[custom-agents] Fatal:", exc, file=sys.stderr)
        sys.exit(1)
