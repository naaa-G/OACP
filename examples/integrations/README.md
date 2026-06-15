# Integration examples (Day 28)

Bridge OACP to LangChain and AutoGen.

## LangChain (TypeScript)

Requires a running server with workers:

```bash
pnpm oacp serve --bootstrap startup
pnpm --filter oacp-examples start:langchain-delegate
```

Uses `@oacp/integration-langchain` — invokes a LangChain `StructuredTool` directly (no OpenAI key).

## AutoGen (Python)

```bash
pip install -e "sdk/python[dev]"
pip install -e "integrations/autogen[dev]"
pnpm oacp serve --bootstrap startup
python examples/integrations/autogen_delegate.py
```

Uses `create_oacp_callable` — works without installing AutoGen. For `FunctionTool` wrappers,
install `integrations/autogen[autogen]`.

Guides: [`docs/integrations.md`](../../docs/integrations.md)
