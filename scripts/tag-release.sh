#!/usr/bin/env bash
# Tag an OACP release after verify. Does not push — review output before running git push.
set -euo pipefail

VERSION="${1:-v0.1.0-alpha}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Running pnpm verify..."
pnpm verify

echo ""
echo "==> Ready to tag ${VERSION}"
echo ""
echo "Run these commands after reviewing CHANGELOG and .github/RELEASE_${VERSION}.md:"
echo ""
echo "  git tag -a ${VERSION} -m \"OACP ${VERSION} public launch\""
echo "  git push origin ${VERSION}"
echo ""
NOTES_FILE=".github/RELEASE_${VERSION}.md"
if [[ -f "$NOTES_FILE" ]]; then
  echo "  gh release create ${VERSION} \\"
  echo "    --title \"OACP ${VERSION} — multi-agent collaboration you can see live\" \\"
  echo "    --notes-file ${NOTES_FILE}"
else
  echo "  (No ${NOTES_FILE} — create release notes in GitHub UI)"
fi
echo ""
