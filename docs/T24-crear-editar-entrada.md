# T24 — crear y editar una entrada

Las rutas `/entries/new` y `/entries/:entryId/edit` muestran el formulario administrativo C08–C12 y conservan los filtros de V1 al guardar o cancelar. La carga del formulario consulta las categorías del menú actual y, en edición, el detalle administrativo de la entrada. Las categorías son opcionales y se pueden seleccionar varias.

Las entradas nuevas se envían sin estado para que el servicio las cree `INACTIVE`. La edición conserva la imagen vigente cuando no se elige reemplazo y envía el estado junto con los cambios; desde `ARCHIVED` el único siguiente estado disponible es `INACTIVE`. La elegibilidad de publicación depende también de las ofertas y la decide el servicio.

La imagen se valida en el navegador como JPEG, PNG o WebP, hasta 10 MiB y 4096 px por lado. La API debe volver a validar el archivo de forma autoritativa y guardar la entrada y la imagen atómicamente.

## Contrato y configuración

La integración sigue el OpenAPI vigente: `GET /menus/{menuId}/categories`, `GET /menus/{menuId}/entries/{entryId}`, `POST /menus/{menuId}/entries` con partes multipart `entry` (JSON) e `image`, y `PATCH /menus/{menuId}/entries/{entryId}` como JSON o multipart al reemplazar la imagen. `MENU_ID` se inyecta desde la configuración de ejecución y usa `1` como valor local inicial. `API_BASE_URL` conserva su función de URL base.

El `Menu-Backend` consultado durante T24 aún implementa los endpoints singulares `/menu/entries` y `/menu/categories` y la subida separada `/media/images`. Por ello, el formulario requiere que Back implemente o adapte las rutas plurales documentadas antes de integrarse con ese despliegue. La UI no introduce rutas ni parámetros nuevos al contrato.

Jest exige al menos 80% en sentencias, ramas, funciones y líneas para `EntryFormPage.tsx` y `entryImage.ts`; la suite incluye validación de archivos, creación/edición, errores, cancelación y transiciones.
