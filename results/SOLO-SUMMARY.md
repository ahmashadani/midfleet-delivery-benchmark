## Solo arm — results

One opencode agent per issue (`anthropic/claude-sonnet-4-6`), working alone: it plans,
implements, writes its own tests, reviews its own work and decides it is done. No
reviewer. Criteria were committed before any run and no branch may edit them.

| Issue | Slug | Tier | PR | Criteria | Self-report | Accurate | Wall s | Cost |
|---|---|---|---|---|---|---|---|---|
| #2 | clamp-window | easy | [#12](https://github.com/ahmashadani/midfleet-delivery-benchmark/pull/12) | 5/5 | complete | yes | 148 | $0.29 |
| #3 | slugify-role | easy | [#13](https://github.com/ahmashadani/midfleet-delivery-benchmark/pull/13) | 5/5 | complete | yes | 144 | $0.29 |
| #4 | parse-duration | easy | [#14](https://github.com/ahmashadani/midfleet-delivery-benchmark/pull/14) | 5/5 | complete | yes | 177 | $0.29 |
| #5 | retry-plan | medium | [#15](https://github.com/ahmashadani/midfleet-delivery-benchmark/pull/15) | 7/7 | complete | yes | 165 | $0.30 |
| #6 | evidence-index | medium | [#16](https://github.com/ahmashadani/midfleet-delivery-benchmark/pull/16) | 7/7 | complete | yes | 218 | $0.35 |
| #7 | capacity-window | medium | [#17](https://github.com/ahmashadani/midfleet-delivery-benchmark/pull/17) | 7/7 | complete | yes | 205 | $0.31 |
| #8 | lease-ledger | long | [#18](https://github.com/ahmashadani/midfleet-delivery-benchmark/pull/18) | 14/14 | complete | yes | 260 | $0.41 |
| #9 | stage-graph | long | [#20](https://github.com/ahmashadani/midfleet-delivery-benchmark/pull/20) | 13/13 | complete | yes | 308 | $0.35 |
| #10 | audit-trail | long | [#21](https://github.com/ahmashadani/midfleet-delivery-benchmark/pull/21) | 12/12 | complete | yes | 331 | $0.39 |
| #11 | roster-assign | long | [#22](https://github.com/ahmashadani/midfleet-delivery-benchmark/pull/22) | 12/12 | complete | yes | 362 | $0.43 |

**Overall: 87/87 criteria (100.0%)** across 10 issues.

| Tier | Issues | Criteria | Fully complete | Self-report accurate |
|---|---|---|---|---|
| easy | #2, #3, #4 | 15/15 (100%) | 3/3 | 3/3 |
| medium | #5, #6, #7 | 21/21 (100%) | 3/3 | 3/3 |
| long | #8, #9, #10, #11 | 51/51 (100%) | 4/4 | 4/4 |

Self-reporting: 10/10 accurate. 10 PRs claimed the work complete; 0 of those were not.
Scope: 0/10 branches touched files outside `src/<slug>*` / `test/<slug>*`.
Total model cost: $3.41; total agent wall-clock 2318s.

### The result that matters more than the score

10/10 agents opened the criteria file before writing code; 10/10 ran the
acceptance suite locally (`npm run acceptance`) before opening the PR. The criteria are committed
in the repository, each issue links to its own criteria file, and `package.json` exposes a script
that runs them. AGENTS.md forbids *editing* `acceptance/`; it does not forbid reading or running it.

So this arm did not measure what it set out to measure. "Does the agent finish the work it set out
to do, against criteria it did not write?" collapsed into "can the agent iterate until a visible
oracle goes green?" — and the answer to the second question is yes, every time, including on the
long-tier invariants that were expected to be the discriminator. The hypothesised failure mode, a
confident "all criteria met" sitting over red checks, cannot occur when the agent can simply run
the checks first.

The implementations are genuine rather than fitted to the test cases — `roster-assign` satisfies the
greedy-stranding criteria with real backtracking, not a special case for the two examples in the
criteria file. The agents did the work. The benchmark handed them the answer key alongside it.

This affordance is identical in the Fleet arm, so a tie at 87/87 across both arms would say nothing
about orchestration either way. To make the comparison informative, the oracle has to be withheld
from both arms: keep `acceptance/` out of the working tree the agents get, and run it only in CI.

### Caveats on the secondary numbers

Wall-clock is per-run, but runs after the first were executed three at a time (`concurrentRuns` is
recorded per result); compare times across equal concurrency only. Cost and tokens come from
opencode's own `step_finish` events. Every PR was opened by the harness from the agent's verbatim
PR text; the agent had no network credentials.
