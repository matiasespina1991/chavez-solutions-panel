# Politica de Acceso - Core Operativo

## Alcance

Esta politica aplica a:

- `requests`
- `work_orders`
- `services`
- `clients`
- `mail_outbox`
- callables operativos en `functions/src/callable/**`
- navegacion operativa del dashboard (`requests-list`, `work-orders`, `lab-analysis`, `services-catalog`, `admin/clients`, `configurator`)

No aplica a modulos legacy/starter fuera de alcance de esta migracion.

## Principios

1. Minimo privilegio: cada accion exige permiso explicito.
2. Defensa en profundidad: UI, rules y callables validan acceso; una capa no reemplaza a otra.
3. Denegacion por defecto: si no hay permiso definido, se rechaza.
4. Trazabilidad: cambios sensibles quedan auditables por logs y/o colecciones de historial.

## Modelo de autorizacion

Las acciones criticas en backend se controlan via `requirePermission`:

- Fuente primaria: custom claims (`role`/`roles`).
- Fallback temporal: `config/default.authorizedUsers` por email (para entornos que aun no migraron claims).
- Respuesta estandar: `permission-denied` cuando el rol no habilita la accion.

## Politica por dominio

### Requests / Proformas

- Aprobar proforma: `requests.approve`
- Rechazar proforma: `requests.reject`
- Eliminar proforma: `requests.delete`

### Work Orders

- Emitir OT: `work_orders.execute`
- Pausar/Reanudar OT: `work_orders.pause_resume`
- Completar OT: `work_orders.complete`

### Lab

- Guardar analisis de laboratorio: `lab.save`

### Catalogo tecnico

- Crear/editar servicio: `services_catalog.write`
- Eliminar servicio: `services_catalog.delete`
- Importar CSV: `services_catalog.import`
- Ver historial: `services_catalog.read_history`

### Clientes

- Crear/editar/eliminar cliente: `clients.write`
- Backfill desde solicitudes: `clients.write`
- Lectura frontend autenticada; escritura directa bloqueada por rules.

## Firestore Rules (lineamientos)

1. Sin wildcards publicos para colecciones operativas.
2. Lectura/escritura autenticada y delimitada por coleccion.
3. `config/default` legible por usuarios autenticados para bootstrap de permisos legacy.
4. Regla final de cierre: deny por defecto.

## Checklist de regresion de permisos

Ejecutar en cada cambio de seguridad/acceso:

1. Auth/Navegacion

- Login valido permite entrar a rutas operativas.
- Usuario sin permisos no ve/usa rutas restringidas.

2. Requests / OT

- Aprobar proforma con rol autorizado funciona.
- Aprobar/rechazar con rol no autorizado devuelve `permission-denied`.
- Emitir/pausar/reanudar/completar OT valida permisos correctamente.

3. Lab

- Guardado de analisis acepta rol habilitado y rechaza rol no habilitado.

4. Services Catalog

- Crear/editar/eliminar/importar/historial respeta permisos por accion.

5. Clientes

- Crear/editar/eliminar/backfill respeta permisos por accion.
- Seleccionar cliente en configurador copia datos al formulario sin mutar el maestro.

6. Rules

- `firebase deploy --only firestore:rules` sin errores.
- Lecturas/escrituras fuera de policy quedan bloqueadas.

## Comandos minimos de validacion tecnica

```bash
cd functions && npx tsc --noEmit
cd apps/panel && npx tsc --noEmit
firebase deploy --only firestore:rules
```
