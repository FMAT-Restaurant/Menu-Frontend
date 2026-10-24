# Revisión de UX01 y UX02

Revisor `/root/ux00_baseline`, solo lectura de implementación, pruebas, logs y capturas. Base inicial `21bd45a`, con cambios de la oleada en el checkout compartido. No se ejecutaron pruebas, servidores ni build desde esta revisión. Solo se escribió este informe.

Estado: revisión favorable de UX01 y UX02 sobre la repetición final de la oleada, sin defectos bloqueantes encontrados en su alcance. El orquestador conserva la decisión de integración y el registro de hallazgos.

## Evidencia examinada

- Tickets UX01 y UX02, DESIGN.md y decisiones vigentes comunicadas por el orquestador. El usuario autorizó implementar; D01 excluye la integración real con el shell, D02 confirma MXN con dos decimales y D03 confirma rondas de selección.
- Diff de App, main, SearchField, styles y primitives, y estilos de OfferCard. Código de OfferCard, Icon, la prueba unitaria nueva de SearchField y las regresiones de navegador UX01 y UX02.
- Log integrado `../oleada-01-demo.log`: 14 pruebas aprobadas en 27.7 s, incluidas las dos pruebas demo existentes. Logs focalizados: 55 pruebas de componentes y página de ofertas, y nueve pruebas de App y SearchField, aprobadas.
- Seis capturas abiertas con view_image: Individual y Combo en 390 px; imagen apaisada, nombre largo y precio largo en 1440 px; catálogo en escritorio; oferta nueva y biblioteca de recetas en 390 px; buscador enfocado y control externo dentro de un host ancho.

## UX01

Las imágenes quedan contenidas en una zona de altura reservada. Las capturas muestran Individual, Combo con bebida, nombre de entrada y precio fuera de esa zona. El caso con nombre sin separadores se distribuye en varias líneas sin cruzar la tarjeta ni ocultar el importe. El cambio se limita al CSS de tarjeta; las props, el vínculo, el controlador onError y el fallback permanecen intactos.

Las pruebas nuevas detectan el defecto real mediante rectángulos de imagen y texto, además de visibilidad, tamaños intrínsecos y capturas. Suben imágenes cuadradas, verticales y apaisadas a través del formulario real; el caso de error provoca onError sin reemplazar el componente React. El guard comprueba cero llamadas API y cero errores JavaScript. No se añadieron tests artificiales de cobertura ni se cambiaron tests existentes.

La revisión visual respalda U01 en los escenarios observados. Antes de integrar debe conservarse la geometría JSON como archivo y repetirse la suite tras el ajuste de evidencia. UX09 y UX12 deberán repetir esta condición cuando cambien la tarjeta y el precio.

## UX02

La base introduce un contenedor identificable, tokens y resets limitados a su árbol. El reset documental usa una marca del arranque autónomo en main. Importar y montar App desde otro punto no activa ese reset por sí mismo. El control externo de la captura conserva su presentación nativa, y la prueba verifica que no hereda el token de marca. Esto acredita el fixture de aislamiento observado, sin alegar un shell real.

Los controles compartidos usan una variable de altura, los iconos SVG son decorativos y los controles conservan su nombre. El buscador mantiene foco terracota visible. Los roles tipográficos, radios y espacios de la base corresponden al contrato de DESIGN.md; las hojas de áreas todavía tienen excepciones que deben adoptar los tickets posteriores. No se atribuye el cierre de U03, U07, U08 o U22 a definir sus tokens.

El contrato documental de `data-route-heading` con tabIndex y `data-return-key` permite que UX04, UX06, UX09 y UX15 incorporen destinos estables. La consulta de contenedor modifica controles según ancho útil incluso con viewport ancho. El test recorre 320, 390, 600, 740, 767/768, 1024, 1199/1200 y 1440 px y compara las nueve rutas en escritorio y móvil. Las capturas mantienen contenido real sin introducir otra pantalla ni sistema visual.

## Observaciones comunicadas antes de integrar

1. La entrega inicial de UX01 todavía afirma que la autorización estaba bloqueada y que no hubo implementación. Esa descripción quedó obsoleta tras la confirmación del usuario. El ejecutor debe actualizarla con archivos, pruebas y evidencia reales, conservando el incidente como antecedente si resulta necesario.
2. Las medidas UX02 se adjuntaban inicialmente como body de un attachment y no como JSON persistido en la salida de tests. El orquestador ya pidió corregirlo. La repetición debe mostrar archivos consultables, no solo un mensaje favorable.
3. Los campos de texto compartidos con línea 24, padding vertical 8 y borde sumaban 42 px pese a min-height 40. Durante la revisión el ejecutor añadió height según la variable y padding-block 0 a los campos de una línea. Falta contrastar el resultado final medido. Los textarea conservan crecimiento según contenido.
4. El contenedor responsive actual es el módulo raíz. Los diálogos nativos estrechos dentro de un módulo ancho no tienen todavía un contenedor propio para evaluar su formulario. UX03 debe medir esa anchura, el fondo y el scroll real y establecer el contrato de contenedor correspondiente, conservándolo en UX05, UX08 y UX10. Esta revisión no detectó una regresión modal mediante una captura ni ejecutó una prueba de capa superior; no se presenta la hipótesis como defecto comprobado.

Las franjas, acciones destructivas dominantes, tamaños locales antiguos, marca interna, emojis y cabeceras duplicadas que aún aparecen pertenecen a tickets posteriores. Se mantienen pendientes en sus responsables; no justifican ampliar UX01 o UX02 a un rediseño de módulos ni acreditar su cierre anticipadamente.

## Comprobación final

La repetición `../oleada-01-demo-final.log` acredita 14 pruebas aprobadas en 29.3 s. Se inspeccionaron directamente los diez archivos geometry.json de UX01 y los dos JSON de UX02 presentes en test-results. Las diez variantes de imagen conservan un mínimo de 12 px entre el borde inferior de la imagen y el primer texto comercial. La medida comprende las dos ofertas demo, imágenes cuadradas, verticales y apaisadas, y fallback en 390 y 1440 px.

El log `../oleada-01-unit-final.log` acredita además 64 pruebas aprobadas en cuatro suites integradas, 9.558 s. El orquestador confirmó tipos y lint globales con salida cero. UX01 preservó sus diez JSON y diez PNG en `../UX01/browser-final/`, y UX02 conserva sus JSON en `../UX02/browser/`, fuera de las salidas temporales que puede sobrescribir la siguiente ejecución.

Las medidas del buscador muestran input y botón de 48 px reales en anchos útiles 320, 390, 600, 740, 767, 768, 1024 y 1199; a 1200 y 1440 ambos miden 40 px. El viewport permanece en 1440 durante esas mediciones, por lo que se comprueba la consulta por ancho útil. La prueba también verifica 48 px en modo táctil explícito. El radio cero del input interior no contradice el contorno de control de 8 px: el buscador es un control compuesto, y su borde y esquinas pertenecen al wrapper.

El JSON de rutas conserva 18 registros correspondientes a nueve rutas en 390 y 1440 px, con sus controles reales. Persisten títulos locales de 24/32 en categorías, recetas y entradas, y de 20/28 o 18/24 en listados de ofertas. Se registran para la adopción posterior, sin afirmar uniformidad ya completada. La base incorpora sus roles normativos y los formularios de oferta ya consumen controles compartidos de altura corregida.

Se abrieron tres capturas de la repetición final, además de las seis iniciales: imagen cuadrada con nombre y precio largos en móvil, formulario de oferta en escritorio y buscador enfocado con control externo. No se observa superposición comercial ni pérdida del contenido en ellas. Los defectos visuales restantes coinciden con los consumidores pendientes ya documentados.

UX01 añadió una entrega vigente con implementación y resultados. UX02 documentó expresamente el contrato pendiente del contenedor de diálogo para UX03. La persistencia de JSON y el ajuste geométrico de campos de una línea se encuentran en la versión final. Las observaciones iniciales se conservan como trazabilidad de revisión, no como defectos nuevos abiertos.

Propuesta al integrador: integrar ambos tickets; acreditar U01 en esta base y mantener obligatoria su repetición en UX09 y UX12. U03, U07, U08 y U22 permanecen abiertos hasta la adopción de todos sus consumidores. UX03 debe comprobar nativamente fondo, foco, scroll y ancho del formulario dentro de los diálogos, incluidos módulos anchos y reducidos. Esta revisión no sustituye esas comprobaciones ni acredita tacto físico, teclado virtual o lector de pantalla.
