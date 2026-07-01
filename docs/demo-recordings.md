# Demo recording log (Day 57)

Use this log when capturing the launch video and hero assets. One row per rehearsal or final take.

| Date         | Take        | trace_id (research) | trace_id (code) | trace_id (ops) | Notes                |
| ------------ | ----------- | ------------------- | --------------- | -------------- | -------------------- |
| _YYYY-MM-DD_ | rehearsal 1 |                     |                 |                |                      |
| _YYYY-MM-DD_ | rehearsal 2 |                     |                 |                |                      |
| _YYYY-MM-DD_ | **final**   |                     |                 |                | Published URL: _TBD_ |

## Fallback trace IDs (no LLM)

If live MCPLab runs fail during recording, use [demo-scripts.md](./demo-scripts.md) fallback URLs:

- Research: `d5610001-0001-4000-8000-000000000001`
- Code patch: `d5610002-0002-4000-8000-000000000002`
- Ops: `d5610003-0003-4000-8000-000000000003`

## Hero / GIF assets

| Asset           | Path                                                | Regenerate                         |
| --------------- | --------------------------------------------------- | ---------------------------------- |
| README hero PNG | `docs/public/screenshots/console-showcase-hero.png` | `CAPTURE_HERO=1 pnpm capture:hero` |
| Console bundle  | `apps/console/public/showcase-hero.png`             | same command                       |
