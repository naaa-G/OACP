# Post-launch runbook (Week 1)

Operational checklist after **Day 30** public launch. Pair with [Launch day](./launch-day.md) for publish steps and [Community](./community.md) for support channels.

## Day 0 — launch day

- [ ] `pnpm verify` and `pnpm docs:build` green on `main`
- [ ] GitHub repo **public** (Settings → General → Danger zone)
- [ ] GitHub Pages enabled (Settings → Pages → GitHub Actions)
- [ ] Create release `v0.1.0-alpha` (see [Create the GitHub release](#create-the-github-release))
- [ ] Verify docs live: [https://naaa-g.github.io/OACP/quick-start](https://naaa-g.github.io/OACP/quick-start)
- [ ] Post Show HN, Reddit, X per [launch-day.md](./launch-day.md)
- [ ] Pin release on GitHub repository home

## First 48 hours

| Task                            | Owner      | Notes                                                      |
| ------------------------------- | ---------- | ---------------------------------------------------------- |
| Monitor HN / Reddit / X threads | Maintainer | Reply within 2h during waking hours                        |
| Triage new GitHub Issues        | Maintainer | Label `bug`, `enhancement`, `question`, `good first issue` |
| Watch CI on `main`              | Maintainer | Fix regressions before new features                        |
| Enable Discussions categories   | Maintainer | Q&A, Ideas, Show and tell                                  |

### Suggested GitHub labels

Create in **Issues → Labels** if missing:

- `bug`, `enhancement`, `documentation`, `good first issue`, `help wanted`
- `area:core`, `area:server`, `area:sdk`, `area:playground`, `area:docs`
- `priority:high` for launch blockers only

## Week 1 metrics (lightweight)

Track informally — no analytics required for alpha:

| Metric                     | Where                    |
| -------------------------- | ------------------------ |
| GitHub stars               | Repository home          |
| Clone / fork count         | Insights → Traffic       |
| Issue volume & themes      | Issues + Discussions     |
| `oacp run` failure reports | Issues tagged `area:cli` |

## Feedback → roadmap

1. Cluster similar Discussions / Issues weekly.
2. Critical bugs → patch release `v0.1.0-alpha.1` (or `v0.1.1` when semver clarifies).
3. Non-urgent features → [README roadmap](https://github.com/naaa-G/OACP#-roadmap) and GitHub milestones.

## Create the GitHub release

### Option A — GitHub web UI

1. **Releases → Draft a new release**
2. Tag: `v0.1.0-alpha` (create from `main`)
3. Title: `OACP v0.1.0-alpha — multi-agent collaboration you can see live`
4. Paste body from [`.github/RELEASE_v0.1.0-alpha.md`](https://github.com/naaa-G/OACP/blob/main/.github/RELEASE_v0.1.0-alpha.md)
5. Check **Set as the latest release** · Publish

### Option B — GitHub CLI

```bash
git checkout main && git pull
pnpm verify
git tag -a v0.1.0-alpha -m "OACP v0.1.0-alpha public launch"
git push origin v0.1.0-alpha
gh release create v0.1.0-alpha \
  --title "OACP v0.1.0-alpha — multi-agent collaboration you can see live" \
  --notes-file .github/RELEASE_v0.1.0-alpha.md
```

### Option C — helper script

```bash
# Windows
.\scripts\tag-release.ps1 -Version v0.1.0-alpha

# macOS / Linux
./scripts/tag-release.sh v0.1.0-alpha
```

Scripts run `pnpm verify` then print tag + `gh release create` commands (they do not push without your confirmation).

## v0.1.1 patch policy (alpha)

Ship a patch only for:

- Security fixes
- `pnpm verify` / CI broken on `main`
- `oacp run` or playground unusable on Node 20 LTS

Defer feature work to `v0.2.0` planning.

## Related

- [Launch day playbook](./launch-day.md)
- [Community & support](./community.md)
- [Launch kit](./launch-kit.md)
- [Release notes (v0.1.0-alpha)](./releases/v0.1.0-alpha.md)
