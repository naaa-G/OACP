import pytest

from oacp_autogen import OacpTaskError, capability_to_tool_name, create_oacp_callable, execute_oacp_capability_task
from oacp_sdk import AgentClient


@pytest.mark.asyncio
async def test_execute_oacp_capability_task(httpx_mock) -> None:
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
    httpx_mock.add_response(
        url='http://127.0.0.1:3999/agent/worker/messages?timeoutMs=5000',
        json={
            'ok': True,
            'message': {
                'type': 'task_response',
                'version': '0.1',
                'message_id': 'resp-1',
                'trace_id': 'trace-1',
                'from': 'agent://worker',
                'timestamp': '2026-01-01T00:00:00.000Z',
                'in_reply_to': 'msg-1',
                'status': 'success',
                'output': {'summary': 'done'},
            },
        },
    )

    async with AgentClient('http://127.0.0.1:3999', max_retries=0) as client:
        output = await execute_oacp_capability_task(
            client,
            from_agent='agent://coordinator',
            capability='text.summarize',
            input_data={'text': 'hello'},
        )

    assert output == {'summary': 'done'}


@pytest.mark.asyncio
async def test_execute_raises_on_task_error(httpx_mock) -> None:
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
    httpx_mock.add_response(
        url='http://127.0.0.1:3999/agent/coordinator/messages?timeoutMs=5000',
        json={
            'ok': True,
            'message': {
                'type': 'task_response',
                'version': '0.1',
                'message_id': 'resp-1',
                'trace_id': 'trace-1',
                'from': 'agent://worker',
                'timestamp': '2026-01-01T00:00:00.000Z',
                'in_reply_to': 'msg-1',
                'status': 'error',
                'error': {'code': 'DEMO_FAIL', 'message': 'boom'},
            },
        },
    )

    async with AgentClient('http://127.0.0.1:3999', max_retries=0) as client:
        with pytest.raises(OacpTaskError) as exc:
            await execute_oacp_capability_task(
                client,
                from_agent='agent://coordinator',
                capability='work.fail',
                input_data={},
            )

    assert exc.value.code == 'DEMO_FAIL'


@pytest.mark.asyncio
async def test_create_oacp_callable(httpx_mock) -> None:
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
    httpx_mock.add_response(
        url='http://127.0.0.1:3999/agent/coordinator/messages?timeoutMs=5000',
        json={
            'ok': True,
            'message': {
                'type': 'task_response',
                'version': '0.1',
                'message_id': 'resp-1',
                'trace_id': 'trace-1',
                'from': 'agent://worker',
                'timestamp': '2026-01-01T00:00:00.000Z',
                'in_reply_to': 'msg-1',
                'status': 'success',
                'output': {'value': 'echo'},
            },
        },
    )

    async with AgentClient('http://127.0.0.1:3999', max_retries=0) as client:
        delegate = create_oacp_callable(
            client,
            from_agent='agent://coordinator',
            capability='work.echo',
        )
        output = await delegate(value='ping')

    assert output == {'value': 'echo'}


def test_capability_to_tool_name() -> None:
    assert capability_to_tool_name('text.summarize') == 'text_summarize'
    assert capability_to_tool_name('startup.plan') == 'startup_plan'
