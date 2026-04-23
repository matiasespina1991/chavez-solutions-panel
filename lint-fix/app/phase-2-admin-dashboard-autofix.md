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
  - [ ] Reducir al menos 40% del total de errores en dashboard.
  - [ ] Sin cambio funcional reportado.
- `validation_commands`:
  - `cd apps/admin-dashboard && npx tsc --noEmit`
  - `cd apps/admin-dashboard && npm run build`
- `status`: `todo`

## LINT-2002 - Batch 2 manual (naming/nullish/import leftovers)

- `id`: LINT-2002
- `scope`: resolver reglas que no son autofix directo (`naming-convention`, `prefer-nullish`, `consistent-type-imports`) por feature.
- `files`:
  - `apps/admin-dashboard/src/features/**`
- `risk`: high
- `depends_on`:
  - LINT-2001
- `acceptance`:
  - [ ] No quedan errores criticos de tipado introducidos por renombres.
  - [ ] Se mantiene comportamiento de flujos core (configurator/requests/work-orders/services).
- `validation_commands`:
  - `cd apps/admin-dashboard && npx tsc --noEmit`
  - `cd apps/admin-dashboard && npm run build`
- `status`: `todo`
