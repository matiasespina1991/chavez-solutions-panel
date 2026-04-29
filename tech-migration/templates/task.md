## <TASK-ID> - <Titulo corto>

- `id`: <TASK-ID>
- `scope`: <Que se cambia y que no>
- `files`:
  - `<ruta/archivo-1>`
  - `<ruta/archivo-2>`
- `risk`: `<low|medium|high>` + descripcion
- `depends_on`:
  - `<TASK-ID>`
- `acceptance`:
  - [ ] Criterio 1
  - [ ] Criterio 2
  - [ ] Criterio 3
- `validation_commands`:
  - `cd apps/panel && npx tsc --noEmit`
  - `cd functions && npx tsc --noEmit`
- `status`: `todo`
- `notes`:
  - Contexto o decisiones relevantes.
