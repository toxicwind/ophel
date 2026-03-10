#!/usr/bin/env python3
from __future__ import annotations
import argparse, json, re, subprocess
from pathlib import Path

CJK = re.compile(r"[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]")

def git_ls_files(repo: Path) -> list[Path]:
    p = subprocess.run(["git","ls-files","-z"], cwd=str(repo), stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    out = []
    for part in (p.stdout.decode("utf-8", "replace")).split("\x00"):
        if part:
            out.append(repo / part)
    return out

def is_text(p: Path) -> bool:
    try:
        b = p.read_bytes()
    except Exception:
        return False
    if b"\x00" in b:
        return False
    ext = p.suffix.lower()
    if ext in {".png",".jpg",".jpeg",".webp",".gif",".mp3",".mp4",".zip",".xpi",".pdf",".woff",".woff2"}:
        return False
    return True

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    repo = Path(args.repo).resolve()
    out = Path(args.out).resolve()
    out.parent.mkdir(parents=True, exist_ok=True)

    hits = 0
    with out.open("w", encoding="utf-8", newline="\n") as f:
        for p in git_ls_files(repo):
            rel = str(p.relative_to(repo))
            if rel.startswith(("node_modules/","build/","dist/",".git/")):
                continue
            if not p.is_file() or not is_text(p):
                continue
            try:
                txt = p.read_text(encoding="utf-8", errors="replace")
            except Exception:
                continue
            for i, line in enumerate(txt.splitlines(), start=1):
                if CJK.search(line):
                    hits += 1
                    f.write(json.dumps({"file": rel, "line": i, "text": line}, ensure_ascii=False) + "\n")
    print("cjk hits:", hits, "out:", out)
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
