# Preparación de UX15

25 de octubre de 2026. Base leída `bbc728d6dbd3dfc3609751e1524e63b78c2d9743`, con UX13 en edición. Esta preparación no implementa UX15 ni acredita U24. Antes de implementar hay que releer el recibo y las páginas sobre el commit integrado de UX13.

Se aplicaron ui-ux-pro-max, en sus reglas de teclado, foco y anuncios contextuales, y unslop para este documento. El análisis acotado de dependencias decide dónde montar el coordinador y cómo evitar cambios compartidos con UX14. No se ejecutaron pruebas, build, navegador ni servidores.

## Evidencia actual

`App.tsx` construye y destruye el router en un efecto. Su test de StrictMode comprueba un único listener vivo de `popstate` y `pagehide`, y ninguno tras desmontar. El coordinador debe ser descendiente de la ruta raíz para usar `useLocation`, pero debe quedar fuera de `Suspense` para registrar el cambio antes de que termine una ruta diferida. No se debe reconstruir el router para actualizar el contexto.

Las páginas de catálogo, categorías, recetas, entrada, ofertas, formulario de oferta y ruta inexistente ya tienen `data-route-heading` y `tabIndex={-1}`. Recetas omite el marcador cuando funciona dentro de un diálogo. No hace falta otra cabecera ni enlace global de salto.

`EntryCard` tiene identidades únicas para artículo, editar, ofertas y borrar. Su artículo admite foco programático. `OfferCard` tiene identidades para artículo, editar, estado y borrar, pero su artículo carece de `tabIndex={-1}`. Esa diferencia impide usarlo como alternativa si desaparece la acción original.

Los enlaces conservan el origen mediante `returnTo` y `catalogReturnTo`. El coordinador puede capturar la identidad del control activado en el módulo, junto con la URL de origen, y restaurarla cuando se vuelve a esa URL. Debe distinguir el origen de catálogo del origen de ofertas para no sobrescribir el primero al entrar en edición de oferta.

`CatalogResults` marca la sección con `aria-busy`. `OffersPage` marca el `main` durante las cargas iniciales y las actualizaciones, además de la colección. Esto permite esperar la identidad de retorno sin añadir callbacks a los formularios. Un título de ofertas puede empezar como "Ofertas de la entrada" antes de resolver su nombre. El título del documento puede actualizarse con el nombre definitivo sin volver a mover el foco.

UX13 presenta el guardado en un `role="status"` local y consume `saveResult` mediante reemplazo de la misma URL. El coordinador no debe interpretar ese reemplazo como otra tarea ni anunciar otra vez el guardado. La supresión de su anuncio de ruta debe sobrevivir a la limpieza del estado del recibo.

`main.tsx` marca `document.documentElement.dataset.menuStandalone`. Sólo ese montaje es dueño del título del documento. El HTML inicial usa "Menú | FMAT Restaurant" y demo usa "[DEMO] Menú | FMAT Restaurant". Importar y montar `App` dentro de otro documento no da autoridad para cambiar su título.

## Diseño propuesto

Un coordinador local nuevo dentro del layout de rutas conserva la tarea actual y una transición pendiente. La identidad de tarea incluye el tipo de pantalla y sus identificadores de entrada u oferta. Consultas, tamaño de página, filtros y hash no crean otra tarea. La ruta desconocida usa su propia identidad de tarea, con la URL necesaria para distinguir navegación real.

Al entrar en otra tarea, espera un título local visible y un resultado de carga suficiente para decidir el retorno. Al volver al origen, intenta el control con su clave exacta. Si ya no existe o está deshabilitado, intenta el artículo con la identidad de la entidad. Si la entidad desapareció o quedó filtrada, enfoca el título o el inicio de resultados. Ninguna búsqueda se hace mediante selectores que interpolen identificadores sin escapar. Comparar atributos contra la clave evita ese problema.

El foco de un diálogo abierto y el foco de una validación tienen prioridad. Un evento de interacción durante la espera cancela el enfoque pendiente de esa transición. Una resolución tardía no debe quitar el foco de un control que el usuario ya empezó a usar. Los observadores y listeners se retiran al cambiar la transición y al desmontar. Un observador de mutaciones acotado al módulo permite detectar títulos diferidos, fin de `aria-busy` y montaje de las tarjetas sin sondeo permanente.

El título del documento usa el nombre de la tarea sólo si existe la marca de montaje autónomo. Conserva el prefijo demo. El coordinador puede mantener un anuncio local de tarea, pero debe elegir una sola vía de anuncio para evitar duplicar el título enfocado y el recibo de UX13. La comprobación final debe observar el orden de actualizaciones y documentar la validación pendiente con lector de pantalla. No se atribuye comportamiento al shell real, excluido por el usuario.

## Reserva propuesta

- `src/App.tsx`, `src/App.test.tsx` y, si hace falta para configurar la propiedad del documento, `src/main.tsx`.
- Un coordinador nuevo en `src/shared/RouteContext.tsx` y sus pruebas reales de navegación.
- `src/features/offers/OfferCard.tsx` y su prueba, sólo para dar foco programático al artículo de retorno. Requiere la ampliación explícita de root antes de editar.
- E2E propios `e2e/ux-ui-15*` y evidencia de UX15. Root ejecuta navegador, build y suites integradas.

Los formularios, sus textos, el guard y `localSaveReceipt` no requieren cambios según esta lectura. Si la implementación descubre que sí los necesita, debe volver a root y pasar a turnos con UX14.

## Casos que deben comprobarse

1. Entrada directa al catálogo, categorías, recetas, nueva entrada, edición de entrada, ofertas, nueva oferta, edición de oferta y ruta inexistente. Foco local y título autónomo con prefijo demo conservado.
2. Regreso por enlace, atrás y adelante. Restaurar el origen exacto con filtros y página. Probar también una tarjeta eliminada, filtrada y una acción deshabilitada.
3. Buscar y paginar sin mover el foco al título ni a `BODY`. El reemplazo de estado de UX13 tampoco reinicia el recorrido.
4. Resolver una ruta o colección diferida después de que el usuario enfocó un control. No robar ese foco. Probar cambio rápido de tarea para descartar respuestas de la transición anterior.
5. Abrir un diálogo o recibir una validación durante la espera. Conservar el foco de mayor prioridad y no anunciar una tarea por encima de su decisión.
6. Guardado confirmado con recibo, StrictMode y reemplazo de estado. Mostrar una confirmación local, no duplicar el anuncio de éxito ni mover el foco dos veces.
7. Montar `App` sin la marca autónoma. Conservar el título ajeno. No simular ni afirmar un contrato de shell no implementado.
8. Repetir la prueba existente de lifecycle de router. Los nuevos efectos deben limpiar sus propios listeners y observadores sin añadir otro router.

Las pruebas existentes no se deben cambiar sólo por un foco nuevo. Si una expectativa queda incompatible con un requisito explícito, se informa a root antes de adaptarla y se conservan sus garantías de navegación, consulta y recuperación.

La comprobación física con lector de pantalla queda pendiente por decisión del usuario. La evidencia automatizada debe llamarse DOM, teclado o navegador según lo que comprueba; no acredita el anuncio percibido con una tecnología asistiva real.
