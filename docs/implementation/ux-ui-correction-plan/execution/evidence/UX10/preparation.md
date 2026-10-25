# UX10 · preparación provisional

Sólo lectura de aplicación. No implementa UX10 ni acredita U16/U27. Requiere desbloqueo explícito del integrador y revalidación después de integrar UX08 y UX09. Única escritura de esta preparación: este archivo. Sin tests, E2E, servidores, build, cobertura, commits o subdelegación.

Base de trabajo observada: `f64c2829d15635b76a5fc660ab47cd37c61e0452`, documentación sobre base funcional `620c02719196dc20b9ab785a6ac9adcf16fd2267`. Recetas y ofertas pueden cambiar durante esta lectura. Las líneas son orientativas; reubicar por símbolo.

Fuentes: ticket `tickets/oleada-06-ux10.md`, plan, `orchestation.md`, README de tickets, `docs/DESIGN.md`, AGENTS raíz; skills pre-change-dependency-analysis, dependency-cruiser-impact, vercel-react-best-practices, ui-ux-pro-max y playwright-best-practices. La pregunta acotada es dónde alojar estado y recuperación para sustituir tres contenedores por un diálogo sin alterar escrituras.

## Evidencia de dependencias y límites

Se reutilizaron `.analysis/ux-ui-wave05-dependencies.json` mediante sus vecinos y procedencia guardados en `execution/evidence/resume-ux08/`. Procedencia: ámbito `src`, `.dependency-cruiser.cjs`, `tsconfig.json`, hash de grafo `16C8D4A45EBC6E0404738C69C786BCFD1D5DAE4144FF2B8B540E8BE803BEAF19`, generado en base `620c027`. Es índice estático anterior a UX08/09; no demuestra comportamiento actual ni ausencia de consumidores.

Relaciones que deciden el límite: OfferFormPage importa RecipePage y buildRecipeCreateScope de RecipeFormDialog; RecipePage importa RecipeFormDialog; ambos formularios consumen useTaskDialog. RecipeFormDialog consume operationAttempt, entryVersion, idempotencyResponse, pendingOperationStorage y useRetryEligibility. OptionModal consume optionDraft. Las pruebas consumidoras se localizaron con `rg`, no están acreditadas por el ámbito src del grafo como relaciones de ejecución. No se generó otro grafo ni callgraph global.

## Contratos que se deben conservar

| Entrada o salida actual | Evidencia y conservación |
| --- | --- |
| OptionModalProps | isOpen, slotName, initialData, isCreateMode, onSave, onClose, onOpenRecipePicker, onChangeDraft; isNestedPickerOpen es coordinación de estructura antigua. |
| Borrador de opción | OptionModal.handleDisplayNameChange/handleStatusChange y handleSubmit conservan localId, optionId, originalSourceType, status, sourceType y recipeAssignmentToken. Al pasar de paso no reinicializar por cambios de initialData/isOpen. validateOptionDraft sigue siendo puerta de guardado. |
| Asignación | OfferFormPage.handleSelectRecipe (~880) mantiene nombre personalizado, identidad y estado, marca hasRecipeAssignmentIntent, genera recipeAssignmentToken y limpia campos de inventario. Sólo actualiza currentOptionDraft; guardar opción y guardar oferta siguen acciones separadas. Mantener omisión contractual de recipeId si no hubo reselección explícita, incluso de la misma receta. |
| Listado | RecipePage conserva draftSearch, confirmedQuery/currentPage, resultados, retry, loading/error y AbortController. Administración sin propMode usa URL q/page; selección con propMode usa memoria. No escribir búsqueda del selector en URL de oferta. |
| Creación/edición | RecipeFormDialogProps: openingResource, recipe, inventoryItems, repository, storage, initialPendingRecord, nestedContext, onCreated, onCreatedWithPendingEdits, onUpdated y fallback onSubmit. Mantener también consumidores directos de pruebas. |
| Éxito | executeCreationFlow llama onCreated y después onClose si no hay ediciones posteriores. RecipePage.handleRecipeCreated asigna automáticamente sólo en selección. onCreatedWithPendingEdits mantiene formulario abierto como edición y NO asigna/cierra todavía. No convertir ambos callbacks en un único “éxito”. |

RecipeFormDialog contiene la máquina real: getOrInitController crea un único createOperationAttemptController con scope recipe-form/recipe-create por tabId, retainConfirmedResult y payload sellado; executeCreationFlow distingue submit/retry, pre_commit_rejected, PreSendStorageError y OperationRetryBlockedError. El retry usa attempt sellado y clave existente, no el borrador posterior. La restauración no envía POST. Edición usa getRecipe/ETag fuerte, revisión explícita ante 412 o incertidumbre, handleReviewRecipe y handleAdoptReview. Preservar la versión del mismo recurso que suministró campos, sin renovar ETag y guardar automáticamente.

Conservar efectos de inventario (consulta/página/abort, knownItems para seleccionados fuera de página), claves estables de filas, validación por campo añadida por UX08, userEditedRef y protección contra lectura tardía, busy/isSubmittingRef, pendingAttempt/useRetryEligibility, confirmedResult y editableDraft. No trasladar lógica de escritura a RecipeSelector.

## Decisión propuesta y contrato acotado

Un contenedor de tarea, propiedad del flujo de opción, conserva **un solo nodo dialog** y **una sola llamada useTaskDialog durante toda la tarea**. Cambiar el paso no desmonta/reabre ese nodo. Su estado discriminado es option / selectRecipe / createRecipe; confirmación D04 se representa dentro del mismo contenido, sin otro diálogo. El título accesible y destino inicial de foco dependen del paso.

1. Extraer el cuerpo operativo de RecipeFormDialog a un controlador/hook compartido y RecipeFormContent. Mantener RecipeFormDialog como adaptador modal administrativo que usa ese mismo controlador y contenido. El controlador permanece montado en el dueño de sesión de creación al volver a selección u opción; el contenido puede desmontarse. Así no quedan diálogos ocultos abiertos ni una segunda máquina. No basta añadir una prop inline si regresar desmonta el componente que posee estado.
2. Contrato de sesión: mismas entradas operativas que RecipeFormDialog (sin dialogRef ni showModal); salida de campos/validación/estado, acciones submit/retry/startNew/review/adopt, y distinción `requestBack` / `discard` / `confirmedClose`. Retroceder conserva borrador y controlador; abandonar explícitamente ejecuta abandonFlow. Busy mantiene bloqueo existente. Un resultado incierto permanece en creación con recuperación visible y sin reenvío.
3. Extraer RecipeSelector de la rama selection de RecipePage. Recibe repository reducido a listRecipes, contexto de grupo, estado controlado `{draftSearch, query, page}` y callbacks cambiar búsqueda/página, elegir, crear y volver. Mantener selección/identidad en dueño, no en índice de resultado. Listado comparte presentación/datos con administración donde aporte reutilización; no heredar su banda administrativa, main/h1 y segundo panel. Vacío real y búsqueda sin coincidencias siguen diferenciados según UX08.
4. OptionModal puede evolucionar a dueño del diálogo de pasos o quedar adaptador de OptionFormContent. Elegir después de UX09 según su diff; el dueño debe poder conservar el borrador autoritativo de OfferFormPage y la sesión de receta. No mantener dos copias divergentes de OptionDraft ni resetear draft al regresar.

No se propone tocar operationAttempt ni storage: ya existe updateEditableDraft(draft, {nestedContext}). Utilizar su contrato donde sea necesario preservar contexto actual; no crear un controlador alternativo. Si revalidación demuestra necesidad de cambiar módulo compartido, ampliar reserva con root antes de editar.

## Recuperación y contexto

OfferFormPage nestedRecipeContext (~1100) incluye entryId/offerId, presentationTag/basePrice/desiredStatus, slots, índices objetivo, currentOptionDraft, banderas antiguas y offerFile Blob/name/type. Su efecto de restauración (~559) compara entryId y offerId antes de aplicar y reconstruye File. Mantener esa frontera de recurso y ensureSlotLocalIds. Incorporar paso y snapshot del selector para nuevas operaciones, sin exigir persistencia general de borradores que D04 no pide. Admitir registros existentes con optionModalOpen/recipePickerOpen: si hay operación de receta pendiente correspondiente, restaurar directamente createRecipe en un único diálogo.

Riesgo confirmado: RecipeFormDialog.handleVoluntaryClose (~652) llama abandonFlow y elimina registro; no es acción Volver. Cleanup del efecto de sesión (~364) llama detachForReload y borra controllerRef; no debe ejecutarse por cambiar de paso. operationAttempt.restoreFromStorage convierte in_flight a uncertain y no ejecuta red; abandonFlow elimina registro, detachForReload sólo desacopla.

Riesgo para revisar: OfferFormPage sólo restaura contexto si etapa no succeeded; RecipePage admite succeeded con confirmedResult. Preservar el caso de creación confirmada con modificaciones posteriores y volver a edición/revisión sin otro POST. El registro guarda contexto al crear controlador; handlers actuales updateEditableDraft no pasan opciones de contexto. El nuevo dueño puede sincronizar nestedContext mediante la API existente cuando haya registro, evitando que cambios posteriores del selector/ancestros queden fuera del snapshot. No afirmar que el caso está corregido antes de implementarlo y probarlo.

Foco: useTaskDialog captura disparador al abrir y restaura al cerrar; no se ejecuta de nuevo en cada paso. Añadir foco explícito después de renderizar destino: opción→selector buscador/título; selector→crear nombre; crear→selector disparador Nueva receta; asignación→opción Elegir receta/resumen; cerrar tarea→botón de opción original que OfferFormPage ya restaura. Mantener trap dinámico, scroll lock hasta cierre y limpieza de cero capas. Retirar listeners globales de Escape de esta cadena; onCancel del único diálogo despacha según paso y estado, con preventDefault. No tocar otros consumidores de useTaskDialog.

## Incompatibilidades de pruebas documentadas ANTES de edición

No se ha editado ningún test. La incompatibilidad es suposición estructural de ventanas, no defecto de sus garantías:

| Caso localizado | Supuesto que deja de aplicar y garantía obligatoria |
| --- | --- |
| OfferComponents.test.tsx “respects modal hierarchy…” O19/O34 (~920) | isNestedPickerOpen/rerender simula otra capa. Reubicar comprobación en dueño de pasos conservando primer Escape→opción, borrador y foco; segundo Escape→cierre apropiado. |
| OfferFormPage.test.tsx “nested Escape…” O19/O34 (~1750) | Busca Biblioteca de recetas como diálogo independiente. Usar único diálogo y título/contenido del paso, mismos nombre/foco/composición. Con borrador modificado aplicar continuar/descartar D04; no eliminar escenario. |
| e2e/offer-form.spec.ts O19/O34 (~233) | Nombres de dos diálogos y cierre del picker separado. Verificar transición de contenido, nodo modal único durante recorrido, conservación de Papas Rústicas y foco a Elegir receta, cierre final y foco al botón de grupo. |
| OfferFormPage.test.tsx (~1003,1262,1281,1307,1331) | Abrir/cancelar picker, cancel nativo, borrador, asignación y restauración esperan contenedor antiguo. Reexpresar estructura únicamente; mantener todos los efectos/ausencias de escritura. Restauración ~1407 espera picker y formulario juntos: pasa a crear receta dentro del único contenedor. |
| e2e/operation-recovery.spec.ts “nested recipe creation recovery…” (~101) | Encadena optionModal→recipePicker→recipeDialog y consulta Nueva receta. Reexpresar pasos conservando timeout, F5 real, datos comerciales/opción/receta, cero POST al restaurar, retry manual, misma clave/payload y asignación posterior sin guardar oferta. |

También preservar RecipePage.test.tsx: selección por existente o creada (~279), inventario paginado (~582), error independiente (~661), lectura tardía (~733), busy/doble envío (~923), claves de filas (~1010), 412/revisión sin autorreenvío (~1061). Conservar audit-recovery.regression.test.tsx casos de F5 de oferta y composición/identidades; operationAttempt.test.ts casos persistencia previa, deduplicación, payload separado, expiración y reintentos. No cambiar expectations de negocio para acomodar implementación.

## Orden tras desbloqueo

1. Confirmar UX08 y UX09 integradas con hashes y diff; volver a leer los cuatro componentes, estilos y pruebas anteriores. Actualizar vecinos sólo si cambiaron imports/exports; el grafo baseline no acredita extracción nueva.
2. Reservar componentes, nuevos archivos acotados, estilos REC/OFE y pruebas consumidoras con root. Registros y configuración siguen siendo del integrador. No editar a partir de una copia de preparación.
3. Extraer sesión/contenido de receta preservando contratos administrativos y recuperación; después selector con estado controlado; finalmente dueño de pasos y adaptación de contexto/foco. Mantener commits/reservas según integrador.
4. Documentar de nuevo incompatibilidades concretas si las líneas/supuestos cambiaron, antes de actualizar pruebas. Tests reales de transiciones, query/página, identidad, resultado rechazado/incierto, busy, retry y éxito con ediciones posteriores; no tests de cobertura.
5. Ejecutar suites pertinentes de recetas/ofertas/recuperación y checks acordados con root. Chromium debe acreditar dialog[open]:modal máximo 1, un backdrop, cero capas al cerrar, Tab/Shift+Tab, Escape/Volver/foco y scroll; jsdom no prueba capa nativa. Probar 390 px, primer resultado, búsqueda sin coincidencias y error. F5/Idempotency-Key/If-Match/ETag y ausencia de autorreenvío permanecen contratos de aceptación.

D01 shell real excluido de esta preparación; físico/lector manual pendientes. D02 MXN/es-MX/dos decimales pertenece UX12. D03 rondas de selección pertenece UX14. D04 intacto cierra, modificado permite continuar/descartar, pasos conservan drafts; UX11 generaliza protección. D05 tipos y 10 MiB sin cambios.

Comandos ejecutados: lecturas Get-Content/Select-Object, búsquedas rg/rg --files, git rev-parse HEAD y dos consultas locales de ui-ux-pro-max. Sus resultados sobre foco fueron genéricos, sin coincidencia verificada para trap/retorno; se usa fallback de reglas locales keyboard-nav/escape-routes y contrato existente useTaskDialog. No se atribuye a esas consultas evidencia del comportamiento nativo. No se ejecutaron comprobaciones de aplicación.
