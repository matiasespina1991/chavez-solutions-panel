# Baseline tecnico - Core Operativo

- Fecha: 2026-04-17
- Scope baseline: `configurator`, `requests-list`, `work-orders`, `services-catalog`, `functions` operativas.

## Estado de tipado/build

Comandos ejecutados:

- `cd apps/admin-dashboard && npx tsc --noEmit`
- `cd functions && npx tsc --noEmit`

Resultado:

- `apps/admin-dashboard`: **OK** (sin errores de tipos).
- `functions`: **OK** (sin errores de tipos).

## Hallazgos estructurales principales

1. Drift de configuracion de hosting/apphosting hacia `apps/web` (corregido en Fase 0).
2. Artefactos legacy en `functions/lib/*.d.ts` no presentes en `functions/src` (corregido en Fase 0).
3. No existe aun capa canonica compartida de colecciones/tipos entre app y functions.
4. Componentes de alto acoplamiento:
   - `configurator-form.tsx`
   - `requests-listing.tsx`
   - `work-orders-listing.tsx`
   - `services-catalog-panel.tsx`
5. Reglas Firestore con expresiones ambiguas pendientes de endurecimiento en Fase 2.

## Evidencia de cierre Fase 0

1. Se corrigio glob invalido en `.gitignore` de admin (`*.pem\` -> `*.pem`).
2. `firebase.json` y `apphosting*.yaml*` quedaron alineados a `apps/admin-dashboard`.
3. Se eliminaron `.d.ts` legacy en `functions/lib` asociados a nombres `ServiceRequest*` y triggers alias obsoletos.

## Avance inicial fases siguientes

- CT-1001/CT-1002: constantes canonicas de Firestore creadas y aplicadas en slices operativos principales.
- SEC-2001: regla ambigua de `assets` endurecida (`allow write: if false` para frontend).

## Deuda tecnica priorizada

- P0: contratos y nomenclatura canonica (Fase 1).
- P0: seguridad y control por rol (Fase 2).
- P1: desacople de componentes grandes (Fase 3).
- P1: documentacion viva y limpieza final (Fase 4).
