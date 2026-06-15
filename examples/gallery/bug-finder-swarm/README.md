# Bug-finder swarm (Day 25)

Scan logs, triage severity, reproduce with primary/backup failover, analyze root cause, propose fix, verify.

## Run

```bash
pnpm build
pnpm --filter oacp-examples start:bug-finder-swarm
pnpm --filter oacp-examples start:bug-finder-swarm -- --verify
pnpm --filter oacp-examples start:bug-finder-swarm -- --verify-recovery
```

## Workflow

```
Scanner → Triager → (Reproduce ∥ Analyze) → Fixer → Verifier
```

Capabilities: `bug.scan`, `bug.triage`, `bug.reproduce`, `bug.analyze`, `bug.fix`, `bug.verify`

## Env

| Variable                           | Default                                                         |
| ---------------------------------- | --------------------------------------------------------------- |
| `OACP_BUG_REPO`                    | `payment-api`                                                   |
| `OACP_BUG_LOG_EXCERPT`             | `NullReferenceException in PaymentProcessor.Process at line 42` |
| `OACP_BUG_FINDER_SIMULATE_FAILURE` | Set `1` to force primary reproduce failure (backup recovers)    |

Guide: [`docs/examples-gallery.md`](../../docs/examples-gallery.md#bug-finder-swarm)
