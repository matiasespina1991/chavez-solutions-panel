# Fase 2 - Admin Dashboard (autofix por lotes)

## LINT-2001 - Autofix batch 1 (estilo y formato seguro)

- `id`: LINT-2001
- `scope`: aplicar autofix masivo en `apps/admin-dashboard/src` para reglas de estilo fixables.
- `files`:
  - `apps/admin-dashboard/src/**`
- `risk`: medium
- `depends_on`:
  - LINT-1002
- `acceptance`:
  - [x] Reducir al menos 40% del total de errores en dashboard.
  - [x] Sin cambio funcional reportado.
- `validation_commands`:
  - `cd apps/admin-dashboard && npx tsc --noEmit`
  - `cd apps/admin-dashboard && npm run build`
- `status`: `approved`

## LINT-2002 - Batch 2 manual (naming/nullish/import leftovers)

- `id`: LINT-2002
- `scope`: resolver reglas que no son autofix directo (`naming-convention`, `prefer-nullish`, `consistent-type-imports`) por feature.
- `files`:
  - `apps/admin-dashboard/src/features/**`
- `risk`: high
- `depends_on`:
  - LINT-2001
- `acceptance`:
  - [x] No quedan errores criticos de tipado introducidos por renombres.
  - [x] Se mantiene comportamiento de flujos core (configurator/requests/work-orders/services).
- `validation_commands`:
  - `cd apps/admin-dashboard && npx tsc --noEmit`
  - `cd apps/admin-dashboard && npm run build`
- `status`: `approved`

## Resultado de fase

- Baseline admin reducido de `39,380` errores globales XO a remanente de `116` errores (ver `lint-fix/reports/xo-baseline-summary.txt`).
- `npx tsc --noEmit` en `apps/admin-dashboard` pasa.
- `npm run build` queda condicionado por red en entorno sandbox (fallo por `next/font` al resolver Google Fonts).
