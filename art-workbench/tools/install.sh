#!/usr/bin/env bash
set -euo pipefail

project_directory="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_directory"

node --input-type=module -e 'const [major, minor] = process.versions.node.split(".").map(Number); if (!(major === 20 && minor >= 19 || major === 22 && minor >= 12 || major > 22)) { console.error("Use Node.js 20.19+, 22.12+, or a newer supported release."); process.exit(1); }'
command -v python3 >/dev/null
npm ci --cache "${GUANWU_NPM_CACHE:-/workspace/.npm-cache}" --no-audit --no-fund
npm test
npm run build:portable
npm run build:materials
