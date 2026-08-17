# Choose the Recent Work Digest lifecycle

Type: prototype
Status: claimed
Blocked by: 07

## Question

After observing representative generated output from the implemented Portfolio Maintainer, how should Recent Work Digest entries persist, age, be replaced, or retire across sparse and active weeks, including the empty-week case? Produce representative lifecycle states for live human review before choosing the policy.

## Comments

- Prototype artifact: [Recent Work Digest lifecycle prototype](../../../docs/prototypes/recent-work-digest-lifecycle.html). It is a single, double-clickable in-memory logic demo with Active week, Sparse week, Empty week, and Aging and retirement walkthroughs. Each state can be compared under three explicitly unselected candidates: Fresh week only, Rolling 28-day window, and Hold until stale.
- Validation: inline JavaScript syntax check, required-content check, and pure-module exercise of all four scenarios × three candidates passed. No policy has been selected or recorded; this ticket remains claimed pending live human review.
