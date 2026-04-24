# Fase 2 - Functions (autofix por lotes)

## LINT-2101 - Autofix batch 1 (estilo + imports)

- `id`: LINT-2101
- `scope`: aplicar autofix en `functions/src` para reglas fixables de formato/import.
- `files`:
  - `functions/src/**`
- `risk`: medium
- `depends_on`:
  - LINT-1002
- `acceptance`:
  - [x] Reduccion visible del baseline en functions.
  - [x] Build de functions permanece estable.
- `validation_commands`:
  - `cd functions && npm run build`
  - `cd functions && npm run test:contracts`
- `status`: `approved`

## LINT-2102 - Batch 2 manual (safe any/typing/naming)

- `id`: LINT-2102
- `scope`: resolver reglas `@typescript-eslint/*` y `unicorn/*` que requieren cambios manuales.
- `files`:
  - `functions/src/**`
- `risk`: high
- `depends_on`:
  - LINT-2101
- `acceptance`:
  - [x] No se degradan callables/triggers.
  - [x] Contratos backend siguen verdes.
- `validation_commands`:
  - `cd functions && npm run build`
  - `cd functions && npm run test:contracts`
- `status`: `approved`

## Resultado de fase

- `functions` quedó con `0` errores en corrida XO por configuración de Fase 2.
- `npm run build` en `functions` pasa.
- `npm run test:contracts` en `functions` pasa (`5/5`).
