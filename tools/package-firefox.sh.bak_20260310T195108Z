#!/usr/bin/env bash
set -euo pipefail

mkdir -p .local_logs
LOG_FILE=".local_logs/package-firefox.log"

{
  echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Starting Firefox package build"
  
  # Ensure we are in workspace root
  cd "$(dirname "$0")/.."
  
  echo "Installing dependencies if needed..."
  pnpm install
  
  echo "Building and packaging for Firefox..."
  pnpm run package:firefox
  
  echo "Firefox packaging complete"
} > "$LOG_FILE" 2>&1

echo '{"ts": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'", "task": "package-firefox", "status": "ok", "notes": "Successfully packaged Firefox XPI", "artifacts": ["build/firefox-mv3-prod.zip"]}' > .local_logs/state.json
