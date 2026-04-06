# Propuesta Comercial Desglosada

Fecha: 31 de marzo de 2026  
Proyecto: Plataforma operativa Chavez Solutions (panel + app offline)  
Moneda: USD

---

## 1. Objetivo

Presentar dos modalidades de contratación para el desarrollo e implementación:

1. Plan de compra directa (precio fijo).
2. Plan SaaS (entrada baja + mensualidad).

El alcance se define de forma controlada para mantener competitividad de precio y evitar desbordes de horas.

---

## 2. Contexto funcional del sistema

El sistema cubre el flujo comercial-operativo de laboratorio:

- Configuración de proformas.
- Gestión de solicitudes.
- Emisión y gestión de órdenes de trabajo.
- Registro de análisis.
- Envío de correos con PDF.
- Registro de campo offline y sincronización.
- Gestión de plantillas/documentos PDF.

Requerimientos funcionales del alcance:

- Referencia automática y progresiva.
- Proforma con múltiples matrices (agua, suelo, ruido, gases, etc.).
- Matrices con checkbox en pestaña servicios.
- Separación de servicios por matriz / material de ensayo.
- Mostrar límites internos (inf/sup) y unidad en selector de servicios.
- Soporte de combos de servicios.
- Descarga/envío de proforma por mail desde resumen.
- Registro de campo offline (recomendación: app Flutter).
- Filtrado dinámico de servicios por matriz/criterios comerciales.
- Adaptación de múltiples templates PDF (estimado actual: 40).

---

## 3. Áreas de trabajo (Workstreams)

## 3.1 Producto y UX/UI

- Rediseño de flujo del configurador.
- Priorización de datos del cliente.
- Multi-matriz en servicios.
- Separación visual por matriz/material de ensayo.
- Componentes de selección, chips, combos.
- Responsive de tablas y vistas operativas.

## 3.2 Frontend Web (Panel de Control)

- Configurador avanzado (proforma/OT).
- Lista de solicitudes (estados/acciones/filtros).
- Lista de OT (seguimiento/acciones).
- Resumen con acciones de exportar/enviar.
- Gestión de roles y permisos de UI.

## 3.3 Backend y reglas de negocio

- Numeración progresiva automática.
- Reglas de transición de estados.
- Validaciones de flujo operativo.
- Seguridad backend reforzada.
- Funciones cloud (correo, PDFs, procesamiento).

## 3.4 Documentos PDF

- Motor de relleno backend.
- Mapeo de campos.
- Posicionamiento por template.
- Testing y ajustes de salida.
- Gestión de variantes por tipo de documento.

## 3.5 App móvil Flutter (Registro de campo offline)

- Captura de datos sin conexión.
- Persistencia local segura.
- Cola de sincronización.
- Resolución básica de conflictos.
- Integración con backend al recuperar conectividad.

## 3.6 QA, estabilización y soporte

- Testing funcional.
- Corrección de bugs.
- Hardening post-lanzamiento.
- Soporte continuo según plan contratado.

## 3.7 Infraestructura

- Hosting e infraestructura cubiertos por proveedor durante primer año.
- Transferencia de costos de infraestructura al cliente desde año 2.

---

## 4. Feature map (incluido vs evolutivo)

## 4.1 Core incluido

- Flujo proforma → solicitud → OT.
- Estado y trazabilidad principal.
- Multi-matriz en proforma.
- Selector de servicios mejorado.
- Envío de email con PDF.
- App offline MVP.

## 4.2 Evolutivo/extendido

- Configuración comercial avanzada (filtros dinámicos por matriz/nexo).
- Automatizaciones avanzadas por límites.
- Refinamiento de reportes e integraciones extra.
- Nuevos módulos no contemplados en alcance inicial.

---

## 5. Plan A: Compra directa (precio fijo)

Precio total: **$29,250 USD**  
Duración objetivo: hasta 6 meses para versión funcional inicial.

## 5.1 Entregables incluidos en el fijo

- Panel web operativo completo (alcance core).
- Backend y reglas principales.
- App Flutter offline MVP con sincronización.
- Envío de correos y generación PDF.
- Seguridad base profesional.
- Soporte incluido por 6 meses posteriores a salida.
- Infraestructura incluida durante primer año.

## 5.2 Límite de templates PDF incluidos

- Incluye hasta **12 templates PDF** dentro del precio fijo.
- Templates adicionales (13 al 40) se presupuestan aparte por lote o por unidad.

## 5.3 Tarifas de ampliación recomendadas (fuera de alcance)

- Desarrollo evolutivo: **$70/h**.
- Template PDF adicional (referencia): **$300 a $470** por template según complejidad.

---

## 6. Plan B: SaaS / Suscripción

Esquema económico:

- Inicio proyecto: **$5,850**
- Al entregar MVP funcional: **$5,850**
- Mensualidad: **$468/mes**

Incluye durante suscripción:

- Soporte funcional y correctivo.
- Mantenimiento de plataforma.
- Mejoras menores continuas (con tope de horas acordado por mes).
- Infraestructura cubierta durante primer año.

## 6.1 Opción de compra (buyout)

Si el cliente desea dejar de pagar suscripción y adquirir la solución:

- Cuando el acumulado llegue a **$29,250**, aplica opción de compra final de **$5,850** adicionales.
- Resultado: propiedad total y cierre del esquema mensual.

---

## 7. Cronograma por fases (referencia)

Fase 1 (Semanas 1-6):

- Ajustes funcionales base del panel.
- Referencia progresiva.
- Multi-matriz y reorganización configurador.

Fase 2 (Semanas 7-12):

- Selector avanzado de servicios.
- Envío/descarga de proforma en resumen.
- Roles y seguridad base.

Fase 3 (Semanas 13-18):

- App Flutter offline MVP + sincronización.
- Integración con backend.

Fase 4 (Semanas 19-24):

- PDFs incluidos en alcance inicial.
- QA final, estabilización y salida productiva.

---

## 8. Exclusiones y supuestos clave

Para mantener precio competitivo, se deja explícito:

- No se incluyen los 40 templates completos dentro del fijo de $29,250.
- Cambios grandes de alcance se cotizan aparte.
- Integraciones externas no definidas se cotizan aparte.
- Pruebas de campo extensivas con alta variabilidad se planifican como bolsa evolutiva.

---

## 9. Riesgos identificados

- Variabilidad alta en esfuerzo por template PDF.
- Cambios de alcance durante desarrollo.
- Complejidad de sincronización offline en condiciones reales.
- Dependencia de definición futura de configuración comercial.

Mitigación:

- Contrato por fases.
- Actas de alcance por sprint.
- Backlog de cambios con cotización incremental.

---

## 10. Recomendación comercial para presentación

Presentar ambos planes y sugerir:

1. Iniciar con Plan A si el cliente quiere propiedad y menor costo total a mediano plazo.
2. Iniciar con Plan B si el cliente prioriza bajo desembolso inicial y operación asistida.

Mensaje clave:

- Se ofrece una base funcional sólida y competitiva.
- El crecimiento (ej. gran volumen de templates) se incorpora de forma controlada para no comprometer plazos/calidad.

---

## 11. Resumen ejecutivo de precios

- **Plan A (fijo):** $29,250
- **Plan B (SaaS):** $5,850 + $5,850 + $468/mes
- **Tarifa evolutiva adicional:** $70/h
- **PDF adicional (referencia):** $300–$470/template
