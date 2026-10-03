#!/usr/bin/env bash
set -euo pipefail

project_directory="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_directory"

mode="${1:-dev}"
port="${PORT:-4173}"
if [[ ! "$port" =~ ^[0-9]{1,5}$ ]] || (( 10#$port < 1 || 10#$port > 65535 )); then
  printf '%s\n' 'PORT must be an integer between 1 and 65535.' >&2
  exit 2
fi
if [[ ! -f node_modules/vite/bin/vite.js ]]; then
  printf '%s\n' 'Dependencies are missing. Run npm ci in art-workbench first.' >&2
  exit 1
fi

case "$mode" in
  dev)
    exec node node_modules/vite/bin/vite.js --host 0.0.0.0 --port "$port" --strictPort
    ;;
  preview)
    if [[ ! -f dist/index.html ]]; then
      printf '%s\n' 'Production build is missing. Run npm run build first.' >&2
      exit 1
    fi
    exec node node_modules/vite/bin/vite.js preview --host 0.0.0.0 --port "$port" --strictPort
    ;;
  *)
    printf '%s\n' 'Usage: bash tools/serve.sh [dev|preview]' >&2
    exit 2
    ;;
esac
