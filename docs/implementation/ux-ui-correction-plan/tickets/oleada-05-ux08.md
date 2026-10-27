# UX08. Corregir biblioteca y formulario de recetas

**Estado:** Pendiente de implementación.
**Oleada:** 5 · **Prioridad:** P2 · **Complejidad:** L.
**Requisitos previos:** [UX05](oleada-04-ux05.md)
**Hallazgos propios:** U04, U13
**Aportes o condiciones que conserva:** U03, U07, U08, U09, U10, U19, U22
**Casos de verificación:** V02, V03, V05, V07, V08, V18 de la sección 7.2 del plan.
**Habilita:** [UX10](oleada-06-ux10.md), [UX17](oleada-12-ux17.md)
**Plan fuente:** [Plan de implementación](../ux-ui-implementation-plan.md), ficha UX08, matriz de la sección 4, reservas de la sección 5.1 y verificaciones de las secciones 7 a 9.
**Evidencia de origen:** [Auditoría UX/UI](../audit/ux-ui-audit-2026-10-23.md).
**Reglas comunes:** [Índice de tickets](README.md), [DESIGN.md](../../../DESIGN.md) y [AGENTS.md](../../../../AGENTS.md).

## Instrucciones

1. Reservar `src/features/recipes/RecipePage.tsx`, `RecipeCard.tsx`, `RecipeFormDialog.tsx`, `src/features/recipes/styles.css`, `RecipePage.test.tsx` y regresiones de recetas. Separar biblioteca vacía de búsqueda sin coincidencias. La búsqueda fallida conserva el término y ofrece limpiar o cambiar la consulta como recuperación principal.

2. Situar errores de nombre, instrucciones, insumo y cantidad junto al control y asociarlos de forma accesible. El resumen lleva al campo y no oculta el motivo bajo toda la lista de insumos. Conservar la lógica de consulta, selección de inventario, unidades autoritativas y tratamiento de respuestas tardías.

3. Transformar la tabla de insumos según el ancho útil de su contenedor. A 600 y 740 px no deben comprimirse select ni cantidades. Aplicar los tamaños táctiles también en tableta. Reducir cajas repetidas y el protagonismo de eliminar recetas, conservando su confirmación y restricciones de referencia.

4. Probar biblioteca con tres recetas y consulta sin coincidencias, biblioteca realmente vacía, varios insumos, cantidades inválidas y texto largo. Verificar administración y el modo de selección existente antes de sustituir su contenedor en UX10. La entrega no debe cambiar el contrato de creación ni descartar recuperación de operaciones.

## Invariantes

- El formulario conserva consulta, selección de inventario, unidades autoritativas, creación y recuperación de operaciones.
- Una respuesta tardía no sustituye el formulario o los datos vigentes.
- La biblioteca vacía y una búsqueda sin coincidencias son estados distintos; no se inventa ausencia de recetas.
- El cierre de U04 requiere la evidencia de categorías de UX05. UX10 vuelve a comprobar U13 dentro del selector final.
- UX09 puede editar ofertas en esta oleada. No invadas sus archivos ni cierres los hallazgos conjuntos antes de integrar ambas áreas.
- Cada test debe comprobar un caso real. Ante un fallo, investiga el código. Informa un defecto o incompatibilidad del test antes de modificarlo y conserva sus garantías funcionales.

## Tests conceptuales

- Con tres recetas existentes, busca un término sin coincidencias. Deben mantenerse la consulta y una recuperación por limpiar o cambiarla. Prueba también una biblioteca realmente vacía.
- Envía nombre, instrucciones, insumo y cantidad inválidos. Comprueba error junto al control, asociación accesible, resumen que lleva al campo y cero escrituras inválidas.
- Prueba varios insumos, cantidades y texto largo a 600 y 740 px útiles y en móvil. La transformación no comprime selects ni campos.
- Comprueba administración y selección actuales, restricciones y confirmación de eliminar, inventario fuera de la página actual y respuestas tardías.
- Ejecuta RecipePage.test.tsx y regresiones de recetas, inventario y recuperación afectadas. Contrasta el aporte de UX05 antes de proponer cierre de U04.

## Criterios de aceptación

- [ ] U13 diferencia biblioteca vacía de consulta sin coincidencias y ofrece la recuperación apropiada en cada caso.
- [ ] U04 cuenta con errores por campo, foco y asociación accesible tanto en recetas como en la evidencia integrada de categorías.
- [ ] Los insumos se adaptan al ancho de su contenedor con controles legibles y táctiles, sin cajas y acciones destructivas dominantes.
- [ ] Administración y selección conservan su contrato de datos, unidades, creación y recuperación.
- [ ] La entrega acredita los aportes de recetas y comunica a UX10 qué condiciones deben repetirse en el contenedor de pasos.

## Entrega

Registra base, archivos reales, reservas, comandos y resultados, casos y evidencia por ID según la [entrega común](README.md#entrega-y-cierre). Distingue integración del ticket y cierre de hallazgos. Las instrucciones anteriores describen trabajo futuro y no acreditan una corrección ya ejecutada.
