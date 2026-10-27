# T14 — Formulario y borrado recuperables de recetas

**Estado:** Pendiente de implementación.
**Oleada:** 8 · **Prioridad:** P1 · **Complejidad:** L
**Requisitos previos:** [T13](oleada-07-t13.md).
**Hallazgos propios:** P02, P04, P05, P06, P11, P12, P15, P16.
**Plan fuente:** [Plan de corrección](../audit-issues-correction-plan.md), ficha T14, reglas 3.4 y matriz 7.8.

## Instrucciones

1. Edita `src/features/recipes/RecipePage.tsx`, `RecipeFormDialog.tsx`, `RecipePage.test.tsx` y, si separas sus casos, crea `RecipeFormDialog.test.tsx`. Amplía `e2e/recipes.spec.ts` sobre la base de T13 para las garantías nativas particulares.
2. Consume los contratos/operaciones de T02B sin volver a migrarlos. Bloquea todos los campos y handlers mientras se envía, incluidas identidad e instrucciones; permite editar entre intentos tras timeout/IN_PROGRESS y conserva solicitud original y borrador actual separados.
3. En creación, conserva UUID/JSON y recupera el mismo 201/recipeId. Si el selector iniciador sigue vigente y no quedan cambios posteriores, entrega la receta una vez; si existen, consérvalos para edición de la receta ya confirmada. Salir descarta recuperación y bloquea callbacks tardíos sin deshacer lo guardado.
4. En edición conserva detalle/ETag de apertura. Ante 412 o incertidumbre consulta y revisa antes de otra escritura; no renueves ETag para reenviar automáticamente, pues podría generar otra revisión. Distingue validación, permisos, conflicto, referencia de negocio y errores idempotentes de creación.
5. Atribuye «referenciada por una oferta» sólo a la respuesta contractual que lo demuestra. Usa estado/código del contrato capturado, sin inventarlos ni clasificar todo fallo como referencia.
6. Ante DELETE sin respuesta, consulta normalmente y representa la lista devuelta; conserva motivo/reintento si falla la lectura. Escape/cancel respetan DELETE pendiente igual que los botones y devuelven foco al terminar cuando corresponda.
7. Coloca legend como hijo directo de fieldset. Sustituye el contador global de filas por claves iniciales deterministas de instancia y claves nuevas generadas al añadir; editar/eliminar no cambia la identidad de las otras filas.

## Invariantes

- La creación es idempotente y el PATCH de recetas no tiene clave. Ni IN_PROGRESS ni KEY_REUSED equivalen a 412.
- Recargar restaura el formulario sin envío automático; Reintentar usa el original. No selecciones, cierres o navegues perdiendo cambios posteriores.
- DELETE incierto no exige otra pantalla/paso de revisión ni se repite automáticamente; un error de lectura no indica inexistencia.
- Conserva los ingredientes, paginación, detalle completo y conexión de Inventario de T13, y la interfaz externa de selección usada por T07.
- No edites el E2E común ni API/adaptador reservados a T07. Reutiliza recuperación nativa de T02B y tablas de T01.

## Tests conceptuales

- Campos/handlers inmóviles mientras la petición está pendiente y editables tras incertidumbre. Cada envío inválido deja cero onSubmit/repositorio; corregir envía exactamente el borrador válido.
- Creación recuperada entrega una selección al contexto vigente si no hay cambios; si los hay, conserva la receta confirmada y su edición. Cerrar/cambiar contexto impide callbacks tardíos.
- 412, 422, red, permisos y referencia real tienen mensajes/acciones diferentes; sólo la respuesta contractual de referencia anuncia receta utilizada.
- Tras DELETE sin respuesta se muestra la lista actual; fallar su consulta conserva error/reintento. En navegador, Escape durante DELETE mantiene diálogo/bloqueo y después restaura foco.
- Nombre accesible de fieldset acreditado por su legend. StrictMode/remontes y añadir/eliminar filas conservan identidad, cantidades y selección sin contador global.

## Criterios de aceptación

- [ ] P02: todos los campos y handler respetan el envío en curso sin duplicarlo.
- [ ] P04: recuperación distingue POST, PATCH y sus errores, conservando borrador y evitando nuevas revisiones accidentales.
- [ ] P05, P06: semántica del grupo e identidad de filas comprobadas, con inicialización pura.
- [ ] P11, P16: sólo el rechazo contractual correspondiente explica que una receta está referenciada.
- [ ] P12: botones, Escape y cancel respetan DELETE pendiente con foco correcto.
- [ ] P15: cada inválido acredita cero persistencias y el caso corregido un payload exacto.
- [ ] Typecheck y pruebas afectadas pasan; los casos nativos amplían recipes.spec sin copiar la matriz común. Entrega evidencia y libera la base para T08/T16.
