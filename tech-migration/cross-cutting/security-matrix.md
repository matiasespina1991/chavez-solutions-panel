# Matriz de permisos - Core operativo

Fecha: 2026-04-20
Alcance: `configurator`, `requests-list`, `work-orders`, `services-catalog`, `functions`.

## Roles objetivo

- `admin`: control total operativo/técnico.
- `ops_manager`: ejecución operativa (solicitudes + OT) sin administración técnica.
- `lab_operator`: ejecución de OT y laboratorio.
- `catalog_manager`: mantenimiento técnico del catálogo de servicios.
- `viewer`: solo lectura.

## Acciones críticas y permisos

| Acción | admin | ops_manager | lab_operator | catalog_manager | viewer |
|---|---|---|---|---|---|
| Crear/editar borrador de proforma | ✅ | ✅ | ❌ | ❌ | ❌ |
| Aprobar proforma y emitir OT | ✅ | ✅ | ❌ | ❌ | ❌ |
| Rechazar proforma | ✅ | ✅ | ❌ | ❌ | ❌ |
| Pausar/reanudar OT | ✅ | ✅ | ✅ | ❌ | ❌ |
| Finalizar OT | ✅ | ✅ | ✅ | ❌ | ❌ |
| Guardar análisis de laboratorio | ✅ | ✅ | ✅ | ❌ | ❌ |
| Crear servicio técnico | ✅ | ❌ | ❌ | ✅ | ❌ |
| Editar servicios técnicos | ✅ | ❌ | ❌ | ✅ | ❌ |
| Eliminar servicio técnico | ✅ | ❌ | ❌ | ✅ | ❌ |
| Restaurar/eliminar historial técnico | ✅ | ❌ | ❌ | ✅ | ❌ |
| Eliminar proforma/solicitud | ✅ | ✅ | ❌ | ❌ | ❌ |
| Lectura de panel operativo | ✅ | ✅ | ✅ | ✅ | ✅ |

## Claims esperados (Firebase Auth custom claims)

- `role`: `admin | ops_manager | lab_operator | catalog_manager | viewer`
- `permissions` (opcional, override granular): array de scopes string.

Scopes sugeridos:

- `requests.write`
- `requests.approve`
- `requests.reject`
- `requests.delete`
- `work_orders.execute`
- `work_orders.pause_resume`
- `work_orders.complete`
- `lab.save`
- `services_catalog.write`
- `services_catalog.delete`

## Casos borde identificados

- Usuario autenticado sin claim `role`: denegar acciones críticas; permitir solo lectura.
- Usuarios con múltiples responsabilidades: resolver por `permissions` explícitos (si existe), si no por `role`.
- Solicitud ya convertida a OT: bloquear edición de proforma en UI y callable.
- Reintentos de callables idempotentes: mantener validaciones de estado para evitar doble emisión/acción.
- Desfase temporal de claims (token stale): exigir refresh de token en UI cuando backend devuelva `permission-denied`.

## Plan de implementación (siguiente slice: SEC-2003)

1. Crear helper backend `requireRole/requirePermission` en `functions/src/guards`.
2. Aplicar en callables críticos:
   - `approveProforma`, `rejectProforma`, `createWorkOrder`, `deleteProforma`
   - `pauseWorkOrder`, `resumeWorkOrder`, `completeWorkOrder`, `saveWorkOrderLabAnalysis`
   - `createTechnicalService`, `saveServicesTechnicalChanges`, `deleteTechnicalService`
3. Estandarizar error:
   - `permission-denied` + mensaje canónico por acción.
4. Reflejar restricciones en UI (habilitado/disabled + tooltip).

