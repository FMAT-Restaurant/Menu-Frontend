# T15 — Rutas visibles, carga diferida y pruebas aisladas

**Estado:** Pendiente de implementación.
**Oleada:** 6 · **Prioridad:** P1 · **Complejidad:** M
**Requisitos previos:** [T02D](oleada-05-t02d.md).
**Hallazgos propios:** R01, R02, R03, R04.
**Plan fuente:** [Plan de corrección](../audit-issues-correction-plan.md), ficha T15 y matriz 7.1.

## Instrucciones

1. Edita `src/App.tsx` y `src/App.test.tsx`; crea `e2e/app-routes.spec.ts`. Consulta `e2e/menu.spec.ts` sin modificarlo en paralelo con la tarea de estilos.
2. Añade una salida para ruta desconocida con explicación y enlace al catálogo. Esa salida no debe importar pantallas que vuelvan ansiosa su carga.
3. Carga las pantallas bajo demanda con React.lazy/Suspense y rutas analizables estáticamente. Adapta los exports existentes sin importar ansiosamente esos mismos módulos por otra vía.
4. Conserva la misma instancia de repositorio al navegar y los retornos contextuales. No modifiques el selector de recetas ni sus consumidores para resolver la carga de rutas.
5. En todos los montajes de App, inyecta repositorio preparado para datos/errores realmente probados. Fija y restaura URL mediante preparación/limpieza garantizadas y espera la pantalla o datos terminados cuando la ruta sea asíncrona.

## Invariantes

- Ningún test de rutas depende de HTTP real ni se considera correcto sólo por un encabezado visible antes de cargar los datos.
- El alias /menu, rutas directas, navegación posterior y regreso contextual conservan su comportamiento.
- No prometas ahorro de bytes o tiempo sin medirlo. La separación se verifica en el build y la red del navegador.
- Integra App/App.test antes de T13, que conectará la configuración de Inventario; no compartas esa edición simultáneamente.

## Tests conceptuales

- URL inexistente muestra la salida y permite volver al catálogo; alias, todas las rutas y retornos funcionan.
- Tests individuales y conjuntos no heredan URL ni conexión de otro caso, incluso cuando una aserción falla.
- Abrir sólo catálogo no descarga anticipadamente los módulos de editores. Ruta directa y navegación posterior cargan los módulos y estilos necesarios.

## Criterios de aceptación

- [ ] R01: ruta desconocida con explicación y regreso utilizable.
- [ ] R02: build/red acreditan carga bajo demanda y rutas directas funcionales.
- [ ] R03: todos los tests inyectan repositorio y comprueban la carga relevante sin peticiones reales.
- [ ] R04: URL inicial/restauración garantizadas y casos independientes.
- [ ] Typecheck, tests de App, build y E2E de rutas pasan; entrega evidencia y libera App/App.test para T13.
