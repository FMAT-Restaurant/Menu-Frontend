# T01 — Frontera HTTP y recuperación común de operaciones

**Estado:** Pendiente de implementación.
**Oleada:** 1 · **Prioridad:** P0 · **Complejidad:** L
**Requisitos previos:** [T00](oleada-00-t00.md).
**Hallazgos propios:** A02, A03, A04, A05, A10, A11.
**Plan fuente:** [Plan de corrección](../audit-issues-correction-plan.md), ficha T01, reglas 3.2–3.5, matriz 7.2 y reparto de pruebas 8.1–8.2.

## Instrucciones

1. Reserva `src/api/menuApi.ts`, `src/api/catalogResponse.ts`, sus tests, `src/api/menuApi.contract.test.ts` y las adaptaciones mínimas de `src/api/entryApi.remediation.test.ts`. Reutiliza `src/application/entryVersion.ts` y su test para la comprobación de ETag fuerte.
2. Incorpora los módulos previstos `src/application/operationAttempt.ts`, `src/shared/pendingOperationStorage.ts`, `src/api/idempotencyResponse.ts` y sus tests. Separa operación, almacenamiento y análisis HTTP sin depender de React ni de los DTO de cada formulario. Define sus responsabilidades, sin migrar todavía las firmas de MenuRepository o sus consumidores de producción.
3. Valida las respuestas desde datos desconocidos: envoltorios, listados, detalles, escrituras, imágenes, errores y metadatos contractuales de todas las familias. Distingue una categoría completa de una referencia y comprueba los opcionales cuando estén presentes. No exijas una revisión de receta que la respuesta no expone.
4. Unifica la validación de ETag fuerte antes de las mutaciones condicionales. Aplica 12 s a GET, 20 s a escrituras JSON y 120 s a imágenes; propaga señales de consulta. Sustituye la paginación recursiva de categorías por acumulación iterativa ordenada, con hasta cuatro consultas simultáneas y cancelación coherente.
5. Implementa el mecanismo común de operación manual de 3.4: UUID por operación lógica generado fuera del transporte, solicitud original inmutable, borrador editable separado y versión local con que comenzó el envío. Conserva método, ruta concreta, recurso/contexto, primer envío y confirmación conocida por separado, estado, fin de Retry-After y respuesta original con estado HTTP, cuerpo y ETag. Imagen/recurso son etapas con claves distintas. Para imágenes conserva bytes y tipo; para PATCH de ofertas, el If-Match original.
6. Usa IndexedDB nativo para conservar JSON, metadatos y Blob del mismo formulario/pestaña/recurso. Espera la finalización de la transacción. La restauración no envía; salir voluntariamente descarta recuperación y continuaciones, mientras un desmontaje por recarga conserva lo necesario para restaurarla.
7. Distingue pendiente, éxito, rechazo confirmado, incertidumbre y conflictos de idempotencia. Interpreta `error.details.code`: IN_PROGRESS respeta Retry-After positivo sin enviar al vencer; ausencia o valor inválido produce error controlado. KEY_REUSED conserva el original; INVALID_IDEMPOTENCY_KEY identifica un encabezado inválido. Una respuesta de éxito malformada puede corresponder a una escritura aplicada.
8. Adapta inmediatamente los datos simulados afectados de los siete E2E existentes: `e2e/entry-form.spec.ts`, `e2e/entry-form-remediation.spec.ts`, `e2e/categories.spec.ts`, `e2e/offers.spec.ts`, `e2e/menu.spec.ts`, `e2e/catalog-traffic.spec.ts` y `e2e/catalog-remediation.spec.ts`. Revisa sus interceptores y modifica sólo los necesarios. Las imágenes exitosas incluyen sus tres campos y el test de timeout de entryApi espera 120 s. Conserva deliberadamente inválidos los casos de rechazo; las regresiones funcionales de área siguen perteneciendo a sus tareas.

## Invariantes

- Cero reintentos automáticos, una petición simultánea por operación y un intento por clic válido. No generes claves por petición, no las rotes ante incertidumbre y no añadas colas ni gestores globales.
- Restaurar o cumplir Retry-After sólo habilita recuperación manual. Conserva el fin de espera y el vencimiento al recargar. La ventana es de 24 h desde el primer éxito; si se desconoce, el cliente limita conservadoramente desde el primer envío.
- Si falla el registro previo, no envíes y conserva campos/archivo en memoria con el resultado «No se pudo enviar. Vuelve a intentarlo». Si ya hubo éxito remoto, un fallo local posterior no lo convierte en incierto ni habilita otro POST; la etapa siguiente exige su registro previo.
- Los PATCH de entradas/categorías/recetas se recuperan mediante consulta y revisión, sin renovar ETag y reenviar automáticamente. DELETE incierto usa consulta habitual, sin otro flujo de revisión ni repetición automática.
- T12 posee `jest.config.cjs` en esta oleada. No edites consumidores reservados a T17 ni los controles/tests de T11. Los E2E afectados por esta adaptación mínima quedan reservados a T01.

## Tests conceptuales

- Tabla de ETags ausentes, débiles, comodín, sin comillas y malformados por familia; ningún inválido permite la mutación. Distingue los casos débil y ausente de ofertas.
- Respuestas válidas e inválidas de cada familia, incluidos id/url/thumbnailUrl y opcionales de categoría; una referencia no exige entryCount.
- Recorrer 701 categorías en ocho páginas con orden, máximo cuatro consultas simultáneas, señal y error de página comprobados.
- En Jest común, agota timeout/red/5xx, doble invocación, Retry-After válido/inválido, conflictos, respuesta malformada y 24 h con reloj controlado. Recuperar usa los datos originales sin renovar tiempos; avanzar el reloj nunca envía.
- Simula complete, abort, cuota y fallos posteriores de almacenamiento; un put exitoso no equivale a transacción confirmada. Recrea el contexto y comprueba restauración sin envío, aislamiento de formulario y ausencia de continuaciones tardías tras salir.
- Ejecuta typecheck, suites focalizadas incluida entryApi.remediation y E2E existentes afectados sobre el build de esta entrega, con el servidor de 8.1. Las pruebas nativas de F5 de cada flujo se incorporan en T02A–T02D; el doble de IndexedDB no las sustituye.

## Criterios de aceptación

- [ ] A02, A10: las mutaciones condicionales comparten una comprobación fuerte y todos los casos de versión tienen pruebas independientes.
- [ ] A03, A11: ningún cuerpo mal formado se publica como dato válido; las imágenes y categorías cumplen sus comprobaciones y una respuesta de escritura inválida no demuestra ausencia de persistencia.
- [ ] A04: plazos, señales y mecanismo común de recuperación manual están implementados y comprobados; las entregas T02A–T02D aportarán su conexión real a consumidores antes del cierre integral.
- [ ] A05: categorías se acumula sin recursión ni pérdida de orden/cancelación.
- [ ] Los datos/expectativas que esta tarea invalida quedan adaptados aquí, sin depender de T02C/T04 y sin debilitar validadores. Los fallos previos de T00 quedan diferenciados.
- [ ] Entrega evidencia por ID, archivos y pruebas al registro de integración; conserva las firmas actuales y los cambios previos del usuario. Los mocks no acreditan transacciones del backend.
