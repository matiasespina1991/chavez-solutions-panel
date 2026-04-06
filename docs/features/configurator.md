# Feature: Configurador

## Resumen

El configurador (`/dashboard/configurator`) crea y actualiza solicitudes de servicio (`service_requests`) usando un wizard de 4 pasos:

1. Datos
2. Cliente
3. Servicios
4. Resumen

El dominio operativo actual está centrado en **servicios** (no en muestras como unidad de pricing).

## Archivos principales

- Página: `apps/admin-dashboard/src/app/dashboard/configurator/page.tsx`
- Componente: `apps/admin-dashboard/src/features/configurator/components/configurator-form.tsx`
- Servicio de datos: `apps/admin-dashboard/src/features/configurator/services/configurations.ts`

## Datos que captura

- Matriz (`water` / `soil`)
- Referencia y validez
- Datos de cliente
- Notas
- Lista de servicios seleccionados desde colección `services`

Cada servicio seleccionado incluye:

- `quantity`
- `rangeMin`
- `rangeMax`
- `unitPrice`
- `discountAmount` (opcional)

## Cálculo de costos

- Subtotal por línea: `max(0, quantity * unitPrice - discountAmount)`
- Subtotal total: suma de líneas
- IVA: `taxPercent` (default 15)
- Total: subtotal + IVA

## Validación por pasos

El step **Servicios** queda en error si:

- no hay servicios seleccionados,
- falta cantidad/rango mínimo/rango máximo/precio,
- hay valores inválidos (negativos o no numéricos donde aplica).

`discountAmount` es opcional y no bloquea completitud si está vacío.

## Persistencia

- Colección principal: `service_requests`
- Guardado como borrador (`draft`) o final (`submitted`)
- Soporta edición por `requestId` en query params
- Usa cache local por clave `configurator:cache:*`

## Relación con OT

La emisión de orden de trabajo se hace vía callable backend (`createWorkOrder`) desde el flujo de solicitudes, con validaciones de aprobación.

## Estado actual relevante

- Tab 3 rotulada como **Servicios**.
- Diálogo de agregar servicios desde catálogo importado.
- UI y resumen alineados a servicios y desglose de costos por servicio.
- Campos de rangos y precio ingresados por usuario (no pre-rellenados por default).
