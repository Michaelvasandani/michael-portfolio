# Ship the self-maintaining portfolio MVP

Type: map
Status: open

## Destination

A deployed GitHub Pages portfolio using the Minimal theme that presents resume-derived About, Education, Experience, and Hobbies sections; adds Project Profiles for newly observed pins on a best-effort 24-hour detection target; and refreshes a synthesized Recent Work Digest from meaningful public GitHub activity weekly.

## Notes

- Domain: Agentic Portfolio. Every session must consult `CONTEXT.md` and use `/domain-modeling` when terminology changes.
- This map explicitly carries execution through deployment and end-to-end verification, rather than stopping at an implementation-ready specification.
- Optimize for hiring managers and technical interviewers: outcomes first, with enough technical detail to establish credibility.
- The Portfolio Maintainer may inspect all public, non-fork repositories for the Recent Work Digest. It must not inspect private repositories.
- GitHub profile pins are additive editorial signals. A newly Pinned Project adds a Project Profile, but unpinning never removes an existing Project Profile; deletion is manual only.
- Human-authored and resume-derived sections are protected. The Maintainer may update only generated Projects data and the Recent Work Digest.
- Safe generated-content refreshes may publish directly. Uncertain, destructive, protected-content, or structural changes require a pull request.
- Run weekly and detect new pins within 24 hours, with a manual refresh path.
- Use `/research` for research tickets, `/grilling` and `/domain-modeling` for grilling tickets, and `/prototype` for prototype tickets.

## Decisions so far

- [Establish the observable GitHub signals](issues/01-research-github-pins-and-activity.md) — Discover Pinned Projects via authenticated GraphQL snapshots and Meaningful Activity via hydrated public actor events; poll several times daily because GitHub exposes no pin webhook or timestamp, and use an external monitored scheduler if the 24-hour bound must be strict.
- [Define the generated content contract](issues/04-define-generated-content-contract.md) — Publish only directly attributable, evidence-backed work; add immutable fact-based Project Profiles for verified pins, synthesize at most three digest entries, and gate direct publication with deterministic protected-content and validation checks.
- [Establish the deployment and agent execution envelope](issues/02-research-pages-actions-and-ai.md) — Use conventional GitHub Actions with deterministic validation, least-privilege job boundaries, direct generated-only writes when branch rules allow, PR fallback otherwise, and explicit same-run Pages deployment after Maintainer commits.
- [Provide the resume source](issues/03-provide-resume-source.md) — The authoritative Markdown resume is attached; translate it into protected portfolio content while omitting the phone number from all public output.
- [Prototype the portfolio information architecture](issues/05-prototype-information-architecture.md) — Use the revised Outcome Funnel: About me, Experience, Projects, then Recent work, with outcomes kept in context instead of detached metric tiles.
- [Choose the Portfolio Maintainer architecture](issues/06-choose-maintainer-architecture.md) — Use a least-privilege TypeScript GitHub Actions pipeline with repository-backed JSON, split pin and digest cadences, deterministic validation, atomic direct publication, and fingerprint-deduplicated pull-request escalation.
- [Define Portfolio Maintainer recovery and observability](issues/10-define-maintainer-recovery-and-observability.md) — Preserve checkpointed state and the last Published Revision with bounded retries, GitHub-native deduplicated incidents, exact-revision deployment recovery, and fail-closed state repair.
- [Build the site and Portfolio Maintainer](issues/07-build-the-site-and-maintainer.md) — Implement the protected Minimal-theme portfolio and validated TypeScript maintainer with public-only evidence, additive pin sync, structured generation, and checkpoint-safe generated writes.
- [Configure Pages and automation](issues/08-configure-pages-and-automation.md) — Pages workflow publishing, scheduled/manual maintainer runs, direct generated-only publication, working pull-request fallback, and required Actions secret/settings are configured and verified.

## Not yet specified

## Out of scope

- Inspecting or publishing private-repository activity in the MVP.
- Automatically deleting Project Profiles after repositories are unpinned.
- A per-repository editorial policy or override system beyond the protected/generated content boundary.
- Activity sources outside GitHub.
- A bespoke visual theme that replaces GitHub Pages' Minimal theme.
