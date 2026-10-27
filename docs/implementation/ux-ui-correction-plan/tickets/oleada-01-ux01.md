# UX01. Recuperar nombre y precio en tarjetas de oferta

**Estado:** Pendiente de implementación.
**Oleada:** 1 · **Prioridad:** P1 · **Complejidad:** S.
**Requisitos previos:** [UX00](oleada-00-ux00.md)
**Hallazgos propios:** U01
**Casos de verificación:** V01 de la sección 7.2 del plan.
**Habilita:** [UX04](oleada-03-ux04.md), [UX17](oleada-12-ux17.md)
**Plan fuente:** [Plan de implementación](../ux-ui-implementation-plan.md), ficha UX01, matriz de la sección 4, reservas de la sección 5.1 y verificaciones de las secciones 7 a 9.
**Evidencia de origen:** [Auditoría UX/UI](../audit/ux-ui-audit-2026-10-23.md).
**Reglas comunes:** [Índice de tickets](README.md), [DESIGN.md](../../../DESIGN.md) y [AGENTS.md](../../../../AGENTS.md).

## Instrucciones

1. Reservar `src/features/offers/OfferCard.tsx`, la sección de tarjeta de `src/features/offers/styles.css` y la regresión visual correspondiente. Mantener estable el contrato de props. Contener el tamaño intrínseco de la imagen, separar su zona de nombre, entrada y precio, y conservar el fallback por error de carga.

2. Comprobar "Individual" y "Combo con bebida" a 1440 y 390 px, además de archivos cuadrados, verticales y apaisados. La evidencia debe mostrar texto completo y ausencia de intersección con la imagen. Un encabezado presente en el DOM no basta. Ejecutar `OfferComponents.test.tsx` y `OffersPage.test.tsx`.

3. Entregar capturas comparables con las evidencias 11 y 17 de la auditoría y una comprobación geométrica del defecto. UX09 debe repetirla al rediseñar la tarjeta. No esperar a la decisión de moneda para recuperar la visibilidad del importe existente.

## Invariantes

- El contrato de props de OfferCard y el fallback de imagen permanecen estables.
- El precio sigue perteneciendo a la oferta. Esta tarea recupera su visibilidad y no decide moneda ni precisión.
- UX02 puede avanzar en esta oleada porque reserva otros archivos. UX09 conserva y vuelve a comprobar esta corrección.
- Cada test debe comprobar un caso real. Ante un fallo, investiga el código. Informa un defecto o incompatibilidad del test antes de modificarlo y conserva sus garantías funcionales.

## Tests conceptuales

- Compara capturas a 1440 y 390 px de Individual y Combo con bebida con las evidencias 11 y 17 de la auditoría.
- Prueba imágenes verticales, horizontales y cuadradas, imagen fallida, nombre largo y precio visible. Mide los rectángulos de imagen y texto y comprueba que no se intersectan.
- Ejecuta OfferComponents.test.tsx y OffersPage.test.tsx. Añade una regresión de navegador del defecto real si las pruebas existentes solo acreditan presencia de texto.

## Criterios de aceptación

- [ ] Nombre, entrada y precio son legibles y quedan fuera del área de la imagen en ambos tamaños y las tres proporciones.
- [ ] Una imagen que falla conserva el fallback y no desplaza texto sobre otra zona.
- [ ] U01 tiene capturas y evidencia geométrica comparable con la auditoría, además del resultado de las suites afectadas.
- [ ] La entrega informa a UX09 de la condición que debe conservar al rediseñar la tarjeta.

## Entrega

Registra base, archivos reales, reservas, comandos y resultados, casos y evidencia por ID según la [entrega común](README.md#entrega-y-cierre). Distingue integración del ticket y cierre de hallazgos. Las instrucciones anteriores describen trabajo futuro y no acreditan una corrección ya ejecutada.
