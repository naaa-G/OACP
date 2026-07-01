# MCPLab public launch plan (Day 59–60)

MCPLab is currently **gitignored** in the OACP monorepo (`MCPLab/` at repo root). Day 59 prepares the RC; Day 60 publishes.

## Decision (recommended for v1.0)

| Option                                 | Pros                                           | Cons                             |
| -------------------------------------- | ---------------------------------------------- | -------------------------------- |
| **Separate public repo** (recommended) | Clear product boundary; independent versioning | Two repos to sync docs           |
| **Un-gitignore in monorepo**           | Single clone                                   | Large repo; MCPLab history mixed |

**RC recommendation:** keep monorepo gitignore until Day 60; tag MCPLab `v1.0.0-rc.1` from local `MCPLab/` clone; push to new public repo on ship day.

## MCPLab RC version

Bump before RC tag:

```toml
# MCPLab/pyproject.toml
version = "1.0.0-rc.1"
```

OACP integration contract unchanged — `MCPLAB_OACP_SERVER_URL=http://127.0.0.1:3847`.

## Pre-public checklist

- [ ] `pyproject.toml` → `1.0.0-rc.1` (RC) / `1.0.0` (Day 60)
- [ ] README points to OACP Console (`/console`), not legacy playground
- [ ] Remove embedded OACP `:3001` from compose — [integrate/mcplab/MIGRATION.md](../integrate/mcplab/MIGRATION.md)
- [ ] Sync env documented: `MCPLAB_SYNC_SECRET`, `MCPLAB_OACP_API_KEY`
- [ ] Gold eval against OACP RC:

```bash
docker compose up -d
node scripts/mcplab-rc-eval.mjs --suite quick
# full gate (slow, needs LLM):
# cd MCPLab && python scripts/run_eval.py
```

- [ ] Copy aligned docs: `docs/mcplab-integration.md` ↔ `MCPLab/docs/oacp-integration.md`
- [ ] LICENSE Apache-2.0 present
- [ ] No secrets in `.env` committed — `.env.example` only

## Public repo push (Day 60)

```bash
cd MCPLab
git init   # if new repo
git remote add origin https://github.com/<org>/MCPLab.git
git add .
git commit -m "MCPLab v1.0.0 — MCP × OACP reference lab"
git tag -a v1.0.0 -m "MCPLab v1.0.0"
git push -u origin main --tags
```

## OACP repo references

After public push, update:

- OACP README MCPLab clone URL
- `docs/mcplab.md` public repo link
- `pnpm docker:mcplab` clone instructions

## RC tag (Day 59)

From local MCPLab tree (not in OACP git):

```bash
cd MCPLab
git tag -a v1.0.0-rc.1 -m "MCPLab v1.0.0-rc.1 release candidate"
```

If MCPLab has no git yet, RC tag is **local-only** until Day 60 public repo creation — acceptable for RC sign-off.

## Related

- [docs/mcplab.md](./mcplab.md)
- [docs/releases/v1.0.0-rc.1.md](./releases/v1.0.0-rc.1.md)
- [integrate/mcplab/README.md](../integrate/mcplab/README.md)
