#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-escriba-app-302f5}"
BACKEND="${APPHOSTING_BACKEND:-dashboard}"
LOCATION="${APPHOSTING_LOCATION:-us-central1}"
ENV_FILE="${1:-apps/admin-dashboard/.env.local}"

if ! command -v firebase >/dev/null 2>&1; then
  echo "❌ firebase CLI no está instalado o no está en PATH"
  exit 1
fi

if ! command -v expect >/dev/null 2>&1; then
  echo "❌ expect no está instalado o no está en PATH"
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ No se encontró el archivo de entorno: $ENV_FILE"
  echo "   Uso: ./setup-apphosting-secrets.sh [ruta/al/.env.local]"
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

get_tinymce_value() {
  if [[ -n "${TINYMCE_API_KEY:-}" ]]; then
    printf '%s' "$TINYMCE_API_KEY"
  else
    printf '%s' "${NEXT_PUBLIC_TINYMCE_API_KEY:-}"
  fi
}

declare -a MAPPINGS=(
  "FIREBASE_API_KEY:NEXT_PUBLIC_FIREBASE_API_KEY"
  "FIREBASE_AUTH_DOMAIN:NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
  "FIREBASE_PROJECT_ID:NEXT_PUBLIC_FIREBASE_PROJECT_ID"
  "FIREBASE_STORAGE_BUCKET:NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"
  "FIREBASE_MESSAGING_SENDER_ID:NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
  "FIREBASE_APP_ID:NEXT_PUBLIC_FIREBASE_APP_ID"
  "FIREBASE_MEASUREMENT_ID:NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID"
)

secrets_to_grant=()
missing_vars=()

upsert_secret() {
  local secret_name="$1"
  local secret_value="$2"
  local temp_file
  temp_file="$(mktemp)"
  trap 'rm -f "$temp_file"' RETURN

  printf '%s' "$secret_value" > "$temp_file"

  expect -f - "$secret_name" "$PROJECT_ID" "$temp_file" <<'EOF'
  set timeout 5
set secret_name [lindex $argv 0]
set project_id [lindex $argv 1]
set data_file [lindex $argv 2]

spawn env TERM=dumb firebase apphosting:secrets:set $secret_name --project $project_id --data-file $data_file

expect {
  timeout {
    send "n\r"
    exp_continue
  }
  -re {Is this secret for production or only local testing\?} {
    send "\r"
    exp_continue
  }
  -re {Would you like to grant access now\\?} {
    send "\r"
    exp_continue
  }
  -re {add this secret to apphosting\.yaml} {
    send "n\r"
    exp_continue
  }
  -re {\(Y/n\)} {
    send "n\r"
    exp_continue
  }
  -re {\[Y/n\]} {
    send "n\r"
    exp_continue
  }
  eof
}

catch wait result
set exit_status [lindex $result 3]
exit $exit_status
EOF

  rm -f "$temp_file"
  trap - RETURN

  secrets_to_grant+=("$secret_name")
  echo "✅ Secret upserted: $secret_name"
}

for mapping in "${MAPPINGS[@]}"; do
  secret_name="${mapping%%:*}"
  env_name="${mapping#*:}"
  value="${!env_name:-}"

  if [[ -z "$value" ]]; then
    missing_vars+=("$env_name")
    continue
  fi

  upsert_secret "$secret_name" "$value"
done

tinymce_value="$(get_tinymce_value)"
if [[ -n "$tinymce_value" ]]; then
  upsert_secret "TINYMCE_API_KEY" "$tinymce_value"
else
  missing_vars+=("TINYMCE_API_KEY or NEXT_PUBLIC_TINYMCE_API_KEY")
fi

# Optional secret: FIREBASE_CONFIG
if [[ -n "${FIREBASE_CONFIG:-}" ]]; then
  upsert_secret "FIREBASE_CONFIG" "$FIREBASE_CONFIG"
fi

if (( ${#missing_vars[@]} > 0 )); then
  echo
  echo "⚠️ Variables faltantes en $ENV_FILE:"
  for var_name in "${missing_vars[@]}"; do
    echo "   - $var_name"
  done
  echo "   (Se omitieron los secrets correspondientes.)"
fi

if (( ${#secrets_to_grant[@]} == 0 )); then
  echo
  echo "❌ No se creó ningún secret. Revisa tus variables en $ENV_FILE"
  exit 1
fi

secrets_csv="$(IFS=,; echo "${secrets_to_grant[*]}")"

firebase apphosting:secrets:grantaccess "$secrets_csv" \
  --backend "$BACKEND" \
  --location "$LOCATION" \
  --project "$PROJECT_ID" \
  >/dev/null

echo

echo "✅ Grant access aplicado"
echo "   Project:  $PROJECT_ID"
echo "   Backend:  $BACKEND"
echo "   Location: $LOCATION"
echo "   Secrets:  $secrets_csv"
echo
echo "Siguiente paso: vuelve a desplegar App Hosting."
