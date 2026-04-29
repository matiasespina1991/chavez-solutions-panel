#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REPORTS_DIR="${ROOT_DIR}/scripts/xo/reports"

mkdir -p "${REPORTS_DIR}"

set +e
"${ROOT_DIR}/scripts/xo/xo-admin.sh" > "${REPORTS_DIR}/xo-admin-baseline.txt" 2>&1
ADMIN_EXIT=$?
"${ROOT_DIR}/scripts/xo/xo-functions.sh" > "${REPORTS_DIR}/xo-functions-baseline.txt" 2>&1
FUNCTIONS_EXIT=$?
set -e

npx --yes xo \
  --cwd "${ROOT_DIR}/apps/panel" \
  --config "${ROOT_DIR}/scripts/xo/config/xo-admin.cjs" \
  --space \
  --prettier=compat \
  --reporter=json \
  "src/**/*.{js,jsx,ts,tsx}" > "${REPORTS_DIR}/xo-admin-baseline.json" 2>&1 || true

npx --yes xo \
  --cwd "${ROOT_DIR}/functions" \
  --config "${ROOT_DIR}/scripts/xo/config/xo-functions.cjs" \
  --space \
  --prettier=compat \
  --reporter=json \
  "src/**/*.{js,ts}" > "${REPORTS_DIR}/xo-functions-baseline.json" 2>&1 || true

node "${ROOT_DIR}/scripts/xo/xo-summarize.mjs"

if [[ ${ADMIN_EXIT} -ne 0 || ${FUNCTIONS_EXIT} -ne 0 ]]; then
  exit 1
fi
