# UX00. Preparar base, decisiones y registro

**Estado:** Pendiente de implementación.
**Oleada:** 0 · **Prioridad:** Preparación, sin prioridad de hallazgo · **Complejidad:** M.
**Requisitos previos:** Ninguno.
**Hallazgos propios:** Ninguno; prepara o aporta evidencia a otros responsables.
**Casos de verificación:** V18 de la sección 7.2 del plan.
**Habilita:** [UX01](oleada-01-ux01.md), [UX02](oleada-01-ux02.md)
**Plan fuente:** [Plan de implementación](../ux-ui-implementation-plan.md), ficha UX00, matriz de la sección 4, reservas de la sección 5.1 y verificaciones de las secciones 7 a 9.
**Evidencia de origen:** [Auditoría UX/UI](../audit/ux-ui-audit-2026-10-23.md).
**Reglas comunes:** [Índice de tickets](README.md), [DESIGN.md](../../../DESIGN.md) y [AGENTS.md](../../../../AGENTS.md).

## Instrucciones

1. Registrar commit, cambios locales, versiones instaladas, hashes de las fuentes normativas y disponibilidad de demo, Chromium, Docker, shell y dispositivo. Actualizar las dependencias si cambian imports respecto de esta base. Resolver o asignar D01 a D05 y conservar visibles sus pendientes.

2. Ejecutar la línea base de la sección 7. Guardar resultados y fallos preexistentes sin corregirlos por conveniencia. Preparar `docs/implementation/ux-ui-correction-plan/execution/` y su subcarpeta `evidence/` cuando comience la implementación. Conservar `docs/implementation/ux-ui-correction-plan/audit/` como evidencia histórica.

3. La salida es un registro de ejecución con tareas, reserva activa, base integrada, decisiones y resultado por comando. No se exige que la base inicial esté verde para documentarla. Una falla debe investigarse antes de atribuirla a un ticket nuevo.

## Invariantes

- La preparación conserva los 28 hallazgos y los cambios previos. No implementa correcciones ni cierra hallazgos.
- Las decisiones D01 a D05 tienen responsable, fuente y estado. Una decisión pendiente no bloquea una tarea independiente ni se sustituye por una suposición.
- El grafo anterior es evidencia estática con límites de CSS y JSX. Comprueba sus entradas actuales antes de reutilizarlo.
- Cada test debe comprobar un caso real. Ante un fallo, investiga el código. Informa un defecto o incompatibilidad del test antes de modificarlo y conserva sus garantías funcionales.

## Tests conceptuales

- Contrasta checkout, build, servidor y entorno de cada resultado. No reutilices las dos pruebas demo aprobadas durante la auditoría como evidencia actual.
- Registra typecheck, lint, Jest, build y E2E demo de la sección 7.1 del plan. Incluye test:unit cuando lo exija CI y la suite E2E normal con su build y Compose. Distingue fallo real de comando no ejecutado por un impedimento.
- Comprueba la selección con `npx --no-install playwright test --config playwright.demo.config.ts --list`. La configuración actual solo incluye demo-mode.e2e.ts. Define cómo integrar los archivos de regresión de los tickets sin perder las dos pruebas existentes.
- Comprueba disponibilidad de demo, Chromium, Docker, shell real, dispositivo táctil y lector de pantalla. Identifica quién aportará las comprobaciones que falten.

## Criterios de aceptación

- [ ] Existe una base identificable con commit, cambios previos, versiones y hashes de auditoría, DESIGN.md y metodología.
- [ ] D01 a D05 y las reservas de archivos tienen responsable y estado. La retirada de la barra interna y la política D04 no se reabren como decisiones pendientes.
- [ ] Cada comando de línea base tiene resultado y evidencia, o un impedimento concreto. Los fallos previos quedan diferenciados.
- [ ] Al comenzar la implementación existen `docs/implementation/ux-ui-correction-plan/execution/` y su subcarpeta `evidence/`, con registro de tareas, reservas, base integrada y decisiones. `audit/` permanece como evidencia histórica.
- [ ] Las siguientes tareas pueden recibir su alcance y archivos sin dar por cerrado ningún hallazgo.

## Entrega

Registra base, archivos reales, reservas, comandos y resultados, casos y evidencia por ID según la [entrega común](README.md#entrega-y-cierre). Distingue integración del ticket y cierre de hallazgos. Las instrucciones anteriores describen trabajo futuro y no acreditan una corrección ya ejecutada.
