# Revisión de UX04 para checkpoint

Revisor: `/root`. Resultado favorable dentro del alcance de UX04. El usuario pidió terminar las tareas activas y detenerse; no se habilita otra oleada después de esta entrega.

Se inspeccionaron los cambios de páginas, estilos compartidos y de área, cinco archivos de tests existentes y las regresiones nuevas. Root abrió las capturas del editor de oferta móvil, recetas en escritorio y categorías en móvil. El ejecutor contrastó las18 capturas de nueve rutas con las referencias históricas37 y31. Se conservan JSON de geometría y navegación.

## Cabeceras y navegación

Las nueve rutas autónomas dejan de mostrar marca interna, rótulos administrativos repetidos y bandas oscuras. Conservan regreso local, título de tarea, contexto y acciones. Los títulos usan28/36 y tienen `data-route-heading` y `tabIndex=-1` para UX15, sin introducir todavía un coordinador de foco. Las páginas de selección anidada no reciben otro marcador de ruta.

La cabecera empieza dentro del margen local de16px móvil o24px escritorio. Los listados y ofertas comparten ancho máximo1152px, las entradas1040px y los mensajes640px por longitud de lectura. La prueba de regreso conserva búsqueda, estado, página y origen de la oferta. No se observa sustitución de la marca retirada por otra franja global.

## Fallos encontrados y corregidos

La primera suite normal produjo43 aprobaciones y cuatro fallos. Dos eran contratos visuales incompatibles: un H2 duplicado retirado y la banda negra con texto blanco de recetas. Se documentaron antes de adaptar sus expectativas al nuevo título y cabecera neutral. Se conservan las comparaciones antes/después de navegación, responsive y ausencia de desbordamiento. En total, los cinco archivos de tests existentes adaptados conservan los escenarios funcionales originales.

Los otros dos fallos eran reales: no se enviaba la entrada al pulsar Guardar con el selector de categorías abierto. Un probe nuevo confirmó `pointerdown` sobre el botón a664px, seguido de `pointerup` y `click` sobre MAIN después de que el botón se desplazara a591px. No hubo submit. La evidencia negativa permanece en UX04.

El cierre exterior del selector pasa de pointerdown a click, con limpieza del mismo listener y Escape sin cambios. Así el botón recibe la activación antes de colapsar el panel en flujo. El contraste positivo conserva pointerdown, pointerup y click en BUTTON a664px y registra submit posteriormente. No se añadieron retrasos, cierres artificiales ni modificaciones de los dos recorridos HTTP que detectaron el defecto. Tres pruebas unitarias nuevas del selector verifican la activación, el cierre exterior y Escape/foco.

## Comprobaciones finales

- Tipos y build aprobados. `../oleada-03-build-final.log`.
- Lint global aprobado. `../oleada-03-lint-final.log`.
- Siete suites de páginas,171 pruebas aprobadas antes del ajuste del selector. Después del ajuste, dos suites de entrada/selector,57 pruebas aprobadas, con solapamiento respecto de las páginas. No se suman como pruebas distintas.
- Suite normal sobre preview de producción:47 de47 aprobadas en18,6s. `../oleada-03-production-preview-final.log`; JUnit en `../UX04/production-final-junit.xml`. El build terminó antes de iniciar los casos, comprobado con timestamps. Usa fixtures HTTP y no acredita backend real ni Nginx.
- Demo integrada:24 de24 aprobadas en35,1s. `../oleada-03-demo-final.log`. Incluye los casos previos de imagen, controles, diálogos, foco y scroll, más cabeceras, regreso y el clic de guardado corregido. Los casos demo conservan cero llamadas a API y errores de JavaScript.

U05 queda acreditado para el montaje autónomo dentro del alcance acordado. U06 recibe las cabeceras de páginas, pero espera UX10 para el selector final. Los aportes de tipografía, geometría y marcadores no cierran U07/U08/U24. U01 y U26 conservan sus regresiones aprobadas. U28 espera repetir el flujo final de UX10.

El shell real está excluido por instrucción del usuario. Dispositivo físico, teclado virtual y lector de pantalla se registran como validación manual pendiente. Esta revisión aprueba integrar UX04 y guardar el checkpoint; no declara realizado UX05 a UX17 ni el cierre total de los28 hallazgos.
