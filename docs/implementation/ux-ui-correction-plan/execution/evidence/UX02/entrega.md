# Entrega de UX02

Ticket: UX02, base visual compartida. Agente: `/root/ux02_foundation`. Rol: tokens, controles, SVG y ámbito de CSS. Estado solicitado: en revisión.

Base de aplicación inicial: `21bd45a822c2345e695ddae419f5a0dcd715aec0`. Preparación UX00 integrada documentalmente en `c7b5482`. Trabajo simultáneo UX01 sobre ofertas, sin edición compartida de esos archivos. No se crearon commits desde este agente.

## Archivos

- `src/App.tsx` añade `.menu-module[data-menu-module]` alrededor del contenido diferido y las rutas. No cambia las rutas ni el repositorio.
- `src/main.tsx` marca el arranque autónomo para su reset documental. Conserva la carga dinámica de demo y su título.
- `src/styles.css` limita tokens, resets y selectores al módulo, define escala tipográfica, radios, espacios, controles, estados y campos con error.
- `src/shared/primitives.css` limita primitivas al módulo, usa altura compartida y consultas por ancho útil para los consumidores compartidos.
- `src/shared/SearchField.tsx` sustituye el glifo de búsqueda por SVG decorativo.
- `src/shared/Icon.tsx`, nuevo, ofrece búsqueda, cerrar, agregar e imagen sin una dependencia de iconos.
- `src/shared/SearchField.test.tsx`, nuevo, prueba edición, envío y semántica accesible del campo con SVG.
- `e2e/ux-ui-02.demo.spec.ts`, nuevo, comprueba geometría, foco, aislamiento de controles externos y las nueve rutas reales a dos anchos.

No se amplió la reserva a módulos, estilos de ofertas, tests existentes ni configuración de Playwright. El orquestador incorporó la selección E2E por su cuenta. La evidencia individual permanece en esta carpeta; no se alteró `audit/` ni el registro compartido desde este agente.

## Comportamiento y evidencia

El ámbito de CSS se limita a `.menu-module`; la única regla documental depende de `html[data-menu-standalone]` establecido por el entry point. Un control externo con las mismas clases no recibe el color primario, altura mínima ni tokens del módulo. Esta prueba acotada no afirma integración con un shell real, excluido por el usuario.

La búsqueda real conserva nombre accesible, envío y foco naranja visible. Sus controles miden 48 px con anchos útiles de 320, 390, 600, 740, 767, 768, 1024 y 1199 px, y 40 px en 1200 y 1440 px. Todas esas medidas se hicieron en un viewport de 1440 px, por lo que acreditan el caso de módulo estrecho dentro de un contexto ancho. El modo táctil explícito mantiene 48 px también en escritorio.

Los campos de presentación y precio de alta y edición de ofertas miden 40 px en 1440 y 48 px en 390 px. Las 18 capturas de rutas conservan catálogo, categorías, recetas, entrada nueva, entrada editada, listado de ofertas, oferta nueva, oferta editada y ruta inexistente. La captura adicional muestra la búsqueda junto al control externo de prueba.

Medidas: [controles](browser/shared-control-measurements.json), [rutas y consumidores](browser/route-measurements.json). Capturas: `browser/route-<ancho>-<índice>.png` con el orden de rutas indicado arriba y `browser/shared-controls-wide-host.png`.

## Verificación

| Caso y comando | Resultado y entorno |
| --- | --- |
| `npm run typecheck` | Pasa; log local `typecheck.log`. |
| ESLint focalizado en los seis archivos TS/TSX nuevos o modificados y regresión E2E | Pasa; `lint.log`. |
| `npx --no-install jest --runInBand src/App.test.tsx src/shared/SearchField.test.tsx` | 2 suites, 9 tests pasan; `unit.log`. No se editaron tests existentes. |
| Suite demo integrada coordinada por root | 14 tests pasan en 29,3 s. Incluye dos existentes, diez UX01 y dos UX02. Chromium real, servidor demo de memoria, cero API y cero errores de JavaScript en los casos nuevos. Log compartido `../oleada-01-demo-final.log`. |
| V02/V03/V13/V18 | Acreditación parcial de la base compartida mediante medidas y capturas. No acredita consumidores todavía pendientes, diálogo propio, tacto físico ni lector de pantalla. |

Root informó además que lint y typecheck globales pasan sobre la misma corrida integrada. Este agente no ejecutó build ni cobertura, reservados al integrador. No aparecieron tests incompatibles ni se modificaron aserciones existentes.

## Aportes y pendientes

No se propone cerrar U03, U07, U08 o U22. UX03 y UX05 a UX09 deben adoptar los controles, iconos y geometría en sus consumidores, y UX17 verificar el conjunto.

UX03 debe medir el contenedor propio de cada diálogo. Un diálogo de 540 px dentro de un módulo de 1440 px no queda acreditado por la consulta del módulo; debe usar un contenedor de formulario y controles adecuados a ese ancho. UX08 y UX10 deben aplicar la misma separación a los paneles de insumos. El ciclo modal nativo, el scroll y el fondo se verifican en UX03.

UX04 incorpora `data-route-heading` y `tabIndex={-1}` al título local. UX06 y UX09 incorporan `data-return-key` con identidad estable, por ejemplo `entry:<id>` u `offer:<id>`. UX15 consume esos marcadores y conserva el contexto `returnTo`. El contrato y las decisiones de CSS están desarrollados en [impact-and-status.md](impact-and-status.md).

Las capturas todavía muestran diferencias conocidas de tipografía, jerarquía, marca interna, radios de áreas, controles de composición e imagen y barra de guardado de entradas. Corresponden a tickets posteriores; no se ocultan como supuestas correcciones de UX02. La comprobación física táctil y con lector sigue sin evidencia. D02 y D03 están resueltas por el usuario y no se aplican prematuramente desde este ticket.
