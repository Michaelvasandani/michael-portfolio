# Define the generated content contract

Type: grilling
Status: resolved
Blocked by: 01

## Question

Given the GitHub signals that are actually available, what exact evidence makes activity meaningful, how should the Portfolio Maintainer synthesize it into Project Profiles and the Recent Work Digest, and which confidence or change boundaries separate direct publication from a pull request? Define how sparse documentation, unusual repository structures, and ambiguous ownership affect omission, escalation, or representation. The contract must enforce additive-only Project Profiles and protect resume-derived content.

## Comments

## Answer

Use a conservative, deterministic generated-content contract.

### Meaningful Activity

An activity candidate qualifies only when it:

- comes from a verified public, non-fork repository;
- is directly attributable to Michael through authored commits, an authored pull request, or another direct actor-to-change link; and
- evidences a substantive authored change, merged pull request, release, or coherent group of commits.

Routine merges, generated-file churn, dependency-only updates, formatting, typo fixes, branch creation, comments, and activity counts are not meaningful on their own. Collaborative work may be represented, but its wording must not imply sole ownership. Activity with ambiguous attribution is omitted.

Use evidence in this order: inspected diffs, merged pull requests, and releases establish what changed; repository documentation establishes purpose; topics, language statistics, manifests, and configuration establish technologies. Repository descriptions, commit messages, and event payloads are discovery clues rather than sufficient evidence of an outcome. Never infer business impact, adoption, performance improvements, purpose, or ownership without direct evidence.

### Project Profiles

Each newly observed, verified public Pinned Project creates exactly one Project Profile, identified by the repository's stable GitHub node ID. A full profile contains only:

- repository name and public link;
- an evidence-backed purpose statement;
- an attributable contribution or outcome; and
- evidenced technologies.

If documentation is sparse or the repository structure is unusual, publish a minimal fact-only profile containing only the fields that can be verified; omit unavailable fields rather than guessing. If a richer representation requires human interpretation, open a pull request for review.

The set of Project Profiles is append-only. Unpinning, missing snapshots, archival, renaming, or later ambiguity never automatically removes a profile. For the MVP, the Portfolio Maintainer also never automatically rewrites an existing profile; later corrections or deletion are manual changes.

### Recent Work Digest

Group related Meaningful Activity by repository and workstream, collapsing repeated events that support the same outcome. Publish no more than three entries per refresh. Each entry contains an outcome-focused headline, one or two sentences describing Michael's attributable contribution, relevant technologies only when they clarify the work, and a link to the strongest public evidence.

The policy for aging or retiring digest entries remains deferred until real generated output can be observed.

### Publication boundary

Do not use a model-reported numeric confidence score. A refresh may publish directly only when deterministic checks establish all of the following:

- every changed path is explicitly machine-owned generated content or machine state;
- every public claim satisfies the evidence and attribution rules;
- every new Project Profile corresponds to a verified public pin and stable repository identity;
- no existing Project Profile is changed or removed;
- the digest matches its schema and three-entry limit;
- repository visibility, ownership, and evidence are unambiguous; and
- schema, size, content-safety, link, and site-build validation pass.

Uncertainty is handled by consequence:

- A Pinned Project that must be represented but needs human interpretation produces a pull request.
- Ordinary activity without enough evidence, attribution, or substance is omitted from the digest.
- Possible private data, a protected-content diff, inconsistent state, destructive profile behavior, or global validation failure aborts the refresh and preserves the last known-good publication.
- Structural or protected-content changes are outside the generated refresh path and require a separately reviewed pull request.

Resume-derived and other human-authored content is Protected Content. It is never in the Portfolio Maintainer's write allowlist. Only generated Project Profile data, Recent Work Digest data, and necessary machine state are machine-owned.
