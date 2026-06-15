# Autonomous Team Demo

> **Status:** ✅ Implemented (Day 23 — Week 4 flagship)

The **Autonomous Startup Team** demo spawns PM, Designer, Backend, Frontend, QA, and support
agents that collaborate on a user prompt and produce a project scaffold.

## Flow

1. User input: _"Build a habit tracker app."_
2. PM agent breaks down requirements and user stories.
3. Designer, Backend, and Frontend agents work **in parallel**.
4. Tech Lead assembles a repo structure; QA signs off.
5. Playground visualizes the full delegation graph live.

## Run

```bash
pnpm --filter oacp-examples start:startup
pnpm --filter oacp-examples start:playground -- --loop
```

Implementation: `examples/startup-team/autonomous-startup-team.ts`

Full guide: [startup-team.md](../startup-team.md)
