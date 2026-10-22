# Grafo de Dependencias Final (Post-Migración Auditoría)

- **Fecha de captura:** 2026-10-22
- **Commit base:** `9ac4411c5b835eb893f4d9f8042f532f67dfd896` (`audit-corrections/integration`)
- **Herramienta:** `dependency-cruiser@18.7.0`
- **Módulos analizados:** 112 módulos (+22 módulos frente a los 90 de la línea base del 2026-10-20)
- **Relaciones:** 270 dependencias (+85 dependencias frente a las 185 de la línea base)
- **Importaciones no resueltas:** 0
- **Dependencias circulares:** 0
- **Violaciones de reglas:** 3 (idénticas a la línea base de preparación en T00: dos advertencias de módulo huérfano para archivos de configuración runtime/test `public/runtime-config.js` y `jest.config.cjs`, y una regla de desarrollo para `src/test-setup.ts`). Sin nuevas violaciones ni ciclos.

## Archivos generados
- `dependencies.json`: Representación exhaustiva en formato JSON del grafo de dependencias de todo el proyecto.
- `dependencies.mmd`: Diagrama de relaciones en formato Mermaid.
- `dependencies.txt`: Lista textual de aristas origen → destino.
- `violations.txt`: Reporte de validación de reglas de arquitectura.
- `provenance.json`: Metadatos de procedencia, configuración y hash de ejecución.
