# T22 — catálogo administrativo del menú

La ruta `/` muestra V1 con C01–C07 y C23. Las entradas se consultan con `GET /api/v1/menu/entries` y sus parámetros contractuales `q`, `categoryId`, `status`, `page` y `pageSize`. La lista es administrativa: `ACTIVE` no significa publicada, pues se requiere también una oferta activa válida. V1 muestra la respuesta vigente de la API y no presenta ni permite navegar revisiones históricas en el flujo normal del Front.

Desde T24, el filtro y el formulario de entradas cargan las categorías del menú actual mediante `GET /api/v1/menus/{menuId}/categories`, usando `MENU_ID` de configuración. La misma ruta plural se usa para crear y editar categorías en V5, de acuerdo con el OpenAPI actualizado. Las rutas singulares `/menu/categories` que expone el Back consultado aún deben migrarse o adaptarse.

Cada tarjeta enlaza con edición (`/entries/:entryId/edit`) y ofertas (`/entries/:entryId/offers`). El encabezado enlaza con alta (`/entries/new`), categorías V5 (`/categories`) y biblioteca V6 (`/recipes`). Los flujos V1 y V5 conservan la URL del catálogo al volver.

Las acciones disponibles en V1 son inactivar, archivar y desarchivar. Desarchivar deja la entrada `INACTIVE`; ninguna acción de esta vista modifica ofertas. Antes de cada `PATCH` de estado, el cliente consulta la entrada y envía su ETag actual en `If-Match`. La eliminación solo se ofrece para entradas archivadas y requiere confirmación. Antes de `DELETE`, el cliente vuelve a comprobar el estado y el ETag. Back sigue siendo responsable de aplicar invariantes y concurrencia.

## Dependencias pendientes del Back

El `Menu-Backend` descargado durante T24 aún implementa rutas singulares `/menu/entries` y `/menu/categories`, y subida de imagen separada en `/media/images`. Por ello, la integración completa de T24 requiere que Back implemente o adapte las rutas plurales y multipart del OpenAPI vigente.

La activación debe validar una oferta activa válida. La eliminación de entradas archivadas debe conservar consultables las revisiones históricas publicadas (INV-MENU-009). El frontend no puede demostrar esas garantías; deben verificarse en Back. `offerCount` se muestra como información recibida y no determina la publicación.
