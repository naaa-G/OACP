# Integration adapters

OACP is a **collaboration and orchestration layer** — it does not replace LangChain, AutoGen,
or other agent frameworks. Adapters let those frameworks **delegate work to the OACP agent
network** while you keep your existing LLM tooling.

## Architecture

```text
┌─────────────────────┐         ┌──────────────────────┐
│  LangChain / AutoGen │  tool   │   OACP network       │
│  (your orchestrator) │ ──────► │   @oacp/server       │
└─────────────────────┘         │   capability routing │
                                │   traces · playground│
                                └──────────────────────┘
```

Your framework agent decides _when_ to delegate; OACP handles _who_ executes the task,
delivery guarantees, and observability.

## Available adapters

| Framework | Package                       | Language   | Guide                                           |
| --------- | ----------------------------- | ---------- | ----------------------------------------------- |
| LangChain | `@oacp/integration-langchain` | TypeScript | [LangChain adapter](./integration-langchain.md) |
| AutoGen   | `oacp-autogen`                | Python     | [AutoGen adapter](./integration-autogen.md)     |

## Design principles

1. **Thin bridges** — adapters wrap `@oacp/sdk` / `oacp-sdk`; no protocol logic in integrations.
2. **Optional peer deps** — LangChain and AutoGen are peer/optional dependencies; core OACP stays lean.
3. **Direct invoke for demos** — examples call tools/callables without an LLM API key.
4. **Enterprise errors** — `OacpToolError` / `OacpTaskError` surface task failures with codes.

## Quick start (LangChain)

```bash
pnpm oacp serve --bootstrap startup
pnpm --filter oacp-examples start:langchain-delegate
```

## Quick start (AutoGen callable)

```bash
pip install -e "sdk/python[dev]"
pip install -e "integrations/autogen[dev]"
pnpm oacp serve --bootstrap startup
python examples/integrations/autogen_delegate.py
```

## Related

- [TypeScript SDK](./sdk-typescript.md)
- [Python SDK](./sdk-python.md)
- [Remote client](./remote-client.md)
- [Comparison in README](../README.md#-comparison--interoperability)
