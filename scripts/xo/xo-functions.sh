#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FIX_FLAG="${1:-}"

ARGS=(
  --yes
  xo
  --cwd
  "${ROOT_DIR}/functions"
  --config
  "${ROOT_DIR}/scripts/xo/config/xo-functions.cjs"
  --space
  --prettier=compat
)

if [[ "${FIX_FLAG}" == "--fix" ]]; then
  ARGS+=(--fix)
fi

ARGS+=("src/**/*.{js,ts}")

npx "${ARGS[@]}"
