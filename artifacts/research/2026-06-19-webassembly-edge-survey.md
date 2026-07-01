# Research synthesis: WebAssembly edge survey

**Goal:** WebAssembly edge survey

**Sources reviewed:** 2

## MCPLab README

# MCPLab — MCP × OACP Lab

**MCP connects agents to tools. OACP connects agents to each other.**

MCPLab is the open reference laboratory for composing **Model Context Protocol (MCP)** tool
servers with **Open Agent Collaboration Protocol (OACP)** multi-agent orchestration. Run three
flagship crews — research, code patch, and ops — and watch every delegation and tool call in
the OACP playground.

> **Version:** 0.1.0 (Day 27 — Operator CLI)  
> **Local only:** This folder is gitignored in the parent OACP monorepo until public launch.

## Quick start

```powershell
cd MCPLab
copy .env.example .env

python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"

docker compose up -d
python scripts\bootstrap_db.py
python scripts\check_infra.py
python -m pytest tests\unit\ -v
```

Optional — start OACP from the parent monorepo:

```powershell
cd ..
pnpm oacp serve --port 3001 --bootstrap startup
# Or: $env:OACP_PORT = "3001"; pnpm oacp serve --bootstrap startup
```

Playground: http://127.0.0.1:3001/playground

## Documentation

| Document                                           | Purpose                          |
| -------------------------------------------------- | -------------------------------- |
| [docs/README.md](./docs/README.md)                 | Documentation index              |
| [docs/development.md](./docs/development.md)       | Local setup and daily workflow   |
| [docs/configuration.md](./docs/configuration.md)   | `MCPLAB_*` environment reference |
| [docs/docker-compose.md](./docs/docker-compose.md) | Infrastructure and ports         |
| [docs/architecture.md](./docs/architecture.md)     | System design                    |

| [docs/day-02.md](...

## Example.com reference

{"url": "https://example.com/", "status_code": 200, "content_type": "text/html", "body": "<!doctype html><html lang=\"en\"><head><title>Example Domain</title><link rel=\"icon\" href=\"data:,\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><style>body{background:#eee;width:60vw;margin:15vh auto;font-family:system-ui,sans-serif}h1{font-size:1.5em}div{opacity:0.8}a:link,a:visited{color:#348}</style></head><body><div><h1>Example Domain</h1><p>This domain is for use in documentation examples without needing permission. Avoid use in operations.</p><p><a href=\"https://iana.org/domains/example\">Learn more</a></p></div></body></html>\n", "body_length": 559}

## Summary

Synthesized 2 source(s) for 'WebAssembly edge survey'. Findings combine lab filesystem context and allowlisted web reference.
