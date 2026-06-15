#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> Enabling corepack..."
corepack enable
corepack prepare pnpm@9.15.0 --activate

echo "==> Installing dependencies..."
pnpm install

echo "==> Running verification..."
pnpm verify

echo "==> Setup complete."
