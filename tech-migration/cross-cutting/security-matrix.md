# Matriz de permisos - Core operativo

Fecha: 2026-04-29
Alcance: `configurator`, `requests-list`, `work-orders`, `services-catalog`, `lab-analysis`, `functions`.

## Estado

La validacion por permiso esta implementada en backend mediante `functions/src/guards/require-permission.ts`.

- Fuente primaria: custom claims de Firebase Auth (`role` o `roles`).
- Fallback temporal: `config/default.authorizedUsers[]` por email.
- Error estandar: `permission-denied` cuando el rol no habilita la accion.
- Usuarios autenticados sin rol valido: sin acceso a acciones criticas.

## Roles implementados

- `admin`: control total operativo y tecnico.
- `order-supervisor`: gestion de proformas y ordenes de trabajo.
- `logistics`: pausa/reanudacion de OT.
- `technician`: pausa/reanudacion, finalizacion de OT y laboratorio.
- `analyst`: finalizacion de OT y laboratorio.
- `editor`: mantenimiento tecnico del catalogo de servicios.
- `viewer`: lectura/autenticacion sin permisos de escritura critica.

## Permisos backend

| Permiso | admin | order-supervisor | logistics | technician | analyst | editor | viewer |
|---|---|---|---|---|---|---|---|
| `requests.approve` | si | si | no | no | no | no | no |
| `requests.reject` | si | si | no | no | no | no | no |
| `requests.delete` | si | si | no | no | no | no | no |
| `work_orders.execute` | si | si | no | no | no | no | no |
| `work_orders.pause_resume` | si | si | si | si | no | no | no |
| `work_orders.complete` | si | si | no | si | si | no | no |
| `lab.save` | si | si | no | si | si | no | no |
| `services_catalog.read_history` | si | no | no | no | no | si | no |
| `services_catalog.write` | si | no | no | no | no | si | no |
| `services_catalog.delete` | si | no | no | no | no | si | no |
| `services_catalog.import` | si | no | no | no | no | si | no |

## Acciones criticas y callables

| Accion | Permiso | Callable(s) |
|---|---|---|
| Aprobar proforma | `requests.approve` | `approveProforma` |
| Rechazar proforma | `requests.reject` | `rejectProforma` |
| Eliminar proforma/solicitud | `requests.delete` | `deleteProforma` |
| Emitir OT | `work_orders.execute` | `createWorkOrder` |
| Pausar/reanudar OT | `work_orders.pause_resume` | `pauseWorkOrder`, `resumeWorkOrder` |
| Finalizar OT | `work_orders.complete` | `completeWorkOrder` |
| Guardar analisis de laboratorio | `lab.save` | `saveWorkOrderLabAnalysis` |
| Crear/editar/importar servicios | `services_catalog.write`, `services_catalog.import` | `createTechnicalService`, `saveServicesTechnicalChanges`, `importServicesFromCsv` |
| Eliminar servicios | `services_catalog.delete` | `deleteTechnicalService` |
| Ver/restaurar/eliminar historial tecnico | `services_catalog.read_history`, `services_catalog.delete` | `listServiceHistory`, `restoreServiceHistory`, `deleteServiceHistory` |

## Claims esperados

Custom claims recomendados:

- `role`: uno de los roles implementados.
- `roles`: arreglo opcional; se usa el primer rol valido.

Ejemplo:

```json
{
  "role": "order-supervisor"
}
```

El backend no consume un claim granular `permissions` en el estado actual; la autorizacion efectiva se deriva del rol.

## Casos borde

- Usuario autenticado sin `role`/`roles` valido y sin entrada en `config/default.authorizedUsers`: acciones criticas rechazadas.
- Token con rol stale: la UI debe forzar refresh o re-login cuando backend devuelve `permission-denied`.
- Solicitud ya convertida a OT: se bloquea por validaciones de estado ademas de permisos.
- Reintentos de callables: las validaciones de estado evitan doble emision o transiciones invalidas.

## Validacion minima

```bash
cd functions && npx tsc --noEmit
cd apps/admin-dashboard && npx tsc --noEmit
```
