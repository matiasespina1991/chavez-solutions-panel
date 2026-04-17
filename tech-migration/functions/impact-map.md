# Functions - Impact Map (Core Operativo)

Este mapa sirve para ejecutar micro-slices que toquen backend sin perder trazabilidad.

## Dominios callable actuales

- Proforma/Request lifecycle:
  - `approveProforma`
  - `rejectProforma`
  - `deleteProforma`
- Work order lifecycle:
  - `createWorkOrder`
  - `pauseWorkOrder`
  - `resumeWorkOrder`
  - `completeWorkOrder`
  - `saveWorkOrderLabAnalysis`
- Catalogo tecnico:
  - `createTechnicalService`
  - `saveServicesTechnicalChanges`
  - `deleteTechnicalService`
  - `listServiceHistory`
  - `restoreServiceHistory`
  - `deleteServiceHistory`
- Proforma PDF/email:
  - `generateProformaPreviewPdf`
  - `sendProformaPreviewEmail`
- Media utilidades:
  - `generateDownloadUrl`
  - `regenerateDownloadUrl`
  - `validateDelete`

## Triggers actuales

- `onProformaSubmitted`
- `onMailOutboxCreated`
- `onImageUpload`
- `onVideoUpload`

## Dependencias cross-slice claves

1. Contrato `requests.services` y `serviceGroups` debe ser estable para:
   - PDF preview (`utils/proformaPreviewPdf.ts`)
   - outbox trigger (`triggers/onMailOutboxCreated.ts`)
   - UI resumen (`requests-listing`).
2. Cambios de autorizacion de callables dependen de matriz de permisos (`SEC-2002`).
3. Nomenclatura legacy `serviceRequest*` debe migrarse sin romper nombres de callable desplegados.

## Politica de ejecucion de cambios backend

1. Un task por callable/trigger cuando sea posible.
2. Evitar mezclar contrato + seguridad + refactor en el mismo commit.
3. Validacion minima por slice:
   - `cd functions && npx tsc --noEmit`
   - prueba manual del callable afectado desde app o emulador.

