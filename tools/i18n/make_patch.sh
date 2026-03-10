#!/usr/bin/env bash
set -euo pipefail
REPO=""
BEFORE=""
AFTER=""
OUT=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo) REPO="$2"; shift 2;;
    --before) BEFORE="$2"; shift 2;;
    --after) AFTER="$2"; shift 2;;
    --out) OUT="$2"; shift 2;;
    *) echo "unknown arg: $1" >&2; exit 2;;
  esac
done
[[ -n "$REPO" && -n "$BEFORE" && -n "$AFTER" && -n "$OUT" ]] || { echo "missing args" >&2; exit 2; }
python3 - "$BEFORE" "$AFTER" "$OUT" <<'PY'
import json, sys
before_p, after_p, out_p = sys.argv[1], sys.argv[2], sys.argv[3]
def load(p):
    out = {}
    for line in open(p, encoding="utf-8", errors="replace"):
        line = line.strip()
        if not line:
            continue
        rec = json.loads(line)
        k = (rec.get("file"), int(rec.get("line")))
        out[k] = rec.get("text", "")
    return out
b = load(before_p)
a = load(after_p)
with open(out_p, "w", encoding="utf-8", newline="\n") as f:
    for k in sorted(set(b.keys()) | set(a.keys())):
        if k in a and a.get(k) != b.get(k):
            rec = {"file": k[0], "line": k[1], "replace": a.get(k, "")}
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
print("[patch] wrote", out_p)
PY
