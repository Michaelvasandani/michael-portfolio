# GitHub pins and public-activity signals

Researched 2026-08-16 from GitHub's official documentation.

## Recommendation

Use a small polling design, not an event-driven design:

1. Query the GitHub GraphQL API for the user's pinned repositories every six hours at a non-zero minute, and also expose `workflow_dispatch` for immediate/manual refresh.
2. Persist both the last successful pin snapshot and the set of repository node IDs already represented in the portfolio. A repository in the current snapshot but absent from the previous snapshot was newly observed as pinned; append it only when it is also absent from the represented set. Never interpret absence from the current pin set as a deletion signal; this preserves previously featured projects after they are unpinned.
3. On the weekly maintainer run, use the user's public Events REST endpoint as the discovery feed for public work in both personally owned and organization-owned repositories. Hydrate candidate events with repository, commit/compare, pull-request, and release endpoints before asking the agent whether the work is meaningful.
4. Enforce the public-only boundary in code: use the explicitly public user/events and repository endpoints, reject any item whose repository visibility is not `public`, and do not use authenticated-user event/repository endpoints that can return private resources.

This is reliable enough for a best-effort MVP “within 24 hours” objective, but GitHub Actions does not offer a strict 24-hour guarantee because scheduled jobs may be delayed or dropped. Multiple daily checks reduce the practical risk. If “within 24 hours” is a hard service-level objective, use an external scheduler with its own retry/monitoring guarantee to invoke the observer or a `repository_dispatch` workflow.

## Discovering profile Pinned Projects

GitHub exposes profile pins through GraphQL, not through a documented REST endpoint. `ProfileOwner.pinnedItems` returns the repositories and gists pinned to a profile and accepts a `types` filter; request `types: REPOSITORY` and use repository `id` (the stable node ID), `nameWithOwner`, `url`, `description`, `isPrivate`, `isFork`, `isArchived`, `repositoryTopics`, `languages`, and `defaultBranchRef` as useful discovery metadata. GitHub profiles currently permit up to six pinned repositories/gists. The `PinnableItem` union can contain only `Gist` or `Repository`, so filtering and/or an inline `... on Repository` fragment is required. [GitHub GraphQL `ProfileOwner` reference](https://docs.github.com/en/graphql/reference/interfaces#profileowner) [GitHub GraphQL `PinnableItem` reference](https://docs.github.com/en/graphql/reference/unions#pinnableitem) [GitHub profile pin rules](https://docs.github.com/en/account-and-profile/how-tos/profile-customization/pinning-items-to-your-profile)

Minimal query shape:

```graphql
query PortfolioPins($login: String!) {
  user(login: $login) {
    pinnedItems(first: 6, types: REPOSITORY) {
      nodes {
        ... on Repository {
          id
          nameWithOwner
          url
          description
          isPrivate
          isFork
          isArchived
        }
      }
    }
  }
}
```

GraphQL calls require authentication; GitHub supports a personal access token, GitHub App, or OAuth app. In Actions, the built-in `GITHUB_TOKEN` is the simplest credential for public reads, subject to its repository-scoped permissions and rate limit. [GitHub GraphQL authentication](https://docs.github.com/en/graphql/guides/forming-calls-with-graphql#authenticating-with-graphql) [About `GITHUB_TOKEN`](https://docs.github.com/en/actions/concepts/security/github_token)

The current pin result is a snapshot, not an audit log. The documented `PinnableItemEdge` contains only `cursor` and `node`; it has no `pinnedAt` or other change timestamp. Consequently, the Portfolio Maintainer can infer only that a pin appeared between two successful snapshots, not when within that interval it was pinned. An initial baseline cannot distinguish old pins from new ones, and a pin/unpin—or unpin/re-pin of the same repository—between polls can be invisible. This conclusion is an inference from the documented schema. [GitHub GraphQL `PinnableItemEdge` reference](https://docs.github.com/en/graphql/reference/users#pinnableitemedge)

Keep two state sets: the previous observed snapshot for change detection, and the append-only set of repositories already represented by Project Profiles. This directly implements the product rule “new pins add; unpins do not delete.” A rename remains the same project because the repository node ID remains the identity while `nameWithOwner` and other display metadata can be refreshed.

## Inspecting meaningful public activity

The strongest general discovery signal is `GET /users/{username}/events/public`. It returns public events performed by the named actor and naturally includes activity in public organization repositories as well as owned repositories. Useful candidate types include `PushEvent`, `CreateEvent` (especially repository/tag creation), `PullRequestEvent`, `PullRequestReviewEvent`, `PullRequestReviewCommentEvent`, `IssuesEvent`, `IssueCommentEvent`, `ReleaseEvent`, and `PublicEvent`; event-specific payloads expose the repository and relevant identifiers. [REST endpoint: list public events for a user](https://docs.github.com/en/rest/activity/events#list-public-events-for-a-user) [GitHub event types](https://docs.github.com/en/rest/using-the-rest-api/github-event-types)

The Events API is only a discovery feed, not sufficient evidence for a summary:

- The timeline contains at most 300 events and only events from the last 30 days.
- GitHub says the API is not intended for real-time use and may lag from 30 seconds to 6 hours.
- A `PushEvent` identifies `before`, `head`, and the pushed ref, but timeline payloads may be abbreviated. Meaningfulness requires follow-up inspection rather than trusting commit counts or messages alone.

These limitations make a weekly run viable for normal activity, but a very busy account can exceed 300 events between runs. Persist the last processed event IDs/timestamps, use conditional requests (`ETag`/`If-None-Match`) where practical, and treat gaps as possible rather than silently claiming completeness. GitHub documents that a correctly authorized Events request returning `304 Not Modified` does not count against the primary rate limit. [REST Events API limits, latency, and conditional requests](https://docs.github.com/en/rest/activity/events)

For hydration, use public repository endpoints:

- `GET /users/{username}/repos?type=all` lists the user's public repositories, but it is not a complete contribution inventory; activity in a public repository the user neither owns nor is a member of is better discovered through the public actor event feed. [REST endpoint: list repositories for a user](https://docs.github.com/en/rest/repos/repos#list-repositories-for-a-user)
- `GET /users/{username}/orgs` lists only the user's public organization memberships, regardless of authentication. For those known organizations, `GET /orgs/{org}/repos?type=public` inventories their public repositories. Hidden organization memberships therefore cannot be discovered from the public user-organizations endpoint; known organizations may need editorial configuration, while public actor events can still reveal work in a public organization repository. [REST endpoint: list organizations for a user](https://docs.github.com/en/rest/orgs/orgs#list-organizations-for-a-user) [REST endpoint: list organization repositories](https://docs.github.com/en/rest/repos/repos#list-organization-repositories)
- `GET /repos/{owner}/{repo}/commits?author={username}&since=...&until=...` can retrieve authored commits on a public repository and supports date bounds. It can be called without authentication for public resources; with a fine-grained token it requires read access to repository Contents. [REST endpoint: list commits](https://docs.github.com/en/rest/commits/commits#list-commits)
- A `PushEvent` supplies `before`, `head`, and `ref`; `GET /repos/{owner}/{repo}/compare/{before}...{head}` can then provide the commits and changed files for public repositories. [GitHub `PushEvent` payload](https://docs.github.com/en/rest/using-the-rest-api/github-event-types#pushevent) [REST endpoint: compare two commits](https://docs.github.com/en/rest/commits/commits#compare-two-commits)
- Repository metadata can confirm `visibility: public`, fork/archive status, description, topics, default branch, and push/update timestamps before any content is passed to the AI. [REST repository endpoints](https://docs.github.com/en/rest/repos/repos)

GraphQL `user.contributionsCollection(from:, to:)` is useful as a reconciliation signal. It exposes commits, issues, pull requests, and pull-request reviews, including repository-grouped fields, and accepts an `organizationID` filter. `user.repositoriesContributedTo` can also surface repositories the user recently contributed to. Neither should be treated as a complete work log: GitHub's contribution rules omit, among other cases, commits in forks and commits outside the default or `gh-pages` branch, and qualifying commits can take up to 24 hours to appear. [GitHub GraphQL `ContributionsCollection` and `repositoriesContributedTo`](https://docs.github.com/en/graphql/reference/users) [GitHub contribution criteria](https://docs.github.com/en/account-and-profile/reference/profile-contributions-reference) [GitHub contribution-delay guidance](https://docs.github.com/en/account-and-profile/how-tos/contribution-settings/troubleshooting-missing-contributions)

For meaningful-work classification, the API supplies candidates and evidence, not a semantic verdict. A defensible pipeline should group events by repository and time window, then inspect commit diffs/compare results, merged pull requests, releases, repository README, topics, and languages. The agent can then favor new substantive repositories, shipped features, releases, architectural changes, and sustained work while filtering merges, generated files, dependency-only churn, formatting, and typo fixes. That judgment is a portfolio policy layered on top of GitHub data, not a GitHub-provided signal.

## Detecting a new pin within 24 hours

GitHub's documented webhook model does not provide a personal-profile-pin event. GitHub also states that webhooks cannot be created for individual user accounts or user-specific resources. Repository and organization webhooks observe events in the resource where they are installed, so they cannot reliably report a change to a user's profile pins. Polling `pinnedItems` is therefore the viable native approach. [GitHub webhook types and user-account limitation](https://docs.github.com/en/webhooks/types-of-webhooks) [GitHub webhook event catalog](https://docs.github.com/en/webhooks/webhook-events-and-payloads)

Use a scheduled workflow with a sub-daily cadence, plus `workflow_dispatch`. GitHub permits schedules as often as every five minutes, runs them from the latest commit on the default branch, and permits manual workflows from the UI/API/CLI. However, scheduled runs can be delayed during high load or even dropped, and schedules in public repositories are disabled after 60 days without repository activity. Schedule away from the start of the hour, run several times inside each 24-hour window, monitor last-success time, and retain the manual trigger. [GitHub Actions trigger reference: `schedule` and `workflow_dispatch`](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)

`repository_dispatch` is useful only if some external system invokes it; it does not create the missing GitHub pin event by itself. It is therefore unnecessary for a best-effort MVP, but it is a viable bridge from an external reliable scheduler when the 24-hour bound must be enforced. [GitHub Actions `repository_dispatch`](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#repository_dispatch)

One publishing constraint matters to the end-to-end trigger: a commit pushed by a workflow using its `GITHUB_TOKEN` generally does not start another workflow run. The maintainer should therefore commit generated content and build/deploy Pages in the same run using GitHub's custom Pages workflow, or later use a GitHub App/PAT if a separate push-triggered deployment is required. [Events triggered by `GITHUB_TOKEN`](https://docs.github.com/en/actions/concepts/security/github_token#when-github_token-triggers-workflow-runs) [Custom GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

## Authentication, privacy, and rate limits

For this public-only MVP, avoid credentials whose resource visibility exceeds what the job needs. The public REST endpoints above can be queried without authentication, but GraphQL requires authentication. In Actions, `GITHUB_TOKEN` is automatically created per job and is limited to the workflow repository; explicitly grant only the permissions needed (typically `contents: read` for observation, elevated to `contents: write` only in the publishing job). [GitHub authentication guidance for Actions](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/about-authentication-to-github#authenticating-to-the-api-in-a-github-actions-workflow) [Using `GITHUB_TOKEN` in workflows](https://docs.github.com/en/actions/tutorials/authenticate-with-github_token)

The public-only invariant should not depend solely on token permissions. Always query the `/events/public` and `/users/{username}/repos` public endpoints, validate `private == false` or `visibility == "public"` after hydration, and fail closed if visibility is missing or contradictory. Do not call `GET /users/{username}/events` as the authenticated user: GitHub documents that it can return private events to that user. [REST Events API](https://docs.github.com/en/rest/activity/events)

Current primary limits are ample for this cadence:

- Unauthenticated REST: 60 requests/hour per source IP.
- Authenticated REST as a user: normally 5,000 requests/hour.
- Actions `GITHUB_TOKEN`: 1,000 REST requests/hour per repository.
- GraphQL: 5,000 points/hour for a user token and 1,000 points/hour per repository for `GITHUB_TOKEN`.

GitHub also applies secondary limits, so paginate, avoid bursts/concurrency, cache stable metadata, and honor `retry-after` and rate-limit response headers. [REST API rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api) [GraphQL rate and query limits](https://docs.github.com/en/graphql/overview/rate-limits-and-query-limits-for-the-graphql-api)

## Decision-ready conclusions

- Pinned projects: authenticated GraphQL `user.pinnedItems(types: REPOSITORY)`; stable node IDs form the append-only identity set.
- Pin latency: poll every six hours plus manual dispatch and monitor last-success time. There is no documented direct profile-pin webhook or pin timestamp, and Actions scheduling is best-effort rather than a strict SLA; use an external scheduler for a hard bound.
- Recent work: weekly `GET /users/{username}/events/public`, then hydrate and semantically classify; reconcile against GraphQL contributions while recognizing its contribution-graph omissions. Persist state because the event feed is capped at 300 events/30 days.
- Repository scope: accept any public repository named by the user's public actor events, including organization-owned repositories; explicitly reject private resources and never use private-capable event discovery endpoints.
- MVP simplicity: no PAT or GitHub App is required unless later testing shows the repository-scoped `GITHUB_TOKEN` cannot supply a needed public field or cross-repository write. Public observation plus writes only to the portfolio repository keeps privilege narrow.
