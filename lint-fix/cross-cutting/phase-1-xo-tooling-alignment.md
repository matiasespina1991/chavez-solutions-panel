# Fase 1 - Alineacion de tooling XO

## LINT-1001 - Definir estrategia de convivencia XO + ESLint actual

- `id`: LINT-1001
- `scope`: decidir si XO corre standalone o como capa adicional por carpetas.
- `files`:
  - `lint-fix/README.md`
  - config de lint que se adopte
- `risk`: medium
- `depends_on`:
  - LINT-0002
- `acceptance`:
  - [ ] Estrategia documentada con comandos concretos.
  - [ ] No rompe `npm run lint` actual.
- `validation_commands`:
  - `cd apps/admin-dashboard && npm run lint`
  - `cd functions && npm run lint`
- `status`: `todo`

## LINT-1002 - Activar autofix seguro de estilo

- `id`: LINT-1002
- `scope`: preparar lote de autofixes low-risk (indent/object spacing/comma dangle/import order base).
- `files`:
  - archivos tocados por autofix
- `risk`: medium
- `depends_on`:
  - LINT-1001
- `acceptance`:
  - [ ] Se reduce significativamente `@stylistic/indent`.
  - [ ] Build/tsc siguen pasando.
- `validation_commands`:
  - `cd apps/admin-dashboard && npx tsc --noEmit`
  - `cd functions && npm run build`
- `status`: `todo`

## LINT-1003 - Estabilizar import resolution y extensiones

- `id`: LINT-1003
- `scope`: resolver reglas masivas `import-x/extensions` sin romper aliases de Next/Firebase.
- `files`:
  - config de lint/import resolver
  - archivos con imports ajustados
- `risk`: medium
- `depends_on`:
  - LINT-1001
- `acceptance`:
  - [ ] `import-x/extensions` cae por debajo de baseline inicial.
  - [ ] Sin regresion en imports TS path aliases.
- `validation_commands`:
  - `cd apps/admin-dashboard && npx tsc --noEmit`
  - `cd apps/admin-dashboard && npm run build`
- `status`: `todo`
