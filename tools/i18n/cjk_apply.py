#!/usr/bin/env python3
from __future__ import annotations
import argparse, json
from pathlib import Path

# Applies a line-addressed mapping file:
#   {"replacements":[{"file":"path","line":123,"from":"...","to":"..."}]}
#
# Conservative by design: only replaces within the addressed line.
#
def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", required=True)
    ap.add_argument("--map", required=True)
    args = ap.parse_args()
    repo = Path(args.repo).resolve()
    mp = Path(args.map).resolve()

    data = json.loads(mp.read_text(encoding="utf-8", errors="replace"))
    reps = data.get("replacements", [])
    by_file = {}
    for r in reps:
        by_file.setdefault(r["file"], []).append(r)

    touched = 0
    for rel, items in by_file.items():
        p = repo / rel
        if not p.exists():
            continue
        lines = p.read_text(encoding="utf-8", errors="replace").splitlines()
        for r in sorted(items, key=lambda x: int(x["line"]), reverse=True):
            ln = int(r["line"])
            if ln <= 0 or ln > len(lines):
                continue
            src = r.get("from", "")
            dst = r.get("to", "")
            if src and src in lines[ln - 1]:
                lines[ln - 1] = lines[ln - 1].replace(src, dst)
        p.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")
        touched += 1
        print("patched:", rel)
    print("touched files:", touched)
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
