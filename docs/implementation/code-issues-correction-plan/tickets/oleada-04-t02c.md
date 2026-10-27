# T02C — Carga de imágenes y creación recuperable de entradas

**Estado:** Pendiente de implementación.
**Oleada:** 4 · **Prioridad:** P0 · **Complejidad:** L
**Requisitos previos:** [T02B](oleada-03-t02b.md), [T12](oleada-01-t12.md).
**Hallazgos propios:** Ninguno.
**Aportes:** Cadena de imagen/entrada para T04 y carga explícita de ofertas para T02D/T07.
**Plan fuente:** [Plan de corrección](../audit-issues-correction-plan.md), ficha T02C, política 3.4 y reparto de pruebas 8.1.

## Instrucciones

1. Reserva carga de imagen y creación de entrada en `src/application/catalog.ts`, `src/api/menuApi.ts` y sus tests. Incluye `src/features/entries/EntryFormPage.tsx`, `useEntryForm.ts`, `EntryFormFeedback.tsx`, sus pruebas y los interceptores afectados de `e2e/entry-form.spec.ts` y `e2e/entry-form-remediation.spec.ts`.
2. Migra también la carga de `src/features/offers/OfferFormPage.tsx` y sus pruebas/dobles. Adapta createOffer/updateOffer únicamente para recibir imageId confirmado en lugar de subir el archivo implícitamente. La identidad de sus escrituras se añadirá en T02D; no dejes un consumidor de imagen usando la ruta antigua.
3. Expón la carga reutilizable con identidad explícita, incluido uploadEntryImage. Todas las vías de POST a `/media/images` deben usar su clave propia y el mecanismo de T01.
4. Migra createEntry con otra identidad de operación. Conecta registro previo, almacenamiento, formulario y recuperación manual de la cadena imagen → entrada. Mantén el detalle/ETag existente y el PATCH de entradas sin clave.
5. Conserva File/Blob y tipo de medio mientras la carga esté incierta; tras confirmarse, conserva imageId aunque falle la escritura del recurso. Aplica 3.4 a fallos locales entre etapas, solicitud inmutable y borrador actual separado.
6. Amplía `e2e/operation-recovery.spec.ts` con recarga real de la carga y del POST de entrada. Conserva el registro del contexto padre/selector de T02B al ampliar la recuperación del editor de ofertas.

## Invariantes

- Imagen y recurso son operaciones distintas, con claves distintas. Reintentar el recurso reutiliza imageId y no vuelve a subir ni elimina la imagen para compensar.
- La identidad de imagen se basa en los mismos bytes y tipo de medio de file; boundary, nombre y orden de partes pueden variar. No almacenes sólo una URL temporal ni el multipart serializado.
- Recargar no envía. Salir descarta recuperación y bloquea el guardado posterior de una carga tardía, sin cancelar escrituras confirmadas del servidor.
- Los cambios visibles posteriores no alteran la solicitud pendiente. Elegir otro archivo no sustituye los bytes de recuperación; iniciar su nueva operación requiere resolver la anterior o confirmar su rechazo.
- Si falla guardar la imagen ya confirmada en el registro local, conserva ID/archivo/borrador y detén la etapa siguiente hasta registrarla. Un recurso confirmado con limpieza local fallida sigue siendo éxito y no permite otro POST.
- No generes claves en el adaptador ni añadas caminos que omitan cabeceras. No dupliques el validador de T12 ni modifiques las reglas de activación que resolverá T04.

## Tests conceptuales

- Recuperar una carga con mismos bytes/tipo y clave devuelve el mismo imageId aunque cambie el multipart. Tras F5, el Blob real sigue disponible sin volver a elegirlo.
- POST de entrada aplicado sin respuesta recupera la misma entrada/imagen con una clave distinta de la carga; acredita también la recarga de esta segunda operación.
- Imagen confirmada y recurso rechazado/incierto reutiliza imageId. Salir durante carga produce cero escrituras posteriores aun cuando llegue su respuesta.
- Simula abort/fallo local entre etapas y limpieza fallida tras éxito; comprueba ausencia de escritura extra y conservación de datos. Si llega éxito con cambios nuevos, no pierdas archivo/campos ni navegues automáticamente sobre ellos.
- Reutiliza tablas de errores/tiempos de T01; aquí prueba argumentos del transporte, conexión a formularios y persistencia nativa.

## Criterios de aceptación

- [ ] Carga de imágenes queda migrada en todos sus consumidores de entradas/ofertas y la creación de entradas es recuperable de extremo a extremo.
- [ ] Las dos recargas nativas están acreditadas y no hay POST al restaurar ni nueva carga al reintentar el recurso.
- [ ] El contexto anidado de T02B se conserva y las escrituras de ofertas quedan listas para T02D sin una migración parcial de imagen.
- [ ] Typecheck, pruebas afectadas y build pasan; cualquier extracción conserva el umbral de cobertura y su reserva de configuración.
- [ ] Entrega evidencia a T04/T07 y libera adaptador/tipos para T02D, sin adjudicarte sus cierres individuales.
