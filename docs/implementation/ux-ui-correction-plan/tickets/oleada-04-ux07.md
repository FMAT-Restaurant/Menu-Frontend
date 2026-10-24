# UX07. Corregir estado inexistente y presentación de entradas

**Estado:** Pendiente de implementación.
**Oleada:** 4 · **Prioridad:** P2 · **Complejidad:** M.
**Requisitos previos:** [UX04](oleada-03-ux04.md)
**Hallazgos propios:** U14
**Aportes o condiciones que conserva:** U03, U07, U08, U09, U19, U22
**Casos de verificación:** V02, V03, V05, V07, V08, V18 de la sección 7.2 del plan.
**Habilita:** [UX09](oleada-05-ux09.md), [UX17](oleada-12-ux17.md)
**Plan fuente:** [Plan de implementación](../ux-ui-implementation-plan.md), ficha UX07, matriz de la sección 4, reservas de la sección 5.1 y verificaciones de las secciones 7 a 9.
**Evidencia de origen:** [Auditoría UX/UI](../audit/ux-ui-audit-2026-10-23.md).
**Reglas comunes:** [Índice de tickets](README.md), [DESIGN.md](../../../DESIGN.md) y [AGENTS.md](../../../../AGENTS.md).

## Instrucciones

1. Reservar `src/features/entries/EntryFormPage.tsx`, `useEntryResources.ts`, `entryError.ts`, `EntryImageField.tsx`, `EntryCategorySelector.tsx`, `src/features/entries/styles.css` y pruebas de entradas. Ampliar el resultado de recursos para conservar el tipo de error existente. El 404 presenta contexto y una salida al catálogo; no conserva un formulario vacío de alta deshabilitado ni reintento inútil.

2. El fallo temporal mantiene un reintento apropiado. La carga independiente de categorías no debe bloquear identidad, borrar selecciones o forzar consultas repetidas. Conservar las ayudas de edición y la imagen actual. Adoptar escala y geometría sin perder el resumen de validación ni el mecanismo que revela controles cubiertos por el footer.

3. Comprobar `/entries/audit-missing-entry/edit` en demo y una respuesta HTTP 404 en el entorno de pruebas correspondiente. Probar aparte error temporal, categorías lentas y carga de una entrada real. Ejecutar `EntryFormPage.test.tsx` y `entryError.test.ts`. La recuperación tras éxito se completa en UX13; la protección al abandonar se completa en UX11.

## Invariantes

- entryError.ts ya distingue notFound. Conserva esa clasificación en los recursos en lugar de inventar un contrato HTTP nuevo.
- La ausencia de una entrada no equivale a una entrada nueva. No muestres un formulario vacío deshabilitado con un reintento inútil.
- La carga de categorías permanece independiente y no borra selecciones ni la imagen actual.
- La recuperación tras éxito corresponde a UX13 y la protección al abandonar a UX11. Esta entrega no las acredita por anticipado.
- Cada test debe comprobar un caso real. Ante un fallo, investiga el código. Informa un defecto o incompatibilidad del test antes de modificarlo y conserva sus garantías funcionales.

## Tests conceptuales

- Abre /entries/audit-missing-entry/edit en demo y comprueba contexto y salida al catálogo. Prueba una respuesta HTTP 404 por separado en su entorno de tests.
- Prueba fallo temporal con reintento efectivo, categorías lentas y carga de entrada real como escenarios independientes.
- Comprueba formulario existente, imagen, selección de categorías, resumen de validación y mecanismo que revela controles cubiertos por el footer.
- Revisa anchos útiles móviles y de tableta sin reducir controles para encajar. Ejecuta EntryFormPage.test.tsx y entryError.test.ts.

## Criterios de aceptación

- [ ] U14 presenta un estado inexistente reconocible con una salida útil al catálogo, sin formulario de alta deshabilitado.
- [ ] Los fallos temporales conservan su reintento y no se confunden con 404.
- [ ] Las categorías lentas no bloquean ni reinician identidad, imagen o selecciones, ni provocan consultas repetidas.
- [ ] El formulario adopta la base visual y conserva el resumen, la revelación del control inválido y las garantías operativas existentes.
- [ ] La evidencia identifica por separado demo, 404 HTTP, fallo temporal y aportes responsive.

## Entrega

Registra base, archivos reales, reservas, comandos y resultados, casos y evidencia por ID según la [entrega común](README.md#entrega-y-cierre). Distingue integración del ticket y cierre de hallazgos. Las instrucciones anteriores describen trabajo futuro y no acreditan una corrección ya ejecutada.
