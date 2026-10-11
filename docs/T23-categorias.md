# T23 — administración de categorías V5

La ruta `/categories` abre la vista superpuesta desde V1 y ofrece C19, C20, C21, C07, C22 y C12. El botón para volver conserva la búsqueda y los filtros recibidos desde V1; si se abre V5 directamente, vuelve a `/`. La lista carga todas las páginas de `GET /api/v1/menu/categories` y muestra nombre, descripción y conteo informativo. No ofrece eliminación. El formulario permite crear y editar nombre y descripción; cancelar descarta el borrador y una operación exitosa vuelve a consultar la lista.

La misma entrada puede pertenecer a varias categorías del mismo menú. La relación se modifica desde el selector múltiple de T24. El cliente consume las respuestas `{ data: ... }` del [OpenAPI publicado](https://fmat-restaurant.github.io/Menu-Documentation/api/).

El `PATCH /menu/categories/{categoryId}` exige `If-Match`; el cliente consulta el ETag vigente de la categoría antes de guardar.
