# Impacto y contrato de UX06

Base recibida `0e375aa`, UX04 integrada. Ejecutor `/root/ux01_images`. Reserva: catálogo, sus pruebas, regresiones propias y esta carpeta. UX05 y UX07 editan otras áreas; no se cambian BASE, App, main, configuración ni registro compartido.

El índice fresco de reanudación y la inspección JSX confirman CatalogPage → CatalogResults → EntryCard. CatalogFilters consume SearchField y estados/callbacks del catálogo; main importa BASE. Cambiar la tarjeta no requiere modificar contratos de repositorio ni las consultas, caché, ETag o recuperación. El análisis estático no acredita el alcance de CSS ni la visibilidad real, que requieren navegador.

Se sustituirá el enlace vacío absoluto que cubre la tarjeta por una acción visible Ver ofertas, separada de Editar y sin controles anidados. Se mantiene el conteo y el estado administrativo, sin inventar un precio de entrada. Eliminar tendrá jerarquía terciaria y ayuda visible asociada mediante aria-describedby. Su condición de archivado y confirmación nativa quedan intactas.

El grid y los filtros responderán al contenedor `menu-module`, siguiendo el contrato UX02. El ancho disponible del módulo, medido por separado del viewport y de los márgenes interiores de página, determina los cortes 768 y 1200. El catálogo conserva los márgenes de UX04. Los campos usan --control-height y no se comprime el selector de tamaño para dejar espacio al conteo.

## Identidades para UX15

Cada clave aparece una sola vez por tarjeta y se construye desde el id persistente, nunca desde título, índice o página:

- Artículo enfocable programáticamente: `entry:<id>`, destino de respaldo.
- Acción Ver ofertas: `entry:<id>:offers`.
- Acción Editar: `entry:<id>:edit`.
- Acción Eliminar: `entry:<id>:delete`.

Los enlaces conservan el mismo returnTo de navegación. UX15 podrá registrar el control activo y restaurar la clave específica, usando el artículo como alternativa si ese control deja de estar disponible. UX06 solo prepara marcadores, sin introducir un coordinador.

## Incompatibilidad informada antes de editar

CatalogPage.test.tsx, caso "shows administrative identity, classification and navigation without claiming publication", exige expresamente que no exista el texto visible Ver ofertas. Esa expectativa corresponde al enlace invisible retirado por U11. Se comunicó al integrador antes de modificarla. Se sustituirá únicamente por la presencia visible de la acción; se conservarán href, clasificación, conteo, estado, restricción de borrado y ausencia de afirmaciones de publicación. Cualquier otra incompatibilidad se investigará y comunicará antes de adaptar pruebas.
