# Revisión del cierre RV14–RV16 y T18

Revisión del 23 de octubre de 2026 sobre [closure-2026-10-22.md](closure-2026-10-22.md).

> **Seguimiento: RC01–RC05 corregidos y verificados.** La [adenda de corrección](corrections-closure-2026-10-23.md) registra la base actual, cinco regresiones unitarias, tres E2E y los controles completos: 491 unitarias / 46 E2E PASS. El diagnóstico y las reproducciones siguientes se conservan como antecedentes de la base revisada.

**Resultado: cinco defectos confirmados —dos P1 y tres P2— impiden sostener la acreditación completa de T18.** La trazabilidad recupera los 104 IDs originales, pero persisten incumplimientos de comportamiento en condiciones que figuran como acreditadas. No se modificaron el código productivo, los tests existentes ni las evidencias originales del cierre.

La base examinada coincide con la del informe: HEAD `668725272aad5f44f55a00d921e45b72530e9cf6` más árbol de trabajo, SHA-256 de entradas `fb9993200891b82e284b95fb3ea54caeb75070447e1bc48e14ecbf657022b39d`. Se comprobaron los 111 hashes de entradas y los 271 hashes de artefactos, sin diferencias. Los defectos siguientes pertenecen a esa base; no son consecuencia de cambios posteriores.

## Hallazgos

### RC01 · P1 · Guardar antes de terminar el GET permite sobrescribir con una versión no revisada

Ubicación: [CategoryFormDialog.tsx](../../src/features/categories/CategoryFormDialog.tsx), líneas 172–176 y 446–461. Condiciones afectadas: **A01, A09**; plan 3.2.1 y recorrido integrado 11.

Reproducción: abrir una categoría que muestra el resumen `Original / Anterior`; mantener pendiente su GET de apertura; cambiar el nombre a `Local`; pulsar Guardar; resolver entonces el GET con una descripción concurrente y ETag `"v2"`.

El guardado termina llamando a `updateCategory("c1", {name: "Local", description: "Anterior"}, '"v2"')` sin que el usuario haya revisado la descripción concurrente. La nueva comprobación de `userEditedRef` llama a `setReviewRequired(true)`, pero devuelve el recurso versionado. El handler que ya estaba esperando la promesa toma su ETag y continúa con el valor `reviewRequired=false` capturado antes del `await`. Así se autoriza el borrador viejo con una versión nueva y se puede perder el cambio remoto.

La prueba del cierre resuelve el GET **antes** de pulsar Guardar y no cubre este orden. La reproducción adicional exige cero PATCH y recibe uno. Es necesario que la decisión de autorizar la escritura después del `await` consulte un estado vigente o un resultado explícito de lectura aceptada; la rama que exige revisión no debe suministrar autorización al guardado pendiente.

Evidencia: caso `category must not PATCH a stale draft when Save precedes the opening GET response` en [reproduction.test.tsx](../../.analysis/closure-review/reproduction.test.tsx), [resultado Jest](../../.analysis/closure-review/reproduction-results.json) y [log](../../.analysis/closure-review/reproduction.log).

### RC02 · P1 · Un nombre de grupo con comillas desmonta el editor al cerrar una opción

Ubicación: [OfferFormPage.tsx](../../src/features/offers/OfferFormPage.tsx), líneas 321–328. Condiciones afectadas: **O13, O19, O34**; recuperación del foco y conservación del borrador.

Reproducción en Chromium: crear el grupo `Menú "especial"`; abrir Agregar opción; pulsar Cancelar. El efecto de restauración de foco construye `button[aria-label="Agregar opción a Menú "especial""]`. `querySelector` lanza una excepción de selector inválido y React desmonta la página; desaparece incluso el encabezado Nueva oferta. Los datos que aún no se habían enviado no tienen por qué estar almacenados, porque el controlador sólo persiste cuando ya existe un intento.

El fallback se calcula incondicionalmente, incluso cuando el botón guardado en `optionModalTriggerRef` sigue conectado. Debe evitarse interpolar texto del usuario en el selector y resolverse el fallback sólo si hace falta, mediante una identidad estable o una búsqueda segura por atributo.

Evidencia: `quoted slot name and option cancellation` en [browser-results.json](../../.analysis/closure-review/browser-results.json), [reproducción de navegador](../../.analysis/closure-review/browser-probes.mjs) y [captura del editor desmontado](../../.analysis/closure-review/quoted-slot-cancel.png). Error observado: `Failed to execute 'querySelector' ... is not a valid selector`; `editorRemains=false`.

### RC03 · P2 · Cambiar estado desde el listado permite reenviar una clave después de 24 horas

Ubicación: [OffersPage.tsx](../../src/features/offers/OffersPage.tsx), líneas 473–483 y tratamiento de errores posterior. Condiciones afectadas: **A04, O24**; plan 3.4.7 y recorrido integrado 16.

Reproducción: cambiar el estado de una oferta desde su tarjeta; recibir timeout; avanzar el reloj 24 horas y un segundo; pulsar Reintentar cambio de estado. Se ejecuta un segundo `setOfferStatus` con la mutación pendiente y su misma clave, cuando el cliente ya debe detener la recuperación y reconciliar.

El listado crea `statusAttempt` con `createSealedAttempt`, que deja `firstSentAt=null`, pero no aplica `applyAttemptSendStart` al enviarlo. En el timeout tampoco actualiza el intento. `canManualRetryAttempt` no puede calcular el vencimiento sin ese ancla y sigue autorizando el clic. La corrección del cierre para `OfferFormPage` no alcanza este consumidor del mismo PATCH protegido.

Es necesario registrar el primer envío y mantener el ciclo de vida del intento en todas las ramas; el límite debe comprobarse también en el handler, antes de la llamada al repositorio. El paso del tiempo no debe generar otra operación ni repetir la vencida.

Evidencia: `offer status recovery must not resend the same key after 24 hours` en [reproduction.test.tsx](../../.analysis/closure-review/reproduction.test.tsx). El [resultado](../../.analysis/closure-review/reproduction-results.json) recibe dos llamadas cuando exige una.

### RC04 · P2 · Escape en la creación anidada de receta también cierra el selector inferior

Ubicación: [OfferFormPage.tsx](../../src/features/offers/OfferFormPage.tsx), líneas 376–387. Condiciones afectadas: **O19, O34, R06**; regla de que sólo el diálogo superior atiende Escape.

Reproducción en Chromium: nueva oferta → grupo → opción → Elegir receta → Nueva receta; escribir un nombre; pulsar Escape. Se cierra Nueva receta y también Biblioteca de recetas. Sólo permanece la opción, en lugar de regresar al selector.

El listener global instalado mientras `recipePickerOpen` es verdadero cierra el selector ante cualquier Escape, incluso si el diálogo de receta ocupa la capa superior. No distingue quién es propietario del evento. La prueba existente comprueba Escape en el selector sin abrir una receta encima, por lo que no acredita la pila completa. El selector debe atender Escape únicamente cuando él sea el diálogo superior y permitir que la receta gestione su cancelación y sus bloqueos.

Evidencia: `nested recipe Escape` en [browser-results.json](../../.analysis/closure-review/browser-results.json), `pickerRemains=false`; capturas [antes](../../.analysis/closure-review/nested-before-escape.png) y [después](../../.analysis/closure-review/nested-after-escape.png).

### RC05 · P2 · El formulario de oferta queda sin recuperación tras KEY_REUSED

Ubicación: [OfferFormPage.tsx](../../src/features/offers/OfferFormPage.tsx), líneas 1001–1005 y controles de recuperación. Condición afectada: **O20**; tratamiento separado de conflictos de idempotencia en el plan 3.4.

Reproducción: guardar una oferta válida; devolver HTTP 409 con `error.details.code=IDEMPOTENCY_KEY_REUSED`. Se muestra el mensaje, pero no existe una acción para iniciar expresamente otra operación conservando el borrador. Volver a pulsar Guardar tampoco la prepara: `requires_new_key` queda fuera de la lista de estados que llaman a `startNewAttemptFromEditableDraft`, y el controlador rechaza el intento porque necesita otra clave. El mismo callejón sin salida afecta a `INVALID_IDEMPOTENCY_KEY`.

El clasificador sí distingue ambos errores y permite una operación nueva; el consumidor no conecta esa salida. Es necesario un control explícito que prepare la nueva clave conservando el borrador y la imagen confirmada cuando corresponda. No debe rotarse la clave automáticamente al recibir el error. La salida actual de cancelar y volver a abrir descarta el trabajo local.

Evidencia: `offer KEY_REUSED provides an explicit new-operation recovery action` en [reproduction.test.tsx](../../.analysis/closure-review/reproduction.test.tsx), [resultado Jest](../../.analysis/closure-review/reproduction-results.json). Las pruebas que T18 enlaza para este error prueban principalmente el clasificador, no que exista una continuación utilizable en el formulario.

## Alcance comprobado y límites

Se contrastaron el cierre, los requisitos originales y su matriz vigente; las cuatro variantes de PATCH, el validador y los consumidores de opciones; categoría y concurrencia de apertura; controlador de operaciones, recuperación de oferta e imagen, reconciliación e intención de receta; pertenencia y cambio de contexto; listado de ofertas; detalle, paginación y edición de recetas; scripts y registros visuales; y los casos nominales vinculados a los ocho altos y DEC-01/DEC-02. El grafo del cierre se reutilizó después de verificar sus hashes y los de sus entradas. Las aristas se contrastaron con imports reales de los consumidores afectados.

La identidad, condición, gravedad y dueño de las 104 filas coinciden con la sección 7 del plan, sin duplicados ni IDs ajenos. Las cuatro variantes de contrato y sus omisiones se encuentran implementadas; esta revisión no detectó un defecto confirmado de RV14. La procedencia de las capturas reconstruidas y del zoom asistido está descrita de forma explícita y coincide con los artefactos examinados. Eso acredita trazabilidad y ejecución de esos recorridos, pero no cubre los escenarios omitidos que reproducen RC01–RC05.

Se descartaron dos sospechas mediante contraste y ejecución: el POST de oferta vencido bloquea el reenvío y conserva el borrador conforme al límite conservador del plan; la paginación de Inventario de una receta con tres páginas cabe dentro del diálogo a 320×568, con overflow global de 0 px. El informe no solicita habilitar silenciosamente otra creación tras el vencimiento.

| Comprobación de esta revisión | Resultado |
| --- | --- |
| `npm run typecheck` | PASS; [log](../../.analysis/closure-review/typecheck.log) |
| `npm run lint` | PASS; [log](../../.analysis/closure-review/lint.log) |
| Cinco archivos unitarios existentes de las áreas afectadas | **102 PASS**; [log](../../.analysis/closure-review/existing-tests.log), [JSON](../../.analysis/closure-review/existing-tests.json) |
| Cuatro comprobaciones adicionales de revisión | **3 fallan / 1 pasa**; los tres fallos confirman RC01, RC03 y RC05; [log](../../.analysis/closure-review/reproduction.log) |
| Navegador Chromium 156.0.8078.4, preview temporal nuevo del build acreditado | Confirma RC02 y RC04; control de paginación móvil aprobado; [resultados](../../.analysis/closure-review/browser-results.json) |
| Procedencia y matriz | 111 entradas y 271 artefactos coinciden; 104 condiciones originales coinciden; [verificación](../../.analysis/closure-review/verification.json) |

Las pruebas adicionales se conservaron en `.analysis/closure-review`, fuera del conjunto habitual, como reproducciones de defectos reales. No se cambiaron assertions ni fixtures de los tests existentes. No se repitieron las suites completas de 486 unitarias y 43 E2E ni el build; sus resultados del cierre se verificaron como antecedentes de la misma base. Las comprobaciones de navegador usaron un preview nuevo de ese build, con lecturas de API simuladas y sin escrituras al backend. Las conexiones entre el navegador y un servidor del sandbox fallaron; ejecutar navegador y preview temporal en el mismo entorno autorizado resolvió el impedimento. Ambos servidores propios de esta revisión fueron detenidos.

Reproducción unitaria: `node node_modules/jest/bin/jest.js --runInBand --coverage=false --testMatch '**/.analysis/closure-review/*.test.tsx'`. Comparación con casos existentes: mismo comando con `--runTestsByPath` y los cinco archivos enumerados en `existing-tests.log`. Navegador: `node .analysis/closure-review/browser-probes.mjs`, con `PLAYWRIGHT_BROWSERS_PATH` dirigido a la instalación local de Chromium; el script inicia y cierra su preview en 4188.

**Dictamen:** RV15 corrige la composición de la matriz, pero su afirmación de que todas las condiciones están acreditadas sigue contradicha por las reproducciones. Deben reabrirse las condiciones afectadas, corregirse estos defectos y repetirse las comprobaciones correspondientes antes de mantener «T18 acreditado, ningún pendiente». El cierre y T16/T18 originales se conservaron sin cambios para que esta revisión sea contrastable con la base que evaluó.
