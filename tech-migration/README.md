# Tech Migration - Core Operativo

Este directorio es la fuente de verdad para la migracion tecnica del nucleo operativo:

- `configurator`
- `requests-list`
- `work-orders`
- `services-catalog`
- `functions` relacionadas

## Reglas de trabajo

1. Cada cambio debe entrar como micro-slice (un objetivo tecnico por task).
2. No mezclar refactor de arquitectura con cambios funcionales no relacionados.
3. Cada task debe declarar dependencias explicitamente.
4. Cada task debe incluir validacion minima ejecutable.
5. No marcar `approved` sin evidencia de validacion tecnica minima.

## Estados estandar

- `todo`: no iniciado.
- `in_progress`: en ejecucion.
- `blocked`: bloqueado por dependencia o riesgo externo.
- `review`: implementado, pendiente validacion final.
- `approved`: implementado + validado minimamente.

## Criterio de `approved`

Un task pasa a `approved` solo si:

1. Se implemento el cambio del scope definido.
2. Se completo su checklist de acceptance.
3. Se ejecutaron los `validation_commands` del task sin errores del scope.
4. No hay regresion visible en el flujo operativo tocado.

## Convenciones de task

Campos obligatorios por task:

- `id`
- `scope`
- `files`
- `risk`
- `depends_on`
- `acceptance`
- `validation_commands`
- `status`

Plantilla: [task.md](/Users/matiasespina/Documents/Projekte/chavez-solutions/tech-migration/templates/task.md)

