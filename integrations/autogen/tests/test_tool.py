import pytest

from oacp_autogen import OacpTaskError, capability_to_tool_name, create_oacp_callable, execute_oacp_capability_task
from oacp_sdk import AgentClient

from oacp_sdk.testing import fixed_oacp_message_ids, register_send_task_exchange

BASE_URL = 'http://127.0.0.1:3999'
FROM_AGENT = 'agent://coordinator'


@pytest.mark.asyncio
async def test_execute_oacp_capability_task(httpx_mock) -> None:
    register_send_task_exchange(
        httpx_mock,
        base_url=BASE_URL,
        from_agent=FROM_AGENT,
        output={'summary': 'done'},
    )

    async with AgentClient(BASE_URL, max_retries=0) as client:
        with fixed_oacp_message_ids():
            output = await execute_oacp_capability_task(
                client,
                from_agent=FROM_AGENT,
                capability='text.summarize',
                input_data={'text': 'hello'},
            )

    assert output == {'summary': 'done'}


@pytest.mark.asyncio
async def test_execute_raises_on_task_error(httpx_mock) -> None:
    register_send_task_exchange(
        httpx_mock,
        base_url=BASE_URL,
        from_agent=FROM_AGENT,
        task_status='error',
        error={'code': 'DEMO_FAIL', 'message': 'boom'},
    )

    async with AgentClient(BASE_URL, max_retries=0) as client:
        with fixed_oacp_message_ids():
            with pytest.raises(OacpTaskError) as exc:
                await execute_oacp_capability_task(
                    client,
                    from_agent=FROM_AGENT,
                    capability='work.fail',
                    input_data={},
                )

    assert exc.value.code == 'DEMO_FAIL'


@pytest.mark.asyncio
async def test_create_oacp_callable(httpx_mock) -> None:
    register_send_task_exchange(
        httpx_mock,
        base_url=BASE_URL,
        from_agent=FROM_AGENT,
        output={'value': 'echo'},
    )

    async with AgentClient(BASE_URL, max_retries=0) as client:
        with fixed_oacp_message_ids():
            delegate = create_oacp_callable(
                client,
                from_agent=FROM_AGENT,
                capability='work.echo',
            )
            output = await delegate(value='ping')

    assert output == {'value': 'echo'}


def test_capability_to_tool_name() -> None:
    assert capability_to_tool_name('text.summarize') == 'text_summarize'
    assert capability_to_tool_name('startup.plan') == 'startup_plan'
