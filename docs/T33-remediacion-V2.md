# MVP1-T33 — remediación de V2

Implementa [issue #49](https://github.com/FMAT-Restaurant/Menu-Frontend/issues/49) sobre creación y edición de entradas. La jerarquía parte de V2 en el mockup del administrador: identidad, categorías, imagen, estado y acciones. Los estilos son de la aplicación y están acotados a V2.

## Cambios por criterio

| Área | Implementación |
| --- | --- |
| Regreso | «← Volver a entradas» visible arriba; comparte el destino seguro de Cancelar y conserva `returnTo` con consulta, filtros y página. Abrir directamente regresa a `/`. |
| Layout | Navegación y contenido alineados; identidad/categorías e imagen/estado en dos columnas de escritorio, una en móvil. Descripción redimensionable, preview de 176 px y acciones sticky con margen de desplazamiento para el foco. |
| Categorías | Componente separado con apertura por teclado, Escape, búsqueda local, lista de altura máxima 192 px y chips retirables. Mantiene selecciones ocultas y categorías asignadas ausentes; diferencia vacío, sin coincidencias, carga y fallo. |
| Imagen | Toda la zona abre el mismo selector mediante clic, Enter o Espacio. Cancelar conserva la elección; valida JPEG/PNG/WebP, 10 MiB y 4096 px por lado. Libera object URLs, ignora validaciones antiguas y muestra fallback sin cambiar la caja si una imagen falla. |
| Estado | Creación muestra «Estado inicial: Inactiva» y no envía `status`. Edición mantiene las transiciones; desarchivar deja inactiva. El estado administrativo no garantiza publicación. |
| Errores | Prioriza mensajes/detalles válidos del servidor frente al mensaje técnico de Axios. Identifica campos, enlaza errores accesibles, enfoca el resumen y conserva el borrador. Diferencia validación, acceso, inexistencia, conflicto, indisponibilidad, red y timeout. |
| Concurrencia de edición | Conserva el ETag fuerte de apertura y lo manda en `If-Match`; guardar no hace GET para renovarlo. Un 412 bloquea otro guardado hasta consultar los datos actuales y elegir explícitamente qué conservar. No se pueden aceptar datos mientras otra revisión está pendiente. |
| Cargas | Detalle y categorías tienen cargas, errores y reintentos independientes. Se puede escribir identidad durante la carga de categorías. Un fallo permite continuar explícitamente sin añadir categorías, conservando las asignaciones existentes. Un reintento no reemplaza el borrador; se ignoran respuestas de rutas abandonadas. |
| Caché | Categorías válidas duran 30 segundos y se conservan durante actualización. Solicitudes equivalentes comparten transporte; cada consumidor puede cancelar y se aborta al quedarse sin consumidores. Mantiene StrictMode y respeta invalidación tras cambios de categorías. La paginación conserva todas las páginas con máximo cuatro solicitudes posteriores simultáneas. |
| Guardado | Separa «Subiendo imagen» y «Guardando entrada» y protege envíos simultáneos. Reutiliza el `imageId` confirmado para el mismo archivo tras rechazo de persistencia; lo invalida al cambiar archivo o al rechazarse su referencia. |
| Esperas | Lecturas: 12 s; subida: 60 s; creación/edición: 20 s. Un resultado de escritura incierto no se repite automáticamente ni permite un segundo envío inadvertido. |

## Contrato consultado

Se verificó el [OpenAPI publicado](https://fmat-restaurant.github.io/Menu-Documentation/api/) y su [especificación YAML](https://fmat-restaurant.github.io/Menu-Documentation/api/openapi.yaml), versión **5.1.0**, el 14 de octubre de 2026. No se usó una copia local de Menu-Documentation para decidir rutas o payloads.

- `GET /menu/categories`: categorías paginadas.
- `GET /menu/entries/{entryId}`: detalle y ETag de apertura.
- `POST /media/images`: multipart con parte `file`; devuelve identificador.
- `POST /menu/entries`: JSON con identidad, categorías e `imageId`, sin estado inicial.
- `PATCH /menu/entries/{entryId}`: JSON e `If-Match` fuerte; omite `imageId` si no se reemplaza la imagen.
- Errores: `error.message` y `error.details.violations`, con rutas de campos cuando existan.

La aplicación conserva límites de arquitectura: las vistas consumen `MenuRepository`, la integración Axios permanece en `src/api/menuApi.ts` y caché/versiones pertenecen a aplicación.

## Recuperación y límites del contrato

El contrato no documenta idempotencia para creación ni limpieza de imágenes huérfanas. Una subida confirmada puede quedar sin asociar si después falla la persistencia; no se inventan endpoints para eliminarla. Si una referencia de imagen es rechazada, otro intento vuelve a subir el archivo.

En una creación con respuesta perdida se conserva el borrador, se permite revisar entradas en otra pestaña y se exige reconocer que se verificó el resultado antes de habilitar otro intento. Esta decisión no garantiza ausencia de duplicados: para garantizarlo se necesita idempotencia de backend. En edición con resultado incierto se consultan los datos actuales y se exige una decisión explícita. Un error o timeout durante la subida tampoco causa reintentos automáticos.

La validación autoritativa de imágenes, categorías, estados y elegibilidad de publicación sigue perteneciendo al servicio. Las pruebas del cliente usan transporte simulado y no prueban la implementación del backend.

## Validación

- Controles finales: `lint`, `typecheck` y `build` pasan; **215 pruebas unitarias en 16 suites** y **12 E2E** pasan. Cada módulo V2 cumple los cuatro umbrales exigidos.
- Jest impone **80 % mínimo de sentencias, ramas, funciones y líneas por módulo de V2**, incluidos los componentes extraídos, hooks, validación de imágenes, normalización de errores, caché y validación de ETag. No se rebajan umbrales anteriores.
- Pruebas con `AxiosError` real: campos, foco, 404/412/422/5xx, acceso, red y timeout; carga parcial, reintentos, respuestas tardías, StrictMode y cancelación.
- Transporte simulado: ETag de apertura sin GET previo al PATCH, timeouts separados y 701 categorías en ocho páginas con concurrencia máxima cuatro.
- Guardado: reutilización de upload, referencia rechazada, sustitución de archivo, mutex, conflicto con revisión explícita y escrituras inciertas.
- QA Chromium de V2 en **320×568, 390×844, 768×1024, 1024×768, 1366×768 y 1920×1080**; fixtures de 0, 3 y 100 categorías, nombres largos, búsqueda/selección, imagen vertical/horizontal, errores y demoras.
- Zoom 200 % emulado mediante CSS y viewport bajo **390×320**: sin overflow horizontal, foco por encima de acciones y Guardar accesible. Esta emulación no sustituye una comprobación en un dispositivo con teclado virtual real.
- E2E verifica teclado, clic de la zona de imagen, cancelación de archivo, preservación del borrador y ausencia de consultas al escribir o filtrar categorías.
- Una mutación temporal de la validación de ETag fue detectada por sus pruebas; se restauró antes de los controles finales. El análisis local de complejidad y ternarios anidados pasa con límite 15. El análisis de SonarCloud se obtiene después de publicar el PR.

Las capturas generadas están en `test-results/t33-desktop.png`, `t33-mobile.png` y `t33-zoom-200.png` y no se incluyen en el commit. El preview de revisión usa un servidor temporal con datos en memoria, sin incorporar fixtures de demostración al producto ni modificar registros del backend.
