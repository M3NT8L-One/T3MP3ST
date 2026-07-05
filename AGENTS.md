# T3MP3ST — Hermes / Rocky project policy

## Scope

Work here only on **authorized** targets: systems M3NT8L owns or has **written permission** to test. See `docs/SCOPE_AND_AUTHORIZATION.md`.

## Operator profile

Use Hermes profile **`t3mp3st`** (`hermes -p t3mp3st` / `t3mp3st` CLI). Manual tool approvals; never `--yolo` or `T3MP3ST_HERMES_YOLO=1`.

## MCP

Profile MCP server **`t3mp3st-recon`** exposes `security_recon` (dig/nmap). Rebuild after MCP changes: `npm run build`.

## War Room

LaunchAgent **`ai.rocky.t3mp3st-warroom.local`** keeps **`npm run server`** up at **http://127.0.0.1:3333/ui/** (plist: `scripts/launchd/`, logs: `~/.hermes/logs/t3mp3st-warroom-local.*`). Ad-hoc: `npm run server` in repo root.

Project `.env`: `T3MP3ST_HERMES_PROFILE=t3mp3st` (War Room spawns `hermes -p t3mp3st`). Connect Hermes in Settings.

## Git (M3NT8L)

Public fork **`M3NT8L-One/T3MP3ST`** (real GitHub fork of official); official upstream **`elder-plinius/T3MP3ST`**. Rocky patches on `m3nt8l/rocky`. Rebase workflow: `docs/GIT-M3NT8L.md`.

## Verification

- `npm run doctor`
- `npm run ops:preflight` before launching a rehearsal run
- `npm run verify-claims` (benchmark headlines)
- `hermes --profile t3mp3st config check`
