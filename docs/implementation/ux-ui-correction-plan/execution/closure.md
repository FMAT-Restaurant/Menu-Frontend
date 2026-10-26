# Cierre UX/UI

UX00–UX17 implementados y verificados en el alcance autónomo/demo y HTTP controlado. Base final de código `c5d22caa3cc24dfa11c9a89d1d82905343cb8570`, rama `feature/ux-ui-improvement`. Fecha:26 de octubre de2026. Responsable final: `/root`.

El usuario autorizó implementar, presentar MXN con dos decimales, usar «rondas de selección» y registrar las pruebas físicas y con lector como pendientes. El shell real está fuera de esta implementación. No se acredita backend real, dispositivo físico ni lector de pantalla mediante fixtures o emulación.

## Resultado reproducible

| Puerta | Resultado | Evidencia en execution/evidence/UX17 |
| --- | --- | --- |
| npm test | 49 suites,588/588 | jest-final.log |
| npm run test:unit | 49 suites,588/588; umbrales originales aprobados | coverage-final.log, final-lcov.info |
| Tipos, lint y build | Aprobados | typecheck-final.log, lint-final.log, build-final.log |
| Demo completa Chromium | 82/82,3.0min; workers1, sin retries | demo-final.log, demo-final/ |
| HTTP Chromium contra Compose/Nginx | 87/87,55.9s; workers2, sin retries | compose-e2e-final.log, compose-final/ |
| Imagen y servicio | VCS_REF c5d22ca, healthy, healthz200 | compose-build-final.log, compose-provenance.txt |
| Dependencias | 128 módulos, cero imports sin resolver | dependencies-final.json |

Comandos de navegador: `npx --no-install playwright test --config playwright.demo.config.ts --workers=1 --forbid-only --retries=0` y `npx --no-install playwright test --workers=2 --forbid-only --retries=0`. La segunda ejecución reutilizó el servicio Nginx4173 del proyecto `menu-ux-ui-final-20261026`, construido con `docker compose ... build --build-arg VCS_REF=<commit>` y levantado con `up --detach --wait`. API relativa mediante variables de proceso; no se editó .env. El proyecto propio se retiró al terminar.

Cobertura:89.66% sentencias,82.69% ramas,91.56% funciones,92.49% líneas. No se cambiaron umbrales ni pruebas para obtener cobertura. Tres consultas literales incompatibles con la redacción UX14 se adaptaron tras informar al usuario, conservando las verificaciones de negocio; el negativo queda registrado.

## Hallazgos

La tabla acredita implementación y regresión automatizada en la base final. Las reservas manuales son adicionales; no se presentan como aprobadas.

| ID | Responsable y aportes | Estado final | Implementación y evidencia | Reserva |
| --- | --- | --- | --- | --- |
| U01 | UX01; conservación UX09/UX12; UX17 verifica | Implementado; regresión final aprobada | e785b41; [entrega UX01](evidence/UX01/entrega.md), 10 casos Chromium, 10 PNG/JSON, separación12px y desbordamiento0; suites finales completas y [entrega UX17](evidence/UX17/entrega.md) | Sin reserva adicional en el alcance automatizado |
| U02 | UX09; UX17 verifica | Implementado; regresión final aprobada | 6318581; viewport/módulo/formulario320–1440, grupos y Agregar grupo verticales; revisión oleada5; suites finales completas y [entrega UX17](evidence/UX17/entrega.md) | Sin reserva adicional en el alcance automatizado |
| U03 | UX02; UX03/05/06/07/08/09; UX17 verifica | Implementado; regresión final aprobada | 8c95f64; [base UX02](evidence/UX02/entrega.md), controles compartidos40/48px; suites finales completas y [entrega UX17](evidence/UX17/entrega.md) | M01–M07: dispositivo físico o lector, según recorrido |
| U04 | UX08; UX05/UX07; UX17 verifica | Implementado; regresión final aprobada | Categorías6e09554 y recetas3beabea: errores asociados, resumen y foco, cero escrituras inválidas; entrada conserva resumen; suites finales completas y [entrega UX17](evidence/UX17/entrega.md) | Sin reserva adicional en el alcance automatizado |
| U05 | UX04; UX17 verifica | Implementado; regresión final aprobada | 810f5d9; nueve rutas, 18 capturas y geometría; [revisión](evidence/reviews/oleada-03.md); suites finales completas y [entrega UX17](evidence/UX17/entrega.md) | Sin reserva adicional en el alcance automatizado; shell real excluido |
| U06 | UX04; UX10; UX17 verifica | Implementado; regresión final aprobada | 810f5d9 y81fc2fe; selector con título de tarea y sin banda administrativa duplicada; suites finales completas y [entrega UX17](evidence/UX17/entrega.md) | Sin reserva adicional en el alcance automatizado; shell real excluido |
| U07 | UX02; UX04 a UX09; UX17 verifica | Implementado; regresión final aprobada | 8c95f64 define roles; medidas de áreas conservadas en UX02; suites finales completas y [entrega UX17](evidence/UX17/entrega.md) | Sin reserva adicional en el alcance automatizado |
| U08 | UX02; UX03 a UX09; UX17 verifica | Implementado; regresión final aprobada | 8c95f64 define geometría; suites finales completas y [entrega UX17](evidence/UX17/entrega.md) | Sin reserva adicional en el alcance automatizado |
| U09 | UX09; UX02/06/07/08; UX17 verifica | Implementado; regresión final aprobada | 6318581 separa indicador y acción, punto+texto y elimina franjas; aportes previos y capturas oleada5; suites finales completas y [entrega UX17](evidence/UX17/entrega.md) | Sin reserva adicional en el alcance automatizado |
| U10 | UX09; UX06/UX08/UX03; UX17 verifica | Implementado; regresión final aprobada | Catálogo, recetas y ofertas reducen eliminar; confirmación/restricciones conservadas; retirada de borrador explicada; suites finales completas y [entrega UX17](evidence/UX17/entrega.md) | Sin reserva adicional en el alcance automatizado |
| U11 | UX06; UX17 verifica | Implementado; regresión final aprobada | 487340e; destinos visibles distintos, teclado y retorno; [revisión](evidence/reviews/ux06-wave04.md); suites finales completas y [entrega UX17](evidence/UX17/entrega.md) | Sin reserva adicional en el alcance automatizado |
| U12 | UX12; UX17 verifica | Implementado; regresión final aprobada | 6f40514; MXN/es-MX, dos decimales, tarjeta/editor/revisión y precisión145.125 intacta; revisión oleada8; suites finales completas y [entrega UX17](evidence/UX17/entrega.md) | Sin reserva adicional en el alcance automatizado |
| U13 | UX08; UX10; UX17 verifica | Implementado; regresión final aprobada | 3beabea y81fc2fe; vacío y consulta fallida distintos, término y limpiar con foco; selector final probado; suites finales completas y [entrega UX17](evidence/UX17/entrega.md) | Sin reserva adicional en el alcance automatizado |
| U14 | UX07; UX17 verifica | Implementado; regresión final aprobada | bf7d6cb;404 sin formulario,503 recuperable y categorías independientes; [revisión](evidence/reviews/ux07-wave04.md); suites finales completas y [entrega UX17](evidence/UX17/entrega.md) | Sin reserva adicional en el alcance automatizado |
| U15 | UX11; UX10; UX17 verifica | Implementado; regresión final aprobada | a9408b8; snapshots, salida intacta, seguir/descartar, router de datos, atrás/adelante y beforeunload; operaciones pendientes/inciertas y expiradas protegidas; suites finales completas y [entrega UX17](evidence/UX17/entrega.md) | M01–M07: dispositivo físico o lector, según recorrido |
| U16 | UX10; UX17 verifica | Implementado; regresión final aprobada | 81fc2fe; búsqueda y primer resultado sin cabecera administrativa, query/página conservadas; suites finales completas y [entrega UX17](evidence/UX17/entrega.md) | M01–M07: dispositivo físico o lector, según recorrido |
| U17 | UX13; UX17 verifica | Implementado; regresión final aprobada | 25c996b; pie por altura útil, foco/resumen/último grupo,7demo y V2 HTTP intacto; suites finales completas y [entrega UX17](evidence/UX17/entrega.md) | M01–M07: dispositivo físico o lector, según recorrido |
| U18 | UX13; UX17 verifica | Implementado; regresión final aprobada | 25c996b; recibo local una vez, listado fallido separado, callback/F5 sin otra creación y CAS seguro; suites finales completas y [entrega UX17](evidence/UX17/entrega.md) | M01–M07: dispositivo físico o lector, según recorrido |
| U19 | UX09; UX02/06/07/08; UX17 verifica | Implementado; regresión final aprobada | Matrices por viewport, módulo y formulario en UX06/07/08/09, controles48 en paneles y tabla por contenedor; suites finales completas y [entrega UX17](evidence/UX17/entrega.md) | M01–M07: dispositivo físico o lector, según recorrido |
| U20 | UX14; UX17 verifica | Implementado; regresión final aprobada | 68e1ed0; rondas, insumos,10MiB, incertidumbre distinta de rechazo, referencias en detalles y restricciones conservadas; suites finales completas y [entrega UX17](evidence/UX17/entrega.md) | Sin reserva adicional en el alcance automatizado |
| U21 | UX09; UX17 verifica | Implementado; regresión final aprobada | 6318581 retira capacidades pendientes y conserva opciones de inventario existentes, sin operaciones nuevas; suites finales completas y [entrega UX17](evidence/UX17/entrega.md) | Sin reserva adicional en el alcance automatizado |
| U22 | UX02; UX03/05/06/07/08/09; UX17 verifica | Implementado; regresión final aprobada | SVG nuevo y búsqueda adoptada en 8c95f64; suites finales completas y [entrega UX17](evidence/UX17/entrega.md) | M01–M07: dispositivo físico o lector, según recorrido |
| U23 | UX09; UX17 verifica | Implementado; regresión final aprobada | 6318581; Cambiar imagen visible, selector y preview funcionales, SVG compartido; suites finales completas y [entrega UX17](evidence/UX17/entrega.md) | M01–M07: dispositivo físico o lector, según recorrido |
| U24 | UX15; UX04/06/09; UX17 verifica | Implementado; regresión final aprobada | b5f70a0; origen exacto y ausente, título autónomo, query sin salto, transiciones diferidas y prioridad; revisión oleada10; suites finales completas y [entrega UX17](evidence/UX17/entrega.md) | M01–M07: dispositivo físico o lector, según recorrido; shell real excluido |
| U25 | UX16; UX17 verifica | Implementado; regresión final aprobada | 9165b86;20HTTP, zonas reales390/1024/1440, actualización/error con datos y contexto, categorías e inventario independientes; suites finales completas y [entrega UX17](evidence/UX17/entrega.md) | M01–M07: dispositivo físico o lector, según recorrido |
| U26 | UX03; conservación UX10/UX11; UX17 verifica | Implementado; regresión final aprobada | [Revisión UX03](evidence/reviews/oleada-02.md); 20 demo y 47 normales, fondo único y foco Cancelar; suites finales completas y [entrega UX17](evidence/UX17/entrega.md) | M01–M07: dispositivo físico o lector, según recorrido |
| U27 | UX10; UX17 verifica | Implementado; regresión final aprobada | 81fc2fe; mismo nodo,1modal/fondo,0final, Escape local y foco; rechazo/incertidumbre/F5 y borradores; suites finales completas y [entrega UX17](evidence/UX17/entrega.md) | M01–M07: dispositivo físico o lector, según recorrido |
| U28 | UX03; repetición UX10/UX17; UX17 verifica | Implementado; regresión final aprobada | Scroll visual bloqueado, restaura1626px y estilos; controles48px propios; suites finales completas y [entrega UX17](evidence/UX17/entrega.md) | M01–M07: dispositivo físico o lector, según recorrido; shell real excluido |

## Matriz V01–V18

Todas las suites citadas se incluyeron en las ejecuciones finales anteriores. Sus nombres identifican casos y artefactos verificables; las revisiones de oleada explican la inspección visual y los negativos conservados.

| Caso | Evidencia final y alcance |
| --- | --- |
| V01 | UX01/UX12 demo y HTTP: imágenes, fallback, precios largos y precisión original |
| V02 | UX02/06/07/08/09 demo:320–1440, límites767/768/1199/1200 y módulo estrecho en viewport ancho; emulación |
| V03 | UX02/03 y UX17 foundations: controles40/48, títulos18/26/600, espacios y radios; M01/M03 pendientes |
| V04 | UX04 demo, nueve rutas; UX10 sin banda duplicada y UX15 contexto |
| V05 | UX06/09: tarjeta, estado separado, acción secundaria y restricciones |
| V06 | UX06/UX15: acciones distintas, retorno anidado, consulta y página |
| V07 | UX05/07/08: validación asociada, resumen/foco y ausencia de escritura inválida |
| V08 | UX07 HTTP404/503, UX08 vacío/búsqueda y UX16 carga/error con datos retenidos |
| V09 | UX10/11 y operation-recovery: borrador, navegación, archivos y operación incierta; M01/M03/M05 pendientes |
| V10 | UX10 y regresiones: un modal/fondo, pasos y foco; M02/M05 pendientes |
| V11 | UX13 demo y entry-form-remediation-v2: pie, baja altura, zoom CSS emulado y recibo; M01/M06 pendientes |
| V12 | UX14 HTTP/Jest: rondas,10MiB,409/503/422 y recuperación con clave/versiones conservadas |
| V13 | UX09 y revisión UX17: capacidades pendientes retiradas, inventario existente, imagen visible e iconos SVG; M03 pendiente |
| V14 | UX15 demo/HTTP y React.lazy real: ruta, origen, query, prioridad de foco y título; M04 pendiente, shell excluido |
| V15 | UX16:20 HTTP, seis consumidores390/1024/1440, retención/error y respuestas tardías; M07 pendiente |
| V16 | UX03/confirmaciones: Cancelar inicial, Escape, retorno y bloqueo pendiente; M05 pendiente |
| V17 | UX03/UX10: bloqueo del fondo, scroll interior y posición restaurada; M02 pendiente, shell excluido |
| V18 | Puertas completas sobre c5d22ca y seis fixtures externos UX17; no acredita backend ni shell reales |

## Evidencias y límites

[Entrega UX17](evidence/UX17/entrega.md) detalla las correcciones finales: aislamiento de435 selectores (429 prefijados), adopción tipográfica, espacios e iconos y variantes de carga. Los ocho negativos visuales y sus ocho resultados positivos se conservan. La repetición completa posterior pasó sobre el mismo código.

[Validación manual](manual-validation.md): M01–M07 pendientes por decisión del usuario. Viewports, zoom CSS, tacto emulado y DOM externo controlado no sustituyen dispositivos ni tecnología asistiva reales. El análisis estático tampoco acredita comportamiento por sí solo.

[Historial anterior](closure-history-before-ux17.md) conserva las pausas y resultados por oleada; sus estados provisionales no son el estado actual. El audit original permanece intacto. No se publicó esta rama ni se eliminaron ramas, stash o trabajo anterior.
