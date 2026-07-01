# MCPLab v1.0.0-rc.1

Release candidate alignment with OACP `v1.0.0-rc.1`.

## Version

Set in `MCPLab/pyproject.toml`:

```toml
version = "1.0.0-rc.1"
```

## Eval against OACP RC

From OACP repo root (OACP running on `:3847`):

```bash
node scripts/mcplab-rc-eval.mjs --suite quick
```

Full gold suite (requires LLM + infra):

```bash
cd MCPLab
python scripts/run_eval.py
```

## Tag (local / MCPLab repo)

```bash
cd MCPLab
git tag -a v1.0.0-rc.1 -m "MCPLab v1.0.0-rc.1 release candidate"
```

See [docs/mcplab-public-launch.md](../../docs/mcplab-public-launch.md).
