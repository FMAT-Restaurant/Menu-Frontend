# UX16. Entrega para revisión central

26 de octubre de 2026. Ejecutor `/root/ux16_execute`. Base de producto `b5f70a0`, con UX14 y UX15 integrados. Fuente y pruebas preparadas congeladas para revisión. No se ejecutaron build, navegador, E2E, cobertura, servidores ni commits desde este agente. Root conserva esas ejecuciones y el registro.

## Decisión e impacto

La carga inicial necesita una reserva de las zonas que la pantalla realmente tiene. Una actualización conserva el contenido confirmado y su contexto. Se contrastaron los imports, efectos, abortos, ramas JSX y clases de layout de los consumidores. No se dedujo su comportamiento de una importación aislada ni se creó una segunda máquina de carga.

Se aplicaron ui-ux-pro-max, unslop, análisis previo y guías de React, Jest y Playwright. La consulta local `loading content jumping`, dominio UX, devolvió Content Jumping y Loading Indicators, ambas aplicables a reservar espacio y conservar foco y estado accesible. Lazy Loading no se usó para modificar cuándo se solicitan los datos. DESIGN.md conserva colores neutros, radios y tamaños; no se añadió otro sistema visual.

`LoadingState` ofrece reservas acotadas de entradas, ofertas, filas, opciones, entrada, oferta y tarea diferida. Todas son estáticas y respetan movimiento reducido sin una animación alternativa. Sus formas son decorativas y no contienen controles, valores, conteos, porcentajes ni títulos de ruta ficticios. Hay un estado accesible local donde corresponde; una reserva puramente decorativa consume el estado que ya publica su contenedor.

## Consumidores finales

| Área | Carga inicial | Actualización y contexto |
| --- | --- | --- |
| App | Reserva local de tarea, sin h1 ni data-route-heading | RouteContext permanece fuera de Suspense. Creación, suscripción y dispose del router quedan intactos. |
| Catálogo | Estado en el espacio del conteo del toolbar y reserva con columnas e imagen de EntryCard | displayed y consulta confirmada se conservan. La actualización mantiene su aviso existente. |
| Categorías | Reserva de filas dentro del panel real | Lista anterior permanece durante actualización y error. Vacío sólo tras una respuesta confirmada vacía. |
| Recetas | Reserva de filas con cabecera y búsqueda reales | Registra consulta y página confirmadas. Mantiene tarjetas y muestra su contexto cuando cambia la consulta; bloquea acciones dependientes hasta confirmarla. |
| Selector de receta | Reserva dentro del mismo paso/modal | Conserva tarjetas, consulta y página anteriores durante demora/error y bloquea asignarlas como resultados de otra consulta. Aborto y respuesta antigua siguen filtrados. |
| Entrada | Reserva de identidad e imagen dentro del formulario existente, con su layout real | Categorías son independientes. No se cambian borrador, archivo, recursos ni recuperación. |
| Categorías de entrada | Cerrado conserva trigger y selecciones reales con estado local. Abierto sin opciones reserva sólo la lista pendiente | No hay dos filas ficticias fuera de un panel cerrado. La reserva abierta es decorativa y no duplica el status. |
| Ofertas | Reserva comercial con el espacio real del conteo | Se conservan visibleEntry/visibleResult y sus guardas de identidad, actualización y error. |
| Formulario de oferta | Tarjeta comercial con imagen dentro y sección de composición separada, usando las clases reales | Consulta de revisión y borrador permanecen intactos. No se convierte la revisión en una máscara ni en un desmontaje. |
| Inventario de receta | Texto local y controles reales con aria-busy, sin opciones ficticias fuera de un select nativo | Conserva nombres conocidos, selección, cantidad y borrador. Registra contexto confirmado y bloquea reasignar opciones anteriores de una consulta no confirmada. |

Los mensajes de incertidumbre de UX14, recibos y terminales de UX13 y prioridades de foco de UX15 no se reescriben. No se editaron tarjetas, API, validadores, almacenamiento, máquina de operaciones, RouteContext, useEntryResources, paquetes o configuración.

## Archivos

Cambios de fuente en App, CatalogPage/CatalogResults, CategoryPage, RecipePage/RecipeSelector/RecipeFormContent, EntryFormPage/EntryCategorySelector, OffersPage/OfferFormPage y nuevos shared/LoadingState.tsx y su test. La única hoja compartida editada es shared/primitives.css; las reglas nuevas están bajo el módulo. No se modificó main ni las hojas de área.

Pruebas preparadas en `e2e/ux-ui-16.spec.ts`. Evidencia individual sólo en esta carpeta. Las pruebas existentes permanecen intactas; los casos nuevos se añadieron al archivo nuevo LoadingState.test.tsx.

## Verificación ejecutada

- Primera focal,52/53: el fixture nuevo del selector recreaba el objeto repository al escribir y agotaba sus tres respuestas. Se informó antes de estabilizar el fixture; no se cambió el producto para ajustarse al mock. Log `jest-first.log`.
- Consumidores de entrada, catálogo, ofertas, formulario de oferta, App y reservas:151/151 en seis suites,20,961s. Log `jest-consumers.log`. Es anterior a la corrección estructural de geometría.
- Retención inicial de categorías/recetas/selector:54/54 en cuatro suites,30,353s. Log `jest-retention-final.log`.
- Nuevo caso de inventario,9/10: buscaba un nombre de opción inventado, Arroz con unidad. Se informó el defecto antes de consultar el nombre real Arroz, conservando las aserciones de selección, cantidad, borrador y ausencia de escrituras. Log `jest-inventory-first.log`.
- Retención con inventario:55/55 en cuatro suites,10,507s. Log `jest-retention-frozen.log`.
- Tras correcciones de panel cerrado y geometría:124/124 en seis suites,17,311s. Log `jest-geometry.log`. Incluye reservas, panel cerrado/abierto, selecciones tardías, entrada, catálogo, recetas, categorías y recuperación del paso de receta.
- Tipos y lint focal aprobados, logs `typecheck-geometry-final.log` y `lint-geometry.log`. La comprobación de whitespace acotada anterior pasó; root debe repetirla al integrar.
- Tras corregir regiones de oferta:81/81 en tres suites,12,179s, `jest-offer-regions.log`; tipos y lint aprobados en `typecheck-offer-regions.log` y `lint-offer-regions.log`.

Las cantidades se solapan y no representan una suma de pruebas únicas. No se escribieron tests por cobertura ni se redujeron escenarios de negocio.

## Correcciones de la revisión central

Root ejecutó una primera preparación de13HTTP y registró13/13. Esas mediciones corresponden a la primera implementación, no a la final. La inspección visual detectó que la etiqueta agregaba36px antes de las listas y que una reserva genérica de formulario agregaba60px y dibujaba otro marco. Se devolvieron esas diferencias a este agente.

La versión final sitúa el estado de catálogo en el toolbar existente. Los estados accesibles de filas y formularios no añaden altura. La reserva de EntryCard usa imagen a borde de144/192px, cuerpo con padding16 y las mismas columnas del módulo. Las variantes de formulario usan el layout de cada consumidor; la oferta reserva comercial, imagen y composición en sus regiones conocidas. No se afirma altura total idéntica porque cantidad de resultados, texto, imagen y composición todavía no se conocen.

La revisión de fuente detectó además que un selector cerrado y un select nativo no necesitan dos filas remotas dibujadas fuera de sus opciones. Se corrigió esa reserva antes de acreditar el ticket. El estado local y las selecciones permanecen.

La segunda revisión central pasó13/14 y detectó una diferencia real de4px por columna de ofertas: la reserva usaba gap16 y el grid real gap24. Se corrigió el gap, sin aumentar la tolerancia. También se contrastó el override final de las columnas: el contenedor offers usa tres columnas desde1200px, no cuatro. Los controles reservados usan48px cuando el contenedor real todavía es menor de1200px.

La tarjeta reservada de oferta ahora contiene las regiones conocidas de imagen112px, identidad/importe, estado con acción, composición, acciones finales y ayuda. Son formas neutras sin controles ni datos ficticios. La primera reserva de238px omitía esas regiones frente a una tarjeta resuelta de494px; se conserva como evidencia negativa. La reserva final se deriva de los paddings, gaps, bordes y alturas de esas regiones reales. La longitud de nombres, ayudas condicionales y el estado aún desconocido pueden cambiar la altura final; no se asegura igualdad total ni cantidad real de tarjetas.

## Navegador pendiente sobre la fuente final

Los20HTTP preparados controlan la demora mediante promesas de los fixtures, sin retardos añadidos a producto o demo. Seis consumidores comparan pendiente/resuelto a390,1024 y1440px. Otra prueba conserva recetas y foco cuando falla la actualización. La última retrasa categorías mientras se edita una entrada y se elige un archivo; compara panel cerrado, abierto y resuelto y conserva nombre, blob de imagen y selección.

Cada captura tiene PNG y JSON físicos. Las métricas excluyen nodos hidden o sin rectángulo y registran cabecera, filtros, primera región, imagen/preview, marco de imagen y acciones por separado. Los casos comparan posición y anchura de la primera región; catálogo, ofertas y entrada comparan además dimensiones de la superficie de imagen. En el fixture corto de oferta se comprueba que no se haya omitido una gran parte de sus regiones, sin usar esa proporción como garantía universal de altura. El total de altura desconocida no se interpreta como un conteo real ni como un CLS histórico.

Root debe repetir build y esos20HTTP, inspeccionar los pares y ejecutar las regresiones que correspondan. U25 queda en revisión hasta esa evidencia. Los recorridos demo existentes deben conservarse. Shell real excluido y dispositivo físico con teclado virtual y lector de pantalla como validación manual pendiente, según decisiones del usuario.
