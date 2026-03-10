#!/usr/bin/env bash
set -euo pipefail
: "${BRAND_SLUG:=ophel-vault}"
: "${GECKO_ID:=${BRAND_SLUG}@effusionlabs.com}"
: "${HOST_NAME:=com.${BRAND_SLUG}.vault}"
: "${HOST_SCRIPT:=$(pwd)/tools/daemon/native_host.py}"
NM_DIR="$HOME/.mozilla/native-messaging-hosts"
mkdir -p "$NM_DIR"
cat > "$NM_DIR/$HOST_NAME.json" <<JSON
{"name":"$HOST_NAME","description":"Ophel fork local vault host","path":"$HOST_SCRIPT","type":"stdio","allowed_extensions":["$GECKO_ID"]}
JSON
echo "[ok] installed: $NM_DIR/$HOST_NAME.json"
