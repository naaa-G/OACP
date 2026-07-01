"""Tests for Console trace URL helpers."""

from oacp_sdk import console_trace_url, playground_trace_url


def test_console_trace_url_strips_playground_suffix() -> None:
    url = console_trace_url('http://127.0.0.1:3001/playground', 'trace-abc')
    assert url == 'http://127.0.0.1:3001/console/?trace_id=trace-abc&mode=showcase'


def test_console_trace_url_strips_console_suffix() -> None:
    url = console_trace_url('http://127.0.0.1:5173/console', 'trace-abc')
    assert url == 'http://127.0.0.1:5173/console/?trace_id=trace-abc&mode=showcase'


def test_console_trace_url_custom_mode() -> None:
    url = console_trace_url('http://127.0.0.1:3001', 'trace-abc', mode='legacy')
    assert 'mode=legacy' in url
    assert 'trace_id=trace-abc' in url


def test_playground_trace_url_is_deprecated_alias() -> None:
    assert playground_trace_url('http://127.0.0.1:3001', 't1') == console_trace_url(
        'http://127.0.0.1:3001',
        't1',
    )
