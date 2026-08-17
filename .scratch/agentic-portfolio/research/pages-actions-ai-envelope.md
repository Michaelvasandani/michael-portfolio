# GitHub Pages, Actions, and AI execution envelope

Research date: 2026-08-16

## Answer in brief

The MVP has a supported path using only GitHub Pages, GitHub Actions, GitHub's public APIs, and an external AI provider:

1. Keep source and generated Markdown in the default branch and use the supported Minimal Jekyll theme (`theme: jekyll-theme-minimal`). GitHub recommends Actions for Pages automation, and its official Pages actions can build Jekyll and deploy an artifact. [GitHub: adding a Jekyll theme](https://docs.github.com/en/pages/setting-up-a-github-pages-site-with-jekyll/adding-a-theme-to-your-github-pages-site-using-jekyll), [Minimal theme repository](https://github.com/pages-themes/minimal), [GitHub: custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
2. Run a maintainer workflow from the default branch on `workflow_dispatch` and on a schedule. Poll profile pins daily at a non-round minute, do the more expensive recent-work refresh weekly, and skip the AI call when inputs have not materially changed. GitHub documents the GraphQL `ProfileOwner.pinnedItems` field, but its Actions event catalog has no profile-pin-change event; therefore polling is the supported mechanism (the absence of an event is an inference from the documented catalog). [GitHub GraphQL `ProfileOwner` reference](https://docs.github.com/en/graphql/reference/interfaces#profileowner), [GitHub Actions events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)
3. Treat repository text as untrusted data. Fetch public metadata, README text, languages, releases, and commit summaries, but never execute code from inspected repositories. Pass a bounded, normalized evidence bundle to the model and require schema-validated structured output. OpenAI's Structured Outputs supports strict JSON Schema output on current models, but deterministic code must still enforce the portfolio's semantic invariants. [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
4. Let deterministic code—not the model—merge output into generated files, enforce the append-only Projects rule, run the Jekyll build, and choose direct commit only after validation. Fall back to a pull request for ambiguous output, validation failures requiring review, or when branch rules reject direct pushes.
5. Deploy explicitly in the maintainer run after an automated commit. A push made with `GITHUB_TOKEN` does not trigger another workflow or a Pages build, so an architecture that merely commits and expects a separate `on: push` deployment is incomplete. [GitHub: `GITHUB_TOKEN` event behavior](https://docs.github.com/en/actions/concepts/security/github_token)

This is the recommended MVP over GitHub Agentic Workflows because it is conventional and gives precise control over the append-only content contract. GitHub Agentic Workflows is a credible later simplification/security hardening option, but it is still public preview. GitHub Models is not an option: it was fully retired on July 30, 2026. [GitHub Agentic Workflows overview](https://docs.github.com/en/copilot/concepts/agents/about-github-agentic-workflows), [GitHub Models retirement](https://docs.github.com/en/github-models)

## Supported workflow shape

### Maintainer workflow

Use one privileged workflow file that exists on the default branch and is triggered only by:

- a daily `schedule` used as a cheap pin-change poll;
- a weekly condition within that run for the Recent Work refresh; and
- `workflow_dispatch` for immediate/manual refresh and recovery.

Profile pinning has no documented repository webhook/Actions event. A daily poll is therefore needed to meet “within 24 hours”; a weekly-only schedule cannot meet it. The poll should compare repository node IDs against checked-in generated state, adding newly pinned projects and never deleting previously generated projects. The weekly activity pass can inspect all public repositories but must exclude private repositories before any content is sent to the model.

Scheduled workflows run only from the default branch and may be delayed or even dropped under high load, especially near the start of an hour. In public repositories they are automatically disabled after 60 days with no repository activity. Use an off-minute such as `17`, expose `workflow_dispatch`, surface failures through normal Actions notifications, and decide whether a small state/heartbeat commit before day 60 is acceptable; otherwise this MVP cannot promise indefinite zero-touch scheduling. [GitHub: `schedule` event constraints](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)

Add a workflow-level `concurrency` group so overlapping daily/manual runs cannot race. Make the process idempotent: no input change means no generated-content change, no commit, and no deployment.

### Pages build and deployment

Configure repository Settings → Pages → Build and deployment → Source as **GitHub Actions**. Build with the official Pages/Jekyll actions, upload `_site`, then deploy with `actions/deploy-pages` into the `github-pages` environment. The deploy job requires at least:

```yaml
permissions:
  contents: read
  pages: write
  id-token: write
```

GitHub also recommends restricting the `github-pages` environment so only the default branch can deploy. [GitHub: configuring a Pages publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site), [GitHub: custom Pages workflow requirements](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

Keep ordinary human pushes deployable with a normal `on: push` Pages workflow. For maintainer commits made with `GITHUB_TOKEN`, explicitly invoke the same reusable build/deploy path or build and deploy later in the maintainer run, because that token's push will not start the normal push workflow. Deploy the validated working tree or re-check out the exact committed SHA so the public artifact and repository state cannot diverge.

## Permissions and credentials

Declare permissions per job; once any permission is declared, unspecified permissions become `none`. [GitHub Actions workflow permissions](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#permissions)

| Job | Minimum authority | Notes |
| --- | --- | --- |
| Discover | `contents: read` | `GITHUB_TOKEN` is limited to the workflow repository, but can query public GitHub data. GraphQL gives the token 1,000 points/hour per repository, adequate for a bounded daily portfolio scan if queries are paginated and cached. [GraphQL rate limits](https://docs.github.com/en/graphql/overview/rate-limits-and-query-limits-for-the-graphql-api) |
| Generate with OpenAI WIF | `contents: read`, `id-token: write` | Exchanges GitHub OIDC for a short-lived OpenAI token; no long-lived API key is stored. Scope the OpenAI mapping to the exact repository, default-branch ref, and `workflow_ref`. [OpenAI: GitHub Actions workload identity federation](https://developers.openai.com/api/docs/guides/workload-identity-federation/github-actions) |
| Generate with simple API-key fallback | `contents: read` plus `OPENAI_API_KEY` secret | Pass the secret only to the model-call step. Do not expose it to discovery, validation, build, or deploy steps. [OpenAI API quickstart](https://developers.openai.com/api/docs/quickstart), [GitHub Actions secrets](https://docs.github.com/en/actions/concepts/security/secrets) |
| Direct persistence | `contents: write` | Use only after schema validation, protected-file checks, an append-only project merge, and a successful site build. |
| PR persistence | `contents: write`, `pull-requests: write` | Create/update a dedicated bot branch and PR. Repository Actions settings must enable the combined “Allow GitHub Actions to create and approve pull requests” option; the default for new personal repositories is disabled. Enable it for PR creation, but do not have the workflow approve its own PR. [GitHub Actions repository settings](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository) |
| Pages deploy | `contents: read`, `pages: write`, `id-token: write` | Use the `github-pages` environment and deploy only validated output from the default branch. |

`GITHUB_TOKEN` is a short-lived GitHub App installation token scoped to the workflow repository, so it is preferable to a personal token for same-repository writes. A separate PAT is unnecessary for the default design. If future cross-repository private access is added, use a narrowly scoped GitHub App rather than a broad PAT; private access is explicitly outside this MVP. [GitHub: `GITHUB_TOKEN`](https://docs.github.com/en/actions/concepts/security/github_token), [GitHub: limiting credentials](https://docs.github.com/en/actions/concepts/security/secrets#limiting-credential-permissions)

## Direct publish, pull requests, and branch protection

### Direct publish

Direct persistence is possible when `main` accepts pushes from the Actions token. The workflow can commit generated files with `contents: write`, then explicitly deploy them. It should refuse to commit unless all of these hold:

- the only changed paths are generated Projects/Recent Work data and machine state;
- existing project identities remain present (new pins are append-only; unpinning is not deletion authority);
- the model output matches a strict schema and all repository links point to public repositories;
- the generated text has length/content bounds and no raw HTML/script payloads;
- the Jekyll build succeeds; and
- a no-op diff produces neither a commit nor a deployment.

The model should never receive the write token. Generation and write/deploy authority should be separate jobs, with validated artifacts crossing the boundary.

### Pull-request fallback

A PR is required when branch rules require a pull request or required checks, when the generated patch exceeds the allowed paths/size, or when confidence/validation is insufficient. `GITHUB_TOKEN` can create the branch and PR if repository settings permit it, but PR workflows created by that token enter an approval-required state. If fully automatic PR checks are later required, GitHub documents using a GitHub App installation token or PAT instead. [GitHub: workflow triggering by `GITHUB_TOKEN`](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow)

Branch protection/rulesets apply independently of workflow YAML. Requiring PRs or status checks can block direct bot pushes. Organization-owned repositories can place installed GitHub Apps on bypass/push lists; personal repositories cannot use the same actor bypass-list mechanism. For the simplest personal-repository MVP, choose either (a) direct generated-content pushes with no incompatible required-PR rule, or (b) protected `main` plus PR-only persistence. Do not weaken branch rules dynamically from the workflow. [GitHub: protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches), [GitHub: managing branch protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/managing-a-branch-protection-rule)

## AI runtime choices as of 2026-08-16

### Recommended: external OpenAI API from ordinary Actions code

Use the OpenAI Responses API through the official SDK and request structured output. Authentication can be either:

- **Simplest MVP:** a repository Actions secret containing a project-scoped API key;
- **Preferred hardening:** OpenAI workload identity federation, which exchanges a GitHub OIDC token for a short-lived OpenAI token and binds trust to exact GitHub claims.

WIF avoids a long-lived bearer secret but adds OpenAI-side provider/service-account configuration. It should not block the MVP if “keep it simple” is controlling; the code should isolate authentication so migration is mechanical.

API usage is metered by input/output tokens and rate-limited by model/project. Implement bounded context, timeouts, exponential backoff for transient/rate-limit errors, a maximum attempt count, and fail closed (retain current site content) after exhausted retries. Prices change by model and processing tier; the current official table is the source of truth. As of the research date, **standard-processing, short-context** prices are $0.20/M input and $1.20/M output for `gpt-5.6-luna`, and $2.00/M input and $12.00/M output for `gpt-5.6-terra`. Batch and Flex are cheaper but trade away immediate, predictable completion, while Fast mode is more expensive. Long-context requests cost more, so the maintainer should stay well below that tier. [OpenAI API pricing](https://developers.openai.com/api/docs/pricing), [OpenAI Batch API](https://developers.openai.com/api/docs/guides/batch), [OpenAI Flex processing](https://developers.openai.com/api/docs/guides/flex-processing), [OpenAI rate limits](https://developers.openai.com/api/docs/guides/rate-limits), [OpenAI error codes](https://developers.openai.com/api/docs/guides/error-codes)

Use deterministic pre-filtering and one compact request per run rather than feeding whole repositories. At 100,000 input and 5,000 output tokens, the listed standard prices imply about $0.026/run on Luna or $0.26/run on Terra; this is an illustrative calculation, not a budget guarantee. Configure an OpenAI project spend limit and record token usage in the Actions summary. Batch processing can halve the token price but has up to a 24-hour turnaround, so it is a poor fit for a run that must validate, commit, and deploy synchronously. [OpenAI spend limits](https://developers.openai.com/api/docs/guides/spend-limits), [OpenAI Batch API](https://developers.openai.com/api/docs/guides/batch)

### Alternative: GitHub Agentic Workflows

GitHub Agentic Workflows (`gh-aw`) can run Copilot, Codex, Claude, or Gemini engines inside Actions with sandboxing, read-only agent permissions, network controls, threat detection, and “safe outputs” performed by separate write-capable jobs. It supports creating pull requests and is architecturally well matched to an agentic portfolio. Cost combines Actions minutes and inference; its common accounting unit is AI Credits, where 1 AIC equals $0.01. [GitHub Agentic Workflows](https://github.github.com/gh-aw/), [safe outputs](https://github.github.com/gh-aw/reference/safe-outputs/), [usage and billing](https://docs.github.com/en/copilot/concepts/agents/about-github-agentic-workflows#usage-and-billing)

However, it is public preview and introduces generated lock workflows/tooling. Prefer it only if the project explicitly accepts preview dependency risk in exchange for its guardrails. Its safe-output PR route is preferable to granting the agent general repository write permission.

### Not available: GitHub Models

Do not design around the former `models: read` permission or GitHub Models inference endpoint. GitHub states that the playground, model catalog, inference API, and BYOK capability were fully retired on July 30, 2026. [GitHub Models retirement](https://docs.github.com/en/github-models)

## Security envelope

- Trigger the privileged maintainer only from the trusted default-branch workflow via schedule/manual dispatch; do not run it with secrets or write permissions on arbitrary pull requests.
- Never use `pull_request_target` to check out untrusted code. Never clone-and-execute inspected repositories. Repository names, README text, commit messages, and issue text are both prompt-injection input and potential shell-injection input; pass them as data files/environment values, not interpolated shell source.
- Give the AI job read-only GitHub access and no repository write token. Apply writes in a deterministic downstream job after schema, path, and build validation.
- Pin every action to a full immutable commit SHA. GitHub calls this the only immutable action reference and recommends least-privilege token scopes. [GitHub Actions secure-use reference](https://docs.github.com/en/actions/reference/security/secure-use)
- Secrets are encrypted and injected only when explicitly referenced, but log redaction is not guaranteed for transformed values. Never print request headers, OIDC tokens, exchanged access tokens, or model-provider keys; rotate any credential that appears in logs. [GitHub Actions secrets](https://docs.github.com/en/actions/concepts/security/secrets)
- Preserve the last known-good generated files when discovery, model inference, validation, commit, or deployment fails. A failed refresh must not blank or partially replace the public site.

## Material platform limits and reliability consequences

- Standard GitHub-hosted runners are free for public repositories; AI inference remains separately billable. [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
- `GITHUB_TOKEN` has a documented GraphQL limit of 1,000 points/hour per repository. Paginate, cache prior state, stop after public repositories, and summarize before the model call. [GraphQL rate limits](https://docs.github.com/en/graphql/overview/rate-limits-and-query-limits-for-the-graphql-api)
- Scheduled runs are best-effort, can be delayed/dropped at high load, and are disabled after 60 inactive days in public repositories. `workflow_dispatch` is the recovery control; a periodic checked-in heartbeat is the only repository-local way identified here to prevent inactivity without human action. [GitHub `schedule` event](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)
- Pages deployments time out after 10 minutes; published sites may be at most 1 GB and have a soft 100 GB/month bandwidth limit. The 10-builds/hour soft limit does not apply to custom Actions publishing. These are generous for the intended Markdown portfolio. [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
- Pages can take time to publish, and deployment is a separate failure surface from committing generated content. Record the committed SHA in deployment output and retain normal Actions logs/notifications.

## Decisions this research enables

An implementation decision can now choose between two clear envelopes:

1. **Conventional/stable MVP (recommended):** deterministic TypeScript or Python maintainer + OpenAI Responses API; daily pin polling, weekly digest; validated direct commit where branch rules permit; PR fallback; explicit same-run Pages deploy.
2. **Preview/guardrailed MVP:** GitHub Agentic Workflows with read-only agent and safe-output PR creation, followed by merge-triggered Pages deployment.

Whichever is selected, the design must explicitly account for no pin-change webhook, `GITHUB_TOKEN` not recursively triggering the Pages workflow, the 60-day scheduled-workflow inactivity rule, and the append-only project requirement.
