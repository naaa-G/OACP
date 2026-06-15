# Install and test Python SDK + AutoGen adapter (matches CI).
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

python -m pip install --upgrade pip
python -m pip install -e "./sdk/python[dev]" -e "./integrations/autogen[dev]"
python -m pytest sdk/python/tests integrations/autogen/tests -q
