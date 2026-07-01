# v1.0.0-rc.1 checklist

Use before tagging **OACP** and **MCPLab** `v1.0.0-rc.1`.

## Automated gate

```bash
pnpm test:day59
# optional with MCPLab clone + running OACP:
pnpm test:day59:live
```

| Step            | Command                | Expected                 |
| --------------- | ---------------------- | ------------------------ |
| Full verify     | `pnpm verify`          | exit 0                   |
| Load + security | `pnpm test:day55`      | exit 0                   |
| Demo rehearsal  | demo-rehearsal.test.ts | 2 rounds × 3 crews       |
| RC sync         | day59-rc-sync.test.ts  | 50 traces after recreate |
| MCP smoke       | mcp-oacp-smoke.test.ts | register + snapshot      |
| Docs            | `pnpm docs:build`      | exit 0                   |

## Manual smoke (15 min)

- [ ] `docker compose up --build -d` → Console loads
- [ ] `pnpm demo:custom-agents` → trace visible in Console
- [ ] `pnpm docker:mcplab` (if MCPLab present) → crew → Console deep link
- [ ] Recreate OACP: `docker compose up -d --force-recreate oacp` → prior MCPLab traces return after sync

## Blockers

| Severity | Status                                                                               |
| -------- | ------------------------------------------------------------------------------------ |
| **P0**   | None — RC cut approved                                                               |
| **P1**   | Backlog only ([load-security-smoke.md](../load-security-smoke.md)) — not RC blockers |

## Tagging

Only after all checks pass on the commit you intend to release:

```powershell
.\scripts\tag-release.ps1 -Version v1.0.0-rc.1
# then:
git tag -a v1.0.0-rc.1 -m "OACP v1.0.0-rc.1 release candidate"
gh release create v1.0.0-rc.1 --prerelease --title "OACP v1.0.0-rc.1" --notes-file .github/RELEASE_v1.0.0-rc.1.md
```

MCPLab: see [mcplab-public-launch.md](../mcplab-public-launch.md)

## Sign-off

| Role     | Date | Notes                                 |
| -------- | ---- | ------------------------------------- |
| Platform |      | `pnpm test:day59`                     |
| Console  |      | E2E green in CI                       |
| MCPLab   |      | quick eval or full gold (optional RC) |
