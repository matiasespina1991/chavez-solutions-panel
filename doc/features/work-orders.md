# Feature: Lista de Órdenes de Trabajo

## 1. Introducción

La **Lista de Órdenes de Trabajo** es una vista operativa del dashboard que muestra exclusivamente documentos de la colección `work_orders`.

Su objetivo es centralizar seguimiento y revisión de OTs ya emitidas desde solicitudes de servicio, con búsqueda global, ordenamiento por columnas y vista de detalle.

## 2. Ruta y Entrada

- Ruta: `/dashboard/work-orders`
- Archivo de entrada: `apps/admin-dashboard/src/app/dashboard/work-orders/page.tsx`
- Componente principal: `apps/admin-dashboard/src/features/work-orders/components/work-orders-listing.tsx`

## 3. Fuente de Datos

- Colección Firestore: `work_orders`
- Carga reactiva: `onSnapshot` + `orderBy('updatedAt', 'desc')`

Campos utilizados (según disponibilidad del documento):

- `workOrderNumber`
- `sourceReference`
- `sourceRequestId`
- `matrix`
- `status` (`issued`, `paused`)
- `client`
- `samples`
- `analyses`
- `pricing`
- `notes`
- `updatedAt`

## 4. UX Implementada

- Tabla con columnas equivalentes a la lista de solicitudes:
  - Referencia
  - OT (semáforo)
  - Matriz
  - Cliente
  - Muestras
  - Análisis
  - Estado
  - Notas
  - Total (USD)
  - Última Actualización
- Ordenamiento asc/desc por cada columna visible.
- Input de búsqueda global (filtra sobre todos los datos relevantes de la OT).
- Menú por fila con acción `Ver orden de trabajo`.
- Modal de detalle con:
  - Datos generales
  - Cliente
  - Muestras
  - Análisis
  - Costos estimados
  - Notas (solo si existe contenido)

## 5. Navegación

Se agregó la entrada en el menú lateral:

- Título: `Lista de ordenes de trabajo`
- URL: `/dashboard/work-orders`

Archivos actualizados:

- `apps/admin-dashboard/src/config/nav-config.ts`
- `apps/admin-dashboard/src/hooks/use-nav.ts`

## 6. Notas de Mantenimiento

- Si se agregan nuevos estados de OT en backend, actualizar:
  - `WorkOrderStatus`
  - `statusLabelMap`
  - lógica de color/tooltip del semáforo OT.
- Si cambia el esquema de `work_orders`, revisar los mapeos defensivos en `work-orders-listing.tsx`.
