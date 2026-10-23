# T08 — Composición válida y asignación explícita de recetas

**Estado:** Pendiente de implementación.
**Oleada:** 9 · **Prioridad:** P1 · **Complejidad:** L
**Requisitos previos:** [T07](oleada-08-t07.md), [T14](oleada-08-t14.md).
**Hallazgos propios:** D01, O07, O09, O10, O13, O14, O15, O19, O21, O34, O35, O38.
**Plan fuente:** [Plan de corrección](../audit-issues-correction-plan.md), ficha T08, DEC-01, reglas 3.2/3.6 y matrices 7.3/7.7.

## Instrucciones

1. Reserva `src/application/catalog.ts`; `src/features/offers/OfferFormPage.tsx`, `OptionModal.tsx`, `SlotCard.tsx`, `SlotModal.tsx`, `OfferFormPage.test.tsx` y `OfferComponents.test.tsx`. Adapta `src/api/catalogResponse.ts` y su test, y los casos de composición de `menuApi.ts`, `menuApi.test.ts` y `menuApi.contract.test.ts` cuando lo exijan los tipos/mapeos.
2. Amplía `e2e/offer-form.spec.ts` después de T07 para Escape/foco y conservación del borrador, sin copiar su recorrido de conteos ni el E2E común.
3. Distingue receta/Inventario en detalle, borrador y solicitudes, y opción nueva/existente según identidad/capacidades. Un borrador incompleto no debe convertirse en una solicitud válida. Retira recipeRevision de tipos, estado, respuestas mapeadas, cuerpos y fixtures de ofertas, no sólo su valor por defecto en JSON.
4. Conserva el texto de rondas y valida su conversión completa a entero finito positivo, sin truncar. Para Inventario conserva ID, cantidad finita positiva y unidad autoritativa, sin unidades/cantidades inventadas.
5. Mantén la fuente única de opción de T02B en OfferFormPage y OptionModal controlado; no dupliques ni vuelvas a trasladar sus campos. Incorpora ahí la intención de asignar/reasignar: seleccionar el mismo recipeId cuenta; abrir/cancelar selector no introduce otra intención. El callback de selección conserva los demás datos y la restauración anidada.
6. Una opción RECIPE nueva envía recipeId; si nace mediante PATCH lleva también status/displayName y demás campos requeridos, sin optionId. En una existente no tocada omite recipeId al guardar, incluso si reenvías la colección completa. Selección explícita, aunque repita ID, o cambio de origen a RECIPE lo incluye. No sustituyas omisión por null.
7. Conserva slotId/optionId de miembros que continúan bajo el mismo padre; no muevas IDs entre padres ni inventes otros. PATCH reemplaza los conjuntos enviados: no envíes una colección parcial como si fuera una adición. Mantén identidad local y correspondencia de 3.6 al refactorizar.
8. En creación refleja opciones ACTIVE del servidor y omite su status en POST; no ofrezcas INACTIVE que se descartaría. Edición respeta las capacidades de PATCH. Al confirmar consume sólo la intención enviada; una selección posterior continúa pendiente.
9. Sólo el diálogo superior atiende cancel/Escape. Volver del selector mantiene opción, campos y foco; cancelar la opción deja intacta la composición previa. Valida antes de onSave/persistencia; errores y foco de presentación pueden seguir siendo locales al modal.

## Invariantes

- El servidor resuelve la revisión vigente y la conserva internamente. El cliente no calcula revisiones desde ETag ni comprueba un número que el API no expone.
- Guardar otro campo no reasigna una receta. La intención no se deduce sólo comparando IDs y el reintento usa la solicitud sellada, sin remapear el borrador ni resolver otra asignación.
- Fuente única, cambios posteriores e identidades locales sobreviven a cancelación, edición y recuperación. No regeneres las identidades al editar ni consumas una intención posterior al envío.
- Inventario y receta no mezclan sus campos de origen; una omisión contractual válida no se rechaza como origen incompleto. No ocultes la migración con aserciones forzadas o valores inventados.
- Conserva la interfaz externa de RecipePage y las primitivas de idempotencia. Copia/selección de Inventario de ofertas siguen deshabilitadas según T09.

## Tests conceptuales

- Comprobaciones de tipos para mezcla de orígenes y nueva/existente; validadores para NaN, Infinity, cero/negativos, unidad ausente y origen nuevo incompleto. Todos los inválidos dejan cero onSave/repositorio.
- Rondas 1.5 se rechaza y 1e2 significa 100; no se guarda un valor truncado. Cada variante produce un payload completo y correcto.
- Cambia nombre/estado, abre selector y elige/cancela receta: conserva ambos. Cancelar opción conserva la composición previa; Escape real sólo cierra la capa superior y restaura foco.
- Opción existente sin tocar receta omite recipeId; elegir el mismo ID lo incluye. Abrir/cancelar no reasigna, nueva opción siempre exige ID y POST no envía status.
- Compara cantidad/unidad además de ID/nombre en actualización. Tras cada inválido exige error y cero llamadas; al corregir, una llamada exacta.
- Una selección posterior no altera la solicitud pendiente ni se pierde al confirmar la anterior. Reutiliza recuperación/F5 de T02D y casos de 3.6 sin otra matriz idempotente.

## Criterios de aceptación

- [ ] D01, O10, O21: variantes y validación distinguen origen y nueva/existente sin mezclas, defaults inventados ni recipeRevision.
- [ ] O07, O09: rondas y cantidades se validan íntegramente y los inválidos no llegan a onSave.
- [ ] O13: se conserva la fuente única de T02B y se completa la intención de reasignación sin perder campos o restauración.
- [ ] O14, O15: recipeId se omite/envía según intención y los estados/campos corresponden a POST o PATCH.
- [ ] O19, O34: Escape real conserva capa inferior y foco; cancelar selector/opción respeta sus borradores.
- [ ] O35, O38: tests exigen cantidad/unidad y cero persistencias para cada inválido, con envío válido exacto al corregir.
- [ ] Typecheck, suites afectadas y el caso nativo de offer-form.spec pasan; no se duplica la recuperación ni el recorrido de conteos. Entrega evidencia y libera la composición funcional para T16.
