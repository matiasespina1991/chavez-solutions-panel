# ADR-001 - Modelos canonicos y contratos operativos

- **Estado**: accepted
- **Fecha**: 2026-04-17
- **Owner**: CTO migration track

## Contexto

El nucleo operativo muestra drift entre frontend/backend en:

1. nombres de colecciones (`requests`, `work_orders`, `services`, historicos),
2. naming legacy (`serviceRequest*` vs `request*`),
3. shape de servicios (`services.items` vs `services.grouped`) y consumidores (UI, PDF, triggers).

Esto aumenta riesgo de regresion y acopla features a literals repetidos.

## Decision

1. Definir constantes canonicas de colecciones en app y functions.
2. Definir tipos canonicos por dominio (`Request`, `WorkOrder`, `TechnicalService`).
3. Establecer contrato unico para `services` + `serviceGroups`.
4. Normalizar utilidades transversales (`matrix`, `status`, timestamps).
5. Tratar nombres legacy como deuda tecnica progresiva, no como contrato publico.

## Consecuencias

### Positivas

- Menor drift entre app/functions.
- Refactor por micro-slices con bajo riesgo.
- Validaciones y pruebas mas predecibles.

### Costos

- Cambios en multiples archivos por task.
- Fase de convivencia temporal de naming legacy en componentes grandes.

## Fuera de alcance de este ADR

- Reescritura full de paginas starter no operativas.
- Lint masivo legacy como requisito bloqueante de migracion.

