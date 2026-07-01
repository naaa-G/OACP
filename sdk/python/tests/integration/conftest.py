"""Pytest configuration for OACP Python SDK integration tests."""

import os

import pytest


def pytest_configure(config: pytest.Config) -> None:
    config.addinivalue_line(
        'markers',
        'integration: live-server tests (require MCPLAB_OACP_SERVER_URL or OACP_SERVER_URL)',
    )


def pytest_collection_modifyitems(config: pytest.Config, items: list[pytest.Item]) -> None:
    server_url = os.environ.get('MCPLAB_OACP_SERVER_URL') or os.environ.get('OACP_SERVER_URL')
    if server_url:
        return

    skip_live = pytest.mark.skip(
        reason='Set MCPLAB_OACP_SERVER_URL or OACP_SERVER_URL to run live integration tests',
    )
    for item in items:
        if 'integration' in item.keywords:
            item.add_marker(skip_live)
