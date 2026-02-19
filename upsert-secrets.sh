#!/usr/bin/env zsh

# zsh safe script to upsert secrets from environment variables

pairs=(
  "FIREBASE_API_KEY NEXT_PUBLIC_FIREBASE_API_KEY"
  "FIREBASE_AUTH_DOMAIN NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
  "FIREBASE_PROJECT_ID NEXT_PUBLIC_FIREBASE_PROJECT_ID"
  "FIREBASE_STORAGE_BUCKET NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"
  "FIREBASE_MESSAGING_SENDER_ID NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
  "FIREBASE_APP_ID NEXT_PUBLIC_FIREBASE_APP_ID"
)

for pair in $pairs; do
  secret_name="${pair%% *}"
  env_var_name="${pair#* }"
  value="${(P)env_var_name}"

  if [ -z "$value" ]; then
    echo "Skipping $secret_name because $env_var_name is empty"
    continue
  fi

  echo -n "$value" | gcloud secrets create "$secret_name" --data-file=- --project=laura-butallo-web 2>/dev/null \
    || echo -n "$value" | gcloud secrets versions add "$secret_name" --data-file=- --project=laura-butallo-web

  echo "Upserted secret: $secret_name"
done

