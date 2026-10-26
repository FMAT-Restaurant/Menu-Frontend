# Revisión de UX16

Implementación integrada en `9165b86`. Root revisó fuente, capturas y mediciones pendientes/resueltas. Se libera la reserva de UX16 y comienza UX17. Las regresiones globales y Compose pertenecen al cierre final, no se declaran ejecutados aquí.

Las cargas iniciales reservan zonas locales de listado, formulario, imagen y composición. Las actualizaciones conservan datos y su consulta/página confirmada. Recetas e inventario bloquean la asignación de resultados anteriores mientras llega otra consulta. Los fallos conservan el contenido disponible y permiten recuperar la operación. Categorías tardías mantienen nombre, archivo y selección de entrada. Las formas son estáticas y decorativas; el estado accesible corresponde al trabajo real y no hay demora añadida al producto.

Se mantienen el router y tracker de UX15, los recibos y terminales UX13 y la distinción UX14 entre incertidumbre y rechazo. El esqueleto no añade otro marcador de título de ruta ni una máscara global.

## Correcciones basadas en evidencia

La primera ejecución pasó13/13, pero las capturas mostraron geometría genérica que no correspondía al contenido resuelto. El mensaje añadía36px antes de listas; el formulario de oferta añadía60px y situaba la imagen fuera de la sección comercial. También se reservaron opciones fuera de un selector cerrado. Se corrigieron esas reservas, sin alterar API ni reglas de guardado.

Una segunda ejecución pasó13/14. La reserva de ofertas usaba gap16 frente a24 del grid real, dejando tarjetas4px más anchas. Se corrigió el gap y la rama amplia, que debía tener tres columnas. Se añadieron1440px y regiones de estado/acciones a la reserva de oferta. Las tolerancias de los tests no se ampliaron.

## Resultado comprobado

- Build final aprobado en oleada-11-build-final.log; incluye tipos.
- Focales finales por etapa:124/124 en seis suites de geometría/retención/consumidores y81/81 en tres suites después del ajuste de ofertas. Se solapan; no son una suma de pruebas únicas. Tipos y lint focales finales pasan. Entrega y logs individuales en UX16/.
- Navegador final:20/20 HTTP en10,7s, oleada-11-http-final.log. JUnit, PNG, JSON y comparaciones físicas en oleada-11-http-final/.
- Seis consumidores a390/1024/1440: catálogo, categorías, recetas, ofertas, formulario de oferta y entrada. La primera región conserva x/y/anchura en esos18 pares. Catálogo y entrada comparan además sus imágenes/preview. Esto no afirma altura total idéntica para resultados desconocidos ni CLS0.
- Se verificaron actualización de recetas pendiente y fallida con contenido/contexto/foco retenidos, y categorías tardías con panel cerrado/abierto, nombre, blob y selección intactos. Las respuestas antiguas que ignoran aborto tienen casos dirigidos en Jest.

Root inspeccionó los pares de catálogo1024 y oferta390, la corrección del marco comercial y las comparaciones de regiones. La versión inicial y el negativo13/14 permanecen guardados. Los defectos de fixtures nuevos y sus correcciones se registran en la entrega del ejecutor; no se redujeron garantías de negocio para obtener verde.

U25 queda acreditado en el alcance probado, sujeto a la repetición integrada UX17. Lector de pantalla y dispositivo físico con teclado virtual siguen pendientes por decisión del usuario. Los fixtures HTTP no acreditan backend real y el shell real está excluido.

Índice de dependencias de la base9165b86: `.analysis/ux-ui-wave11-integrated.json`, SHA256 `18649E9173F769A1352C220BC02B229D5B171E189453D3D12D542F5BAB08B749`. Se contrastaron los consumidores de LoadingState y las ramas de carga en fuente, además de los imports.

Cierre integrado posterior: root completó geometría de filas y aislamiento/tokens en f3909e9 tras el límite del ejecutor. Los20HTTP de carga vuelven a pasar y forman parte de87HTTP finales en Compose;82demo y588unitarias aprobadas sobre c5d22ca. Véase ../UX17/entrega.md y ../../closure.md.
