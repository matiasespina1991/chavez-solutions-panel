# Documentación del Proyecto

Esta carpeta contiene documentación técnica, funcional y comercial del proyecto Chavez Solutions.

## Índice

- [Feature: Configurador](/Users/matiasespina/Documents/Projekte/chavez-solutions/docs/features/configurator.md)
- [Feature: Lista de Órdenes de Trabajo](/Users/matiasespina/Documents/Projekte/chavez-solutions/docs/features/work-orders.md)
- [Brief técnico/comercial para IA](/Users/matiasespina/Documents/Projekte/chavez-solutions/docs/AI_BRIEF_APP_CHAVEZ_SOLUTIONS_VENTA_O_SAAS.md)
- [Propuesta comercial (planes)](/Users/matiasespina/Documents/Projekte/chavez-solutions/docs/PROPUESTA_COMERCIAL_PLANES_CHAVEZ_SOLUTIONS.md)
- [Preguntas abiertas](/Users/matiasespina/Documents/Projekte/chavez-solutions/docs/PREGUNTAS.md)

## Notas de autenticación y roles

- El acceso al dashboard se valida contra `config/default.authorizedUsers` en Firestore.
- Si el usuario autenticado no está autorizado, se cierra sesión automáticamente.
- El rol visual actual se toma de `authorizedUsers[].role`.
- Los callables críticos en backend validan permisos con `requirePermission` (`functions/src/guards/require-permission.ts`).
- Si el usuario no tiene permiso para la acción, backend responde `permission-denied`.

## Notas de seguridad operativa (backend)

- `config/default.authorizedUsers` se usa como fallback de autorización por email mientras conviven entornos sin custom claims.
- El origen primario de autorización en backend es custom claims (`role` / `roles`) cuando están presentes.
- Política y checklist formal: `tech-migration/cross-cutting/security-policy.md`.
