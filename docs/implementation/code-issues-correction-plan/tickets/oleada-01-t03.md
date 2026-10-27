# T03 — Caché de entradas estable y acotada

**Estado:** Pendiente de implementación.
**Oleada:** 1 · **Prioridad:** P1 · **Complejidad:** M
**Requisitos previos:** [T00](oleada-00-t00.md).
**Hallazgos propios:** D03, D04.
**Plan fuente:** [Plan de corrección](../audit-issues-correction-plan.md), ficha T03, sección 3.5.2 y matriz 7.3.

## Instrucciones

1. Edita `src/application/catalogCache.ts` y crea `src/application/catalogCache.test.ts`. Consulta `src/application/entryCategories.ts` y su test, catálogo y categorías; no cambies sus contratos.
2. Forma la identidad de consulta a partir de los campos de EntryQuery en orden fijo y con normalización coherente con lo enviado al servicio. Consultas equivalentes deben compartir resultado aunque difiera el orden de propiedades.
3. Limita a 50 consultas de entradas por instancia de repositorio. Limpia vencidos al consultar y al insertar; al superar la capacidad, expulsa la consulta utilizada menos recientemente.
4. Conserva el TTL de 30 s desde recibir y almacenar la respuesta. Leer un resultado vigente actualiza el orden de uso, sin cambiar su fecha de almacenamiento ni su vencimiento.

## Invariantes

- Mantén las firmas públicas y `invalidateCatalogEntries`; T06/T07/T10 consumirán esa interfaz sin otra migración.
- El límite corresponde únicamente a consultas de entradas. Categorías conserva almacenamiento separado, revisiones, invalidación y deduplicación de su cargador.
- No mezcles instancias de repositorio. No edites los consumidores de T17, la API de T01 ni la configuración de T12.

## Tests conceptuales

- Dos consultas equivalentes con distinto orden comparten caché; cambiar página o filtro real no colisiona.
- Insertar 51 consultas vigentes deja 50; leer una anterior cambia cuál se expulsa al insertar otra.
- Leer justo antes de los 30 s no renueva la vigencia. Consultas e inserciones eliminan vencidos que no vuelven a solicitarse por su clave.
- Instancias distintas están aisladas y la invalidación de entradas no rompe categorías ni la deduplicación de entryCategories. Controla y restaura el reloj.

## Criterios de aceptación

- [ ] D03: capacidad, LRU, vencimiento fijo y limpieza están comprobados con resultados observables.
- [ ] D04: la clave no depende del orden de propiedades y no colisiona entre consultas diferentes.
- [ ] Typecheck y suites focalizadas de caché/entryCategories pasan con la cobertura exigida por el plan.
- [ ] Entrega evidencia y archivos reales al registro de integración, sin modificar los contratos consumidores.
