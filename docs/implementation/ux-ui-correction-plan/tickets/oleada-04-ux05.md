# UX05. Corregir formulario de categorías

**Estado:** Pendiente de implementación.
**Oleada:** 4 · **Prioridad:** P2 · **Complejidad:** M.
**Requisitos previos:** [UX04](oleada-03-ux04.md)
**Hallazgos propios:** Ninguno; prepara o aporta evidencia a otros responsables.
**Aportes o condiciones que conserva:** U03, U04, U07, U08, U22
**Casos de verificación:** V03, V07 de la sección 7.2 del plan.
**Habilita:** [UX08](oleada-05-ux08.md), [UX17](oleada-12-ux17.md)
**Plan fuente:** [Plan de implementación](../ux-ui-implementation-plan.md), ficha UX05, matriz de la sección 4, reservas de la sección 5.1 y verificaciones de las secciones 7 a 9.
**Evidencia de origen:** [Auditoría UX/UI](../audit/ux-ui-audit-2026-10-23.md).
**Reglas comunes:** [Índice de tickets](README.md), [DESIGN.md](../../../DESIGN.md) y [AGENTS.md](../../../../AGENTS.md).

## Instrucciones

1. Reservar `src/features/categories/CategoryFormDialog.tsx`, `src/features/categories/styles.css`, `CategoryPage.test.tsx` y regresiones de categorías. Presentar obligatorio u opcional antes del envío, error persistente junto al campo, `aria-invalid` y asociación mediante `aria-describedby`. El resumen complementa los mensajes y el foco lleva al error sin perder datos.

2. Adoptar tamaños, cierres SVG, radios y escala compartidos. Conservar tratamiento de errores HTTP, recuperación de creación, bloqueo durante envío y revisión de versión. No reemplazar estas garantías por una validación HTML que oculte la información.

3. Probar envío vacío, corrección, error de servicio y recuperación con teclado en 390 y 1024 px. Un envío inválido no debe llamar al repositorio. La entrega aporta evidencia de categoría a U04; el cierre conjunto lo completa UX08 con recetas.

## Invariantes

- Una validación HTML nativa no sustituye errores persistentes ni las garantías de errores HTTP, versiones y recuperación.
- Un envío inválido no llama al repositorio ni pierde los valores introducidos.
- UX06 y UX07 reservan otras áreas. Si se necesita cambiar la base compartida o la configuración E2E, coordina ese archivo por turnos.
- UX08 es responsable del cierre conjunto de U04 con categorías y recetas.
- Cada test debe comprobar un caso real. Ante un fallo, investiga el código. Informa un defecto o incompatibilidad del test antes de modificarlo y conserva sus garantías funcionales.

## Tests conceptuales

- Envía categoría vacía, corrige el campo y vuelve a enviar. Comprueba mensaje junto al control, aria-invalid, aria-describedby y foco útil.
- Comprueba obligatorio u opcional antes de enviar, error de servicio, recuperación de creación y revisión de versión, sin perder el borrador.
- Recorre el formulario con teclado a 390 y 1024 px y mide controles, cierre SVG, radios y tipografía.
- Ejecuta CategoryPage.test.tsx y regresiones de categorías afectadas. Distingue la presentación de un error simulado de una integración HTTP real.

## Criterios de aceptación

- [ ] Errores de campo persisten junto al control, están asociados y se revelan sin pérdida de datos. Un resumen, si existe, los complementa.
- [ ] El envío inválido produce cero escrituras. Corregir permite continuar y los errores HTTP mantienen recuperación y bloqueo durante envío.
- [ ] Formulario y cierre adoptan tamaños, SVG, radios y roles de la base en ambos anchos.
- [ ] La evidencia de categoría se entrega a UX08 para U04 y a UX02 para los hallazgos compartidos, sin atribuirse su cierre total.

## Entrega

Registra base, archivos reales, reservas, comandos y resultados, casos y evidencia por ID según la [entrega común](README.md#entrega-y-cierre). Distingue integración del ticket y cierre de hallazgos. Las instrucciones anteriores describen trabajo futuro y no acreditan una corrección ya ejecutada.
