# 01. Visión general del flujo

## Secciones del módulo

1. **Configurador de proformas y OT** (`/dashboard/configurator`)
2. **Lista de solicitudes** (`/dashboard/service-requests`)
3. **Lista de órdenes de trabajo** (`/dashboard/work-orders`)

## Flujo end-to-end

```mermaid
flowchart LR
  A[Configurador] -->|Guardar borrador| B[(service_requests: draft)]
  A -->|Ejecutar proforma| C[(service_requests: submitted)]
  A -->|Ejecutar proforma + OT| D[(work_orders: issued)]
  D --> E[(service_requests: converted_to_work_order)]
  C -->|Emitir OT desde Lista de solicitudes| D
  E -->|Pausar OT| F[(service_requests: work_order_paused)]
  F -->|Reanudar OT| E
  D -->|Finalizar OT| G[(work_orders: completed)]
  G --> H[(service_requests: work_order_completed)]
```

## Ideas clave

- El **origen funcional** del flujo es siempre una solicitud en `service_requests`.
- La OT se emite vía Cloud Function (`createWorkOrder`) y queda vinculada por `sourceRequestId`/`linkedWorkOrderId`.
- La lista de solicitudes es la consola de operación para:
  - visualizar,
  - editar casos permitidos,
  - emitir OT,
  - pausar/reanudar OT,
  - eliminar solicitud.
- La lista de órdenes de trabajo centraliza el seguimiento de OT emitidas y permite **finalizar**.

## Dependencias backend (Cloud Functions)

- `createWorkOrder`
- `pauseWorkOrder`
- `resumeWorkOrder`
- `completeWorkOrder`
- `deleteServiceRequest`

Estas funciones son llamadas desde frontend y son responsables de la lógica transaccional de estado entre solicitud y OT.