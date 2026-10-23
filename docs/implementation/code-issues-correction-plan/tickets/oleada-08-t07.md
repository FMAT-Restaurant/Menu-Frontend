# T07 — Contexto del editor de ofertas y conteos del catálogo

**Estado:** Pendiente de implementación.
**Oleada:** 8 · **Prioridad:** P0 · **Complejidad:** L
**Requisitos previos:** [T02D](oleada-05-t02d.md), [T03](oleada-01-t03.md), [T04](oleada-06-t04.md), [T06](oleada-07-t06.md), [T09](oleada-02-t09.md), [T10](oleada-07-t10.md), [T11](oleada-01-t11.md), [T12](oleada-01-t12.md).
**Hallazgos propios:** O11, O12, O16, O17, O18, O20, O32, O33.
**Plan fuente:** [Plan de corrección](../audit-issues-correction-plan.md), ficha T07, reglas 3.4/3.6 y matriz 7.7.

## Instrucciones

1. Reserva `src/features/offers/OfferFormPage.tsx` y su test. Ajusta ramas de ofertas en `src/application/catalog.ts`, `src/api/menuApi.ts`, `menuApi.test.ts` y `menuApi.contract.test.ts` sólo para integrar sus regresiones conservando las firmas de T02D. Añade `src/api/offerWrites.test.ts` si separas el transporte.
2. Crea `e2e/offer-form.spec.ts` para las regresiones nativas particulares y el recorrido completo crear/borrar oferta → catálogo. No edites el E2E común ni dupliques este recorrido en offers.spec.
3. Vincula el editor a entryId y offerId/creación. Al cambiar identidad limpia borrador, archivo, modal y validación, descarta la recuperación anterior y bloquea todas sus continuaciones tardías. Comprueba pertenencia de la oferta a la entrada de ruta antes de permitir edición o escritura.
4. Protege de inmediato el handler de guardado y la validación de imagen. Conserva carga y persistencia separadas de T02C/T02D: claves distintas, Blob/tipo mientras la carga sea incierta e imageId confirmado reutilizable.
5. Conecta recuperación de POST/PATCH con solicitud original; PATCH conserva If-Match de apertura. Prioriza mensaje/campos estructurados del servidor y diferencia 412 de ejecución nueva, errores idempotentes y rechazo confirmado. Adoptar otra versión tras un 412 inicia una nueva operación explícita; la incertidumbre no permite cambiar la anterior.
6. Completa éxito local una vez e invalida entradas. Conserva cambios posteriores de campos/composición/archivo y asocia IDs con la identidad local, padre y solicitud de 3.6. Si no es seguro, conserva éxito y borrador y usa la revisión explícita antes de otro guardado, sin repetir POST ni perder cambios.
7. Separa éxito de escritura y fallo posterior de navegación/refresco. Una respuesta malformada conserva la operación recuperable; un éxito reproducido no equivale a lectura actual del recurso. Corregir rechazo confirmado puede iniciar otra operación con imageId existente; el vencimiento incierto sigue 3.4 sin reenviar bajo nueva clave/versión automáticamente.
8. En offer-form.spec, puebla primero caché del catálogo, crea oferta INACTIVE, vuelve y comprueba offerCount incrementado; entra al listado, bórrala y vuelve para comprobar decremento. Usa datos simulados que cambien, el mismo repositorio y navegación sin F5; cada retorno debe ocurrir antes de los 30 s de la respuesta anterior. T06/T10 aportan catálogo/borrado, pero este ticket posee el caso completo.

## Invariantes

- La respuesta de A no modifica B ni restaura A al abandonar el editor. Salir durante carga no inicia después la escritura del recurso; lo confirmado en servidor permanece.
- Restaurar el mismo editor no envía. Reintentar mantiene clave/JSON/If-Match y no vuelve a subir imagen; conserva la fuente única y el contexto de selector de T02B.
- No asocies miembros por índice actual o sólo por nombre, no restaures eliminados ni atribuyas IDs a altas posteriores. No conviertas éxito en incertidumbre por una correspondencia ambigua.
- Un borrador editado tras timeout sigue visible y pendiente; no cierres/navegues perdiéndolo ni anuncies que el reintento guardó esos cambios nuevos.
- No cambies los contratos públicos del selector/caché ni las primitivas comunes. T14 posee RecipePage/RecipeFormDialog en esta oleada; consérvalos sin editar.

## Tests conceptuales

- Oferta de otra entrada no permite editar/escribir. A → nueva → B no arrastra archivo/composición y una carga/validación de A resuelta después no afecta B.
- Submit directo/doble y validación pendiente no duplican operación. Imagen confirmada y rechazo/timeout del recurso conserva imageId.
- Simula Axios 422 con detalles reales y comprueba mensaje/campos y borrador; no uses un Error manual que eluda el analizador.
- En edición, falla getEntry/getOffer y reintenta: espera datos realmente recuperados y ambas consultas, no un título ya visible. Un fallo de navegación tras persistir produce cero escrituras adicionales.
- Reutiliza correspondencia/recarga de T02D y tablas de T01; comprueba aquí conexión de controles y conservación del borrador. El E2E propio acredita ambos cambios de conteo dentro del TTL.

## Criterios de aceptación

- [ ] O11, O12: pertenencia, limpieza e identidad protegen el editor y su recuperación ante cambios de contexto.
- [ ] O16, O17: handler/carga no duplican y recuperación conserva imagen, operación, If-Match e identidades de composición.
- [ ] O18: crear y borrar actualizan conteos visibles dentro del TTL en el recorrido completo de offer-form.spec.
- [ ] O20, O33: errores estructurados y conflictos se presentan según su motivo, con un 422 contractual y borrador conservado.
- [ ] O32: el caso de recuperación exige las cargas y datos de edición efectivos.
- [ ] Typecheck y suites afectadas pasan; entrega evidencia individual y el E2E completo sin delegar su escritura a T18.
