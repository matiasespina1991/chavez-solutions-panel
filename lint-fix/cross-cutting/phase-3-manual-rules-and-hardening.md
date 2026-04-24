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
  - [x] Quedan definidas reglas que se corrigen y reglas que se acotan/ajustan.
  - [x] Decision documentada.
- `validation_commands`:
  - `npx --yes xo \"apps/admin-dashboard/src/**/*.{js,jsx,ts,tsx}\" \"functions/src/**/*.{js,ts}\"`
- `status`: `approved`

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
- `status`: `in_progress`

## LINT-3003 - Snapshot final de baseline

- `id`: LINT-3003
- `scope`: regenerar baseline final y comparar contra inicial.
- `files`:
  - `lint-fix/reports/**`
- `risk`: low
- `depends_on`:
  - LINT-3001
- `acceptance`:
  - [x] Existe comparativa inicial vs final.
  - [x] Queda indicador de reduccion total.
- `validation_commands`:
  - `sed -n '1,80p' lint-fix/reports/xo-baseline-summary.txt`
- `status`: `approved`

## Resultado parcial de fase

- Regla/política aplicada para alto costo de refactor en stack actual TS+Next:
  - `react/prop-types`: off (redundante en TypeScript).
  - `react/no-array-index-key`: off temporal en legacy UI/skeletons.
  - `react/function-component-definition`: off temporal para evitar churn masivo.
  - `react-hooks/incompatible-library`, `react-hooks/preserve-manual-memoization`, `react-hooks/purity`: off temporal (ruido de compiler checks no bloqueante).
  - `@typescript-eslint/no-empty-function`: off temporal por hooks/utilidades existentes.
- Fixes manuales aplicados en código:
  - `@typescript-eslint/no-floating-promises` en componentes/hook críticos.
  - `react/jsx-no-constructed-context-values` en providers clave (`active-theme`, `chart`, `form`, `toggle-group`).
  - `@typescript-eslint/no-base-to-string` en `work-order-row-adapter`.
- Snapshot actualizado:
  - Baseline inicial: `errors=39380`, `warnings=115`.
  - Estado actual: `errors=39`, `warnings=1`.
  - Reducción acumulada de errores: `99.90%`.
