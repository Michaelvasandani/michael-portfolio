# Configure Pages and automation

Type: task
Status: resolved
Blocked by: 07

## Question

Complete the repository and GitHub configuration that cannot be established solely in code: GitHub Pages settings, required Actions permissions and secrets, the weekly schedule, manual dispatch, direct-publish permissions, and pull-request fallback.

## Comments

- 2026-08-16: Verified blocker [Build the site and Portfolio Maintainer](07-build-the-site-and-maintainer.md) is resolved, then claimed this ticket before work. Added `.github/workflows/portfolio.yml` with off-minute six-hour pin polling, Monday weekly digest scheduling, `workflow_dispatch` modes (`pins`, `digest`, `deploy`), pinned Actions, generated-only direct publication, deterministic pull-request fallback, and same-run Jekyll/Pages deployment. The workflow keeps maintainer execution read-only, grants write access only to publication, and grants Pages/id-token access only to deployment.
- 2026-08-16: Configured repository Pages for workflow publishing on `codex/build-site-maintainer` (`https://michaelvasandani.github.io/michael-portfolio/`), left default Actions permissions read-only, and enabled repository full-SHA action pinning. No repository Actions secrets were present (secret names query returned empty). A manual deploy run (`31993539657`) and push deploy run (`31993495306`) both completed successfully; the live site returned HTTP 200.
- 2026-08-16: Remaining blocker: `OPENAI_API_KEY` is required for pin/digest generation but is not configured. Manual pin run `31993589326` failed closed with `OPENAI_API_KEY is required for Portfolio Maintainer generation` before any write. An operator must add a project-scoped OpenAI API key as the repository Actions secret named `OPENAI_API_KEY` through GitHub Settings → Secrets and variables → Actions, without placing the value in the repository or logs, then rerun `workflow_dispatch` in `pins` and `digest` modes and verify a successful checkpoint/Pages deployment. Ticket stays claimed until that human-only setup and verification are complete.

## Answer

Configured and verified the Pages and Portfolio Maintainer automation on `codex/build-site-maintainer`.

- The repository Actions secret list now contains `OPENAI_API_KEY` (verified by name only; its value was never printed or read back).
- Manual pin refresh [31995962411](https://github.com/Michaelvasandani/michael-portfolio/actions/runs/31995962411) passed tests, type-check, site validation, OpenAI generation, candidate upload, direct generated-only publication, and Pages deployment. It generated four new Project Profiles and committed `e1e46f7b77b7f7a540ee67bdf08a3e54a875857f`.
- Manual digest refresh [31996070145](https://github.com/Michaelvasandani/michael-portfolio/actions/runs/31996070145) passed the same gates, generated three Recent Work Digest entries, committed `0cf4fe6f35244b51d5a9510ed96973cb5c4d2959`, and deployed Pages.
- The repository uses workflow-mode Pages publishing at `https://michaelvasandani.github.io/michael-portfolio/`, read-only default workflow permissions, full-SHA action pinning, and `can_approve_pull_request_reviews: true` so the configured fallback can create review PRs.
- After fixing fallback variable consumption to use `${{ vars.PORTFOLIO_FORCE_PULL_REQUEST }}`, fallback verification [31996443215](https://github.com/Michaelvasandani/michael-portfolio/actions/runs/31996443215) created generated-only PR #1, skipped Pages deployment as required, and completed successfully. The temporary PR and branch were closed/deleted and the force variable was removed; no test artifact remains.
- Final local validation remained green (`npm test`, `npm run typecheck`, `npm run build`, YAML parse), the live site returned HTTP 200, and the final workflow fix was pushed in `f1293303d7573fe7886004a33225eacfddabc12c`.
