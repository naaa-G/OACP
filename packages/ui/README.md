# @oacp/ui

Design system for the **OACP Console** — shared tokens, theme CSS, and React primitives.

## Usage

```typescript
import { Panel, Badge, Button, tokens } from '@oacp/ui';
```

```css
@import '@oacp/ui/reset.css';
@import '@oacp/ui/theme.css';
```

## Components (Day 2+)

| Component     | Description                                        |
| ------------- | -------------------------------------------------- |
| `Panel`       | Glass HUD panel with header, body, optional footer |
| `Badge`       | Status pill (`live`, `paused`, semantic variants)  |
| `Stat`        | Metric tile (agents / traces / messages)           |
| `Button`      | `primary`, `ghost`, `default` variants             |
| `Toggle`      | Labeled checkbox (Live mode)                       |
| `SearchInput` | Search field with clear affordance                 |

Full API: [docs/console-components.md](../../docs/console-components.md)

## Token categories

| Module               | Contents                                     |
| -------------------- | -------------------------------------------- |
| `colors`             | HUD palette, semantic colors, fleet identity |
| `typography`         | Font families, scale, weights                |
| `spacing` / `layout` | 4px grid, shell dimensions                   |
| `motion`             | Durations and easing                         |
| `shadows`            | Panel glow, focus rings                      |

## Development

```bash
pnpm --filter @oacp/ui build
pnpm --filter @oacp/ui dev
```

Requires `react` and `react-dom` as peer dependencies.

## Related

- [docs/console-architecture.md](../../docs/console-architecture.md)
- [docs/console.md](../../docs/console.md)
