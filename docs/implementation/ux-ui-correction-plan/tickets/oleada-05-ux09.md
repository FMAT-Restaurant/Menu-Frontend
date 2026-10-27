# UX09. Corregir composición, tarjetas y controles de ofertas

**Estado:** Pendiente de implementación.
**Oleada:** 5 · **Prioridad:** P2, con P3 en U21 y aporte a U22 · **Complejidad:** L.
**Requisitos previos:** [UX06](oleada-04-ux06.md), [UX07](oleada-04-ux07.md)
**Hallazgos propios:** U02, U09, U10, U19, U21, U23
**Aportes o condiciones que conserva:** U03, U07, U08, U22, U24
**Casos de verificación:** V01, V02, V03, V05, V06, V13, V18 de la sección 7.2 del plan.
**Habilita:** [UX10](oleada-06-ux10.md), [UX17](oleada-12-ux17.md)
**Plan fuente:** [Plan de implementación](../ux-ui-implementation-plan.md), ficha UX09, matriz de la sección 4, reservas de la sección 5.1 y verificaciones de las secciones 7 a 9.
**Evidencia de origen:** [Auditoría UX/UI](../audit/ux-ui-audit-2026-10-23.md).
**Reglas comunes:** [Índice de tickets](README.md), [DESIGN.md](../../../DESIGN.md) y [AGENTS.md](../../../../AGENTS.md).

## Instrucciones

1. Reservar los componentes de `src/features/offers/`, `OfferFormPage.tsx`, `OffersPage.tsx`, `src/features/offers/styles.css`, `OfferComponents.test.tsx`, `OffersPage.test.tsx`, `OfferFormPage.test.tsx` y regresiones propias. Repetir la prueba de U01 y conservar su contención de imagen.

2. Apilar los grupos por debajo de 768 px útiles. Todos los grupos y "Agregar grupo" deben descubrirse con recorrido vertical. Retirar mínimos rígidos que causan el ancho de 792 px dentro de 349 px. En espacios amplios, el layout puede distribuir grupos sin cortar información ni acciones.

3. Aplicar títulos, metadatos de al menos 12/16, radios y espacios compartidos. Retirar franjas laterales de opciones y señales de estado redundantes. Unificar punto y texto, separar indicador de estado y control, y usar terracota para radios seleccionados. Curso y cantidad usan tratamiento neutro.

4. Reducir el peso de eliminar ofertas, grupos y opciones. Comunicar restricciones junto a la acción o de forma accesible al abrir sus alternativas. Diferenciar eliminación persistente de retirada de una opción del borrador. No quitar confirmaciones ni inventar una recuperación que aún no existe.

5. Retirar el botón de copiar composición y la tarjeta de elegir inventario pendiente. Mantener disponibles los orígenes ya soportados por el contrato y la edición de opciones existentes. Sustituir el emoji de imagen y mostrar "Cambiar imagen" también con teclado y tacto, con vista previa y selector de archivo funcionales.

6. Probar dos o más grupos, varias opciones, oferta sin etiqueta, estados activos e inactivos, imágenes fallidas y navegación de vuelta al catálogo. Entregar medidas de controles y capturas en 320, 390, 600, 740, 1024 y 1440 px, registrando el ancho útil real. No añadir todavía una barra global de guardado. UX13 decide las acciones con esta composición final.

## Invariantes

- La corrección de U01 sigue vigente después del rediseño. Las identidades de grupos y opciones, validaciones, payloads y recuperación no cambian.
- Se retiran las capacidades pendientes de copiar composición y elegir inventario en opciones; no se implementan para satisfacer un test.
- Eliminar persiste como acción secundaria con confirmación y restricciones. Retirar una opción del borrador no se presenta como borrado persistente.
- UX08 posee recetas en esta oleada. U09, U10 y U19 requieren los aportes previos y de recetas antes de proponer cierre conjunto.
- UX13 evalúa el guardado sobre esta composición final. No añadas ahora una barra global de guardado.
- Cada test debe comprobar un caso real. Ante un fallo, investiga el código. Informa un defecto o incompatibilidad del test antes de modificarlo y conserva sus garantías funcionales.

## Tests conceptuales

- Prueba dos o más grupos y varias opciones a 320, 390, 600, 740, 1024 y 1440 px, registrando ancho útil. Por debajo de 768 px todos los grupos y Agregar grupo se alcanzan por recorrido vertical.
- Repite la geometría de imágenes de U01 y prueba oferta sin etiqueta, estados activos e inactivos, imagen fallida y navegación de regreso.
- Comprueba ausencia de franjas laterales, estados con punto y texto, indicador separado de control, radios seleccionados terracota y curso/cantidad neutros.
- Usa teclado y tacto para Cambiar imagen sin hover, abrir el selector y comprobar la vista previa. Mide controles y metadatos de al menos 12/16.
- Revisa OfferComponents.test.tsx, incluidos los casos históricos de las líneas 670 y 1143. Documenta la incompatibilidad de expectativas de controles pendientes antes de revisar solo esas expectativas; conserva ausencia de operaciones no disponibles.
- Ejecuta OfferComponents.test.tsx, OffersPage.test.tsx, OfferFormPage.test.tsx y regresiones afectadas. Añade identidades estables de regreso para UX15.

## Criterios de aceptación

- [ ] U02 no exige desplazamiento horizontal en móvil y Agregar grupo sigue visible en el recorrido.
- [ ] U09 y U10 tienen estados y acciones consistentes en ofertas, con evidencia complementaria de catálogo, entradas y recetas.
- [ ] U19 acredita el ancho útil y los aportes de las áreas; no se cierra por una sola captura móvil de ofertas.
- [ ] U21 retira los controles pendientes y conserva las acciones y orígenes soportados, incluida la edición de opciones existentes.
- [ ] U23 permite cambiar imagen con teclado y tacto sin depender de hover, con iconografía coherente.
- [ ] Se conservan U01 y los contratos operativos. Las incompatibilidades reales de tests se informan y los aportes compartidos quedan trazados.

## Entrega

Registra base, archivos reales, reservas, comandos y resultados, casos y evidencia por ID según la [entrega común](README.md#entrega-y-cierre). Distingue integración del ticket y cierre de hallazgos. Las instrucciones anteriores describen trabajo futuro y no acreditan una corrección ya ejecutada.
