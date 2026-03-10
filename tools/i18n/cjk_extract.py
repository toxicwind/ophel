#!/usr/bin/env python3
"""Extract CJK lines (file + line number) into JSONL."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


CJK = re.compile(r"[\u4e00-\u9fff]")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--exclude", action="append", default=["node_modules", "build", "dist", ".git"])
    args = ap.parse_args()

    repo = Path(args.repo).resolve()
    out = Path(args.out).resolve()
    out.parent.mkdir(parents=True, exist_ok=True)

    ex = tuple(args.exclude)
    exts = {".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".css", ".less", ".txt", ".py", ".sh"}

    n = 0
    with out.open("w", encoding="utf-8") as f:
        for p in repo.rglob("*"):
            if not p.is_file():
                continue
            rel = str(p.relative_to(repo))
            if any(x in rel for x in ex):
                continue
            if p.suffix.lower() not in exts:
                continue
            try:
                lines = p.read_text(encoding="utf-8", errors="replace").splitlines()
            except Exception:
                continue
            for i, line in enumerate(lines, start=1):
                if CJK.search(line):
                    f.write(json.dumps({"file": rel, "line": i, "text": line}, ensure_ascii=False) + "\n")
                    n += 1

    print("OK:", out, "lines:", n)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
