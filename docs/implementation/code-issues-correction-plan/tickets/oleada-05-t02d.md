# T02D — Escrituras recuperables y versiones de ofertas

**Estado:** Pendiente de implementación.
**Oleada:** 5 · **Prioridad:** P0 · **Complejidad:** L
**Requisitos previos:** [T02C](oleada-04-t02c.md).
**Hallazgos propios:** A01, A08.
**Plan fuente:** [Plan de corrección](../audit-issues-correction-plan.md), ficha T02D, reglas 3.4, correspondencia 3.6 y matriz 7.2.

## Instrucciones

1. Reserva métodos/tipos de ofertas en `src/application/catalog.ts`, `src/api/menuApi.ts` y sus tests; `src/features/offers/OfferFormPage.tsx`, `OffersPage.tsx` y sus tests/dobles. Incluye los tipos de `SlotCard.tsx`/`OptionModal.tsx` y los handlers del editor, incluido `CompositionEditor.tsx` cuando consuma las identidades. Adapta sus fixtures y OfferComponents.test si el contrato local lo requiere, registrando la ampliación.
2. Actualiza los E2E existentes que intercepten esas escrituras y añade los casos POST/PATCH de `e2e/operation-recovery.spec.ts`. Usa la carga explícita ya integrada, sin volver a migrarla.
3. Asocia detalle validado y ETag en getOffer. updateOffer recibe la versión de apertura, sin consulta de renovación. Migra createOffer, updateOffer y setOfferStatus con identidad explícita y todos sus consumidores juntos.
4. Para cambiar estado, construye el cuerpo contractual necesario, incluido presentationTag. Una lectura inicial fija estado, JSON e If-Match de la nueva operación; cada reintento usa exactamente esos datos, sin otra consulta de versión.
5. Conecta almacenamiento y recuperación manual del editor y la acción de estado conforme a 3.4. Mantén imageId confirmado y clave de escritura distinta de la carga. El JSON de ofertas no envía recipeRevision ni un número por defecto; T08 completará los tipos locales y la intención de reasignar.
6. Introduce identidad local estable de cada slot/opción, separada de sus IDs de servidor. Conserva identidad, padre y relación con los miembros de la solicitud original al editar, reordenar y recargar. Las acciones apuntan a esa identidad; eliminar y añadir crea otra, aunque repita datos.
7. Al recuperar, reconoce miembros existentes por ID de servidor y padre. Para miembros nuevos, incorpora IDs sólo mediante correspondencia uno a uno comprobable con los datos contractuales enviados dentro del mismo padre. No uses índice actual, nombre aislado ni orden de respuesta no garantizado. No restaures eliminados ni asignes IDs a altas posteriores.
8. Si una respuesta confirma éxito pero no permite asociar miembros con seguridad, conserva respuesta, ID de oferta y borrador actual por separado. Explica que se guardó el envío anterior y ofrece el detalle actual para revisión. Adoptar composición/ETag exige acción explícita y advertencia de los cambios locales de composición que sustituye; conserva los demás campos. Hasta resolverlo, impide otro guardado de esa composición sin bloquear su edición ni repetir el POST.

## Invariantes

- Una ejecución nueva con versión obsoleta puede devolver 412; recuperar un PATCH aplicado devuelve 200, cuerpo, ETag e IDs originales usando la clave, JSON e If-Match originales. No confundas ambos escenarios.
- Las claves locales no viajan al API. No construyas una combinación aproximada de árboles ni conviertas una correspondencia ambigua en incertidumbre sobre un éxito confirmado.
- Conserva los cambios posteriores del borrador y la intención de receta posterior al envío. Un éxito anterior no cierra/navega perdiéndolos ni reemplaza un archivo nuevo. El siguiente guardado de una oferta ya creada es una actualización explícita, no otro POST.
- Aplica los fallos locales, plazos, Retry-After, 24 h y salida voluntaria de 3.4. Cero reintentos automáticos y ninguna renovación silenciosa de clave/versión. Una respuesta tardía no actúa sobre otro contexto.
- Conserva la fuente única y restauración anidada de T02B. No implementes copia/selector de Inventario pendientes ni expongas revisiones internas de receta.

## Tests conceptuales

- Oferta abierta con v1 y cambio externo v2: primer guardado produce 412 sin tomar v2. El test debe fallar si vuelve el GET de renovación.
- PATCH con v1 aplicado sin respuesta: recuperar con misma identidad devuelve el 200/cuerpo/ETag/IDs originales. JSON o If-Match distintos bajo la misma clave produce KEY_REUSED en el contrato simulado.
- POST y acción de estado recuperan su resultado sin otra imagen o asignación. En navegador, POST y PATCH tienen recarga propia, restauración sin envío y reintento manual.
- Enviar dos grupos con opciones, perder respuesta, eliminar el primero, editar el segundo, añadir una opción, recargar y recuperar. Conserva IDs del segundo, cambios nuevos y la nueva opción sin ID; el primero no reaparece.
- Respuesta reordenada y datos repetidos: asociación segura o revisión explícita, nunca una conjetura. Agota variantes en Jest y acredita persistencia de identidades en el E2E de PATCH.
- Reutiliza evidencia de categorías/recetas de T02A/T02B y las tablas comunes de T01, sin repetir toda la matriz en navegador.

## Criterios de aceptación

- [ ] A01: las tres familias acreditan ETag de apertura y borrador conservado; queda diferenciada la reproducción idempotente del PATCH de ofertas.
- [ ] A08: los tests de edición ya no exigen renovación al guardar y detectan un sobrescrito sobre v2.
- [ ] Todos los métodos/consumidores de ofertas están migrados juntos; las seis operaciones protegidas del plan quedan adaptadas.
- [ ] Identidades, correspondencia segura y salida ambigua de 3.6 están implementadas y conservan el contexto de T02B.
- [ ] Typecheck, pruebas afectadas, suite unitaria completa, casos nativos y build pasan. Conserva la cobertura de cualquier lógica extraída.
- [ ] Entrega evidencia por ID/operación y libera la base contractual para las tareas de área, sin declarar cerrados sus hallazgos restantes.
