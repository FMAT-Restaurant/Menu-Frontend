# Revisión de UX03

Revisor `/root/ux00_baseline`. Revisión de solo lectura sobre la base inicial `f7a80cb` y los cambios de UX03 en el checkout compartido. No se modificaron código, tests, configuración ni registro. No se ejecutaron servidores, pruebas ni build desde esta revisión.

Estado: revisión final favorable para integrar UX03. El defecto de foco durante DELETE pendiente fue reproducido, corregido en código y verificado con el mismo probe y las regresiones integradas. U28 conserva la repetición requerida en UX10.

## Fuentes y evidencia

Se contrastaron el ticket UX03, DESIGN.md, el diff de los ocho consumidores y los hooks nuevos, las reglas modales compartidas y de las áreas, las cinco pruebas unitarias finales del ciclo de vida y los seis casos nuevos de navegador, además del probe HTTP durante DELETE pendiente. Se leyeron la entrega del ejecutor, los logs y los JSON, y se abrieron cuatro capturas con view_image.

La ejecución anterior de `../oleada-02-demo-final.log` acreditó 20 pruebas aprobadas en 30.1 s antes de la corrección de foco pendiente. La repetición posterior, `../oleada-02-demo-verified.log`, acredita los mismos 20 casos aprobados en 40.0 s, salida cero confirmada por el orquestador. Incluye las dos demo previas y los casos UX01/UX02. El log de consumidores acredita siete suites y 154 pruebas aprobadas; la suite final del ciclo de vida acredita cinco pruebas aprobadas en 3.38 s. El ejecutor conservó nueve PNG y nueve JSON en `../UX03/browser/`, y las evidencias negativa y positiva del probe por separado.

## Fondo y pila modal

Las confirmaciones de entrada archivada, oferta inactiva y receta comparten el hook y la clase menu-task-dialog. El wrapper pasa a display contents y deja de crear una caja oscurecida. El único tratamiento de fondo se encuentra en el pseudo-elemento nativo, con rgba 17,24,39,0.4. Se eliminaron los fondos anteriores de las áreas, sin sustituirlos por ajustes de z-index.

La pila compartida marca los diálogos anteriores como cubiertos. La geometría de la cadena vigente acredita tres diálogos nativos: opción y selector tienen fondo transparente, y la creación de receta tiene el único fondo coloreado. Cerrar sucesivamente mantiene el bloqueo hasta retirar el último diálogo. Esta condición no cierra U27. UX10 conserva la tarea de convertir la cadena en pasos dentro de un solo diálogo.

Las capturas de confirmación y formulario muestran una sola intensidad de fondo, texto legible y foco visible. Los espacios blancos adicionales en las capturas fullPage están fuera del viewport mientras body está fijo; no se interpretan como otra capa del producto. La comprobación de fondo depende además de los valores calculados y la condición nativa modal, no solo de la imagen.

## Foco y estados de operación

Las confirmaciones conservan el foco inicial en Cancelar. Los formularios mantienen sus destinos iniciales, y el hook devuelve el foco al disparador conectado. Se retiró únicamente la lógica de apertura, cierre y foco de los efectos originales; los contratos de borrador, idempotencia, versión, recuperación y cancelación voluntaria permanecen en sus consumidores.

El cierre con Escape sigue delegado al consumidor y conserva las restricciones de operaciones pendientes. La nueva lógica de Tab solo actúa sobre el diálogo superior. Excluye controles disabled, tabindex negativo, hidden/inert y los ocultos por sus ancestros; los controles sr-only no se excluyen por tamaño. Conserva los listeners y los atributos temporales para retirarlos durante cleanup.

La primera ejecución detectó fuga de Tab en las tres confirmaciones. El ejecutor corrigió el código sin reducir sus aserciones. La repetición final mantiene foco dentro del diálogo al recorrer sus controles. Las pruebas unitarias añaden Shift+Tab y excluyen un control oculto por su ancestro.

Se pidió al integrador un caso nativo adicional durante DELETE pendiente con todos los controles deshabilitados. La prueba unitaria inicial dispara keydown directamente sobre dialog, por lo que no prueba la situación en que Chrome lleve el foco al body al deshabilitar el botón activo. El hook escucha keydown en el diálogo, y el evento no lo alcanza si el foco ya salió.

El probe `e2e/ux-ui-03-modal-pending.spec.ts` confirmó el defecto sin modificar código ni las aserciones previas. La petición DELETE queda retenida por una promesa real, los dos botones se deshabilitan y se usa page.keyboard para Tab y Shift+Tab. Ambos recorridos dejan el foco fuera del diálogo. El JSON registra activeTag BODY y focusWithin false. El log `../UX03/pending-modal-probe.log` conserva los dos fallos de la prueba. Escape continúa bloqueado y no hay segundo DELETE. Por tanto la corrección debe contener el foco sin habilitar acciones pendientes ni alterar recuperación; el resultado de 46 pruebas normales no cubría esta condición.

## Scroll, contenedores y limpieza

El bloqueo se comparte por Document mediante contador y liberación idempotente. Guarda los valores y prioridades de las propiedades que modifica, además de la posición horizontal y vertical. La última liberación restaura esos valores y la posición. Cerrar una sesión interior no libera la exterior.

La evidencia de entrada archivada parte de scrollY 1626. Durante el bloqueo window.scrollY es cero, pero la coordenada del título de fondo se conserva mediante body fijo y top negativo. Cancelar y Escape restauran 1626 y los estilos previos. Las pruebas de reapertura con StrictMode comprueban restitución de estilos y foco, y el contador anidado conserva una prioridad important previa.

Los recorridos Chromium comprueban PageUp, PageDown y rueda fuera del contenido del diálogo. La receta desplaza internamente 316 px sin mover el documento. El gesto táctil por CDP también conserva la posición, identificado expresamente como emulación.

El contenedor menu-dialog resuelve la observación heredada de UX02. Los formularios estrechos usan controles y cierres de 48 px dentro de un módulo de 1440 px. La receta medida ocupa 720 × 540 px. Los SVG de cierre conservan los nombres accesibles de los botones. La captura desplazada mantiene cabecera y acciones disponibles.

## Alcance de cierre

No se encontraron cambios de reglas de negocio ni eliminación de garantías de recuperación en el diff examinado. Las pruebas funcionales de consumidores sustentan esa conservación. La suite normal de producción y el build integrados corresponden al orquestador y deben registrarse según su ejecución efectiva.

D01 excluye el shell real por instrucción del usuario. Dispositivo físico, teclado virtual y lector de pantalla permanecen como validación manual pendiente conforme a su respuesta explícita. Ni la emulación táctil ni jsdom acreditan esos entornos.

Puede proponerse U26 para las confirmaciones autónomas verificadas. U28 requiere repetir el flujo final de UX10; U27 permanece abierto. Los aportes a tamaños, radios e iconos no cierran los hallazgos compartidos ni los 28 hallazgos de la auditoría.

## Corrección del defecto y aprobación final

El hook escucha ahora keydown en el documento durante la fase de captura. Solo actúa el diálogo superior de la pila. Si existen controles habilitados y el foco está fuera, lo recupera al primero o al último según la dirección. Si no existen controles habilitados, enfoca el encabezado con tabindex temporal. Cleanup retira la escucha usando la misma fase de captura y restaura el atributo previo. La prueba nueva de ciclo verifica el diálogo superior y la ausencia del listener después del desmontaje. No se habilitan acciones pendientes ni se cambia la política de cierre.

El probe original conserva sus aserciones. La evidencia negativa en `../UX03/pending-negative/` registra BODY y foco externo tras Tab y Shift+Tab. La evidencia positiva en `../UX03/pending-positive/pending-modal-focus.json` registra H2 y focusWithin true tras ambas teclas, un único DELETE y cero errores JavaScript. La captura positiva, abierta durante esta revisión, muestra el encabezado enfocado y los controles deshabilitados. El estado inicial al deshabilitar el botón todavía registra BODY; el resultado comprobado es la recuperación de foco al utilizar Tab o Shift+Tab, sin afirmar un traslado preventivo antes de la interacción.

El build corregido pasó según `../oleada-02-build-final.log`. La suite normal sobre ese build pasó 47 de 47 casos en 17.2 s, incluido el probe HTTP, según `../oleada-02-production-preview-final.log`. Es evidencia de producción preview con fixtures HTTP y no de Nginx ni del backend real. Las advertencias de proxy del log no impiden su resultado aprobado y no se interpretan como integración de servicios.

La demo posterior pasó 20 de 20 casos en 40.0 s sobre la corrección, manteniendo las regresiones de imágenes, base compartida, capas, foco y scroll. El lint global final también pasó. No se encontraron defectos bloqueantes restantes dentro del alcance de UX03 después de esa repetición. Se recomienda al orquestador integrar el ticket y liberar su reserva, conservando U28 y las validaciones manuales pendientes descritas arriba.
