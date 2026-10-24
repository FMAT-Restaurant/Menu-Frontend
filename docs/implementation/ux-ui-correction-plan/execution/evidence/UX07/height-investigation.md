# Altura uniforme de controles de entrada

La revisión de `form-width.json` detectó una diferencia real que la primera aserción de altura mínima no rechazaba. Con módulo de 1200 o 1440 px y formulario de 1040 px, el nombre medía 40 px, el selector de categorías 42 px y Guardar 43 px. Se conservan esas medidas y su captura en `height-before/`.

La lectura de estilos identificó dos causas. El selector tenía tamaño de fuente 14 px pero heredaba la altura de línea 24 px del módulo. Con 16 px de padding vertical y 2 px de borde necesitaba 42 px. El footer flex tenía altura mínima 68 px, padding vertical 24 px y borde superior 1 px; su alineación stretch predeterminada estiraba el botón hasta 43 px.

La corrección establece altura de línea 20 px para el selector y align-items center para el footer. Se conservan los mínimos 40/48 y la altura automática. No se impone un height fijo a botones ni etiquetas que puedan envolver. Guardar puede seguir creciendo cuando ocupa dos líneas a 320 px.

La regresión UX07 ahora distingue una línea de texto de varias líneas mediante medidas reales del contenido. Una línea debe medir exactamente 40 o 48 px según el contexto; varias líneas deben superar el mínimo y tener altura suficiente para texto, padding y bordes. El JSON guarda también altura de línea, padding, bordes y alineación del footer, además de conservar las comprobaciones de columnas y ausencia de overflow.

Tipos y lint de la regresión pasan. Root repitió build, demo y HTTP sobre este ajuste. La demo integrada aprobó 32 casos en 43,3 s, log `../oleada-04-demo-final.log`, y producción preview aprobó 52 en 18,6 s, log `../oleada-04-production-preview-final.log`.

El [JSON final](browser/form-width.json) confirma nombre, selector y Guardar de 40 px en módulos de 1200/1440 px y 48 px en los contextos estrechos. A 320 px, Guardar ocupa dos líneas y crece a 58 px, suficientes para 40 px de texto, 16 px de padding y 2 px de borde. El footer mide align-items center y el selector line-height 20px. Se preservan las comprobaciones de una o dos columnas, radios y ausencia de overflow. No se modificaron reglas de negocio, límites, payload ni archivos de catálogo.
