# Corrección de RC01–RC05

**Los cinco defectos de [review-closure-2026-10-23.md](review-closure-2026-10-23.md) están corregidos y verificados.** Se añadieron cinco casos unitarios y tres de navegador para los escenarios reales del informe. Los tests existentes y sus expectativas se conservaron.

Base final: `WT-f902e272e597`; HEAD `668725272aad5f44f55a00d921e45b72530e9cf6` más árbol de trabajo. SHA-256 de entradas: `f902e272e597626b7a4b698a8684a6d9b431dfc8b4c2e84f5bbdc10ac055e936`. [Procedencia](../../.analysis/closure-corrections/provenance.json), [controles](../../.analysis/closure-corrections/checks.json), [manifiesto](../../.analysis/closure-corrections/artifacts.json).

| Hallazgo | Corrección | Evidencia de aceptación |
| --- | --- | --- |
| RC01 · A01/A09 | La lectura inicial de categoría devuelve ausencia de autorización cuando detecta cambios locales. Un Guardar que la estaba esperando no recibe el nuevo ETag. | El caso RC01 exige cero PATCH tras resolver el GET tardío, conserva el nombre local y sólo permite escribir después de consultar/adoptar explícitamente la versión revisada. |
| RC02 · O13/O19/O34 | El foco usa primero el botón conectado; el fallback compara atributos mediante una consulta estática, sin interpolar el nombre del grupo en CSS. | Chromium abre/cancela una opción cuyo grupo contiene comillas, barra y corchetes, conserva editor/borrador/foco y no registra errores de página. |
| RC03 · A04/O24 | La mutación de estado conserva el intento y su primer envío. Cada envío aplica su transición; los errores conservan el ancla temporal. El handler rechaza reintentos vencidos y una consulta exitosa permite reconciliar antes de otra operación. | Timeout → reintento antes de 24 h con la misma clave/JSON/ETag → vencimiento desde el **primer** envío bloqueado. Una lectura fallida mantiene la recuperación bloqueada; otra exitosa permite un clic nuevo con otra clave y ETag revisado. |
| RC04 · O19/O34/R06 | La opción deja Escape a las capas superiores. El selector ignora Escape mientras contiene un diálogo abierto y no procesa cancelaciones de hijos. El diálogo de receta devuelve el foco al disparador conectado. | Escape recorre receta → selector → opción, cerrando una capa por pulsación y restaurando el foco. Con POST de receta pendiente, Escape no cierra el formulario; sólo hay una escritura simulada y después se selecciona la receta confirmada. |
| RC05 · O20 | KEY_REUSED e INVALID_IDEMPOTENCY_KEY ofrecen «Iniciar nueva operación». Esa acción autoriza otro guardado sin escribir; la clave nueva se genera al pulsar Guardar con el borrador vigente. | Ambos errores conservan los cambios y el If-Match original, bloquean un submit sin autorización y no hacen GET para renovar la versión. La preparación produce cero escrituras; el siguiente Guardar usa otra clave e incluye cambios hechos **después** de preparar. Una creación restaurada conserva imageId y no vuelve a subir el archivo. |

Los cinco casos unitarios se encuentran en [closure-review.regression.test.tsx](../../src/closure-review.regression.test.tsx), con [resultados nominales](../../.analysis/closure-corrections/targeted-unit.json). Los tres casos de navegador están en [closure-review-regressions.spec.ts](../../e2e/closure-review-regressions.spec.ts), con [JUnit final](../../.analysis/closure-corrections/e2e-final.xml).

Capturas actuales: [grupo con comillas y borrador conservado](../../.analysis/closure-corrections/quoted-group-fixed.png), [selector conservado y foco tras Escape](../../.analysis/closure-corrections/nested-escape-fixed.png). El [registro de navegador](../../.analysis/closure-corrections/browser-evidence.json) identifica Chromium 156.0.8078.4, viewport 1366×768 y cero errores de página. Las capturas proceden de otro preview temporal del mismo build, con lecturas simuladas y escrituras prohibidas.

## Controles integrados en la base final

| Comando | Resultado |
| --- | --- |
| `npm run typecheck` | PASS; [log](../../.analysis/closure-corrections/typecheck-final.log) |
| `npm run lint` | PASS; [log](../../.analysis/closure-corrections/lint-final.log) |
| `npm run test:unit -- --silent` | **32 suites / 491 casos PASS**, umbrales sin cambios; [log](../../.analysis/closure-corrections/unit-final.log) |
| `npm run build` | PASS, 125 módulos; [log](../../.analysis/closure-corrections/build-final.log) |
| `npm run test:e2e` | **46 PASS**, sin omitidos ni fallos, preview nuevo del build comprobado; [log](../../.analysis/closure-corrections/e2e-final.log) |

El E2E se ejecutó con `CI=1`, dos workers y `reuseExistingServer=false`. Se conservaron los avisos del proxy hacia el backend :8080; no se usan como prueba de integración con el backend real. Los previews propios de estas comprobaciones se cerraron.

El [grafo actualizado](../../.analysis/closure-corrections/dependencies.json) contiene 123 módulos y 320 relaciones, sin ciclos ni imports sin resolver. Mantiene las tres clasificaciones previas: test-setup/jest-dom como dependencia de desarrollo y avisos de configuración huérfana para Jest/runtime-config. No se modificó la configuración para ocultarlas.

Respecto a `WT-fb9993200891`, cambian cinco archivos productivos —categoría, formulario/listado de ofertas, modal de opción y diálogo de receta— y se añaden los dos archivos de regresión. Las otras 106 entradas del manifiesto original permanecen idénticas; no se elimina ninguna. Todos los CSS, contratos de API, configuración y umbrales conservan su hash. El trabajo previo, la reorganización documental y los archivos ajenos a esta corrección se preservan. No se creó un commit.

## Evidencia histórica y alcance del cierre

Las nueve condiciones originales reabiertas por RC01–RC05 son A01, A04, A09, O13, O19, O20, O24, O34 y R06. Sus escenarios señalados en la revisión quedan corregidos con la evidencia anterior y con toda la suite integrada aprobada. No quedan defectos RC01–RC05 pendientes.

La matriz original sigue conservando exactamente 104 IDs, condiciones, gravedades y responsables. Sus fichas nominales, las comparativas reconstruidas de T16 y el zoom nativo al 200 % pertenecen a `WT-fb9993200891`. No se presentan esas capturas como tomadas en la base nueva ni se afirma haber repetido el zoom nativo en esta corrección. Los CSS permanecen idénticos y la suite actual vuelve a comprobar geometría, teclado, Escape y foco; el alcance temporal de cada evidencia se conserva explícito.

El cierre y la acreditación originales se conservaron antes de actualizar sus enlaces en [antecedentes](../../.analysis/closure-corrections/antecedents/docs/audit/closure-2026-10-22.md). Esta adenda sustituye el dictamen de defectos pendientes de la revisión y documenta la validación funcional vigente; no convierte un conjunto de capturas históricas en otra ejecución visual.

Durante las comprobaciones se corrigieron dos problemas de la preparación de los **nuevos** tests: se proporcionaron las APIs `URL.createObjectURL/revokeObjectURL` ausentes de jsdom, restaurando sus descriptores después de cada caso; y se ejecutó el comando unitario canónico sin los flags JSON que esta versión de npm rechazaba. No se alteraron tests existentes para hacerlos pasar. La prueba nueva de foco falló primero en Chromium; se corrigió el diálogo de receta y después pasó con la suite completa. Los intentos previos fallidos no se cuentan como aprobados.
