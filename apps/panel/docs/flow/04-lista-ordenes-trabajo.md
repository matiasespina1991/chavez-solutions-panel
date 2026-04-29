# 04. Lista de órdenes de trabajo

## Ruta y propósito

- Ruta: `/dashboard/work-orders`
- Componente: `src/features/work-orders/components/work-orders-listing.tsx`
- Fuente de datos: colección `work_orders` (ordenada por `updatedAt desc`).

Esta sección concentra OT emitidas y su cierre operativo.

## Datos que muestra

Cada fila contiene:

- Referencia (N° OT + referencia origen)
- Estado
- Cliente
- Matriz
- Muestras
- Análisis
- Total
- Última Actualización
- Notas
- Menú de acciones

Incluye búsqueda full-text, ordenamiento por columna y modal de detalle.

## Estados de OT en UI

- `🟢 OT iniciada` (`issued`)
- `🟡 OT pausada` (`paused`)
- `✅ Finalizada` (`completed`)
- `(Cancelada)` (`cancelled`)
- `(Estado desconocido)` (`unknown`)

## Acciones

### Ver orden de trabajo

- Abre modal con resumen:
  - datos generales,
  - cliente,
  - muestras,
  - análisis,
  - notas.

### Registrar análisis laboratorio

- Desde el menú de acciones de cada OT, abre:
  - `/dashboard/lab-analysis?workOrderId=<id>`
- Permite cargar resultados de análisis post-OT (MVP).
- Guarda en `work_orders.analyses.items` y marca metadatos en `work_orders.labAnalysis`.

### Finalizar orden de trabajo

- Disponible si la OT no está `completed` ni `cancelled`.
- Confirma con diálogo y ejecuta:
  - `completeWorkOrder(workOrderId, sourceRequestId)`

Según contrato funcional, esta acción también actualiza la solicitud origen a estado de finalización.

## Qué no hace esta pantalla

- No crea OT nuevas.
- No pausa/reanuda OT (esa operación está en la lista de solicitudes).
- Descarga e impresión están en placeholder (`toast.info`).
