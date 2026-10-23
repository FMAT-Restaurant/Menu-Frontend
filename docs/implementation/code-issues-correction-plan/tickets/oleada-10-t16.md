# T16 — Estilos por área y controles alcanzables

**Estado:** Pendiente de implementación.
**Oleada:** 10 · **Prioridad:** P1 · **Complejidad:** L
**Requisitos previos:** [T04](oleada-06-t04.md), [T05](oleada-03-t05.md), [T06](oleada-07-t06.md), [T08](oleada-09-t08.md), [T09](oleada-02-t09.md), [T10](oleada-07-t10.md), [T14](oleada-08-t14.md), [T15](oleada-06-t15.md).
**Hallazgos propios:** R05, R06, R07.
**Plan fuente:** [Plan de corrección](../audit-issues-correction-plan.md), ficha T16, parámetros 3.5.3 y matriz 7.1.

## Instrucciones

1. Antes de editar estilos, toma referencias visuales de la base integrada posterior a las correcciones funcionales. Registra base, fixtures/imágenes, Chromium, SO y fuentes; los conjuntos antes/después deben usar el mismo entorno.
2. Reserva `src/styles.css`, `src/main.tsx` y las nuevas hojas `styles.css` de `src/features/catalog`, `categories`, `entries`, `offers` y `recipes`. Adapta imports de sus pantallas y, cuando sea necesario, clases/selectores de sus componentes, sin cambios funcionales.
3. Crea `e2e/audit-layout.spec.ts`. Ajusta sólo las comprobaciones de presentación afectadas de `e2e/entry-form-remediation.spec.ts` y `e2e/catalog-remediation.spec.ts`.
4. Inventaría selectores genéricos compartidos y diálogos fuera de su contenedor visual. Conserva tokens, reset y primitivas comunes en global; mueve reglas de área a su hoja y limita su alcance a clases de área o del diálogo. Haz explícito el orden de cascada, incluidas rutas diferidas.
5. Permite reducir columnas al ancho disponible, sin mínimos que recorten campos a 320 px. Limita los diálogos al 90 % del viewport disponible y permite desplazamiento hasta todos los campos/acciones; evita contenido atrapado por overflow oculto.
6. Mide dimensiones y acceso automáticamente en Chromium. Compara visualmente capturas por área antes/después en escritorio/móvil y documenta las diferencias intencionales. Registra además revisión manual de zoom real del navegador al 200 %.

## Invariantes

- Separar archivos sin acotar selectores genéricos no cumple la extracción. Navegación, carga directa y apertura de diálogos no deben causar fugas de estilo.
- Desbordamiento horizontal global máximo de 1 px CSS por redondeo; ningún campo/panel queda recortado. Alto de diálogos no mayor del 90 % y acciones alcanzables por teclado/desplazamiento con foco visible.
- No edites App, App.test ni app-routes.spec, ni cambies comportamiento de componentes. T17 no es una dependencia funcional de este trabajo.
- jsdom y aserciones de texto no acreditan geometría. style.zoom puede seguir como prueba adicional, pero no sustituye zoom real.

## Tests conceptuales

- A 1366 × 768, 390 × 844, 320 × 568 y 390 × 320 px CSS, mide overflow, tamaño de diálogos y acceso a todos los campos y Guardar/Cancelar en ambos modales de ofertas.
- En escritorio con zoom real al 200 %, registra viewport resultante, foco y capturas y alcanza todas las acciones mediante teclado/desplazamiento.
- Compara capturas por área a 1366 × 768 y 390 × 844 con datos/entorno iguales, revisando visualmente cambios intencionales y regresiones.
- Carga rutas directamente y navega entre áreas, incluidos diálogos, para comprobar alcance de selectores y orden de cascada con módulos diferidos.

## Criterios de aceptación

- [ ] R05: a 320 × 568 no se recorta el panel comercial ni sus campos y el overflow global no supera 1 px.
- [ ] R06: ambos modales cumplen alto máximo, desplazamiento y acceso a campos/acciones, también en poco alto y zoom real al 200 %.
- [ ] R07: hojas por área con selectores acotados; referencias/comparaciones visuales, navegación y carga directa acreditadas.
- [ ] Base, tamaños, entorno, capturas y revisión manual quedan registrados. La evidencia no se reduce a jsdom o style.zoom.
- [ ] Build, typecheck si cambia TS/TSX y comprobaciones afectadas pasan. Entrega evidencia integrada para T18 sin reescribir las pruebas funcionales ya acreditadas.
