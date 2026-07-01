# OACP `/v1/` OpenAPI (Day 54 freeze)

Canonical observability API contract for OACP v1.0.

| File                             | Purpose                                         |
| -------------------------------- | ----------------------------------------------- |
| [`v1.yaml`](./v1.yaml)           | Human-editable source (edit here first)         |
| [`v1.json`](./v1.json)           | Served at `GET /v1/openapi.json` and used by CI |
| [`v1.lock.json`](./v1.lock.json) | Response-schema fingerprint lock                |

## Regenerate JSON after YAML edits

```bash
node --input-type=module -e "import { readFileSync, writeFileSync } from 'node:fs'; import { parse } from 'yaml'; const doc = parse(readFileSync('specs/openapi/v1.yaml','utf8')); writeFileSync('specs/openapi/v1.json', JSON.stringify(doc, null, 2) + '\n');"
node scripts/verify-api-freeze.mjs --update-lock
```

## Breaking change policy

1. Bump `info.version` in `v1.yaml` / `v1.json`.
2. Run `--update-lock` after intentional schema changes.
3. CI (`pnpm verify`) runs `node scripts/verify-api-freeze.mjs` — fails if schemas change without a version bump.
4. `server/tests/openapi-freeze.test.ts` validates live server responses against OpenAPI component schemas (AJV).

See [migration guide](../../docs/migration/v0.1-to-v1.0.md).
