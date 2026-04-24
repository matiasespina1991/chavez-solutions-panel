# Fase 3 - Desacople app (sin cambio funcional)

## APP-3001

- `id`: APP-3001
- `scope`: particionar `configurator-form.tsx` (estado/orquestacion, dialogos, cards, barra acciones, costos flotantes).
- `files`: `apps/admin-dashboard/src/features/configurator/components/**`
- `risk`: high (archivo muy grande y flujo critico).
- `depends_on`: [CT-1003, CT-1006]
- `acceptance`:
  - [x] Componente principal reducido de tamano y responsabilidad.
  - [x] Sin cambio de comportamiento observable.
- `notes`:
  - Micro-slice 1: contrato del formulario (schema zod, tipos, constantes de tabs/filtros y `createDefaultFormValues`) extraido de `configurator-form.tsx` a `features/configurator/lib/configurator-form-model.ts`.
  - Micro-slice 2: dialogs auxiliares (selector de matriz, eliminar combo/servicio, enviar email, limpiar datos) desacoplados de `configurator-form.tsx` en `features/configurator/components/configurator-common-dialogs.tsx`.
  - Micro-slice 3: dialogo principal de seleccion de servicios (`Combo de servicios`) desacoplado de `configurator-form.tsx` en `features/configurator/components/configurator-services-dialog.tsx`.
  - Micro-slice 4: tabs del configurador desacoplados por responsabilidad en `features/configurator/components/configurator-type-tab.tsx`, `configurator-client-tab.tsx`, `configurator-services-tab.tsx` y `configurator-summary-tab.tsx`.
- `validation_commands`:
  - `cd apps/admin-dashboard && npx tsc --noEmit`
  - `cd apps/admin-dashboard && npm run build`
- `status`: `approved`

## APP-3002

- `id`: APP-3002
- `scope`: extraer filtro/autocomplete/seleccion de servicios a hooks reutilizables.
- `files`: `apps/admin-dashboard/src/features/configurator/hooks/**`
- `risk`: medium
- `depends_on`: [APP-3001]
- `acceptance`:
  - [x] Logica de seleccion fuera de componentes UI.
  - [x] Tests/validacion manual de seleccion intacta.
- `notes`:
  - Micro-slice 1: filtro/busqueda/opciones y contadores del dialogo de servicios extraidos a `features/configurator/hooks/use-configurator-service-dialog.ts` (reduce logica UI embebida en `configurator-form.tsx`).
  - Micro-slice 2: estado + handlers de seleccion de servicios (combos, filtros activos, seleccion masiva, edicion, eliminacion y actualizacion de items) extraidos a `features/configurator/hooks/use-configurator-service-selection-state.ts`.
- `validation_commands`:
  - `cd apps/admin-dashboard && npx tsc --noEmit`
- `status`: `approved`

## APP-3003

- `id`: APP-3003
- `scope`: particionar `requests-listing.tsx` (tabla, resumen modal, acciones estado, adapters).
- `files`: `apps/admin-dashboard/src/features/requests/components/**`, `apps/admin-dashboard/src/features/requests/lib/**`
- `risk`: high
- `depends_on`: [CT-1003]
- `acceptance`:
  - [x] Componentes desacoplados por responsabilidad.
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
- `status`: `approved`

## APP-3004

- `id`: APP-3004
- `scope`: particionar `work-orders-listing.tsx` (tabla, acciones OT, impresion/descarga, adapters).
- `files`: `apps/admin-dashboard/src/features/work-orders/components/**`
- `risk`: high
- `depends_on`: [CT-1003]
- `acceptance`:
  - [x] Work orders desacoplado sin regresion.
- `notes`:
  - Micro-slice 1: action-bar de header de dialogo de resumen migrada a componente compartido `components/ui/dialog-header-actions.tsx`.
  - Micro-slice 2: estados de carga/empty desacoplados de `work-orders-listing.tsx` en `features/work-orders/components/work-orders-listing-state.tsx`.
  - Micro-slice 3: barra de busqueda desacoplada de `work-orders-listing.tsx` en `features/work-orders/components/work-orders-listing-search.tsx`.
  - Micro-slice 4: dialogo de resumen de OT (header, banner, notas y detalle de servicios) desacoplado de `work-orders-listing.tsx` en `features/work-orders/components/work-order-summary-dialog.tsx`.
  - Micro-slice 5: dialogo de confirmacion de finalizacion de OT desacoplado de `work-orders-listing.tsx` en `features/work-orders/components/work-order-complete-dialog.tsx`.
  - Micro-slice 6: tabla/listado de OT (thead, filas, acciones y empty-state de busqueda) desacoplada de `work-orders-listing.tsx` en `features/work-orders/components/work-orders-list-table.tsx`.
  - Micro-slice 7: view-model de ordenamiento/filtro/visibilidad extraido a `features/work-orders/hooks/use-work-orders-list-view-model.ts`.
  - Micro-slice 8: realtime/sincronizacion Firestore (requests + work_orders) extraido a `features/work-orders/hooks/use-work-orders-realtime.ts`.
  - Micro-slice 9: handlers de acciones OT (finalizar, descargar, imprimir) extraidos a `features/work-orders/hooks/use-work-order-actions.ts`.
  - Micro-slice 10: adaptador de normalizacion Firestore `doc -> WorkOrderRow` + fallback de servicios extraido a `features/work-orders/lib/work-order-row-adapter.ts`.
  - Micro-slice 11: utilidades de estado OT y tokens de busqueda extraidas a `features/work-orders/lib/work-order-status.ts`.
  - Micro-slice 12: utilidades de preview/impresion/descarga OT extraidas a `features/work-orders/lib/work-order-preview.ts`.
  - Micro-slice 13: `work-orders-listing.tsx` reducido a composicion/orquestacion de hooks + componentes.
- `validation_commands`:
  - `cd apps/admin-dashboard && npx tsc --noEmit`
- `status`: `approved`

## APP-3005

- `id`: APP-3005
- `scope`: particionar `services-catalog-panel.tsx` (tabla editable, dialogos create/edit, autocomplete engine, acciones fila).
- `files`: `apps/admin-dashboard/src/features/services-catalog/components/**`
- `risk`: high
- `depends_on`: [CT-1003, CT-1006]
- `acceptance`:
  - [x] Panel catalogo dividido en modulos mantenibles.
- `notes`:
  - Micro-slice 1: tipos/constantes/modelos/normalizadores del panel movidos de `services-catalog-panel.tsx` a `features/services-catalog/lib/services-catalog-panel-model.ts`.
  - Micro-slice 2: dialogs de confirmacion (descartar, eliminar masivo, eliminar individual) desacoplados de `services-catalog-panel.tsx` en `features/services-catalog/components/services-catalog-confirm-dialogs.tsx`.
  - Micro-slice 3: barra de filtros (busqueda, toggle de vista resumida y contador de resultados/cambios) desacoplada de `services-catalog-panel.tsx` en `features/services-catalog/components/services-catalog-filters-bar.tsx`.
  - Micro-slice 4: tabla editable (thead/tbody/skeleton, seleccion masiva, celdas editables con autocomplete, acciones por fila y paginacion) desacoplada de `services-catalog-panel.tsx` en `features/services-catalog/components/services-catalog-table.tsx`.
  - Micro-slice 5: dialogo create/edit de servicio (secciones, campos, validaciones, autocomplete y CTA de guardado) desacoplado de `services-catalog-panel.tsx` en `features/services-catalog/components/services-catalog-create-dialog.tsx`.
  - Micro-slice 6: barra de acciones superior (agregar/editar/deseleccionar, eliminar masivo, guardar cambios) desacoplada de `services-catalog-panel.tsx` en `features/services-catalog/components/services-catalog-toolbar-actions.tsx`.
- `validation_commands`:
  - `cd apps/admin-dashboard && npx tsc --noEmit`
- `status`: `approved`

## APP-3006

- `id`: APP-3006
- `scope`: crear capa `services` por dominio (requests/work-orders/services-catalog/lab-analysis) y mover contratos/modelos de dominio fuera de componentes para desacoplar `configurations.ts`.
- `files`: `apps/admin-dashboard/src/features/**/services/**`, `apps/admin-dashboard/src/features/**/lib/**`, `apps/admin-dashboard/src/features/**/components/**`
- `risk`: medium
- `depends_on`: [APP-3001, APP-3003, APP-3004, APP-3005]
- `acceptance`:
  - [x] Capa de servicios por dominio introducida.
  - [x] `configurations.ts` deja de ser punto de acoplamiento global.
- `notes`:
  - Micro-slice 1: capa de servicios por dominio introducida para `requests` y `work-orders` con entrypoints propios en `features/requests/services/request-actions.ts`, `features/requests/services/request-preview.ts` y `features/work-orders/services/work-order-actions.ts`.
  - Micro-slice 2: hooks/libs de `requests` y `work-orders` migrados a importar servicios de su dominio (ya no dependen directo de `features/configurator/services/configurations.ts`).
  - Micro-slice 3: implementación de callables y contratos movida a dominio (`features/requests/services/request-callables.ts`, `features/requests/services/request-preview-callables.ts`, `features/work-orders/services/work-order-callables.ts`) para eliminar dependencia indirecta con `configurations.ts`.
  - Micro-slice 4: gap detectado en `lab-analysis` (tipos/helpers de dominio aún incrustados en componente). Se extrae a `features/lab-analysis/lib/lab-analysis-model.ts` y se actualizan imports en `lab-analysis-form.tsx` y `services/lab-analysis.ts`.
- `validation_commands`:
  - `cd apps/admin-dashboard && npx tsc --noEmit`
- `status`: `in_progress`
