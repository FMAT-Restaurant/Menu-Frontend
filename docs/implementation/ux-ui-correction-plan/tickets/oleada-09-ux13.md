# UX13. Completar acceso al guardado y feedback de regreso

**Estado:** Pendiente de implementación.
**Oleada:** 9 · **Prioridad:** P2 · **Complejidad:** M.
**Requisitos previos:** [UX11](oleada-07-ux11.md)
**Condiciones adicionales:** Turno libre de UX12. Si D02 está resuelta y UX12 ya está en ejecución, integrar UX12 primero; si D02 sigue pendiente, aplicar la excepción del índice.
**Hallazgos propios:** U17, U18
**Casos de verificación:** V09, V11, V18 de la sección 7.2 del plan.
**Habilita:** [UX14](oleada-10-ux14.md), [UX15](oleada-10-ux15.md), [UX17](oleada-12-ux17.md)
**Plan fuente:** [Plan de implementación](../ux-ui-implementation-plan.md), ficha UX13, matriz de la sección 4, reservas de la sección 5.1 y verificaciones de las secciones 7 a 9.
**Evidencia de origen:** [Auditoría UX/UI](../audit/ux-ui-audit-2026-10-23.md).
**Reglas comunes:** [Índice de tickets](README.md), [DESIGN.md](../../../DESIGN.md) y [AGENTS.md](../../../../AGENTS.md).

## Instrucciones

1. Reservar `src/features/offers/OfferFormPage.tsx`, `OffersPage.tsx`, `src/features/offers/styles.css`, `src/features/entries/EntryFormPage.tsx`, `useEntryForm.ts`, `src/features/entries/styles.css`, `src/features/catalog/CatalogPage.tsx` y tests de esos consumidores.

2. Medir de nuevo el formulario después de compactar cabecera, retirar controles pendientes y adaptar grupos. Si sigue siendo largo, añadir acciones persistentes limitadas al formulario, con espacio reservado y una sola acción principal de guardado. En una variante corta no se añade la barra por defecto. El diálogo tiene sus propias acciones. Evitar que campos, mensajes y último grupo queden tapados, también con poca altura y teclado virtual.

3. Después de un guardado confirmado, transmitir un resultado local al listado de destino que identifique entrada u oferta. Consumirlo una sola vez y anunciarlo mediante una región de estado, sin sistema global de notificaciones ni temporizador artificial. Diferenciar rechazo y resultado incierto de éxito. Un fallo posterior de navegación o recarga del listado no debe habilitar una segunda creación ya confirmada.

4. Probar alta y edición de entrada, alta y edición de oferta, error de guardado y resultado incierto. Comprobar foco por Tab y Shift+Tab sobre controles cercanos al footer a 390 × 844, 390 × 568 y 844 × 390. La variante táctil necesita además dispositivo con teclado virtual. Conservar filtros y regreso al listado.

## Invariantes

- La necesidad de acciones persistentes se mide sobre el formulario final. Una variante corta no recibe barra por defecto ni otra barra global.
- Una sola acción principal de guardado, con espacio reservado si es persistente. El diálogo mantiene sus propias acciones.
- Solo un resultado confirmado anuncia éxito. Rechazo o incertidumbre conservan la recuperación y no producen ese anuncio.
- Un fallo de navegación o de recarga del listado después del éxito no habilita una segunda creación.
- Si D02 sigue pendiente, UX13 puede adelantarse por turnos a UX12. Comparte archivos de ofertas y no decide el formato monetario. Cuando UX12 se integre después, repite las comprobaciones de guardado afectadas.
- Cada test debe comprobar un caso real. Ante un fallo, investiga el código. Informa un defecto o incompatibilidad del test antes de modificarlo y conserva sus garantías funcionales.

## Tests conceptuales

- Mide longitud y acceso a guardar tras las correcciones de cabecera, grupos y controles pendientes. Comprueba formulario corto y largo.
- Con Tab y Shift+Tab recorre controles cercanos al footer a 390 × 844, 390 × 568 y 844 × 390. Prueba zoom al 200 % y dispositivo con teclado virtual.
- Comprueba que foco, mensajes, último grupo y campos no quedan cubiertos. El espacio de acciones no requiere scroll horizontal.
- Prueba alta y edición de entrada y oferta, guardado fallido y resultado incierto. El éxito se anuncia una sola vez en destino e identifica la entidad.
- Comprueba filtros y regreso, y simula fallo del listado o navegación tras éxito confirmado sin otro POST.
- Ejecuta pruebas afectadas de formularios, listados y recuperación. Si UX12 se integra después, repite los casos afectados sobre esa base.

## Criterios de aceptación

- [ ] U17 mantiene acceso útil al guardado cuando el formulario lo necesita, sin tapar controles, errores, foco o el último grupo.
- [ ] La solución funciona con poca altura, zoom y teclado virtual; la evidencia distingue emulación de dispositivo real.
- [ ] U18 muestra y anuncia en el listado un resultado local consumido una sola vez para entrada y oferta.
- [ ] Error e incertidumbre no se presentan como éxito y no se pierde la política de recuperación ni el contexto de regreso.
- [ ] La excepción de D02 queda registrada sin decidir moneda desde este ticket ni dar por cerrado U12.

## Entrega

Registra base, archivos reales, reservas, comandos y resultados, casos y evidencia por ID según la [entrega común](README.md#entrega-y-cierre). Distingue integración del ticket y cierre de hallazgos. Las instrucciones anteriores describen trabajo futuro y no acreditan una corrección ya ejecutada.
