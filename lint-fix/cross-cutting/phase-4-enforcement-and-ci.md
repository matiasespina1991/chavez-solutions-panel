# Fase 4 - Enforcement y CI

## LINT-4001 - Comando oficial de lint XO para CI

- `id`: LINT-4001
- `scope`: definir comando estable para CI y para validacion local.
- `files`:
  - script npm correspondiente (workspace/s)
  - docs del repo (si aplica)
- `risk`: medium
- `depends_on`:
  - LINT-3002
- `acceptance`:
  - [x] Comando documentado y reproducible.
  - [x] Sin falsos positivos por artefactos.
- `validation_commands`:
  - `npx --yes xo \"apps/admin-dashboard/src/**/*.{js,jsx,ts,tsx}\" \"functions/src/**/*.{js,ts}\"`
- `status`: `approved`

## LINT-4002 - Gate de PR (bloqueo incremental)

- `id`: LINT-4002
- `scope`: activar gate para no reintroducir deuda (umbral 0 o incremental por regla).
- `files`:
  - pipeline/workflow CI (si aplica)
  - docs de contribution (si aplica)
- `risk`: medium
- `depends_on`:
  - LINT-4001
- `acceptance`:
  - [x] PR falla si reintroduce reglas bloqueadas.
- `validation_commands`:
  - `npx --yes xo \"apps/admin-dashboard/src/**/*.{js,jsx,ts,tsx}\" \"functions/src/**/*.{js,ts}\"`
- `status`: `approved`

## LINT-4003 - Cierre y handoff

- `id`: LINT-4003
- `scope`: checklist final, comandos operativos y guia para mantenimiento.
- `files`:
  - `lint-fix/README.md`
  - `lint-fix/TRACKER.md`
- `risk`: low
- `depends_on`:
  - LINT-4002
- `acceptance`:
  - [x] Guia operativa final lista.
  - [x] Tracker alineado a estado real.
- `validation_commands`:
  - `sed -n '1,220p' lint-fix/README.md`
  - `sed -n '1,220p' lint-fix/TRACKER.md`
- `status`: `approved`

## Resultado de fase

- Comando oficial de lint XO:
  - `./lint-fix/scripts/xo-ci.sh`
- Scripts por workspace:
  - `cd apps/admin-dashboard && npm run lint:xo`
  - `cd functions && npm run lint:xo`
- Autofix por workspace:
  - `cd apps/admin-dashboard && npm run lint:xo:fix`
  - `cd functions && npm run lint:xo:fix`
- Gate de CI:
  - workflow: `.github/workflows/lint-xo.yml`
  - ejecuta instalación de dependencias en ambos workspaces y falla PR/push si `xo-ci.sh` falla.
