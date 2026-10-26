# Preparación de UX16

25 de octubre de 2026. Preparación de lectura por `/root/ux16_prepare`. UX13 está integrado en `25c996b`; la lectura empezó tras el checkpoint `1f415c4` y observó HEAD `8fae8c0` al terminar. UX14 y UX15 están en ejecución. Sus cambios deben integrarse y releerse antes de implementar cargas. Este documento no acredita U25.

Se leyeron AGENTS.md, DESIGN.md, ticket UX16 y las reservas de la guía. Se aplicaron ui-ux-pro-max y unslop. La consulta local `skeleton loading layout shift`, dominio ux, devolvió las reglas web Content Jumping y Loading Indicators. Ambas indican reservar espacio, mantener foco y estado accesible y evitar parpadeo. El resultado de Font Loading no corresponde al cambio y no se usa. No se propone otro sistema visual.

## Decisión y dependencias

La decisión es dónde separar carga inicial de actualización sin borrar datos, reiniciar borradores o competir con el foco de UX15. La lectura directa de imports, efectos y ramas JSX es suficiente para identificar estos consumidores. No se generó otro grafo ni se dedujo comportamiento de una importación aislada.

`App` posee el fallback de rutas diferidas y el router de datos, que crea y destruye en un efecto. Las páginas reciben `MenuRepository`; sus efectos usan señales AbortController y comprueban signal.aborted antes de publicar respuestas. `useEntryResources` separa detalle y categorías. `RecipeSelector` pertenece al paso de selección de UX10, mientras `RecipeFormContent` conserva la recuperación y el borrador de la receta. `localSaveReceipt` y `useFormActionsLayout` pertenecen a UX13. UX16 no debe reescribir estos contratos para añadir un esqueleto.

## Inventario observado

| Consumidor | Carga inicial actual | Actualización y datos retenidos | Decisión de UX16 |
| --- | --- | --- | --- |
| App y rutas diferidas | Texto Cargando página en dos fallbacks, sin reserva específica de zonas | Suspense puede sustituir el Outlet; UX15 añadirá coordinación fuera de ese límite | Sustituir por una reserva local de tarea. Conservar el coordinador, lifecycle del router y el título que UX15 establezca. No crear otro h1 con data-route-heading en el esqueleto. |
| CatalogPage y CatalogResults | Cabecera y filtros están montados; sección vacía con aria-busy y texto Cargando entradas | displayed conserva la página anterior, query y datos. Hay aviso explícito de resultados anteriores mientras cambia la consulta | Añadir reserva de tarjetas sólo cuando no existe displayed. Mantener tarjetas y aviso durante actualización o error. No presentar resultados anteriores como si pertenecieran a la nueva consulta. |
| CategoryPage | Texto Cargando categorías dentro de category-panel | El array categories se conserva, pero la lista exige !loading y !error. Por eso desaparece al actualizar o al fallar la actualización | Separar dato disponible de carga inicial y mostrar la lista existente durante actualización/error. Mantener la acción independiente Nueva categoría y las restricciones de cada operación. |
| RecipePage | Texto Cargando recetas con cabecera y búsqueda presentes | recipesResult permanece en estado, pero lista y paginación exigen !loading y !error. El contenido se oculta al buscar/paginar y en error | Conservar los resultados que ya estaban visibles con su consulta y página reales. Bloquear selección/acciones dependientes si representan otro contexto y mantener búsqueda y borradores. No mostrar vacío definitivo antes de resolver la consulta. |
| EntryFormPage y useEntryResources | El formulario aparece con campos deshabilitados mientras llega el detalle. Tiene texto Cargando la entrada | Categorías cargan por separado y conservan previousCategories. Los efectos de detalle/categorías abortan y filtran respuestas antiguas. La carga de categorías no equivale a bloqueo del formulario entero | Reservar identidad/imagen sólo si no existe detalle de la entrada actual. El selector de categorías tiene su estado local. Conservar nombre, descripción, archivo y selecciones mientras llegan categorías o se reintentan. |
| EntryCategorySelector | Texto local Cargando categorías, búsqueda y seleccionadas siguen en el DOM | Los IDs seleccionados sin nombre tienen una representación de categoría ya asignada | Añadir reserva local de opciones si hace falta y marcar busy en la región correspondiente. No sustituir el selector entero ni ocultar chips, selecciones o foco. |
| OffersPage | OffersResults devuelve sólo texto cuando initialLoading es true | visibleEntry depende de entryDataId y visibleResult de resultEntryId. La actualización conserva tarjetas del mismo entryId y bloquea acciones dependientes. Main y colección publican aria-busy | Añadir reserva comercial sólo sin datos de la entrada actual. Mantener distinción de identidad y el contenido existente en actualización/error. No revelar ofertas de otra entrada por retener datos sin comprobar identidad. |
| OfferFormPage | Cabecera visible; Promise.all espera entrada y detalle, luego monta el formulario | loading desmonta el formulario; la revisión remota tiene un flujo aparte que conserva el borrador. Respuesta inicial comprueba señal y activeContextRef | Reserva inicial de información comercial, imagen y composición. No convertir consulta de revisión en máscara o desmontaje. Si se conserva formulario durante reintento, comprobar contexto y que no se sobrescriban postediciones ni el resultado restaurado. |
| RecipeSelector | Búsqueda y título permanecen; texto Cargando recetas | result se conserva en estado, pero lista y paginación se ocultan durante loading o error | Conservar tarjetas anteriores con estado de actualización y bloquear su asignación si la consulta vigente aún no está confirmada. Mantener los pasos y la búsqueda de UX10. |
| RecipeFormContent, inventario | Texto Cargando insumos; formulario y tabla de insumos siguen montados | itemsFromApi permanece; knownItems conserva nombres y unidades de insumos seleccionados entre páginas. Buscar/paginar dependientes se deshabilitan | Reservar sólo las opciones remotas que aún no existen. Mantener insumos elegidos, sus cantidades, el editor y la recuperación durante las cargas. No llamar al detalle o reinicializar el formulario para mostrar una reserva. |

Las ramas descritas se observaron en fuente. No se ejecutó navegador y no se afirma todavía que su geometría sea estable ni que todos los anuncios funcionen con un lector real.

## Componente y presentación propuestos

Un `LoadingState.tsx` nuevo puede ofrecer variantes acotadas para colección, detalle y formulario. Los consumidores conocen qué zona falta y no deberían delegar toda la pantalla a una variante genérica. La cabecera y filtros reales ya disponibles permanecen fuera de la reserva. En rutas aún diferidas, una reserva de cabecera y contenido no debe competir con los marcadores de foco de UX15.

Las formas visuales son decorativas con aria-hidden. Un texto de estado describe lo que carga y una región local comunica aria-busy. No añadir un live region a cada línea o tarjeta ni duplicar el anuncio de ruta/guardado. No usar botones falsos, cantidades, precios, porcentajes ni métricas ficticias.

Las superficies usan los neutrales de DESIGN.md, radios 4/8/12 y espaciado de base4. Las columnas y dimensiones de imagen siguen el ancho útil del consumidor. Una reserva estática sin animación es suficiente y respeta movimiento reducido. Si se decide animar, la variante reduced-motion debe eliminar esa animación y debe probarse. No introducir gradientes de brillo ni una máscara global.

Para imágenes conocidas, conservar aspect-ratio o el tamaño ya utilizado por la tarjeta. Para texto desconocido, reservar bloques razonables y medir qué ocurre con el nombre largo y la composición real. No fijar una altura de toda la pantalla que recorte contenido posterior ni atribuir un CLS histórico a la auditoría.

## Reserva necesaria al implementar

UX14 y UX15 deben liberar primero sus archivos. Después, reservar App.tsx, App.test.tsx y main.tsx sólo si cambia su fallback, más LoadingState.tsx y sus pruebas. Los estilos de carga compartidos pertenecen a src/styles.css o shared/primitives.css, con ámbito del módulo. No editar ambos por rutina si basta uno.

Reservar CatalogPage/CatalogResults y estilos/tests de catálogo; CategoryPage y estilos/tests de categorías; RecipePage/RecipeSelector/RecipeFormContent y estilos/tests de recetas; EntryFormPage/EntryCategorySelector y estilos/tests de entradas; OffersPage/OfferFormPage y estilos/tests de ofertas. `useEntryResources` requiere inspección y sólo edición si aparece un defecto confirmado de retención o identidad. Las API, validadores y máquina de operaciones no forman parte de esta reserva propuesta.

No se prevé editar OfferCard ni EntryCard para mostrar carga. Las reservas comerciales deben representar su geometría desde el contenedor. Una necesidad distinta requiere ampliación de root. Las nuevas pruebas E2E y evidence/UX16 serían propias; root mantiene configuración, build, navegador, puertos y salidas compartidas.

## Verificación que debe preparar el ejecutor

1. Carga inicial demorada de catálogo, categorías, recetas, ofertas y formulario de oferta. Capturar estado pendiente y resuelto al mismo ancho útil y registrar posiciones de cabecera, filtros, tarjetas, imagen y acciones. El retraso pertenece al fixture, no a producción o demo.
2. Actualización de una colección ya resuelta. Mientras la segunda petición está pendiente, conservar entidades, nombre de consulta/página visible, foco y scroll. Después resolver o rechazar. Un error de actualización debe coexistir con los datos anteriores y una acción concreta de recuperación.
3. Solicitar A, cambiar a B y resolver B antes que A. Publicar sólo B aunque el repositorio simulado ignore el aborto de red. Cubrir al menos cambio de entrada en ofertas/detalle y cambio de consulta en colección. Las señales se conservan; no sustituirlas por retardos arbitrarios.
4. Retrasar únicamente categorías de entrada. Escribir identidad, elegir archivo y mantener categorías ya asignadas. Resolver y rechazar categorías sin reiniciar esos datos ni habilitar un guardado que sus reglas vigentes prohíban. Conservar los escenarios existentes de categorías tardías y 404/fallo temporal de detalle.
5. Actualizar recetas e inventario dentro del modal único. Mantener el mismo diálogo, búsqueda y borrador de opción/receta. No dejar seleccionar resultados antiguos como si fueran de una consulta nueva todavía pendiente. Comprobar Escape y vuelta de pasos sin desmontar la sesión de recuperación.
6. Coordinar con UX15 una ruta diferida y una carga de datos que terminan después de que el usuario ya interactuó. El reemplazo del esqueleto no debe volver a enfocar el título, cerrar un diálogo ni borrar un error enfocado. El recibo confirmado de UX13 debe conservar un único anuncio local aunque el listado demore o falle.
7. Comprobar neutrales, ausencia de animación o reduced-motion efectivo, un estado accesible local y sin controles externos afectados. Capturar anchos estrechos y host ancho con módulo reducido, además de poca altura. Las diferencias de geometría medidas son de esta ejecución, no un CLS atribuido retrospectivamente.

Existen tests útiles de petición antigua de receta, categorías tardías/entrada siguiente, catálogo con displayed y ofertas por identidad. Se deben releer antes de añadir casos. Un test verde de texto no prueba reserva de espacio. Los literales de loading pueden conservarse como texto accesible dentro del nuevo componente, por lo que no se justifica cambiar expectativas existentes por rutina. Si un test tiene una premisa incompatible con retener datos, se informa el caso antes de adaptarlo y se conserva su garantía real.

## Estado

Única escritura de esta preparación: este documento. No se modificó aplicación, tests, configuración ni registro. No se ejecutaron tests, build, navegador, E2E, servidores o commits. Una búsqueda de lectura usó inicialmente una expansión de llaves no válida en PowerShell; se repitió con rutas explícitas. No se alteró el repositorio por ese fallo.

Falta integrar UX14 y UX15, releer su fuente y obtener la reserva de implementación de root. El shell real está excluido por decisión del usuario. La prueba en dispositivo físico con teclado virtual y la de lector de pantalla seguirán como validación manual pendiente, sin presentar DOM, viewport o tacto emulado como sustitutos.
