# Preparación de UX04

Estado: análisis de lectura, sin implementación. Base recibida `f7a80cb`, UX01 y UX02 integradas. UX03 mantiene la reserva de aplicación y sigue en ejecución. Este agente solo escribe este documento. El código observado puede incluir cambios concurrentes de UX03 y se revalidará tras su integración.

## Fuentes y alcance

Se revisaron el ticket UX04, el plan, DESIGN.md y las entregas UX01/UX02. Se visualizaron la referencia del usuario 37 y la captura 31 de `audit/evidence/overlay-review`. Ambas muestran la barra de marca, la fila de regreso, el rótulo administrativo repetido y el título de edición separados del contenido. Retirar la barra libera su franja de 72 px; no se usará ese valor como altura obligatoria del nuevo encabezado.

D01 excluye la integración real del shell por instrucción posterior del usuario. Se comprobará la demo autónoma sin afirmar validación de un shell. No se añadirá una banda demo para sustituir la marca retirada. La política de título de documento pertenece a UX15; el título demo existente en main no necesita cambiar en UX04.

## Inventario actual de pantallas

| Pantalla | Cabecera y defecto actual | Dirección dentro de UX04 |
| --- | --- | --- |
| Catálogo | CatalogPage monta global-nav y después catalog-header con rótulo administrativo. H1 Entradas del menú y tres enlaces locales útiles. | Retirar global-nav y rótulo. Mantener título y enlaces a recetas, categorías y alta con returnTo actual. |
| Categorías | CategoryPage usa banda oscura category-screen__header, H1 Catálogo de categorías y después H2 Categorías del menú. | Cabecera neutral local con regreso, un título, contexto y Nueva categoría. Eliminar título duplicado conservando nombre accesible de la sección. |
| Recetas | RecipePage reutiliza la banda oscura; H1 Biblioteca de recetas y H2 Recetas de la biblioteca. También se reutiliza en selección anidada. | Cabecera neutral y una colección titulada. Conservar título y contrato de selección actual hasta UX10. No resolver aquí los pasos ni duplicar coordinador de ruta. |
| Entrada nueva/editada | EntryFormPage monta marca en entry-form-nav y luego regreso más rótulo administrativo y H1 de 24/32. | Retirar marca, juntar regreso/título/contexto local y usar rol 28/36. Mantener onClick que bloquea navegación durante envío y llama abandon cuando corresponde. |
| Ofertas | OffersPage monta marca, regreso, rótulo administrativo y H1 en mayúsculas 20/28. | Cabecera local con regreso, título de entidad y acción. Mantener contexto de publicación, filtros, página y returnTo. |
| Oferta nueva/editada | OfferFormPage repite marca y rótulo encima de H1. | Retirar marca/rótulo, conservar regreso a ofertas, título de tarea y entrada en un encabezado local. Preservar abandonEditor y state con catalogReturnTo. |
| Ruta inexistente | NotFoundPage monta marca y aplica tamaños/espacios inline distintos. | Cabecera y contenido neutral local, título de ruta y enlace de regreso. Mantener rutas y semántica. |

## Contrato compartido comprobado

UX02 define `.menu-module[data-menu-module]`, tokens de tipografía y geometría limitados a ese ámbito. Su entrega especifica que UX04 añade `data-route-heading` y `tabIndex={-1}` al título principal de cada tarea. No hay coordinador de foco todavía. UX15 lo consumirá.

`data-return-key` corresponde a UX06 y UX09, con identidades `entry:<id>` y `offer:<id>`. UX04 no reemplaza esos futuros marcadores por índices, texto o posición. Los enlaces y estados existentes conservan returnTo, query y página. La cabecera de RecipePage dentro del selector no debe robar el destino de ruta del editor anfitrión; el marcador de ruta se limitará a la instancia de página autónoma, manteniendo la selección anidada para UX10.

## Reserva mínima propuesta al desbloquear

Aplicación: App.tsx para NotFoundPage; CatalogPage.tsx, CategoryPage.tsx, EntryFormPage.tsx, OffersPage.tsx, OfferFormPage.tsx y RecipePage.tsx para estructura local. Estilos compartidos src/styles.css y shared/primitives.css; estilos de catálogo, entradas y ofertas para eliminar sus tamaños o reglas de cabecera incompatibles. Categories/styles.css y recipes/styles.css solo si tras UX03 aparece una regla propia que lo exija. main.tsx se revisa, pero el estado actual no exige editarlo.

No se necesita un componente React nuevo: las clases compartidas pueden definir la composición de cabecera y los estilos de cada pantalla pueden conservar sus roles sin duplicar marca. Si se decide extraer una pieza, deben coordinarse importaciones y consumidores antes de ampliar la reserva.

Los anchos actuales difieren: catálogo 1200 px, categorías/recetas/entradas 1040 px y ofertas 1152 px. Se propone un ancho común de listado y encabezado y un ancho acotado justificado para formularios legibles. La composición de oferta puede necesitar 1152 px por grupos y panel comercial. Los márgenes y alineación deben seguir la misma escala. El ancho se comprobará con el contenido real y con el módulo reducido, sin imponer una altura rígida al encabezado.

## Tests incompatibles identificados antes de editar

| Archivo/caso | Motivo específico | Garantía que debe conservarse |
| --- | --- | --- |
| EntryFormPage.test.tsx, duplicate submits cannot overlap upload or persistence, and navigation is blocked while saving | Busca y pulsa el enlace de marca FMAT Restaurant que UX04 debe retirar. | Mantener intento de regreso local durante subida y persistencia, borrador íntegro y exactamente una subida/escritura. Sustituir únicamente la suposición del enlace de marca por el destino local que queda. |
| e2e/entry-form-remediation.spec.ts, V2 aligns navigation… | Mide `.entry-form-nav`, contenedor exclusivo de la marca retirada. | Medir alineación de la cabecera/regreso local con el formulario. Mantener seis viewports, categorías, scroll, foco, zoom, guardado y ausencia de overflow. |
| e2e/catalog-traffic.spec.ts, full journey… | Exige el H2 Categorías del menú, que duplica el H1 Catálogo de categorías. | Exigir la llegada a categorías por el título principal conservado y mantener el recorrido de alta, asignación, TTL y caché. |

App.test.tsx espera H1 Catálogo de categorías y Biblioteca de recetas. Se pueden conservar esos nombres sin tocar sus expectativas. Los tests de RecipePage, OfferFormPage y e2e/recipes.spec.ts esperan Biblioteca de recetas — elegir opción en la selección actual. UX04 puede conservarlo; UX10 revisará ese contrato al sustituir el selector administrativo. No se cambiarán por conveniencia.

Estos casos se informan al orquestador antes de cualquier modificación. Una ampliación de reserva a sus tests y al nuevo e2e/ux-ui-04.demo.spec.ts necesita asignación expresa. No hay motivo identificado para cambiar payloads, recovery, versiones, mocks comerciales ni reglas de guardado.

## Comprobación prevista

Recorrer nueve rutas reales a 390 y 1440 px y registrar captura y rectángulos de título, cabecera y contenido. Debe haber un título local marcado por página autónoma, sin global-nav, marca ni banda administrativa oscura. Comparar específicamente oferta editada con la referencia 37 y captura 31.

Probar catálogo con query y página, abrir categorías/recetas/entrada/oferta y volver conservando URL y estados. Comprobar rutas nuevas/editadas e inexistente. La marca eliminada no debe sustituirse por una cabecera de navegación global del módulo.

Ejecutar App.test y suites de todas las páginas afectadas. Repetir U01 y los casos modales UX03 sobre la base integrada. Mantener las dos pruebas demo previas. El orquestador coordinará selección de nuevos casos, servidor, puerto y evidencia. UX04 aporta a U07/U08/U24 y propone acreditar U05 dentro del montaje autónomo. U06 conserva el aporte pendiente de UX10.

No se ejecutaron tests ni navegador sobre una supuesta solución UX04, porque no existe todavía. Las imágenes visualizadas son evidencia original del defecto, no evidencia de corrección.
