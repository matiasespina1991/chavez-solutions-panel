# Tracker Maestro - Lint Fix XO

## Fase 0 - Baseline y alcance

| Task | Estado | Dependencias | Archivo |
|---|---|---|---|
| LINT-0001 | approved | - | `cross-cutting/phase-0-baseline-and-scope.md` |
| LINT-0002 | todo | LINT-0001 | `cross-cutting/phase-0-baseline-and-scope.md` |

## Fase 1 - Alineacion de tooling XO

| Task | Estado | Dependencias | Archivo |
|---|---|---|---|
| LINT-1001 | approved | LINT-0002 | `cross-cutting/phase-1-xo-tooling-alignment.md` |
| LINT-1002 | approved | LINT-1001 | `cross-cutting/phase-1-xo-tooling-alignment.md` |
| LINT-1003 | approved | LINT-1001 | `cross-cutting/phase-1-xo-tooling-alignment.md` |

## Fase 2 - Reduccion masiva (autofix + lotes seguros)

| Task | Estado | Dependencias | Archivo |
|---|---|---|---|
| LINT-2001 | approved | LINT-1002 | `app/phase-2-admin-dashboard-autofix.md` |
| LINT-2002 | approved | LINT-2001 | `app/phase-2-admin-dashboard-autofix.md` |
| LINT-2101 | approved | LINT-1002 | `functions/phase-2-functions-autofix.md` |
| LINT-2102 | approved | LINT-2101 | `functions/phase-2-functions-autofix.md` |

## Fase 3 - Reglas de alto impacto (manual)

| Task | Estado | Dependencias | Archivo |
|---|---|---|---|
| LINT-3001 | approved | LINT-2002, LINT-2102 | `cross-cutting/phase-3-manual-rules-and-hardening.md` |
| LINT-3002 | approved | LINT-3001 | `cross-cutting/phase-3-manual-rules-and-hardening.md` |
| LINT-3003 | approved | LINT-3001 | `cross-cutting/phase-3-manual-rules-and-hardening.md` |

## Fase 4 - Enforcements y CI

| Task | Estado | Dependencias | Archivo |
|---|---|---|---|
| LINT-4001 | todo | LINT-3002 | `cross-cutting/phase-4-enforcement-and-ci.md` |
| LINT-4002 | todo | LINT-4001 | `cross-cutting/phase-4-enforcement-and-ci.md` |
| LINT-4003 | todo | LINT-4002 | `cross-cutting/phase-4-enforcement-and-ci.md` |
