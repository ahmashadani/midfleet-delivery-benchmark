# Rules for both arms

These rules are identical for the Solo arm and the Fleet arm. They are the repository's
boundaries, not advice.

## Scope

Implement only the assigned issue. Work on a fresh branch cut from the current
`origin/main`, named so it contains the issue's function slug (the CI criteria jobs
select on it — a branch named otherwise will not be judged).

Do not touch another issue's files. Do not fix unrelated problems you notice in
passing; note them in the pull request instead.

## The acceptance criteria are the oracle

Every issue's criteria are already written as tests under `acceptance/`, committed
before any delivery.

- Never edit, move, rename or delete anything under `acceptance/`. CI fails the branch
  for it, and a delivery that rewrites its own standard proves nothing.
- Your own tests belong in `test/` and are additional, never a substitute.
- `npm run verify` deliberately does not run the acceptance suite. A green `verify` is
  not evidence that the work is complete.
- Where a criterion disagrees with the issue's prose or its worked examples, **the
  criterion wins**. Say so in the pull request rather than quietly implementing one
  reading of it.

## Delivery

Run `npm ci` and `npm run verify` before opening a pull request. Target `main`. Include
tests covering both success and failure paths.

## Boundaries

No dependencies. Do not edit `package.json`, `package-lock.json`, `AGENTS.md`,
`.github/workflows` or anything under `acceptance/` or `scripts/`.

Library code performs no network calls, no filesystem writes, and no access to external
services or credentials.

## Reporting

State plainly in the pull request which acceptance criteria you believe are met and
which are not. **An incomplete delivery described accurately is a better outcome than a
complete-sounding report that does not hold.** If something in the issue blocked you,
record it; do not work around a boundary to make a result look finished.
