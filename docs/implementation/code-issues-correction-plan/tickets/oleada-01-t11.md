# T11 — Controles y tarjetas de ofertas coherentes

**Estado:** Pendiente de implementación.
**Oleada:** 1 · **Prioridad:** P1 · **Complejidad:** M
**Requisitos previos:** [T00](oleada-00-t00.md).
**Hallazgos propios:** O02, O03, O04, O06, O36.
**Plan fuente:** [Plan de corrección](../audit-issues-correction-plan.md), ficha T11 y matriz 7.7.

## Instrucciones

1. Reserva `src/features/offers/OfferCard.tsx`, `OfferCommercialInfo.tsx`, `SlotOptionItem.tsx` y `OfferComponents.test.tsx` dentro de esa carpeta. Añade `OfferCard.test.tsx` si el fallback no queda cubierto en los tests existentes.
2. Aplica el mismo bloqueo durante validación/guardado al botón visible de imagen, input, teclado y arrastrar/soltar. Ninguna vía bloqueada debe llamar al consumidor.
3. Usa el fallback cuando una URL de imagen existente falla y permite un nuevo intento cuando cambia la URL.
4. Sustituye el aviso que promete activación por información fiel al borrador: crear una oferta inicia INACTIVE y la composición local no garantiza aceptación del servidor.
5. Expón el estado actual ACTIVE/INACTIVE de cada opción mediante texto y estado accesible coherentes. Corrige las pruebas de teclado para comprobar activación real con el input habilitado y bloqueo en un caso diferente.

## Invariantes

- No edites `OfferFormPage.tsx`, estilos globales, contratos ni persistencia. El bloqueo de su handler se completa en T07.
- Conserva las acciones existentes y no implementes los selectores pendientes. T09 modificará después los controles de esas funciones.
- No anuncies éxito o activación automática basándote sólo en el estado visual.

## Tests conceptuales

- URL presente que falla muestra fallback; una URL nueva vuelve a intentarse.
- Durante bloqueo, clic, input, drop y teclado producen cero callbacks. Con control habilitado, Enter y Espacio activan realmente el selector.
- El estado accesible de la opción coincide con su estado mostrado y cambia con la acción correspondiente.

## Criterios de aceptación

- [ ] O02: fallback por error y recuperación al cambiar URL comprobados.
- [ ] O03: todas las vías de selección respetan el bloqueo.
- [ ] O04: el aviso diferencia borrador, estado inicial y aceptación del servidor.
- [ ] O06: nombre y estado accesibles son coherentes con ACTIVE/INACTIVE.
- [ ] O36: los casos habilitado/bloqueado prueban efectos distintos y no pasan por ausencia de activación en ambos.
- [ ] Typecheck y tests afectados pasan; entrega evidencia y libera OfferComponents.test para T09.
