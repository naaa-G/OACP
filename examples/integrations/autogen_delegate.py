"""OACP Day 28 — AutoGen adapter example (callable bridge, no AutoGen install required)."""

from __future__ import annotations

import asyncio
import os
import sys

from oacp_autogen import create_oacp_callable
from oacp_sdk import AgentClient, register_dev_agent

CAPABILITY_CANDIDATES: list[tuple[str, dict[str, str]]] = [
    ('startup.plan', {'prompt': 'AutoGen adapter connectivity check'}),
    ('text.summarize', {'text': 'Hello from AutoGen OACP bridge.'}),
    ('work.echo', {'value': 'hello-autogen'}),
]


async def main() -> None:
    base_url = os.environ.get('OACP_BASE_URL', 'http://127.0.0.1:3000')
    async with AgentClient(base_url) as client:
        health = await client.health()
        print('[autogen] Server:', health.get('status'))

        await register_dev_agent(
            client,
            agent_id='agent://autogen-coordinator',
            name='AutoGen Coordinator',
            capabilities=['orchestrate'],
        )

        capability = CAPABILITY_CANDIDATES[0][0]
        sample = CAPABILITY_CANDIDATES[0][1]
        for cap, payload in CAPABILITY_CANDIDATES:
            workers = await client.find_agents_by_capability(cap)
            if workers:
                capability = cap
                sample = payload
                break
        else:
            print('[autogen] No workers found. Start: pnpm oacp serve --bootstrap startup')
            sys.exit(1)

        print('[autogen] Capability:', capability)
        delegate = create_oacp_callable(
            client,
            from_agent='agent://autogen-coordinator',
            capability=capability,
        )
        output = await delegate(**sample)
        print('[autogen] Delegate result:', output)


if __name__ == '__main__':
    asyncio.run(main())
