# Corrección de estados de carga

Fecha: 26 de octubre de 2026. Rama: `feature/ux-ui-improvement`.

Los cambios visuales anteriores se guardaron primero en `388a844`.

## Comportamiento

- Las rutas montan su estructura sin el fallback global de bloques grises. Títulos, navegación, etiquetas, ayudas y acciones permanecen disponibles durante la consulta de datos.
- Entradas y ofertas reservan tarjetas con la distribución de sus componentes reales. Categorías y recetas reservan sus filas respectivas. La selección de recetas conserva una acción por fila y las categorías del selector usan opciones compactas.
- Editar una entrada reserva únicamente nombre, descripción, selección de categorías, imagen y estado. Crear una entrada muestra sus campos vacíos reales mientras se consultan las categorías.
- Editar una oferta conserva las secciones de información comercial y composición. Reserva sus valores, imagen y grupos pendientes, sin mostrar una advertencia de composición vacía antes de recibirlos. Crear una oferta muestra los campos reales y reserva sólo el nombre de la entrada pendiente.
- Los esqueletos son decorativos, estáticos y no reciben foco. Los controles que dependen de la respuesta permanecen deshabilitados y el formulario de ofertas también comprueba la carga antes de enviar.
- Las listas siguen conservando los resultados confirmados durante actualizaciones y errores.

## Validación

`e2e/ux-ui-loading.demo.spec.ts` retiene las lecturas del repositorio demo, inspecciona la interfaz pendiente y luego libera las respuestas. Usa las rutas, componentes y estilos reales, sin contactar al backend.

Pasaron 16 recorridos en Chromium: catálogo, categorías, recetas, ofertas, creación y edición de entradas y ofertas, a 390 y 1280 px. Comprueban estructura estática, ausencia del fallback global, controles bloqueados cuando corresponde, sustitución de reservas por contenido y ausencia de desbordamiento. Se inspeccionaron las capturas de carga y contenido generado en `test-results/`.

Pasaron las 126 pruebas de `LoadingState`, `App`, `EntryFormPage`, `OfferFormPage` y `closure-review.regression`. También pasan TypeScript, ESLint de los archivos modificados, build y `git diff --check`.

Se retiraron del test de variantes los tres esqueletos de página completa eliminados. Tres esperas existentes de formularios dependían de que el botón de guardar se montara después de los datos. Ahora esperan su habilitación o la llegada del grupo requerido; sus comprobaciones funcionales se conservaron.

La ejecución final de la suite completa produjo 580 pruebas correctas y cinco fallos. Los cinco se reprodujeron en una copia aislada de `388a844`, anterior a esta corrección:

- Dos casos de `RecipePage.test.tsx` encuentran dos botones llamados "Limpiar búsqueda".
- Un caso de `RecipeSelectionTask.test.tsx` no restaura los resultados esperados al limpiar la búsqueda.
- Dos casos de `OffersPage.test.tsx` esperan el texto anterior de grupos de composición y el pie anterior de la tarjeta.

Estos cinco casos no se modificaron en esta tarea.

## Coste de carga inicial

La estructura de las seis vistas se importa directamente para evitar una reserva global antes de poder montar cada página. El build genera un archivo JavaScript de aproximadamente 613 kB minificados, 183 kB comprimidos, y Vite advierte que supera su umbral de 500 kB. Esta verificación no mide tiempos de descarga en dispositivos físicos.
