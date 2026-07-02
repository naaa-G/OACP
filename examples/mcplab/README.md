# MCPLab from OACP monorepo

Run the flagship MCP × OACP lab from the parent repository.

## Option A — public MCPLab clone (recommended)

```bash
git clone https://github.com/naaa-G/MCPLab.git MCPLab
pnpm docker:mcplab
```

`MCPLab/` is gitignored in the OACP monorepo — clone the [public repo](https://github.com/naaa-G/MCPLab) beside or inside your OACP checkout.

## Option B — integrate templates

See [integrate/mcplab/README.md](../../integrate/mcplab/README.md) for client-only compose and migration from legacy embedded OACP.

## Docs

- [docs/mcplab.md](../../docs/mcplab.md)
- [docs/mcplab-integration.md](../../docs/mcplab-integration.md)
- [docs/demo-scripts.md](../../docs/demo-scripts.md)
