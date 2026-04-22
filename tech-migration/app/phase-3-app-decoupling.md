# Fase 3 - Desacople app (sin cambio funcional)

## APP-3001

- `id`: APP-3001
- `scope`: particionar `configurator-form.tsx` (estado/orquestacion, dialogos, cards, barra acciones, costos flotantes).
- `files`: `apps/admin-dashboard/src/features/configurator/components/**`
- `risk`: high (archivo muy grande y flujo critico).
- `depends_on`: [CT-1003, CT-1006]
- `acceptance`:
  - [ ] Componente principal reducido de tamano y responsabilidad.
  - [ ] Sin cambio de comportamiento observable.
- `validation_commands`:
  - `cd apps/admin-dashboard && npx tsc --noEmit`
  - `cd apps/admin-dashboard && npm run build`
- `status`: `todo`

## APP-3002

- `id`: APP-3002
- `scope`: extraer filtro/autocomplete/seleccion de servicios a hooks reutilizables.
- `files`: `apps/admin-dashboard/src/features/configurator/hooks/**`
- `risk`: medium
- `depends_on`: [APP-3001]
- `acceptance`:
  - [ ] Logica de seleccion fuera de componentes UI.
  - [ ] Tests/validacion manual de seleccion intacta.
- `validation_commands`:
  - `cd apps/admin-dashboard && npx tsc --noEmit`
- `status`: `todo`

## APP-3003

- `id`: APP-3003
- `scope`: particionar `requests-listing.tsx` (tabla, resumen modal, acciones estado, adapters).
- `files`: `apps/admin-dashboard/src/features/requests/components/**`, `apps/admin-dashboard/src/features/requests/lib/**`
- `risk`: high
- `depends_on`: [CT-1003]
- `acceptance`:
  - [ ] Componentes desacoplados por responsabilidad.
- `notes`:
  - Micro-slice 1: helpers puros de estado/fechas/banners extraidos a `features/requests/lib/request-status.ts`.
  - Micro-slice 2: mapeo de errores amigables extraido a `features/requests/lib/request-errors.ts`.
  - Micro-slice 3: armado de payload preview PDF extraido a `features/requests/lib/request-preview.ts`.
  - Micro-slice 4: acciones del header del dialogo de resumen extraidas a `features/requests/components/request-summary-actions.tsx`.
  - Micro-slice 5: banner/CTA del resumen de solicitud extraido a `features/requests/components/request-summary-banner.tsx`.
  - Micro-slice 6: dialogo de "Aprobar y ejecutar OT" extraido a `features/requests/components/request-execute-work-order-dialog.tsx`.
  - Micro-slice 7: dialogo de pausar/reanudar OT extraido a `features/requests/components/request-work-order-toggle-dialog.tsx`.
  - Micro-slice 8: dialogo de rechazo de proforma extraido a `features/requests/components/request-reject-dialog.tsx`.
  - Micro-slice 9: dialogo de eliminacion de solicitud extraido a `features/requests/components/request-delete-dialog.tsx`.
  - Micro-slice 10: tabla/listado de solicitudes (headers, filas y menu de acciones) extraido a `features/requests/components/request-list-table.tsx`.
  - Micro-slice 11: adaptador de normalizacion Firestore `doc -> RequestRow` extraido a `features/requests/lib/request-row-adapter.ts`.
  - Micro-slice 12: dialogo de resumen de solicitud (header, acciones, banner y panel de proforma) extraido a `features/requests/components/request-summary-dialog.tsx`.
  - Micro-slice 13: view-model de ordenamiento/filtro/visibilidad extraido a `features/requests/hooks/use-requests-list-view-model.ts`.
  - Micro-slice 14: realtime/sincronizacion de solicitudes (suscripcion Firestore + resincronizacion de fila seleccionada) extraido a `features/requests/hooks/use-requests-realtime.ts`.
  - Micro-slice 15: estado y handlers de acciones (aprobar/rechazar/eliminar/emitir-pausar-reanudar/descargar) extraidos a `features/requests/hooks/use-request-actions.ts`.
  - Micro-slice 16: `use-request-actions` desacoplado en hooks por responsabilidad: `use-work-order-actions.tsx`, `use-request-moderation-actions.ts` y `use-request-download-action.ts`.
  - Micro-slice 17: view-model del resumen de solicitud (flags de permisos/estado, `handleDialogEdit`, `approverLabel`, `nowLabel`) extraido a `features/requests/hooks/use-request-summary-view-model.ts`.
  - Micro-slice 18: estados de carga/empty desacoplados de `requests-listing.tsx` en `features/requests/components/requests-listing-state.tsx`.
  - Micro-slice 19: barra de busqueda desacoplada de `requests-listing.tsx` en `features/requests/components/requests-listing-search.tsx`.
  - Micro-slice 20: callbacks de acciones de tabla (abrir resumen/editar/emitir OT/rechazar/pausar-eliminar) desacoplados de `requests-listing.tsx` en `features/requests/hooks/use-request-list-table-actions.ts`.
  - Micro-slice 21: composicion de dialogs de solicitudes (resumen, ejecutar OT, pausar/reanudar, rechazar, eliminar) desacoplada de `requests-listing.tsx` en `features/requests/components/requests-listing-dialogs.tsx`.
  - Micro-slice 22: action-bar de header de dialogos universalizada en `components/ui/dialog-header-actions.tsx` y reutilizada en resumen de solicitudes + resumen de ordenes de trabajo.
- `validation_commands`:
  - `cd apps/admin-dashboard && npx tsc --noEmit`
  - `cd apps/admin-dashboard && npm run build`
- `status`: `in_progress`

## APP-3004

- `id`: APP-3004
- `scope`: particionar `work-orders-listing.tsx` (tabla, acciones OT, impresion/descarga, adapters).
- `files`: `apps/admin-dashboard/src/features/work-orders/components/**`
- `risk`: high
- `depends_on`: [CT-1003]
- `acceptance`:
  - [ ] Work orders desacoplado sin regresion.
- `notes`:
  - Micro-slice 1: action-bar de header de dialogo de resumen migrada a componente compartido `components/ui/dialog-header-actions.tsx`.
  - Micro-slice 2: estados de carga/empty desacoplados de `work-orders-listing.tsx` en `features/work-orders/components/work-orders-listing-state.tsx`.
  - Micro-slice 3: barra de busqueda desacoplada de `work-orders-listing.tsx` en `features/work-orders/components/work-orders-listing-search.tsx`.
  - Micro-slice 4: dialogo de resumen de OT (header, banner, notas y detalle de servicios) desacoplado de `work-orders-listing.tsx` en `features/work-orders/components/work-order-summary-dialog.tsx`.
  - Micro-slice 5: dialogo de confirmacion de finalizacion de OT desacoplado de `work-orders-listing.tsx` en `features/work-orders/components/work-order-complete-dialog.tsx`.
- `validation_commands`:
  - `cd apps/admin-dashboard && npx tsc --noEmit`
- `status`: `in_progress`

## APP-3005

- `id`: APP-3005
- `scope`: particionar `services-catalog-panel.tsx` (tabla editable, dialogos create/edit, autocomplete engine, acciones fila).
- `files`: `apps/admin-dashboard/src/features/services-catalog/components/**`
- `risk`: high
- `depends_on`: [CT-1003, CT-1006]
- `acceptance`:
  - [ ] Panel catalogo dividido en modulos mantenibles.
- `validation_commands`:
  - `cd apps/admin-dashboard && npx tsc --noEmit`
- `status`: `todo`

## APP-3006

- `id`: APP-3006
- `scope`: crear capa `services` por dominio (requests/work-orders/services-catalog) para desacoplar `configurations.ts`.
- `files`: `apps/admin-dashboard/src/features/**/services/**`
- `risk`: medium
- `depends_on`: [APP-3001, APP-3003, APP-3004, APP-3005]
- `acceptance`:
  - [ ] Capa de servicios por dominio introducida.
  - [ ] `configurations.ts` deja de ser punto de acoplamiento global.
- `validation_commands`:
  - `cd apps/admin-dashboard && npx tsc --noEmit`
- `status`: `todo`
