# T06 — Catálogo consistente y recorrido de categoría a entrada

**Estado:** Pendiente de implementación.
**Oleada:** 7 · **Prioridad:** P1 · **Complejidad:** L
**Requisitos previos:** [T01](oleada-01-t01.md), [T03](oleada-01-t03.md), [T04](oleada-06-t04.md), [T05](oleada-03-t05.md).
**Hallazgos propios:** C01, C02, C03, C04, C05, C06, C07, C08, C09, C10, C11, C12, C13, C14, C15, C16.
**Plan fuente:** [Plan de corrección](../audit-issues-correction-plan.md), ficha T06, paginación 3.5.4 y matriz 7.4.

## Instrucciones

1. Reserva los ocho archivos de `src/features/catalog/`: `CatalogPage.tsx`, sus dos tests, `CatalogFilters.tsx`, `CatalogResults.tsx`, `EntryCard.tsx`, `catalogError.ts` y su test. Añade `CatalogResults.test.tsx` si conviene aislar límites. Edita `e2e/catalog-remediation.spec.ts` y `e2e/catalog-traffic.spec.ts`.
2. Distingue 429 de desconexión/otros fallos y comprueba el mensaje correspondiente al cargar y mutar. Acota los nombres/valores de filtros para impedir combinaciones inválidas.
3. Cancela o invalida el debounce al limpiar y al cambiar consulta por historial. Comprueba identidad de consulta/operación después de cada espera, incluida la segunda lectura al corregir página tras borrar. URL, metadatos y resultados deben pertenecer al mismo contexto.
4. Sitúa aviso y actualización del DELETE incierto en el diálogo activo. Eliminar no puede aparecer disponible cuando su handler no permite actuar. La consulta normal actualiza lo devuelto por el backend; al terminar, cierra/restaura foco cuando corresponda. Un error de consulta conserva aviso/reintento y no demuestra ausencia.
5. Usa loadEntryCategories con cancelación, revisiones y suscriptores. Consulta `src/application/entryCategories.ts` y `catalogCache.ts` sin cambiar sus contratos.
6. Calcula hasta cinco números de página directamente: primera/última reservadas; con más de cinco, tres intermedias consecutivas centradas y ajustadas a los extremos, incluyendo la actual. Con dos a cinco muestra todas y con cero/una oculta el paginador. Separadores sin interacción sólo donde haya saltos; Anterior/Siguiente conservan sus límites. No reserves memoria proporcional al total.
7. Codifica el ID como segmento en ambas rutas de tarjeta. Corrige fixtures por búsqueda/página, espera el procesamiento real de promesas y compara URL completa y datos finales. Separa reutilización de caché de invalidación.
8. Entrega el recorrido completo en catalog-traffic.spec: carga catálogo para poblar caché, crea y ve categoría, abre nueva entrada, la selecciona, guarda y vuelve al catálogo. Usa datos simulados mutables, repositorio estable y navegación sin F5; comprueba categoryId enviado, nueva consulta y tarjeta/categoría visibles dentro del TTL. T04/T05 aportan sus formularios; este ticket posee todo el caso.

## Invariantes

- No edites API, cargador/caché ni formularios de entradas/categorías. T13 reserva el adaptador en esta oleada y T10 sus archivos de ofertas.
- Una respuesta de otro contexto no modifica URL/datos actuales, aunque se resuelva durante la corrección de página.
- DELETE incierto no se repite automáticamente ni exige una pantalla adicional de revisión. La recuperación debe ser alcanzable sin tocar el fondo inerte.
- Mantén el contrato de caché de T03 y la misma instancia de repositorio; no uses una recarga completa para ocultar invalidación ausente.

## Tests conceptuales

- Escribir y limpiar antes de 300 ms, y navegar por historial, no restaura q antiguo. Resolver una segunda lectura vieja tras navegar no cambia el contexto nuevo.
- Dos consumidores comparten categorías y una respuesta anterior a invalidación no repuebla la caché; invalida y remonta para comprobar el dato nuevo.
- Paginación con 0, 1, 2, 5, 6 y total enorme, al inicio/centro/final: hasta cinco números distintos, actual y extremos visibles, separadores y navegación correctos.
- IDs con barra, interrogación, numeral y espacios no alteran el destino ni el retorno. Fixtures de página dos/búsqueda muestran sus datos y URL exacta.
- Resuelve promesas diferidas dentro de act y espera un efecto posterior específico antes de afirmar ausencia de efectos; el test debe detectar un callback viejo publicado. La mutación cambia datos y acredita invalidación dentro de los 30 s.
- En navegador comprueba diálogo nativo, Escape, foco, fondo inerte y salida de recuperación; a 320 px mide el espacio de imagen antes/después del fallo, manteniendo el caso unitario de fallback.

## Criterios de aceptación

- [ ] C01, C02, C03: errores y filtros tienen clasificación/tipos correctos y aserciones de significado, no sólo texto no vacío.
- [ ] C04, C05: debounce, historial y segunda lectura no restauran un contexto antiguo.
- [ ] C06, C11, C13: recuperación del borrado alcanzable dentro del modal, disponibilidad veraz y foco comprobados en navegador.
- [ ] C07: se usa y prueba el cargador compartido sin cambiar su contrato.
- [ ] C08, C09: paginación acotada y ambas rutas codificadas pasan sus casos límite.
- [ ] C10, C12, C14: tests exigen datos/URL finales y procesan efectivamente respuestas tardías.
- [ ] C15, C16: invalidación se acredita separada de caché; dimensiones se miden en navegador.
- [ ] El recorrido completo de catalog-traffic.spec pasa sobre T04/T05; no se delega su escritura a T18.
- [ ] Typecheck y pruebas afectadas pasan con su cobertura; entrega evidencia por ID y libera el catálogo para el recorrido de T07.
