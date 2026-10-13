# T32 — remediar el catálogo administrativo V1

La vista principal mantiene el diseño y la jerarquía del [mockup del administrador](../mockups/mockups_vista_Administrador.html): encabezado breve, búsqueda y filtros, resumen y tarjetas. Las imágenes se recortan dentro de una caja estable; las referencias ausentes o rotas muestran un reemplazo. La descripción visible se limita a dos líneas para dejar visibles las acciones en escritorio; el texto completo permanece en el DOM y en el atributo `title`.

La búsqueda aplica `q` tras 300 ms sin escribir una ruta nueva; Enter y el botón Buscar la aplican inmediatamente. El [OpenAPI publicado](https://fmat-restaurant.github.io/Menu-Documentation/api/) indica que `q` busca nombre, descripción y nombres de categoría. Los filtros conservan la consulta en la URL y reinician la página. En móvil, categoría y estado se abren con el botón Filtros, que indica cuántos están activos.

Las consultas anteriores permanecen visibles mientras llega la nueva página, acompañadas de un aviso que las identifica como resultados anteriores. Las acciones sobre tarjetas quedan bloqueadas hasta que la consulta actual se concilia. `AbortSignal` evita que una respuesta tardía sustituya el resultado vigente. Si falla la nueva consulta, se conservan las tarjetas anteriores con un error y un reintento de entradas. Categorías tiene su propio reintento; no recarga entradas.

Las páginas y categorías se guardan por instancia de repositorio durante 30 segundos. Guardar una entrada invalida las páginas del catálogo; crear o editar una categoría invalida categorías y entradas; eliminar una entrada invalida las páginas y categorías. Las acciones administrativas se serializan y conservan su estado pendiente hasta consultar la lista actualizada. Si un cambio terminó pero falló esa consulta, la vista lo comunica y bloquea nuevas acciones hasta actualizar la lista. PATCH y DELETE siguen obteniendo el ETag fuerte actual para `If-Match`.

La tarjeta abre las ofertas al pulsar su superficie; solo presenta las acciones Editar y Eliminar. El estado administrativo se cambia desde el formulario de edición. Eliminar permanece deshabilitado hasta que la entrada esté archivada. La biblioteca de recetas se indica como pendiente; los formularios de ofertas pertenecen a V4. Esta tarea no implementa esas vistas.

## Verificación

Jest impone 80% en sentencias, ramas, funciones y líneas para los módulos modificados de V1. Hay pruebas de debounce, reintentos separados, cancelación, caché, respuestas inválidas, conflictos, mutaciones pendientes e imágenes rotas. Playwright comprueba el catálogo con imágenes verticales, panorámicas, pequeñas, ausentes y rotas; textos largos; anchuras de 375, 768, 1024 y 1366 px; y zoom del 200%.
