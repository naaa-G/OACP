---
layout: home

hero:
  name: OACP
  text: Multi-agent collaboration you can see working live
  tagline: Open Agent Collaboration Protocol — task execution, delegation, and observability for autonomous agent teams
  actions:
    - theme: brand
      text: Quick Start →
      link: /quick-start
    - theme: alt
      text: What is OACP?
      link: /what-is-oacp
    - theme: alt
      text: View on GitHub
      link: https://github.com/naaa-G/OACP

features:
  - icon: 📡
    title: Protocol-first
    details: Versioned JSON Schema messages, agent identity, capabilities, and validation — a stable contract for multi-agent systems.
  - icon: 🔀
    title: Capability routing
    details: Send tasks without hard-coded agent IDs. OACP discovers agents by capability and routes with retries and failover.
  - icon: 🧠
    title: Shared memory & DAGs
    details: Task history, delegation graphs, and a workflow engine for structured multi-step and parallel agent pipelines.
  - icon: 👁️
    title: Live playground
    details: Watch agents as nodes, message flow, and delegation topology update in real time — the key differentiator for OACP.
  - icon: 🚀
    title: Public alpha
    details: v0.1.0-alpha launch kit, release notes, community support, and Day 30 playbook for GitHub, HN, Reddit, and X.
  - icon: 🔌
    title: TypeScript & Python SDKs
    details: Build local agents or remote coordinators with @oacp/sdk and oacp-sdk — factories, retries, and dev helpers for enterprise HTTP clients.
---

## Try it locally

```bash
git clone https://github.com/naaa-G/OACP.git
cd OACP
pnpm install && pnpm build
pnpm oacp run "build todo app"
```

Open the playground URL printed in the output to watch the Autonomous Startup Team collaborate.

[Full quick start guide →](/quick-start)
