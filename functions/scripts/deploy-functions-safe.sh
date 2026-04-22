#!/usr/bin/env bash

set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PROJECT_ID="${1:-}"
MAX_RETRIES="${MAX_RETRIES:-3}"
BASE_BACKOFF_SECONDS="${BASE_BACKOFF_SECONDS:-20}"
BATCH_SIZE="${BATCH_SIZE:-5}"

echo "==> Building functions..."
if ! npm run build; then
  echo "Build failed. Aborting deploy."
  exit 1
fi

FUNCTION_NAMES=()
while IFS= read -r FUNCTION_NAME; do
  if [ -n "$FUNCTION_NAME" ]; then
    FUNCTION_NAMES+=("$FUNCTION_NAME")
  fi
done < <(awk "/^export \\{ [A-Za-z0-9_]+ \\} from '/ { print \$3 }" src/index.ts)

if [ "${#FUNCTION_NAMES[@]}" -eq 0 ]; then
  echo "No exported functions found in src/index.ts"
  exit 1
fi

echo "==> Functions to deploy (${#FUNCTION_NAMES[@]}): ${FUNCTION_NAMES[*]}"
echo "==> Batch size: ${BATCH_SIZE}"

FAILED=()

for ((i = 0; i < ${#FUNCTION_NAMES[@]}; i += BATCH_SIZE)); do
  BATCH=("${FUNCTION_NAMES[@]:i:BATCH_SIZE}")
  DEPLOY_TARGETS=""
  for FUNCTION_NAME in "${BATCH[@]}"; do
    if [ -n "$DEPLOY_TARGETS" ]; then
      DEPLOY_TARGETS+=","
    fi
    DEPLOY_TARGETS+="functions:${FUNCTION_NAME}"
  done

  ATTEMPT=1
  SUCCESS=0

  while [ "$ATTEMPT" -le "$MAX_RETRIES" ]; do
    echo
    echo "==> Deploying batch (${ATTEMPT}/${MAX_RETRIES}): ${BATCH[*]}"

    if [ -n "$PROJECT_ID" ]; then
      firebase deploy --project "$PROJECT_ID" --only "$DEPLOY_TARGETS"
    else
      firebase deploy --only "$DEPLOY_TARGETS"
    fi

    EXIT_CODE=$?
    if [ "$EXIT_CODE" -eq 0 ]; then
      SUCCESS=1
      break
    fi

    if [ "$ATTEMPT" -lt "$MAX_RETRIES" ]; then
      BACKOFF=$((BASE_BACKOFF_SECONDS * ATTEMPT))
      echo "Deploy failed for batch (${BATCH[*]}). Retrying in ${BACKOFF}s..."
      sleep "$BACKOFF"
    fi

    ATTEMPT=$((ATTEMPT + 1))
  done

  if [ "$SUCCESS" -ne 1 ]; then
    FAILED+=("${BATCH[@]}")
  fi
done

echo
if [ "${#FAILED[@]}" -eq 0 ]; then
  echo "All functions deployed successfully."
  exit 0
fi

echo "Deploy failed for ${#FAILED[@]} function(s): ${FAILED[*]}"
exit 1
