#!/usr/bin/env python3
from __future__ import annotations
import argparse, json, sys
from pathlib import Path
def die(msg):
    sys.stderr.write("[FATAL] " + msg + "\n")
    raise SystemExit(1)
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", required=True)
    ap.add_argument("--map", required=True, help="JSONL records: {file,line,replace}")
    ap.add_argument("--backup-suffix", default=".bak_cjk_apply")
    args = ap.parse_args()
    repo = Path(args.repo).expanduser().resolve()
    mapp = Path(args.map).expanduser().resolve()
    if not mapp.exists():
        die("map file missing: " + str(mapp))
    changes = {}
    for raw in mapp.read_text(encoding="utf-8", errors="replace").splitlines():
        if not raw.strip():
            continue
        rec = json.loads(raw)
        f = rec.get("file")
        ln = rec.get("line")
        rep = rec.get("replace")
        if not f or not ln or rep is None:
            continue
        changes.setdefault(f, []).append((int(ln), str(rep)))
    patched = 0
    for rel, edits in changes.items():
        p = repo / rel
        if not p.exists():
            continue
        lines = p.read_text(encoding="utf-8", errors="replace").splitlines()
        bak = p.with_suffix(p.suffix + args.backup_suffix)
        if not bak.exists():
            bak.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")
        for ln, rep in sorted(edits, key=lambda x: x[0]):
            if 1 <= ln <= len(lines):
                lines[ln - 1] = rep
        p.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")
        patched += 1
    sys.stdout.write("[cjk] patched_files=" + str(patched) + "\n")
if __name__ == "__main__":
    main()
