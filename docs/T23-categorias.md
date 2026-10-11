# T23 — administración de categorías V5

La ruta `/categories` abre la vista superpuesta desde V1 y ofrece C19, C20, C21, C07, C22 y C12. Consulta todas las páginas de `GET /api/v1/menu/categories` y muestra nombre, descripción y conteo informativo de entradas. La lista no ofrece eliminación. El formulario modal permite crear (`POST`) y editar (`PATCH`) nombre y descripción; cancelar descarta el borrador. Una operación exitosa vuelve a consultar la lista.

La misma entrada puede pertenecer a varias categorías del mismo menú. La relación se edita desde el selector múltiple previsto para V2, no desde este formulario. V5 usa las categorías del menú recibidas por la API y no crea rutas ni parámetros nuevos para la clasificación.

El OpenAPI vigente exige `If-Match` en `PATCH`, pero no ofrece `GET /menu/categories/{categoryId}`. La lista paginada es la única lectura de categorías que declara un ETag; el adaptador asocia el ETag de la página a cada categoría de esa página y lo envía al editar. Si falta, rechaza la escritura y pide recargar. **Esta interpretación debe validarse con Back**, pues el contrato no especifica si el ETag de lista es aceptado para actualizar una categoría individual.

En `Menu-Backend` `origin/main` (`6ec8fde`) existe `CategoryService`, pero no un controlador HTTP de categorías. La interfaz y las pruebas usan el contrato documentado; crear y editar contra un Back real quedan pendientes hasta que exponga los endpoints y resuelva la semántica de `If-Match`. Los conteos son informativos y provienen de la API.
