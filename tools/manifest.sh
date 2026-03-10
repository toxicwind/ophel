#!/usr/bin/env bash
set -euo pipefail
: "${BRAND_NAME:=Ophel Vault}"
: "${BRAND_SLUG:=ophel-vault}"
mkdir -p dist
ARTS="$(fd -t f -H -e js -e zip -e xpi 'ophel|userscript|firefox|prod|build' build dist 2>/dev/null || true)"
HEAD="$(git rev-parse HEAD 2>/dev/null || true)"
UP="$(git rev-parse upstream/main 2>/dev/null || true)"
TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
jq -n --arg brand "$BRAND_NAME" --arg slug "$BRAND_SLUG" --arg head "$HEAD" --arg up "$UP" --arg ts "$TS" \
  '{brand:$brand,slug:$slug,generated_at:$ts,git:{head:$head,upstream_main:$up},artifacts:[]}' > dist/manifest.json
while IFS= read -r f; do
  [[ -f "$f" ]] || continue
  sha="$(sha256sum "$f" | awk "{print \$1}")"; bytes="$(wc -c < "$f" | tr -d " ")"
  tmp="$(mktemp)"
  jq --arg path "$f" --arg sha "$sha" --argjson bytes "$bytes" '.artifacts += [{path:$path, sha256:$sha, bytes:$bytes}]' dist/manifest.json > "$tmp"
  mv "$tmp" dist/manifest.json
done <<< "$ARTS"
echo "[ok] dist/manifest.json"
