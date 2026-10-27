# UX14. Reescribir microcopia sin perder decisiones operativas

**Estado:** Pendiente de implementación.
**Oleada:** 10 · **Prioridad:** P2 · **Complejidad:** M.
**Requisitos previos:** [UX13](oleada-09-ux13.md)
**Condiciones adicionales:** D03 confirmada para cantidad de grupo y D05 aplicada al límite y tipos de imagen.
**Hallazgos propios:** U20
**Casos de verificación:** V09, V12, V18 de la sección 7.2 del plan.
**Habilita:** [UX16](oleada-11-ux16.md), [UX17](oleada-12-ux17.md)
**Plan fuente:** [Plan de implementación](../ux-ui-implementation-plan.md), ficha UX14, matriz de la sección 4, reservas de la sección 5.1 y verificaciones de las secciones 7 a 9.
**Evidencia de origen:** [Auditoría UX/UI](../audit/ux-ui-audit-2026-10-23.md).
**Reglas comunes:** [Índice de tickets](README.md), [DESIGN.md](../../../DESIGN.md) y [AGENTS.md](../../../../AGENTS.md).

## Instrucciones

1. Reservar textos visibles de páginas, formularios y feedback de `src/features/categories/`, `src/features/entries/`, `src/features/offers/` y `src/features/recipes/`, incluidos `src/features/entries/EntryFormFeedback.tsx`, `src/features/offers/CompositionEditor.tsx` y `SlotModal.tsx`. No editar `src/App.tsx` y `src/main.tsx` ni el coordinador de rutas reservado a UX15. Aplicar unslop a una tabla de texto anterior, texto propuesto, estado real y acción que habilita.

2. Usar entrada, oferta, grupo, opción, receta e insumo de forma consistente. Retirar enums, ETag, claves de idempotencia e identificadores de implementación del texto principal cuando no ayudan a decidir. Conservar en recuperación las diferencias entre no enviado, rechazado, incierto y confirmado. No ocultar que repetir una operación puede requerir una decisión explícita.

3. Unificar cantidad de grupo según D03 y límite de imagen según D05. "Guardar oferta" sigue la capitalización del producto. Las restricciones de activación y publicación permanecen aunque la explicación sea más breve.

4. Revisar alta, edición, validación, conflicto, recuperación y cierre con cambios. Los textos de estados difíciles de producir en demo requieren casos dirigidos con el repositorio o entorno HTTP de pruebas, no capturas de éxito usadas como sustituto. Ejecutar las suites que verifican esas garantías y explicar cualquier cambio de texto literal de la sección 8.

## Invariantes

- Los textos conservan las diferencias entre no enviado, rechazado, incierto y confirmado, y las decisiones necesarias para recuperar una operación.
- La cantidad de grupo se distingue de cantidad y unidad de insumo; no cambian valores, validación ni payload.
- MAX_IMAGE_BYTES sigue siendo 10 × 1024 × 1024 bytes. La ayuda expresa ese mismo límite de forma exacta y común, por ejemplo 10 MiB.
- Este ticket reserva textos de módulos y formularios. UX15 posee APP y el coordinador de rutas; si aparece un archivo común, trabajar por turnos.
- Si D03 sigue pendiente, pueden entregarse textos independientes. La parte de cantidad y U20 permanecen abiertos; UX16 solo puede preparar su trabajo sin acreditar ese cierre.
- Cada test debe comprobar un caso real. Ante un fallo, investiga el código. Informa un defecto o incompatibilidad del test antes de modificarlo y conserva sus garantías funcionales.

## Tests conceptuales

- Construye una tabla de texto anterior, propuesta, estado operativo real y acción habilitada para alta, edición, validación, conflicto, recuperación y cierre con cambios.
- Comprueba términos entrada, oferta, grupo, opción, receta e insumo, la cantidad acordada y la ayuda exacta de imagen en ambos formularios.
- Prueba restricciones de activación y publicación, operación no enviada, rechazo, incertidumbre y éxito, con casos dirigidos donde la demo no alcance.
- Revisa los tests que buscan INACTIVE, servidor o borrador, incluido el caso histórico de OfferComponents.test.tsx, línea 143. Explica por qué cambia el texto y conserva oferta nueva inactiva, activación explícita y resultado confirmado.
- Aplica unslop a la tabla y ejecuta las suites que acreditan las garantías operativas. No uses una captura de éxito como evidencia de recuperación.

## Criterios de aceptación

- [ ] U20 tiene inventario de textos con propuesta y resultado operativo coherentes, sin tecnicismos en el texto principal que no ayuden a decidir.
- [ ] D03 mantiene un término común para cantidad de grupo y distingue el insumo; D05 conserva límite y tipos reales con ayuda consistente.
- [ ] Los mensajes permiten decidir ante validación, conflicto e incertidumbre y mantienen las restricciones de publicación y repetición.
- [ ] Los cambios de literales de tests están justificados y conservan sus aserciones funcionales.
- [ ] La entrega registra cualquier parte independiente integrada y mantiene abierta la condición de cantidad si D03 no está resuelta.

## Entrega

Registra base, archivos reales, reservas, comandos y resultados, casos y evidencia por ID según la [entrega común](README.md#entrega-y-cierre). Distingue integración del ticket y cierre de hallazgos. Las instrucciones anteriores describen trabajo futuro y no acreditan una corrección ya ejecutada.
