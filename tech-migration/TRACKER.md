# Tracker Maestro - Core Operativo

## Fase 0 - Baseline e infraestructura bloqueante

| Task | Estado | Dependencias | Archivo |
|---|---|---|---|
| X-0001 | approved | - | `cross-cutting/phase-0-baseline-blockers.md` |
| X-0002 | approved | X-0001 | `cross-cutting/phase-0-baseline-blockers.md` |
| X-0003 | approved | X-0001 | `cross-cutting/phase-0-baseline-blockers.md` |
| X-0004 | approved | X-0001, X-0002, X-0003 | `cross-cutting/phase-0-baseline-blockers.md` |

## Fase 1 - Contratos canonicos y nomenclatura

| Task | Estado | Dependencias | Archivo |
|---|---|---|---|
| CT-1001 | approved | X-0004 | `cross-cutting/phase-1-contracts-and-naming.md` |
| CT-1002 | approved | X-0004 | `cross-cutting/phase-1-contracts-and-naming.md` |
| CT-1003 | approved | CT-1001 | `cross-cutting/phase-1-contracts-and-naming.md` |
| CT-1004 | approved | CT-1002 | `cross-cutting/phase-1-contracts-and-naming.md` |
| CT-1005 | approved | CT-1003, CT-1004 | `cross-cutting/phase-1-contracts-and-naming.md` |
| CT-1006 | approved | CT-1003 | `cross-cutting/phase-1-contracts-and-naming.md` |
| CT-1007 | approved | CT-1001, CT-1002, CT-1003, CT-1004 | `cross-cutting/phase-1-contracts-and-naming.md` |

## Fase 2 - Seguridad y acceso

| Task | Estado | Dependencias | Archivo |
|---|---|---|---|
| SEC-2001 | approved | X-0004 | `cross-cutting/phase-2-security-and-access.md` |
| SEC-2002 | approved | SEC-2001 | `cross-cutting/phase-2-security-and-access.md` |
| SEC-2003 | approved | SEC-2002 | `cross-cutting/phase-2-security-and-access.md` |
| SEC-2004 | approved | SEC-2002 | `cross-cutting/phase-2-security-and-access.md` |
| SEC-2005 | approved | SEC-2001, SEC-2002, SEC-2003, SEC-2004 | `cross-cutting/phase-2-security-and-access.md` |

## Fase 3 - Desacople app (sin cambiar comportamiento)

| Task | Estado | Dependencias | Archivo |
|---|---|---|---|
| APP-3001 | approved | CT-1003, CT-1006 | `app/phase-3-app-decoupling.md` |
| APP-3002 | approved | APP-3001 | `app/phase-3-app-decoupling.md` |
| APP-3003 | approved | CT-1003 | `app/phase-3-app-decoupling.md` |
| APP-3004 | approved | CT-1003 | `app/phase-3-app-decoupling.md` |
| APP-3005 | approved | CT-1003, CT-1006 | `app/phase-3-app-decoupling.md` |
| APP-3006 | approved | APP-3001, APP-3003, APP-3004, APP-3005 | `app/phase-3-app-decoupling.md` |

## Fase 4 - Documentacion viva y limpieza

| Task | Estado | Dependencias | Archivo |
|---|---|---|---|
| DOC-4001 | todo | CT-1005 | `cross-cutting/phase-4-docs-cleanup.md` |
| DOC-4002 | todo | CT-1007, SEC-2005 | `cross-cutting/phase-4-docs-cleanup.md` |
| DOC-4003 | todo | DOC-4001 | `cross-cutting/phase-4-docs-cleanup.md` |
| DOC-4004 | todo | DOC-4002 | `cross-cutting/phase-4-docs-cleanup.md` |

## Nota operativa

Mapa backend de apoyo: [impact-map.md](/Users/matiasespina/Documents/Projekte/chavez-solutions/tech-migration/functions/impact-map.md).
