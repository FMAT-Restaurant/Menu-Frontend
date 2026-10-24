# Entrega de UX04

Ticket UX04, cabeceras locales. Agente `/root/ux01_images`. Estado solicitado: en revisión. Base recibida `ccbc6c7`, con UX01, UX02 y UX03 integradas. El usuario autorizó implementar UX00 a UX17 y después solicitó terminar las tareas activas y pausar; esta entrega termina únicamente UX04. No inicia UX05, UX06 ni UX07.

## Cambios y consumidores

Se retiraron global-nav, su marca y el texto administrativo de App/NotFoundPage, CatalogPage, EntryFormPage, OffersPage y OfferFormPage. CategoryPage y RecipePage dejan de usar la banda oscura y los dos títulos de colección. Cada página conserva una cabecera local con título, contexto, regreso y acciones que corresponden a su tarea. No se añade otra banda de marca para la demo.

Las siete páginas consumen `menu-page` y `task-header` de shared/primitives.css. Las cabeceras usan H1 de 28/36, tinta sobre superficie neutral, separador discreto, espacios de la escala y acciones que se reorganizan con el ancho útil. Se retiraron los tamaños y breakpoints de cabecera contradictorios de catálogo, entradas y ofertas, además de las reglas de marca en styles.css. No se editaron los estilos de tarjetas, grupos, insumos, validación ni ciclos modales de UX03.

Los listados y la composición de ofertas comparten máximo de 1152 px y márgenes de 24 px, reducidos a 16 px con ancho útil menor de 768 px. El formulario de entrada se limita a 1040 px para sus dos paneles y líneas de texto. La ruta inexistente usa 640 px para un mensaje breve. La composición de oferta conserva 1152 px por su panel comercial y grupos. Esas diferencias dependen del contenido, no de otra familia de cabeceras.

Cada página autónoma aporta `data-route-heading` y tabIndex -1. La instancia de RecipePage anidada con onClose no añade ese marcador para que UX15 no confunda el título del selector con el de la ruta anfitriona. No se añadió un coordinador de foco ni política de título de documento. Main no necesitó cambios.

ReturnTo, query, página y catalogReturnTo conservan sus valores y destinos. En entradas se mantiene el bloqueo del regreso durante subida/persistencia y la llamada abandon existente. En ofertas se conserva abandonEditor y el estado de regreso. No se modifica el repositorio, payload, política de publicación, idempotencia, versiones ni recuperación. Los imports de producción se conservan; la inspección se centró en JSX, callbacks de navegación y estilos que el grafo no acredita.

## Archivos

- `src/App.tsx` y las páginas CatalogPage, CategoryPage, EntryFormPage, OffersPage, OfferFormPage y RecipePage.
- `src/styles.css`, `src/shared/primitives.css` y las hojas de catálogo, entradas y ofertas, únicamente sus reglas de cabecera y ancho de página.
- Los cinco tests incompatibles informados antes de editar y autorizados por el integrador, incluidos los dos identificados durante la comprobación normal.
- `src/features/entries/EntryCategorySelector.tsx` y su nuevo test focalizado, con ampliación de reserva después de reproducir el click perdido descrito abajo.
- `e2e/ux-ui-04.demo.spec.ts`, nuevo, con cuatro casos para nueve rutas a 390/1440 px, un recorrido de regreso con filtros y origen de oferta, y la regresión de guardado con categorías abiertas.
- Esta carpeta de evidencia. No se editó el registro común, la auditoría histórica, configuración compartida, package.json, main ni hooks modales. No se hicieron commits desde este agente.

## Compatibilidad de pruebas

Se preservaron los escenarios funcionales completos de los tres casos identificados en [preparation.md](preparation.md). EntryFormPage.test ya no pulsa la marca retirada: intenta usar el regreso local tanto durante subida como durante persistencia y comprueba el borrador y una sola escritura. entry-form-remediation mide la cabecera local frente al formulario en sus seis anchos, conservando categorías, zoom, scroll, foco y guardado. catalog-traffic comprueba el H1 conservado Catálogo de categorías en lugar del H2 duplicado, manteniendo tráfico, TTL, alta y asignación.

Los nombres de títulos que ya prueban App y el selector de receta permanecen. La corrección del selector administrativo completo pertenece a UX10. Fuera de las cinco adaptaciones descritas en este apartado no se modificó ningún otro test existente.

La primera ejecución normal detectó dos expectativas visuales adicionales incompatibles con el requisito. `audit-layout.spec.ts`, caso R07, espera el H2 duplicado "Categorías del Menú". `audit-review-regressions.spec.ts`, caso RV13, exige explícitamente banda negra, texto blanco y display flex del encabezado de recetas. El orquestador amplió la reserva para adaptar únicamente esas expectativas al título principal y la cabecera neutral nueva. Se conservarán las comprobaciones antes y después de navegar, carga de primitivas, responsive y ausencia de desbordamiento. Se documenta la incompatibilidad antes de editar esos archivos.

Los otros dos fallos de esa ejecución, alta de entrada y tráfico/caché sin POST, no se clasifican como incompatibilidad de test. Sus escenarios permanecen intactos, salvo el H2 de categorías ya justificado. Las cuatro evidencias negativas quedan en production-negative/.

## Investigación del click de guardado

El panel de categorías está en flujo. Su listener exterior original cerraba con pointerdown. El nuevo encabezado más corto expuso una posición en la que ese cierre reduce la altura del formulario y mueve su footer antes de pointerup. La [evidencia negativa](save-click-negative/) confirma pointerdown sobre Guardar a top 664 px, pointerup y click sobre MAIN con el botón desplazado a top 591 px, y ningún submit. El formulario queda intacto y sin error porque nunca recibió el envío.

Se corrigió EntryCategorySelector para cerrar por click exterior una vez entregado el gesto, con limpieza del listener correspondiente. No se añadió una demora ni se alteró el guardado. La selección interior conserva el panel; Escape sigue cerrándolo y devuelve el foco. Tres unitarias nuevas comprueban la secuencia de puntero con un solo submit y las categorías seleccionadas, cierre exterior y Escape/foco. Antes de la corrección fallaron dos y pasó una, conservado en category-click-unit-negative.log.

La repetición positiva del nuevo caso demo conserva pointerdown, pointerup y click sobre BUTTON Guardar entrada a top 664 px, seguidos por submit sobre FORM. La captura muestra la entrada creada en el catálogo. JSON y PNG se conservaron en [browser-final](browser-final/), junto con la repetición final de todas las cabeceras. La evidencia negativa permanece separada y sin reemplazar.

## Verificación

| Comprobación | Resultado y evidencia |
| --- | --- |
| Tipos con nueva regresión | Pasa; [log](typecheck.log). |
| App y seis páginas | 7 suites, 171 tests pasan en 25,88 s; [log](unit-pages.log). Incluye el bloqueo de navegación y los flujos de formulario y recuperación existentes. |
| Selector y formulario tras corregir click | 2 suites, 57 tests pasan en 9,324 s; [log](category-click-unit-positive.log). Los tres casos nuevos mantienen las mismas aserciones que la ejecución negativa anterior. Tipos finales pasan en typecheck-final.log. |
| Demo integrada final | 24 tests pasan en 35,1 s, incluidos los cuatro nuevos y las dos pruebas demo originales. [Log del orquestador](../oleada-03-demo-final.log). Los cuatro casos UX04 observan cero API y cero errores de JavaScript. Se conserva U01 y el ciclo modal UX03 sobre la misma base. La primera ejecución de cabeceras pasó 23 tests en 34,7 s antes de añadir la regresión del click. |
| Nueva regresión de cabeceras | Nueve rutas a 390 y 1440 px acreditan ausencia de marca/banda, título 28/36, marcador único, alineación y comienzo de tarea dentro del margen local. [Evidencia](browser/) conserva 18 PNG y tres JSON físicos. |
| Comparación visual | Se inspeccionaron las 18 capturas nuevas con view_image y las referencias históricas 37 y 31. El editor conserva regreso, título y entrada sin la barra ni el rótulo administrativo. Categorías y recetas ya no tienen banda oscura ni título duplicado. |
| Build final | El orquestador confirma salida cero tras corregir el click. [Log](../oleada-03-build-final.log). Dist terminó a las 18:21:45 UTC. |
| E2E normal final | 47 tests pasan en 18,6 s tras corregir el click y adaptar los dos contratos visuales adicionales. [Log](../oleada-03-production-preview-final.log), [JUnit](production-final-junit.xml). La ejecución comenzó a las 18:21:50 UTC, sobre el build final. Usa respuestas HTTP controladas, no acredita servicios reales. |
| Lint global final | El orquestador confirma salida cero. [Log](../oleada-03-lint-final.log). |

Las mediciones muestran el inicio de cabecera a 24 px en escritorio y 16 px en móvil, dentro del margen de contenido. En el editor de oferta el H1 comienza a 76 px en ambos tamaños; la auditoría original situaba el inicio cerca de 171 px en escritorio. Esta comparación describe dos estados medidos, no una altura impuesta al encabezado. Todos los encabezados coinciden con el ancho de su main; las variantes de formulario y mensaje corresponden a los límites descritos arriba. El JSON de regreso confirma la query y los destinos restaurados tras categorías, recetas, entrada y oferta.

El agente no inició servidores ni ejecutó build, cobertura o E2E. El orquestador coordinó esos recursos y obtuvo los resultados finales anteriores. [browser-final](browser-final/) conserva 19 PNG y cuatro JSON de la última ejecución, sin duplicar attachments.

## Hallazgos y pendientes

U05 se propone acreditar únicamente para el montaje autónomo mediante la evidencia de navegador. El shell real está excluido por instrucción del usuario; no se afirma una validación de integración. U06 recibe la cabecera coherente de las páginas, pero conserva el aporte de UX10 para el selector final. Se aportan roles de título y alineación a U07/U08 y los marcadores a U24. El ciclo modal y U01 se repitieron en la demo integrada. Los defectos visibles de composición horizontal, acciones destructivas, guardado y microcopia continúan en sus tickets posteriores; no se ampliaron las correcciones para ocultarlos en las capturas.

Dispositivo físico, teclado virtual y lector de pantalla permanecen como validación manual pendiente según la decisión del usuario. No se atribuyen resultados de emulación a esas comprobaciones. La integración, cierre de hallazgos y liberación de reservas corresponden al orquestador. No hay procesos propios activos tras las unitarias.
