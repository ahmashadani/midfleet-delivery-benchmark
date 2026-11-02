# Midfleet delivery benchmark

**Does an autonomous agent finish the work it set out to do?**

Not *does it produce a pull request*, and not *do its own tests pass*. Those are easy.
The question is whether the work is complete against criteria the agent did not write
and cannot change — and whether, when it falls short, it says so instead of reporting
success.

This repository runs that question as a controlled comparison.

## The two arms

| | |
|---|---|
| **Solo** | One agent working alone. It plans, implements, tests, reviews its own work and decides when it is done. |
| **Fleet** | A governed [Midfleet](https://midfleet.ai) run: five agents in fixed roles — analyst, implementer, verifier, independent reviewer, product owner — with staged handoffs. The reviewer cannot edit the code it reviews. |

**Both arms run the same engine and the same model** (`opencode` with
`anthropic/claude-sonnet-4-6`), against the same repository, from the same issue text.
The only variable is the orchestration.

## How the work is judged

Every issue ships with its acceptance criteria already written, as tests in
[`acceptance/`](acceptance/). They are committed **before** either arm runs — the git
history proves it — so neither arm's output could have shaped the standard it is
measured against.

Three rules make the criteria an independent oracle rather than a formality:

1. **Neither arm writes them.** They arrive with the issue.
2. **Neither arm can change them.** A CI job fails any branch that touches
   `acceptance/`.
3. **An arm's own tests cannot stand in for them.** `npm run verify` deliberately does
   not run the acceptance suite, so a passing self-written suite proves nothing here.

Each criterion is its own named CI check, so a red result names the criterion that is
unmet rather than reporting "tests failed".

## The issues

Ten issues on a deliberate difficulty ramp. The easy end is a control: if the benchmark
cannot show two competent arms performing similarly on simple work, it is not measuring
honestly. The hard end is where the question actually bites.

| # | Tier | Shape |
|---|---|---|
| 1–3 | Easy | A single exported function, one file, 4–5 criteria |
| 4–6 | Medium | Several related exports, interacting rules, 6–8 criteria |
| 7–10 | Long | A module across multiple files, ordering and invariants that hold across operations, 10–14 criteria |

Long-horizon work is the interesting case. A single agent that is accurate on a
one-function task can still lose scope across a twelve-criterion module — implementing
most of it, then reporting the whole thing complete.

## What is measured

The headline number is **completion rate**: the share of issues where every acceptance
criterion passes, unaided, on the first delivery.

Alongside it, two measures that matter more than raw throughput:

- **Honest reporting.** When an arm's delivery does not meet every criterion, does it
  say so, or does it report the work finished? A confidently wrong completion is worse
  than a visible failure.
- **Scope discipline.** Did the delivery stay inside the files the issue called for?

Wall-clock time and token cost are recorded for both arms. Governance is not free, and
the benchmark reports its price rather than hiding it.

## Reproducing this

Everything needed is in the repository: the issues, the criteria, the CI definition and
the raw results. Clone it, point your own agent at an issue, open a pull request, and
the same checks that judged these runs will judge yours.

## Results

See [`results/`](results/). Each run links its pull request, its CI checks and, for
Fleet runs, its Midfleet run id. Raw artifacts are preserved whether or not the result
flatters Midfleet — a benchmark that only publishes its wins is marketing, not evidence.

**Status: criteria committed, runs not yet started.**
