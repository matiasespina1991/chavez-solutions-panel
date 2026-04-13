# 02. Configurador (creación y edición)

## Ruta y propósito

- Ruta: `/dashboard/configurator`
- Componente: `src/features/configurator/components/configurator-form.tsx`
- Servicio: `src/features/configurator/services/configurations.ts`

El configurador crea o actualiza solicitudes de servicio (proforma y/o OT) en 4 pasos:

1. Tipo y metadatos
2. Cliente
3. Muestras estimadas
4. Resumen

## Modos de uso

### 1) Nuevo registro

- Sin `requestId` en query params.
- Permite:
  - guardar borrador,
  - ejecutar (emitir proforma o proforma+OT).

### 2) Edición de solicitud existente

- Con `?requestId=<id>` (opcional `&tab=services`).
- Carga datos vía `getConfigurationById`.
- Comportamiento especial por estado cargado:
  - `draft`: permite ejecutar desde edición.
  - `work_order_paused`: permite actualizar y reanudar desde lista.
  - otros finales: no deberían editarse desde el listado (se bloquea allí).

## Persistencia y cache local

- En modo nuevo y edición, guarda borrador local en `localStorage` (clave `configurator:cache:*`).
- Al guardar/ejecutar con éxito, limpia cache local y redirige a `/dashboard/service-requests`.

## Decisiones de guardado

### Guardar borrador

- `onSubmit(values, 'draft')`
- Crea (`createConfiguration`) o actualiza (`updateConfiguration`) solicitud con estado `draft`.
- Bloqueo explícito: no permite guardar borrador si la solicitud está en modo OT pausada.

### Ejecutar definitivo

- `onSubmit(values, 'final')`
- Si el tipo es:
  - `proforma`: deja solicitud en flujo de proforma.
  - `work_order` o `both`: además invoca `createWorkOrderFromRequest(requestId)`.

## Reglas funcionales relevantes

- `type` se persiste como `isWorkOrder` (booleano) para la solicitud.
- Si se actualizan notas de una solicitud con OT vinculada (`linkedWorkOrderId`), también se sincronizan en `work_orders`.
- El total se recalcula en cliente con base en:
  - cantidad de muestras,
  - costos unitarios por análisis,
  - IVA configurado.

## Validación operacional

El botón de ejecutar exige completitud de los 3 bloques de datos (`type`, `client`, `samples`) antes de habilitar acción final.

## Nota de etapa operativa

En esta pantalla no se capturan análisis de laboratorio ni detalle operativo de muestras (códigos/tipo/observaciones).

Esos datos se registran después de la emisión de la OT, en etapas de logística/campo/laboratorio.
