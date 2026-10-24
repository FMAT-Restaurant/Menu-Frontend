# Revisión de UX06 en oleada 4

Revisor: `/root/ux02_foundation`, en lectura de la implementación. Base de trabajo recibida: `0e375aa` más las entregas congeladas de UX05, UX06 y UX07. Se consultaron ticket UX06, DESIGN.md, diff de catálogo, pruebas y evidencia de la corrida conjunta.

No se encontraron defectos bloqueantes en la implementación y evidencia revisadas. Esta revisión no declara integración ni cierre de U11 o de los hallazgos compartidos; root conserva esa decisión y la verificación HTTP posterior.

## Evidencia comprobada

| Requisito | Resultado de revisión |
| --- | --- |
| Ver ofertas visible y distinto de Editar | EntryCard presenta dos enlaces hermanos con texto visible, href distintos y el mismo returnTo. No existe el enlace vacío absoluto anterior ni controles interactivos anidados. El recorrido Chromium activa ambos mediante Enter. |
| Eliminación secundaria y comprensible | Eliminar está en una fila terciaria separada y con menor jerarquía visual. Activa e inactiva conservan disabled. La explicación visible se asocia por aria-describedby; no depende de title ni de hover. Archivada conserva identificación y confirmación nativa. Escape devuelve foco al disparador en la demo. |
| Responsive por ancho asignado | Las consultas usan menu-module conforme al contrato de UX02, no el viewport. Los JSON distinguen viewport, módulo y main. Una columna para módulos 320, 390, 740 y 767; dos en 768 y 1199; tres en 1200 y 1440. El main conserva el margen interno de UX04. Se comprobó también un módulo estrecho dentro de un viewport 1440. |
| Selector de tamaño | Los JSON registran 88 px de ancho y valor/etiqueta 12 en todos los anchos. Las capturas 320 y 768 muestran el número completo, controles sin encogerse y filtros reorganizados. |
| Identidad y navegación | Artículo y tres acciones usan claves diferentes basadas en el id persistente. El JSON de rutas registra entry:demo-entry-burger y sus sufijos offers, edit y delete. El artículo tiene tabindex -1 como respaldo programático y los enlaces mantienen su recorrido normal. UX15 aún debe consumir estas claves. |
| Nombre largo, categorías y estados | La captura long390 muestra el nombre completo envuelto, tres categorías y ambas acciones dentro de la tarjeta. Se conservan Activa, Inactiva y Archivada con punto y texto. No se añade precio a la entrada ni franja decorativa. |
| Imagen y fallback | El código conserva imagen, zona reservada y onError; el estado de fallo se reinicia si cambia source. El fallback conserva nombre accesible y añade SVG decorativo. Las capturas demo muestran imágenes contenidas. El fallo de red y la reserva antes/después están cubiertos por los E2E HTTP existentes de catálogo, incluidos en la repetición integrada final aprobada. |
| Tests existentes | Se inspeccionó el único cambio de CatalogPage.test: la expectativa que prohibía Ver ofertas pasa a exigirlo visible. Es una incompatibilidad directa con U11 documentada antes de editar. Se conservan href, conteo, clasificación, estado y restricción de borrado. No se reducen garantías para hacer pasar el test. |

## Resultados y límites

`UX06/unit.log` registra cuatro suites y 32 tests aprobados. Root confirmó tipos, lint y build globales aprobados antes de ejecutar navegador. `oleada-04-demo.log` termina con 32 pruebas aprobadas en 49,7 s; incluye los tres recorridos UX06, las regresiones anteriores y UX05/UX07. No se lanzaron pruebas, servidores ni control del navegador desde este revisor.

Se abrieron visualmente las capturas `v320.png`, `v768.png` y `long390.png` dentro de [browser UX06](../UX06/browser/). Se contrastaron `viewport.json` y `routes.json` con las aserciones y el código. Los JSON de host y el caso de módulo estrecho aprobados acreditan el uso del ancho del módulo en un viewport mayor. Esto no representa integración con un shell real, excluida por el usuario.

La primera corrida HTTP terminó 51/52 por un paso de `offers.spec.ts` que hacía click por coordenadas sobre la imagen de la tarjeta, apoyándose en el overlay retirado por U11. Se revisó el diff posterior: únicamente se reemplaza ese click por el enlace visible Ver ofertas identificado por nombre accesible. Se mantienen todas las aserciones de oferta, publicación y regreso con consulta. Es otra incompatibilidad directa del comportamiento anterior, sin cambios adicionales de aplicación ni reducción de sus garantías.

La repetición normal de producción preview termina con 52 pruebas aprobadas en 18,6 s en `../oleada-04-production-preview-final.log`. Incluye fallback, geometría, zoom y confirmación de catálogo, además del regreso desde ofertas y los casos HTTP UX05/UX07. No acredita servicios reales porque esos casos usan respuestas HTTP controladas.

La repetición demo posterior al ajuste de alturas de entradas termina con 32 pruebas aprobadas en 43,3 s en `../oleada-04-demo-final.log`, incluidos los tres casos UX06 y la nueva exigencia de alturas exactas de UX07. No se encontraron nuevos defectos bloqueantes en esa repetición.

Queda para root la decisión final por hallazgo e integración. El responsive conjunto todavía requiere los aportes de recetas y ofertas de UX08/UX09. Foco de rutas pertenece a UX15. Dispositivo físico, teclado virtual y lector siguen como validación manual pendiente.

La revisión solo escribió este archivo. No modificó catálogo, la implementación UX07, tests, configuración, registro ni evidencia histórica.
