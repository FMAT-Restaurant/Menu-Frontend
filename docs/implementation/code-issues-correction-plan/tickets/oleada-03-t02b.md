# T02B — Recetas recuperables y restauración de su selector

**Estado:** Pendiente de implementación.
**Oleada:** 3 · **Prioridad:** P0 · **Complejidad:** L
**Requisitos previos:** [T02A](oleada-02-t02a.md), [T09](oleada-02-t09.md).
**Hallazgos propios:** A09.
**Aportes:** Caso de receta de A01 y fuente única de opción de O13; O13 conserva su cierre completo en T08.
**Plan fuente:** [Plan de corrección](../audit-issues-correction-plan.md), ficha T02B, reglas 3.2–3.4 y recorrido anidado de 8.3.

## Instrucciones

1. Reserva los métodos/tipos de recetas en `src/application/catalog.ts`, `src/api/menuApi.ts` y sus tests; `src/features/recipes/RecipePage.tsx`, `RecipeFormDialog.tsx`, sus tests y dobles consumidores.
2. Incluye `src/features/offers/OfferFormPage.tsx`, `OptionModal.tsx`, `OfferFormPage.test.tsx` y `OfferComponents.test.tsx`. T09 debe estar integrado antes de cambiar esos archivos. Amplía el caso de receta en `e2e/operation-recovery.spec.ts`.
3. Asocia el detalle validado de `getRecipe` y su ETag usando la forma compartida de T02A. `updateRecipe` recibe la versión de apertura; retira el GET que sólo la renueva al guardar. El PATCH incierto requiere consulta y revisión para evitar otra revisión accidental.
4. Migra `createRecipe` con identidad explícita y conecta diálogo, almacenamiento y recuperación manual. Conservar el 201 original debe recuperar el mismo recipeId. Aplica íntegramente 3.4 a la solicitud original, borrador editable, errores y fallos locales.
5. Adelanta la fuente única del borrador de opción en OfferFormPage. OptionModal recibe sus valores y comunica cambios al padre, sin duplicar esos campos en estado local. Elegir/cancelar receta conserva lo escrito; cancelar la opción conserva la composición previa.
6. Conserva el contexto completo necesario para restaurar la creación anidada: editor de oferta y recurso, datos comerciales/composición/archivo, opción y grupo que la originaron, capas abiertas, solicitud y borrador de receta. El padre debe poder restaurarlo aunque aún no se haya enviado una oferta. Tras F5, restaura primero al padre y reabre selector/formulario; la carga inicial no puede sobrescribir ese borrador.
7. Migra juntos los consumidores, dobles y tests del modal controlado. Conserva las pruebas de categorías de T02A. T02C/T02D ampliarán el mismo registro con imagen, escritura de oferta e identidades locales, sin perder el vínculo con la opción.

## Invariantes

- Conserva `mode`, `onSelectRecipe` y `onClose`; no cambies la interfaz pública del selector ni migres todavía las escrituras de ofertas.
- Recargar no realiza POST; recuperar usa clave/JSON originales. No selecciones automáticamente una receta si quedan cambios posteriores en su formulario: conserva su ID y permite continuar mediante edición explícita.
- Abandonar la creación de receta descarta su recuperación y bloquea su callback tardío; abrir/cerrar el selector conserva el borrador del padre que siga abierto. Salir no deshace lo confirmado en el servidor.
- Los campos permanecen editables entre intentos inciertos y el envío pendiente sigue inmutable. Fallar el registro previo impide enviar y conserva los datos visibles.
- T08 añadirá variantes e intención de reasignar sobre la fuente única ya integrada, sin otra migración de estado. No introduzcas un gestor global de recuperación ni capacidades futuras de Inventario/copia.

## Tests conceptuales

- Abrir receta v1, cambiar externamente a v2 y guardar con v1 produce 412 sin renovación previa; el borrador completo y el If-Match de cada intento son comprobables. Reutiliza el caso equivalente de categorías para acreditar A09.
- POST incierto recupera el 201/recipeId original. En Jest verifica conexión de avisos, cambio posterior al envío y callback único al contexto vigente, reutilizando las tablas comunes de T01.
- En navegador, escribe datos comerciales, elige archivo de oferta y abre una opción con nombre/estado propios. Crea receta desde su selector, pierde la respuesta y recarga: reaparecen padre, capas y campos, sin envío automático ni otra elección de archivo.
- Reintentar recupera la receta y la asigna una vez a esa opción si no quedan cambios pendientes; si los hay, conserva su formulario para edición. El padre conserva campos, composición y archivo.
- Elegir/cancelar receta conserva la opción; cancelar la opción no modifica la composición. Cerrar el selector o cambiar de editor impide efectos de una respuesta tardía sobre otro contexto.

## Criterios de aceptación

- [ ] A09: categoría y receta acreditan versiones de apertura, conflicto real de dos versiones, borrador conservado y revisión explícita; no se duplica el caso de T02A.
- [ ] Creación de receta y recuperación desde administración/selector funcionan con todos sus consumidores migrados, sin otro POST ni claves por petición.
- [ ] La recarga nativa anidada restaura el padre antes del selector y conserva el vínculo con la opción y el archivo.
- [ ] O13 recibe la fuente única y sus pruebas de conservación; su intención de reasignación y cierre integral quedan a T08.
- [ ] Typecheck, suites afectadas, el caso nativo y build pasan. Entrega evidencia y libera adaptador/tipos y contexto padre para T02C.
