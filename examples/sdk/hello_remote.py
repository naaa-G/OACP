"""Python SDK remote hello example — requires a running OACP server."""

from __future__ import annotations

import asyncio
import os
import sys

from oacp_sdk import AgentClient, register_dev_agent


async def main() -> None:
    base_url = os.environ.get('OACP_BASE_URL', 'http://127.0.0.1:3000')
    async with AgentClient(base_url) as client:
        health = await client.health()
        print('[sdk] Server health:', health.get('status'))

        await register_dev_agent(
            client,
            agent_id='agent://py-coordinator',
            name='Python Coordinator',
            capabilities=['orchestrate'],
        )

        workers = await client.find_agents_by_capability('text.summarize')
        if not workers:
            print('[sdk] No text.summarize worker on server. Register workers or start a demo.')
            sys.exit(1)

        result = await client.send_task(
            from_agent='agent://py-coordinator',
            capability='text.summarize',
            to=workers[0]['id'],
            input_data={'text': 'Hello from oacp-sdk (Python).'},
        )
        print('[sdk] Task status:', result.status)
        print('[sdk] Output:', result.output)


if __name__ == '__main__':
    asyncio.run(main())
