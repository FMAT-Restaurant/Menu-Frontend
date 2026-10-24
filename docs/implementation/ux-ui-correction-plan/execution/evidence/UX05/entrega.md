# Entrega de UX05

Ticket: formulario de categorías. Agente `/root/ux00_baseline`. Rol: validación y presentación. Base recibida `0e375aae79eb2be9069c3e4f2b6150d1548dd90a`, rama feature/ux-ui-improvement, con UX04 integrado. Estado solicitado: en revisión, con evidencia demo y HTTP examinada. La integración corresponde al orquestador.

## Archivos y reserva

Se editaron CategoryFormDialog.tsx y el CSS de su formulario en categories/styles.css. Se añadieron CategoryFormDialog.ux.test.tsx, e2e/ux-ui-05.demo.spec.ts y e2e/ux-ui-05-category-recovery.spec.ts. La evidencia individual se guarda en esta carpeta. No se modificaron CategoryPage.tsx, tests existentes, base compartida, router, configuración E2E, registro ni auditoría histórica. No hay imports nuevos de producción, commits ni procesos propios activos.

El grafo src y su procedencia en `../resume-2026-10-24/` identifican CategoryFormDialog, sus contratos de repositorio, operaciones, versiones y useTaskDialog. Se contrastaron esos imports y el consumidor CategoryPage en fuente. No se necesitó ampliar la reserva a catálogo o entradas, que avanzan en paralelo. El índice estático no acredita CSS, foco ni ejecución modal.

## Comportamiento

Nombre muestra su obligatoriedad y Descripción su carácter opcional antes del envío, junto con el límite existente de 255 caracteres. Las etiquetas accesibles siguen siendo Nombre y Descripción. Los campos conservan ayudas asociadas mediante aria-describedby.

Un nombre vacío o compuesto solo por espacios muestra error persistente inmediatamente debajo del campo, aria-invalid y referencia a su mensaje. El resumen complementario anuncia la condición y ofrece Ir al nombre. Enviar o activar ese control enfoca el nombre sin borrar la descripción. Corregir el valor elimina únicamente el error de campo. La validación impide escrituras inválidas tanto al crear como al editar.

El formulario usa noValidate y mantiene required para expresar la semántica del nombre. Así la burbuja transitoria del navegador no impide mostrar el error persistente. No se sustituyó la validación de servicios ni su recuperación por la validación nativa.

El reintento de creación incierta sigue enviando la operación sellada original. No se revalida un borrador posterior para bloquear o cambiar ese payload. Una prueba nueva cubre el caso de borrar el nombre editable después de un timeout y reintentar: se conserva la clave y el payload original, y el borrador permanece intacto.

El formulario conserva useTaskDialog, la versión de apertura, la revisión explícita de conflictos, la recuperación de IndexedDB, los estados pendientes y la prohibición de doble envío. Los efectos de datos y los contratos de repositorio no cambian. Adoptar datos revisados elimina un error de nombre que ya no corresponde al valor adoptado.

## Presentación

El formulario consume los tokens existentes para radios 8/12, título 22/30 y cuerpo 16/24. Espacios y padding siguen múltiplos de cuatro. El input tiene altura según --control-height, sin sumar padding vertical a esa altura; el contenedor modal estrecho de UX03 aporta 48 px incluso en viewport de 1024 px. El cierre conserva el SVG compartido y su nombre accesible. Las acciones de revisión se ajustan en varias líneas sin reducir el texto ni ocultar el borrador.

La consulta local de ui-ux-pro-max sobre error summary validation devolvió pautas de resumen accesible, errores anunciados y mensajes asociados al campo. `ui-guidance.txt` conserva el resultado. Se aplicaron las guías de React a estado y validación en handlers, las de Jest a escenarios reales con repositorios controlados, Playwright a interacción de teclado y medidas reales, y unslop a las ayudas y esta entrega. DESIGN.md conserva la autoridad visual.

## Verificación realizada

| Comprobación | Resultado y alcance |
| --- | --- |
| Unitarias de categoría existentes y nuevas | 2 suites, 16 tests aprobados, 32.986 s. `unit.log`. Incluyen recuperación, versiones y bloqueo de envío existentes. |
| Nuevos casos unitarios | Nombre vacío y corrección con cero escrituras inválidas; edición inválida y corrección con la versión de apertura; reintento sellado con borrador posterior vacío. |
| Typecheck | Pasa, `typecheck-final.log`. El primer intento detectó uso de la opción exact de Playwright en consultas RTL nuevas; se corrigió ese error de tipado manteniendo la coincidencia exacta por nombre que RTL ya aplica. No se modificaron tests existentes. |
| Lint de archivos reservados | Pasa, `lint.log`, salida cero. |
| Diff | Sin errores de espacios en los dos archivos de producción reservados. |
| Demo integrada | Primera corrida 32 de 32 en 49.7 s. Repetición final 32 de 32 en 43.3 s, incluidos ambos UX05, en `../oleada-04-demo-final.log`. |
| HTTP controlado | Ambos UX05 pasaron inicialmente en una corrida con un fallo ajeno de offers.spec. La repetición integrada final aprobó 52 de 52 en 18.6 s, incluidos los dos casos de recuperación de categorías. `../oleada-04-production-preview-final.log`. |

Las dos pruebas demo envían desde teclado un nombre vacío, comprueban error, foco y descripción conservada, corrigen y guardan. Miden altura de 48 px, radio 8/12, título 22/30, error bajo el campo y un único modal. Rechazan llamadas API y errores JavaScript. Escriben JSON y PNG en outputPath con nombres cortos antes de adjuntar por path.

Las dos pruebas HTTP retienen el resultado de creación mediante timeout controlado, muestran el error y conservan el borrador. El reintento por teclado debe enviar la misma clave y payload, producir una sola categoría y cerrar únicamente al confirmar éxito. Su evidencia no acreditará un backend real. La demo en memoria no se controla interceptando API.

Se conservaron los cuatro PNG y cuatro JSON en `browser/`, con nombres demo-390, demo-1024, http-390 y http-1024. Se abrieron las dos capturas demo: el error está debajo del nombre, el resumen ofrece una vuelta útil al campo, la descripción sigue presente y las acciones quedan accesibles. Los JSON registran input y cierre de 48 px, radios 8/12, título 22/30 y un único modal. Los JSON HTTP conservan dos envíos con la misma clave y payload y cero errores JavaScript, correspondientes al intento incierto y su reintento explícito, no a dos creaciones independientes.

## Aportes y pendientes

UX05 aporta categorías a V03 y V07 y a U03, U04, U07, U08 y U22. El cierre conjunto de U04 corresponde a UX08 después de acreditar también recetas. No se cierra ninguno de esos hallazgos por este mensaje ni por la existencia de la base.

El orquestador incluyó expresamente la regresión demo y ejecutó las cuatro pruebas de navegador sobre la base compartida. Las repeticiones finales normal y demo están aprobadas. La evidencia de categorías conservada corresponde al mismo código congelado, que no cambió entre esas ejecuciones. La entrega queda disponible para su decisión de integración, sin procesos propios activos. Los recursos de build, puertos y salidas permanecen bajo su control.

D01 excluye el shell real por instrucción del usuario. Dispositivo físico, teclado virtual y lector de pantalla conservan la validación manual pendiente acordada. D02 y D03 se aplicarán por sus tickets propios; UX05 no altera moneda ni rondas de selección. D04 de descarte se completará en UX11; no se agregó otra confirmación modal en este ticket.
