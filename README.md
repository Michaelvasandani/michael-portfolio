# Michael Vasandani portfolio

This repository contains the GitHub Pages Minimal-theme portfolio and its TypeScript Portfolio Maintainer.

## Local checks

```sh
npm install
npm test
npm run typecheck
npm run build
```

The site is static Jekyll-compatible HTML. Run `python3 -m http.server 4173` from the repository root for a quick local preview.

## Portfolio Maintainer

Run a pin synchronization or weekly digest refresh with `npm run maintainer:pins` or `npm run maintainer:digest`. The maintainer reads only public GitHub endpoints, requires `GITHUB_TOKEN` for GraphQL pins, and requires `OPENAI_API_KEY` when evidence needs structured generation. `PORTFOLIO_GITHUB_LOGIN` defaults to `Michaelvasandani`.

Machine-owned files are limited to `_data/generated/projects.json`, `_data/generated/recent-work.json`, and `.portfolio-maintainer/state.json`. Project Profiles are append-only; resume-derived content in `_data/profile.json` is protected. Failed validation or persistence preserves the previous checkpoint.
