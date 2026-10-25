# Verificación de cierre UX/UI

Estado provisional. La implementación completa todavía no está acreditada. Este documento distingue la integración de tickets del resultado por hallazgo; UX17 completará la comprobación final sobre una misma base.
Estado actual: UX12 integrado en6f40514, con135 focalizadas,19 demo,7 HTTP nuevos y55 regresiones anteriores aprobadas. UX13 a UX17 pendientes. Las referencias posteriores son históricas.
Estado actual: UX11 integrado en a9408b8,535 Jest,47 demo,55 HTTP y tipos/build/lint aprobados. UX12 a UX17 pendientes. Las líneas históricas siguientes no sustituyen este estado.
Estado actual: UX10 integrado en81fc2fe con42 demo,55 HTTP y121 focalizadas aprobadas. UX11 a UX17 siguen pendientes; las referencias posteriores a checkpoints son históricas.
Reanudación actual: UX08 y UX09 integradas en3beabea y6318581. Los párrafos de parada siguientes son históricos. Pasan38 demo y52 HTTP sobre preview. UX10 a UX17 siguen pendientes.
Trabajo detenido por solicitud del usuario después de integrar UX04 en810f5d9. La referencia y condiciones de reanudación están en [checkpoint.md](checkpoint.md).
Tras la reanudación se integró también la oleada4 hasta bf7d6cb. El usuario volvió a solicitar checkpoint y parada. UX00 a UX07 están integradas; UX08 a UX17 siguen sin iniciar.

Alcance vigente: implementar UX00 a UX17, autorizado expresamente por el usuario. Shell real excluido de la implementación actual. Presentación MXN con dos decimales y cantidad de grupo como rondas de selección, según respuestas del usuario.

## Hallazgos

| ID | Responsable y aportes | Estado | Implementación y evidencia | Comprobación pendiente |
| --- | --- | --- | --- | --- |
| U01 | UX01; conservación UX09/UX12 | Acreditado en oleada 1 | e785b41; [entrega UX01](evidence/UX01/entrega.md), 10 casos Chromium, 10 PNG/JSON, separación12px y desbordamiento0 | Repetir tras UX09/UX12 y en base final |
| U02 | UX09 | Acreditado en demo | 6318581; viewport/módulo/formulario320–1440, grupos y Agregar grupo verticales; revisión oleada5 | Conservar tras UX10/UX17 |
| U03 | UX02; UX03/05/06/07/08/09 | Parcialmente acreditado | 8c95f64; [base UX02](evidence/UX02/entrega.md), controles compartidos40/48px | Adopción de todos los consumidores y verificación final |
| U04 | UX08; UX05/UX07 | Acreditado en alcance probado | Categorías6e09554 y recetas3beabea: errores asociados, resumen y foco, cero escrituras inválidas; entrada conserva resumen | Repetir recetas en pasos UX10 y base final |
| U05 | UX04 | Acreditado en autónomo | 810f5d9; nueve rutas, 18 capturas y geometría; [revisión](evidence/reviews/oleada-03.md) | Conservar en base final; shell real excluido |
| U06 | UX04; UX10 | Acreditado en autónomo/demo | 810f5d9 y81fc2fe; selector con título de tarea y sin banda administrativa duplicada | Conservar base final; shell excluido |
| U07 | UX02; UX04 a UX09 | Parcialmente acreditado | 8c95f64 define roles; medidas de áreas conservadas en UX02 | Adopción tipográfica por área |
| U08 | UX02; UX03 a UX09 | Parcialmente acreditado | 8c95f64 define geometría | Radios y espacios en consumidores finales |
| U09 | UX09; UX02/06/07/08 | Parcialmente acreditado | 6318581 separa indicador y acción, punto+texto y elimina franjas; aportes previos y capturas oleada5 | Conservar adopción conjunta y revisar base final |
| U10 | UX09; UX06/UX08/UX03 | Parcialmente acreditado | Catálogo, recetas y ofertas reducen eliminar; confirmación/restricciones conservadas; retirada de borrador explicada | Verificación conjunta final UX17 |
| U11 | UX06 | Acreditado en oleada4 | 487340e; destinos visibles distintos, teclado y retorno; [revisión](evidence/reviews/ux06-wave04.md) | Conservar en base final |
| U12 | UX12 | Acreditado según D02 en alcance probado | 6f40514; MXN/es-MX, dos decimales, tarjeta/editor/revisión y precisión145.125 intacta; revisión oleada8 | Conservar en guardado UX13 y base final UX17 |
| U13 | UX08; UX10 | Acreditado en alcance probado | 3beabea y81fc2fe; vacío y consulta fallida distintos, término y limpiar con foco; selector final probado | Conservar base final |
| U14 | UX07 | Acreditado en demo y HTTP controlado | bf7d6cb;404 sin formulario,503 recuperable y categorías independientes; [revisión](evidence/reviews/ux07-wave04.md) | Conservar en base final; no acredita servicio real |
| U15 | UX11; UX10 | Acreditado en alcance autónomo probado | a9408b8; snapshots, salida intacta, seguir/descartar, router de datos, atrás/adelante y beforeunload; operaciones pendientes/inciertas y expiradas protegidas | Conservar base final UX17; dispositivo físico y lector manual pendientes |
| U16 | UX10 | Acreditado en demo/HTTP | 81fc2fe; búsqueda y primer resultado sin cabecera administrativa, query/página conservadas | Conservar con UX11 y base final |
| U17 | UX13 | Abierto | Sin entrega | Guardado en formulario largo, poca altura, zoom y teclado virtual |
| U18 | UX13 | Abierto | Sin entrega | Éxito confirmado anunciado una vez en destino; incertidumbre sin falso éxito |
| U19 | UX09; UX02/06/07/08 | Parcialmente acreditado | Matrices por viewport, módulo y formulario en UX06/07/08/09, controles48 en paneles y tabla por contenedor | Repetir composición final y demás consumidores UX17 |
| U20 | UX14 | Abierto | D03 y D05 resueltas | Rondas de selección, 10 MiB y restricciones operativas |
| U21 | UX09 | Acreditado en oleada5 | 6318581 retira capacidades pendientes y conserva opciones de inventario existentes, sin operaciones nuevas | Conservar en base final |
| U22 | UX02; UX03/05/06/07/08/09 | Parcialmente acreditado | SVG nuevo y búsqueda adoptada en 8c95f64 | Cierres y demás consumidores |
| U23 | UX09 | Acreditado en teclado y tacto emulado | 6318581; Cambiar imagen visible, selector y preview funcionales, SVG compartido | Dispositivo físico manual pendiente; conservar base final |
| U24 | UX15; UX04/06/09 | Abierto | Contrato de marcadores documentado en UX02 | Foco, retorno, títulos, anuncios y lector; shell real excluido |
| U25 | UX16 | Abierto | Sin entrega | Cargas locales, demoras y conservación de datos |
| U26 | UX03; conservación UX10/UX11 | Acreditado en oleada 2 | [Revisión UX03](evidence/reviews/oleada-02.md); 20 demo y 47 normales, fondo único y foco Cancelar | Conservar tras UX10/UX11 y repetir en base final |
| U27 | UX10 | Acreditado en alcance probado | 81fc2fe; mismo nodo,1modal/fondo,0final, Escape local y foco; rechazo/incertidumbre/F5 y borradores | Conservar con UX11; físico y lector manual pendientes |
| U28 | UX03; repetición UX10/UX17 | Parcialmente acreditado | Scroll visual bloqueado, restaura1626px y estilos; controles48px propios | Repetición con pasos finales de UX10; shell real excluido |

## Entornos y puertas

La [línea base UX00](evidence/UX00/entrega.md) y la [investigación del entorno de producción](evidence/UX00/production-investigation.md) corresponden al código anterior a implementar. No sustituyen las puertas finales de UX17.

Oleada 1, base integrada hasta `8c95f64`: tipos y lint globales pasan; cuatro suites unitarias, 64 pruebas; demo Chromium, 14 pruebas en29,3s; [revisión](evidence/reviews/oleada-01.md). Estos resultados acreditan el alcance de la oleada, no los 28 hallazgos ni todo V01 a V18.

Faltan comandos completos sobre la base final y casos de interacción V01 a V18. El usuario pidió expresamente registrar dispositivo táctil físico con teclado virtual y lector de pantalla como validación manual pendiente. Se entregarán sus recorridos sin presentarlos como aprobados ni bloquear por ellos la implementación de agentes. Las pruebas de viewport y gesto emulado se identificarán como emulación. Las pruebas HTTP con mocks no acreditan backend real. No se afirma verificación del shell real excluido por el usuario.

En el checkpoint UX04 pasan24 pruebas demo y47 E2E normales sobre preview, además de tipos, build, lint y las suites focalizadas descritas en la revisión. Estos resultados incluyen regresiones U01 y UX03. UX05 a UX17 siguen sin implementar. Los recorridos de validación manual están en [manual-validation.md](manual-validation.md).

Checkpoint posterior de oleada4: UX05 a UX07 integradas en6e09554,487340e ybf7d6cb. Pasan32 demo y52 HTTP sobre preview, tipos, lint, build y las focalizadas por área. Se conservan las regresiones anteriores. Los aportes a U03/U07/U08/U09/U10/U19/U22/U24 esperan los consumidores restantes. No se declara cierre total de los28 hallazgos.
