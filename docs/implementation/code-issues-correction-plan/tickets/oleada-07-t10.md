# T10 — Contexto y recuperación de acciones del listado de ofertas

**Estado:** Pendiente de implementación.
**Oleada:** 7 · **Prioridad:** P0 · **Complejidad:** L
**Requisitos previos:** [T02D](oleada-05-t02d.md), [T03](oleada-01-t03.md), [T11](oleada-01-t11.md).
**Hallazgos propios:** O22, O23, O24, O25, O26, O27, O28, O29, O30.
**Plan fuente:** [Plan de corrección](../audit-issues-correction-plan.md), ficha T10, reglas 3.4 y matriz 7.7.

## Instrucciones

1. Edita `src/features/offers/OffersPage.tsx`, `OffersPage.test.tsx` y `e2e/offers.spec.ts`. Consulta OfferCard, caché y operaciones/contratos compartidos sin modificarlos. No edites el E2E común de recuperación.
2. Asocia cada lectura/mutación con entrada, página e identidad de operación. Conserva tarjetas anteriores para lectura, indicándolas como anteriores y bloqueando sus mutaciones mientras carga o falla la consulta vigente.
3. Protege publicaciones de datos, avisos y liberación de bloqueos, incluido finally. Tras navegar de A a B, ningún resultado o finalización de A puede liberar busyId o controles de B.
4. Conecta la acción de estado al PATCH idempotente de T02D: cuerpo, clave e If-Match fijados al iniciar y conservados en cada reintento. Ofrece recuperación accesible para IN_PROGRESS/KEY_REUSED y distingue los rechazos de negocio o de versión.
5. Mantén DELETE sin clave. Ante incertidumbre usa la consulta habitual para actualizar el listado, con controles dentro del diálogo activo. No dependas del fondo inerte ni interpretes un fallo de consulta como desaparición del recurso.
6. Muestra una sola alerta en la región activa e invalida entradas cuando borrado/reconciliación pueda cambiar conteos. Ajusta los dobles para que cambien estado/lista y los tests comprueben la tarjeta final o desaparición real.

## Invariantes

- Cero reintentos automáticos; la recuperación de estado reutiliza la identidad y no obtiene otro ETag. DELETE incierto no se repite automáticamente ni añade un flujo de revisión.
- Salir/cambiar contexto abandona la recuperación local de A y bloquea continuaciones tardías, sin deshacer lo guardado en servidor. El estado real se muestra con consultas habituales.
- Los datos anteriores no se presentan como vigentes ni admiten mutaciones durante carga/fallo de otra consulta.
- T07 posee el recorrido completo crear/borrar oferta → conteos del catálogo en offer-form.spec. Aporta el borrado/invalidación mediante la función existente, sin duplicar ese recorrido en offers.spec.
- No edites adaptador o App reservados a T13 ni los archivos de catálogo de T06.

## Tests conceptuales

- Inicia reconciliación A, navega/inicia B y resuelve A, incluido finally: B conserva sus bloqueos, avisos y contexto.
- Carga tarjetas, falla refresco y comprueba datos conservados pero bloqueados; recupera después con datos nuevos.
- La acción de estado recupera el resultado de T02D sin segunda escritura lógica ni GET de renovación. Se distingue de DELETE incierto y de rechazo contractual.
- El doble cambia lista/estado; resuelve las promesas diferidas dentro de act y espera un efecto posterior específico antes de comprobar ausencia de efectos antiguos, no una condición ya cierta.
- En navegador hay recuperación alcanzable en el modal y casos separados de clic Cancelar y tecla Escape, sin mutar y con foco restaurado cuando no hay operación pendiente. Reutiliza tablas comunes y F5 del editor.

## Criterios de aceptación

- [ ] O22, O27: tarjetas anteriores visibles sólo para lectura y recuperación posterior con datos nuevos.
- [ ] O23, O28: ninguna respuesta/finally antigua publica efectos o libera otra operación; las pruebas esperan su procesamiento.
- [ ] O24: PATCH de estado y DELETE incierto tienen recuperaciones distintas y accesibles.
- [ ] O25, O26: conteos se invalidan y existe una sola alerta en la región activa con controles alcanzables.
- [ ] O29: los tests comprueban cambios reales de tarjeta/lista, no únicamente llamadas.
- [ ] O30: Cancelar y Escape se prueban por separado y restauran el foco.
- [ ] Typecheck y suites afectadas pasan; entrega evidencia y borrado integrado para el recorrido de T07, sin duplicarlo.
