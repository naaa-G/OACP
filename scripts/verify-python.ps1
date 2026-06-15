# Install and test Python SDK + AutoGen adapter (matches CI).
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Sdk = Join-Path $Root "sdk\python"
$Autogen = Join-Path $Root "integrations\autogen"

Set-Location $Root

python -m pip install --upgrade pip

# Install SDK first (autogen imports oacp_sdk at runtime).
python -m pip install -e "${Sdk}[dev]"

# Install adapter without re-resolving deps (oacp-sdk already on path).
python -m pip install -e "${Autogen}" --no-deps
python -m pip install pytest pytest-asyncio pytest-httpx

python -m pytest (Join-Path $Sdk "tests") (Join-Path $Autogen "tests") -q
