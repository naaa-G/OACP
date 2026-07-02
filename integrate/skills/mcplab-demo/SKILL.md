---
name: mcplab-demo
description: >-
  Run the unified OACP + MCPLab Docker stack and open Console Showcase for a crew trace.
  Use when the user asks to demo MCPLab, run the full stack, or reproduce the launch demo.
---

# MCPLab demo stack

## Goal

Start OACP + MCPLab, run or seed a crew trace, open **Console Showcase**.

## Full stack

```bash
git clone https://github.com/naaa-G/MCPLab.git MCPLab
pnpm docker:mcplab
```

Requires `MCPLab/` ([public repo](https://github.com/naaa-G/MCPLab)) or `integrate/mcplab/` at repo root.

| URL                                          | Purpose                    |
| -------------------------------------------- | -------------------------- |
| http://127.0.0.1:3847/console/?mode=showcase | OACP Console               |
| http://127.0.0.1:3002                        | MCPLab web (port may vary) |

## Fallback traces (no LLM)

```bash
pnpm demo:fallback
```

Open printed URLs — research/code Showcase, ops Ops mode.

## Live crew

```bash
mcplab run research --remote --topic "Edge AI inference trends"
```

Open `console_url` from output or:

```bash
mcplab trace --trace-id <uuid> --open
```

## Presenter scripts

`docs/demo-scripts.md` — 5- and 10-minute runbooks.

## Sync troubleshooting

If Console is empty after OACP recreate:

1. Check MCPLab sync logs
2. Verify `MCPLAB_SYNC_SECRET`, `MCPLAB_OACP_API_KEY`
3. See `docs/mcplab.md#sync-troubleshooting`

Intentional wipe: `docker compose down -v` on **both** stacks.

## Migration

Legacy MCPLab with embedded OACP `:3001` → `integrate/mcplab/MIGRATION.md`

## Do not

- Record demo video from `demo:fallback` alone (sparse 2-agent traces)
- Use `/playground` for launch demos — use `/console`
