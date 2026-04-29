#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "==> XO lint: panel"
"${ROOT_DIR}/scripts/xo/xo-admin.sh"

echo "==> XO lint: functions"
"${ROOT_DIR}/scripts/xo/xo-functions.sh"

echo "==> XO lint passed (admin + functions)"
