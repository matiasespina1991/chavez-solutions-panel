# Fase 4 - Documentacion viva y limpieza tecnica

## DOC-4001

- `id`: DOC-4001
- `scope`: actualizar rutas y colecciones legacy en docs (`service-requests` -> `requests-list`, `service_requests` -> `requests`).
- `files`: `apps/admin-dashboard/docs/**`, `docs/**`, `README.md`
- `risk`: low
- `depends_on`: [CT-1005]
- `acceptance`:
  - [x] No quedan referencias legacy en docs activas.
- `validation_commands`:
  - `rg -n "service-requests|service_requests" apps/admin-dashboard/docs docs README.md`
- `status`: `approved`

## DOC-4002

- `id`: DOC-4002
- `scope`: mapa de arquitectura actual (frontend + functions + rules + triggers).
- `files`: `tech-migration/cross-cutting/architecture-map.md`
- `risk`: low
- `depends_on`: [CT-1007, SEC-2005]
- `acceptance`:
  - [ ] Mapa de arquitectura actualizado y trazable.
- `validation_commands`:
  - `n/a (documental)`
- `status`: `todo`

## DOC-4003

- `id`: DOC-4003
- `scope`: marcar obsolescencias explicitamente en docs legacy.
- `files`: `apps/admin-dashboard/docs/**`, `docs/**`
- `risk`: low
- `depends_on`: [DOC-4001]
- `acceptance`:
  - [ ] Documentos legacy con banner de obsolescencia.
- `validation_commands`:
  - `n/a (documental)`
- `status`: `todo`

## DOC-4004

- `id`: DOC-4004
- `scope`: registrar fases siguientes para modulos fuera de alcance (starter pages).
- `files`: `tech-migration/cross-cutting/next-phases-out-of-scope.md`
- `risk`: low
- `depends_on`: [DOC-4002]
- `acceptance`:
  - [ ] Roadmap fuera de alcance documentado.
- `validation_commands`:
  - `n/a (documental)`
- `status`: `todo`
