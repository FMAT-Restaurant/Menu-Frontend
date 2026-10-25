# Registro de ejecución UX/UI

Inicio: 23 de octubre de 2026. Orquestador y único editor de este registro: `/root`.
Estado actual: UX12 integrado en6f40514.135 focalizadas,19 demo,7 HTTP nuevos y55 regresiones anteriores pasan, con tipos/build/lint. UX13 queda habilitado; UX13 a UX17 pendientes. Los checkpoints y las pausas siguientes son históricos.
Checkpoint del24 de octubre de2026: trabajo detenido a petición del usuario después de finalizar UX04. UX00 a UX04 integradas; UX05 a UX17 pendientes. Sin ejecutores ni reservas activas. Ver [checkpoint.md](checkpoint.md) para reanudar.
Reanudación posterior al checkpoint: objetivo reactivado y comprobado en estado active. Base0e375aa intacta, directorio limpio y subagentes anteriores terminados. Se asigna la oleada4 con reservas separadas; el checkpoint anterior permanece como referencia histórica.
Checkpoint posterior de oleada4: [checkpoint-ux07.md](checkpoint-ux07.md). UX05 a UX07 están integradas y todos los ejecutores terminaron. UX08 a UX17 no se han iniciado.
Parada confirmada por el usuario con "Checkpoint actual y parar". No se despliegan nuevos tickets; se conserva el punto seguro después de la oleada4.
Base inicial: `21bd45a822c2345e695ddae419f5a0dcd715aec0`, rama `feature/ux-ui-improvement`, directorio limpio. El nombre actual de la rama difiere del resumen anterior; se conserva el checkout real. Todos los archivos iniciales quedan inventariados en [tracked-sha256.json](evidence/initial/tracked-sha256.json). No se restablece ni elimina trabajo previo.

## Decisiones

| ID | Dirección y estado | Responsable y evidencia requerida |
| --- | --- | --- |
| D01 | Retirar barra global decidido. Usuario excluye shell real de esta implementación: "Eso no entra en la implementación actual". | Root coordina contrato autónomo/demo. Shell real fuera de alcance por instrucción posterior del usuario, sin alegar validación de integración. |
| D02 | Resuelta por usuario: "de momento dejalo en mxn y dos decimales". Presentación es-MX, MXN, dos decimales. | UX12. Mantener el valor numérico original y distinguir moneda en la presentación. |
| D03 | Resuelta por usuario: "son rondas de selección. la cantidad de veces que se entra como slot esas opciones". | UX14 utiliza "Rondas de selección" sin cambiar valores ni payload. |
| D04 | Adoptada: intacto cierra, modificado permite continuar o descartar; pasos conservan borrador y recuperación tiene prioridad. | UX10/UX11. Fuente: plan sección 3. |
| D05 | Adoptada: tipos existentes y 10 × 1024 × 1024 bytes. Ayuda uniforme 10 MiB. | UX14. Fuente: plan sección 3. |

## Tickets y reservas

U01 acreditado en la base de oleada 1, con repetición obligatoria tras UX09 y UX12. U26 acreditado en oleada2; U28 y la base compartida están parcialmente acreditados. Los demás hallazgos siguen abiertos. La integración de un ticket no cierra automáticamente hallazgos compartidos.

| Ticket | Agente y rol | Base/requisitos | Reserva | Estado | Hallazgos y evidencia | Pendientes |
| --- | --- | --- | --- | --- | --- | --- |
| UX00 | `/root/ux00_baseline`, preparación; root integra | Base inicial | Evidencia retenida; salidas liberadas | Integrada | V18; tipos/lint/build pasan; Jest y cobertura 33 suites/498 tests; demo 2 tests; normal preview 46 pasan; Compose4173 37 pasan y 9 fallan | Fallos Compose previos investigados aparte; shell excluido; dispositivo/lector sin acreditar. Logs evidence/UX00. |
| UX01 | `/root/ux01_images`, contención de imagen | e785b41, revisión integrada sobre oleada 1 | Liberada | Integrada | U01/V01; 10 PNG/10 JSON; gap12px, overflow0 | Repetir condición UX09/UX12 |
| UX02 | `/root/ux02_foundation`, base visual | 8c95f64 | Liberada y transferida parcialmente a UX03 | Integrada | U03/U07/U08/U22 abiertos; 19 PNG/2 JSON, controles40/48 | Adopciones de consumidores y contenedores modales |
| UX03 | `/root/ux02_foundation`, ciclo modal; root integra | f7330b0 | Liberada | Integrada | U26 acreditado; U28 parcial; cinco pruebas de ciclo, 154 de consumidores, 47 E2E normales y 20 demo | Repetir pasos en UX10; U27 abierto |
| UX04 | `/root/ux01_images`, cabeceras locales; root integra | 810f5d9 | Liberada | Integrada | U05 acreditado en autónomo; U06 parcial; 24 demo y 47 normales pasan | Selector final UX10; shell real excluido |
| UX05 | `/root/ux00_baseline`, validación de categorías | 6e09554 | Liberada | Integrada | Aporte U04/U03/U07/U08/U22; 16 focalizadas, 2 demo y 2 HTTP | U04 espera recetas UX08 |
| UX06 | `/root/ux01_images`, catálogo y tarjetas | 487340e | Liberada | Integrada | U11 acreditado; aportes U03/U07/U08/U09/U10/U19/U22/U24; 32 focalizadas y 3 demo | Responsive conjunto espera UX08/UX09; contexto de rutas UX15 |
| UX07 | `/root/ux02_foundation`, recursos y formulario de entrada | bf7d6cb | Liberada | Integrada | U14 acreditado; 75 focalizadas, 3 demo y 3 HTTP | UX11/UX13 conservan sus propios pendientes |
| UX08 | `/root/ux08_recipes`, recetas; root integra | 3beabea | Liberada | Integrada | U04 acreditado con UX05; U13 y aportes;44 focalizadas y3 demo | Repetir selección y validación en UX10 |
| UX09 | `/root/ux09_offers`, ofertas; root integra | 6318581 | Liberada | Integrada | U02/U21/U23 acreditados en demo; U09/U10/U19 aportes conjuntos;96 focalizadas,3 demo,U01 repetido | Conservar UX10/UX12/UX17; tacto físico pendiente |
| UX10 | `/root/ux10_finish`, continuación; root integra | 81fc2fe | Liberada | Integrada | U16/U27 y U06/U13 acreditados en demo/HTTP;121 focalizadas,42 demo,55 HTTP | UX11 conserva sesiones y Escape local; UX17 repite base final |
| UX11 | `/root`, continuación del ejecutor tras límite de uso | a9408b8 | Liberada | Integrada | U15 y conservación U26/U27/U28;535 Jest,47 demo,55 HTTP | UX17 repite base final; shell excluido y validaciones manuales pendientes |
| UX12 | `/root/ux12_money`, importes; root integra | 6f40514 | Liberada | Integrada | U12 acreditado según D02; U01 repetido;135 focalizadas,19 demo,7 HTTP nuevos y55 anteriores | UX17 repite base final; precisión y payload intactos |
| UX13 | `/root/ux13_finish` y root, guardado y feedback local | UX11/UX12 integrados; implementación25c996b | Reserva liberada; consumidores, helpers, CAS y e2e/ux-ui-13 conservados | Integrado | U17/U18 | 7demo,62HTTP; revisión oleada9; checkpoint y parada solicitados |
| UX14 | `/root/ux14_prepare`, preparación de lectura | UX13/D03 y D05 resueltas | Sólo evidence/UX14/preparation.md | Pendiente | U20 | Inventario de textos; ninguna edición de aplicación antes de UX13 |
| UX15 | `/root/ux15_prepare`, preparación de lectura | UX13; contrato autónomo D01 | Sólo evidence/UX15/preparation.md | Pendiente | U24 | Contrato de foco/título/anuncios; no implementar antes de UX13; shell excluido |
| UX16 | Por asignar | UX14/UX15 | Ninguna activa | Pendiente | U25 | Layout final |
| UX17 | Root verifica | UX01 a UX16 y decisiones | Ninguna activa | Pendiente | U01 a U28, V01 a V18 | Evidencia integrada, shell/dispositivo/lector |

## Recursos

Tras la interrupción del25 de octubre, list_agents sólo mostraba root y la inspección de procesos del repositorio estaba vacía. UX10 continúa desde los archivos preservados con `/root/ux10_finish`; `/root/ux10_review` revisa sólo fuente, sin escrituras ni ejecuciones. Las preparaciones UX11/12/13 quedaron guardadas. Root mantiene navegador y salidas compartidas.

- Capacidad: cuatro agentes incluido root. Dos ejecutores de oleada5 poseen recetas y ofertas respectivamente. Root conserva registro, BASE, configuración común, build, cobertura, test-results, puertos4173/5174 y navegador. No se permiten ediciones compartidas ni E2E simultáneos sobre las mismas salidas.
- Root coordina E2E, `test-results`, `playwright-report`, puertos 5174 y 4173 y sus contextos. Demo escalada sesión 86947 terminó con 2 pruebas aprobadas. Intento sandbox 74998 se detuvo tras comprobar Vite vivo sin puerto; no se presenta como resultado de tests. Producción sesión 12292 terminó con 46 pruebas aprobadas en 17,9 s. Los casos HTTP usan fixtures de las pruebas, no acreditan servicios reales.
- Docker 29.9.2 disponible mediante ejecución autorizada fuera del sandbox. Proyecto Compose aislado previsto `menu-ux-ui-baseline`, sin contenedores previos en ese proyecto. No detener contenedores ajenos.
- Shell real excluido del alcance actual por el usuario. Para dispositivo físico con teclado virtual y lector de pantalla, el usuario indicó expresamente "Registrar validación manual pendiente". Se entregarán recorridos y pendientes identificados, sin sustituirlos por evidencia emulada ni exigirlos para terminar la implementación de agentes.
- Los agentes escriben su evidencia individual, nunca este registro ni `audit/`. Nuevos archivos E2E se incorporarán expresamente a la selección demo y se comprobarán con `--list`.

## Revisión y continuidad

Parada vigente del25 de octubre de2026 por solicitud expresa del usuario después de UX13. [Checkpoint UX13](checkpoint-ux13.md), implementación25c996b y [revisión oleada9](evidence/reviews/oleada-09.md). Pasan7demo y62HTTP sobre preview, build y verificaciones focalizadas. Todos los agentes concluyeron; no hay reservas de implementación ni servidores de prueba activos. UX14/UX15 sólo preparados; no iniciar siguientes tickets sin reanudación. El objetivo completo queda pausado.

Oleada8 integrada en `6f40514`: [revisión](evidence/reviews/oleada-08.md). Formato MXN/es-MX con dos decimales en las tres superficies, sin redondear el dato. Pasan135 focalizadas,19 demo con U01,7 HTTP de revisión y las55 regresiones HTTP previas, tipos/build/lint. Se corrigió output con semántica de status y un fixture de imagen incompleto, conservando las garantías de recuperación y parser. La reserva se libera para UX13.

Oleada7 integrada en `a9408b8`: [entrega](evidence/UX11/entrega.md) y [continuación/revisión](evidence/UX11/root-continuation.md). Router de datos, snapshots confirmados y guard agregado con confirmación en el contenedor existente. Se conservaron todos los cambios del ejecutor al alcanzar su límite. Pasan535 Jest en42 suites,47 demo y55 HTTP, tipos/build/lint. Se verificaron listeners de StrictMode, bloqueo pendiente, operación expirada con posible escritura, archivo/categorías y receta retenida, atrás/adelante y aviso nativo. Las adaptaciones de tests se comunicaron antes de editar y conservan garantías de negocio. Se libera la reserva y se habilita UX12.

Oleada6 integrada en `81fc2fe`: [revisión](evidence/reviews/oleada-06.md). Pasan121 focalizadas, tipos/build/lint global y42 demo en1,0min,55 HTTP sobre preview en38,8s. La revisión encontró y corrigió pérdida de receta retenida al guardar opción y un cierre nativo no cancelable durante Escape. Se conservan sus negativos, eventos y positivos. Los tests históricos de tres capas se adaptaron antes de integrar, con foco, borradores, F5, claves/payload y bloqueo pendientes intactos. Se libera UX10 y se habilita UX11.

Referencia recuperable antes de UX11: tag local `checkpoint/ux-ui-2026-10-25-ux10` sobre `adf2509`. No implica pausa del objetivo ni publicación remota.

Oleada5 integrada: UX08 `3beabea`, UX09 `6318581`; [revisión conjunta](evidence/reviews/oleada-05.md). Pasan38/38 demo en1,8min,52/52 HTTP sobre preview en45,4s, build/tipos y lint globales. Focalizadas44 recetas y96 ofertas. Se corrigieron dos fallos visuales reales sin relajar las aserciones: baseline inline en imagen y pérdida del nombre compartido del contenedor de receta. Evidencia negativa y positiva en evidence/resume-ux08. Root inspeccionó capturas y medidas. Se liberan ambas reservas; UX10 debe conservar el controlador de receta al volver entre pasos. UX11 sólo tiene preparación de lectura.

Se registrarán asignaciones, ampliaciones, resultados, referencia de integración y liberación al recibir cada entrega. Las ediciones compartidas se integran por turnos. El historial de auditoría permanece intacto.

Oleada 1: revisión favorable [reviews/oleada-01.md](evidence/reviews/oleada-01.md), 14 E2E en 29,3 s, 64 unitarias en 9,558 s y tipos/lint globales aprobados. Selección demo descubre los 14 casos; configuración normal excluye los nuevos `.demo.spec.ts`. Root inspeccionó capturas comparables de U01 y medidas reales. Las reservas UX01/UX02 quedan liberadas; UX03 recibe sus contratos y archivos actuales, sin copiar versiones previas.

Oleada 2: revisión favorable [reviews/oleada-02.md](evidence/reviews/oleada-02.md). Dos defectos de foco se corrigieron en código conservando las aserciones: vuelta de Tab en confirmaciones y Tab/Shift+Tab durante DELETE con todos los controles deshabilitados. La última verificación pasa build y lint globales, 47 E2E normales sobre preview en17,2s y 20 demo en40,0s. Evidencias negativa y positiva de operación pendiente conservadas en UX03. El documento se restaura desde scrollY1626 y los formularios usan controles de48px en contenedor propio estrecho. No acredita aún el flujo final de UX10 ni integración con backend real.

Oleada3, cierre del trabajo activo antes de pausar: revisión favorable [reviews/oleada-03.md](evidence/reviews/oleada-03.md), implementación810f5d9. Se retiraron las cabeceras del shell y se corrigió la pérdida del clic Guardar al colapsar el selector en pointerdown. Cinco expectativas de tests incompatibles se documentaron y adaptaron conservando sus garantías. El fallo de guardado se corrigió en código y se contrastó con registros de eventos negativos y positivos. Pasan tipos, build, lint, 24 demo en35,1s y 47 normales sobre preview en18,6s. Se comprobaron171 pruebas de páginas y luego57 de entrada/selector, con solapamiento. No se inició UX05 ni otra tarea después de la petición de pausa.

Oleada4 integrada: [revisión conjunta](evidence/reviews/oleada-04.md), [revisión de catálogo](evidence/reviews/ux06-wave04.md) y [revisión de entradas](evidence/reviews/ux07-wave04.md). Pasan tipos, lint, build, 32 demo en43,3s y 52 E2E sobre preview en18,6s. Las focalizadas de categorías/catálogo/entradas pasan16/32/75 casos. Los controles de una línea se normalizaron a40/48px tras detectar42/43px en revisión; el texto envuelto puede crecer sin recorte. Se documentó la adaptación de la expectativa que prohibía Ver ofertas y los dos accesos por coordenadas al enlace invisible retirado. Se preservan los flujos y contratos anteriores. El usuario solicitó otro checkpoint y parar; no hay nuevos ejecutores ni tickets desplegados después de esa petición.

### Incidencias durante oleada 1

- Autorización aclarada explícitamente por el usuario: "Sí, implementar los tickets", en respuesta a si autoriza UX00 a UX17 sustituyendo "no solucionar". Se reactivan UX01 y UX02; la restricción anterior queda sustituida para este objetivo. No se eludió el rechazo automático.
- UX01 recibió rechazo de revisión automática antes de aplicar el primer parche de código y regresión. La razón cita la instrucción original de auditar sin solucionar, frente al objetivo actual de realizar la orquestación cuya guía exige implementación. Root informó el rechazo y solicitó confirmación explícita del alcance. Hasta la respuesta, UX01 y UX02 detienen nuevas ediciones de código y conservan las ya realizadas. Continúa el análisis documental independiente.
- La primera ejecución Compose heredó puerto 5173 del entorno, mientras las 46 pruebas normales usaron preview en 4173. Ese resultado demuestra preview de producción, no el contenedor. Root repitió la suite con FRONTEND_PORT=4173 y la imagen inicial sin reconstruir sobre ediciones parciales. Logs separados `compose-4173-*`. Se investigan diferencias contractuales y recuperación como condiciones de línea base, sin atribuirlas a UX01/UX02.
- Repetición Compose4173 finalizada: 37 pruebas pasan y 9 fallan en 41,6 s; JUnit y logs conservados. Contenedor y red propios detenidos/eliminados. No se modificaron tests para ocultar estos fallos. La preparación UX00 admite fallos previos documentados y sigue habilitando trabajo independiente cuando el alcance quede confirmado.
- Contraste controlado sobre la misma imagen inicial, puerto 4173 y API_BASE_URL vacío únicamente en el proceso de prueba: 46 pruebas aprobadas. La configuración anterior usaba API absoluta de otro origen, comprobado sin registrar su valor. La diferencia explica ETag no expuesto por los mocks cross-origin; no se cambia el contrato productivo ni las pruebas para ocultarla. Logs `compose-same-origin-*`; proyecto propio detenido al terminar.
