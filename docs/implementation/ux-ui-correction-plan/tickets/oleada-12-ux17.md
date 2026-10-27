# UX17. Verificar el conjunto y acreditar cierre por hallazgo

**Estado:** Pendiente de implementación.
**Oleada:** 12 · **Prioridad:** Verificación de P1, P2 y P3 · **Complejidad:** L.
**Requisitos previos:** [UX01](oleada-01-ux01.md), [UX02](oleada-01-ux02.md), [UX03](oleada-02-ux03.md), [UX04](oleada-03-ux04.md), [UX05](oleada-04-ux05.md), [UX06](oleada-04-ux06.md), [UX07](oleada-04-ux07.md), [UX08](oleada-05-ux08.md), [UX09](oleada-05-ux09.md), [UX10](oleada-06-ux10.md), [UX11](oleada-07-ux11.md), [UX12](oleada-08-ux12.md), [UX13](oleada-09-ux13.md), [UX14](oleada-10-ux14.md), [UX15](oleada-10-ux15.md), [UX16](oleada-11-ux16.md)
**Condiciones adicionales:** D01, D02 y D03 acreditadas en su alcance de cierre, con D04 y D05 aplicadas; aportes obligatorios de la matriz integrados.
**Hallazgos propios:** Ninguno nuevo; verifica los 28 cierres.
**Casos de verificación:** V01, V02, V03, V04, V05, V06, V07, V08, V09, V10, V11, V12, V13, V14, V15, V16, V17, V18 de la sección 7.2 del plan.
**Habilita:** Cierre del plan, sujeto a evidencia completa.
**Plan fuente:** [Plan de implementación](../ux-ui-implementation-plan.md), ficha UX17, matriz de la sección 4, reservas de la sección 5.1 y verificaciones de las secciones 7 a 9.
**Evidencia de origen:** [Auditoría UX/UI](../audit/ux-ui-audit-2026-10-23.md).
**Reglas comunes:** [Índice de tickets](README.md), [DESIGN.md](../../../DESIGN.md) y [AGENTS.md](../../../../AGENTS.md).

## Instrucciones

1. No introduce otro rediseño. Revisa la base integrada, repite los recorridos y comprueba cada fila U01 a U28 con la sección 7. Un fallo vuelve al responsable de su ficha y mantiene abierto el hallazgo. Los aportes compartidos deben tener evidencia en todos sus consumidores, no solo una captura del componente base.

2. Entregar `docs/implementation/ux-ui-correction-plan/execution/closure.md` con resultado por ID, referencia a la implementación, evidencia, comandos y pendientes. Separar demo, entorno HTTP de pruebas, shell, navegador y dispositivo. Una comprobación ausente conserva el estado pendiente. Un test verde de presencia de texto no acredita visibilidad ni ausencia de capas.

## Invariantes

- Esta tarea verifica el conjunto y no introduce otro rediseño. Un fallo vuelve al responsable del ticket y el hallazgo permanece abierto.
- Una base integrada o un test verde no cierran automáticamente un hallazgo. Cada U01 a U28 necesita su condición observable y aportes.
- Demo, entorno HTTP, shell, navegador, dispositivo y lector acreditan alcances distintos. No se sustituye una comprobación ausente por otra de alcance menor.
- Las capturas de la auditoría muestran defectos. Las referencias visuales nuevas se revisan contra DESIGN.md y no se aceptan por actualización masiva de snapshots.
- Los tests conservan las garantías reales de versiones, concurrencia, idempotencia, imagen, composición y recuperación.
- Cada test debe comprobar un caso real. Ante un fallo, investiga el código. Informa un defecto o incompatibilidad del test antes de modificarlo y conserva sus garantías funcionales.

## Tests conceptuales

- Ejecuta V01 a V18 de la sección 7.2 del plan y registra resultado por caso y por hallazgo. Revisa todos los consumidores de los hallazgos compartidos.
- Registra 320, 390, 600, 740, 768, 1024, 1199, 1200 y 1440 px útiles, los límites 767/768 y 1199/1200, y el módulo estrecho dentro de un host ancho. En diálogos mide también el formulario.
- Prueba poca altura, zoom al 200 %, controles táctiles de tableta, dispositivo con teclado virtual y lector de pantalla. La emulación de viewport no sustituye esas comprobaciones.
- Repite imágenes y geometría, validación, errores/vacíos, borradores, pasos, éxito/recuperación, carga y contexto de rutas. Cuenta fondos y modales; prueba PageUp, PageDown, rueda y tacto.
- Ejecuta typecheck, lint, Jest, build y E2E demo. Incluye test:unit según CI y la suite normal con build y Compose, usando los comandos y entornos de la sección 7.1.
- Verifica selección efectiva de las nuevas pruebas demo y conserva las dos pruebas actuales, cero llamadas /api/ y cero errores de JavaScript.
- Contrasta aislamiento de estilos, título, anuncios, scroll y propiedad de marca en el shell real. Separa evidencia de demo y de pruebas HTTP; no acreditan por sí solas integración de servicios.

## Criterios de aceptación

- [ ] Existe `docs/implementation/ux-ui-correction-plan/execution/closure.md` con las 28 filas U01 a U28, responsable, aportes, referencia a implementación, evidencia, comandos, resultado y pendientes.
- [ ] Cada fila propuesta como cerrada cumple su condición en todos los consumidores y en el entorno pertinente, con pruebas visuales para visibilidad y capas.
- [ ] V01 a V18 y los comandos completos tienen resultado identificable o un pendiente concreto. Los fallos se devuelven al responsable y no se ocultan cambiando tests.
- [ ] D01 a D05 tienen el estado de cierre exigido; shell, dispositivo, lector y moneda no quedan sustituidos por supuestos.
- [ ] Solo se propone cierre total si no queda ninguna condición requerida pendiente. Si falta evidencia, el reporte conserva el alcance acreditado y el hallazgo abierto.
- [ ] La entrega final incluye límites, regresiones y resultados posteriores a la integración, con el trabajo previo del usuario preservado.

## Entrega

Registra base, archivos reales, reservas, comandos y resultados, casos y evidencia por ID según la [entrega común](README.md#entrega-y-cierre). Distingue integración del ticket y cierre de hallazgos. Las instrucciones anteriores describen trabajo futuro y no acreditan una corrección ya ejecutada.
