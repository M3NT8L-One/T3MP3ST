# T3MP3ST — Hermes / Rocky project policy

## Scope

Work here only on **authorized** targets: systems M3NT8L owns or has **written permission** to test. See `docs/SCOPE_AND_AUTHORIZATION.md`.

## Operator profile

Use Hermes profile **`t3mp3st`** (`hermes -p t3mp3st` / `t3mp3st` CLI). Manual tool approvals; never `--yolo` or `T3MP3ST_HERMES_YOLO=1`.

## MCP

Profile MCP server **`t3mp3st-recon`** exposes `security_recon` (dig/nmap). Rebuild after MCP changes: `npm run build`.

## War Room

```bash
npm run server   # http://127.0.0.1:3333/ui/
```

Project `.env`: `T3MP3ST_HERMES_PROFILE=t3mp3st` (War Room spawns `hermes -p t3mp3st`). Connect Hermes in Settings.

## Verification

- `npm run doctor`
- `npm run verify-claims` (benchmark headlines)
- `hermes --profile t3mp3st config check`