# Message feed manual QA checklist (Issue #3 sign-off)

Manual verification before MCPLab live demos, operator training, or Issue #3 closure sign-off. Automated coverage: `pnpm --filter @oacp/console test:e2e:feed`.

**Prerequisites**

- OACP server running with MCPLab or demo crew
- Console at `/console` with **Live** enabled
- A trace with 20+ messages for scroll and export checks

## 1. Live transport (SSE primary)

| Step | Action                           | Expected                                                                     |
| ---- | -------------------------------- | ---------------------------------------------------------------------------- |
| 1.1  | Open Console with trace selected | Header shows **Connected**; reconcile dropdown defaults to **Reconcile 30s** |
| 1.2  | Run MCPLab crew                  | New feed rows appear without full-panel flicker                              |
| 1.3  | DevTools → Network               | `events` SSE stream open; snapshot polls ~every 30s (not sub-second)         |
| 1.4  | Stop server briefly, restart     | SSE reconnects; feed resumes without duplicate rows                          |

## 2. No scroll jump (Days 48–50)

| Step | Action                               | Expected                                                         |
| ---- | ------------------------------------ | ---------------------------------------------------------------- |
| 2.1  | Scroll feed up while crew is running | Viewport stays put; **↓ N new messages** chip appears            |
| 2.2  | Wait 30s reading a row               | No forced scroll to bottom                                       |
| 2.3  | Click new-messages chip              | Smooth scroll to bottom; chip clears                             |
| 2.4  | Hover feed during live run           | Updates pause; flush on mouse leave                              |
| 2.5  | Toggle **Feed** pause                | Buffered count shown; resume flushes without row remount flicker |

## 3. Message tone + export (Day 50)

| Step | Action                    | Expected                                                                   |
| ---- | ------------------------- | -------------------------------------------------------------------------- |
| 3.1  | Inspect feed rows         | `task_request` blue accent; `delegation` purple; success green / error red |
| 3.2  | Click **JSONL** export    | Downloads `oacp-timeline-<trace>.jsonl` with one event per line            |
| 3.3  | Click **CSV** export      | Downloads CSV with header row and escaped fields                           |
| 3.4  | Apply feed filter, export | Export reflects filtered rows only                                         |

## 4. Trace rail (Day 50)

| Step | Action          | Expected                                                   |
| ---- | --------------- | ---------------------------------------------------------- |
| 4.1  | View trace list | Each row shows status badge (Running / Completed / Failed) |
| 4.2  | Completed trace | Duration badge matches started → completed span            |
| 4.3  | Switch traces   | Selected row scrolls into view; badges update              |

## 5. Five-minute MCPLab narrated demo

Run the research crew while narrating agent delegation. Pass if:

- Feed appends smoothly throughout
- Scrolling up to read a message never causes a jump
- Agent catalog and graph remain usable without refresh
- No visible row flicker or duplicate messages after reconnect

## Automated regression

```bash
pnpm --filter @oacp/observability-client test -- timeline-feed trace-format reconcile timeline-feed-diff
pnpm --filter @oacp/console test -- timeline-export message-feed-filter feed-scroll
pnpm --filter @oacp/console test:e2e:feed
```

## Related

- [console-message-feed.md](./console-message-feed.md) — architecture and Day 50 notes
- [console-spec.md](./console-spec.md) — Issue #3 checklist summary
- [version1.md](./version1.md) — Week 10 plan
