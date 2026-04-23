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
  - [ ] Reduccion visible del baseline en functions.
  - [ ] Build de functions permanece estable.
- `validation_commands`:
  - `cd functions && npm run build`
  - `cd functions && npm run test:contracts`
- `status`: `todo`

## LINT-2102 - Batch 2 manual (safe any/typing/naming)

- `id`: LINT-2102
- `scope`: resolver reglas `@typescript-eslint/*` y `unicorn/*` que requieren cambios manuales.
- `files`:
  - `functions/src/**`
- `risk`: high
- `depends_on`:
  - LINT-2101
- `acceptance`:
  - [ ] No se degradan callables/triggers.
  - [ ] Contratos backend siguen verdes.
- `validation_commands`:
  - `cd functions && npm run build`
  - `cd functions && npm run test:contracts`
- `status`: `todo`
