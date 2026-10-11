# T23 — administración de categorías V5

La ruta `/categories` abre la vista superpuesta desde V1 y ofrece C19, C20, C21, C07, C22 y C12. El botón para volver conserva la búsqueda y los filtros recibidos desde V1; si se abre V5 directamente, vuelve a `/`. La lista carga todas las páginas de `GET /api/v1/menus/{menuId}/categories` y muestra nombre, descripción y conteo informativo. No ofrece eliminación. El formulario permite crear y editar nombre y descripción; cancelar descarta el borrador y una operación exitosa vuelve a consultar la lista.

La misma entrada puede pertenecer a varias categorías del mismo menú. La relación se modifica desde el selector múltiple de T24. El cliente acepta la respuesta de categoría descrita en OpenAPI y, durante la transición, el envoltorio previo `{ data: ... }`.

El OpenAPI vigente usa rutas plurales con `menuId` y no exige `If-Match` al editar categorías. El `Menu-Backend` consultado durante T24 todavía expone rutas bajo `/menu/categories`; debe implementar o adaptar el contrato antes de conectar V5 con ese despliegue.
