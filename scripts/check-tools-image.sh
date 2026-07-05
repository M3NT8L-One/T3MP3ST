#!/usr/bin/env bash
# Presence smoke-test for the cybench CTF-tools image. Build-time only: it does
# NOT build the image — it runs an existing image and asserts the RE/crypto
# tooling the agent's TOOLS_SYSTEM prompt promises is actually present.
#
# Usage:  scripts/check-tools-image.sh [IMAGE]   (default: cybench-tools:latest)
# Exit non-zero if any check fails so it is CI-usable.
set -euo pipefail

IMAGE="${1:-cybench-tools:latest}"

# Docker-less environments (e.g. CI lint stage, the dev macbook without Docker)
# must not hard-fail — presence smoke is inherently build-time.
if ! command -v docker >/dev/null 2>&1; then
  echo "docker not available; skipping (presence smoke is build-time only)"
  exit 0
fi

echo "Checking tools image: $IMAGE"
docker run --rm --platform linux/amd64 "$IMAGE" bash -lc '
  set -e
  fail=0
  check_version() {
    name="$1"
    shift
    if command -v "$name" >/dev/null 2>&1 && "$@" >/dev/null 2>&1; then
      echo "  ok   bin  $name"
    else
      echo "  FAIL bin  $name missing or non-functional"; fail=1
    fi
  }
  for c in radare2 gdb objdump upx; do
    if command -v "$c" >/dev/null 2>&1; then
      echo "  ok   bin  $c"
    else
      echo "  FAIL bin  $c missing"; fail=1
    fi
  done
  if python3 -c "import z3, sympy, pwn, fpylll, Crypto" 2>/dev/null; then
    echo "  ok   py   z3,sympy,pwn,fpylll,Crypto importable"
  else
    echo "  FAIL py   one of z3/sympy/pwn/fpylll/Crypto failed to import"; fail=1
  fi
  if command -v pip-audit >/dev/null 2>&1 && pip-audit --version >/dev/null 2>&1; then
    echo "  ok   bin  pip-audit ($(pip-audit --version 2>&1 | head -1))"
  else
    echo "  FAIL bin  pip-audit missing or non-functional"; fail=1
  fi
  check_version httpx httpx -version
  check_version katana katana -version
  check_version naabu naabu -version
  check_version subfinder subfinder -version
  check_version nuclei nuclei -version
  check_version dalfox dalfox --version
  check_version slither slither --version
  check_version myth myth version
  check_version forge forge --version
  check_version cast cast --version
  check_version solhint solhint --version
  check_version sage sage --version
  exit $fail
'
echo "tools-image presence smoke PASSED"
