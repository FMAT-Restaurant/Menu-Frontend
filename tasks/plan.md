# MVP1-T33 — Remediar V2

Fuente: [issue #49](https://github.com/FMAT-Restaurant/Menu-Frontend/issues/49), mockup V2 y docs/DESIGN.md. Contrato verificado en el sitio publicado el 14/10/2026: /api/openapi.yaml, versión 5.1.0.

## Decisiones

- Conservar el ETag del detalle abierto; PATCH usa esa versión sin otro GET.
- Separar uploadEntryImage de createEntry/updateEntry: reutilizar imageId para el mismo archivo tras un rechazo confirmado. Lecturas 12 s, escrituras 20 s, subida 60 s.
- Normalizar errores en el área V2 sin dependencia de Axios en componentes. Priorizar envoltura error/message/details y mapear violations a campos.
- Deduplicar categorías por repositorio, usando la caducidad de 30 s e invalidación existentes; cancelar cuando ya no haya consumidores. Mantener concurrencia máxima de cuatro páginas.
- Mantener cargas de categorías/detalle independientes y el borrador ante reintentos y respuestas tardías.
- Aplicar layout y navegación acotados a V2; dropdown accesible con búsqueda local y chips, selector de imagen como zona completa y acciones sticky.
- El contrato no ofrece idempotencia: una escritura con respuesta incierta no se repite automáticamente. El usuario verifica antes de decidir repetir; 412 exige revisar la versión actual antes de continuar.

## Orden y comprobaciones

1. Puerto/adaptador y errores: probar ETag de apertura, sin GET previo, timeouts y transporte simulado.
2. Categorías: caché/deduplicación/cancelación y paginación con más de 100 categorías.
3. Formulario/componentes: cargas independientes, borrador, selección, imagen y recuperación de guardado.
4. Layout V2 y E2E: seis viewports, zoom 200 %, errores/foco/acciones accesibles.
5. Cobertura ≥80 % en sentencias, ramas, funciones y líneas de los módulos V2. Lint, typecheck, build y pruebas. Preview local y revisión del usuario antes de publicar PR.

Alcance: V2 y operaciones que consume. Sin implementación de V1/V3 ni endpoints nuevos.
