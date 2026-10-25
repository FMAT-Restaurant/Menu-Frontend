# Entrega de UX08 para revisión

Agente `/root/ux08_recipes`, ejecutor de recetas. Base recibida `620c02719196dc20b9ab785a6ac9adcf16fd2267`, rama `feature/ux-ui-improvement`, con UX00–UX07 integradas y checkpoint intacto. Producción y pruebas congeladas al comunicar la entrega al orquestador. La revisión, ejecución integrada e integración corresponden al orquestador; este documento no declara el cierre total del ticket o de los hallazgos.

## Archivos y cambios

- `src/features/recipes/RecipePage.tsx`: distingue consulta sin resultados de biblioteca vacía. Mantiene el término, ofrece limpiar la búsqueda y devuelve el foco al buscador. Conserva administración, selección, consulta/página por URL y estado local cuando se recibe `mode`. Adopta los SVG compartidos para buscar, agregar y cancelar.
- `src/features/recipes/RecipeCard.tsx`: eliminar pasa a acción secundaria discreta. Conserva callbacks, etiquetas accesibles, confirmación y restricciones de referencia de RecipePage.
- `src/features/recipes/RecipeFormDialog.tsx`: errores junto a nombre, descripción, instrucciones, insumo y cantidad; `aria-invalid` y `aria-describedby`; resumen al comienzo del formulario con foco tras envío inválido y enlaces a los controles. Identifica el índice del insumo en cada enlace. Los errores se corrigen al editar el campo. Conserva validación antes de escribir y evita validar otra vez el payload sellado durante un reintento explícito.
- `src/features/recipes/styles.css`: controles 40/48 px, radios 8/12 y metadatos de al menos 12/16. Reduce recuadros de insumos y evita controles comprimidos con `@container recipe-form (width < 768px)`. El diálogo se limita por viewport, ancho del módulo (`cqw`) y 960 px; dentro de un host ancho también responde al módulo reducido. Mantiene la lista desplazable y las acciones del formulario separadas.
- `src/features/recipes/RecipePage.test.tsx`: añade tres regresiones reales; no altera los casos existentes ni sus garantías. Dos comprueban consulta fallida, tres recetas y limpieza en administración/selección; una comprueba todas las asociaciones, foco y enlaces de validación y cero llamadas de escritura.
- `e2e/ux-ui-08.demo.spec.ts`: tres casos preparados para el turno del orquestador. Dos prueban las variantes de búsqueda. El tercero prueba envío inválido, enlaces del resumen, corrección de cantidad y creación con tres insumos y texto largo. Mide ancho útil y controles en módulo de 320, 390, 600, 740, 767, 768, 1024, 1199, 1200 y 1440 dentro de viewport de 1440. Guarda JSON/PNG físicos con nombres cortos y adjunta por path. Rechaza llamadas API y errores JavaScript; no intercepta API para controlar la demo en memoria.

No se modificaron archivos de ofertas, BASE/shared, App/main, configuración, registro común ni auditoría histórica. No se crearon commits, dependencias, servidores o builds. Las regresiones nuevas se añadieron a RecipePage.test.tsx; no se creó un archivo RecipeUx08.test.tsx separado.

## Decisión y consumidores

Se consultaron AGENTS.md, DESIGN.md, la guía de orquestación, el plan y el ticket UX08. Se aplicaron ui-ux-pro-max, unslop, React, Jest y Playwright. La consulta local `error summary validation --domain ux` encontró la recomendación específica de resumen enfocable, enlaces y errores asociados; coincide con el caso del ticket.

La decisión fue mantener el estado y la máquina de operaciones dentro de RecipeFormDialog. El cambio añade presentación de errores y no extrae otra máquina. La inspección de dependencias reutilizó `.analysis/ux-ui-wave05-dependencies.json`, con procedencia en `../resume-ux08/provenance.json`, y `depcruise-fmt -T text --focus '^src/features/recipes/RecipeFormDialog\.tsx$'`.

RecipePage usa RecipeCard/RecipeFormDialog, SearchField y almacenamiento de operaciones. RecipeFormDialog depende de las reglas de versiones, análisis de respuesta, controlador de operación, elegibilidad de reintento y coordinador de diálogos. OfferFormPage consume RecipePage y RecipeFormDialog: se conservaron sus props y callbacks, `nestedContext`, creación y selección. RecipePage añade una importación directa de Icon; el orquestador debe actualizar el grafo al integrar. El grafo estático no acredita JSX, CSS, callbacks o comportamiento del navegador.

## Comandos y resultados

| Comprobación | Resultado |
| --- | --- |
| `npx --no-install jest --runInBand --runTestsByPath src/features/recipes/RecipePage.test.tsx` antes de añadir regresiones | 25/25 existentes aprobadas en 54.566 s. Hubo avisos de act en la salida de esta ejecución inicial; no se cambiaron tests existentes. |
| `npx --no-install jest --runInBand --runTestsByPath src/features/recipes/RecipePage.test.tsx src/audit-recovery.regression.test.tsx` | Repetición final: 2 suites, 43/43 aprobadas en 15.338 s, sin avisos en `unit-final.log`. La ejecución previa también pasó en `unit.log`. |
| `npx --no-install tsc --noEmit` | Pasa, `typecheck-final.log`. El primer intento sólo detectó un import Icon sin uso en OfferCommercialInfo mientras UX09 trabajaba; se comunicó sin editar ofertas. |
| `npx --no-install eslint src/features/recipes/RecipePage.tsx src/features/recipes/RecipeCard.tsx src/features/recipes/RecipeFormDialog.tsx src/features/recipes/RecipePage.test.tsx e2e/ux-ui-08.demo.spec.ts` | Pasa, salida cero en `lint-final.log`. |
| `git diff --check -- src/features/recipes e2e/ux-ui-08.demo.spec.ts` | Pasa; Git sólo anunció conversión futura LF/CRLF. |
| Build, cobertura y E2E | No ejecutados por este agente: el orquestador centraliza salidas, servidores y navegador después de congelar UX08/UX09. |

Los casos existentes aprobados incluyen biblioteca realmente vacía y creación desde ella, selección por receta existente o creada, rechazo de eliminación por referencia/permisos/conflicto, confirmación y Escape, receta 51, artículo 101 y selección conservada entre páginas, unidad del detalle fuera de la página actual, error de inventario con reintento sin perder borrador, respuesta tardía del detalle, doble envío bloqueado y conflicto 412 sin reenvío automático. La suite de recuperación incluye versión de apertura, corrección tras 422 con nueva clave y recuperación de creación que conserva las ediciones posteriores.

## Aportes y pendientes

V07 y V08 cuentan con regresiones unitarias nuevas. V02/V03 y la repetición demo de V07/V08 tienen pruebas preparadas; requieren la ejecución y revisión visual centralizadas. V05 conserva confirmación/restricciones y reduce la jerarquía de eliminar. V18 cuenta con las suites focalizadas indicadas y espera las regresiones integradas del orquestador.

El aporte de categorías para U04 se contrastó con `../UX05/entrega.md`, correspondiente al commit integrado `6e09554`: documenta validación local, cero escrituras inválidas, foco, asociación accesible, recuperación HTTP controlada y capturas demo a 390/1024. Esa evidencia complementa recetas; las capturas y medidas nuevas de recetas aún deben examinarse antes de proponer cierre conjunto.

UX10 debe repetir U13 y la validación de recetas dentro del selector final y sus pasos. No se adelantó su flujo de un solo modal. UX11 completará la protección del borrador según D04. D01 excluye el shell real por instrucción del usuario; dispositivo físico, teclado virtual y lector de pantalla conservan la validación manual pendiente. D02/D03/D05 se mantienen sin cambios.

Solicito revisión de los cambios congelados y ejecución de `e2e/ux-ui-08.demo.spec.ts` junto con las regresiones de recetas y recuperación sobre la base integrada. No quedan procesos propios activos.

## Corrección de revisión previa al build

El orquestador detectó el título del diálogo en 20/28; se corrigió exclusivamente a la escala 22/30 de DESIGN. La UI deshabilita quitar la última fila (`supplies.length <= 1`), pero el consumidor directo RecipeFormDialog puede cargar un detalle con `supplies: []` y reemplazar las filas por esa lista vacía. Se añadió el error de sección correspondiente, asociado por `aria-describedby` al botón Agregar insumo, y un enlace en el resumen que enfoca esa recuperación. Una regresión nueva reproduce la carga de ese detalle, comprueba foco, descripción accesible y cero escrituras, agrega una fila y comprueba que el error desaparece. No se modificaron tests anteriores.

Tras esas correcciones: 2 suites y 44/44 tests aprobados en 23.045 s (`unit-review.log`), tipos aprobados (`typecheck-review.log`) y lint de los archivos reservados aprobado (`lint-review.log`). Se volvió a comunicar freeze de producción y pruebas. No se ejecutó navegador.

## Regresión integrada de altura de controles

La ejecución demo centralizada detectó Nombre en 42 px en UX03. La causa fue sustituir el nombre de contenedor compartido `menu-dialog` por `recipe-form`, perdiendo la regla común de controles de 48 px en diálogos menores de 1200 px. El contenedor conserva ahora ambos nombres (`container: menu-dialog recipe-form / inline-size`): la tabla se transforma por debajo de 768 px y la altura táctil sigue la regla común por debajo de 1200 px. El máximo de diálogo de 960 px es intencional para permitir una tabla por encima de 768 px; no altera la regla común de controles. Se fijó line-height de inputs/textarea en 20 px, evitando que texto de 24 px más padding y borde produzca 42 px cuando el control estándar sea 40 px.

La prueba UX08 amplía su medición a Nombre y botones del footer, y comprueba alturas exactas según ancho del contenedor. No se modificó UX03. Tipos aprobados en `typecheck-controls.log` y lint de la prueba aprobado en `lint-controls.log`. No se repitieron unitarias por este ajuste exclusivo de CSS y mediciones; sus 44 casos de comportamiento permanecen sin cambios. La repetición del navegador corresponde al orquestador.
