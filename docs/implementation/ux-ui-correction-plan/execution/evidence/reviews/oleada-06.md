# Revisión del flujo de receta

Base `b6d23ef`, con UX08 y UX09 integradas. La continuación conserva la extracción iniciada antes de la interrupción y la finaliza con reserva exclusiva. Root conserva recursos, registro e integración; un revisor separado examinó sólo fuente.

OptionModal mantiene un único nodo de diálogo durante opción, selección y creación. RecipeFormContent contiene la lógica operativa compartida con administración. RecipeSelectionTask conserva sesión, búsqueda y página sin desmontar el controlador al volver. Los contenidos inactivos están ocultos y fuera del recorrido de foco. El selector elimina la estructura administrativa duplicada.

Se preservan identidad de opción/grupo, asignación explícita, nombre personalizado, archivo, versiones, recuperación y payload sellado. Una receta confirmada con ediciones posteriores sigue como edición versionada. La restauración no envía POST. La selección o creación de receta no guarda automáticamente la oferta.

## Correcciones de revisión

- Se eliminó la competencia de efectos de foco al regresar de creación. El selector recibe el destino de foco según la transición.
- El revisor detectó que guardar una opción podía desmontar una receta cuyo borrador se había conservado. La opción ahora requiere decidir antes de descartar esa receta y finalizar. Una regresión prueba continuar y descartar sin creación implícita.
- Chromium reprodujo un cancel no cancelable después de varios cambios de paso. El navegador cerraba el diálogo y dejaba el scroll bloqueado. Se corrigió Escape local en el diálogo con una función común para teclado y cancel, sin listener global. La evidencia negativa y positiva permanece en UX10/native-escape.md.
- Las premisas antiguas de tres diálogos se adaptaron al único contenedor, manteniendo los recorridos, el foco y la composición. Se informaron antes de editar. Los selectores de Nombre se hicieron exactos donde el mismo contenedor incluye la opción oculta. El caso pendiente comprueba las dos acciones de volver deshabilitadas, sin seleccionar una e ignorar la otra.

La prueba nueva de artículo se corrigió conforme al árbol accesible del selector. Root había indicado un prefijo incorrecto. No se modificó el componente para satisfacer ese selector. Los casos HTTP usan contratos reales:422 rechazado permite un intento explícito con nueva clave,503 incierto mantiene clave y payload al reintentar.

## Evidencia observada

Implementación integrada en `81fc2fe`.121 pruebas focalizadas pasan, además de tipos, build y lint global. Los cuatro recorridos demo propios pasan en16,4s:390/1024 y host1440 con módulo600/740. La suite demo completa aprueba42/42 en1,0min y la normal sobre preview55/55 en38,8s. Comprueban el mismo nodo, un modal/fondo, foco entre pasos, consulta, receta conservada,48px, Tab/Shift+Tab, bloqueo del fondo y cero capas al cerrar. Root inspeccionó selector y creación a390px.

El caso HTTP pendiente deja el foco en BODY sin refocus artificial. Dos Escape conservan un modal y un POST; la respuesta controlada permite continuar después. La recuperación F5 conserva padre, receta y las claves/payload originales en la suite integrada. Logs y archivos físicos finales en UX10/browser-complete y UX10/http-final; se conservan negativos por separado.

Índice actualizado `.analysis/ux-ui-wave06-integrated.json`, SHA256 `28DD2ADEA5254ECDDB43B123DFDFE8FA6523D4DCCEEECF2469BFAF10BB57DFF2`, ámbito src y configuración existente. Los vecinos de los componentes nuevos están en UX10/dependencies.txt. La fuente, pruebas y navegador complementan el índice; no se deduce comportamiento del grafo.

UX11 conserva la protección común de navegación y descarte. UX17 repetirá los hallazgos sobre la base final. Shell real excluido por el usuario; tacto físico, teclado virtual y lector de pantalla pendientes manuales. El preview HTTP usa fixtures, no acredita servicios reales ni Nginx.
