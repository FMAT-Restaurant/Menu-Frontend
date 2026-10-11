# T22 — catálogo administrativo del menú

La ruta `/` muestra V1 con C01–C07 y C23. Las entradas se consultan con `GET /api/v1/menu/entries` y sus parámetros contractuales `q`, `categoryId`, `status`, `page` y `pageSize`. La lista es administrativa: `ACTIVE` no significa publicada, pues se requiere también una oferta activa válida. V1 muestra la respuesta vigente de la API y no presenta ni permite navegar revisiones históricas en el flujo normal del Front.

El filtro y el formulario de entradas cargan las categorías mediante `GET /api/v1/menu/categories`. V5 crea y edita categorías en esas rutas, de acuerdo con el [OpenAPI publicado](https://fmat-restaurant.github.io/Menu-Documentation/api/).

Cada tarjeta enlaza con edición (`/entries/:entryId/edit`) y ofertas (`/entries/:entryId/offers`). El encabezado enlaza con alta (`/entries/new`), categorías V5 (`/categories`) y biblioteca V6 (`/recipes`). Los flujos V1 y V5 conservan la URL del catálogo al volver.

Las acciones disponibles en V1 son inactivar, archivar y desarchivar. Desarchivar deja la entrada `INACTIVE`; ninguna acción de esta vista modifica ofertas. Antes de cada `PATCH` de estado, el cliente consulta la entrada y envía su ETag actual en `If-Match`. La eliminación solo se ofrece para entradas archivadas y requiere confirmación. Antes de `DELETE`, el cliente vuelve a comprobar el estado y el ETag. Back sigue siendo responsable de aplicar invariantes y concurrencia.

## Dependencias pendientes del Back

El Back consultado aún no implementa `DELETE /menu/entries/{entryId}`. La eliminación desde V1 requiere esa operación y las garantías de preservación histórica descritas por INV-MENU-009.

La activación debe validar una oferta activa válida. La eliminación de entradas archivadas debe conservar consultables las revisiones históricas publicadas (INV-MENU-009). El frontend no puede demostrar esas garantías; deben verificarse en Back. `offerCount` se muestra como información recibida y no determina la publicación.
