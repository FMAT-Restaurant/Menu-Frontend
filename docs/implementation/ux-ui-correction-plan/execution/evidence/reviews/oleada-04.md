# Revisión integrada de UX05, UX06 y UX07

Orquestador e integrador: `/root`. Base recibida:0e375aa, con UX00 a UX04 integradas. Los ejecutores conservaron reservas separadas de categorías, catálogo y entradas. La integración propuesta mantiene intacta la auditoría histórica.

## Resultado por ticket

| Ticket | Resultado comprobado | Evidencia y pendientes |
| --- | --- | --- |
| UX05 | Nombre requerido con error persistente asociado, descripción opcional, foco y resumen complementario. Cero escrituras inválidas. La creación incierta conserva borrador y reintenta con la misma clave y payload. | Dos casos demo y dos HTTP en390/1024px. Controles48px, radios8/12 y título22/30. U04 espera la parte de recetas de UX08. |
| UX06 | Ver ofertas y Editar son enlaces visibles hermanos. Eliminar queda en una fila secundaria con explicación visible y asociación accesible. Sin precio inventado, enlaces vacíos ni controles anidados. | Medidas de viewport y módulo: una columna hasta767px, dos hasta1199px y tres desde1200px. Selector12 visible en88px. Nombres largos, varias categorías, teclado y confirmación archivada conservados. U11 acreditado; aportes conjuntos de U19 y otros esperan recetas/ofertas. |
| UX07 | El recurso conserva la clasificación de error;404 presenta salida útil al catálogo sin formulario vacío ni reintento inútil.503 permite reintentar sólo la entrada. Las categorías tardías no borran nombre, asignación ni imagen. | Tres casos demo y tres HTTP. La API de error existente y las garantías de versiones, guardado, resumen y recuperación permanecen. U14 acreditado en demo y fixture HTTP. |

## Corrección encontrada durante revisión

La primera demo aprobó32 casos, pero su JSON permitió detectar controles de una línea de42/43px junto al input estándar de40px. La revisión devolvió el defecto al ejecutor de UX07. La corrección ajusta la línea del selector y la alineación del footer, sin fijar una altura que recorte texto envuelto. La repetición exige40/48px exactos para una línea y espacio suficiente para varias líneas. El JSON final confirma40px en input, selector y Guardar con módulo1200/1440; en estrecho conserva48px y permite crecimiento cuando hay wrapping. La evidencia anterior permanece en UX07/height-before.

Se documentaron tres incompatibilidades de tests antes de adaptar sus expectativas: CatalogPage.test prohibía el texto Ver ofertas; menu.spec y offers.spec navegaban con coordenadas sobre el enlace invisible retirado. Ahora exigen o activan la acción visible. Conservan href, identidad, clasificación, estado, restricciones, composición, query y retorno. No se alteraron payloads ni escenarios para ocultar fallos de aplicación.

## Comprobaciones sobre la base estable

- Tipos, lint global y build aprobados. Logs `oleada-04-types.log`, `oleada-04-lint.log` y `oleada-04-build-final.log`.
- Focalizadas:16 pruebas de categorías,32 de catálogo y75 de entradas, según sus logs individuales.
- Demo final:32 de32 aprobadas en43,3s. `oleada-04-demo-final.log`. Incluye las dos pruebas demo iniciales y las regresiones previas de imagen, cabeceras, guardado, diálogos, foco y scroll. Conserva cero llamadas API y errores JavaScript en las regresiones demo.
- HTTP final sobre build de producción preview:52 de52 aprobadas en18,6s. `oleada-04-production-preview-final.log` y `oleada-04-http-final-junit.xml`. Las cinco pruebas HTTP nuevas distinguen timeout de creación,404,503 y categorías lentas.
- Dependencias src actualizadas en `oleada-04-dependencies.json`. Se contrastaron imports nuevos de Icon y consumidores JSX. El índice no acredita por sí solo CSS ni comportamiento.

Root inspeccionó las capturas de catálogo320px, entrada inexistente y categoría inválida, y los JSON finales de alturas. Las revisiones independientes de lectura de UX06 y UX07 conservan sus observaciones y el contraste posterior. Cada ejecutor conserva capturas y JSON individuales antes de reutilizar test-results.

## Condición de integración

La evidencia permite integrar UX05 a UX07. U11 y U14 quedan acreditados en el alcance probado. Los aportes a U03/U04/U07/U08/U09/U10/U19/U22/U24 no equivalen al cierre de todos sus consumidores. Se mantienen el cierre exterior del selector después del clic, el ciclo modal de UX03 y las cabeceras de UX04.

El shell real está excluido por el usuario. Dispositivo físico, teclado virtual y lector de pantalla siguen como validación manual pendiente. Las respuestas HTTP controladas no acreditan backend real. La suite final sobre Nginx y el resto de condiciones UX17 permanecen para el cierre del plan.
