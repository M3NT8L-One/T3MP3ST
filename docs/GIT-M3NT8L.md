# Git layout (M3NT8L)

Plain-English map for this Mac checkout and how it stays current with **official** T3MP3ST.

Hermes-style model: **one personal fork** + **official upstream**. Local Rocky patches live on an integration branch; clean PR branches go to official.

## Names

| Name | What it is | URL |
|------|------------|-----|
| **Local checkout** | Folder on Mac Studio | `/Users/m3nt8l/Projects/T3MP3ST` |
| **Official upstream** | Elder Plinius source of truth | `https://github.com/elder-plinius/T3MP3ST` |
| **Your fork (`origin`)** | **Public GitHub fork** you push to (PR network) | `https://github.com/M3NT8L-One/T3MP3ST` |
| **HEAD** | Tip of whatever branch you have checked out | `git log -1` |

Git remotes in this checkout:

- **`upstream`** → official repo (fetch only; never push here unless you are intentionally using maintainer write access).
- **`origin`** → **M3NT8L-One/T3MP3ST** (your **real** fork of official; normal push target).

Optional historical remote (do not use for new work):

- **`private-archive`** → `M3NT8L-One/T3MP3ST-private-archive` (old private non-fork mirror; **archived** after 2026-07-08 square-up).

## Branches

| Branch | Role |
|--------|------|
| **`main`** | Mirrors **upstream `main`** after a sync (no Rocky-only commits on `main`). |
| **`m3nt8l/rocky`** | Rocky/Hermes patch stack (`T3MP3ST_HERMES_PROFILE`, `AGENTS.md`, War Room launchd, etc.). Rebase this on updated `main`. |
| **`codex/*` / `pr/*`** | Clean contribution branches → open PRs to official. |

Hermes profile/MCP/skills live under `~/.hermes/` — **not** in this repo.

## First-time auth (if `git fetch origin` 403s)

```bash
gh auth setup-git
```

## Update from official (rebase workflow)

From the local checkout:

```bash
cd /Users/m3nt8l/Projects/T3MP3ST

# 1) Get latest official commits into your machine (does not change GitHub official)
git fetch upstream

# 2) Fast-forward local main to official main
git checkout main
git merge --ff-only upstream/main    # or: git reset --hard upstream/main if main must match exactly

# 3) Publish mirrored main to your fork
git push origin main

# 4) Replay Rocky patches on top
git checkout m3nt8l/rocky
git rebase main

# 5) If deps changed
npm install && npm run build

# 6) Publish updated integration branch to your fork
git push origin m3nt8l/rocky

# If you already pushed this branch before and rebased, history rewrote:
# git push --force-with-lease origin m3nt8l/rocky
```

**What changed where:**

- **`git fetch upstream`** — updates **local** copies of official branches; **no** change to GitHub official or your fork.
- **`git push origin …`** — updates **your public fork** only.
- **Official upstream** — changes only when **they** merge/push on `elder-plinius/T3MP3ST` (or you intentionally push with maintainer rights).

## Contribution PRs (contributor path)

```bash
git fetch upstream
git checkout -b pr/short-topic upstream/main
# implement clean fix (no private Rocky-only ops)
git push -u origin pr/short-topic
gh pr create --repo elder-plinius/T3MP3ST --base main --head M3NT8L-One:pr/short-topic
```

Do **not** open PRs from `m3nt8l/rocky` unless the whole Rocky stack is intentionally upstreamed.

## Optional: refresh fork `main` to match official

```bash
git checkout main
git reset --hard upstream/main
git push origin main
```

Use when you want the fork’s default branch to mirror official exactly (integration branch still holds Rocky-specific commits).

## Square-up history (2026-07-08)

- Collapsed dual homes: private non-fork + public `T3MP3ST-upstream`.
- **Kept:** public real fork, renamed to `M3NT8L-One/T3MP3ST`.
- **Archived:** old private non-fork as `M3NT8L-One/T3MP3ST-private-archive` (backup branch `backup/pre-square-up-20260708` preserved there).
- Local remotes: `origin` = public fork, `upstream` = official.

## AGPL note

T3MP3ST is **AGPL-3.0**. Your **public fork** is the correct contribution surface. If you **distribute** a modified network service built from this code, comply with AGPL (source offer, etc.) — separate from day-to-day git hygiene.
