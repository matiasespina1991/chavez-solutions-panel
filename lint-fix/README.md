# Lint Fix Program - XO

Este directorio es la fuente de verdad para bajar deuda de lint detectada por `xo` en:

- `apps/admin-dashboard/src`
- `functions/src`

## Objetivo

Reducir el baseline de `xo` en fases controladas, sin romper runtime ni flujo productivo.

## Baseline inicial (2026-04-23)

- `files`: 326
- `errors`: 39,380
- `warnings`: 115
- `fixable_errors`: 37,471

## Estado post Fase 2 (2026-04-24)

- `files`: 326
- `errors`: 116
- `warnings`: 5
- `fixable_errors`: 2

## Estado parcial post Fase 3 (2026-04-24)

- `files`: 326
- `errors`: 39
- `warnings`: 1
- `fixable_errors`: 3

Fuente:

- [xo-baseline-summary.txt](/Users/matiasespina/Documents/Projekte/chavez-solutions/lint-fix/reports/xo-baseline-summary.txt)
- [xo-baseline.txt](/Users/matiasespina/Documents/Projekte/chavez-solutions/lint-fix/reports/xo-baseline.txt)
- [xo-baseline.json](/Users/matiasespina/Documents/Projekte/chavez-solutions/lint-fix/reports/xo-baseline.json)

## Reglas de trabajo

1. No mezclar fixes de lint con cambios funcionales de negocio.
2. Trabajar por lotes pequenos y verificables.
3. Ejecutar validaciones tecnicas en cada task antes de marcar `approved`.
4. Priorizar autofix y reglas de bajo riesgo primero.
5. Cualquier regla de alto impacto (`naming-convention`, `unicorn/*`, `no-restricted-types`) va con plan explicito por dominio.

## Estados

- `todo`: no iniciado.
- `in_progress`: en ejecucion.
- `blocked`: bloqueado por dependencia o decision tecnica.
- `review`: implementado, pendiente validacion final.
- `approved`: implementado + validado.

## Criterio de approved

Un task pasa a `approved` si:

1. Cumple el scope del task.
2. Ejecuta sus `validation_commands` sin errores del scope.
3. No introduce regresion funcional.

Plantilla de task:

- [task.md](/Users/matiasespina/Documents/Projekte/chavez-solutions/lint-fix/templates/task.md)
