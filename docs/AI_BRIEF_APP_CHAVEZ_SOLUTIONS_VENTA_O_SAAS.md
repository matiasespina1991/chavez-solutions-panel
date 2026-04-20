# Brief Integral para IA Comercial/Técnica

Fecha de actualización: 12 de abril de 2026  
Proyecto: Chavez Solutions (panel operativo de proformas, solicitudes y órdenes de trabajo)

## 1) Objetivo de este documento

Este documento concentra el contexto funcional, técnico y operativo de la aplicación para que una IA externa pueda:

- Entender cómo está estructurada la solución (frontend, backend, datos, infraestructura).
- Evaluar si conviene venderla como implementación/licencia o como SaaS.
- Detectar fortalezas, riesgos, brechas de producto y brechas técnicas sin inspeccionar código fuente.

## 2) Resumen ejecutivo

La aplicación es un panel administrativo para un laboratorio (flujo comercial-operativo) con foco en:

- Configurar proformas.
- Gestionar solicitudes de servicio.
- Emitir, pausar, reanudar y finalizar órdenes de trabajo.
- Administrar catálogo de servicios mediante CSV.
- Registrar análisis de laboratorio en órdenes emitidas.
- Generar PDF de proforma (preview) y enviar mail automático/manual con adjunto.

Tecnológicamente es una app web Next.js conectada a Firebase (Firestore, Auth, Storage, Cloud Functions).  
El flujo core ya está implementado y usable, pero aún hay áreas de madurez pendientes para escalar comercialmente (roles finos, endurecimiento de seguridad de reglas, PDF final de producción, auditoría operativa extendida, etc.).

## 3) Problema de negocio que resuelve

Digitaliza y centraliza un proceso que normalmente está fragmentado entre hojas de cálculo, correos y seguimiento manual:

- Cotización/proforma.
- Aprobación/rechazo.
- Conversión a orden de trabajo.
- Ejecución operativa de laboratorio.
- Seguimiento de estado.
- Trazabilidad básica de costos.

Resultado: menos fricción operativa, trazabilidad de estado y una base para estandarizar el ciclo comercial-operativo.

## 4) Alcance funcional actual (producto)

### 4.1 Módulos principales en uso

1. Configurador de proformas (`/dashboard/configurator`)
2. Lista de solicitudes (`/dashboard/service-requests`)
3. Lista de órdenes de trabajo (`/dashboard/work-orders`)
4. Registro de análisis de laboratorio (`/dashboard/lab-analysis`)
5. Admin importación de servicios por CSV (`/dashboard/admin/import-services`)

### 4.2 Funcionalidad por módulo

#### Configurador

- Wizard de 4 pasos visuales:
1. Cliente
2. Servicios
3. Datos
4. Resumen
- Captura:
  - Matriz/matrices (`ID_MATRIZ`) desde catálogo técnico
  - Referencia y validez
  - Datos de cliente
  - Servicios seleccionados desde colección `services`
  - Para cada servicio: cantidad, rango mínimo, rango máximo, precio y descuento opcional
  - Notas
- Cálculos:
  - Subtotal por servicio: `cantidad * precio - descuento` (mínimo 0)
  - Subtotal general + IVA + total
- Permite:
  - Guardar borrador
  - Descargar PDF de preview
  - Enviar proforma por email desde UI
  - Ejecutar proforma
  - Editar solicitudes existentes en estados permitidos

#### Lista de solicitudes

- Tabla operativa con búsqueda y ordenamiento.
- Campos de negocio visibles:
  - Referencia, estado, cliente, matriz, servicios (conteo), total, última actualización, notas.
- Menú de acciones por fila:
  - Ver resumen
  - Editar (si estado lo permite)
  - Aprobar/Rechazar proforma
  - Emitir OT
  - Pausar/Reanudar OT
  - Eliminar solicitud

#### Lista de órdenes de trabajo

- Tabla de OTs con búsqueda y ordenamiento.
- Estado OT: iniciada, pausada, finalizada, cancelada.
- Menú de acciones:
  - Ver resumen
  - Finalizar OT (con validaciones)
  - Navegar a registro de análisis (según estado/condiciones del menú)

#### Registro de análisis de laboratorio

- Formulario dinámico por OT.
- Permite cargar resultados por parámetro (parámetro, resultado, unidad, método).
- Guarda en `work_orders.analyses.items` y marca `work_orders.labAnalysis.status = recorded`.
- Requisito para finalizar OT: debe existir análisis registrado.

#### Admin de servicios (catálogo)

- Importa CSV y reemplaza colección completa `services`.
- Antes de reemplazar, crea snapshot histórico.
- Muestra historial de versiones.
- Permite restaurar una versión.
- Permite eliminar versiones históricas no activas.

## 5) Arquitectura frontend

### 5.1 Stack principal

- Next.js 16 (App Router)
- React 19 + TypeScript
- Tailwind CSS + shadcn/ui
- React Hook Form + Zod
- Firebase JS SDK (Auth, Firestore, Storage)

### 5.2 Patrón de organización

- Estructura por features:
  - `features/configurator`
  - `features/service-requests`
  - `features/work-orders`
  - `features/lab-analysis`
  - `features/admin`
- La navegación incluye páginas heredadas de template (overview, billing, kanban, etc.), pero el core de negocio está en los módulos de laboratorio listados arriba.

### 5.3 Estado y comportamiento UI

- Listados en tiempo real con `onSnapshot` Firestore.
- Formularios controlados y validados.
- Indicadores de completitud por step (punto rojo/verde).
- Manejo de cache local para borradores del configurador (`localStorage`).

### 5.4 Autenticación y acceso

- Login con Firebase Auth (Google y email/password).
- Control de acceso por lista de usuarios autorizados en `config/default.authorizedUsers`.
- Si el usuario no está autorizado, se cierra sesión.
- Existe concepto de rol visual (admin, viewer, etc.), pero la autorización funcional por rol aún no está plenamente explotada en todo el flujo.

## 6) Arquitectura backend

### 6.1 Plataforma

- Firebase Cloud Functions v2 (Node 22, TypeScript).
- Firestore como base de datos transaccional.
- Cloud Storage para archivos (PDF generado, assets).
- Triggers de Firestore + funciones callable.

### 6.2 Funciones callable clave

- `createWorkOrder`: emite OT desde solicitud aprobada.
- `approveProforma` / `rejectProforma`: gestión de aprobación.
- `pauseWorkOrder` / `resumeWorkOrder`: control de pausa.
- `completeWorkOrder`: finaliza OT y actualiza solicitud origen.
- `saveWorkOrderLabAnalysis`: persiste resultados de laboratorio.
- `deleteProforma`: elimina solicitud y cancela OT vinculada si existe.
- `importServicesFromCsv`: reemplazo masivo de catálogo de servicios.
- `listServiceHistory` / `restoreServiceHistory` / `deleteServiceHistory`: versionado de catálogo.
- `generateProformaPreviewPdf`: genera PDF de proforma con render HTML + Puppeteer.
- `sendProformaPreviewEmail`: genera PDF preview y lo envía por Gmail API.

### 6.3 Triggers clave

- `onProformaSubmitted`:
  - cuando una solicitud pasa a `submitted`, crea item en `mail_outbox` con estado `pending`.
- `onMailOutboxCreated`:
  - procesa `mail_outbox`,
  - genera PDF de proforma con el renderer actual (Puppeteer),
  - envía correo por Gmail API (OAuth2),
  - marca `sent` o `failed`.

### 6.4 Pipeline de envío de mail

Patrón implementado:

1. Evento de negocio (`requests.status -> submitted`)
2. Escritura en outbox (`mail_outbox`)
3. Trigger consumidor procesa outbox

Además existe envío manual desde el configurador vía callable (`sendProformaPreviewEmail`), sin depender del outbox.

Ventajas:

- Desacople entre flujo transaccional y envío de correo
- Mejor resiliencia operativa
- Trazabilidad de estado de envío

## 7) Modelo de datos (Firestore) - nivel negocio

## 7.1 Colecciones core

- `requests`: solicitud/proforma (origen del flujo)
- `work_orders`: ejecución operativa de OT
- `services`: catálogo importado (parámetros/tabla/unidad/método/precio)
- `services_history`: snapshots de catálogo por importación
- `services_history_meta/current`: puntero a versión activa
- `services_deleted_history`: histórico eliminado
- `mail_outbox`: cola de correos por eventos
- `deleted_requests`: archivo de solicitudes eliminadas

## 7.2 Estados relevantes

### `requests.status`

- `draft`
- `submitted`
- `converted_to_work_order`
- `work_order_paused`
- `work_order_completed`
- `cancelled`

### `requests.approval.status`

- `pending`
- `approved`
- `rejected`

### `work_orders.status`

- `issued`
- `paused`
- `completed`
- `cancelled`

## 7.3 Campos de costo por servicio

Cada servicio seleccionado en una solicitud puede incluir:

- `quantity`
- `rangeMin`
- `rangeMax`
- `unitPrice`
- `discountAmount`

Con esto se calcula subtotal/iva/total de la proforma.

## 7.4 Campo de matrices

- `matrix` se maneja como arreglo `string[]` (sin compatibilidad runtime con string legacy).
- Los valores de `matrix` son dinámicos y provienen de `ID_MATRIZ` del catálogo.

## 8) Reglas operativas implementadas

- No se puede emitir OT si la solicitud no está aprobada.
- No se puede aprobar borrador.
- Rechazar proforma requiere feedback.
- Finalizar OT requiere análisis de laboratorio cargado.
- Al eliminar solicitud, se archiva y se cancela OT vinculada si existe.
- El descuento es opcional en servicios; otros campos de línea son obligatorios para validar completitud.

## 9) Infraestructura y despliegue

### 9.1 Entorno técnico actual

- Proyecto Firebase activo en repo: `escriba-app-302f5`.
- Región Firestore: `eur3`.
- Functions con regiones europeas (`europe-west3` en triggers clave).
- Frontend local con Next.js (`npm run dev` en `apps/admin-dashboard`).

### 9.2 Variables de entorno críticas

- Frontend: `NEXT_PUBLIC_FIREBASE_*`.
- Mail trigger:
  - `GMAIL_CLIENT_ID`
  - `GMAIL_CLIENT_SECRET`
  - `GMAIL_REFRESH_TOKEN`
  - `MAIL_FROM` (opcional recomendado)

## 10) Estado de madurez (realista)

### 10.1 Fortalezas

- Flujo core end-to-end ya funcional.
- Backend transaccional con Cloud Functions para operaciones críticas.
- Trazabilidad de estados y acciones principales.
- Outbox para mail (patrón escalable).
- Gestión versionada del catálogo de servicios importado por CSV.

### 10.2 Brechas y deuda para venta enterprise/SaaS robusto

- PDF aún placeholder (falta template final de proforma productiva).
- Seguridad Firestore con lectura pública amplia en varias colecciones (requiere hardening para multi-tenant/producción estricta).
- Modelo de autorización por roles aún parcial.
- Falta observabilidad formal (dashboards, alertas, DLQ/retry strategy más estricta en correo).
- Módulos heredados de template conviven con módulos de negocio (conviene podar/aislar para producto comercial).
- Consistencia histórica de campos “muestras/análisis/servicios” en datos legacy (hay adaptaciones de compatibilidad en UI).

## 11) Riesgos de producto/comercial a explicitar en venta

1. Riesgo de expectativas sobre PDF final y branding documental.
2. Riesgo de seguridad/compliance si se vende “as-is” sin endurecimiento.
3. Riesgo operativo por dependencia de Gmail API y refresh token (gobernanza OAuth).
4. Riesgo de soporte por evolución de procesos del laboratorio (workflow puede cambiar por cliente).

## 12) Recomendación para análisis “venta directa vs SaaS”

## 12.1 Si se vende “tal cual” (licencia/proyecto cerrado)

Mejor cuando:

- Cliente único o pocos clientes.
- Necesidad de customización por operación interna.
- Menor inversión inicial en plataforma multi-tenant.

Pros:

- Implementación más rápida.
- Menor complejidad de producto plataforma.
- Cobro alto por setup + personalizaciones.

Contras:

- Ingresos menos recurrentes.
- Escalado comercial más artesanal.
- Mayor costo de mantenimiento por cliente.

## 12.2 Si se empaqueta como SaaS

Mejor cuando:

- Objetivo de escalar a múltiples laboratorios.
- Capacidad de invertir en producto/infra.
- Interés en revenue recurrente mensual/anual.

Pros:

- Escalabilidad comercial.
- Estandarización del producto.
- Métricas y evolución basada en uso.

Contras:

- Requiere hardening técnico y de seguridad.
- Requiere multi-tenant real, billing, soporte, SLA.
- Time-to-market mayor para versión “SaaS-ready”.

## 12.3 Lectura pragmática con el estado actual

Con la base actual, la ruta más realista suele ser:

1. Vender primero como implementación “single-tenant managed” (casi productizada).
2. Cobrar setup + mensualidad de operación/soporte.
3. Paralelamente evolucionar a arquitectura SaaS multi-tenant con roadmap claro.

## 13) Roadmap sugerido para pasar a SaaS vendible

Fase 1 (corto plazo):

- Consolidar nomenclatura de dominio (servicios en todo el producto).
- PDF final de proforma (plantilla oficial).
- Endurecer reglas de Firestore por rol/tenant.
- Telemetría básica y monitoreo de errores.

Fase 2 (medio plazo):

- Multi-tenancy explícito (tenantId en datos + enforcement backend).
- Control de permisos por rol y módulo.
- Catálogo de servicios versionado por tenant.
- Configuración de impuestos, moneda y plantillas por tenant.

Fase 3 (escala):

- Facturación SaaS y planes.
- SLA y observabilidad avanzada.
- Automatización de onboarding de nuevos clientes.

## 14) Preguntas clave que la IA consultora debería responder

1. ¿Qué modelo de monetización maximiza margen en 12 meses con este estado de producto?
2. ¿Qué vertical de cliente priorizar primero (laboratorios pequeños vs medianos)?
3. ¿Cuál es el paquete mínimo “vendible ya” sin comprometer reputación?
4. ¿Qué 5 mejoras técnicas tienen mayor impacto comercial inmediato?
5. ¿Cómo estructurar pricing: setup + mensual, licencia anual, o híbrido?
6. ¿Qué riesgos legales/compliance hay por manejo de datos de clientes y resultados?

## 15) Resumen final para decisión

El sistema ya tiene una base sólida de flujo operativo real y backend transaccional para venderse en modo implementación administrada.  
Para SaaS puro y escalable, necesita una etapa de productización adicional (seguridad, multi-tenant, gobernanza de roles, PDF definitivo, observabilidad).  

Conclusión práctica: hoy está en muy buen punto para venderse, pero el formato de venta recomendado inicialmente es “producto + servicio gestionado”, con transición planificada a SaaS completo.
