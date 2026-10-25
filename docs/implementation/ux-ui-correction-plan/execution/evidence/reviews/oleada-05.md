# Revisión integrada de recetas y ofertas

Base funcional `620c027`, despacho registrado en `f64c282`. Revisión de root sobre el checkout compartido, sin reemplazar la auditoría histórica. UX08 y UX09 se implementaron con reservas separadas. UX10 sólo preparó el análisis de su extracción.

## Alcance revisado

Recetas distingue biblioteca vacía de consulta sin coincidencias, conserva la consulta y ofrece limpiarla. La validación incluye errores asociados por campo, resumen enfocable y enlaces a controles. Los insumos se transforman según el ancho del diálogo, limitado también por el módulo. Se conservaron inventario paginado, unidades, lecturas tardías, versiones y recuperación.

Ofertas apila los grupos según su contenedor, conserva opciones de inventario existentes y retira únicamente las capacidades pendientes de copiar composición y elegir inventario. Estado y acción están separados. Retirar del borrador se diferencia de eliminar una oferta persistida. Cambiar imagen permanece visible y funciona con teclado y tacto emulado. Las claves de retorno conservan los dos destinos.

Root inspeccionó los diffs y las capturas físicas de consulta sin coincidencias, insumos en módulo de600px, tarjetas a390px y composición a320/740px. Los grupos y Agregar grupo siguen el recorrido vertical. Los textos largos crecen sin cortar acciones. La imagen y el precio no invaden el título. Las capturas proceden de la demo en memoria, no de un backend real.

## Defectos encontrados y corregidos

- El título del formulario de receta conservaba20/28. Se normalizó a22/30. Los textos auxiliares de ofertas que conservaban13px adoptaron14/20 o12/16 según su función.
- Un detalle de receta recibido sin insumos podía fallar sin explicar el motivo al sustituir los errores generales por errores por campo. Se añadió un error de sección asociado a Agregar insumo y un enlace desde el resumen. La regresión reproduce ese consumidor directo y comprueba cero actualizaciones inválidas.
- La primera tanda Chromium aprobó15 de16 casos. La vista previa inline producía scrollHeight166 frente a clientHeight160. Se conservó la evidencia negativa y se corrigió con `display:block` en la imagen. Las mismas aserciones aprueban los tres casos UX09 en28,0s, incluido el barrido de viewport, módulo y formulario.
- Se corrigió una conversión accidental que había duplicado líneas vacías de OfferComponents.test.tsx. El diff final conserva únicamente los cambios funcionales previstos.
- La suite completa detectó42px en Nombre de receta. El contenedor nuevo había sustituido el nombre `menu-dialog`, del que dependía la regla compartida de48px en anchos inferiores a1200. Se conservan ambos nombres, `menu-dialog recipe-form`, y la transformación de tabla a768. La prueba histórica de diálogo estrecho ahora asigna explícitamente740px al módulo porque el nuevo máximo de960 permite una tabla amplia; mantiene48px, foco y bloqueo de scroll. La repetición pasa y la matriz UX08 mide también Nombre y acciones finales.

## Pruebas y límites

Las focalizadas finales de recetas aprueban44 casos y las de ofertas96. Los cambios en expectativas existentes se informaron antes de editarlos: controles pendientes retirados, texto de estado separado del control Activar/Desactivar y nombre accesible Cancelar sin el glifo decorativo. Se preservaron payloads, callbacks, ausencia de operaciones pendientes, cierre, identidad, publicación y recuperación. Las nuevas pruebas comprueban casos reales.

Root detectó además la aserción histórica de radio999px del control de estado en e2e/offers.spec.ts. Se informó antes de sustituirla por radio8px, texto Activar oferta, aria-pressed=false e indicador Inactiva separado. El recorrido y la query se conservan.

Build y lint globales aprueban. La primera tanda acreditó los diez casos U01 y los tres UX08; la repetición UX09 aprueba sus tres casos. La suite demo final completa aprueba38/38 en1,8min sobre los ajustes de revisión. El entorno HTTP se registra al completar la puerta de integración en registry.md. No se atribuyen resultados a ejecuciones aún pendientes.

La evidencia está en `../resume-ux08/`: logs separados, `browser-first` y `browser-ux09-final`, con PNG y JSON físicos. El grafo actualizado `.analysis/ux-ui-wave05-integrated.json` tiene SHA256 `74A16630D69AAA1BE93711B5E8E542A53253C25DF3E9D0A8C2C67B8573926E5B`, ámbito src y la configuración existente. Refleja las nuevas dependencias hacia Icon; no demuestra CSS, JSX ni callbacks.

UX10 debe repetir la búsqueda y validación dentro del selector final. UX12 debe repetir U01 después del formato monetario. Los hallazgos compartidos conservan las condiciones de los demás tickets y UX17. Shell real excluido por el usuario. Dispositivo físico, teclado virtual y lector de pantalla quedan pendientes manuales por decisión expresa.
