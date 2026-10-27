# T13 — Recetas completas y conexión independiente de Inventario

**Estado:** Pendiente de implementación.
**Oleada:** 7 · **Prioridad:** P0 · **Complejidad:** L
**Requisitos previos:** [T02B](oleada-03-t02b.md), [T15](oleada-06-t15.md).
**Hallazgos propios:** P01, P03, P07, P08, P09, P10, P13, P14, P17.
**Plan fuente:** [Plan de corrección](../audit-issues-correction-plan.md), ficha T13, DEC-02 y matriz 7.8.

## Instrucciones

1. Reserva `src/features/recipes/RecipePage.tsx`, `RecipeCard.tsx`, `RecipePage.test.tsx` y `RecipeFormDialog.tsx` para detalle/representación de ingredientes y su selector existente. Crea `e2e/recipes.spec.ts`.
2. Para DEC-02 reserva `src/App.tsx`, `src/App.test.tsx`, `public/runtime-config.js`, la construcción del cliente de `src/api/menuApi.ts` y su test. Integra sobre las rutas de T15; revisa los consumidores/dobles del constructor antes de cambiarlo y registra las adaptaciones necesarias.
3. Añade navegación de todas las páginas de recetas en administración/selección y búsqueda que reinicia página. Conserva un borrador de texto sólo para lo aún no enviado; elimina la duplicación de consulta confirmada/URL sincronizada por efecto que provoca cargas antiguas.
4. Añade búsqueda y paginación independientes de Inventario en el diálogo de receta. Conserva las selecciones al cambiar página y separa su error/reintento del de recetas. No descargues todo el inventario al abrir ni impongas otro tope silencioso de 100.
5. Cada ingrediente seleccionado conserva sus datos propios fuera de la página actual. Al editar, usa nombre/unidad del campo inventoryItem de cada elemento de supplies del detalle de Menu, junto con inventoryItemId y quantity. Una selección nueva conserva ID/nombre/unidad de Inventario. Guarda sólo ID/cantidad conforme al contrato de insumos de receta.
6. Abre edición únicamente con detalle completo y ETag de T02B. Ante fallo muestra error/reintento sin convertir un resumen en detalle. Identifica/cancela aperturas para que A tardía no sustituya B; cambiar nombre conserva instrucciones e insumos.
7. Exige las acciones de RecipeCard según el modo y los botones renderizados. Conserva la interfaz externa de RecipePage que consume el editor de ofertas.
8. Conecta un destino runtime parametrizado de Inventario y cliente independiente de Menu, conservando el puerto público de consulta de insumos. Define nombres/cableado como detalle de implementación y prueba los destinos efectivos de ambos servicios.

## Invariantes

- Estar fuera de una página de Inventario no indica indisponibilidad ni bloquea el guardado. Los datos completos ya entregados por Menu no requieren otra consulta por ID para reconstruirse; el servidor valida las reglas de negocio.
- No inventes unidades, instrucciones ni ingredientes cuando falle el detalle. Conserva cantidades y datos de filas seleccionadas al buscar/paginar.
- No implementes el selector pendiente de Inventario de ofertas. Se corrige el selector de ingredientes de receta ya existente.
- Conserva el contrato del selector, la fuente única y recuperación anidada de T02B. Esta tarea no vuelve a migrar creación/versiones de recetas.
- Esta oleada reserva adaptador/App a T13; T06/T10 sólo los consumen. Mantén la misma instancia de repositorio y los plazos comunes.

## Tests conceptuales

- Receta 51 y artículo 101 alcanzables, con búsqueda y modo selección; resultados nuevos sustituyen efectivamente los anteriores y la búsqueda reinicia página sin consulta antigua adicional.
- Falla Inventario, muestra motivo, reintenta y selecciona el artículo recuperado sin reiniciar el formulario de receta.
- Edita una receta cuyo ingrediente no está en la página de Inventario: muestra nombre/unidad desde Menu y conserva ID/cantidad al guardar. Selecciona otro y cambia página/búsqueda sin perder datos o cantidad.
- Falla detalle y no se abre formulario incompleto; abre A/B, escribe en B y resuelve A después sin reemplazarlo. Cambiar sólo nombre conserva instrucciones e insumos completos.
- Combinaciones de props sin acciones necesarias no compilan. Con URLs base distintas, las consultas de insumos usan Inventario y las de Menu conservan su destino.

## Criterios de aceptación

- [ ] P01: las props por modo requieren los callbacks de los botones ofrecidos.
- [ ] P03: ingredientes visibles y enviados conservan identidad, nombre/unidad y cantidad fuera de la página de resultados.
- [ ] P07, P08: todas las páginas son accesibles y el reintento de Inventario es independiente y efectivo.
- [ ] P09, P10: edición sólo con detalle completo/versionado y ninguna apertura tardía sustituye el editor vigente.
- [ ] P13, P14: una consulta confirmada por modo y tests que muestran datos/página/búsqueda finales correctos.
- [ ] P17: editar nombre preserva instrucciones e insumos con cantidades exactas.
- [ ] DEC-02 queda conectado y probado mediante destinos parametrizados independientes, sin otra decisión funcional pendiente.
- [ ] El E2E de recipes acredita búsqueda/paginación y disponibilidad desde administración y selector, sin sustituir su interacción real por aserciones de texto en jsdom.
- [ ] Typecheck y suites afectadas pasan; entrega evidencia y libera el formulario/recetas para T14.
