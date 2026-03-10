#!/usr/bin/env python3
"""tools/manifest.py — deterministic artifact manifest (sha256 + sizes)

Run:
  python3 tools/manifest.py --repo /home/toxic/workspace/ophel
"""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
from pathlib import Path


def sha256_file(p: Path) -> str:
    h = hashlib.sha256()
    with p.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def git_head(repo: Path) -> str:
    p = subprocess.run(["git", "rev-parse", "HEAD"], cwd=repo, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return (p.stdout or "").strip()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", required=True)
    ap.add_argument("--out", default="")
    args = ap.parse_args()

    repo = Path(args.repo).resolve()
    if not repo.exists():
        raise SystemExit("repo not found: " + str(repo))

    roots = [repo / "build", repo / "dist"]
    artifacts = []
    for root in roots:
        if not root.exists():
            continue
        for p in root.rglob("*"):
            if not p.is_file():
                continue
            if p.suffix in [".xpi", ".zip", ".js"] or p.name.endswith(".user.js"):
                artifacts.append(p)

    outp = Path(args.out) if args.out else (repo / "build" / "manifest.json")
    outp.parent.mkdir(parents=True, exist_ok=True)

    payload = {
        "ts": __import__("time").strftime("%Y-%m-%dT%H:%M:%SZ", __import__("time").gmtime()),
        "git": {"head": git_head(repo)},
        "artifacts": [
            {"path": str(p.relative_to(repo)), "bytes": p.stat().st_size, "sha256": sha256_file(p)}
            for p in sorted(artifacts)
        ],
    }
    outp.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print("OK: wrote " + str(outp))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
