# Revisión de UX14 y UX15

Integración: UX14 `68e1ed0`, UX15 `b5f70a0`. Root revisó fuente, capturas, coordenadas, peticiones y resultados. La implementación continúa con UX16; esto no cierra los28 hallazgos ni sustituye UX17.

UX14 unifica rondas de selección e insumo, ayuda exacta10MiB y estados legibles. Mantiene cantidades, límites, IDs, payloads, versiones, activación explícita y opciones de inventario existentes. Referencias técnicas útiles permanecen en detalles desplegables. La tabla de mensajes y las adaptaciones informadas antes de cambiar tests están en UX14/implementation.md.

La revisión visual encontró que el503 de categoría decía No se pudo guardar pese a un resultado incierto. Categoría y receta ahora indican que no sabemos si se crearon y explican recuperar el mismo envío sin repetición automática. Rechazo que exige nueva operación, caducidad y envío en vuelo conservan sus ramas. La captura corregida503 y los contratos de clave/payload se comprobaron de nuevo.

UX15 enfoca títulos o identidades de retorno, conserva los dos niveles catálogo/ofertas, query/página/hash y prioridad de diálogo/error. Sólo el documento autónomo cambia de título y conserva DEMO. No añade otra región live que duplique el recibo UX13. El artículo de oferta admite foco programático sin parada adicional de Tab.

La prueba de chunk retenido detectó que React conserva la vista anterior durante la transición. Se corrigió el fixture y se añadió una señal del router anterior al commit, con suscripción y limpieza junto al router existente. Conserva el foco en un control que permanece disponible; si el control desaparece, el título nuevo evita terminar en BODY. Pruebas reales de React.lazy y router cubren enlaces, atrás y adelante. Los tests de lifecycle originales permanecen intactos.

## Resultados

- Build conjunto corregido aprobado: oleada-10-build-corrected.log. Tipos y lint focales finales de ambos ejecutores pasan; lint global previo en oleada-10-lint.log. El build corregido vuelve a comprobar tipos.
- UX14:201 pruebas en siete suites antes del ajuste semántico final;45 posteriores en tres suites de categoría/recetas/selección, con solapamiento. UX15:24 finales en tres suites, incluido App.test sin modificación. Logs individuales conservados.
- Demo completa sobre producto corregido:74/74 en3,4min con un worker, oleada-10-demo-corrected.log y artefactos físicos en la carpeta homónima. Incluye los dos recorridos originales, cero API/errores JS observados y regresiones de modales, borradores, imágenes, importes y guardado.
- HTTP completo sobre preview corregido:67/67 en1,0min, oleada-10-http-corrected.log y JUnit/PNG/JSON físicos. Incluye rechazo409, incertidumbre503, claves/payloads, revisión monetaria con precisión145.125 y uso explícito de If-Match revisado, además de rutas diferidas.
- Fortalecimiento final del fixture externo: botón antes del módulo y aserciones de mismo foco más visibilidad completa. Tres casos HTTP de UX15 pasan en6,3s, oleada-10-http-route-visible.log. El producto no cambió respecto a la suite completa.

La primera demo pasó73/74: el recorrido original agotó30s tras consumir24s en goto. Su traza se conserva; los dos originales pasaron sin cambios al repetir. La primera HTTP pasó65/66 por un selector nuevo ambiguo entre cabecera y vacío. La repetición detectó la premisa incorrecta de fallback visible. Se informaron los defectos de fixture antes de adaptar y no se eliminaron garantías. Los negativos están en oleada-10-demo-first, oleada-10-http-first y oleada-10-http-route-repeat.

Root inspeccionó la validación de rondas a320px, el recibo y retorno de oferta, el rechazo409, el503 antes/después de corregir y las coordenadas de foco diferido. El fixture externo es controlado y no acredita el shell real. La revisión automática de aprobación falló temporalmente por límite de uso antes del último ajuste del fixture; no ejecutó esa acción. Tras recuperarse el servicio, la misma acción siguió el flujo de aprobación normal y se verificó.

U20 y U24 quedan acreditados en el alcance automatizado descrito, sujetos a conservación en UX16/UX17. Shell real excluido por el usuario; dispositivo físico y lector de pantalla permanecen como validación manual pendiente. No se afirma ejecución de cobertura o Compose final en esta oleada.
