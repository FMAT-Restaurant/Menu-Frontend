# Validación manual pendiente

Estado: no ejecutada. El usuario indicó "Registrar validación manual pendiente" para dispositivo táctil físico, teclado virtual y lector de pantalla. Los resultados de Chromium y los gestos emulados se registran por separado y no sustituyen esta comprobación. El shell real está excluido del alcance actual.

La ejecución se hará sobre la referencia final indicada en `closure.md`. Antes de probar, registrar commit, URL y modo, dispositivo, sistema, navegador, lector y versión, tamaño de pantalla, zoom y fecha. La demo se inicia con `npm run dev:mock`; sus cambios son de memoria y se pierden al recargar. Los casos HTTP o de operación pendiente necesitan un entorno controlado identificado, porque la demo no hace llamadas a la API.

## Dispositivo táctil y teclado virtual

| Caso | Recorrido y resultado esperado | Relación | Resultado |
| --- | --- | --- | --- |
| M01 | Abrir entrada y oferta en edición. Enfocar campos próximos al final con teclado virtual abierto. Desplazarse y guardar sin que la barra de acciones cubra el campo, error o último grupo. Probar orientación vertical y horizontal, poca altura y zoom200%. | V02/V09/V11, U03/U15/U17/U19 | Pendiente |
| M02 | Abrir un formulario modal largo y desplazar su contenido con el dedo. El contenido interior se mueve; un gesto fuera de él no desplaza el fondo. Cerrar recupera la posición de origen y permite desplazar normalmente la página. Repetir apertura y cierre. | V10/V16/V17, U26/U27/U28 | Pendiente |
| M03 | Recorrer opción, selección de receta, creación y regreso según el flujo final. Conservar nombre, selección e insumos al regresar. Comprobar tamaño táctil de cierres, acciones y opciones, y que cambiar imagen sea visible sin hover. | V03/V09/V10/V13, U03/U15/U16/U22/U23/U27 | Pendiente |

## Lector de pantalla

| Caso | Recorrido y resultado esperado | Relación | Resultado |
| --- | --- | --- | --- |
| M04 | Entrar al catálogo, categorías, recetas, edición y ruta inexistente. Se identifica una vez la tarea y el foco llega a su destino. Regresar recupera el origen si existe; si se eliminó, usa un destino útil. Buscar y paginar no reinician sin necesidad el recorrido. | V14/V18, U24 | Pendiente |
| M05 | Abrir confirmación de eliminación y formulario. Se anuncia título y contexto; Cancelar es el foco inicial seguro de confirmación. Tab y Shift+Tab permanecen dentro. Escape y cierre retornan al disparador. En un caso HTTP pendiente, las acciones siguen bloqueadas y no hay doble escritura. | V09/V10/V16, U15/U26/U27 | Pendiente |
| M06 | Enviar categoría y receta inválidas. Se anuncian los errores asociados al campo y el foco permite corregirlos sin perder datos. Probar éxito confirmado, fallo e incertidumbre en su entorno correspondiente: sólo el éxito confirmado se anuncia como guardado. | V07/V08/V11/V15, U04/U13/U14/U18/U25 | Pendiente |
| M07 | Con fixtures de demora, abrir un listado y un formulario y retrasar sólo categorías o inventario. Se comunica la carga local y las formas decorativas no se leen como contenido. Actualizar una búsqueda conserva los resultados anteriores con su contexto; al fallar, siguen disponibles con la recuperación correspondiente. Confirmar que resolver la carga no repite el anuncio de guardado ni mueve el foco que se está usando. | V08/V14/V15/V18, U18/U24/U25 | Pendiente |

## Registro de resultado

Por cada caso, anotar pasos realmente realizados, resultado observado, evidencia, incidencia y responsable. Si falla, conservar el hallazgo afectado abierto y devolverlo al responsable del ticket. No convertir una captura estática, una comprobación DOM o una simulación de viewport en aprobación de estas filas.

Los recorridos se contrastarán con los nombres y pasos de la implementación final antes de entregar el cierre. Este archivo no acredita pruebas realizadas ni conformidad completa de accesibilidad.
