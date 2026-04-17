# Fase 0 - Baseline y bloqueantes de infraestructura

## X-0001 - Corregir `.gitignore` invalido en admin

- `id`: X-0001
- `scope`: corregir glob invalido `*.pem\` en `apps/admin-dashboard/.gitignore`.
- `files`:
  - `apps/admin-dashboard/.gitignore`
- `risk`: low (sin impacto funcional).
- `depends_on`: []
- `acceptance`:
  - [x] `rg` deja de reportar `dangling '\\'`.
  - [x] El patron de certificados queda valido (`*.pem`).
- `validation_commands`:
  - `rg -n "collection\\(|service_requests|requests-list" apps/admin-dashboard/src functions/src | head`
- `status`: `approved`

## X-0002 - Alinear `firebase.json` y `apphosting*.yaml`

- `id`: X-0002
- `scope`: alinear target de hosting/apphosting al dashboard (`apps/admin-dashboard`) y declarar fuente de verdad.
- `files`:
  - `firebase.json`
  - `apphosting.dashboard.dev.yaml_`
  - `apphosting.dashboard.yaml_`
  - `apphosting.dev.yaml_`
  - `apphosting.yaml_`
  - `apps/admin-dashboard/apphosting.yaml`
- `risk`: medium (afecta configuracion de despliegue).
- `depends_on`:
  - X-0001
- `acceptance`:
  - [x] No quedan referencias activas a `apps/web` en configuracion principal.
  - [x] `dashboard` apunta a `apps/admin-dashboard`.
  - [x] Queda documentado el archivo fuente de verdad del dashboard.
- `validation_commands`:
  - `cat firebase.json`
  - `for f in apphosting*.yaml_ apps/admin-dashboard/apphosting.yaml; do echo '---' $f; grep -n "sourceDir" $f; done`
- `status`: `approved`

## X-0003 - Limpiar artefactos legacy en `functions/lib/*.d.ts`

- `id`: X-0003
- `scope`: eliminar declaraciones legacy no presentes en `functions/src` (nombres viejos `ServiceRequest`/triggers alias).
- `files`:
  - `functions/lib/callable/approveServiceRequest.d.ts`
  - `functions/lib/callable/deleteServiceRequest.d.ts`
  - `functions/lib/callable/migrateServiceRequestsToRequests.d.ts`
  - `functions/lib/callable/rejectServiceRequest.d.ts`
  - `functions/lib/migration/migrateConfigurationsToServiceRequests.d.ts`
  - `functions/lib/triggers/onServiceRequestSubmitted.d.ts`
  - `functions/lib/triggers/onUploadImage.d.ts`
  - `functions/lib/triggers/onUploadVideo.d.ts`
  - `functions/lib/utils/proformaPdf.d.ts`
- `risk`: low (solo output compilado trackeado; sin cambio runtime).
- `depends_on`:
  - X-0001
- `acceptance`:
  - [x] No quedan `.d.ts` de `ServiceRequest*` legacy en `functions/lib`.
  - [x] `functions/src/index.ts` exporta solo nombres vigentes.
- `validation_commands`:
  - `find functions/lib -maxdepth 2 -name '*.d.ts' | sort`
  - `sed -n '1,240p' functions/src/index.ts`
- `status`: `approved`

## X-0004 - Baseline tecnico del estado actual

- `id`: X-0004
- `scope`: documentar baseline de build/tipado/deuda y comandos base de validacion.
- `files`:
  - `tech-migration/cross-cutting/baseline.md`
- `risk`: low
- `depends_on`:
  - X-0001
  - X-0002
  - X-0003
- `acceptance`:
  - [x] Baseline incluye estado actual de tipado frontend/functions.
  - [x] Baseline incluye deuda estructural priorizada.
- `validation_commands`:
  - `cd apps/admin-dashboard && npx tsc --noEmit`
  - `cd functions && npx tsc --noEmit`
- `status`: `approved`

