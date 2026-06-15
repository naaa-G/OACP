# Multi-Agent Task

> **Status:** Two-agent milestone complete (Day 7). Multi-agent pipelines land Week 2.

Demonstrates capability-based routing across multiple agents in a pipeline:

```text
Coordinator ──► Researcher ──► Writer ──► Reviewer
```

Each agent handles one capability and delegates to the next via the message bus.

Runnable example: `examples/multi-agent/dev-team-simulation.ts` (Week 2+).

See the [README roadmap](https://github.com/naaa-G/OACP#-roadmap).
