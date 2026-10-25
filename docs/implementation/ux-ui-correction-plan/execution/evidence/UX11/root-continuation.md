# Continuación e integración de UX11

Base `74bb6a0`, aplicación UX10 `81fc2fe` y referencia recuperable `checkpoint/ux-ui-2026-10-25-ux10`. El ejecutor se detuvo por límite de uso. Root comprobó que no quedaban procesos Jest o del repositorio activos y conservó todos sus archivos. No se reinició ni restableció la implementación.

## Contrato y revisión

El guard compara el borrador con la base confirmada, registra los participantes de padre y pasos y mantiene un bloqueo de navegación agregado. Los cierres locales usan la confirmación dentro del diálogo existente. El router autónomo es de datos, conserva rutas, repositorio y carga diferida. Beforeunload se registra sólo mientras hay cambios o recuperación que proteger.

La revisión de fuente encontró y corrigió abandono anticipado, doble decisión local al navegar, baselines de receta restaurada y de oferta tras consumir intenciones, y exclusión incompleta de estados expirados. Un intento expirado puede conservar possibleWriteApplied=true; no autoriza borrar su recuperación. La máquina de operaciones y el almacenamiento compartidos no se modifican.

El proveedor está dentro de menu-module, por lo que la confirmación de página conserva estilos y fondo propios. Su contexto estable evita reinicializar el grupo durante la edición. App construye y dispone su router en un efecto. La prueba nueva con StrictMode observa un listener activo de popstate y pagehide, ningún registro adicional al rerender con el mismo repositorio y cero de ambos al desmontar. No se simula la navegación para obtener ese resultado.

Se corrigió la codificación de App. Root validó UTF-8 estricto en los27 archivos fuente/tests modificados, sin reescribir el resto del repositorio.

## Cambios de premisas de tests

Las incompatibilidades se comunicaron antes de editar: Cancelar y Volver de entrada modificada, categoría con borrador, receta con insumos modificados, cambio O12 de recurso con imagen, nombres de confirmación y Escape local. Los formularios intactos siguen saliendo directamente. Los helpers de páginas usan router de datos real; jsdom recibe Request/Response/Headers nativos de Node, no un mock de navegación.

Dos pruebas de audit-recovery exigían abandonar voluntariamente durante upload. Eso contradice la prioridad pendiente de UX11. Ahora se separan dos garantías: Cancelar queda bloqueado y conserva la recuperación; un desmontaje forzado durante upload ignora la respuesta tardía y no ejecuta PATCH. Se mantiene la clave del registro retenido y una sola carga. No se ajustan payloads o versiones para pasar.

Se adaptan los recorridos HTTP históricos de categories y RC04 al descarte explícito y al nombre Seguir editando. Se conservan cero mutaciones antes de descartar, versión fuerte, PATCH/POST originales, foco, composición y reapertura con los datos iniciales.

Las primeras pruebas nuevas de navegador tenían dos errores de observación: el input de archivo se vacía por diseño después de leerlo y una recarga cancelada no produce load. Se comprueba ahora el mismo blob de vista previa y el nombre de archivo retenido; la intención de recarga se dispara mediante location.reload y se observa el evento beforeunload real. No se cambió el código para satisfacer esas expectativas.

## Evidencia disponible

205 pruebas focalizadas aprueban, incluidas la expiración con escritura posible y el ciclo de vida del router. Tipos y lint pasan. Los cinco recorridos nuevos demo aprueban en15,6s: categoría, receta, entrada con archivo/categorías y atrás/adelante, receta retenida con padre intacto y recarga nativa. Root inspeccionó las capturas de confirmación de entrada y receta. La primera tanda HTTP aprueba53/55; los dos fallos eran las premisas de cierre y texto descritas. La repetición completa queda registrada en logs propios al finalizar.

Puertas integradas completadas:535/535 Jest en42 suites,47/47 demo y55/55 HTTP, tipos/build/lint. Los routers del harness también disponen sus listeners; la suite completa se repitió después de esa limpieza. La matriz de módulo estrecho espera la tarea cargada antes de aplicar el ancho, evitando modificar el contenedor transitorio del arranque. Las exigencias de ancho y controles se mantienen.

Implementación integrada en a9408b8. Shell real excluido por el usuario. Dispositivo físico, teclado virtual y lector de pantalla conservan el pendiente manual solicitado. UX17 repite los resultados sobre la base final.
