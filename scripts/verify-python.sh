#!/usr/bin/env bash
# Install and test Python SDK + AutoGen adapter (matches CI).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

python -m pip install --upgrade pip
python -m pip install -e "./sdk/python[dev]" -e "./integrations/autogen[dev]"
python -m pytest sdk/python/tests integrations/autogen/tests -q
