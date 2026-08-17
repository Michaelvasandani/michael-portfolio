# Configure Pages and automation

Type: task
Status: claimed
Blocked by: 07

## Question

Complete the repository and GitHub configuration that cannot be established solely in code: GitHub Pages settings, required Actions permissions and secrets, the weekly schedule, manual dispatch, direct-publish permissions, and pull-request fallback.

## Comments

- 2026-08-16: Verified blocker [Build the site and Portfolio Maintainer](07-build-the-site-and-maintainer.md) is resolved, then claimed this ticket before work. Added `.github/workflows/portfolio.yml` with off-minute six-hour pin polling, Monday weekly digest scheduling, `workflow_dispatch` modes (`pins`, `digest`, `deploy`), pinned Actions, generated-only direct publication, deterministic pull-request fallback, and same-run Jekyll/Pages deployment. The workflow keeps maintainer execution read-only, grants write access only to publication, and grants Pages/id-token access only to deployment.
- 2026-08-16: Configured repository Pages for workflow publishing on `codex/build-site-maintainer` (`https://michaelvasandani.github.io/michael-portfolio/`), left default Actions permissions read-only, and enabled repository full-SHA action pinning. No repository Actions secrets were present (secret names query returned empty). A manual deploy run (`31993539657`) and push deploy run (`31993495306`) both completed successfully; the live site returned HTTP 200.
- 2026-08-16: Remaining blocker: `OPENAI_API_KEY` is required for pin/digest generation but is not configured. Manual pin run `31993589326` failed closed with `OPENAI_API_KEY is required for Portfolio Maintainer generation` before any write. An operator must add a project-scoped OpenAI API key as the repository Actions secret named `OPENAI_API_KEY` through GitHub Settings → Secrets and variables → Actions, without placing the value in the repository or logs, then rerun `workflow_dispatch` in `pins` and `digest` modes and verify a successful checkpoint/Pages deployment. Ticket stays claimed until that human-only setup and verification are complete.
