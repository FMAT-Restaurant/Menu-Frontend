# T00 — Registrar la base y preparar las entregas

**Estado:** Pendiente de implementación.
**Oleada:** 0 · **Prioridad:** P0 · **Complejidad:** M
**Requisitos previos:** Ninguno.
**Hallazgos propios:** Ninguno; prepara las entregas, sin cerrar hallazgos.
**Plan fuente:** [Plan de corrección](../audit-issues-correction-plan.md), ficha T00 y secciones 2, 3, 5, 8 y 9.

## Instrucciones

1. Inspecciona el estado actual y registra commit, cambios previos, herramientas disponibles y responsables de integración. Conserva el trabajo existente. Usa el plan fuente como autoridad y los tickets como unidades de ejecución.
2. Consulta `docs/audit/report-2026-10-19.md`, `docs/planning-method.png`, la captura OpenAPI v7.0.0 y su procedencia en `.analysis/audit-correction-plan/`. Registra versión/hash contractual; si cambió, identifica las tareas afectadas antes de migrarlas.
3. Consulta `package.json`, `tsconfig.json`, `jest.config.cjs`, `playwright.config.ts`, `src/App.tsx`, `public/runtime-config.js` y la procedencia del grafo de dependencias. Define las reservas de archivos de la oleada siguiente, incluida la propiedad exclusiva de `jest.config.cjs` de T12.
4. Ejecuta la línea base: typecheck, lint, unitarias con cobertura, build y todos los E2E existentes. Sirve ese mismo build con preview en el puerto 4173, salvo configuración comprobada distinta. Registra comando, resultado por suite, versión de Chromium y URL. Distingue un fallo de prueba de una comprobación no ejecutada por impedimento del entorno; no instales paquetes para inspeccionar la base.
5. Deja preparados los datos contractuales de las seis operaciones idempotentes y acuerda con T01 las responsabilidades de operación, almacenamiento y resultado. Distingue ejemplos publicados, casos construidos desde esquema y errores de transporte. Registra DEC-01 como resuelta; la conexión de Inventario de DEC-02 corresponde a T13.
6. Edita únicamente el registro de ejecución del plan y la evidencia auxiliar en `.analysis`. Prepara el registro de tarea, responsable, base, archivos, IDs, comandos/resultados y pendientes que entregarán las tareas posteriores.

## Invariantes

- Se implementarán los 104 hallazgos confirmados; E05 queda excluido. Copiar composición y seleccionar Inventario desde opciones de ofertas siguen pendientes: se corrigen sus controles, sin implementar esas funciones.
- Se conservan las doce oleadas, los responsables y las reservas. Compartir una importación no basta para serializar; compartir archivos de edición o cambiar un contrato consumidor sí requiere coordinación.
- Las decisiones funcionales ya registradas no se reabren. Los parámetros son GET 12 s, escritura JSON 20 s, imagen 120 s, cero reintentos automáticos, caché de 50 consultas con TTL de 30 s y los escenarios visuales de 3.5.
- La preparación no cambia código ni acredita garantías transaccionales del backend. Una línea base fallida no equivale a una aprobación de cierre.

## Tests conceptuales

- Comprueba que cada resultado corresponde al checkout/build registrado y que los E2E no usan un servidor antiguo.
- Verifica que el contrato distingue los cinco POST protegidos del PATCH de ofertas y de las actualizaciones que se recuperan mediante consulta.
- Contrasta los hashes del grafo con sus entradas actuales antes de reutilizarlo; registra sus límites estáticos.

## Criterios de aceptación

- [ ] La base exacta y los cambios que deben preservarse están registrados.
- [ ] Todas las suites existentes tienen resultado inicial o un impedimento concreto; los E2E incluyen build, servidor y entorno identificados.
- [ ] Contrato, acuerdos compartidos, reservas y responsables de integración son trazables, sin bloquear áreas independientes por una decisión ya resuelta.
- [ ] Existe un formato de evidencia utilizable por las siguientes tareas; ningún hallazgo figura cerrado sólo por esta preparación.

## Notas

Si se inicia un servidor auxiliar en Windows, ejecútalo sin ventana visible, registra su identificador y detén únicamente ese proceso. El registro compartido se actualiza mediante el responsable de integración para evitar ediciones simultáneas.
