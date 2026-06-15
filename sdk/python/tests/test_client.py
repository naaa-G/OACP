import pytest

from oacp_sdk import AgentClient, ClientError, ClientErrorCode, create_agent_client
from oacp_sdk.defaults import DEFAULT_DEV_PUBLIC_KEY, PROTOCOL_VERSION


@pytest.mark.asyncio
async def test_health(httpx_mock) -> None:
    httpx_mock.add_response(
        url='http://127.0.0.1:3999/health',
        json={
            'ok': True,
            'status': 'healthy',
            'protocol_version': '0.1',
            'registered_agents': 0,
            'bus_open': True,
        },
    )
    async with AgentClient('http://127.0.0.1:3999') as client:
        health = await client.health()
    assert health['protocol_version'] == '0.1'


@pytest.mark.asyncio
async def test_register_agent(httpx_mock) -> None:
    identity = {
        'id': 'agent://worker',
        'name': 'Worker',
        'version': PROTOCOL_VERSION,
        'capabilities': ['text.summarize'],
        'publicKey': DEFAULT_DEV_PUBLIC_KEY,
    }
    httpx_mock.add_response(
        method='POST',
        url='http://127.0.0.1:3999/agents',
        json={'ok': True, 'agent': identity},
    )
    async with AgentClient('http://127.0.0.1:3999') as client:
        registered = await client.register_agent(identity)
    assert registered['id'] == 'agent://worker'


@pytest.mark.asyncio
async def test_send_task_without_waiting(httpx_mock) -> None:
    httpx_mock.add_response(
        method='POST',
        url='http://127.0.0.1:3999/send-message',
        json={
            'ok': True,
            'message_id': 'msg-1',
            'trace_id': 'trace-1',
            'type': 'task_request',
            'recipients': ['agent://worker'],
        },
    )
    async with AgentClient('http://127.0.0.1:3999') as client:
        result = await client.send_task(
            from_agent='agent://coordinator',
            capability='text.summarize',
            input_data={'text': 'Hello'},
            wait_for_response=False,
        )
    assert result.status == 'success'
    assert result.request['capability'] == 'text.summarize'


@pytest.mark.asyncio
async def test_run_workflow(httpx_mock) -> None:
    httpx_mock.add_response(
        method='POST',
        url='http://127.0.0.1:3999/workflows/demo-v1/run',
        json={
            'ok': True,
            'result': {
                'ok': True,
                'runId': 'run-1',
                'traceId': 'trace-1',
                'workflowId': 'demo-v1',
                'steps': [],
                'output': {'done': True},
            },
        },
    )
    async with AgentClient('http://127.0.0.1:3999') as client:
        result = await client.run_workflow('demo-v1', {'document': 'test'})
    assert result.ok is True
    assert result.output == {'done': True}


def test_create_agent_client_factory() -> None:
    client = create_agent_client('http://127.0.0.1:3000')
    assert client.server_url == 'http://127.0.0.1:3000'


@pytest.mark.asyncio
async def test_server_error_maps_to_client_error(httpx_mock) -> None:
    httpx_mock.add_response(
        url='http://127.0.0.1:3999/health',
        status_code=404,
        json={'error': {'code': 'SERVER_AGENT_NOT_FOUND', 'message': 'missing'}},
    )
    async with AgentClient('http://127.0.0.1:3999', max_retries=0) as client:
        with pytest.raises(ClientError) as exc:
            await client.health()
    assert exc.value.code == ClientErrorCode.AGENT_NOT_FOUND
