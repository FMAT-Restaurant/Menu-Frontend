# T22 — catálogo administrable del menú

La ruta `/` muestra V1 con C01, C02, C03, C04, C05, C06, C07 y la búsqueda reutilizable C23. Las entradas se consultan en `GET /api/v1/menu/entries` con `q`, `categoryId`, `status`, `page` y `pageSize`; las categorías del filtro se consultan por páginas en `GET /api/v1/menu/categories`. La búsqueda, los filtros y la paginación se guardan en la URL de la vista y usan exclusivamente los parámetros del contrato actual. La lista es **administrativa**: `ACTIVE` no se presenta como sinónimo de publicada, pues se requiere también una oferta activa válida. V1 muestra la respuesta vigente de la API, asumida como la última revisión válida; no presenta ni permite navegar revisiones históricas en el flujo normal de Front.

Cada tarjeta enlaza con edición (`/entries/:entryId/edit`) y ofertas (`/entries/:entryId/offers`). El encabezado enlaza con alta (`/entries/new`), categorías V5 (`/categories`) y biblioteca V6 (`/recipes`). Estas rutas tienen una pantalla de destino temporal; sus formularios y listados pertenecen a tareas posteriores.

Las acciones disponibles son inactivar, archivar y desarchivar. Desarchivar envía `INACTIVE`; ninguna acción de esta vista modifica ofertas. Antes de cada `PATCH`, el cliente consulta la entrada y envía su ETag actual en `If-Match`. La eliminación solo se ofrece para entradas archivadas y requiere confirmación. Antes de `DELETE`, el cliente vuelve a comprobar el estado y el ETag de la entrada. Una respuesta de conflicto o error deja la lista sin cambios confirmados y muestra un aviso. El Back sigue siendo responsable de aplicar las invariantes y la concurrencia.

## Dependencias pendientes del Back

Inspeccionado `Menu-Backend` `origin/main` en `6ec8fde` y `Menu-Documentation` `origin/main` al implementar T22:

- La creación ya inicia en `INACTIVE`, y el Back implementa lista, categorías y transiciones administrativas. La vista V1 consume esas operaciones.
- La activación está deshabilitada hasta que el Back valide una oferta activa válida antes de pasar una entrada a `ACTIVE` (INV-MENU-002). Permitirla ahora podría publicar una entrada sin oferta válida.
- El Back aún no implementa `DELETE /menu/entries/{entryId}` ni ofertas/revisiones. La interfaz prepara la llamada y su confirmación, pero una eliminación real fallará hasta que exista el endpoint y se garantice conservar consultables las revisiones históricas publicadas (INV-MENU-009). El contrato OpenAPI actual tampoco promete esa conservación y debe alinearse.
- `offerCount` viene de la lista administrativa; el Back actual devuelve `0` mientras no implemente ofertas. Las tarjetas muestran el valor recibido, sin inferir elegibilidad de publicación.

El frontend no puede demostrar por sí solo la conservación de revisiones ni la elegibilidad de publicación: ambas deben probarse en Back cuando esos recursos existan. Conservar revisiones históricas es una garantía del servicio, no una pantalla de V1. Las pruebas unitarias de T22 comprueban la restricción local de eliminación, `If-Match`, filtros, paginación y transiciones visibles. Playwright cubre un recorrido de V1 con respuestas contractuales simuladas.
