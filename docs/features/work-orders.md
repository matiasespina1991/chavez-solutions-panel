# Feature: Lista de Órdenes de Trabajo

## Resumen

La vista `/dashboard/work-orders` opera sobre `work_orders` y centraliza seguimiento, registro de laboratorio y cierre de OT.

## Archivos principales

- Página: `apps/admin-dashboard/src/app/dashboard/work-orders/page.tsx`
- Componente: `apps/admin-dashboard/src/features/work-orders/components/work-orders-listing.tsx`

## Fuente de datos

- Colección principal: `work_orders` (ordenada por `updatedAt desc`)
- Colección de apoyo: `requests` para fallback de `services[]` cuando una OT legacy no trae servicios directos

## Columnas actuales de la tabla

- Referencia
- Estado
- Cliente
- Servicios
- Total
- Última Actualización
- Notas
- Acciones

Notas:

- La fecha se muestra en formato natural en español (sin comas redundantes).
- El layout fue ajustado para evitar overflow en viewport chico.

## Acciones por fila

- Ver orden de trabajo (modal de resumen)
- Registro de análisis de laboratorio (`/dashboard/lab-analysis?workOrderId=<id>`)
- Finalizar orden de trabajo (si no está cancelada/finalizada)

## Reglas funcionales relevantes

- `completeWorkOrder` exige análisis de laboratorio registrado.
- Al finalizar OT, también se actualiza la solicitud origen a `work_order_completed`.
- Estados visibles: `issued`, `paused`, `completed`, `cancelled`.

## Modal de detalle

Muestra:

- Datos generales
- Cliente
- Servicios seleccionados
- Detalle de servicios (cantidad)

Acciones de descargar/imprimir están presentes como placeholder en UI.

## Mantenimiento

Si cambia el contrato de datos de `work_orders` o `requests.services`, revisar mapeos defensivos y fallback en:

- `work-orders-listing.tsx` (normalización de filas)
