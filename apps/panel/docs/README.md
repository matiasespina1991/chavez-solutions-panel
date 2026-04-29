# Documentación de Flujos Operativos

Esta carpeta describe cómo funciona el flujo operativo actual del módulo de **Proformas / Solicitudes / Órdenes de Trabajo** del dashboard.

## Objetivo

Alinear producto, operaciones y desarrollo sobre:

- Qué hace cada sección.
- Qué estados existen.
- Qué acciones cambian el estado de una solicitud u orden.
- Qué partes dependen de Cloud Functions.

## Estructura

### Guía operativa (no técnica)

- [Operativo: índice](./operativo/README.md)
- [Operativo: flujo general](./operativo/01-flujo-general.md)
- [Operativo: qué hacer por pantalla](./operativo/02-por-pantalla.md)
- [Operativo: reglas y casos comunes](./operativo/03-reglas-y-casos.md)

### Documentación funcional/técnica

- [01. Visión general del flujo](./flow/01-overview.md)
- [02. Configurador (creación/edición)](./flow/02-configurador.md)
- [03. Lista de solicitudes](./flow/03-lista-solicitudes.md)
- [04. Lista de órdenes de trabajo](./flow/04-lista-ordenes-trabajo.md)
- [05. Estados y transiciones](./flow/05-estados-y-transiciones.md)
- [06. Plan de adaptación al flujo LABCHAVEZ](./flow/06-plan-adaptacion-flujo-labchavez.md)

## Alcance

La documentación está basada en el comportamiento implementado en:

- `src/features/configurator/components/configurator-form.tsx`
- `src/features/configurator/services/configurations.ts`
- `src/features/requests/components/requests-listing.tsx`
- `src/features/work-orders/components/work-orders-listing.tsx`
- rutas bajo `src/app/dashboard/*`

> Nota: donde se mencionan acciones como emitir/pausar/reanudar/finalizar, el cambio real se ejecuta a través de Cloud Functions.
