# T04 — Activación y recuperación correcta del formulario de entradas

**Estado:** Pendiente de implementación.
**Oleada:** 6 · **Prioridad:** P0 · **Complejidad:** L
**Requisitos previos:** [T02C](oleada-04-t02c.md), [T12](oleada-01-t12.md).
**Hallazgos propios:** A06, A07, E01, E02, E03, E04, E06, E07, E08.
**Plan fuente:** [Plan de corrección](../audit-issues-correction-plan.md), ficha T04, confirmación de activación 3.1 y matrices 7.2/7.6.

## Instrucciones

1. Reserva `src/features/entries/entryError.ts` y su test, `EntryFormFeedback.tsx`, `EntryFormPage.tsx`, `useEntryForm.ts` y `EntryFormPage.test.tsx`. Incluye `src/api/entryApi.remediation.test.ts`, los casos de A07 en `menuApi.contract.test.ts`, las ramas updateEntry/setEntryStatus de `src/api/menuApi.ts`, sus tests y el tipo de actualización de `src/application/catalog.ts`.
2. Ajusta `e2e/entry-form.spec.ts` y `e2e/entry-form-remediation.spec.ts` sólo para las regresiones particulares. Consume las operaciones de T01, la cadena de T02C, caché y validador de T12 sin volver a migrar sus contratos.
3. Retira el rechazo general histórico de ACTIVE en las dos vías del cliente. Permite solicitar las transiciones contractuales, muestra errores de servidor y conserva el estado confirmado ante rechazo. Desarchivar sigue llevando a INACTIVE; editar texto de una entrada ACTIVE sin cambiar estado no solicita otra activación.
4. Mantén el ETag de apertura en updateEntry y permite omitir el estado del PATCH cuando no cambió. No añadas Idempotency-Key a ese PATCH ni una acción de activación al catálogo.
5. En revisión de conflicto, muestra imagen actual, referencia o ausencia junto al borrador/archivo local. Clasifica 428 como revisión de versión. Tras PATCH incierto consulta y permite elegir explícitamente, sin renovar ETag y reenviar automáticamente.
6. Separa persistencia confirmada de la continuación onSaved. Un fallo de navegación/refresco después de guardar sigue siendo éxito de escritura y no debe habilitar otra creación.
7. Fortalece los tests: compara imageId exacto en creación/edición; los tests aislados de subida se nombran por lo que prueban y el formulario integrado intenta guardar tras una imagen rechazada. Modifica realmente campos/imagen antes de cancelar. Restaura globals, descriptores, URL de imagen, RAF y scroll con limpieza garantizada incluso tras una aserción fallida.

## Invariantes

- La política de activación se apoya en las invariantes de servidor confirmadas por el usuario; no se vuelve a bloquear todo ACTIVE por una duda histórica.
- Conserva la recuperación manual de imagen/POST de entrada de T02C: claves distintas, mismo archivo/tipo o imageId y ninguna creación adicional ante incertidumbre. IN_PROGRESS/KEY_REUSED no son revisión de versiones.
- Recargar restaura el mismo formulario sin enviar. Salir descarta recuperación y bloquea la continuación de una carga tardía; no deshace entradas ya guardadas.
- Aplica 3.4 a borrador editable separado y errores locales: nunca pierdas un éxito remoto por fallar el almacenamiento o un callback posterior.
- T06 entregará el recorrido completo categoría → entrada → catálogo. No edites catalog-traffic.spec.ts ni crees aquí otro caso equivalente.

## Tests conceptuales

- Aceptación/rechazo contractual coherente desde ambas vías de activación; editar texto de ACTIVE no envía otra activación y el rechazo conserva borrador/estado confirmado.
- Submit directo, doble clic y validación de imagen pendiente no duplican operaciones. Imagen concurrente visible antes de aceptar revisión; 428 ofrece recuperación.
- Inspeccionar cuerpos exactos revela un imageId omitido o cambiado. El intento integrado de guardar con subida rechazada produce cero createEntry.
- Rechazar onSaved después del éxito no convierte la escritura en incierta ni permite otro POST. Cancelar un borrador modificado y reabrir muestra valores iniciales, URL correcta y cero persistencias.
- Globals/descriptores se restauran aunque no existieran antes o falle el caso. Reutiliza F5 de T02C y matrices comunes de T01; comprueba avisos/conexión específicos en Jest.

## Criterios de aceptación

- [ ] A06, A07: se comprueba imageId exacto y una interacción real de formulario acredita cero creaciones tras rechazo de imagen.
- [ ] E01, E02: revisión de 428/conflicto conserva el borrador y permite identificar el cambio de imagen antes de elegir.
- [ ] E03: activación consistente y contractual en ambas vías, sin reactivación por editar otro campo.
- [ ] E04: fallo posterior al guardado no habilita otra escritura ni cambia el éxito confirmado.
- [ ] E06, E08: aislamiento de globals y limpieza garantizada de descriptores, RAF y scroll.
- [ ] E07: cancelar/reabrir un borrador realmente modificado acredita limpieza y navegación correctas.
- [ ] Typecheck y pruebas afectadas pasan; entrega evidencia individual y el formulario corregido para T06.
