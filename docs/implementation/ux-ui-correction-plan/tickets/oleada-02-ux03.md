# UX03. Unificar fondo, foco y scroll de diálogos

**Estado:** Pendiente de implementación.
**Oleada:** 2 · **Prioridad:** P2 · **Complejidad:** L.
**Requisitos previos:** [UX02](oleada-01-ux02.md)
**Hallazgos propios:** U26, U28
**Aportes o condiciones que conserva:** U03, U08, U22
**Casos de verificación:** V03, V16, V17, V18 de la sección 7.2 del plan.
**Habilita:** [UX04](oleada-03-ux04.md), [UX17](oleada-12-ux17.md)
**Plan fuente:** [Plan de implementación](../ux-ui-implementation-plan.md), ficha UX03, matriz de la sección 4, reservas de la sección 5.1 y verificaciones de las secciones 7 a 9.
**Evidencia de origen:** [Auditoría UX/UI](../audit/ux-ui-audit-2026-10-23.md).
**Reglas comunes:** [Índice de tickets](README.md), [DESIGN.md](../../../DESIGN.md) y [AGENTS.md](../../../../AGENTS.md).

## Instrucciones

1. Reservar las confirmaciones de `src/features/catalog/CatalogPage.tsx`, `src/features/offers/OffersPage.tsx` y `src/features/recipes/RecipePage.tsx`; los diálogos de categorías, recetas, grupo, opción y selector; sus reglas modales en `src/styles.css`, `src/shared/primitives.css` y `src/shared/SearchField.tsx` y estilos de área. Coordinar un solo contrato de ciclo de vida. Pueden añadirse `src/shared/TaskDialog.tsx` y `src/shared/useModalScrollLock.ts`, nuevos, con alcance limitado a este comportamiento.

2. Usar un solo mecanismo de fondo por confirmación. En el montaje autónomo con diálogo nativo, `::backdrop` define el fondo y el wrapper deja de oscurecer. Usar el ejemplo de confirmación `rgba(17,24,39,0.4)` y un tratamiento documentado para el resto de la familia. No resolver la acumulación cambiando `z-index`.

3. Conservar foco inicial seguro, Tab contenido, retorno al disparador y bloqueo de cierre durante operaciones cuando ya corresponde. Bloquear el documento desplazable correcto durante la sesión modal. Guardar y restituir posición y estilos anteriores sin dejar `overflow` o listeners residuales. Asegurar apertura y limpieza bajo StrictMode. En integración, consumir el contrato del anfitrión si este controla el bloqueo.

4. Probar entrada archivada, oferta inactiva y receta al abrir y cancelar. En una página larga, PageUp, PageDown, rueda y gesto táctil fuera del área desplazable del diálogo no deben mover el fondo. El contenido del diálogo sí debe poder desplazarse. Cancelar y Escape dejan cero fondos y recuperan foco y posición.

5. En esta oleada se unifica el mecanismo de cada diálogo existente. La cadena de varios diálogos todavía no se declara resuelta: su sustitución completa corresponde a UX10. Ejecutar las suites de páginas y componentes afectados y una regresión en Chromium, porque jsdom no acredita la capa superior nativa ni el scroll real.

## Invariantes

- Una confirmación tiene un solo fondo. Un wrapper oscurecido junto con ::backdrop no cumple la condición aunque se ajuste z-index.
- Se conserva foco inicial seguro, Tab contenido, retorno al disparador y bloqueo de cierre durante operaciones cuando corresponde.
- Este ticket unifica el ciclo de cada diálogo existente. La cadena de tres diálogos queda para UX10 y U27 continúa abierto.
- U28 necesita evidencia del contrato D01 en el shell y repetición del recorrido de pasos de UX10 antes del cierre integrado.
- Cada test debe comprobar un caso real. Ante un fallo, investiga el código. Informa un defecto o incompatibilidad del test antes de modificarlo y conserva sus garantías funcionales.

## Tests conceptuales

- Abre y cancela eliminación de entrada archivada, oferta inactiva y receta. Cuenta un fondo y comprueba foco inicial en Cancelar, Escape y ausencia de capas al terminar.
- En una página larga usa PageUp, PageDown, rueda y tacto fuera del contenido desplazable. El fondo no cambia de posición y el contenido interno sí puede desplazarse.
- Comprueba restitución exacta de posición y estilos previos, apertura repetida y limpieza con StrictMode, sin listeners ni overflow residuales.
- Ejecuta suites de páginas y diálogos afectados y una regresión en Chromium. jsdom no demuestra la capa superior nativa ni el scroll real.

## Criterios de aceptación

- [ ] Confirmaciones y familia modal comparten un contrato de fondo y ciclo de vida. En autónomo, el diálogo nativo deja ::backdrop como único propietario del fondo.
- [ ] La confirmación utiliza el ejemplo rgba(17,24,39,0.4) y el resto de la familia tiene tratamiento documentado, sin oscurecimiento acumulado.
- [ ] Foco, cierre, bloqueo y scroll cumplen las pruebas en navegador. Cerrar deja cero fondos y restaura el estado anterior.
- [ ] La entrega conserva separadas la evidencia autónoma, la comprobación D01 pendiente y la cadena que resolverá UX10.
- [ ] Las suites funcionales afectadas conservan sus garantías de recuperación y operaciones pendientes.

## Entrega

Registra base, archivos reales, reservas, comandos y resultados, casos y evidencia por ID según la [entrega común](README.md#entrega-y-cierre). Distingue integración del ticket y cierre de hallazgos. Las instrucciones anteriores describen trabajo futuro y no acreditan una corrección ya ejecutada.
