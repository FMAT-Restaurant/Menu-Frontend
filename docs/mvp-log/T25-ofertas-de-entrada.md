# T25 — ofertas de una entrada

V3 se abre desde cada tarjeta de V1 en `/entries/:entryId/offers` y conserva la consulta de la lista para volver. La pantalla consulta la entrada para mostrar su identidad y el estado administrativo, y pide páginas de ofertas filtradas por `entryId`. Cada tarjeta muestra la etiqueta de presentación, nombre de la entrada, imagen, precio base sin divisa asumida, estado y número de slots. Una oferta activa no se presenta como publicada si la entrada está inactiva.

Las acciones de crear y editar conducen a rutas de V4, cuyo formulario corresponde a una tarea posterior. Solo una oferta inactiva ofrece la eliminación, con confirmación. Activar se deshabilita cuando el resumen informa cero slots; el servicio valida autoritativamente la composición y la existencia de un slot activo. La UI muestra errores sin cambiar el estado local como si la operación hubiera terminado.

## Contrato e integración

Se verificó el [OpenAPI publicado](https://fmat-restaurant.github.io/Menu-Documentation/api/) el 11 de octubre de 2026. V3 usa `GET /menu/entries/{entryId}`, `GET /menu/offers?entryId=…` con paginación y `GET /menu/offers/{offerId}` para obtener el ETag fuerte antes de `PATCH` o `DELETE`. El PATCH envía únicamente `{ "status": "ACTIVE" | "INACTIVE" }` y `If-Match`. DELETE también envía `If-Match`. El Front no cambia el estado administrativo de la entrada.

**Brecha de Back:** `Menu-Backend` `main` en el commit `537f76b` implementa GET y PATCH de ofertas, pero `CatalogOfferController` no tiene DELETE. El botón de eliminar sigue el contrato publicado y mostrará un error hasta que Back implemente el endpoint y sus restricciones. La regla de no dejar una entrada activa sin otra oferta activa válida debe garantizarla Back.

T25 se ramificó desde T24 (`9c8ffaa`) porque V3 reutiliza la entrada administrativa y el vínculo desde V1. El PR de T25 debe tener T24 como base hasta que T24 entre a `main`; después puede apuntarse a `main`.

Jest exige al menos 80% de sentencias, ramas, funciones y líneas para `OffersPage.tsx` y `OfferCard.tsx`. Las pruebas cubren renderizado, navegación, paginación, acciones y errores, además del cliente HTTP del Front con transporte simulado.
