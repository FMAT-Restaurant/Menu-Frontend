# T24 — crear y editar una entrada

Las rutas `/entries/new` y `/entries/:entryId/edit` muestran el formulario administrativo C08–C12 y conservan los filtros de V1 al guardar o cancelar. La carga del formulario consulta las categorías del menú actual y, en edición, el detalle administrativo de la entrada. Las categorías son opcionales y se pueden seleccionar varias.

Las entradas nuevas se envían sin estado para que el servicio las cree `INACTIVE`. La edición conserva la imagen vigente cuando no se elige reemplazo y envía el estado junto con los cambios; desde `ARCHIVED` el único siguiente estado disponible es `INACTIVE`. La elegibilidad de publicación depende también de las ofertas y la decide el servicio.

La imagen se valida en el navegador como JPEG, PNG o WebP, hasta 10 MiB y 4096 px por lado. La API vuelve a validar el archivo de forma autoritativa. La subida de imagen es independiente; si falla el guardado posterior, la entrada conserva sus datos e imagen anteriores, aunque la imagen subida puede quedar sin asociar.

## Contrato y configuración

La integración sigue el [OpenAPI publicado](https://fmat-restaurant.github.io/Menu-Documentation/api/): `GET /menu/categories`, `GET /menu/entries/{entryId}`, `POST /media/images` con archivo en la parte `file`, `POST /menu/entries` con JSON que incluye `imageId`, y `PATCH /menu/entries/{entryId}` con JSON e `If-Match`. Si no se reemplaza la imagen, se omite `imageId`; al reemplazarla, se sube primero y se envía el nuevo identificador. `API_BASE_URL` conserva su función de URL base. El menú está provisionado en la instalación y no se envía `menuId`.

El cliente obtiene un ETag vigente antes de cada edición y deja al Back la validación de categorías, transiciones y referencias de imagen. Los errores de carga o guardado mantienen el borrador en pantalla.

Jest exige al menos 80% en sentencias, ramas, funciones y líneas para `EntryFormPage.tsx` y `entryImage.ts`; la suite incluye validación de archivos, creación/edición, errores, cancelación y transiciones.
