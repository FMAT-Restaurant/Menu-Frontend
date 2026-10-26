# Preparación de la verificación integrada

Lectura de root, 25 de octubre de 2026, con UX13 en ejecución. No es una entrega de UX17 ni acredita cierres. La base final deberá incluir UX14, UX15 y UX16 antes de ejecutar las puertas completas.

## Puertas sobre la misma fuente final

Registrar hash de fuente y dependencias, selección efectiva de Playwright, typecheck, lint, Jest, test:unit con cobertura y umbrales de CI sin cambios, build, demo y suite normal tanto sobre preview como sobre Compose. Conservar logs y artefactos físicos antes de que otra ejecución sobrescriba test-results. Un resultado histórico no sustituye una puerta final.

Compose usará un proyecto propio y variables del proceso de verificación para FRONTEND_PORT=4173 y API_BASE_URL vacío. La configuración local anterior puede introducir otro puerto u origen. No modificar .env ni detener proyectos ajenos. La investigación de UX00 explica por qué un resultado contra preview no demuestra el contenedor y por qué las pruebas HTTP con fixtures no demuestran el backend real.

## Casos y consumidores

V01–V18 se contrastarán con las 28 filas de closure.md. La matriz debe identificar por caso implementación, entorno, evidencia física, aserciones y limitaciones. Las medidas abarcan 320, 390, 600, 740, 767, 768, 1024, 1199, 1200 y 1440 px útiles; módulo estrecho en host ancho y formulario de diálogo se miden por separado.

Los controles, tipografía, radios, espacios, estados, acciones e iconos se revisarán en catálogo, categorías, entradas, recetas, ofertas, composición y pasos internos. Una muestra de la base compartida no acredita sus consumidores. Las capturas requieren revisión visual y geometría, no sólo textos presentes.

UX13 debe demostrar acceso a guardar, foco y errores sin solapamiento, formulario corto sin persistencia innecesaria, poca altura y zoom identificado. UX15 debe conservar prioridades de foco, origen ausente y reemplazo del recibo sin otra transición. UX16 debe probar demoras y actualización con datos existentes, además de movimiento reducido.

## Punto de inspección de aislamiento

La lectura actual muestra reglas compartidas de styles.css y primitives.css limitadas a .menu-module, mientras varias hojas de features conservan selectores de clases sin ese prefijo. La entrega UX02 acredita controles externos de su alcance, no toda clase de cada feature. UX17 deberá contrastar el aislamiento con controles externos que compartan clases de formularios y tarjetas. Las nuevas reglas UX13 ya se devolvieron a su ejecutor para limitar su ámbito. Esta observación no prueba todavía el impacto de todas las reglas históricas ni autoriza declararlas aisladas.

## Límites decididos por el usuario

El shell real está excluido de esta implementación. El montaje autónomo y un marco de prueba controlado se identificarán como tales. Dispositivo táctil físico con teclado virtual y lector de pantalla quedan como validación manual pendiente, con recorridos entregables; no se presentará viewport, DOM o tacto emulado como sustituto. Estas decisiones no convierten una prueba ausente en aprobada.

La implementación de agentes puede finalizar con esos pendientes manuales expresamente autorizados, pero closure.md debe conservar abierto el alcance que sólo ellos pueden acreditar. No se propondrá cierre total de todos los entornos mientras falte esa evidencia.

## Selección a contrastar tras UX16

Relectura al reanudar desde1f415c4. Los archivos siguientes existen y son candidatos a evidencia final; su existencia no demuestra cobertura completa ni resultado aprobado sobre la fuente futura.

| Casos | Recorridos existentes que deben conservarse | Aporte que falta integrar o comprobar |
| --- | --- | --- |
| V01 | ux-ui-01.demo y ux-ui-12.demo/HTTP | Geometría final de imagen, etiqueta e importe en ambas tarjetas y revisión |
| V02/V03 | ux-ui-02/06/07/08/09.demo | Roles equivalentes en todos los consumidores, límites útiles y formularios propios |
| V04 | ux-ui-04.demo y selector ux-ui-10.demo | Sin cabecera duplicada, título y alcance autónomo tras UX15 |
| V05/V06 | ux-ui-06/09.demo y offers HTTP | Acciones por teclado, restricciones, retorno y origen ausente tras UX15 |
| V07/V08 | ux-ui-05/07/08.demo y HTTP de categorías/entrada | Cargas/error separados del vacío tras UX16 |
| V09/V10 | ux-ui-10/11.demo y recuperación HTTP | Foco coordinado sin perder borradores, máximo un modal/fondo |
| V11 | ux-ui-13.demo y entry-form-remediation HTTP | Conservar corrección de cabecera, recibos y negativos; prueba física pendiente |
| V12 | Preparación UX14 e inventario de tests consumidores | Tabla final y estados dirigidos, no sólo captura de éxito |
| V13 | ux-ui-09.demo y edición inventario existente | Adopción SVG en todos los consumidores y cambio de imagen sin hover |
| V14 | Preparación UX15 | Nuevas pruebas de foco/título, rutas diferidas, prioridad, atrás/adelante y recibo |
| V15 | Preparación UX16 | Demoras, actualización con contenido, error y respuesta antigua; geometría y movimiento reducido |
| V16/V17 | ux-ui-03.demo, modal-pending HTTP y pasos ux-ui-10 | Repetir documento largo, limpieza y posición tras flujo final |
| V18 | Suites completas de CI y ambas selecciones Playwright | Aislamiento de todas las hojas de área y Compose final sobre la misma fuente |

La revisión de fuente encontró un glifo Unicode en el vacío de CategoryPage. Se devolvió al ejecutor que reserva ese archivo para adoptar el SVG compartido y registrar el aporte a U22. No se declara corregido hasta revisar su entrega.
