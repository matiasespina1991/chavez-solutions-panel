# Fase 1 - Contratos canonicos y nomenclatura

## CT-1001

- `id`: CT-1001
- `scope`: constantes canonicas de colecciones en frontend y reemplazo de literals en features operativas.
- `files`: `apps/admin-dashboard/src/constants/**`, `apps/admin-dashboard/src/features/**`
- `risk`: medium
- `depends_on`: [X-0004]
- `acceptance`:
  - [x] Modulo de constantes frontend creado.
  - [x] Reemplazo de strings inline en core operativo (slice inicial: configurator/requests/work-orders/services-catalog/lab-analysis).
  - [x] Cobertura no-core/legacy omitida explicitamente en esta ola (fuera de alcance del nucleo operativo).
- `validation_commands`:
  - `cd apps/admin-dashboard && npx tsc --noEmit`
- `status`: `approved`

## CT-1002

- `id`: CT-1002
- `scope`: constantes canonicas equivalentes en backend (`functions/src/constants/firestore.ts`) y reemplazo de literals.
- `files`: `functions/src/constants/**`, `functions/src/callable/**`, `functions/src/triggers/**`
- `risk`: medium
- `depends_on`: [X-0004]
- `acceptance`:
  - [x] Modulo de constantes backend creado.
  - [x] Callables/triggers operativos principales migrados (`requests`, `work_orders`, `services`, `mail_outbox`).
  - [x] Cobertura `media/mediasets` omitida explicitamente por estar fuera de alcance operativo en esta ola.
- `validation_commands`:
  - `cd functions && npx tsc --noEmit`
- `status`: `approved`

## CT-1003

- `id`: CT-1003
- `scope`: tipos canonicos frontend para `Request`, `WorkOrder`, `TechnicalService`.
- `files`: `apps/admin-dashboard/src/types/**`, `apps/admin-dashboard/src/features/**`
- `risk`: medium
- `depends_on`: [CT-1001]
- `acceptance`:
  - [x] Tipos canonicos definidos y consumidos (slice inicial: `Matrix/Status/RequestRow/WorkOrderRow/TechnicalServicePayload`).
  - [x] Duplicacion local reducida en features core (`requests-listing`, `work-orders-listing`, `configurations`, `import-services`).
- `validation_commands`:
  - `cd apps/admin-dashboard && npx tsc --noEmit`
- `status`: `approved`

## CT-1004

- `id`: CT-1004
- `scope`: tipos canonicos backend para payloads docs compartidos entre callables/triggers.
- `files`: `functions/src/types/**`, `functions/src/callable/**`, `functions/src/triggers/**`
- `risk`: medium
- `depends_on`: [CT-1002]
- `acceptance`:
  - [x] Contratos backend compartidos definidos (slice inicial: `requests` + `technical-services`).
  - [x] Payloads tipados sin duplicacion principal en callables core (`approve/reject/createWorkOrder/pause/resume/create/delete/saveTechnicalChanges`).
- `validation_commands`:
  - `cd functions && npx tsc --noEmit`
- `status`: `approved`

## CT-1005

- `id`: CT-1005
- `scope`: normalizar naming semantico interno `serviceRequest*` -> `request*` donde no sea contrato externo.
- `files`: `apps/admin-dashboard/src/**`, `functions/src/**`, `docs/**`
- `risk`: medium
- `depends_on`: [CT-1003, CT-1004]
- `acceptance`:
  - [x] Naming legacy corregido en docs core operativos (`requests-list`, `requests`, `deleteProforma`).
  - [x] Compatibilidad `ServiceRequest*` removida en app core (`configurations`, `configurator-form`, logs de `requests-listing`), usando `Request*` directo.
  - [x] Naming interno legacy reducido en codigo sin romper APIs publicas (sin `ServiceRequest*` en `apps/admin-dashboard/src` y sin artefactos legacy en `functions/lib`).
- `validation_commands`:
  - `cd apps/admin-dashboard && npx tsc --noEmit`
  - `cd functions && npx tsc --noEmit`
- `status`: `approved`

## CT-1006

- `id`: CT-1006
- `scope`: unificar normalizadores repetidos (`matrix`, `timestamp`, `status labels`) en utilidades compartidas.
- `files`: `apps/admin-dashboard/src/lib/**`, `apps/admin-dashboard/src/features/**`, `functions/src/utils/**`
- `risk`: medium
- `depends_on`: [CT-1003]
- `acceptance`:
  - [x] Slice matriz consolidado en util compartida (`normalizeMatrixArray`).
  - [x] Reuso aplicado en modulos core app (`configurator`, `requests-listing`, `work-orders-listing`).
  - [x] Slice timestamp/status labels app consolidado (`formatFirestoreTimestamp`, `firestoreTimestampToMs`, `REQUEST_STATUS_LABEL_MAP`, `WORK_ORDER_STATUS_LABEL_MAP`) y reusado en listados core.
  - [x] Slice backend matriz consolidado en util compartida (`functions/src/utils/request-normalizers.ts`) y reusado en `createWorkOrder` + `onProformaSubmitted`.
- `validation_commands`:
  - `cd apps/admin-dashboard && npx tsc --noEmit`
  - `cd functions && npx tsc --noEmit`
- `status`: `approved`

## CT-1007

- `id`: CT-1007
- `scope`: cerrar drift de contrato `services` vs `services.grouped` entre requests, PDF preview y trigger de outbox.
- `files`: `apps/admin-dashboard/src/features/configurator/**`, `apps/admin-dashboard/src/features/requests/**`, `functions/src/utils/proformaPreviewPdf.ts`, `functions/src/triggers/onMailOutboxCreated.ts`
- `risk`: high (impacto cross-flow).
- `depends_on`: [CT-1001, CT-1002, CT-1003, CT-1004]
- `acceptance`:
  - [x] Contrato unico consumido por configurador, resumen, PDF y outbox.
  - [x] Sin divergencia entre previews y mail payload.
  - [x] Slice inicial: `requests-listing` preserva campos tecnicos de `services.grouped` y `onMailOutboxCreated` consume `services.items/grouped` del contrato canonico.
  - [x] Slice app: adaptador compartido `toProformaPreviewServiceLine` reutilizado en `configurator-form` y `requests-listing` para generar payload de preview sin duplicacion de mapping.
  - [x] Slice backend: util compartida `mapRequestServicesToPreview` centraliza parseo/mapeo `services/items/grouped` y se reutiliza en `onMailOutboxCreated`.
  - [x] Slice labels matriz: utilidades compartidas de labels/mapeo de matriz en app y functions, removiendo duplicacion en `configurator-form`, `requests-listing`, `work-orders-listing`, `onProformaSubmitted` y `onMailOutboxCreated`.
- `validation_commands`:
  - `cd apps/admin-dashboard && npx tsc --noEmit`
  - `cd functions && npx tsc --noEmit`
  - `cd functions && npm run test:contracts`
- `status`: `approved`
