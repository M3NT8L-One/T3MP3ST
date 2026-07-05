# M3NT8L T3MP3ST Contribution Guide

This is our local working standard for filing high-quality upstream T3MP3ST issues
and PRs. It complements upstream `CONTRIBUTING.md`; it does not replace it.

The goal is simple: every contribution should be easy for maintainers to trust,
review, reproduce, and merge or decline cleanly.

## Source Of Truth

- Upstream repo: `elder-plinius/T3MP3ST`
- Local fork/worktree: `/Users/m3nt8l/Projects/T3MP3ST`
- Canonical local guide: `docs/M3NT8L_CONTRIBUTION_GUIDE.md`
- Codex reference copy: `/Users/m3nt8l/.codex/reference/t3mp3st-contribution-guide.md`
- Hermes profile copy: `/Users/m3nt8l/.hermes/profiles/t3mp3st/memories/references/t3mp3st-contribution-guide.md`

When these drift, update the repo copy first, then refresh the Codex and Hermes
copies.

## Contributor Posture

Prefer contributions that make T3MP3ST more capable while clarifying evidence,
authority, scope, and operational truth labels.

Priority order:

1. Bug fixes with a reproducer and regression test.
2. Security and safety hardening for scope, redaction, command execution, env
   loading, provenance, or approval boundaries.
3. Operator/runtime robustness that prevents hangs, stale state, misleading UI,
   or unverified findings.
4. Evidence improvements: parsers, provenance, report accuracy, retest status.
5. Docs that reduce operator error and make benchmark or model claims comparable.
6. New features only when they are focused, gated, auditable, and honestly
   labeled.

Avoid broad "kitchen sink" upstream PRs. Our local branch can carry integrated
run-prep work; upstream should receive small, reviewable slices.

## Search First

Before filing anything:

```bash
gh issue list --repo elder-plinius/T3MP3ST --state open --limit 100
gh pr list --repo elder-plinius/T3MP3ST --state open --limit 100
gh search issues --repo elder-plinius/T3MP3ST "<symptom or feature terms>"
gh search prs --repo elder-plinius/T3MP3ST --state all "<symptom or feature terms>"
rg -n "<symbol|route|script|claim|UI text>" .
```

If an open PR already covers the same issue, do not open a competing PR unless
ours is materially different. Prefer:

- review/comment with extra repro evidence;
- open a narrow follow-up issue;
- wait for upstream to merge, then rebase and squash our local patch away.

## Issue Template

Use this for public, non-sensitive bugs, docs gaps, UX problems, and reproducible
hardening issues. Do not include secrets, private target data, raw credentials,
or exploit details for a real third-party target.

```markdown
## Summary

One sentence describing the bug, gap, or requested improvement.

## Why It Matters

Explain the operator or maintainer impact. For T3MP3ST, name the affected trust
boundary when relevant: scope, receipt, redaction, provenance, benchmark claim,
local-agent execution, UI truth label, or mission lifecycle.

## Reproduction Or Evidence

- T3MP3ST version/branch or commit:
- Platform:
- Command or UI path:
- Expected:
- Actual:
- Minimal logs or screenshots:

## Safety Boundary

- Target authority: `owned_lab | local_loopback | bug_bounty_scope | docs_only | not_applicable`
- Network use: `none | loopback_only | lab_private | public_authorized`
- Secrets/private data included: `no`

## Suggested Fix

Describe the smallest maintainable fix. If unsure, say so.

## Verification I Can Provide

List tests, commands, screenshots, or artifacts that would prove the fix.
```

## PR Template

Use this as the PR body unless upstream adds an official template that is stricter.

```markdown
## Summary

- What changed:
- Why:
- Scope:

Fixes #<issue> or Relates to #<issue>.

## Problem

Describe the observed failure or gap. Include the old behavior, the user/operator
impact, and why the existing code path allowed it.

## Approach

Explain the smallest change that fixes it. Name the main files touched and why
the change belongs there.

## Safety And Authority

- Target authority: `owned_lab | local_loopback | bug_bounty_scope | docs_only | not_applicable`
- Network use during validation: `none | loopback_only | lab_private | public_authorized`
- Active tools used: `none | list`
- Approval/receipt behavior changed: `no | yes, explain`
- Secrets/private target data in artifacts: `no`
- Redaction reviewed: `yes | not_applicable`

## Evidence And Provenance Impact

- Does this change how findings are verified? `no | yes`
- Does it change report/export content? `no | yes`
- Does it change benchmark or headline claims? `no | yes`
- If yes, name the exact verifier and artifact that proves the claim.

## Compatibility

- Platforms considered:
- Local-agent impact: `none | codex | claude | hermes | local model`
- API-key provider impact: `none | openrouter | anthropic | openai | venice | xai`
- UI/browser impact: `none | desktop | mobile | both`

## Verification

Commands run:

```bash
npm run typecheck
npm test
npm run doctor
npm run verify-claims
```

If the API or War Room was running:

```bash
npm run ops:preflight
npm run arsenal:smoke
npm run field:drill
```

Results:

- `npm run typecheck`:
- `npm test`:
- `npm run doctor`:
- `npm run verify-claims`:
- Other focused tests:

## Screenshots Or Artifacts

Attach screenshots, logs, or report snippets only after redaction. Prefer short
snippets and paths, not large pasted logs.

## Residual Risk

What could still be wrong? What did this PR deliberately not solve?
```

## Review Checklist Before We Open A PR

- [ ] Searched open and closed issues/PRs.
- [ ] Confirmed the change is not already implemented on upstream `main`.
- [ ] One logical change only.
- [ ] Includes regression test or a clear reason tests are not applicable.
- [ ] Includes docs/UI copy only when needed for operator clarity.
- [ ] No unrelated local Rocky/Hermes/M3NT8L-specific details.
- [ ] No secrets, raw private target data, tokens, keys, passwords, or screenshots
      with sensitive content.
- [ ] No benchmark/headline claim change unless the committed verifier proves it.
- [ ] No active public target evidence unless the issue/PR states authorization
      and scope.
- [ ] `git diff` reviewed for accidental generated or local-only files.
- [ ] Verification commands are listed with results.

## Good PR Shapes For T3MP3ST

Use focused titles:

- `fix(server): reject curl destination override flags`
- `fix(reports): redact secrets before markdown export`
- `fix(mission): stop command loop after mission completion`
- `docs(contrib): add contribution receipt template`
- `test(local-agent): pin text tool-call parser drift cases`

Good PRs usually include:

- a failing test or static invariant before the fix;
- the smallest code change that satisfies it;
- a receipt-style body covering safety, redaction, claims, and verification;
- clear non-goals.

## When To File An Issue First

File an issue before PR when:

- the desired behavior is product/design-level rather than an obvious bug;
- the fix could conflict with an open PR;
- it touches benchmark methodology or public capability claims;
- it changes default risk posture, approval behavior, or active tooling;
- it needs maintainer preference on UI wording or terminology.

Open a PR directly when:

- the bug is clear and local;
- there is no overlapping open PR;
- the regression test is straightforward;
- the patch is small enough for review in one sitting.

## Special T3MP3ST Boundaries

- Local-agent/keyless work must prove that tools actually reach the ReAct loop
  and that provenance is not model-asserted only.
- Scope/command hardening must bind approvals to effective execution targets, not
  just UI-provided labels.
- Report/export changes must redact secrets before writing markdown or returning
  JSON.
- Whitebox/source-ingest changes must avoid copying hardcoded secrets into
  model-facing context.
- Benchmark/model comparison docs must separate model, provider, harness,
  target class, run mode, tool access, attempt policy, refusals, abstentions,
  and failures.
- UI truth labels should distinguish preview, wired, installed, gated, synthetic,
  live, verified, unverified, and model-asserted states.

## Upstream Comment Template

Use this when an upstream PR already exists and we want to contribute evidence
without competing:

```markdown
I hit the same class of issue locally and can confirm the impact.

Additional repro/evidence:
- Branch/commit:
- Platform:
- Command/UI path:
- Expected:
- Actual:

Additional verification I ran:
- `<command>` -> `<result>`

This looks consistent with the direction in this PR. I am holding off on a
competing PR unless maintainers want a narrower follow-up.
```
