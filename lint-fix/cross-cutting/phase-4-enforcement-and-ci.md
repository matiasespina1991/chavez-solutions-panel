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
  - [ ] Comando documentado y reproducible.
  - [ ] Sin falsos positivos por artefactos.
- `validation_commands`:
  - `npx --yes xo \"apps/admin-dashboard/src/**/*.{js,jsx,ts,tsx}\" \"functions/src/**/*.{js,ts}\"`
- `status`: `todo`

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
  - [ ] PR falla si reintroduce reglas bloqueadas.
- `validation_commands`:
  - `npx --yes xo \"apps/admin-dashboard/src/**/*.{js,jsx,ts,tsx}\" \"functions/src/**/*.{js,ts}\"`
- `status`: `todo`

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
  - [ ] Guia operativa final lista.
  - [ ] Tracker alineado a estado real.
- `validation_commands`:
  - `sed -n '1,220p' lint-fix/README.md`
  - `sed -n '1,220p' lint-fix/TRACKER.md`
- `status`: `todo`
