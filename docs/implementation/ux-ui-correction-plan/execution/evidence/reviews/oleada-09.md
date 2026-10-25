# Revisión e integración UX13

25 de octubre de 2026. Implementación integrada en `25c996b`, rama local `feature/ux-ui-improvement`. Root revisó fuente, resultados, geometría y capturas. El usuario solicitó terminar UX13, crear un checkpoint y parar; UX14 y UX15 conservan sólo preparación.

El pie único permanece en el flujo del formulario y se hace persistente cuando la longitud supera el espacio útil después de la cabecera, siempre que quede espacio para editar. Su altura medida reserva el margen de scroll. Las nuevas reglas quedan limitadas al módulo. Los formularios cortos no reciben persistencia por defecto y los diálogos conservan sus propias acciones.

El destino consume un recibo de entrada u oferta con nombre y acción, conserva URL y estado ajeno y mantiene la confirmación aunque falle la lectura del listado. La escritura confirmada y el fallo de navegación se tratan por separado. La restauración del registro confirmado permite volver explícitamente sin repetir la creación. La limpieza de IndexedDB comprueba identidad, estado final y versiones dentro de una sola transacción; no borra cadenas nuevas ni cambios posteriores. Los adaptadores sin esa capacidad conservan la confirmación. La persistencia continúa siendo best effort.

## Evidencia y correcciones

- Build final aprobado: `UX13/build-final.log`. Tipos y lint globales aprobaron antes del último ajuste de layout; el ejecutor repitió ambos después y el build final vuelve a comprobar tipos.
- Consumidores integrados: 82 casos en cinco suites, `UX13/jest-integrated.log`. Almacenamiento, recibos y layout final: 11 casos en tres suites, `UX13/jest-final-layout-storage.log`. Las verificaciones anteriores del ejecutor incluyen entrada, callback fallido/F5, recuperación y máquina de operaciones; sus cantidades se solapan y no se suman como cobertura única.
- Demo final: 7/7 en 33,0 s, `UX13/demo-corrected-final.log`, PNG/JSON físicos en `UX13/demo-corrected-final/`. Tamaños 390×844, 390×568, 844×390, 768×1024 y 1440×1100, foco de campo/resumen/último grupo, único submit, sin overflow, zoom CSS 200 % identificado como emulación y recibo de oferta sin repetición tras recarga. Cero llamadas API y errores JS en los recorridos que los observan.
- HTTP final sobre preview: 62/62 en 56,8 s, `UX13/http-corrected-final.log` y JUnit físico en `UX13/http-corrected-final/`. Incluye alta/edición de entradas y ofertas, rechazos, incertidumbre, versiones, imagen y composición. Estos fixtures no acreditan backend real ni Compose final de UX17.
- El primer caso demo de oferta consultaba el footer de SlotCard. Se informó el defecto del test antes de cambiar el selector a `:scope > footer`; se mantuvieron las aserciones geométricas. Negativos en `demo-first`, `demo-offer-diagnostic` y `demo-offer-geometry`.
- La primera suite HTTP pasó61/62. V2 detectó un defecto real a768×1024: comparar sólo altura de formulario con viewport ignoraba la cabecera. Se corrigió el código y se añadió un caso de cabecera/desplazamiento. V2 quedó intacto y pasa en la suite final. Se conserva `http-first` y `http-regression.log`.

Root inspeccionó las capturas de entrada390×568, entrada768×1024 y oferta390×568 junto con sus medidas. En768×1024, el formulario mide926px y dispone de827px tras la cabecera; el pie queda entre878 y951px, dentro del viewport. La captura completa no sustituye esas coordenadas de la ventana real.

Índice actualizado `.analysis/ux-ui-wave09-integrated.json`, SHA256 `25FB0405DE3B07E90BD4CAFB56C962CFA2ED9A0AE1E48FF7F4FDC3331699DDA6`. El primer comando usó un nombre de binario inexistente; se corrigió al binario instalado y terminó exit0. Los hashes de la fuente final están en `UX13/final-source-hashes.json`.

U17 y U18 quedan acreditados en el alcance automatizado descrito, sujetos a conservación en UX17. Teclado virtual físico y lector de pantalla permanecen pendientes por decisión del usuario. Shell real excluido. No se declara cierre total de los28 hallazgos ni ejecución final de cobertura/Compose.
