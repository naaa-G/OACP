# Screenshots & visual assets

Capture these assets before public launch. Store files under `docs/public/screenshots/` so they
work on the docs site and in README links.

## Required shots

| #   | Filename                   | What to capture                           | How                                       |
| --- | -------------------------- | ----------------------------------------- | ----------------------------------------- |
| 1   | `playground-agents.png`    | Agent registry + graph during startup run | Playground during `oacp run --keep-alive` |
| 2   | `playground-messages.png`  | Message timeline with task flow           | Same session, scroll to message panel     |
| 3   | `cli-run-output.png`       | Terminal JSON from `oacp run`             | `--format json` or default output         |
| 4   | `architecture-diagram.svg` | Layer diagram                             | Already at `/architecture-diagram.svg`    |

## Capture workflow

### 1. Start the demo

```bash
pnpm build
pnpm oacp run "build todo app" --keep-alive
```

Copy the `playground_url` from output (includes `trace_id`).

### 2. Playground screenshots

Open the playground URL in Chrome or Edge (dark theme recommended).

Recommended viewport: **1440×900** or **1920×1080**.

Capture:

- Full page or key panels (agents, graph, messages)
- Ensure at least one agent node is highlighted/active

**Windows:** `Win + Shift + S` → save to `docs/public/screenshots/`  
**macOS:** `Cmd + Shift + 4`  
**Linux:** `gnome-screenshot -a`

### 3. CLI screenshot

Re-run or use existing terminal output:

```bash
pnpm oacp run "build habit tracker" --format json
```

Crop to show `repo_structure`, `qa_status`, and `playground_url`.

### 4. Optional gallery shots

| Filename                   | Command                                          |
| -------------------------- | ------------------------------------------------ |
| `gallery-coding-swarm.png` | `pnpm --filter oacp-examples start:coding-swarm` |
| `docs-site-home.png`       | `pnpm docs:dev` → http://localhost:5173          |

## Automated helper (Windows)

From repo root:

```powershell
.\scripts\capture-launch-assets.ps1
```

This runs the demo, prints the playground URL, and opens capture instructions.

## Using screenshots in README

After capturing, add to README (optional):

```markdown
![OACP Playground](./docs/public/screenshots/playground-agents.png)
```

On the docs site:

```markdown
![Playground agents](/screenshots/playground-agents.png)
```

## Quality guidelines

- **Consistency** — same OS theme for all shots (dark preferred; matches playground)
- **No secrets** — crop API keys, local paths, or personal info
- **Readable text** — minimum 1280px width for playground captures
- **PNG format** — lossless for UI chrome and text
- **Alt text** — describe what the screenshot shows for accessibility

## Placeholder until captured

Until real PNGs exist, use the architecture SVG and the live playground during demos.
The [demo video script](./demo-video-script.md) can serve as the primary visual asset for launch day.
