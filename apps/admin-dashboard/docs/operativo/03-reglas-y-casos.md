# 03. Reglas y casos comunes

## Reglas operativas del flujo

- Un **borrador** no debería pasar a ejecución sin validación de datos.
- Una **OT emitida** implica inicio operativo.
- Una **OT pausada** se usa cuando hay bloqueo externo o interno.
- Una **OT finalizada** indica cierre completo del trabajo.

## Casos comunes

### Caso A: Solicitud nueva de punta a punta

1. Crear solicitud en configurador.
2. Guardar borrador si falta información.
3. Ejecutar proforma.
4. Emitir OT cuando se autorice operación.
5. Finalizar OT al concluir el servicio.

### Caso B: Se detecta un cambio después de enviar proforma

1. Ir a lista de solicitudes.
2. Revisar si el estado permite edición.
3. Ajustar datos en configurador.
4. Volver a emitir según corresponda.

### Caso C: Operación detenida temporalmente

1. Pausar OT.
2. Registrar notas claras de motivo y próximos pasos.
3. Reanudar OT cuando se levante el bloqueo.

## Buenas prácticas de equipo

- Escribir notas concretas y accionables.
- Evitar dejar solicitudes en borrador sin responsable.
- Revisar diariamente OT pausadas.
- Finalizar OT apenas se complete el trabajo para mantener trazabilidad.

## Checklist de cierre

Antes de finalizar una OT, validar:

- Servicio ejecutado según alcance.
- Muestras / análisis completos.
- Observaciones o notas finales registradas.
- Comunicación de cierre al responsable correspondiente.