# Revisión de UX07 en la oleada 4

Revisor `/root/ux00_baseline`, solo lectura. Base `0e375aa` con cambios de la oleada compartida. Único archivo escrito durante esta revisión: este informe. No se modificaron aplicación, tests, evidencia del ejecutor ni registro; no se ejecutaron servidores, tests ni build.

Estado: revisión final favorable para integrar UX07. El defecto de alturas 40/42/43 se corrigió y se verificó con medidas exactas. La suite normal y la demo integradas posteriores a la corrección están aprobadas. El orquestador conserva la decisión de integración y el registro de hallazgos.

## Contratos examinados

`useEntryResources` conserva ahora EntryFailure en lugar de reducirlo prematuramente a texto. Mantiene entryError como proyección compatible para los consumidores actuales. EntryFormPage utiliza únicamente el kind notFound del fallo de lectura para sustituir el formulario por un estado inexistente. La clasificación sigue en entryError.ts, sin cambiar su contrato ni tratar 503, problemas de acceso o fallos de escritura como entrada inexistente.

El estado 404 muestra contexto y salida al catálogo sin campos de alta, botón Guardar ni reintento inútil. El retorno conserva las consultas del catálogo cuando procede y descarta destinos internos distintos del catálogo para esa salida. Las pruebas unitarias nuevas comprueban el regreso con filtros y una sola lectura.

Los dos efectos de recursos siguen separados. Categorías dependen de su propio contador de reintento y del repositorio; entrada depende de su identidad y reintento, con callback onLoaded estable. No se añadió un cambio de categorías a las dependencias de la lectura de entrada. Las respuestas abortadas siguen ignoradas y la llegada tardía de categorías conserva IDs asignados mediante sus representaciones provisionales.

No hay diff en useEntryForm, entryError ni EntryFormFeedback. Se conserva el control de versión, idempotencia, incertidumbre, subida separada y guardado. La condición de disponibilidad de identidad no exige que hayan terminado las categorías. La política de guardado sin categorías continúa bajo el modelo existente.

EntryImageField añade un SVG decorativo al fallback sin cambiar selección, preview por URL de objeto, revocación, fuente actual ni referencia persistente. EntryCategorySelector cambia representación visual y etiqueta de búsqueda, conservando selección, limpieza, Escape, foco y el cierre exterior en click integrado por UX04.

## Presentación y evidencia demo

La suite integrada `../oleada-04-demo.log` aprobó 32 casos en 49.7 s. Los tres casos UX07 comprueban ausencia demo, formulario real con imagen y categorías, y resumen con revelación de foco. Los guards rechazan API y errores JavaScript. Se abrieron las tres capturas y se leyeron sus JSON antes de liberar test-results para la ejecución normal del orquestador.

La captura 404 en 390 px presenta Entrada no encontrada y una salida visible al catálogo, sin formulario deshabilitado. La captura del módulo de 600 px dentro de viewport 1440 mantiene identidad, imagen y categoría seleccionada. La de validación en 390 × 500 muestra el resumen y el campo de nombre con mensaje debajo y foco visible.

El JSON de anchos comprende módulos de 320, 390, 600, 740, 767, 768, 1024, 1199, 1200 y 1440 px dentro de un viewport de 1440. El formulario no presenta desbordamiento horizontal y cambia entre una y dos columnas según su propio ancho. Se verifican radios de tarjeta 12 y campo 8. La imagen conserva su fuente y la categoría mantiene su ID y nombre.

El mecanismo revealFocusedControl y su ejecución al capturar foco permanecen en el formulario. La medida de validación registra el campo entre y290 e y338 y el comienzo del footer en y427. Así el control inválido queda visible por encima de las acciones después de enfocar, además de conservar el resumen. No se deduce esa propiedad solo de la captura fullPage, que puede dibujar un footer sticky en mitad del documento extendido.

## Observación geométrica comunicada

En módulos de 1200 y 1440 el input mide 40 px, el disparador de categorías 42 px y Guardar 43 px. El test comprueba el mínimo, por lo que no detecta una altura uniforme exacta de 40. La diferencia procede del contenido, padding y estiramiento del layout; no se afirma que sea una regresión nueva del comportamiento de guardado. El orquestador confirmó que es un defecto de adopción para controles de una línea y lo devolvió al ejecutor. La corrección y su repetición de medidas deben verificarse antes de integrar.

En 320 px Guardar alcanza 58 px al repartir el texto en varias líneas. Ese crecimiento conserva la legibilidad y no debe corregirse encogiendo el texto ni reduciendo el área táctil. Los demás tamaños móviles observados mantienen al menos 48 px.

## Verificaciones funcionales y pendientes

El log `../UX07/unit.log` acredita tres suites y 75 pruebas aprobadas, incluidas las existentes de EntryFormPage y entryError. Los nuevos casos separan 404, reintento temporal y categorías tardías; no se modificaron tests existentes para obtener ese resultado. Los tipos, lint y build globales de la oleada fueron aprobados por el orquestador antes de la demo.

La ejecución `../oleada-04-production-preview.log` aprobó los tres escenarios HTTP UX07. Se leyeron sus tres JSON y se abrieron sus tres capturas. El 404 registra una lectura y cero escrituras; el caso temporal registra dos lecturas de entrada y una de categorías; categorías tardías registra una lectura de cada recurso, cero escrituras y conservación del archivo seleccionado. Los tres registran cero errores JavaScript. Las capturas muestran el estado inexistente y los formularios recuperados con identidad e imagen. Ningún escenario de fixtures HTTP acredita un backend real.

La primera corrida global de producción preview tuvo 51 aprobados y un fallo de offers.spec ajeno a esos tres escenarios. La repetición final `../oleada-04-production-preview-final.log` aprobó los 52 casos en 18.6 s, incluidos los tres HTTP de UX07. La demo posterior `../oleada-04-demo-final.log` aprobó 32 casos en 43.3 s. El resultado final se distingue del fallo previo y corresponde a la base corregida.

## Corrección geométrica verificada y recomendación

Se leyó el JSON final form-width y se abrió su captura. Nombre, categorías y Guardar miden exactamente 40 px en módulos de 1200 y 1440, y 48 px en los módulos de 390 a 1199. En 320, los dos primeros mantienen 48 y Guardar mide 58 con dos líneas completas. El footer usa align-items center y el selector una línea de 20 px, eliminando el incremento involuntario sin recortar texto. El JSON registra cero desbordamiento horizontal en los diez tamaños y conserva el cambio a columnas por ancho útil del formulario.

La regresión distingue de forma explícita controles de una línea y etiquetas envueltas; el crecimiento permitido en 320 está sustentado por sus líneas, padding y bordes medidos. Esta comprobación detecta el defecto real observado y no sustituye su corrección por una expectativa más débil. La evidencia previa de la diferencia permanece separada en `../UX07/height-before/`.

No quedan defectos bloqueantes de UX07 en el alcance revisado. Se recomienda integrar y acreditar U14 para la ausencia demo y HTTP comprobadas. Los aportes U03, U07, U08, U09, U19 y U22 necesitan su matriz de consumidores. UX11 y UX13 mantienen protección al abandonar y feedback de regreso. El shell real está excluido por instrucción del usuario; dispositivo físico, teclado virtual y lector conservan validación manual pendiente. Esta aprobación no cierra la auditoría completa.
