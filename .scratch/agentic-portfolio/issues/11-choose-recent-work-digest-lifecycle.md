# Choose the Recent Work Digest lifecycle

Type: prototype
Status: resolved
Blocked by: 07

## Question

After observing representative generated output from the implemented Portfolio Maintainer, how should Recent Work Digest entries persist, age, be replaced, or retire across sparse and active weeks, including the empty-week case? Produce representative lifecycle states for live human review before choosing the policy.

## Comments

- Prototype artifact: [Recent Work Digest lifecycle prototype](../../../docs/prototypes/recent-work-digest-lifecycle.html). It is a single, double-clickable in-memory logic demo with Active week, Sparse week, Empty week, and Aging and retirement walkthroughs. Each state can be compared under three explicitly unselected candidates: Fresh week only, Rolling 28-day window, and Hold until stale.
- Validation: inline JavaScript syntax check, required-content check, and pure-module exercise of all four scenarios × three candidates passed. No policy has been selected or recorded; this ticket remains claimed pending live human review.

## Answer

Human review selected **Candidate A · Fresh week only**. Every successful weekly refresh replaces the visible Recent Work Digest with only that refresh's verified Meaningful Activity, capped at three newest entries. A sparse week therefore publishes only its one or two current entries; an empty week publishes an empty digest. Entries do not persist, top up from prior weeks, or age through a rolling window.

Implemented this lifecycle explicitly through `replaceDigest`, with regression coverage for non-empty replacement and empty-week clearing. The domain glossary now names this behavior **Fresh-week Recent Work Digest**.
