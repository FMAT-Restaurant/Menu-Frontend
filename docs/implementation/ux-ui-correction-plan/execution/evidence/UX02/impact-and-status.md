# UX02. Decisión de base visual y estado parcial

Base recibida: `21bd45a822c2345e695ddae419f5a0dcd715aec0`, rama `feature/ux-ui-improvement`, con UX00 registrada y sin cambios previos en los archivos reservados.
Ejecutor: `/root/ux02_foundation`. Orquestador y revisor: `/root`.

## Estado

La edición se detuvo mientras el orquestador aclaraba la autorización. El usuario confirmó después: "Sí, implementar los tickets". Se reanudó UX02 sin restablecer cambios. La entrega aún requiere revisión visual e integración por el orquestador.

Se editaron `src/styles.css`, `src/shared/primitives.css`, `src/App.tsx`, `src/main.tsx` y `src/shared/SearchField.tsx`. Se añadieron `src/shared/Icon.tsx`, `src/shared/SearchField.test.tsx` y `e2e/ux-ui-02.demo.spec.ts`. No se editaron archivos de módulos, tests existentes, configuraciones E2E, registro común ni evidencia histórica. No se ejecutaron servidores, build ni cobertura por este agente. Typecheck y las suites focalizadas de App y SearchField pasan. Se solicitó turno de navegador al orquestador.

## Decisión e impacto

Decisión: limitar tokens, resets y primitivas compartidas al árbol de la aplicación sin cambiar su contrato de repositorio ni sus rutas.

El índice fresco de UX00 y la lectura de `App`, `main` y `SearchField` muestran que `main` carga la hoja global, `App` monta rutas diferidas y `SearchField` es un consumidor compartido. El índice estático no acredita el alcance del CSS ni el comportamiento modal.

La propuesta añade `.menu-module[data-menu-module]` alrededor de Suspense y las rutas. Los tokens viven en ese contenedor y los selectores compartidos se limitan mediante `:where(.menu-module)`. El contenedor define `container: menu-module / inline-size` para que las decisiones responsive compartidas usen ancho útil. Las consultas por puntero conservan un modo táctil independiente del viewport.

El arranque autónomo en `main` marca `html[data-menu-standalone]`. Únicamente el reset documental del cuerpo utiliza ese marcador. Montar `App` desde otro anfitrión no añade por sí mismo esa marca. Esto no acredita integración real con un shell, excluida por el usuario del alcance actual.

Las hojas de áreas mantienen clases propias y se adoptarán en los tickets posteriores. Esta base no elimina todas las excepciones de tamaño, tipografía o radios que esas hojas todavía declaran.

## Contrato propuesto para tickets posteriores

- `data-route-heading` identifica el título principal local de cada tarea, con `tabIndex={-1}` para foco programático. UX04 lo incorpora; UX15 coordina su uso al entrar a rutas.
- `data-return-key` identifica de forma estable un origen, por ejemplo `entry:<id>` u `offer:<id>`. UX06 y UX09 lo incorporan en destinos de regreso. Se conserva `returnTo` y la identidad fuera de filtros o números de posición.
- `.button--icon` mantiene un área mínima basada en `--control-height`. Cada botón aporta su nombre accesible; los SVG de `Icon` son decorativos, `aria-hidden` y no enfocables.
- Los tamaños compartidos usan `--control-height`, 40 px estándar y 48 px para ancho útil menor de 1200 px o puntero táctil. `data-input-mode="touch"` permite declarar un contexto táctil de forma explícita.
- La consulta `menu-module` mide el módulo, no cada diálogo. UX03 debe definir un contenedor propio del formulario modal y elegir 48 px cuando ese formulario sea estrecho, aunque el módulo exterior mida 1440 px. Los paneles de insumos deben medir igualmente su propio ancho durante UX08/UX10. No se acredita ese caso con la consulta del contenedor raíz.
- Las clases `text-h1`, `text-h2`, `text-h3`, `text-body`, `text-small` y `text-caption` corresponden a 28/36, 22/30, 18/26, 16/24, 14/20 y 12/16. Los consumidores de área deben retirar sus valores incompatibles en su ticket.

## Fuentes de decisión

DESIGN.md mantiene la autoridad. No se genera una paleta alternativa ni se instala una biblioteca de iconos. La consulta local `icon button accessible label --domain icons` encontró la pauta `icon-context-accessibility`, aplicable al SVG decorativo dentro de un control con nombre. Se conserva una familia SVG propia acotada, conforme al ticket, sin instalar los paquetes sugeridos por el catálogo.

D01 excluye el shell real del alcance actual por instrucción del usuario. D02 define MXN y dos decimales para UX12. D03 define rondas de selección para UX14. D04 y D05 conservan las decisiones del plan. UX02 no cambia moneda, cantidad de dominio, payload ni reglas de recuperación.

## Verificación pendiente

La autorización está confirmada y los resultados focalizados constan en `typecheck.log`, `unit.log` y `lint.log`. La ejecución integrada final aprobó 14 casos en 29,3 s, incluidas las dos pruebas demo existentes, diez de UX01 y dos de UX02. El orquestador conservó su resultado en `../oleada-01-demo-final.log`. Se copiaron los 19 PNG y dos JSON propios de UX02 en `browser/`. Se revisaron capturas móviles de catálogo, categorías, recetas, entradas, nueva oferta, edición de oferta y ruta inexistente, además del catálogo de escritorio. La base conserva contenido y búsqueda SVG; cabeceras, acciones, composición horizontal y geometría de área corresponden todavía a sus tickets posteriores.

Las medidas verifican altura real de 48 px en búsqueda y botón con módulo entre 320 y 1199 px, y 40 px en 1200 y 1440 px dentro de un viewport de 1440 px. Los campos comerciales reales de ofertas miden 40 px en escritorio y 48 px en móvil. Se comprueba también la declaración explícita de modo táctil. La entrada interior de búsqueda tiene radio cero porque el borde y radio de 8 px pertenecen al contenedor compuesto, no a la zona de texto.

Los casos nuevos miden controles reales en 320, 390, 600, 740, 767/768, 1024, 1199/1200 y 1440 px dentro de un viewport ancho, comprueban controles externos, foco y SVG, y recorren nueve rutas en 1440 y 390 px. El efecto del contenedor en los diálogos nativos requiere además el recorrido modal de UX03 y su contenedor propio.

Los hallazgos U03, U07, U08 y U22 siguen abiertos hasta la adopción de sus consumidores y la verificación integrada. La base compartida está lista para revisión del orquestador; su ejecución no equivale al cierre de esos hallazgos.
