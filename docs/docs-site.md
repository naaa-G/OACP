# Documentation site

The OACP documentation site is a [VitePress](https://vitepress.dev/) static site generated from Markdown in this repository.

## Local development

```bash
pnpm install
pnpm docs:dev
```

Open [http://localhost:5173](http://localhost:5173).

## Build & preview

```bash
pnpm docs:build
pnpm docs:preview
```

Output: `docs/.vitepress/dist/`

## Key pages

| Page          | Path              |
| ------------- | ----------------- |
| Home          | `/`               |
| What is OACP? | `/what-is-oacp`   |
| Quick start   | `/quick-start`    |
| Full index    | `/guide/overview` |

## Deployment

GitHub Pages workflow: [`.github/workflows/docs.yml`](../.github/workflows/docs.yml)

Live site: [`https://naaa-g.github.io/OACP`](https://naaa-g.github.io/OACP) (see
[`docs/.vitepress/repo.mjs`](./.vitepress/repo.mjs) for canonical URLs).

On push to `main`, the site deploys with base path `/<repo-name>/` (currently `/OACP/`).
Override for other hosts:

```bash
VITEPRESS_BASE=/ pnpm docs:build
```

## Customization

| File                               | Purpose                                    |
| ---------------------------------- | ------------------------------------------ |
| `docs/.vitepress/repo.mjs`         | GitHub clone URL, repo slug, docs site URL |
| `docs/.vitepress/config.mjs`       | Nav, sidebar, search, edit links           |
| `docs/.vitepress/theme/custom.css` | Brand colors                               |
| `docs/index.md`                    | Home page hero and features                |

Existing guides in `docs/*.md` are included automatically — add a sidebar entry in `config.mjs` when you create new pages.
