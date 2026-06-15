#!/usr/bin/env bash
# Install and test Python SDK + AutoGen adapter (matches CI).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SDK="${ROOT}/sdk/python"
AUTOGEN="${ROOT}/integrations/autogen"

cd "${ROOT}"

python -m pip install --upgrade pip

# Install SDK first (autogen imports oacp_sdk at runtime).
python -m pip install -e "${SDK}[dev]"

# Install adapter without re-resolving deps (oacp-sdk already on path).
python -m pip install -e "${AUTOGEN}" --no-deps
python -m pip install pytest pytest-asyncio pytest-httpx

python -m pytest "${SDK}/tests" "${AUTOGEN}/tests" -q
