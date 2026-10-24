# Entrega de UX06

Ticket UX06, tarjetas y adaptación del catálogo. Agente `/root/ux01_images`. Base recibida `0e375aa`, con UX04 integrada. Estado solicitado: en revisión. UX05 y UX07 trabajan en áreas distintas; se conservó su reserva.

## Cambios

EntryCard sustituye el enlace vacío que cubría toda la tarjeta por Ver ofertas visible. Editar conserva su enlace independiente. Ambos mantienen href, codificación del id, returnTo, bloqueo durante actualización y acceso por teclado. No hay controles anidados ni otra superficie invisible que intercepte la tarjeta.

Eliminar pasa a una fila terciaria con explicación visible. Las entradas activas e inactivas indican que solo pueden eliminarse entradas archivadas; la ayuda se asocia mediante aria-describedby y no depende del atributo title. Las archivadas mantienen advertencia de eliminación definitiva y el mismo callback de confirmación nativa. No se modificaron carga de versión, ETag, eliminación, caché ni recuperación.

El grid usa el ancho disponible del contenedor menu-module: una columna antes de 768 px, dos entre 768 y 1199 y tres desde 1200. Los márgenes internos y máximos de página siguen perteneciendo a UX04; el viewport se mide por separado para probar un módulo estrecho en un host ancho. Los filtros se reorganizan sin alterar sus consultas. El selector de tamaño mantiene 88 px sin encogerse y muestra el valor 12. Controles estándar y táctiles consumen --control-height, 40 y 48 px. El contenido largo envuelve dentro de la tarjeta.

Las tarjetas usan títulos 18/26, metadatos y ayuda 12/16, radio de 12 px y espacios de la escala. Los estados siguen mostrando punto y texto. El fallback de imagen y el vacío consumen la familia SVG compartida existente, sin una dependencia nueva. La imagen mantiene su zona reservada y el onError original. No se añadió un precio a la entrada.

Las identidades para UX15 son únicas y estables. Artículo `entry:<id>` con tabIndex -1 como respaldo; enlaces `entry:<id>:offers` y `entry:<id>:edit`; botón `entry:<id>:delete`. Los enlaces conservan su secuencia de Tab. No se añadió un coordinador de foco ni estado de navegación alternativo. El [análisis de impacto](impact.md) documenta los consumidores y este contrato.

## Archivos y pruebas existentes

Se editaron EntryCard.tsx, CatalogResults.tsx, styles.css y una expectativa de CatalogPage.test.tsx dentro de src/features/catalog. Se añadieron EntryCard.test.tsx y e2e/ux-ui-06.demo.spec.ts. Las ampliaciones autorizadas modifican solo el acceso a ofertas en e2e/menu.spec.ts y e2e/offers.spec.ts. CatalogPage.tsx y CatalogFilters.tsx no necesitaron cambios: su contrato existente consume la nueva presentación.

Una expectativa existente exigía que el texto Ver ofertas no apareciera en la tarjeta. Se informó al integrador antes de editarla y se recibió autorización para sustituirla por su presencia visible, conservando identidad, clasificación, estado, conteo, destinos y restricción de borrado.

Antes de ejecutar la suite normal se identificó otra incompatibilidad en e2e/menu.spec.ts. Su último paso pulsa por coordenadas la esquina de la foto y depende del enlace invisible que U11 ordena retirar. Se informó al integrador, que lo comunicó al usuario y amplió la reserva únicamente para sustituir ese paso por el enlace visible Ver ofertas. Se documenta aquí antes de editarlo. El recorrido conserva búsqueda, ausencia de coincidencias, limpieza, confirmación/Escape y llegada a las ofertas de la misma entrada. No se alteran las pruebas de paginación, tráfico, payload, ETag o caché para hacerlas pasar.

La primera suite normal integrada pasó 51 de 52 casos. El único fallo aparece en e2e/offers.spec.ts, caso "opens an entry's offers and returns to the catalog without losing the query". Usa también la esquina de la foto por coordenadas y depende del mismo overlay retirado por U11. El integrador informó al usuario y amplió la reserva únicamente para sustituir ese acceso por el enlace visible de la misma entrada. Se documenta antes de editar, conservando todas las aserciones de query, retorno, estado y composición. Screenshot y error-context negativos se preservan en normal-negative/. La búsqueda del resto de clicks por coordenadas distingue esta navegación de los gestos sobre backdrop, que no se cambian.

Las tres unitarias nuevas comprueban destinos y returnTo de ambos enlaces visibles, claves de origen sin duplicados ni controles anidados, ayuda de eliminación restringida y callback de eliminación archivada. Las regresiones de navegador preparadas recorren ocho anchos de viewport, seis anchos de módulo dentro de un host de 1440 px y un caso de edición real con nombre largo y tres categorías. Ese último caso comprueba Ver ofertas y Editar con teclado, las restricciones y la confirmación archivada con Escape y retorno de foco. Los datos demo se cambian mediante la UI; no se intercepta API para controlar un repositorio en memoria.

No se editaron BASE, App, main, configuración de Playwright, registro, otras áreas ni audit histórico. Los dos imports nuevos de Icon son los únicos vínculos estáticos de producción añadidos. El orquestador actualiza el índice al integrar. No se hicieron commits ni se iniciaron servidores desde este agente.

## Verificación

| Comprobación | Resultado y alcance |
| --- | --- |
| Unitarias focalizadas | 4 suites y 32 tests pasan en 7,464 s. [Log](unit.log). Incluyen CatalogPage, remediation, CatalogResults y EntryCard. |
| Tipos | Pasa sobre la base compartida observada al terminar la entrega de código. [Log](typecheck.log). |
| Lint focalizado | Pasa para TS/TSX de la entrega y regresión nueva. [Log](lint.log). |
| Demo integrada final | 32 tests pasan en 43,3 s sobre UX05/UX06/UX07 congeladas, incluidos tres casos UX06, los dos demo previos y regresiones UX01 a UX04. [Log final](../oleada-04-demo-final.log). La primera ejecución pasó los mismos 32 casos en 49,7 s. La fuente de catálogo no cambió entre ambas ejecuciones. Los casos nuevos vigilan cero API y errores JavaScript. |
| E2E normal final | 52 tests pasan en 18,6 s después de adaptar los dos accesos invisibles documentados, sin cambiar sus otras aserciones. [Log final](../oleada-04-production-preview-final.log). Conserva tráfico, query, paginación, caché, estado, composición y recuperación. Usa respuestas HTTP controladas, sin afirmar integración real de servicios. |
| Medidas y capturas | [browser](browser/) conserva 16 PNG y tres JSON físicos. El [resumen](measurements-summary.json) reúne viewport, módulo, columnas, selector y altura mínima de controles. Se revisaron con view_image los tamaños 320/740/768/1199/1200, los hosts reducidos 320/767/768/1200 y los nombres largos 390/1440. |
| Comparación original | Vistas las capturas 18, 20 y 21 de auditoría. El selector muestra 12 completo en 88 px. La acción Ver ofertas aparece separada de Editar. El grid de 740 px pasa a una columna y conserva controles de 48 px. |

Las medidas confirman una columna en 320/390/740/767 px, dos en 768/1199 y tres en 1200/1440. Con viewport de 1440, los módulos 320/740/767/768/1199/1200 vuelven a producir sus cortes propios, no los del viewport. El selector conserva 88 px en todos los casos. Todos los controles visibles medidos tienen al menos 48 px por debajo de 1200 y 40 px desde ese ancho. Título 18/26, ayudas 12/16 y radio 12 quedan registrados en los JSON. La navegación con teclado a ofertas y edición, tres categorías y la restitución del foco al cancelar borrado archivado constan en routes.json.

## Aportes y pendientes

El integrador acredita U11 con los destinos visibles y operables del navegador integrado y la repetición final. Se aportan controles, tipografía, geometría, estados, jerarquía destructiva y responsive a U03/U07/U08/U09/U10/U19/U22, más identidades a U24. U19 y los demás hallazgos compartidos esperan a sus responsables UX02/UX09/UX15 y los otros consumidores de la matriz; esta entrega no los cierra por sí sola.

La confirmación y recuperación de UX03, la imagen de ofertas de UX01 y las cabeceras de UX04 se conservaron en la ejecución integrada. Los 16 PNG y tres JSON retenidos corresponden a la misma fuente de catálogo, cuyos casos volvieron a pasar. El shell real queda fuera de alcance y tacto físico, teclado virtual y lector conservan su validación manual pendiente. El agente no confunde emulación con esas comprobaciones.

No hay procesos propios activos. La integración, revisión final, ejecución global y liberación de reserva corresponden al orquestador.
