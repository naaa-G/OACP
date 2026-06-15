#!/usr/bin/env bash
# Capture launch assets — playground URL + screenshot checklist (Day 29)
# Run from repo root: ./scripts/capture-launch-assets.sh

set -euo pipefail
cd "$(dirname "$0")/.."

echo ""
echo "OACP Launch Asset Capture"
echo "========================="
echo ""

command -v pnpm >/dev/null 2>&1 || { echo "pnpm not found"; exit 1; }

echo "[1/4] Building..."
pnpm build >/dev/null

mkdir -p docs/public/screenshots

echo "[2/4] Running flagship demo (keep-alive)..."
echo "      Command: pnpm oacp run \"build todo app\" --keep-alive"
echo ""
echo "After the server starts:"
echo "  1. Copy the playground_url from terminal output"
echo "  2. Open it in your browser (1440x900+ viewport)"
echo "  3. Capture screenshots per docs/screenshots.md"
echo "  4. Save PNGs to docs/public/screenshots/"
echo ""
echo "Expected files:"
echo "  docs/public/screenshots/playground-agents.png"
echo "  docs/public/screenshots/playground-messages.png"
echo "  docs/public/screenshots/cli-run-output.png"
echo ""
echo "Press Ctrl+C in the demo terminal when done capturing."
echo ""

pnpm oacp run "build todo app" --keep-alive
