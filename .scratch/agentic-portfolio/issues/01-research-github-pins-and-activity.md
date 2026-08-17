# Establish the observable GitHub signals

Type: research
Status: resolved

## Question

Using primary GitHub documentation and APIs, what reliable signals can the Portfolio Maintainer use to discover profile Pinned Projects, inspect meaningful public activity across owned and organization repositories without accessing private repositories, and detect a newly pinned repository within 24 hours? Document API limitations, authentication requirements, rate limits, and viable scheduled or event-driven triggers.

## Comments

## Answer

Use authenticated GraphQL `user.pinnedItems(types: REPOSITORY)` snapshots as the authoritative Pinned Project signal. Persist the previous snapshot separately from the append-only set of repository node IDs already represented by Project Profiles: a newly observed ID can add a profile, while absence from a later snapshot never deletes one. GitHub exposes neither a pin-change event nor a pin timestamp, so changes between polls can be missed.

Use `GET /users/{username}/events/public` as the discovery feed for Meaningful Activity across public personal and organization repositories, then hydrate candidates with public repository, compare/commit, pull-request, release, README, topic, and language data before applying the portfolio's editorial policy. Reconcile with GraphQL contribution data where useful, but do not treat either source as complete: the Events API is limited to 300 events and 30 days and may lag up to six hours, while contribution data has eligibility omissions and may lag up to 24 hours.

Poll pins several times daily (six-hour cadence, off the top of the hour) and provide a manual dispatch. GitHub documents no profile-pin webhook, and Actions schedules can be delayed or dropped, so this satisfies a best-effort MVP objective; a hard 24-hour guarantee requires an external monitored scheduler invoking the workflow.

Keep observation public-only by using public endpoints, explicitly validating repository visibility, and failing closed. GraphQL requires authentication; a narrowly permissioned Actions `GITHUB_TOKEN` is the simplest MVP credential. Primary limits are 60 unauthenticated REST requests/hour, typically 5,000 authenticated user REST requests/hour, 1,000 Actions-token REST requests/hour per repository, 5,000 GraphQL points/hour for a user token, and 1,000 GraphQL points/hour per repository for an Actions token; secondary limits also apply.

Detailed evidence and primary-source citations: [GitHub pins and public-activity signals](../research/github-pins-and-activity.md).
