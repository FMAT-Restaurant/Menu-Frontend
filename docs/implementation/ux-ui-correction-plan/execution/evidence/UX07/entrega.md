# Entrega de UX07

Ticket: UX07, estado inexistente y presentación de entradas. Agente: `/root/ux02_foundation`. Base: `0e375aa`, rama `feature/ux-ui-improvement`. Requisito UX04 integrado. Estado solicitado: en revisión con evidencia final de navegador, para integración por root.

## Archivos y cambios

- `src/features/entries/useEntryResources.ts` conserva `entryLoadFailure` tipado y mantiene el texto `entryError` compatible. Los efectos y reintentos de entrada y categorías conservan su independencia.
- `src/features/entries/EntryFormPage.tsx` distingue el 404 de lectura y presenta contexto con una salida al catálogo. El 404 no monta el formulario, no ofrece guardar ni reintentar una entrada inexistente. Los filtros del catálogo se conservan en el retorno válido.
- `src/features/entries/EntryCategorySelector.tsx` usa búsqueda y cierres SVG, etiqueta visible para buscar y geometría consistente. Conserva el cierre exterior por click que corrigió UX04.
- `src/features/entries/EntryImageField.tsx` conserva archivo, URL, referencia y fallback de imagen, y usa el SVG compartido en el estado sin vista previa.
- `src/features/entries/styles.css` adopta tokens, controles 40/48, tipografía, radios 8/12 y espacios de base 4. El contenedor propio del formulario determina el cambio a una columna.
- `src/features/entries/EntryFormPage.ux.test.tsx`, nuevo, cubre ausencia, reintento temporal y categorías tardías.
- `e2e/ux-ui-07.demo.spec.ts` y `e2e/ux-ui-07.spec.ts`, nuevos, separan tres casos demo de tres escenarios HTTP controlados y persisten PNG/JSON con nombres cortos.

No se amplió la reserva a `useEntryForm.ts`, `entryError.ts`, `EntryFormFeedback.tsx`, BASE, App, main, catálogo o categorías. No se editaron tests existentes ni configuración E2E, registro común o auditoría histórica. No se iniciaron servidores ni se ejecutaron E2E, build o cobertura desde este agente. No se crearon commits.

## Comportamiento y contratos conservados

`useEntryForm` ya propaga por spread los recursos hacia el modelo, por lo que el tipo de fallo llega a la página sin cambiar su lógica de negocio. La clasificación existente de `entryFailure` sigue siendo la autoridad. El cambio de estado inexistente solo responde al 404 de lectura de la entrada; un error de escritura o revisión mantiene su borrador y recuperación.

El error temporal conserva Reintentar entrada. Categorías lentas no bloquean identidad ni imagen y no provocan otra lectura de entrada. Las categorías asignadas mantienen su identidad aunque aún no se conozca su nombre. Su llegada actualiza el nombre sin reiniciar el borrador.

Se mantienen el resumen de validación y el mecanismo `revealFocusedControl` que revela un control cubierto por el footer. El selector sigue cerrándose en click, después de entregar el evento al control que guarda. No se alteraron ETag, payload, idempotencia, versiones, incertidumbre, cancelación ni políticas de reenvío. La protección al abandonar y el feedback tras guardar pertenecen a UX11 y UX13.

## Verificaciones ejecutadas

| Comando o caso | Resultado y entorno |
| --- | --- |
| Jest EntryFormPage, EntryFormPage.ux y entryError | 3 suites, 75 tests pasan. `unit.log`. |
| Casos unitarios nuevos | 404 sin campos ni retry, 503 con segunda lectura de entrada y una de categorías, categorías tardías que conservan edición, asignación e imagen. |
| `npm run typecheck` | Pasa en la comprobación final guardada en `typecheck.log`. Un primer intento durante edición concurrente encontró errores transitorios en el test nuevo de categorías, fuera de la reserva UX07; no se editaron esos archivos. |
| ESLint de los archivos TS/TSX propios y regresiones | Pasa. `lint.log`. |
| Dependencias | Índice src regenerado sin cambiar configuración; `dependencies.json`, `dependencies.log` y `neighbors.txt`. Imports contrastados con `useEntryForm`. No acredita CSS ni conducta. |
| Demo integrada final | 32 pruebas pasan en 43,3 s después del ajuste de altura, log `../oleada-04-demo-final.log`. Incluye los tres casos UX07, cero API y cero errores JavaScript en ellos. |
| Producción preview final | 52 pruebas pasan en 18,6 s, log `../oleada-04-production-preview-final.log` y `http-final-junit.xml`. Incluye los tres escenarios HTTP UX07 y regresiones existentes. Los casos usan respuestas HTTP controladas, no servicios reales. |

No se identificaron tests existentes incompatibles con el requisito nuevo y no se modificaron sus expectativas. La evidencia de las pruebas de guardado exterior de UX04 debe repetirse por el integrador junto con las regresiones afectadas.

## Navegador y revisión de geometría

La primera ejecución conjunta con UX05 y UX06 aprobó 32 casos en 49,7 s, incluidos los tres demo de UX07. Se preservaron tres PNG y tres JSON en `browser/`, y se inspeccionaron visualmente la ausencia reconocible, el formulario con módulo estrecho en host ancho y el resumen de validación con foco por encima del footer.

La revisión de las medidas encontró una condición insuficiente en la primera comprobación de altura mínima: en escritorio nombre medía 40 px, categorías 42 px y Guardar 43 px. Se conservaron datos y captura anteriores en `height-before/`. Se corrigieron la altura de línea del selector y la alineación flex del footer, y se reforzó la regresión para exigir 40/48 exactos en una línea y permitir crecimiento suficiente cuando el texto envuelve. La repetición integrada aprobó 32 casos en 43,3 s. El [JSON final](browser/form-width.json) confirma los tres controles de una línea a 40 px estándar o 48 px estrecho; Guardar de dos líneas a 320 px crece a 58 px sin recorte. El análisis está en [height-investigation.md](height-investigation.md).

Los tres casos demo comprueban `/entries/audit-missing-entry/edit`, formulario real a anchos útiles 320, 390, 600, 740, 767, 768, 1024, 1199, 1200 y 1440 px dentro de un viewport ancho, y resumen/foco por encima del footer. Rechazan llamadas API y errores JavaScript.

Los tres casos HTTP aprobados usan respuestas identificadas de producción preview: [404](browser/http404.json), [503 seguido de carga correcta](browser/temporary.json) y [categorías retenidas](browser/late-categories.json) mientras se edita identidad y se selecciona una imagen. Las lecturas son una entrada para 404, dos entradas y una de categorías para 503, y una de cada recurso para la categoría tardía. Los tres registran cero escrituras y cero errores JavaScript. Se inspeccionaron sus tres capturas; la imagen seleccionada conserva su URL blob y su archivo draft.png después de llegar las categorías. No equivalen a integración con servicios reales y no interceptan API para controlar la demo en memoria.

La evidencia propia final queda preservada con seis PNG y seis JSON en `browser/`, y el diagnóstico anterior permanece en `height-before/`. El primer JUnit 51/52 se conserva aparte porque falló un paso antiguo de overlay de catálogo, ajeno a los tres HTTP UX07 que ya pasaban; el JUnit final refleja 52/52 después de adaptar ese paso al enlace Ver ofertas de U11.

Se propone acreditar U14 en demo y HTTP controlado tras la revisión e integración de root. Los aportes U03, U07, U08, U09, U19 y U22 conservan la dependencia de los demás consumidores. UX11 y UX13 siguen pendientes para sus comportamientos posteriores. Dispositivo físico, teclado virtual y lector conservan validación manual pendiente; el shell real está fuera del alcance actual por instrucción del usuario.

El análisis de alcance y relaciones se conserva en [impact.md](impact.md).
