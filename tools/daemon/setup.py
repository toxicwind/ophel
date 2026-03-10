#!/usr/bin/env python3
"""tools/daemon/setup.py — venv + Firefox Native Messaging Host registration

Run from anywhere:
  python3 tools/daemon/setup.py --repo /home/toxic/workspace/ophel

It will:
- create venv at tools/daemon/venv
- install requirements.txt (FastEmbed-based; avoids Torch)
- write NMH manifest:
  ~/.mozilla/native-messaging-hosts/com.effusionlabs.skein.indexer.json

It uses allowed_extensions = [skein@effusionlabs.com] by default.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path


HOST = "com.effusionlabs.skein.indexer"
EXT_ID = "skein@effusionlabs.com"


def run(cmd, cwd=None) -> None:
    p = subprocess.run(cmd, cwd=cwd, check=False, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if p.returncode != 0:
        raise SystemExit("cmd failed: {}\n{}\n{}".format(" ".join(cmd), p.stdout, p.stderr))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", required=True)
    args = ap.parse_args()

    repo = Path(args.repo).resolve()
    daemon = repo / "tools" / "daemon"
    venv = daemon / "venv"
    req = daemon / "requirements.txt"
    indexer = daemon / "indexer.py"

    if not repo.exists():
        raise SystemExit("repo not found: " + str(repo))

    if not venv.exists():
        run([sys.executable, "-m", "venv", str(venv)])
    py = venv / "bin" / "python3"
    pip = venv / "bin" / "pip"

    run([str(pip), "install", "--upgrade", "pip"])
    run([str(pip), "install", "-r", str(req)])

    nmh_dir = Path.home() / ".mozilla" / "native-messaging-hosts"
    nmh_dir.mkdir(parents=True, exist_ok=True)

    manifest = {{
        "name": HOST,
        "description": "Skein Vault Indexer (Native Messaging Host)",
        "path": str(py),
        "type": "stdio",
        "allowed_extensions": [EXT_ID],
        "arguments": [str(indexer)],
    }}

    out = nmh_dir / (HOST + ".json")
    out.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

    print("OK: wrote " + str(out))
    print("Next: run MCP via:\n  {} tools/daemon/mcp_server.py".format(str(py)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
