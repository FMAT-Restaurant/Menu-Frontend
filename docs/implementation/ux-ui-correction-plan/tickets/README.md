# Tickets por oleada de UX y UI

Fecha de desglose: 23 de octubre de 2026. Estado de los 18 tickets: pendiente de implementación.

Esta carpeta distribuye las fichas UX00 a UX17 del [plan de implementación](../ux-ui-implementation-plan.md) en 13 oleadas, de la 0 a la 12. Usa un archivo por ticket, con el formato del [plan de correcciones de código](../../code-issues-correction-plan/tickets/oleada-00-t00.md). Crear estos documentos no implementa ni acredita ninguna corrección.

La [guía de orquestación](../orchestation.md) define cómo desplegar agentes, asignar roles, reservar archivos y revisar e integrar las entregas.

## Fuentes y uso

1. Lee [DESIGN.md](../../../DESIGN.md), las [instrucciones de AGENTS.md](../../../../AGENTS.md) y la [auditoría de 28 hallazgos](../audit/ux-ui-audit-2026-10-23.md).
2. Usa el [plan fuente](../ux-ui-implementation-plan.md) para las decisiones D01 a D05, la matriz de responsabilidades, reservas, verificaciones y condiciones de cierre. Los tickets detallan sus unidades de ejecución sin sustituirlo.
3. Sigue la [metodología de planificación](../../../planning-method.png): reporte original, clasificación por complejidad/dependencias/archivos/prioridad y oleadas de tareas desbloqueadas y compatibles.
4. Antes de ejecutar un ticket, comprueba sus requisitos en la base integrada y reserva sus archivos, tests y estilos. Un mensaje de tarea terminada no demuestra que sus cambios estén disponibles.
5. Aplica las skills pertinentes al trabajo. [ui-ux-pro-max](../../../../.agents/skills/ui-ux-pro-max/SKILL.md) y [unslop](../../../../.agents/skills/unslop/SKILL.md) conservan la dirección de diseño y texto adoptada. Antes de implementar, contrasta dependencias con las skills indicadas en el plan y usa las guías de React, Jest o Playwright cuando corresponda.

Si una fuente cambió o existe una discrepancia, registra el punto y contrasta el comportamiento actual antes de ejecutar instrucciones incompatibles. Los números de línea de tests del plan son referencias históricas; busca también por nombre del caso.

## Distribución de tickets

Los requisitos deben estar integrados. Las condiciones D01 a D05 y los turnos de archivos compartidos se aplican además de los requisitos de esta tabla. Un rol describe una responsabilidad; la distribución permite ejecutar por turnos y no requiere crear agentes.

| Oleada | Ticket | Responsabilidad | Requisitos directos | Hallazgos propios |
| --- | --- | --- | --- | --- |
| 0 | [UX00. Preparar base, decisiones y registro](oleada-00-ux00.md) | Preparación y trazabilidad | Ninguno | Aportes, sin cierre propio |
| 1 | [UX01. Recuperar nombre y precio en tarjetas de oferta](oleada-01-ux01.md) | Imagen comercial | UX00 | U01 |
| 1 | [UX02. Definir y limitar la base visual compartida](oleada-01-ux02.md) | Base visual y alcance de CSS | UX00 | U03, U07, U08, U22 |
| 2 | [UX03. Unificar fondo, foco y scroll de diálogos](oleada-02-ux03.md) | Ciclo de vida modal | UX02 | U26, U28 |
| 3 | [UX04. Retirar marca interna y consolidar cabeceras locales](oleada-03-ux04.md) | Cabeceras y contenido del módulo | UX01, UX03 | U05, U06 |
| 4 | [UX05. Corregir formulario de categorías](oleada-04-ux05.md) | Formulario de categorías | UX04 | Aportes, sin cierre propio |
| 4 | [UX06. Corregir tarjetas y adaptación del catálogo](oleada-04-ux06.md) | Catálogo y tarjetas | UX04 | U11 |
| 4 | [UX07. Corregir estado inexistente y presentación de entradas](oleada-04-ux07.md) | Entradas y errores | UX04 | U14 |
| 5 | [UX08. Corregir biblioteca y formulario de recetas](oleada-05-ux08.md) | Recetas y validación | UX05 | U04, U13 |
| 5 | [UX09. Corregir composición, tarjetas y controles de ofertas](oleada-05-ux09.md) | Ofertas y composición | UX06, UX07 | U02, U09, U10, U19, U21, U23 |
| 6 | [UX10. Convertir la selección de receta en pasos de una tarea](oleada-06-ux10.md) | Asignación de recetas | UX08, UX09 | U16, U27 |
| 7 | [UX11. Proteger cambios al cerrar y navegar](oleada-07-ux11.md) | Borradores y navegación | UX10 | U15 |
| 8 | [UX12. Presentar importes con un contrato explícito](oleada-08-ux12.md) | Presentación de importes | UX11 | U12 |
| 9 | [UX13. Completar acceso al guardado y feedback de regreso](oleada-09-ux13.md) | Guardado y feedback local | UX11 | U17, U18 |
| 10 | [UX14. Reescribir microcopia sin perder decisiones operativas](oleada-10-ux14.md) | Microcopia operativa | UX13 | U20 |
| 10 | [UX15. Restaurar foco y contexto al navegar](oleada-10-ux15.md) | Foco y contexto de rutas | UX13 | U24 |
| 11 | [UX16. Definir cargas locales sobre el layout final](oleada-11-ux16.md) | Estados de carga | UX14, UX15 | U25 |
| 12 | [UX17. Verificar el conjunto y acreditar cierre por hallazgo](oleada-12-ux17.md) | Verificación integrada | UX01 a UX16 | Verifica U01 a U28 |

UX02 es responsable de U03, U07, U08 y U22, pero su integración solo aporta la base. El cierre espera la adopción obligatoria de consumidores de la sección 4 del plan. UX05 aporta categorías a U04, cuyo cierre conjunto corresponde a UX08. UX09 necesita los aportes de catálogo, entradas y recetas para los hallazgos compartidos. UX04 recibe el aporte posterior de UX10 a U06. UX17 comprueba todos los cierres sin asumir un segundo responsable por hallazgo.

La prioridad conserva los 28 hallazgos, con 1 P1, 24 P2 y 3 P3. UX00 prepara la ejecución y UX17 la verifica; no se les inventa una prioridad P0. La complejidad S, M o L es relativa y no promete duración.

## Decisiones y excepciones

| Decisión | Aplicación en tickets | Condición que debe conservarse |
| --- | --- | --- |
| D01. Montaje y shell | UX00 registra contrato; UX02 delimita estilos; UX03 coordina modal/scroll; UX04 retira marca interna; UX15 y UX17 acreditan integración. | Retirar .global-nav ya está decidido. Confirmar DOM compartido o iframe, área bloqueable, scroll, título y anuncios. La demo no prueba el shell real ni justifica otra barra de marca. |
| D02. Moneda | UX00 asigna responsable y UX12 consume la decisión. | Confirmar moneda, localización y presentación de decimales. No deducir MXN del símbolo $, ejemplos o zona horaria. U12 y el cierre total quedan pendientes si falta. |
| D03. Cantidad de grupo | UX00 registra y UX14 aplica el término. | Unificar unidades incluidas/rondas sin confundir cantidad y unidad del insumo ni cambiar valores, validación o payload. |
| D04. Cierre con cambios | UX10 conserva pasos y UX11 aplica la política común. | Intacto cierra directamente; modificado permite continuar o descartar; regresar entre pasos conserva borradores. Envío e incertidumbre siguen la recuperación vigente. |
| D05. Imagen | UX14 unifica ayuda. | Conservar 10 × 1024 × 1024 bytes y tipos admitidos. Expresar ese mismo límite de forma exacta, por ejemplo 10 MiB. |

El recorrido normal coloca UX12 antes de UX13. Si D02 está pendiente, UX13 puede adelantarse con sus requisitos integrados y turno libre. Ambos editan ofertas, por lo que trabajan por turnos. UX13 no decide moneda; UX12 se integra después y repite las comprobaciones de guardado afectadas. La excepción no cierra U12 ni UX17.

Si D03 está pendiente, UX14 puede entregar textos independientes y UX16 puede preparar las cargas. El término de cantidad y U20 permanecen abiertos. Preparar no equivale a integrar una entrega completa ni elimina la condición de cierre.

## Reservas y compatibilidad

Se reserva el archivo completo, incluidos tests, estilos y fixtures. Compartir una importación no obliga a serializar; editar el mismo archivo requiere turnos, incluso en secciones distintas. Si aparece otro archivo necesario, amplía la reserva y vuelve a comprobar compatibilidad antes de editarlo.

| Oleada con varios tickets | Separación prevista |
| --- | --- |
| 1. UX01 y UX02 | UX01 posee OfferCard y estilos de tarjeta de ofertas; UX02, la base compartida y el ámbito de APP. |
| 4. UX05, UX06 y UX07 | Categorías, catálogo y entradas en directorios y tests propios. Una necesidad de editar base o configuración compartida se integra por turnos. |
| 5. UX08 y UX09 | UX08 posee recetas; UX09, ofertas. UX10 coordina después el flujo que cruza ambas áreas. |
| 10. UX14 y UX15 | UX14 posee textos de módulos y formularios; UX15, APP y el coordinador de rutas. Consume marcadores y orígenes ya preparados. Si necesita modificar formularios, se ejecutan por turnos. |

Conserva el orden completo de la sección 5.1 del plan para estilos compartidos, App/App.test, main, OfferFormPage, OfferComponents.test, RecipePage y formularios. No trabajes sobre una copia anterior de esos archivos. Un cambio compartido obliga a repetir las condiciones afectadas de sus consumidores.

playwright.demo.config.ts y e2e/demo-mode.e2e.ts tienen un editor por turno. Los tickets pueden proponer regresiones propias con nombres como e2e/ux-ui-*.demo.spec.ts, pero esos nombres aún no están seleccionados por la configuración actual. El responsable de integración incorpora y comprueba la selección, conservando los casos existentes.

## Verificación común

Los tests conceptuales de cada ticket describen casos reales y la evidencia que debe obtenerse. No se crean tests por cobertura ni se cambian para hacerlos pasar. Primero se investiga el código. Un test defectuoso u obsoleto requiere informar el motivo y conservar las garantías funcionales. La sección 8 del plan ya identifica estos puntos:

- UX09 retira controles pendientes que OfferComponents.test.tsx todavía exige deshabilitados.
- UX10 sustituye varios diálogos por pasos y conserva Escape, borrador y foco de O19/O34.
- UX11 incorpora descarte explícito donde EntryFormPage.test.tsx esperaba pérdida inmediata y puede necesitar un router de datos en el montaje de pruebas.
- UX14 revisa literales técnicos conservando estado inicial inactivo, activación explícita y recuperación.
- Ninguno de esos cambios autoriza debilitar payloads, versiones, idempotencia, bloqueo de envío, imagen o recuperación.

UX00 registra la línea base, cada ticket verifica sus consumidores y UX17 ejecuta los controles completos de la sección 7.1:

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e:demo
npx --no-install playwright test --config playwright.demo.config.ts --list
```

Ejecuta además npm run test:unit cuando lo exija la puerta vigente de CI. La suite E2E normal usa el build de producción y el puerto 4173 según su configuración; la demo usa 5174. Para la suite normal, sigue el flujo vigente del plan:

```powershell
docker compose up --build --wait
npm run test:e2e
docker compose down
```

Registra base, build, servidor, comando y resultado. Un entorno ausente deja una comprobación pendiente, con su motivo. Si inicias un servidor auxiliar, identifica y detén solo el proceso propio.

La demo usa un repositorio en memoria. Interceptar /api/ no controla sus datos; conserva la observación de cero llamadas a /api/ y cero errores de JavaScript. Latencia, errores HTTP y conflictos necesitan dobles o entornos de prueba identificados. No presentes esas simulaciones como integración de servicios.

V01 a V18 conservan el significado de la sección 7.2. Para visibilidad y capas, acompaña DOM con captura, geometría y comportamiento nativo. Mide ancho útil y viewport; un módulo estrecho dentro de un host ancho exige ese montaje. jsdom no acredita ::backdrop o scroll real, y la emulación no demuestra tacto físico, teclado virtual ni lector de pantalla.

## Entrega y cierre

Al iniciar la implementación, UX00 prepara docs/implementation/ux-ui-correction-plan/execution/ y su subcarpeta evidence/, junto a tickets/ y audit/. Esta entrega documental no crea ni rellena evidencia de ejecución.

Cada ticket entrega:

- Base integrada y referencia verificable a los cambios.
- Archivos realmente modificados, reserva inicial y ampliaciones.
- Comportamiento observado y consumidores afectados.
- Hallazgos propios propuestos para cierre y aportes a otros responsables.
- Comandos, resultados, casos V01 a V18 pertinentes, capturas y medidas por ID.
- Decisiones pendientes, impedimentos y comprobaciones aún no acreditadas.

Un responsable actualiza el registro compartido por turnos con ticket, base, reserva, estado, hallazgos/aportes, evidencia y pendientes. Los estados del ticket son pendiente, en ejecución, en revisión e integrada. Cada hallazgo conserva aparte abierto, parcialmente acreditado o cerrado. Integrar un componente base no cierra sus consumidores.

UX17 entrega docs/implementation/ux-ui-correction-plan/execution/closure.md con una fila por U01 a U28, aportes, evidencia y resultado. Solo propone cierre total con todas las condiciones acreditadas. Si falta moneda, shell, dispositivo, lector o prueba requerida, el hallazgo conserva el pendiente y la entrega describe el alcance comprobado.
