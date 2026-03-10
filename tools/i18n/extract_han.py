#!/usr/bin/env python3
from __future__ import annotations
import argparse, json, re, subprocess, sys
from pathlib import Path
RE_HAN = re.compile(r"[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]")
def run(cmd, cwd=None):
    p = subprocess.run(cmd, cwd=cwd, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    if p.returncode != 0:
        sys.stderr.write(p.stdout)
        raise SystemExit(p.returncode)
    return p.stdout
def is_text_file(p: Path) -> bool:
    s = p.suffix.lower()
    if s in [".png",".jpg",".jpeg",".gif",".webp",".ico",".mp3",".mp4",".zip",".xpi",".pdf",".woff",".woff2",".ttf",".otf",".bin",".exe",".dll",".so",".dylib",".tar",".gz",".xz",".7z"]:
        return False
    return True
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    repo = Path(args.repo).expanduser().resolve()
    outp = Path(args.out).expanduser().resolve()
    outp.parent.mkdir(parents=True, exist_ok=True)
    files = run(["git","ls-files"], cwd=repo).splitlines()
    hits = 0
    total = 0
    with outp.open("w", encoding="utf-8", newline="\n") as f:
        for rel in files:
            p = repo / rel
            if not p.exists() or not p.is_file():
                continue
            if not is_text_file(p):
                continue
            try:
                lines = p.read_text(encoding="utf-8", errors="replace").splitlines()
            except Exception:
                continue
            for i, line in enumerate(lines, start=1):
                total += 1
                if RE_HAN.search(line):
                    hits += 1
                    rec = {"file": rel, "line": i, "text": line}
                    f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    sys.stdout.write("[cjk] scanned_lines=" + str(total) + " hits=" + str(hits) + " out=" + str(outp) + "\n")
if __name__ == "__main__":
    main()
