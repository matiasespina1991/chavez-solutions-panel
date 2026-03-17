# Laura Butallo Monorepo

This repo now houses multiple apps plus Firebase Functions:

- `apps/admin-dashboard` – dashboard app (WIP placeholder)
- `functions` – Firebase Cloud Functions

## Commands

From the repo root you can run:

```bash
npm run dev:web
npm run build:web
npm run dev:admin
npm run deploy:functions
```

Or `cd` into each app and use the regular `npm run dev`, `npm run build`, etc.

> Remember to install dependencies inside each app folder (`apps/web`, `apps/admin`).

Tareas:

- En vez Muestras deberían llamarse servicios y se deberían usar los valores de las Tablas de Google Sheet (HECHO)

- Unidad y método están fijos y sus valores están conectados a los valores de la Tabla

- Poder asignar ordenes de trabajo a usuarios de cierto rol

- Agregar estado de Revision de calidad del informe

- Si se finaliza la OT se envia un email con el informe al usuario.

- Asignar roles de usuarios.
