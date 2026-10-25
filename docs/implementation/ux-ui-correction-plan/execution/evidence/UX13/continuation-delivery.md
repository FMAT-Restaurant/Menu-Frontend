# UX13. Continuación de la entrega

Base de implementación: bbc728d. El ejecutor de continuación conservó todos los cambios parciales previos. No ejecutó build, navegador ni E2E, y no creó commits.

## Comportamiento revisado

Las acciones quedan en el flujo del formulario y se hacen sticky solamente si la altura medida supera el viewport disponible y aún caben dos controles con sus etiquetas. ResizeObserver y visualViewport actualizan la decisión. La altura real del pie determina el margen de scroll. Las reglas nuevas quedan bajo `.menu-module[data-menu-module]`.

El guardado confirmado transmite un recibo local identificado por entidad, nombre y acción. El listado lo consume mediante replace de la misma ruta, conservando query, hash y otros campos de state. La confirmación queda separada de los errores de carga del listado. No depende de un temporizador.

Los formularios confirmados quedan deshabilitados. Un fallo de callback conserva el registro confirmado y permite volver al listado explícitamente. Restaurarlo no envía otro POST ni navega automáticamente. El flush con `updateEditableDraft(record.editableDraft)` no incrementa la versión cuando el borrador es igual. Después se desacopla el controlador para impedir persistencias tardías.

La limpieza usa una sola transacción readwrite de IndexedDB. Comprueba storageKey, identidad del intento final, succeeded, confirmedResult e igualdad de versiones. Un recibo viejo no elimina otra cadena y los cambios posteriores impiden el borrado. Solo resuelve al completar la transacción, incluido el caso de aborto después del éxito de la petición. Los adaptadores externos sin este método opcional conservan el registro confirmado en lugar de usar un get/delete inseguro. La persistencia sigue siendo best effort y depende de IndexedDB y de la identidad de pestaña disponibles.

## Verificación ejecutada

- Jest storage, recibos y EntryFormPage: 64/64, tres suites, 77.724 s, exit 0. Sesión 38975.
- Jest storage y layout: 8/8, dos suites, 5.305 s, exit 0.
- Jest OfferFormPage, CatalogPage y OffersPage: 79/79 en sus tres suites. El comando incluyó por error una cuarta ruta inexistente y terminó exit 1; esas tres suites sí pasaron.
- Jest audit-recovery y operationAttempt con rutas comprobadas: 27/27, dos suites, 7.707 s, exit 0. Incluye confirmaciones que conservan cambios posteriores.
- TypeScript `tsc --noEmit`: exit 0.
- ESLint de consumidores y helpers UX13: exit 0. Se repite para los últimos E2E y layout en el cierre de entrega.
- `git diff --check -- src e2e/ux-ui-13.demo.spec.ts`: exit 0 antes del último ajuste de ámbito CSS, sin cambios de whitespace posteriores.

El fallo histórico del nuevo fixture CAS en jest-storage-entry.log no reproduce en la fuente actual. No se debilitó el parser para conseguir el resultado. El simulador de IndexedDB conserva los tests existentes de aborto y espera las escrituras añadidas desde get.onsuccess.

## Evidencia que falta ejecutar centralmente

`e2e/ux-ui-13.demo.spec.ts` prepara cuatro tamaños, navegación por Tab y Shift+Tab, foco de campo y resumen fuera del pie, un solo submit, ausencia de overflow, edición de oferta con recibo y recarga sin repetición. Incluye un caso identificado como emulación mediante zoom CSS del 200 %. Escribe JSON y PNG físicos antes de sus aserciones generales. El orquestador debe ejecutar, inspeccionar y ampliar los recorridos de alta/edición y fallos HTTP que necesite la integración. No se acredita todavía U17 o U18 por esta preparación.

La prueba física con teclado virtual y la prueba de lector de pantalla siguen pendientes por decisión expresa del usuario.

## Corrección posterior a la ejecución central

V2 detectó que a 768 × 1024 el formulario comenzaba después de una cabecera de unos 197 px. Comparar solo la altura del formulario con 1024 dejaba Guardar fuera del viewport aunque el formulario midiera menos. El hook ahora compara con el espacio disponible después de ese comienzo. La posición del comienzo usa coordenadas estables del documento o del contenedor de scroll para conservar la decisión al desplazarlo. El mínimo de controles editables sigue midiendo la altura total del área desplazable.

Un test nuevo reproduce formulario de 900 px, cabecera de 197 px y viewport de 1024 px, y verifica que el desplazamiento de 250 px conserva la decisión. Layout pasó 2/2; tipos y lint pasaron. La matriz demo agrega 768 × 1024 y comprueba pie dentro del viewport y expectativas explícitas para las variantes largas y corta. V2 no se modificó. El orquestador repetirá navegador/build sobre este ajuste antes del checkpoint solicitado.
