# Orquestación de la implementación de UX y UI

Fecha: 23 de octubre de 2026. Estado: guía preparada; implementación pendiente.

Esta guía organiza el despliegue de agentes para los 18 tickets UX00 a UX17, distribuidos en 13 oleadas. Adapta la estructura de la [orquestación del plan de código](../code-issues-correction-plan/orchestration.md) al alcance de UX/UI. Sus resultados históricos no son evidencia de esta ejecución.

Al ejecutar el plan, asume el rol de orquestador e integrador. Despliega agentes para las tareas desbloqueadas, asígnales los roles de la sección 3 y conserva la responsabilidad de revisar e integrar sus entregas. La creación de esta guía no inicia la implementación ni acredita hallazgos.

## 1. Fuentes y alcance

1. Lee [AGENTS.md](../../../AGENTS.md) y [DESIGN.md](../../DESIGN.md). Conserva sus restricciones sobre tests, responsabilidades del shell y diseño.
2. Sigue el [plan de implementación](ux-ui-implementation-plan.md), especialmente las decisiones de la sección 3, matriz de la 4, oleadas y reservas de la 5, verificaciones de la 7 y entrega de la 9.
3. Usa cada [ticket](tickets/README.md) como unidad de ejecución. El plan conserva la autoridad sobre alcance, dependencias y cierre; esta guía organiza agentes, recursos e integración.
4. Consulta la [auditoría](audit/ux-ui-audit-2026-10-23.md) y sus capturas para entender U01 a U28. Sigue la [metodología](../../planning-method.png): reporte, clasificación y oleadas de tareas compatibles.
5. Aplica las skills según la tarea. [ui-ux-pro-max](../../../.agents/skills/ui-ux-pro-max/SKILL.md) guía la revisión visual y de interacción; [unslop](../../../.agents/skills/unslop/SKILL.md) revisa la redacción. Usa [dependency-cruiser-impact](../../../.agents/skills/dependency-cruiser-impact/SKILL.md) y [pre-change-dependency-analysis](../../../.agents/skills/pre-change-dependency-analysis/SKILL.md) cuando corresponda antes de cambiar dependencias. Las guías de [React](../../../.agents/skills/vercel-react-best-practices/SKILL.md), [Jest](../../../.agents/skills/javascript-typescript-jest/SKILL.md) y [Playwright](../../../.agents/skills/playwright-best-practices/SKILL.md) se aplican a su implementación y pruebas.

Si las fuentes discrepan o cambiaron, identifica la condición afectada y contrasta el estado actual antes de asignar instrucciones incompatibles. No inventes moneda, términos de dominio ni un contrato del anfitrión. Solicita la decisión que falte y continúa con trabajo independiente. Las decisiones ya adoptadas y los detalles técnicos dentro del alcance no requieren otra confirmación.

El alcance conserva reglas de publicación, estados, identidades, paginación, versiones, idempotencia y recuperación. No implementa copiar composición ni elegir inventario desde opciones de oferta. El precio sigue perteneciendo a la oferta. La corrección visual no autoriza nuevas reglas de negocio ni reenvíos automáticos.

## 2. Responsabilidades y despliegue de agentes

El orquestador mantiene la base integrada, el registro, las decisiones, reservas y recursos compartidos. Selecciona las tareas disponibles, crea o reutiliza agentes, les entrega el contexto y comprueba sus resultados. Integra por turnos y decide cuándo liberar archivos y habilitar dependientes. Puede asumir UX00, revisiones o UX17 sin dejar esas obligaciones sin responsable.

Cada agente ejecutor asume el rol de su fila y un ticket completo: comportamiento, consumidores, pruebas y evidencia. No recibe un encargo genérico de rediseñar el módulo. Conserva lo integrado por otros tickets, comunica ampliaciones de alcance antes de editar y devuelve una entrega identificable. No modifica el registro compartido si no es su editor designado.

El agente revisor comprueba la entrega contra el ticket y DESIGN.md. Para defectos visuales inspecciona capturas, medidas e interacción, además del diff y resultados de tests. Su revisión es de lectura; las correcciones vuelven al ejecutor o se reasignan con una reserva explícita. Una revisión favorable no sustituye la comprobación sobre la base integrada.

El responsable de UX17 verifica los 28 hallazgos y los casos V01 a V18. Contrasta evidencia de todos los consumidores y entornos requeridos. Puede ser un agente de verificación o el propio orquestador. No introduce otro rediseño ni cierra una condición que falta comprobar.

Para desplegar agentes:

1. Comprueba la capacidad real de concurrencia, incluidos el orquestador y los agentes aún activos. Mantén capacidad para coordinar e integrar; no crees 18 agentes a la vez ni fijes la cantidad a partir del número de tickets.
2. Usa las herramientas de subagentes disponibles para crear un ejecutor por ticket activo. Asígnale un nombre reconocible, por ejemplo `ux01-imagen-ofertas`, su rol, ticket, base y archivos. Reutiliza un agente disponible cuando cambie de tarea, actualizando su contexto y reserva.
3. Permite concurrencia solo para entregas compatibles de la sección 5. Si no hay capacidad, ejecútalas por turnos. Un rol no exige un agente permanente ni un modelo distinto; conserva la configuración de la sesión salvo instrucción aplicable.
4. Coordina cualquier subdelegación con la misma capacidad y reservas. No permitas que dos agentes implementen el mismo ticket ni que un revisor empiece a corregir archivos todavía reservados al ejecutor.
5. Mantén una relación entre agente, ticket y proceso activo. Un mensaje de finalización inicia revisión; no demuestra integración ni cierre de hallazgos.

## 3. Tickets y roles de ejecución

Los requisitos siguientes deben estar integrados, además de cumplir las decisiones y reservas. Los tickets contienen las instrucciones, tests conceptuales y criterios de aceptación completos.

| Oleada | Ticket | Rol del agente responsable | Requisitos directos y condiciones |
| --- | --- | --- | --- |
| 0 | [UX00. Preparación](tickets/oleada-00-ux00.md) | Base, decisiones, herramientas y trazabilidad | Ninguno. |
| 1 | [UX01. Imagen de ofertas](tickets/oleada-01-ux01.md) | Contención de imagen y visibilidad comercial | UX00. |
| 1 | [UX02. Base visual](tickets/oleada-01-ux02.md) | Tokens, controles, iconos y alcance de CSS | UX00. |
| 2 | [UX03. Diálogos](tickets/oleada-02-ux03.md) | Fondo único, foco, scroll y limpieza modal | UX02; contrato D01 para cierre integrado. |
| 3 | [UX04. Cabeceras](tickets/oleada-03-ux04.md) | Retirada de marca interna y estructura local | UX01 y UX03. |
| 4 | [UX05. Categorías](tickets/oleada-04-ux05.md) | Validación y presentación del formulario | UX04. |
| 4 | [UX06. Catálogo](tickets/oleada-04-ux06.md) | Tarjetas, acciones y adaptación al ancho útil | UX04. |
| 4 | [UX07. Entradas](tickets/oleada-04-ux07.md) | Estado inexistente, errores y formulario | UX04. |
| 5 | [UX08. Recetas](tickets/oleada-05-ux08.md) | Biblioteca, vacíos, validación e insumos | UX05. |
| 5 | [UX09. Ofertas y composición](tickets/oleada-05-ux09.md) | Grupos, tarjetas, estados y acciones | UX06 y UX07. |
| 6 | [UX10. Selección de receta](tickets/oleada-06-ux10.md) | Pasos de opción, selección y creación en un modal | UX08 y UX09. |
| 7 | [UX11. Protección de cambios](tickets/oleada-07-ux11.md) | Borradores, descarte y navegación | UX10. |
| 8 | [UX12. Importes](tickets/oleada-08-ux12.md) | Formato monetario y presentación financiera | UX11 y D02 resuelta. |
| 9 | [UX13. Guardado](tickets/oleada-09-ux13.md) | Acceso a guardar y feedback local en destino | UX11; turno libre de UX12 según sección 4. |
| 10 | [UX14. Microcopia](tickets/oleada-10-ux14.md) | Texto operativo, términos y ayudas | UX13, D03 y D05. |
| 10 | [UX15. Contexto de rutas](tickets/oleada-10-ux15.md) | Foco, retorno, título y anuncios | UX13 y D01 para cierre integrado. |
| 11 | [UX16. Cargas](tickets/oleada-11-ux16.md) | Esqueletos locales y conservación de contenido | UX14 y UX15. |
| 12 | [UX17. Verificación integrada](tickets/oleada-12-ux17.md) | Evidencia final, regresiones y cierre por hallazgo | UX01 a UX16, aportes de la matriz y decisiones requeridas. |

Mantén un único responsable por hallazgo según la sección 4 del plan. UX02 espera adopción de consumidores para U03, U07, U08 y U22. UX05 aporta categorías a U04, cuyo cierre corresponde a UX08. UX09 reúne aportes de catálogo, entradas y recetas para estados, acciones y responsive. UX04 necesita UX10 para la parte del selector de U06. UX03 necesita la repetición del flujo final y la integración D01 para acreditar todas las condiciones de U28.

## 4. Preparación y decisiones

Ejecuta o asigna UX00 antes de despachar implementación. Registra commit y cambios locales previos, herramientas, versiones y hashes de las fuentes normativas. Contrasta las dependencias actuales; el índice anterior no acredita por sí solo CSS, JSX, callbacks o comportamiento. Si sus entradas cambiaron, actualiza el análisis pertinente antes de deducir impacto.

Define una base común identificable. En checkout compartido, todos ven las mismas ediciones y deben respetar reservas de archivos y ejecuciones. Si se usan checkouts aislados, identifica base y cambios locales necesarios, integra las entregas por turnos y verifica que el siguiente ejecutor recibe los requisitos realmente integrados. No restablezcas archivos ni atribuyas cambios previos al ticket nuevo.

UX00 prepara `execution/` y `execution/evidence/` junto a esta guía cuando comience la implementación. Designa un único editor del registro compartido y anota ticket, agente, rol, base, requisitos integrados, reserva, estado, hallazgos/aportes, evidencia y pendientes. Conserva `audit/` como historial; no reemplaces sus capturas por la solución.

Registra línea base de tipos, lint, unitarias, build y E2E según la sección 7. Una comprobación no ejecutada conserva su impedimento y un fallo previo no se atribuye a una entrega nueva sin investigarlo.

| Decisión | Instrucción para el orquestador |
| --- | --- |
| D01. Shell y montaje | Retirar `.global-nav` está decidido. Asigna responsable para DOM compartido o iframe, área bloqueable, scroll, título y anuncios. UX02 y UX03 documentan el montaje autónomo; UX15 y UX17 requieren evidencia del shell real para el cierre correspondiente. No bloquees U01 por esa incertidumbre. |
| D02. Moneda | Obtén moneda, localización y presentación de decimales del responsable de producto/contrato antes de cerrar UX12 y U12. No deduzcas MXN del símbolo `$`, ejemplos o zona horaria. |
| D03. Cantidad de grupo | Confirma el término de `CompositionSlot.quantity`, sin confundirlo con cantidad y unidad de un insumo. UX14 conserva valores, validación y payload. |
| D04. Cierre con cambios | Aplica la dirección adoptada: intacto cierra; modificado permite continuar o descartar; los pasos conservan borradores. Envío pendiente e incertidumbre mantienen su recuperación. No reabras esta política como decisión sin resolver. |
| D05. Imagen | Conserva tipos y `MAX_IMAGE_BYTES` de 10 × 1024 × 1024 bytes. UX14 unifica una ayuda exacta, por ejemplo `10 MiB`, sin cambiar el límite. |

Si D02 sigue pendiente, UX13 puede adelantarse a UX12 con sus requisitos integrados. Comparten ofertas, por lo que trabajan por turnos. UX13 no decide moneda. Cuando UX12 se integre, repite las comprobaciones de guardado afectadas. U12 y el cierre total siguen pendientes hasta acreditar D02.

Si D03 sigue pendiente, UX14 puede entregar textos independientes y UX16 puede preparar cargas. El vocabulario de cantidad y U20 siguen abiertos. Registra la parte realizada sin presentar esa preparación como integración completa ni eliminar los requisitos de UX17.

## 5. Compatibilidad y reservas

Se reserva el archivo completo con sus tests, estilos y fixtures. Una importación común no obliga a serializar; editar el mismo archivo exige turnos, aunque se propongan secciones distintas. Si aparece otro consumidor o archivo, el ejecutor comunica la necesidad y el orquestador amplía la reserva antes de su edición.

| Oleada con concurrencia posible | Reparto que debe conservarse |
| --- | --- |
| 1. UX01 y UX02 | UX01 posee OfferCard y estilos de tarjeta de ofertas. UX02 posee base compartida y ámbito de APP. No traslades cambios de ofertas a UX02 para trabajar sobre el mismo archivo. |
| 4. UX05, UX06 y UX07 | Categorías, catálogo y entradas en directorios y pruebas propios. La base y configuración E2E se coordinan por turnos. |
| 5. UX08 y UX09 | UX08 posee recetas; UX09, ofertas. El cambio de flujo entre ambas áreas pertenece a UX10, después de integrarlas. Los hallazgos conjuntos esperan los aportes de las dos entregas. |
| 10. UX14 y UX15 | UX14 edita textos de módulos y formularios. UX15 edita App, main y el coordinador nuevo, consumiendo marcadores de UX04 e identidades de UX06 y UX09. Si necesita editar formularios, ambas tareas pasan a turnos. |

El resto de oleadas no ofrece varios tickets independientes en el recorrido normal. Reutiliza ejecutores o asigna revisión cuando corresponda; no dividas un ticket entre agentes que editen los mismos archivos para ocupar capacidad.

Conserva estas reservas de la sección 5.1 del plan:

| Archivos o recorrido | Orden y responsabilidad |
| --- | --- |
| `src/styles.css`, `src/shared/primitives.css`, `src/shared/SearchField.tsx` | UX02 define base; UX03 añade modal; UX04 consolida cabeceras; UX16 añade cargas. Las áreas consumen esa versión sin redefinirla en paralelo. |
| `src/App.tsx`, `src/App.test.tsx` | UX02 delimita módulo; UX04 retira marca de ruta inexistente; UX11 adapta router; UX15 coordina rutas; UX16 ajusta fallback. |
| `src/main.tsx` | UX02 solo si lo requiere el ámbito; UX15 coordina título/demo. Preservar cambios previos. |
| `src/features/offers/OfferFormPage.tsx` | UX03, UX04, UX09, UX10, UX11, UX12, UX13, UX14 y UX16. Solo la excepción D02 altera el turno UX12/UX13. |
| `src/features/offers/OfferCard.tsx` y estilos de ofertas | UX01 corrige imagen; UX03 y UX04 preparan; UX09 rediseña; UX10 ajusta pasos; UX12 presenta importes; UX13 ajusta acciones; UX16 añade carga. UX09 y UX12 repiten la condición U01. |
| RecipePage, RecipeFormDialog y estilos de recetas | UX03, UX04 donde corresponda, UX08, UX10, UX11, UX14 y UX16. Extraer contenido no duplica recuperación. |
| CategoryFormDialog y estilos de categorías | UX03, UX04 donde corresponda, UX05, UX11, UX14 y UX16. |
| CatalogPage, EntryFormPage y sus estilos | UX03 y UX04 preparan; UX06 y UX07 trabajan en áreas separadas; UX11, UX13, UX14 y UX16 entran después por turnos. |
| `src/features/offers/OfferComponents.test.tsx` | UX03, UX09, UX10, UX11, UX12 y UX14 según casos afectados. Un solo editor activo. |
| `playwright.demo.config.ts`, configuración E2E y `e2e/demo-mode.e2e.ts` | El integrador coordina cualquier edición compartida por turnos y comprueba que las nuevas regresiones se descubren sin perder los casos actuales. |

Los archivos nuevos propuestos por las fichas son destinos de implementación. No supongas que TaskDialog, RecipeSelector, RouteContext u otros ya existen. Verifica el directorio actual y coordina imports y consumidores de las extracciones reales.

## 6. Ciclo de asignación, revisión e integración

### 6.1 Seleccionar y despachar

1. Selecciona el siguiente ticket pendiente de la oleada. Comprueba requisitos integrados, decisiones y aportes que debe conservar.
2. Contrasta su reserva con todos los agentes y recursos activos. Registra propietario antes de permitir la edición.
3. Crea o reutiliza el agente ejecutor y envíale la asignación completa de la sección 8. Dale ticket, rol, base, hallazgos propios, aportes, archivos, restricciones y evidencia esperada.
4. Registra el identificador del agente y cambia el ticket a en ejecución. Informa al resto de los contratos compartidos disponibles y reservas activas.

Asigna un responsable por ticket completo. Las tareas grandes pueden tener pasos internos, pero no se integran cambios de interfaz con consumidores incompatibles. Cuando cambie un contrato compartido, el ejecutor identifica consumidores adaptados, pruebas y base que deben usar los siguientes agentes.

### 6.2 Recibir y revisar

El ejecutor entrega el formato de la sección 8 y pasa a en revisión. El orquestador inspecciona el diff, archivos, base y evidencia, o asigna un revisor de lectura. Comprueba el efecto que el test detecta, además de su resultado. Para visibilidad, tamaños, overlays y responsive exige navegador, capturas y medidas pertinentes.

Contrasta los criterios del ticket y los aportes obligatorios. Un componente base integrado no acredita su adopción; un mensaje de terminado no cierra U01 a U28. Devuelve los defectos al responsable con el caso o captura que los demuestra y conserva su reserva mientras los corrige.

### 6.3 Integrar y liberar

Integra una entrega por turno. En checkout compartido revisa qué ediciones pertenecen a cada tarea; en checkout aislado revisa lo incorporado y su base. Conserva los cambios previos y resuelve incompatibilidades en código, sin reducir la condición del ticket.

Ejecuta las verificaciones afectadas sobre la base integrada. Un resultado anterior a la integración no demuestra compatibilidad con otra entrega. Si pasa la revisión, registra la referencia, libera archivos y comunica la base disponible a dependientes. Si una integración cambia un componente compartido, repite las condiciones de sus consumidores afectados.

Usa estados de ticket pendiente, en ejecución, en revisión e integrada. Registra impedimentos aparte. Cada hallazgo conserva abierto, parcialmente acreditado o cerrado, independientemente del estado del ticket. Mantén un solo editor del registro común y un responsable de cierre por ID.

## 7. Verificación y recursos compartidos

UX00 registra la línea base. Cada ejecutor corre tipos y suites de sus consumidores según el cambio; UX17 ejecuta los controles completos de la sección 7.1 del plan sobre la misma base integrada:

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e:demo
npx --no-install playwright test --config playwright.demo.config.ts --list
```

Incluye `npm run test:unit` cuando lo exija la puerta vigente de CI, conservando sus umbrales. Para la suite normal sigue el flujo de build y Compose del plan:

```powershell
docker compose up --build --wait
npm run test:e2e
docker compose down
```

Al coordinar ejecuciones:

- Reserva `dist`, `coverage`, `playwright-report`, `test-results`, servidor y puerto. Centraliza build, cobertura y E2E cuando compartan checkout. Las pruebas focalizadas pueden coincidir si sus salidas y datos no interfieren. No reconstruyas dist durante un recorrido que usa ese build.
- La configuración normal actual gestiona `npm run preview` mediante webServer en 4173; la demo gestiona `npm run dev:mock` en 5174. Verifica configuración vigente, build, proceso y URL. No levantes otro servidor sobre el mismo puerto ni aceptes uno reutilizado sin comprobar su base.
- La selección demo actual solo incluye `e2e/demo-mode.e2e.ts`. Al integrar nuevas regresiones, actualiza la selección de forma explícita y compruébala con `--list`. Conserva las dos pruebas demo existentes, cero llamadas a `/api/` y cero errores de JavaScript.
- La demo usa repositorio en memoria. Interceptar `/api/` no controla sus datos. Los casos HTTP, demora y conflictos usan dobles o entornos identificados; su evidencia no acredita integración de servicios.
- Reserva también la sesión de navegador, pestaña o contexto de prueba y sus datos. No permitas que otro agente cambie viewport, ruta o borrador durante una medición. Separa contextos y salidas cuando sea viable o asigna turnos.
- Si lanzas un auxiliar en Windows, usa ventana oculta, registra su identificador y detén solo el proceso propio. Conserva evidencias antes de que otra ejecución sobrescriba sus salidas.

La verificación visual conserva V01 a V18. Mide ancho útil y viewport, incluidos 320, 390, 600, 740, 768, 1024, 1199, 1200 y 1440 px, límites 767/768 y 1199/1200 y módulo estrecho dentro de un host ancho. Los diálogos requieren además medir su formulario. Revisa controles estándar de 40 px y táctiles de 48 px, metadatos de al menos 12/16, radios 4/8/12 y espacio de base 4.

Prueba poca altura y zoom al 200 %, y asigna responsable para dispositivo táctil con teclado virtual y lector de pantalla. La emulación de viewport no acredita esas comprobaciones. jsdom no demuestra capa superior nativa, fondo o scroll real. Cuenta modales y fondos, prueba Escape y retorno de foco, PageUp, PageDown, rueda y tacto según cada caso.

Las capturas originales prueban defectos. Revisa las referencias nuevas contra DESIGN.md; no aceptes actualizaciones masivas de snapshots como aprobación. Registra base, comando/caso, entorno, resultado y evidencia. No atribuyas resultados históricos a una entrega nueva ni una cifra de CLS a una auditoría que no la midió.

AGENTS.md prohíbe tests artificiales por cobertura y cambios para hacerlos pasar. Ante un fallo, investiga el código. Si el test tiene un defecto o queda incompatible con un requisito nuevo, informa el caso y su motivo antes de revisarlo. Conserva sus garantías funcionales y las de payload, versiones, idempotencia, bloqueo de envío, imágenes y recuperación. La sección 8 del plan identifica las incompatibilidades previstas de UX09, UX10, UX11 y UX14; no autoriza ajustes de conveniencia.

## 8. Plantillas de asignación y entrega

Completa esta asignación antes de enviarla al ejecutor. Los marcadores son datos que debe proporcionar el orquestador, no decisiones que el agente deba inventar.

```text
Ticket y enlace: <UXnn, ruta del ticket>
Rol: <rol de la sección 3>
Base: <checkout, commit y cambios integrados relevantes>
Requisitos disponibles: <tickets y referencias verificadas>
Decisiones: <D01 a D05 aplicables, fuente, estado y alcance pendiente>
Hallazgos propios y aportes: <IDs según matriz y condiciones heredadas>
Reserva: <archivos completos, tests, estilos y nuevos destinos>
Recursos: <servidor, puerto, contexto de navegador y salidas asignadas>
Verificación: <criterios del ticket, casos Vnn, comandos y entorno>
Entrega: <ruta de evidencia individual y destinatario de revisión>

Implementa el ticket completo sobre esta base y sigue DESIGN.md y AGENTS.md.
Conserva borradores, identidades, versiones y recuperación existentes.
Consulta las skills aplicables antes de la tarea que regulan.
Comunica cualquier archivo o contrato adicional antes de editarlo.
No edites archivos reservados a otros agentes ni el registro común.
No implementes capacidades pendientes ni cambies tests para hacerlos pasar.
Devuelve cambios y evidencia verificable, con lo que siga pendiente.
No declares integración ni cierre total por tu propio mensaje de entrega.
```

Usa este formato al recibir la entrega:

```text
Ticket, agente y rol:
Base inicial y referencia a los cambios:
Archivos modificados y ampliaciones de reserva:
Comportamiento observado y consumidores comprobados:
Hallazgos propios propuestos para cierre:
Aportes a otros responsables:
Casos Vnn y comandos, con resultado y entorno:
Capturas, medidas y demás evidencia:
Tests incompatibles o defectuosos, motivo y garantías conservadas:
Decisiones, impedimentos y comprobaciones pendientes:
Estado solicitado: en revisión.
```

UX00 define las rutas de evidencia individual dentro de `execution/evidence/`, identificadas por ticket. Solo el editor designado actualiza el registro común. El orquestador añade resultado de revisión, comprobaciones posteriores y referencia de integración antes de liberar la reserva.

## 9. Incidencias y continuidad

Si una tarea necesita un archivo ocupado, detén la edición de ese archivo y coordina el turno. El ejecutor puede continuar con trabajo independiente que no altere contratos pendientes. Si aparece una dependencia nueva, registra su evidencia, revisa consumidores y ajusta la asignación antes de continuar.

Ante un impedimento, registra ticket, agente, condición, evidencia, qué falta y quién puede resolverlo. Mantén disponibles las tareas independientes y las excepciones D02/D03. Una limitación de entorno queda como comprobación no ejecutada y no equivale a aprobación.

Al retomar tras una interrupción, inspecciona checkout, registro, agentes y procesos realmente activos. Revalida reservas y base. No dupliques una tarea por ausencia de un mensaje reciente ni asumas que sigue ejecutándose solo por un estado escrito. Si reasignas, transfiere contexto, cambios y evidencia antes de liberar o reemplazar al responsable.

Si se necesita revertir una entrega, limita la reversión a sus cambios y conserva el trabajo previo. No restablezcas el checkout completo ni elimines evidencia de otros tickets. Repite las comprobaciones afectadas cuando cambie la base.

## 10. Condición de cierre

UX17 entrega `execution/closure.md` con una fila por U01 a U28: responsable, aportes, referencia de implementación, evidencia, comandos, entorno, resultado y pendientes. Usa la sección 9 del plan y sus casos V01 a V18 como condición de cierre. Los tickets de preparación y base no cierran automáticamente las condiciones de sus consumidores.

El cierre total requiere los 28 hallazgos acreditados, incluidos el P1, los 24 P2 y los 3 P3, con decisiones necesarias resueltas y controles finales sobre la misma base integrada. La evidencia de shell, moneda, dispositivo, lector y pruebas contractuales que correspondan debe existir en su propio alcance. Si falta una condición, conserva el hallazgo abierto y describe lo acreditado.

Comprueba que U01 sigue corregido tras UX09 y UX12; que UX10 mantiene un solo diálogo/fondo; que UX11 no reintroduce capas ni pérdida de borradores; que el scroll y contexto cumplen D01; y que guardado, recuperación, responsive y carga conservan sus pruebas. Los defectos vuelven al responsable original para corregir código, sin aprobarlos mediante cambios de tests.

Inspecciona diff final, trabajo previo preservado y reservas/procesos liberados. Entrega referencias al registro de cierre, base, pruebas y evidencia visual, diferenciando demo, HTTP de pruebas, navegador, shell y dispositivo. Un informe parcial conserva sus pendientes y no se presenta como implementación terminada.
