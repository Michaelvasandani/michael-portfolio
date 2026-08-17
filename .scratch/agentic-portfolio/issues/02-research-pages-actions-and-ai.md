# Establish the deployment and agent execution envelope

Type: research
Status: resolved

## Question

Using primary documentation, what supported architecture can deploy the Minimal theme through GitHub Pages and run an AI-backed Portfolio Maintainer in GitHub Actions that safely writes generated content? Establish permissions, branch-protection implications, secret handling, direct-publish versus pull-request mechanisms, available AI-runtime options, and material cost or reliability constraints.

## Comments

## Answer

Use a conventional GitHub Actions workflow with the supported Minimal Jekyll theme and an external OpenAI Responses API call. Keep discovery and generation read-only; pass only bounded public-repository evidence to the model; require strict structured output; and let deterministic code enforce protected paths, append-only Project Profiles, public-only links, content bounds, and a successful Jekyll build before any write.

Separate authority by job: `contents: read` for discovery/generation, `contents: write` only for validated persistence, `pull-requests: write` only for the review path, and `pages: write` plus `id-token: write` only for deployment. Prefer OpenAI workload identity federation scoped to the repository, ref, and workflow when practical; a project-scoped API key in Actions secrets is the simpler MVP fallback. Never expose the repository write token to the model job.

Publish validated generated-only changes directly only when branch rules permit. Otherwise, or whenever output is uncertain, destructive, protected, structural, or outside deterministic bounds, open a human-reviewed pull request. A `GITHUB_TOKEN` commit does not trigger another workflow or Pages build, so a direct-write run must explicitly build and deploy the committed revision in the same run. Branch protection is an architectural input: required pull requests or checks can preclude direct writes, and the workflow must not weaken those rules.

GitHub Agentic Workflows is a plausible later alternative with useful safe-output guardrails, but its public-preview status makes conventional Actions the lower-risk MVP. GitHub Models is unavailable because GitHub retired it on July 30, 2026. Material reliability constraints include delayed or dropped scheduled runs, automatic schedule disabling after 60 days of inactivity in public repositories, separate inference cost/rate limits, and Pages deployment limits. Use off-minute scheduling, `workflow_dispatch`, concurrency control, idempotency, bounded retries, fail-closed behavior that preserves the last known-good site, and normal Actions/deployment monitoring.

Detailed evidence, current cost examples, and primary-source citations: [GitHub Pages, Actions, and AI execution envelope](../research/pages-actions-ai-envelope.md).
