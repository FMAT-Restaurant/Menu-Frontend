# Orquestación de la implementación de la auditoría

> **Seguimiento vigente (2026-10-23): RC01–RC05 corregidos y verificados**, 491 unitarias y 46 E2E PASS en `WT-f902e272e597`. La [adenda actual](../../audit/corrections-closure-2026-10-23.md) documenta la corrección posterior a RV14–RV16. [T18](../../../.analysis/orchestration/evidence/T18.md) conserva los 104 IDs y distingue las fichas originales de las condiciones reabiertas; [T16](../../../.analysis/orchestration/evidence/T16.md) conserva las capturas/zoom de su base histórica, sin atribuirlos a otra ejecución.

Esta guía organiza los **22 tickets en 12 oleadas**, sus responsables y el orden de integración. Conserva las instrucciones de ejecución originales; el estado actual se refleja en el registro de la sección 9 del plan y en la acreditación vigente de T18.

## 1. Fuentes que debes seguir

1. Lee el [plan de corrección](audit-issues-correction-plan.md): alcance de la sección 1, decisiones de la 3, dependencias/reservas de la 5, matriz de la 7 y verificación/cierre de las 8 y 9.
2. Usa el ticket de cada tarea como instrucción de ejecución. El plan conserva la autoridad sobre alcance, contratos y condiciones de cierre; este documento organiza la asignación e integración.
3. Consulta el [reporte original](../../audit/report-2026-10-19.md) para entender el defecto de cada ID y la [metodología](../../planning-method.png) para mantener la secuencia de clasificación, dependencias y oleadas compatibles. Las líneas del reporte son históricas: conserva los IDs al cambiar ubicaciones.
4. Consulta las instrucciones locales y skills aplicables al trabajo asignado. Usa [dependency-cruiser-impact](../../../.agents/skills/dependency-cruiser-impact/SKILL.md) para contrastar dependencias y consumidores; las guías de TypeScript, React, Jest y Playwright se aplican en los tickets correspondientes.

Si encuentras una discrepancia documental, contrasta la ficha y la matriz del plan y registra la corrección necesaria antes de repartir instrucciones incompatibles. No inventes una decisión funcional que las fuentes no resuelvan: solicita aclaración y continúa con tareas independientes. Las decisiones ya acordadas y los detalles técnicos que el ticket deja al implementador no requieren otra ronda de confirmaciones.

## 2. Responsabilidades del orquestador y de los ejecutores

**Orquestador e integrador:** mantén la base de trabajo, los responsables, las reservas de archivos y los estados de ejecución. Asigna únicamente tareas desbloqueadas, revisa sus entregas, coordina los cambios de contratos y controla las verificaciones compartidas. Conserva la responsabilidad de la coherencia final aunque delegues ejecución o revisión.

**Agente ejecutor:** asume el rol de su fila en la tabla siguiente. Implementa el comportamiento completo y sus pruebas dentro del alcance del ticket; entrega cambios, evidencia y pendientes. Un rol describe su responsabilidad en esa tarea, no obliga a crear un agente distinto para cada fila.

**Agente de verificación integrada:** en T18 contrasta código, resultados y los 104 cierres. Devuelve al responsable original los ajustes necesarios y conserva trazabilidad de las comprobaciones. El orquestador puede asumir T00 y T18 o delegarlas con sus reservas correspondientes.

Designa un único editor activo del registro compartido de la sección 9 del plan. Los ejecutores aportan evidencia por tarea; coordina la actualización de ese registro, especialmente si delegas T00 o T18. No permitas que varios agentes lo editen simultáneamente.

## 3. Tickets y rol responsable por tarea

Los requisitos siguientes deben estar **integrados en la base de trabajo**, además de respetarse las reservas de la sección 5. Sigue las oleadas como recorrido normal; si faltan agentes disponibles, ejecuta sus tareas compatibles por turnos sin dividir artificialmente los tickets.

| Oleada | Ticket | Rol del agente responsable | Requisitos previos |
| --- | --- | --- | --- |
| 0 | [T00 — Preparación](tickets/oleada-00-t00.md) | Preparación, línea base y trazabilidad | Ninguno |
| 1 | [T01 — Frontera HTTP](tickets/oleada-01-t01.md) | Validación HTTP, operaciones y almacenamiento recuperable | T00 |
| 1 | [T03 — Caché](tickets/oleada-01-t03.md) | Caché, identidad de consultas y límites de memoria | T00 |
| 1 | [T11 — Controles de ofertas](tickets/oleada-01-t11.md) | Componentes de ofertas, bloqueo y accesibilidad | T00 |
| 1 | [T12 — Imágenes](tickets/oleada-01-t12.md) | Validación compartida de imágenes y conservación de cobertura | T00 |
| 1 | [T17 — Consumidores](tickets/oleada-01-t17.md) | Tipos de consumidores y dobles acotados | T00 |
| 2 | [T02A — Categorías](tickets/oleada-02-t02a.md) | Flujo completo de creación recuperable y versión de categorías | T01 |
| 2 | [T09 — Funciones pendientes](tickets/oleada-02-t09.md) | Disponibilidad veraz de controles y sus pruebas | T11 |
| 3 | [T02B — Recetas y selector](tickets/oleada-03-t02b.md) | Flujo de recetas, borrador único y restauración del editor padre | T02A, T09 |
| 3 | [T05 — Formulario de categorías](tickets/oleada-03-t05.md) | Estados, errores y recuperación del formulario de categorías | T02A |
| 4 | [T02C — Imagen y entrada](tickets/oleada-04-t02c.md) | Carga de archivos y cadena de creación recuperable de entradas | T02B, T12 |
| 5 | [T02D — Escrituras de ofertas](tickets/oleada-05-t02d.md) | Versiones, idempotencia e identidad de composición de ofertas | T02C |
| 6 | [T04 — Formulario de entradas](tickets/oleada-06-t04.md) | Activación, conflictos y estados del formulario de entradas | T02C, T12 |
| 6 | [T15 — Rutas](tickets/oleada-06-t15.md) | Navegación, carga diferida y aislamiento de pruebas de App | T02D |
| 7 | [T06 — Catálogo](tickets/oleada-07-t06.md) | Consulta, asincronía, paginación y recorrido categoría/entrada/catálogo | T01, T03, T04, T05 |
| 7 | [T10 — Listado de ofertas](tickets/oleada-07-t10.md) | Contexto de listado, mutaciones y recuperación accesible | T02D, T03, T11 |
| 7 | [T13 — Recetas e Inventario](tickets/oleada-07-t13.md) | Disponibilidad de recetas, ingredientes y conexión de Inventario | T02B, T15 |
| 8 | [T07 — Editor de ofertas](tickets/oleada-08-t07.md) | Contexto del editor, recuperación y recorrido de conteos del catálogo | T02D, T03, T04, T06, T09, T10, T11, T12 |
| 8 | [T14 — Formulario de recetas](tickets/oleada-08-t14.md) | Guardado, borrado y estados del formulario de recetas | T13 |
| 9 | [T08 — Composición](tickets/oleada-09-t08.md) | Variantes de tipos, intención de receta y comportamiento de diálogos | T07, T14 |
| 10 | [T16 — Estilos](tickets/oleada-10-t16.md) | Alcance de CSS, adaptación al viewport y evidencia visual | T04, T05, T06, T08, T09, T10, T14, T15 |
| 11 | [T18 — Cierre integrado](tickets/oleada-11-t18.md) | Verificación final, regresiones y acreditación por hallazgo | T16, T17 |

## 4. Preparación antes de delegar implementación

1. Ejecuta o asigna T00. Registra checkout/commit, cambios previos, herramientas, versión/hash del contrato y resultados iniciales de typecheck, lint, unitarias con cobertura, build y todos los E2E existentes. Una comprobación no ejecutada debe conservar su impedimento; la base inicial no tiene que estar verde.
2. Verifica la vigencia de la captura de dependencias mediante su procedencia y hashes. No la des por vigente sólo por fecha o commit. Si ya no corresponde a las entradas actuales, regenera una captura del alcance completo antes de deducir consumidores inversos.
3. Define una base de integración identificable y cómo llegarán las entregas a ella. En un checkout compartido coordina las ediciones directamente; si existen checkouts aislados, registra su base y revisa qué cambios incorporas. Conserva el trabajo previo del usuario en ambos casos.
4. Prepara un registro de tarea, agente, rol, base, requisitos integrados, archivos reservados, estado y evidencia. Puede apoyarse en artefactos auxiliares de `.analysis`; la matriz y el registro final del plan conservan el cierre oficial.
5. Comprueba la capacidad real de concurrencia de la sesión. Reutiliza agentes cuando convenga y deja capacidad para integrar/verificar; no conviertas la cantidad de tareas de una oleada en una obligación de ejecutarlas todas a la vez.

Tras T00, cada asignación debe incluir el enlace al ticket, el rol, la base exacta, sus requisitos integrados, la reserva de archivos y las decisiones compartidas que consume. Entrega al ejecutor las condiciones de sus IDs y los aportes que debe conservar de tareas previas; no le encargues una nueva auditoría completa para descubrir su alcance.

## 5. Ciclo de asignación, entrega e integración

### 5.1 Seleccionar y reservar

1. Escoge una tarea pendiente de la oleada que corresponda. Comprueba sus requisitos en la base integrada; que el agente anterior haya terminado no demuestra que sus cambios estén disponibles.
2. Contrasta el conjunto de archivos que propone editar con las reservas activas y con el orden de archivos compartidos del plan. Incluye tests, fixtures, configuración, imports y consumidores indirectos que necesiten adaptación.
3. Comparte una tarea con otra sólo cuando sus ediciones y contratos sean compatibles. Una importación común no basta para serializar; editar el mismo archivo, incluso en zonas distintas, exige turnos.
4. Si aparece otro consumidor o archivo necesario, el ejecutor debe comunicarlo antes de editarlo. Ajusta reserva, consumidores y orden con evidencia; no permitas ampliar el alcance silenciosamente.

Puedes adelantar una tarea conforme a la sección 5 del plan si tiene sus requisitos integrados y no invade reservas ni contratos pendientes. Conserva los órdenes establecidos por archivos compartidos, como T17 antes de sus consumidores y T09 antes de T02B. Adelantar trabajo no autoriza una migración pública a medias.

### 5.2 Ejecutar y comunicar cambios de contrato

- Asigna un responsable por ticket completo: comportamiento, consumidores y pruebas viajan juntos. Las tareas L pueden ejecutarse en pasos internos, pero su entrega no deja un método migrado con consumidores antiguos.
- T01 prepara las primitivas sin imponer firmas obligatorias a medias. T02A, T02B, T02C y T02D migran sólo sus operaciones, con todos los consumidores reales que existan al comenzar cada entrega.
- Cuando cambie un contrato compartido, el ejecutor comunica operaciones/tipos afectados, consumidores adaptados y evidencia. Los agentes consumidores trabajan sobre esa versión integrada, no sobre una promesa o una firma provisional.
- Si cambian imports, exports o ubicaciones, actualiza el grafo y contrasta consumidores. Sus relaciones son evidencia estática: no demuestran por sí solas el comportamiento de servicios, callbacks, CSS o navegación.
- Aplica las invariantes del ticket y la sección 3 del plan. Mantén resueltas DEC-01/DEC-02; su implementación pertenece a las tareas indicadas, no a nuevas decisiones de producto.

### 5.3 Recibir la entrega

Pide al ejecutor un informe breve con:

- ID del ticket, rol, base usada y referencia verificable a la entrega.
- Archivos reales modificados y cualquier ampliación de la reserva.
- Cambios observables y contratos/consumidores afectados.
- IDs propios propuestos para cierre y evidencia aportada a otros responsables, identificados por separado.
- Comandos y resultados, rutas/nombres de casos, evidencia nativa o visual cuando corresponda y pendientes concretos.

Usa estados que distingan **pendiente**, **en ejecución**, **lista para revisión** e **integrada**. Registra aparte los impedimentos y los hallazgos todavía abiertos. Un mensaje de «terminado» del subagente sólo permite pasar a revisión; no cierra automáticamente el ticket ni sus IDs.

### 5.4 Revisar e integrar

1. Inspecciona el diff contra la base asignada y las condiciones del ticket. Verifica el cambio de comportamiento y que los tests lo detectan, además de sus resultados. Confirma que no se perdió trabajo ajeno ni se ocultó una migración con casts, métodos falsos o compatibilidades provisionales.
2. Integra las entregas por turnos en la base común. Si usan checkout compartido, comprueba el conjunto real de cambios y coordina cualquier corrección antes de liberar sus archivos; evita incorporar cambios de otra tarea sin atribución.
3. Ejecuta los controles pertinentes sobre esa base. Un resultado obtenido antes de integrar no prueba la compatibilidad con las otras entregas.
4. Devuelve fallos al responsable original con el caso/evidencia que los demuestra y conserva o reasigna explícitamente la reserva. Registra como pendiente cualquier condición no acreditada.
5. Actualiza el registro de ejecución, comunica la base integrada y libera archivos/consumidores. Repite el ciclo hasta completar las tareas y la puerta de salida de la oleada.

La integración de una base común no equivale al cierre anticipado de todas sus condiciones consumidoras. Por ejemplo, T02A aporta categoría a A09/A01; T02B completa A09 y adelanta la fuente única de O13; T02D acredita A01 con las tres familias; T08 conserva el cierre integral de O13. Mantén un único dueño por hallazgo y enlaza las aportaciones previas, sin duplicar cierres.

## 6. Reservas que requieren coordinación expresa

| Tramo | Reserva e integración que debes conservar |
| --- | --- |
| Oleada 1 | T01 posee API y ajustes mínimos de datos de E2E; T03, caché; T11, componentes/OfferComponents.test; T12, validadores de imagen y jest.config.cjs; T17, tipos/dobles de consumidores y App.test cuando corresponda. No cruzar esas reservas. |
| Oleadas 2 y 3 | T09 termina OptionModal y sus pruebas antes de T02B. T02B incluye OfferFormPage, su borrador único y la restauración del padre: no lo limites a RecipePage. T05 conserva los archivos de categorías sin compartir esa edición. |
| Oleadas 4 y 5 | T02C migra imagen en entradas y ofertas; T02D migra después las escrituras de ofertas y su composición. Ambas poseen por turnos adaptador/tipos/editor, sin otra vía de imagen antigua. |
| Oleada 6 | T04 posee formulario/API de entradas; T15 posee App/App.test y rutas. Conserva separadas las adaptaciones funcionales y las de navegación. |
| Oleada 7 | T13 reserva App, configuración runtime y adaptador para Inventario. T06/T10 consumen esos contratos sin editarlos. T06 posee catalog-traffic.spec; T10, offers.spec; T13, recipes.spec. |
| Oleada 8 | Sólo T07 reserva aquí adaptador/tipos y editor de ofertas; T14 posee formulario/página de recetas. Mantén la interfaz externa del selector para conservar su compatibilidad. |
| Oleada 9 | T08 tiene turno exclusivo sobre composición, sus tipos/mapeos y pruebas. Conserva el estado único de T02B y la recuperación de T02D, sin volver a implementarlos. |
| Oleada 10 | T16 trabaja sobre la base funcional integrada y toma referencias antes de editar CSS. Reserva hojas, imports/clases y pruebas de presentación; no modifica App ni comportamiento funcional. T17 no añade una dependencia funcional a estilos. |
| Oleada 11 | T18 ejecuta y acredita el cierre en la base final. El registro compartido tiene un único editor y las correcciones se atribuyen a su responsable original. |

Tres archivos/recorridos tienen propiedad específica:

- `e2e/operation-recovery.spec.ts`: T02A lo crea y T02B/T02C/T02D lo amplían por turnos para acreditar las seis operaciones. Las tareas de área reutilizan esa evidencia sin editarlo en paralelo ni copiar su matriz.
- `e2e/catalog-traffic.spec.ts`: T06 entrega el recorrido completo categoría → entrada → catálogo, con T04/T05 integradas.
- `e2e/offer-form.spec.ts`: T07 entrega creación/borrado de oferta → conteos del catálogo, con T06/T10 integradas; T08 lo amplía después para Escape/foco sin duplicar ese recorrido.

Quien extraiga lógica sujeta al 80 % mantiene su cobertura y reserva el cambio mínimo de Jest. Tras el turno inicial de T12, coordina cualquier otra edición de esa configuración; no rebajes umbrales ni retires archivos para pasar.

## 7. Verificación y recursos compartidos de ejecución

Sigue el reparto de la sección 8.1 del plan: T01 agota los estados/errores/tiempos comunes en Jest; las entregas de flujo comprueban transporte y conexión a consumidores; las áreas prueban sus particularidades; Playwright acredita recarga/Blob, interacción nativa y recorridos entre pantallas. No añadas una prueba duplicada por cada mención de una misma condición.

- Ejecuta typecheck por entrega que cambie TS/TSX y las suites afectadas. Cada T02A/T02B/T02C/T02D ejecuta también build y su evidencia nativa antes de integrarse; T02D comprueba además la suite unitaria completa.
- T00 registra todas las comprobaciones iniciales. T18 ejecuta typecheck, lint, unitarias con cobertura, build y E2E completo en la misma base, incluidos casos nuevos. Usa los scripts existentes de package.json y los comandos de 8.1; añade archivos nuevos a las suites focalizadas cuando existan.
- Centraliza build, cobertura y ejecución E2E cuando varios agentes compartan checkout. Reserva `dist`, `coverage`, `playwright-report`, `test-results` y el servidor/puerto para evitar que una ejecución sobrescriba la evidencia de otra. Las unitarias focalizadas pueden concurrir sólo si sus salidas no interfieren.
- El servidor de E2E debe servir el build que se está comprobando. Playwright no configura webServer: prepara preview por separado en el puerto/base URL vigentes, verifica disponibilidad y registra proceso, build, URL y Chromium. No ejecutes otro build sobre ese dist mientras haya recorridos activos.
- Si lanzas un auxiliar en Windows, usa ventana oculta y conserva su identificador. Detén sólo los procesos que hayas iniciado para esa comprobación.
- T16 acredita dimensiones automáticamente y comparación visual/zoom real mediante sus evidencias. Una prueba de texto en jsdom o style.zoom no sustituye la revisión de navegador exigida.

Los resultados deben identificar base y caso/comando. Distingue fallo, resultado aprobado y comprobación no ejecutada. Repite pruebas cuando una integración, cambio o fallo lo justifique, manteniendo el alcance que exige cada ticket; no atribuyas resultados antiguos a una base nueva.

## 8. Incidencias y continuidad

Si una tarea necesita un archivo reservado, detén su edición de ese archivo y coordina el turno; continúa sólo con trabajo independiente que no deje una entrega pública a medias. Si un contrato integrado cambia, revisa a sus consumidores antes de continuar, sin rellenar métodos provisionales para ocultar la incompatibilidad.

Ante un impedimento, registra tarea, comprobación fallida/no ejecutada, evidencia, dependencia afectada y qué desbloquea su continuación. Mantén el resto de tareas independientes en marcha. Una limitación del entorno no es una prueba aprobada ni una razón para marcar la implementación completa.

Al retomar trabajo tras una interrupción, comprueba el registro, el checkout y los cambios/resultados actuales. Identifica agentes y procesos que sigan realmente activos antes de reutilizarlos o sustituirlos. No dupliques una tarea por falta de una respuesta reciente y no confíes sólo en un estado escrito para asumir que continúa ejecutándose. Revalida las reservas y la base antes de reasignar.

## 9. Condición para declarar la implementación terminada

Usa T18 y la sección 9 del plan como puerta de cierre. Debe existir evidencia individual de los **104 hallazgos**, incluidos los ocho altos, con un único responsable y E05 excluido. Las contribuciones entre tareas están enlazadas y ninguna condición pendiente se presenta como aprobada.

El cierre requiere todos los controles finales en la misma base integrada, comparación correcta con T00, los escenarios obligatorios de la sección 8.3, parámetros de 3.5 y evidencias visuales de T16. Los casos nuevos no reciben un resultado inicial inventado y un fallo previo no equivale a un cierre aprobado.

Comprueba las seis operaciones protegidas, la recuperación del formulario activo, solicitud/borrador separados, identidad de composición, límites de reintentos y los PATCH/DELETE que se recuperan por consulta. Conserva las funciones pendientes de copia/Inventario de ofertas dentro del alcance ya decidido.

La evidencia simulada prueba al cliente; registra aparte cualquier comprobación externa disponible sin atribuir a un mock las transacciones o garantías persistentes del backend. Inspecciona el diff final, las migraciones y el grafo actualizado, conservando los cambios previos del usuario. Entrega el resultado final con referencias a la base, el registro de cierres y las comprobaciones ejecutadas.
