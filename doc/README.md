# Documentación del Proyecto: Chavez Solutions

Bienvenido a la documentación técnica del proyecto. Esta carpeta contiene guías de arquitectura, onboarding y detalles de implementación de las distintas funcionalidades del sistema.

El objetivo de esta documentación es servir como mapa estructural y guía de inicio rápido (onboarding) para cualquier desarrollador que se integre al equipo.

## Índice de Funcionalidades (Features)

- [Configurador (Proformas y Órdenes de Trabajo)](./features/configurator.md)
- [Lista de Órdenes de Trabajo](./features/work-orders.md)

## Notas de Autenticación y Roles

- El rol visual del usuario (línea secundaria en el bloque de perfil de sidebar y dropdown superior) se obtiene desde `config.default.authorizedUsers[].role`.
- Mapeo actual:
  - `admin` → `Administrador`
  - `order-supervisor` → `Supervisor de Órdenes`
  - `logistics` → `Logística`
  - `technician` → `Técnico`
  - `analyst` → `Analista`
