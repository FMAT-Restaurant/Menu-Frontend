# Entrega de UX03

Ticket: UX03, ciclo modal, fondo, foco y scroll. Agente: `/root/ux02_foundation`. Base recibida: `f7a80cb`, rama `feature/ux-ui-improvement`, con UX01 y UX02 integradas. Estado solicitado: en revisión.

El usuario confirmó implementar los tickets. El shell real queda fuera del alcance por su instrucción posterior. Dispositivo físico, teclado virtual y lector de pantalla se registran como validación manual pendiente, sin bloquear la implementación ni atribuirles resultados de emulación.

## Cambios y consumidores

Se añadieron `src/shared/useTaskDialog.ts` y `src/shared/useModalScrollLock.ts`. El primer hook centraliza apertura/cierre nativo, fondo superior, foco y contención de Tab. El segundo mantiene un bloqueo compartido por documento con contador de sesiones y restitución de sus estilos y posición.

Los ocho consumidores adoptados son las confirmaciones de `CatalogPage`, `OffersPage` y `RecipePage`; `CategoryFormDialog`, `RecipeFormDialog`, `SlotModal` y `OptionModal`; y el selector de `OfferFormPage`. Conservan sus propias políticas de Escape, cancelación y bloqueo durante operaciones.

`src/shared/primitives.css` deja `.dialog-backdrop` sin caja mediante `display: contents`. La familia `menu-task-dialog` usa exclusivamente el fondo nativo `rgba(17,24,39,0.4)`. Los fondos de diálogos cubiertos quedan transparentes. Se retiraron las reglas de backdrop anteriores de categorías, recetas y ofertas. No se cambió z-index para resolver la acumulación.

Cada diálogo define su contenedor `menu-dialog`, distinto del contenedor del módulo de UX02. Los formularios estrechos usan controles y cierres de 48 px incluso dentro de un módulo de 1440 px. Los cierres de categorías, recetas, grupo y opción consumen el SVG compartido sin cambiar su nombre accesible.

Se añadieron `src/shared/useTaskDialog.test.tsx`, `e2e/ux-ui-03.demo.spec.ts` y el probe HTTP normal `e2e/ux-ui-03-modal-pending.spec.ts`, este último con ampliación explícita de reserva por el integrador. No se editaron tests existentes, App, main, configuración E2E, registro compartido ni evidencia histórica. El integrador incorporó la selección de navegador y conserva build, puertos y ejecución global. No se crearon commits por este agente.

## Foco y scroll

Las confirmaciones enfocan Cancelar al abrir. El foco vuelve al disparador al cerrar. Tab y Shift+Tab circulan únicamente dentro del diálogo superior. Se excluyen elementos deshabilitados, tabindex negativo, hidden/inert y controles cuyos ancestros tienen display none o visibility hidden. Las técnicas visuales sr-only no se excluyen por su tamaño. Si durante una operación no quedan controles habilitados, Tab enfoca el encabezado con tabindex temporal; se conserva el bloqueo de acciones y cierre del consumidor.

La primera ejecución Chromium detectó una salida de foco al completar la vuelta de Tab en las tres confirmaciones. Se corrigió el hook, sin reducir ni cambiar esas aserciones. Se añadieron casos focalizados de Shift+Tab, control oculto por ancestro y sesión sin controles habilitados.

La revisión posterior reprodujo otro defecto durante un DELETE retenido: Chromium dejó el foco en BODY al deshabilitar el botón activo y el listener del diálogo ya no recibió Tab. Se conservó la evidencia negativa y se movió el listener a captura del documento, limitado al diálogo superior. El probe conserva sus aserciones, el bloqueo de Escape y la comprobación de una sola escritura. La repetición aprobada muestra BODY al deshabilitarse el control y recuperación al H2 del diálogo después de Tab y Shift+Tab, con una sola escritura y cero errores JavaScript. No se afirma que Chrome conserve el foco dentro inmediatamente después de deshabilitar el botón. Véase [investigación de foco pendiente](pending-focus-investigation.md).

El documento conserva su desplazamiento visual mediante body fijo con top igual al negativo de la posición inicial. Durante ese bloqueo window.scrollY puede ser cero. La prueba compara además la posición del título de fondo, que no cambia, y verifica al cerrar la restitución exacta de scrollY y estilos previos. Por ejemplo, la entrada archivada abre desde scrollY 1626 y recupera 1626 después de Cancelar y Escape.

PageUp, PageDown, rueda y gesto táctil emulado fuera del diálogo no mueven el fondo. El contenido de receta sí desplaza su área interna, comprobada en 316 px. Al cerrar un diálogo anidado el bloqueo permanece hasta cerrar la última sesión. StrictMode y apertura repetida conservan la limpieza del contador, estilos y listeners.

## Pruebas y evidencia

| Comprobación | Resultado y evidencia |
| --- | --- |
| Suites funcionales de consumidores | 7 suites, 154 tests pasan. `unit-consumers.log`. Cubren categorías, recetas, confirmaciones, composición, recuperación y formularios de ofertas. |
| Ciclo de vida compartido | 5 tests pasan en `unit-lifecycle.log`: StrictMode y reapertura, contador anidado, Tab/Shift+Tab, operación con controles deshabilitados y recuperación de foco externo solo al diálogo superior. |
| Tipos y lint | Tipos y lint focalizado pasan, incluidos los cambios de foco pendiente: `typecheck.log` y `lint-pending-fix.log`. Root confirmó lint global con salida 0 en `../oleada-02-lint-final.log`. |
| Build final | Root ejecutó build sobre la corrección de captura del documento y obtuvo salida 0. `../oleada-02-build-final.log`. |
| Demo integrada final | 20 tests pasan en 40,0 s, coordinados por root después de corregir el caso BODY. `../oleada-02-demo-verified.log`. Conserva las dos pruebas demo existentes y las regresiones UX01/UX02. Los seis casos UX03 rechazan API y errores JavaScript. |
| Producción preview final | 47 tests pasan en 17,2 s, incluido el probe HTTP pendiente, sin modificar sus aserciones ni tests existentes. `../oleada-02-production-preview-final.log` y [JUnit](production-preview-final-junit.xml). Usa respuestas HTTP controladas; no acredita servicios reales. |
| Foco durante DELETE retenido | [Antes de corregir](pending-negative/pending-modal-focus.json): BODY después de Tab y Shift+Tab. [Después](pending-positive/pending-modal-focus.json): H2 dentro del modal tras ambas teclas, modal abierto y una sola escritura. Escape y Enter no cierran ni duplican el envío. |
| U01 conservado | Las diez regresiones UX01 pasan en esa misma ejecución integrada. No se editaron geometría ni contenido de OfferCard en UX03. |
| Dependencias | Grafo src actualizado con la configuración existente en `dependencies.json`; vecinos en `dialog-neighbors.txt`. Las ocho importaciones de useTaskDialog se contrastaron directamente en código. El grafo no acredita CSS ni comportamiento y conserva las limitaciones normativas previas de UX00. |

Se conservaron nueve PNG y nueve JSON en `browser/`: Cancelar y Escape para entrada archivada, oferta inactiva y receta; formulario estrecho con scroll interno; propiedad de fondos anidados; y gesto táctil emulado. Las capturas fullPage contienen el viewport modal al inicio y pueden incluir espacio adicional fuera del viewport mientras el cuerpo está fijo. Esa zona extendida no representa otra capa visible durante el recorrido.

Se revisaron visualmente las confirmaciones de entrada y oferta, el formulario de receta desplazado en escritorio y la cadena anidada móvil. Los datos nativos confirman un backdrop coloreado de 40 % en cada confirmación. En la cadena vigente hay tres diálogos modales nativos, dos fondos transparentes y un único fondo coloreado. La reducción a un diálogo corresponde a UX10.

Los JSON principales son [entrada y restitución](browser/archived-entry-cancel.json), [contenedor y scroll](browser/form-container-and-scroll.json), [cadena existente](browser/nested-backdrop-ownership.json) y [tacto emulado](browser/emulated-touch-backdrop.json). El formulario de receta mide 720 × 540 px dentro del módulo de 1440 px; sus controles y los del formulario de categoría miden 48 px.

## Conservación y pendientes

Los efectos de carga, versiones, idempotencia, borradores y recuperación de categorías y recetas permanecen en sus componentes. Solo se retiraron de ellos apertura/cierre/foco modal para asignarlos al hook. No se cambió payload, política de reenvío, estado comercial ni reglas de negocio.

Se propone acreditar U26 para las confirmaciones autónomas comprobadas. U28 conserva como pendiente la repetición del recorrido final de UX10. U27 permanece abierto: la cadena actual sigue teniendo tres diálogos, aunque ya no acumula fondos coloreados. U03, U08 y U22 reciben el aporte modal de tamaños, radios y cierres SVG, sin cerrar sus consumidores restantes.

Tras el defecto del probe, root repitió build, lint global, producción preview y demo sobre la base corregida. Todos pasan con los resultados finales de la tabla. La entrega queda en revisión del integrador; este agente no declara su integración por esos resultados. No se afirma validación del shell real ni de dispositivo físico, teclado virtual o lector de pantalla; las tres últimas comprobaciones conservan su estado manual pendiente según la instrucción del usuario.
