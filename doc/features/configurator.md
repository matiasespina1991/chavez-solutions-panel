# Feature: Configurador (Proformas y Órdenes de Trabajo)

## 1. Introducción

El **Configurador** es un módulo clave del sistema (ubicado en el Admin Dashboard) que permite a los usuarios generar Proformas y Órdenes de Trabajo (OT) a través de un asistente paso a paso (Wizard).

Este módulo está diseñado para manejar la complejidad de los análisis de laboratorio (agua y suelo), la recolección de muestras y el cálculo automático de precios e impuestos.

## 2. Stack Tecnológico

- **Framework:** Next.js (App Router)
- **UI/Componentes:** Tailwind CSS, shadcn/ui (Tabs, Cards, Select, RadioGroup, Checkbox, etc.)
- **Manejo de Formularios:** `react-hook-form`
- **Validación:** `zod` (con `@hookform/resolvers/zod`)
- **Base de Datos:** Firebase Firestore

## 3. Estructura de Archivos (Feature-Sliced Design)

El módulo sigue una arquitectura orientada a "features", encapsulando toda su lógica en `src/features/configurator/`. Esto facilita el mantenimiento y evita acoplamientos innecesarios con otras partes de la aplicación.

```text
apps/admin-dashboard/src/
├── app/dashboard/configurator/
│   └── page.tsx                 # Punto de entrada de la ruta (Renderiza el formulario)
└── features/configurator/
    ├── catalogs/                # Datos estáticos y catálogos locales
    │   ├── packages.ts          # Paquetes de análisis predefinidos
    │   ├── soil.parameters.ts   # Parámetros de análisis de suelo
    │   └── water.parameters.ts  # Parámetros de análisis de agua
    ├── components/              # Componentes UI específicos del feature
    │   └── configurator-form.tsx# Componente principal (Wizard de 5 pasos)
    └── services/                # Lógica de negocio y conexión a BD
        └── configurations.ts    # Interfaces TS y operaciones CRUD de Firestore
```

## 4. Modelos de Datos y Base de Datos

El flujo se divide en dos niveles en Firestore:

- **Origen comercial/técnico:** colección `service_requests`.
- **Ejecución operativa:** colección `work_orders`.

El esquema principal de solicitud (`ConfigurationDocument` en frontend) incluye:

- `isWorkOrder`: booleano que define si la solicitud debe generar OT (`true`) o solo proforma (`false`).
- `status` del request: `draft`, `submitted`, `converted_to_work_order`, `work_order_paused`, `cancelled`.
- `client`: Datos del cliente (empresa, RUC, contacto, email, etc.).
- `samples`: Muestras recolectadas (código, tipo, fecha de toma).
- `analyses`: Análisis a realizar (parámetros individuales o paquetes).
- `pricing`: Desglose de precios (subtotal, descuento, impuestos, total).

Cuando una solicitud definitiva tiene `isWorkOrder = true`, el backend crea una orden en `work_orders` vía Cloud Function callable (`createWorkOrder`) y la vincula con `sourceRequestId`.

_Nota: Las interfaces estrictas de TypeScript se encuentran en `services/configurations.ts`._

## 5. Arquitectura del Formulario (Wizard)

El componente `ConfiguratorForm` es un formulario masivo dividido en 5 pestañas (Tabs) para mejorar la experiencia del usuario. Utiliza `useFieldArray` de `react-hook-form` para manejar listas dinámicas.

1. **Paso 1: Tipo y Cliente (`type-client`)**
   - Selección entre Proforma u Orden de Trabajo.
   - Ingreso de datos del cliente.
2. **Paso 2: Muestras (`samples`)**
   - Uso de `useFieldArray` para agregar/eliminar muestras dinámicamente.
3. **Paso 3: Análisis (`analyses`)**
   - Selección de parámetros individuales (Agua/Suelo) o Paquetes predefinidos.
   - También utiliza `useFieldArray`.
4. **Paso 4: Precios (`pricing`)**
   - Cálculo automático de subtotales basados en los análisis seleccionados.
   - Aplicación de descuentos e impuestos (IVA 15%).
5. **Paso 5: Resumen (`summary`)**
   - Vista previa de todos los datos ingresados antes de guardar.

## 6. Flujo de Datos y Estado

1. **Inicialización:** `useForm` se inicializa con valores por defecto y el esquema de validación estricto de `zod` (`formSchema`).
2. **Interacción:** El usuario navega por los tabs. Los datos se mantienen en la memoria del cliente.
3. **Cálculos Dinámicos:** Un `useEffect` observa los cambios en el array de `analyses` y actualiza automáticamente el `subtotal`, `taxAmount` y `totalAmount` en la sección de `pricing`.
4. **Envío (Submit):**
   - Al hacer submit, `react-hook-form` valida todos los campos contra el esquema de Zod.
   - Si es válido, la función `onSubmit` mapea los datos (manejando conversiones de `undefined` a `null` para compatibilidad estricta con Firestore).
   - Se llama a `createConfiguration(data)` que guarda el documento en `service_requests`.
   - Si es guardado definitivo y el tipo incluye OT, se invoca la callable `createWorkOrder` para crear el documento en `work_orders`.
   - Se muestra un toast de éxito y se reinicia el formulario.

## 7. Guía Rápida para Nuevos Desarrolladores (Onboarding)

### ¿Dónde agregar un nuevo parámetro de análisis?

Abre `src/features/configurator/catalogs/water.parameters.ts` o `soil.parameters.ts` y agrega el nuevo objeto al array. El formulario lo leerá automáticamente.

### ¿Dónde modificar el cálculo del IVA?

Busca el `useEffect` dentro de `src/features/configurator/components/configurator-form.tsx` que observa `watchedAnalyses`. Allí se define el porcentaje (actualmente `0.15`).

### ¿Cómo agregar un nuevo campo al cliente?

1. Actualiza la interfaz `ConfigurationClient` en `src/features/configurator/services/configurations.ts`.
2. Actualiza el `formSchema` (Zod) en `src/features/configurator/components/configurator-form.tsx`.
3. Agrega el input correspondiente en el JSX del Paso 1 (`TabsContent value="type-client"`).
4. Asegúrate de mapear el campo en la función `onSubmit` si requiere conversión de tipos (ej. `undefined` a `null`).

## 8. Dashboard y Operación

- El menú lateral del dashboard se redujo a tres entradas operativas para este alcance:
   - `Configurador de proformas y OT`
   - `Lista de solicitudes` (ruta actual: `/dashboard/service-requests`)
   - `Configuración`
- La sección de lista muestra `service_requests` y permite acciones por fila.
- Desde "Editar solicitud..." se abre el configurador con query `requestId` para edición.
- En modo edición, el resumen muestra solo el botón **Actualizar solicitud** (sin Guardar Borrador/Guardar Definitivo).
- En el listado existe menú por fila para:
   - Emitir orden de trabajo (si aún no existe OT)
   - Pausar orden de trabajo (si ya existe OT)
   - Ver / Editar solicitud (UI presente, sin flujo de detalle aún)
- Cuando una OT está pausada, el punto OT se muestra en amarillo, el tooltip indica "Orden de trabajo pausada" y el estado textual también refleja pausa.
