# UX12. Presentar importes con un contrato explícito

**Estado:** Pendiente de implementación.
**Oleada:** 8 · **Prioridad:** P2 · **Complejidad:** M.
**Requisitos previos:** [UX11](oleada-07-ux11.md)
**Condiciones adicionales:** D02 resuelta, con moneda, localización y presentación de decimales confirmadas.
**Hallazgos propios:** U12
**Aportes o condiciones que conserva:** U01
**Casos de verificación:** V01, V03 de la sección 7.2 del plan.
**Habilita:** [UX17](oleada-12-ux17.md)
**Plan fuente:** [Plan de implementación](../ux-ui-implementation-plan.md), ficha UX12, matriz de la sección 4, reservas de la sección 5.1 y verificaciones de las secciones 7 a 9.
**Evidencia de origen:** [Auditoría UX/UI](../audit/ux-ui-audit-2026-10-23.md).
**Reglas comunes:** [Índice de tickets](README.md), [DESIGN.md](../../../DESIGN.md) y [AGENTS.md](../../../../AGENTS.md).

## Instrucciones

1. Reservar `src/features/offers/OfferCard.tsx`, `OfferCommercialInfo.tsx`, los importes de revisión en `OfferFormPage.tsx`, `src/features/offers/styles.css` y tests afectados. Añadir un formateador compartido, por ejemplo `src/shared/formatMoney.ts`, nuevo, con moneda y localización explícitas confirmadas por D02.

2. Usar el mismo formato en tarjeta, edición y revisión de conflictos. Alinear importes a la derecha, con peso 600 o 700. El campo de precio indica la moneda y mantiene una etiqueta visible. El formateador no altera payload, precisión de dominio ni valor almacenado. No fijar dos decimales si la decisión normativa establece otra presentación.

3. Probar importe entero, fraccionario y de varios dígitos con la precisión acordada. Revisar que separadores, símbolo o código y etiqueta caben en móvil. Conservar los validadores de precio existentes. Si D02 sigue abierta, entregar el pendiente explícito y avanzar UX13 por turnos, sin cerrar U12.

## Invariantes

- MenuOffer.basePrice es un número sin moneda en el tipo local y la arquitectura mantiene abierta esa decisión. No deduzcas MXN del símbolo $, ejemplos o zona horaria.
- Formatear no cambia payload, precisión de dominio, valor almacenado ni validadores existentes.
- Tarjeta, edición y revisión de conflictos comparten el mismo formato. La alineación financiera es derecha y el peso 600 o 700.
- Si D02 sigue pendiente, U12 no se cierra. UX13 puede adelantarse por turnos y UX12 repite después las comprobaciones afectadas de guardado.
- Cada test debe comprobar un caso real. Ante un fallo, investiga el código. Informa un defecto o incompatibilidad del test antes de modificarlo y conserva sus garantías funcionales.

## Tests conceptuales

- Con D02 documentada, prueba importes enteros, fraccionarios y de varios dígitos con los separadores y precisión acordados.
- Comprueba tarjeta, edición y revisión de conflictos, incluida moneda visible en la etiqueta del campo.
- En móvil prueba símbolo o código, etiqueta e importe largo sin corte ni superposición. Repite la geometría de U01.
- Comprueba que editar y guardar conserva los valores de dominio, no redondea el payload para coincidir con la presentación y mantiene los validadores de precio.
- Ejecuta suites de componentes y formulario de ofertas afectadas. Si UX13 se integró antes, repite sus casos de guardado y regreso afectados.

## Criterios de aceptación

- [ ] D02 está resuelta con responsable y fuente verificable antes de cerrar U12.
- [ ] Todas las superficies de importe comparten moneda, localización y presentación acordadas, alineación derecha y peso suficiente.
- [ ] El campo indica la moneda, tiene etiqueta visible y conserva validación y valor enviado.
- [ ] Importes y etiquetas caben en móvil sin reintroducir U01.
- [ ] La evidencia identifica casos y resultados reales. Una moneda solo de demo queda identificada y no se presenta como contrato de producción.

## Entrega

Registra base, archivos reales, reservas, comandos y resultados, casos y evidencia por ID según la [entrega común](README.md#entrega-y-cierre). Distingue integración del ticket y cierre de hallazgos. Las instrucciones anteriores describen trabajo futuro y no acreditan una corrección ya ejecutada.
