# 03. Lista de solicitudes

## Ruta y propósito

- Ruta: `/dashboard/service-requests`
- Componente: `src/features/requests/components/requests-listing.tsx`
- Fuente de datos: colección `service_requests` (ordenada por `updatedAt desc`).

Esta sección es el tablero operativo principal de solicitudes: consulta, edición condicionada, emisión de OT, pausa/reanudación y eliminación.

## Datos que muestra

Cada fila contiene (actualmente):

- Referencia
- Estado
- Cliente
- Matriz
- Muestras
- Análisis
- Total
- Última Actualización
- Notas
- Menú de acciones

Además:

- búsqueda full-text sobre casi todos los campos de la fila,
- ordenamiento por columna,
- modal de detalle con resumen completo.

## Estados de solicitud en UI

- `(Borrador)`
- `🟢 Proforma enviada`
- `🟢 OT iniciada`
- `🟡 OT pausada`
- `✅ Finalizada`
- `⚪ Cancelada`
- `⚪ Proforma vencida` (estado derivado en frontend)

### Regla de vencimiento de proforma

Se marca como vencida cuando:

- estado actual = `submitted`, y
- `createdAt + validDays` es menor al momento actual.

## Acciones por solicitud

### Ver solicitud

- Abre un modal con:
  - datos generales,
  - cliente,
  - muestras,
  - análisis,
  - costos,
  - notas,
  - banner de estado.

### Editar solicitud

- Navega a: `/dashboard/configurator?requestId=<id>&tab=services`
- Bloqueado cuando OT ya fue emitida y no está pausada.
- Permitido para borradores y para casos pausados.

### Emitir / Pausar / Reanudar OT

- Si no hay OT emitida: `createWorkOrderFromRequest(id)`.
- Si ya hay OT emitida:
  - `pauseWorkOrderFromRequest(id, notes)`
  - `resumeWorkOrderFromRequest(id, notes)`
- Estas acciones usan diálogo de confirmación y permiten editar notas.

### Eliminar solicitud

- Invoca `deleteServiceRequest(id)`.
- Se confirma con `AlertDialog`.

## Restricciones implementadas

- No se puede emitir OT desde `draft`.
- No se puede emitir/operar OT si ya está `work_order_completed`.
- Descarga e impresión en modal están como placeholder (`toast.info`, aún no implementado).

## Observación importante

El frontend aplica reglas de UX, pero la validación final de consistencia de negocio depende del backend (Cloud Functions + reglas de datos).
