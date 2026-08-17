# Define Portfolio Maintainer recovery and observability

Type: grilling
Status: resolved
Blocked by: 06

## Question

Given the chosen Portfolio Maintainer architecture, what observable state, notifications, retries, and operator recovery paths should handle delayed or disabled schedules, GitHub or OpenAI rate limits and outages, invalid model output, stale default-branch heads, direct-commit or Pages deployment failure, duplicate escalation, and corrupt machine state while preserving the last known-good portfolio?

## Comments

## Answer

Use a checkpointed, fail-closed operating model that distinguishes the committed **Maintainer Checkpoint** from the **Published Revision** currently served by GitHub Pages. Only a validated commit of Generated Content and corresponding machine state advances the Maintainer Checkpoint. Failed attempts never advance canonical cursors or state. Pages continues serving the previous Published Revision until a newer checkpoint deploys successfully.

### Observable state

- Record canonical successful state in the repository-backed machine state and Generated Content committed together at the Maintainer Checkpoint.
- Emit a detailed GitHub Actions summary for every attempt, including mode and trigger, stage results, retry counts, checkpoint age, candidate or commit identity, deployment result, and linked escalation.
- Retain bounded evidence and candidate artifacts from failed attempts for 30 days. They are diagnostic records, not canonical state and must respect the same public-only and secret-handling boundaries as the pipeline.
- Expose last-success timestamps for pin synchronization and digest refresh. Once a workflow can observe that pin synchronization is older than 24 hours or digest refresh is older than 8 days, create or update a Maintainer Incident.
- Accept the MVP limitation that GitHub-only monitoring cannot proactively report total GitHub Actions disablement because no workflow can run. Last-success timestamps provide a manual inspection path; an independent external monitor remains outside this MVP.

### Notifications and escalation

- Use GitHub-native notification surfaces only. Recovered transient failures remain in the run summary. Create a Maintainer Incident only when retries are exhausted, operator action is required, state integrity is uncertain, or a publishing objective is overdue.
- Represent each Maintainer Incident as a deduplicated GitHub issue assigned to Michael. Fingerprint incidents by failure class and affected scope, update the matching open issue with each recurrence, and suppress duplicate issues.
- Continue using candidate-specific fingerprints for review pull requests. Incident fingerprints and review-candidate fingerprints are deliberately different identities.
- When the matching recovery succeeds, add a recovery comment and automatically close the Maintainer Incident. GitHub retains the closed issue as operational history.

### Retries and failure handling

- Retry transient network failures, provider 5xx responses, and eligible GitHub or OpenAI rate limits up to three times with bounded exponential backoff and jitter, honoring `Retry-After` and rate-limit reset information. If the required delay exceeds the run's retry budget, stop safely and defer to a later scheduled or manual attempt.
- On invalid model output, permit one fresh structured-output regeneration. If it remains invalid, publish nothing and create or update the corresponding Maintainer Incident.
- If deterministic discovery succeeds while OpenAI is unavailable, retain its bounded evidence only as a temporary attempt artifact. Do not advance cursors or machine state; rediscover from the Maintainer Checkpoint on retry.
- If the default-branch head changes before persistence, recompute the entire candidate once from the new head. If it changes again, publish nothing and defer rather than looping indefinitely.
- If an unexpected direct commit fails after the publication route was chosen, preserve the candidate as a temporary artifact and create or update a Maintainer Incident. Do not improvise a pull request; pull-request routing is decided before mutation from known policy and candidate characteristics.
- If Pages deployment fails after a checkpoint commit, keep that checkpoint and the previous Published Revision. Retry deployment of the exact checkpoint before generating newer work; never revert the validated commit merely because deployment failed.
- If machine state is corrupt or inconsistent with Generated Content, fail closed. Generate a proposed state repair for human review rather than automatically rebuilding, resetting, or publishing repaired state.

### Operator recovery

Provide explicit manual-dispatch operations for pin synchronization, digest refresh, deployment of an exact checkpoint, and creation of a reviewed state-repair proposal. Recovery operations use the normal least-privilege jobs and validation gates. Do not provide a generic force-refresh or bypass mode.

Across every failure path, the invariant is that the last known-good Published Revision remains live and Protected Content is never mutated by recovery.
