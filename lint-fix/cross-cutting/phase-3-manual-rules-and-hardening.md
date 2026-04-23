# Fase 3 - Reglas manuales y hardening

## LINT-3001 - Politica para reglas de alto impacto

- `id`: LINT-3001
- `scope`: definir excepciones o estrategia para reglas con alto costo de refactor.
- `files`:
  - configuracion XO/ESLint aplicable
  - `lint-fix/README.md`
- `risk`: medium
- `depends_on`:
  - LINT-2002
  - LINT-2102
- `acceptance`:
  - [ ] Quedan definidas reglas que se corrigen y reglas que se acotan/ajustan.
  - [ ] Decision documentada.
- `validation_commands`:
  - `npx --yes xo \"apps/admin-dashboard/src/**/*.{js,jsx,ts,tsx}\" \"functions/src/**/*.{js,ts}\"`
- `status`: `todo`

## LINT-3002 - Cierre de warnings y deuda residual

- `id`: LINT-3002
- `scope`: eliminar warnings restantes y dejar baseline controlado.
- `files`:
  - archivos residuales reportados por XO
- `risk`: medium
- `depends_on`:
  - LINT-3001
- `acceptance`:
  - [ ] Warnings en 0 o documentados con razon valida.
- `validation_commands`:
  - `npx --yes xo \"apps/admin-dashboard/src/**/*.{js,jsx,ts,tsx}\" \"functions/src/**/*.{js,ts}\"`
- `status`: `todo`

## LINT-3003 - Snapshot final de baseline

- `id`: LINT-3003
- `scope`: regenerar baseline final y comparar contra inicial.
- `files`:
  - `lint-fix/reports/**`
- `risk`: low
- `depends_on`:
  - LINT-3001
- `acceptance`:
  - [ ] Existe comparativa inicial vs final.
  - [ ] Queda indicador de reduccion total.
- `validation_commands`:
  - `sed -n '1,80p' lint-fix/reports/xo-baseline-summary.txt`
- `status`: `todo`
