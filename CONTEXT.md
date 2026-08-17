# Agentic Portfolio

An automatically maintained public representation of Michael's development work, derived from GitHub activity while preserving editorial intent.

## Language

**Portfolio Maintainer**:
The agent that observes GitHub activity, judges what is worth highlighting, and updates the published portfolio.
_Avoid_: Bot, scraper, updater

**Meaningful Activity**:
Public GitHub work directly attributable to Michael that evidences a substantive authored change, merged pull request, release, or coherent group of commits. Routine merges, generated-file churn, dependency-only updates, formatting, typo fixes, branch creation, comments, and activity counts are not meaningful on their own.
_Avoid_: Contribution feed, recent commits

**Direct Evidence**:
Public repository material that substantiates a portfolio claim. Inspected diffs, merged pull requests, and releases establish what changed; repository documentation establishes purpose; topics, language statistics, manifests, and configuration establish technologies. Repository descriptions, commit messages, and event payloads are discovery clues rather than sufficient evidence of an outcome.

**Attributable Contribution**:
A contribution connected to Michael through authored commits, an authored pull request, or another direct actor-to-change link. Collaborative outcomes must not imply sole ownership; activity without attributable authorship is omitted.

**Project Profile**:
The portfolio's curated representation of a project, including its description, technologies, and relevant experience.
_Avoid_: Repository card, repo summary

**Pinned Project**:
A repository pinned on Michael's GitHub profile, signaling that it should have a Project Profile on the portfolio.
_Avoid_: Featured repository, selected repo

**Recent Work Digest**:
The synthesized “What I’ve Been Working On” section produced from Meaningful Activity across inspected repositories.
_Avoid_: Activity feed, commit list

**Generated Content**:
Machine-owned Project Profile and Recent Work Digest data produced by the Portfolio Maintainer from Direct Evidence. Generated Content excludes all resume-derived and human-authored material.

**Protected Content**:
Resume-derived or human-authored portfolio material that the Portfolio Maintainer must preserve and must never treat as machine-owned.

**Maintainer Checkpoint**:
The committed revision containing successfully validated Generated Content and its corresponding machine state. Failed or incomplete persistence attempts never advance the Maintainer Checkpoint; a checkpoint may temporarily await deployment.

**Published Revision**:
The Maintainer Checkpoint currently served by GitHub Pages. If deployment fails, the previous Published Revision remains live while the newer Maintainer Checkpoint awaits exact-revision redeployment.

**Maintainer Incident**:
An unresolved Portfolio Maintainer failure that requires operator action or threatens a publishing objective. It is represented by a deduplicated GitHub issue; individual transient failures are attempt records rather than Maintainer Incidents.
