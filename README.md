# Chavez Solutions Monorepo

Repositorio del panel operativo de laboratorio y backend serverless.

## Estructura

- `apps/admin-dashboard`: aplicación web (Next.js) del panel.
- `functions`: Cloud Functions (Firebase) con lógica de negocio, PDF y correo.
- `docs`: documentación funcional/comercial del proyecto.

## Ejecutar localmente

### 1) Dashboard

```bash
cd apps/admin-dashboard
npm install
npm run dev
```

### 2) Functions

```bash
cd functions
npm install
npm run build
```

## Deploy Functions

```bash
cd functions
npm run build
firebase deploy --only functions
```

## Flujo funcional principal

1. Configuración de proforma en `/dashboard/configurator`.
2. Gestión de solicitudes en `/dashboard/service-requests`.
3. Gestión de órdenes de trabajo en `/dashboard/work-orders`.
4. Registro de análisis en `/dashboard/lab-analysis`.
5. Administración de catálogo de servicios en `/dashboard/services-catalog`.
