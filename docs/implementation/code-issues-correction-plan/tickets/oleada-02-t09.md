# T09 — Mostrar correctamente las funciones pendientes de ofertas

**Estado:** Pendiente de implementación.
**Oleada:** 2 · **Prioridad:** P1 · **Complejidad:** S
**Requisitos previos:** [T11](oleada-01-t11.md).
**Hallazgos propios:** O01, O08, O31, O37.
**Plan fuente:** [Plan de corrección](../audit-issues-correction-plan.md), aclaración de alcance 1, ficha T09 y matriz 7.7.

## Instrucciones

1. Edita `src/features/offers/CompositionEditor.tsx`, `OptionModal.tsx`, `OfferFormPage.test.tsx` y `OfferComponents.test.tsx`.
2. Mantén visibles y deshabilitados los botones de copiar composición y elegir artículo de Inventario. Añade una explicación visible de su estado pendiente y asóciala al control mediante aria-describedby.
3. Retira los handlers vacíos y mensajes que aparentan disponibilidad. No conectes consultas ni callbacks de éxito a esas funciones.
4. Reescribe los tests de disponibilidad: comprueba botón deshabilitado, explicación accesible específica y ausencia de cambios/llamadas. Sus nombres deben describir funciones pendientes y no una copia o selección inexistente.

## Invariantes

- No implementes V7/V8, nuevos selectores, consultas de candidatos ni pantallas de copia. No cambies puertos/API, RecipePage ni estilos globales.
- El selector de recetas y las acciones existentes de grupos/opciones conservan su disponibilidad real. Las opciones de Inventario ya cargadas mantienen sus datos.
- Una aserción de ausencia del texto «se implementará» no acredita funcionamiento.
- Integra estos cambios antes de T02B: ambas tareas modifican OptionModal y los tests de ofertas. T02A puede avanzar en sus archivos de categorías sin compartir esta reserva.

## Tests conceptuales

- Ambos controles pendientes están deshabilitados, descritos y no modifican el borrador ni llaman al repositorio.
- Elegir una receta existente y manejar un grupo siguen funcionando conforme a las condiciones actuales.
- Un botón habilitado conectado a un handler vacío haría fallar las nuevas pruebas.

## Criterios de aceptación

- [ ] O01, O08: la UI expresa disponibilidad pendiente sin aparentar éxito y preserva las acciones implementadas.
- [ ] O31, O37: las pruebas verifican estado accesible, explicación y ausencia de efectos; no anuncian funciones implementadas.
- [ ] Typecheck y suites afectadas pasan. Entrega evidencia y libera OptionModal, OfferFormPage.test y OfferComponents.test para T02B.
