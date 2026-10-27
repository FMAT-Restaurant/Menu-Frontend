# UX10. Convertir la selección de receta en pasos de una tarea

**Estado:** Pendiente de implementación.
**Oleada:** 6 · **Prioridad:** P2 · **Complejidad:** L.
**Requisitos previos:** [UX08](oleada-05-ux08.md), [UX09](oleada-05-ux09.md)
**Hallazgos propios:** U16, U27
**Aportes o condiciones que conserva:** U06, U13, U15, U26, U28
**Casos de verificación:** V04, V08, V09, V10, V16, V17, V18 de la sección 7.2 del plan.
**Habilita:** [UX11](oleada-07-ux11.md), [UX17](oleada-12-ux17.md)
**Plan fuente:** [Plan de implementación](../ux-ui-implementation-plan.md), ficha UX10, matriz de la sección 4, reservas de la sección 5.1 y verificaciones de las secciones 7 a 9.
**Evidencia de origen:** [Auditoría UX/UI](../audit/ux-ui-audit-2026-10-23.md).
**Reglas comunes:** [Índice de tickets](README.md), [DESIGN.md](../../../DESIGN.md) y [AGENTS.md](../../../../AGENTS.md).

## Instrucciones

1. Reservar `src/features/offers/OfferFormPage.tsx`, `OptionModal.tsx`, `src/features/recipes/RecipePage.tsx`, `RecipeFormDialog.tsx`, sus estilos y pruebas consumidoras. Separar contenido de formulario y datos reutilizables del contenedor modal. Pueden añadirse `src/features/recipes/RecipeSelector.tsx` y `src/features/recipes/RecipeFormContent.tsx`, nuevos. El formulario de administración reutiliza la misma lógica; no se duplica la máquina de recuperación.

2. El contenedor de opción presenta los pasos "Editar opción", "Elegir receta" y "Crear receta" sustituyendo su contenido. El selector tiene título de tarea y grupo, buscador, resultados y asignación. Elimina banda administrativa, segundo título de panel y cajas que retrasan el primer resultado.

| Transición | Comportamiento requerido |
| --- | --- |
| Opción a elegir receta | Conservar nombre, estado, identidad local y demás datos de la opción. Mantener un solo diálogo modal. |
| Seleccionar receta existente | Asignar la receta y volver a la opción, con foco en su disparador o resumen. No guardar la oferta automáticamente. |
| Elegir receta a crear receta | Mantener consulta, página y selección en memoria. Sustituir el paso, sin abrir otra ventana. |
| Regresar desde creación | Recuperar la búsqueda y la opción. Si hay edición de receta, aplicar la decisión D04 dentro del mismo contenedor. |
| Crear con éxito | Crear una sola vez y conservar el comportamiento de asignación de la receta nueva al flujo de opción. Volver al editor con su resto de datos intacto. |
| Error o resultado incierto | Permanecer en el paso con borrador y recuperación apropiados. No cerrar ni repetir la escritura automáticamente. |

3. Escape o Volver afecta al paso actual; no cierra toda la oferta por un listener global. UX11 añade la protección común de cambios antes de descartar. Conservar foco contenido y retorno lógico sin mantener tres diálogos ocultos abiertos.

4. La evidencia debe contar un máximo de un `dialog[open]:modal` en este recorrido, un fondo y cero capas tras cerrar. Comprobar ida y vuelta, creación rechazada, reintento controlado, cierre y retorno de foco. Ejecutar suites de ofertas, recetas y recuperación, y revisar el caso O19/O34 de `e2e/offer-form.spec.ts` sin perder sus garantías de borrador.

## Invariantes

- Editar opción, elegir receta y crear receta son pasos del mismo contenedor. No mantengas diálogos ocultos abiertos debajo.
- La lógica de creación y recuperación de receta se reutiliza desde administración y selección; no se duplica su máquina de estado.
- Asignar una receta no guarda automáticamente la oferta. Crear receta confirma una sola creación y conserva el comportamiento de asignación existente.
- D04 guía la conservación al regresar de un paso. UX11 añade la protección común antes de descartar.
- Las pruebas O19/O34 conservan las garantías de Escape, borrador y foco aunque la estructura multimodal quede obsoleta.
- Cada test debe comprobar un caso real. Ante un fallo, investiga el código. Informa un defecto o incompatibilidad del test antes de modificarlo y conserva sus garantías funcionales.

## Tests conceptuales

- Recorre cada transición de la tabla de instrucciones con nombre, estado, identidad y demás campos de opción ya modificados. Comprueba consulta y página al regresar desde creación.
- Selecciona receta existente y crea otra con éxito. Comprueba asignación, retorno y ausencia de guardado implícito de oferta o creación duplicada.
- Prueba creación rechazada, resultado incierto y recuperación manual. El paso permanece disponible con datos y sin reenvío automático.
- Cuenta un máximo de un dialog[open]:modal y un fondo en todo el recorrido, y cero capas al finalizar. Prueba Escape y Volver desde cada paso, Tab, retorno de foco y scroll del fondo.
- En 390 px comprueba búsqueda y primer resultado sin cabecera administrativa duplicada. Repite búsqueda sin coincidencias y conservación del contexto.
- Ejecuta suites de ofertas, recetas y recuperación. Revisa la estructura de OfferComponents.test.tsx y e2e/offer-form.spec.ts, recorrido O19/O34, informando el cambio de supuesto visual sin borrar escenarios.

## Criterios de aceptación

- [ ] U16 presenta un selector centrado en asignar, con contexto de grupo, búsqueda, resultados y acción clara.
- [ ] U27 tiene un único diálogo modal y un único fondo durante opción, selección y creación, con limpieza completa al cerrar.
- [ ] Todas las transiciones de la tabla conservan sus borradores, consulta, página, asignación y foco, también ante rechazo o incertidumbre.
- [ ] Administración y selección comparten la lógica operativa y conservan los contratos de creación y recuperación.
- [ ] Se entregan regresiones de O19/O34 y aportes a U06, U13, U26 y U28 sobre el flujo final. La protección común de descarte sigue asignada a UX11.

## Entrega

Registra base, archivos reales, reservas, comandos y resultados, casos y evidencia por ID según la [entrega común](README.md#entrega-y-cierre). Distingue integración del ticket y cierre de hallazgos. Las instrucciones anteriores describen trabajo futuro y no acreditan una corrección ya ejecutada.
