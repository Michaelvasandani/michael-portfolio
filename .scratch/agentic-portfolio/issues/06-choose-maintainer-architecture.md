# Choose the Portfolio Maintainer architecture

Type: grilling
Status: resolved
Blocked by: 01, 02, 04

## Question

Which researched GitHub and AI execution approach should implement discovery, analysis, generated-data storage, protected-content boundaries, scheduling, pin-change latency, safe direct publication, and pull-request escalation for the MVP?

## Comments

## Answer

Implement the MVP as a conventional GitHub Actions pipeline backed by a TypeScript/Node Portfolio Maintainer. Use Octokit for GitHub REST and GraphQL access and the OpenAI Responses API with strict structured output. GitHub Agentic Workflows and external infrastructure are not part of the MVP.

### Execution and authority

Use one workflow with separate least-privilege jobs for discovery, AI generation, deterministic validation, persistence, pull-request escalation, and Pages deployment. Pass a bounded candidate artifact between jobs. The model-facing jobs receive no repository-write authority; only persistence receives `contents: write`, only escalation receives `pull-requests: write`, and only deployment receives `pages: write` and `id-token: write`.

Use the workflow's repository-scoped `GITHUB_TOKEN` for GitHub discovery. Query only public endpoints, explicitly verify that every inspected repository is public and non-fork, and fail closed on inconsistent visibility. For OpenAI, use a project-scoped API key stored in GitHub Actions secrets. Local development may load credentials from the ignored repository `.env` file, which must never be committed.

### Discovery and generation

Run lightweight Pinned Project synchronization every six hours, off the top of the hour. Run full Recent Work Digest analysis weekly. A manual dispatch supports either mode. The 24-hour pin-detection objective is best effort for the MVP because GitHub Actions schedules can be delayed or dropped; an external monitored scheduler is deferred unless a strict guarantee becomes necessary.

Deterministic code performs discovery, evidence hydration, visibility and attribution checks, candidate construction, and final validation. Generate each newly discovered Pinned Project with its own bounded structured model call, and generate the weekly digest with one bounded structured call. Never regenerate an existing Project Profile automatically.

### Storage and protected boundaries

Store canonical machine-owned JSON in exactly these allowlisted paths:

- `_data/generated/projects.json` for append-only Project Profiles;
- `_data/generated/recent-work.json` for the replaceable Recent Work Digest; and
- `.portfolio-maintainer/state.json` for pin snapshots, represented repository node IDs, activity cursors, and escalation fingerprints.

Jekyll templates render the publishable data. The automated refresh may not change any other path; all other site content and structure are Protected Content for this pipeline.

### Publication and escalation

Serialize refreshes with workflow concurrency. Treat each mode as an atomic transaction: derive a candidate from the current default-branch head, validate the entire candidate, build the site, then commit Generated Content and corresponding machine state together. If the base changes or any stage fails, preserve the last known-good commit and deployment and retry from the new head where appropriate.

Choose the publication route before repository mutation. A candidate may commit directly only when every generated-content contract check passes and current branch rules permit the workflow write. Explicitly deploy the already-validated committed revision in the same run because a `GITHUB_TOKEN` commit does not trigger another workflow. Do not weaken branch rules.

Create a human-reviewed branch and pull request for an otherwise valid candidate that requires interpretation or is structurally outside direct-publication bounds. Use a deterministic candidate fingerprint, create one pull request per distinct candidate, and suppress duplicates while an equivalent pull request remains open. Never deploy from the review branch; deployment follows normal merge handling. Private-data risk, Protected Content changes, destructive Project Profile behavior, stale bases, inconsistent state, or global validation failure abort rather than silently becoming a pull request.
