# Escape nativo durante pasos

La primera tanda centralizada aprueba nueve regresiones de recetas y modales. Los nuevos recorridos se corrigieron primero por localizadores que no coincidían con los nombres accesibles reales. Root había indicado incorrectamente el prefijo Receta para una tarjeta del selector nuevo; se corrigió el test nuevo según el árbol observado, sin cambiar la aplicación.

Una vez alcanzada la transición, los cuatro anchos reproducen un defecto real. Tras volver de creación al selector y pulsar Escape, el contenido cambia a opción pero el navegador cierra el diálogo. Su nodo sigue conectado, con open=false y :modal=false; el documento conserva position:fixed porque el dueño React continúa abierto.

El diagnóstico registra keydown, cancel, close y mutaciones de open/título. Intercepta llamadas explícitas a close sólo para distinguir su procedencia. La evidencia negativa está en browser-noncancelable-negative, events-390.json. El cancel observado tiene cancelable=false y defaultPrevented=false incluso en el listener del nodo después de React. No aparece close-called. El cierre proviene del comportamiento nativo, no de una llamada del hook.

Se corrigió Escape localmente en OptionModal antes de la acción nativa, reutilizando la misma política de paso, confirmación y prioridad de operaciones. Se conserva onCancel como respaldo y no se añade un listener global. Las aserciones de único nodo, foco, borradores y limpieza permanecen. La repetición aprueba los cuatro casos en16,4s, log demo-escape-fixed-root.log y evidencia browser-escape-fixed.

El caso HTTP adicional controla la respuesta del POST. Al deshabilitar el disparador, el foco observado queda en BODY. Dos Escape mantienen un modal y un POST; se libera la respuesta y continúa la asignación confirmada. El JSON pending-escape.json en http-first conserva ambos estados. Esta comprobación no necesita enfocar previamente un control para obtener el resultado.

Root inspeccionó las capturas selector-390 y create-390 de browser-focus-negative. El selector muestra búsqueda y primer resultado sin banda administrativa; la creación conserva el borrador y la validación de UX08. Estas capturas no prueban por sí solas que Escape o la recuperación funcionen.
