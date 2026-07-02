# MCPLab public launch — shipped

MCPLab is published as a **separate public repository**. The OACP monorepo still gitignores `./MCPLab/` — clone the public repo beside your OACP checkout.

**Public repository:** [github.com/naaa-G/MCPLab](https://github.com/naaa-G/MCPLab)  
**Release tag:** `v1.0.0`

## Clone and run with OACP

```bash
git clone https://github.com/naaa-G/OACP.git
cd OACP
docker compose up -d

git clone https://github.com/naaa-G/MCPLab.git MCPLab
pnpm docker:mcplab
```

Open **http://127.0.0.1:3847/console/?mode=showcase** after a crew trace.

## Architecture decision (v1.0)

| Choice                   | Rationale                                                                  |
| ------------------------ | -------------------------------------------------------------------------- |
| **Separate public repo** | Clear product boundary; independent versioning                             |
| **Client-only MCPLab**   | No embedded OACP `:3001`; connects to `http://oacp:3847` on `oacp-network` |

Templates for client-only compose remain in [integrate/mcplab/](../integrate/mcplab/).

## OACP doc references (updated)

- [README](../README.md) — MCPLab clone URL
- [docs/mcplab.md](./mcplab.md) — integration quick start
- [docs/quick-start.md](./quick-start.md) — full stack path
- `pnpm docker:mcplab` — requires `./MCPLab/` or `./integrate/mcplab/`

## Related

- [docs/mcplab.md](./mcplab.md)
- [docs/mcplab-integration.md](./mcplab-integration.md)
- [integrate/mcplab/README.md](../integrate/mcplab/README.md)
- [integrate/mcplab/MIGRATION.md](../integrate/mcplab/MIGRATION.md)
