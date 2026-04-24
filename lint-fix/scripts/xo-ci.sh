#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "==> XO lint: admin-dashboard"
"${ROOT_DIR}/lint-fix/scripts/xo-admin.sh"

echo "==> XO lint: functions"
"${ROOT_DIR}/lint-fix/scripts/xo-functions.sh"

echo "==> XO lint passed (admin + functions)"
