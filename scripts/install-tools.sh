#!/usr/bin/env bash
# install-tools.sh — arm the workstation with the t3mp3st specialist arsenal.
#
# The executable form of docs/INSTALL_MATRIX.md: idempotent (skips anything already on PATH),
# lane-grouped, macOS/Homebrew-first with pipx/npm where the matrix says so. For a fully
# reproducible Linux arsenal use the Kali+ image instead (npm run tools:build).
#
# Usage:
#   scripts/install-tools.sh              # default: recon + web + secrets (the offensive loop)
#   scripts/install-tools.sh --web        # recon + web pressure tools only
#   scripts/install-tools.sh --min        # INSTALL_MATRIX "minimum useful workstation"
#   scripts/install-tools.sh --all        # everything in the matrix
#   scripts/install-tools.sh --recon|--crypto|--re|--cloud|--ai|--contract
#   scripts/install-tools.sh --list       # dry-run: show what WOULD be installed
#
# Not run with -e: a single failed install must not abort the rest.
set -uo pipefail

GROUP="default"; LIST=""
for a in "$@"; do case "$a" in
  --web) GROUP="web";; --min) GROUP="min";; --all) GROUP="all";;
  --recon) GROUP="recon";; --web-only) GROUP="webonly";;
  --crypto) GROUP="crypto";; --re) GROUP="re";; --cloud) GROUP="cloud";;
  --ai) GROUP="ai";; --contract) GROUP="contract";; --secrets) GROUP="secrets";;
  --list|-n) LIST=1;;
  -h|--help) sed -n '2,18p' "$0"; exit 0;;
  *) echo "unknown flag: $a (try --help)"; exit 2;;
esac; done

have(){ command -v "$1" >/dev/null 2>&1; }

# need <binary> <installer cmd...>
need(){
  local bin="$1"; shift
  if have "$bin"; then echo "  ✓ $bin"; return 0; fi
  if [ -n "$LIST" ]; then echo "  + $bin  ←  $*"; return 0; fi
  echo "  → $bin : $*"
  if "$@"; then echo "    ok"; else echo "    FAIL ($bin) — see output above / docs/INSTALL_MATRIX.md"; fi
}

go_bin(){ echo "${GOBIN:-$HOME/.local/bin}"; }
install_pd(){
  local pkg="$1"; shift
  mkdir -p "$(go_bin)"
  env GOBIN="$(go_bin)" "$@" go install -v "$pkg"
}
install_naabu(){
  brew list libpcap >/dev/null 2>&1 || brew install libpcap
  install_pd github.com/projectdiscovery/naabu/v2/cmd/naabu@latest \
    CGO_ENABLED=1 \
    CGO_CFLAGS="-I/opt/homebrew/opt/libpcap/include" \
    CGO_LDFLAGS="-L/opt/homebrew/opt/libpcap/lib"
}
install_mythril(){
  local py="$HOME/.hermes/hermes-agent/venv/bin/python"
  if [ -x "$py" ]; then pipx install --python "$py" mythril || return 1
  else pipx install mythril || return 1
  fi
  pipx runpip mythril install 'setuptools<81' --force-reinstall
}
install_foundry(){
  curl -L https://foundry.paradigm.xyz | bash || return 1
  "$HOME/.foundry/bin/foundryup" || return 1
  mkdir -p "$HOME/.local/bin"
  ln -sf "$HOME/.foundry/bin/forge" "$HOME/.local/bin/forge"
  ln -sf "$HOME/.foundry/bin/cast" "$HOME/.local/bin/cast"
}

# Prereq managers (warn, don't fail — a tool that needs a missing manager just FAILs its line).
if ! have brew && [ -z "$LIST" ]; then echo "⚠ Homebrew not found — brew-based tools will FAIL. https://brew.sh"; fi
PIPX=pipx; have pipx || PIPX="python3 -m pipx"   # fall back if pipx isn't a shim

recon(){    echo "── 🔍 recon/osint ──"
  need go          brew install go
  need nmap        brew install nmap
  need httpx       install_pd github.com/projectdiscovery/httpx/cmd/httpx@latest
  need naabu       install_naabu
  need katana      install_pd github.com/projectdiscovery/katana/cmd/katana@latest CGO_ENABLED=1
  need subfinder   install_pd github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest
  need nuclei      brew install nuclei
}
web(){      echo "── 🕸️ web exploitation ──"
  need ffuf        brew install ffuf
  need gobuster    brew install gobuster
  need feroxbuster brew install feroxbuster
  need nikto       brew install nikto
  need dalfox      brew install dalfox
  need sqlmap      brew install sqlmap
}
secrets(){  echo "── 🔑 secrets/supply-chain ──"
  need semgrep     brew install semgrep
  need gitleaks    brew install gitleaks
  need trufflehog  brew install trufflehog
  need trivy       brew install trivy
  need syft        brew install syft
  need grype       brew install grype
  need osv-scanner brew install osv-scanner
}
crypto(){   echo "── 🔐 crypto ──"
  need john        brew install john
  need hashcat     brew install hashcat
}
re(){       echo "── ⚙️ reverse/mobile/fuzz ──"
  need radare2     brew install radare2
  need binwalk     brew install binwalk
  need exiftool    brew install exiftool
  need yara        brew install yara
  need apktool     brew install apktool
  need jadx        brew install jadx
  need radamsa     brew install radamsa
  need afl-fuzz    brew install afl++
}
cloud(){    echo "── ☁️ cloud/iac ──"
  need checkov     $PIPX install checkov
  need prowler     $PIPX install prowler
}
ai(){       echo "── 🤖 ai red-team (the +) ──"
  need garak       $PIPX install garak
  need promptfoo   npm install -g promptfoo
}
contract(){ echo "── 📜 smart-contract ──"
  need slither     $PIPX install slither-analyzer
  need myth        install_mythril
  need echidna     brew install echidna
  need forge       install_foundry
  need cast        install_foundry
  need solhint     npm install -g solhint
}
minimum(){  echo "── ⭐ minimum useful workstation (INSTALL_MATRIX) ──"
  need nmap brew install nmap;       need ffuf brew install ffuf
  need nuclei brew install nuclei;   need semgrep brew install semgrep
  need gitleaks brew install gitleaks; need trivy brew install trivy
  need syft brew install syft;       need grype brew install grype
  need exiftool brew install exiftool; need yara brew install yara
  need promptfoo npm install -g promptfoo
}

echo "T3MP3ST arsenal installer — group: $GROUP${LIST:+ (dry-run)}"
case "$GROUP" in
  default)  recon; web; secrets;;
  web)      recon; web;;
  webonly)  web;;
  min)      minimum;;
  recon)    recon;;  secrets) secrets;;  crypto) crypto;;
  re)       re;;     cloud)   cloud;;    ai)     ai;;  contract) contract;;
  all)      recon; web; secrets; crypto; re; cloud; ai; contract;;
esac

echo
echo "Done. Verify readiness with:  npm run arsenal:doctor"
