# M3NT8L Upstream T3MP3ST Draft Queue

Generated after reviewing open upstream issues and PRs on 2026-07-06.

Do not file these blindly. Re-run the duplicate search from
`docs/M3NT8L_CONTRIBUTION_GUIDE.md` first.

## Best First PR

### `fix(mission): stop command loop after mission completion`

Upstream target: issue #32, "Why does a mission not stop by itself?"

Why this is strong:

- It addresses a user-visible operational bug.
- The fix is small and easy to review.
- The behavior can be pinned with one unit test.
- It does not overlap the open redaction/env/curl PR cluster.

Draft PR body:

```markdown
## Summary

- Stop the `TempestCommand` tick loop when MissionControl emits `mission:completed`
  or `mission:aborted`.
- Add a regression test proving command status becomes inactive after completion.

Fixes #32.

## Problem

MissionControl clears the active mission when a mission completes, but the outer
command loop can remain running. That makes status/timer surfaces look active even
after the mission is done, so operators still need to stop manually.

## Approach

Wire `mission:completed` and `mission:aborted` to `TempestCommand.stop()`. The
existing `stop()` path already clears the interval and emits `command:stopped`.

## Safety And Authority

- Target authority: `not_applicable`
- Network use during validation: `none`
- Active tools used: `none`
- Approval/receipt behavior changed: `no`
- Secrets/private target data in artifacts: `no`
- Redaction reviewed: `not_applicable`

## Evidence And Provenance Impact

- Findings/provenance: no change
- Report/export content: no change
- Benchmark/headline claims: no change

## Verification

```bash
npx vitest run src/__tests__/index.test.ts
npm run typecheck
npm test
npm run doctor
npm run verify-claims
```

## Residual Risk

This does not change how tasks complete or fail; it only makes the command loop
follow the mission lifecycle once MissionControl has reached a terminal state.
```

## Best First Issue Or Docs PR

### `docs: explain how to get verified provenance in keyless/local-agent runs`

Upstream target: issue #31, "How to set up in order to get provenance verified?"

Recommendation:

- Prefer a docs PR if maintainers want a direct answer in-tree.
- Otherwise comment on #31 first with the outline and ask whether they want it in
  `CONTRIBUTING.md`, `README.md`, or a dedicated War Room/operator doc.

Suggested contents:

- A finding is tool-proven only when the agent requests an Arsenal tool and the
  harness records tool output.
- Keyless local agents need the text tool-call protocol working; otherwise
  findings remain model-asserted.
- Operator should connect a local agent or configure an API provider, run a
  mission with tools available, and check evidence/provenance labels.
- Claims without tool output should remain labeled unverified/model-asserted.

## Worth Filing After Rebase

### `feat(ui): surface pending action receipts in the War Room`

Why:

- Our run-prep showed stale/pending approvals are an operational blocker.
- The UI should expose pending mission/action receipts, not only tool approval
  audit rows.

Suggested issue first:

```markdown
## Summary

The War Room should show pending `/api/approvals?status=pending` action receipts
before and during a mission, with approve/reject controls.

## Why It Matters

Receipt state is part of the authority boundary. If pending approvals are hidden
or only visible indirectly, operators can start a run with stale or unexpected
approval state.

## Suggested Fix

Add an Action Receipts panel that shows pending approvals, loopback vs external
target posture, and approve/reject actions. Refresh it on SSE connect and status
refresh.
```

Wait for PR #22 or rebase around it before touching `docs/index.html`, because
that PR also edits the War Room UI heavily.

## Ops Hardening Candidate

### `feat(ops): add strict War Room preflight`

Why:

- A preflight that checks API health, active mission state, pending approvals,
  local-agent connection, and scope posture would have prevented rough second-run
  startup conditions.

Risk:

- Our local version includes M3NT8L LaunchAgent assumptions. Upstream needs a
  portable version that degrades gracefully when launchd is absent.

Recommendation:

- File an issue first, then PR a portable `npm run ops:preflight`.
- Keep M3NT8L/Rocky-specific launchd checks out of upstream unless optional.

## Do Not Duplicate Right Now

These already have open upstream PRs:

- #10 keyless local-agent tool-calling.
- #23 avoid caller-cwd dotenv loading.
- #24 ingest byte-cap telemetry.
- #25 API-key setup/export sync.
- #26 redact whitebox source context.
- #27 redact markdown reports.
- #28 reject curl destination override flags.
- #29 contribution receipt template.

Recommended action: review/comment with any extra evidence, wait for merge, then
rebase our local branch and squash away overlap.
