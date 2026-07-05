#!/usr/bin/env python3
"""Install selected linux/amd64 release binaries from GitHub.

The tools image itself is linux/amd64, but many users build it from arm64 Macs.
Downloading release artifacts avoids running the amd64 Go compiler under QEMU.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import stat
import sys
import tarfile
import tempfile
import urllib.request
import zipfile
from pathlib import Path


TOOLS = [
    {
        "repo": "projectdiscovery/httpx",
        "binary": "httpx",
        "asset": r"^httpx_.*_linux_amd64\.zip$",
    },
    {
        "repo": "projectdiscovery/katana",
        "binary": "katana",
        "asset": r"^katana_.*_linux_amd64\.zip$",
    },
    {
        "repo": "projectdiscovery/naabu",
        "binary": "naabu",
        "asset": r"^naabu_.*_linux_amd64\.zip$",
    },
    {
        "repo": "projectdiscovery/subfinder",
        "binary": "subfinder",
        "asset": r"^subfinder_.*_linux_amd64\.zip$",
    },
    {
        "repo": "projectdiscovery/nuclei",
        "binary": "nuclei",
        "asset": r"^nuclei_.*_linux_amd64\.zip$",
    },
    {
        "repo": "hahwul/dalfox",
        "binary": "dalfox",
        "asset": r"^dalfox-.*-linux-x86_64\.tar\.gz$",
    },
]


HEADERS = {"User-Agent": "t3mp3st-tools-image"}


def fetch_json(url: str) -> dict:
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=60) as res:
        return json.load(res)


def download(url: str, dest: Path) -> None:
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=300) as res, dest.open("wb") as out:
        shutil.copyfileobj(res, out)


def extract(archive: Path, dest: Path) -> None:
    if archive.suffix == ".zip":
        with zipfile.ZipFile(archive) as zf:
            zf.extractall(dest)
        return
    if archive.name.endswith(".tar.gz") or archive.name.endswith(".tgz"):
        with tarfile.open(archive) as tf:
            tf.extractall(dest)
        return
    raise RuntimeError(f"unsupported archive: {archive.name}")


def find_binary(root: Path, binary: str) -> Path:
    for path in root.rglob(binary):
        if path.is_file():
            return path
    raise RuntimeError(f"{binary} not found in extracted archive")


def install_tool(tool: dict, bindir: Path) -> None:
    release = fetch_json(f"https://api.github.com/repos/{tool['repo']}/releases/latest")
    pattern = re.compile(tool["asset"])
    asset = next((a for a in release.get("assets", []) if pattern.match(a.get("name", ""))), None)
    if not asset:
        names = ", ".join(a.get("name", "") for a in release.get("assets", []))
        raise RuntimeError(f"no matching asset for {tool['repo']} pattern {tool['asset']}; assets: {names}")

    with tempfile.TemporaryDirectory(prefix=f"{tool['binary']}-") as tmp_name:
        tmp = Path(tmp_name)
        archive = tmp / asset["name"]
        download(asset["browser_download_url"], archive)
        extract(archive, tmp / "out")
        src = find_binary(tmp / "out", tool["binary"])
        dest = bindir / tool["binary"]
        shutil.copy2(src, dest)
        dest.chmod(dest.stat().st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
        print(f"installed {tool['binary']} from {tool['repo']} {release.get('tag_name', '')}")


def main() -> int:
    bindir = Path(os.environ.get("T3MP3ST_RELEASE_BIN_DIR", "/usr/local/bin"))
    bindir.mkdir(parents=True, exist_ok=True)
    for tool in TOOLS:
        install_tool(tool, bindir)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"install-release-tools: {exc}", file=sys.stderr)
        raise
