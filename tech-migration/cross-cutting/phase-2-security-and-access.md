# Fase 2 - Seguridad y control de acceso

## SEC-2001

- `id`: SEC-2001
- `scope`: endurecer `firestore.rules` para colecciones operativas y eliminar reglas ambiguas.
- `files`: `firestore.rules`
- `risk`: high
- `depends_on`: [X-0004]
- `acceptance`:
  - [x] No quedan expresiones ambiguas/inseguras en `assets` (`request.time == request.time` removido).
  - [ ] Reglas reflejan actores reales de negocio.
- `validation_commands`:
  - `firebase emulators:exec --only firestore "echo rules-check"` (si aplica en entorno local)
- `status`: `in_progress`

## SEC-2002

- `id`: SEC-2002
- `scope`: matriz de permisos por rol para acciones criticas.
- `files`: `tech-migration/cross-cutting/security-matrix.md`, `functions/src/**`, `apps/admin-dashboard/src/**`
- `risk`: high
- `depends_on`: [SEC-2001]
- `acceptance`:
  - [ ] Matriz de permisos definida y aprobable.
  - [ ] Casos borde identificados.
- `validation_commands`:
  - `cd functions && npx tsc --noEmit`
  - `cd apps/admin-dashboard && npx tsc --noEmit`
- `status`: `todo`

## SEC-2003

- `id`: SEC-2003
- `scope`: aplicar validacion por rol en callables operativos.
- `files`: `functions/src/callable/**`
- `risk`: high
- `depends_on`: [SEC-2002]
- `acceptance`:
  - [ ] Callables criticos validan rol explicito.
  - [ ] Errores de permiso estandarizados.
- `validation_commands`:
  - `cd functions && npx tsc --noEmit`
- `status`: `todo`

## SEC-2004

- `id`: SEC-2004
- `scope`: alinear `use-nav`/allowlist con rutas productivas reales.
- `files`: `apps/admin-dashboard/src/hooks/use-nav.ts`, `apps/admin-dashboard/src/config/nav-config.ts`
- `risk`: medium
- `depends_on`: [SEC-2002]
- `acceptance`:
  - [ ] Rutas operativas permitidas en prod sin drift.
- `validation_commands`:
  - `cd apps/admin-dashboard && npx tsc --noEmit`
- `status`: `todo`

## SEC-2005

- `id`: SEC-2005
- `scope`: documentar politica final de acceso y checklist de regresion de permisos.
- `files`: `tech-migration/cross-cutting/security-policy.md`
- `risk`: low
- `depends_on`: [SEC-2001, SEC-2002, SEC-2003, SEC-2004]
- `acceptance`:
  - [ ] Politica de acceso documentada.
  - [ ] Checklist operativo de permisos disponible.
- `validation_commands`:
  - `n/a (documental)`
- `status`: `todo`
