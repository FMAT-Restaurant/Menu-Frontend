# Registro de ejecución UX/UI

Inicio: 23 de octubre de 2026. Orquestador y único editor de este registro: `/root`.
Checkpoint del24 de octubre de2026: trabajo detenido a petición del usuario después de finalizar UX04. UX00 a UX04 integradas; UX05 a UX17 pendientes. Sin ejecutores ni reservas activas. Ver [checkpoint.md](checkpoint.md) para reanudar.
Reanudación posterior al checkpoint: objetivo reactivado y comprobado en estado active. Base0e375aa intacta, directorio limpio y subagentes anteriores terminados. Se asigna la oleada4 con reservas separadas; el checkpoint anterior permanece como referencia histórica.
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
| UX05 | `/root/ux00_baseline`, validación de categorías | 0e375aa, UX04 integrada | categories/CategoryFormDialog.tsx, categories/styles.css, pruebas de categorías, e2e/ux-ui-05*, evidence/UX05 | En ejecución | Aporte U04/U03/U07/U08/U22 | No editar BASE ni catálogo/entradas |
| UX06 | `/root/ux01_images`, catálogo y tarjetas | 0e375aa, UX04 integrada | catalog/*.tsx, catalog/styles.css, pruebas de catálogo, e2e/ux-ui-06*, evidence/UX06 | En ejecución | U11 y aportes U03/U07/U08/U09/U10/U19/U22/U24 | No editar BASE ni categorías/entradas |
| UX07 | `/root/ux02_foundation`, recursos y formulario de entrada | 0e375aa, UX04 integrada | entries/*.tsx, useEntryResources.ts, entryError.ts, pruebas y estilos de entradas, e2e/ux-ui-07*, evidence/UX07 | En ejecución | U14 y aportes U03/U07/U08/U09/U19/U22 | No editar BASE ni catálogo/categorías; ampliar antes de tocar useEntryForm |
| UX08 | Por asignar | UX05 | Ninguna activa | Pendiente | U04/U13 y aportes | Recetas |
| UX09 | Por asignar | UX06/UX07 | Ninguna activa | Pendiente | U02/U09/U10/U19/U21/U23 | Repetir U01 |
| UX10 | Por asignar | UX08/UX09 | Ninguna activa | Pendiente | U16/U27 | Flujo único |
| UX11 | Por asignar | UX10 | Ninguna activa | Pendiente | U15 | Borradores y router |
| UX12 | Por asignar | UX11/D02 resuelta | Ninguna activa | Pendiente | U12 | Implementar MXN con dos decimales |
| UX13 | Por asignar | UX11; turno libre UX12 | Ninguna activa | Pendiente | U17/U18 | Guardado |
| UX14 | Por asignar | UX13/D03 y D05 resueltas | Ninguna activa | Pendiente | U20 | Aplicar rondas de selección y ayuda10MiB |
| UX15 | Por asignar | UX13; contrato autónomo D01 | Ninguna activa | Pendiente | U24 | Foco/título/anuncios; shell real excluido |
| UX16 | Por asignar | UX14/UX15 | Ninguna activa | Pendiente | U25 | Layout final |
| UX17 | Root verifica | UX01 a UX16 y decisiones | Ninguna activa | Pendiente | U01 a U28, V01 a V18 | Evidencia integrada, shell/dispositivo/lector |

## Recursos

- Capacidad: cuatro agentes incluido root. Los tres ejecutores de oleada4 poseen áreas distintas. Root conserva registro, configuración compartida, build, cobertura, test-results, puertos4173/5174 y sesiones de navegador. Las pruebas focalizadas usan logs por ticket; las ejecuciones E2E se coordinan por turnos.
- Root coordina E2E, `test-results`, `playwright-report`, puertos 5174 y 4173 y sus contextos. Demo escalada sesión 86947 terminó con 2 pruebas aprobadas. Intento sandbox 74998 se detuvo tras comprobar Vite vivo sin puerto; no se presenta como resultado de tests. Producción sesión 12292 terminó con 46 pruebas aprobadas en 17,9 s. Los casos HTTP usan fixtures de las pruebas, no acreditan servicios reales.
- Docker 29.9.2 disponible mediante ejecución autorizada fuera del sandbox. Proyecto Compose aislado previsto `menu-ux-ui-baseline`, sin contenedores previos en ese proyecto. No detener contenedores ajenos.
- Shell real excluido del alcance actual por el usuario. Para dispositivo físico con teclado virtual y lector de pantalla, el usuario indicó expresamente "Registrar validación manual pendiente". Se entregarán recorridos y pendientes identificados, sin sustituirlos por evidencia emulada ni exigirlos para terminar la implementación de agentes.
- Los agentes escriben su evidencia individual, nunca este registro ni `audit/`. Nuevos archivos E2E se incorporarán expresamente a la selección demo y se comprobarán con `--list`.

## Revisión y continuidad

Se registrarán asignaciones, ampliaciones, resultados, referencia de integración y liberación al recibir cada entrega. Las ediciones compartidas se integran por turnos. El historial de auditoría permanece intacto.

Oleada 1: revisión favorable [reviews/oleada-01.md](evidence/reviews/oleada-01.md), 14 E2E en 29,3 s, 64 unitarias en 9,558 s y tipos/lint globales aprobados. Selección demo descubre los 14 casos; configuración normal excluye los nuevos `.demo.spec.ts`. Root inspeccionó capturas comparables de U01 y medidas reales. Las reservas UX01/UX02 quedan liberadas; UX03 recibe sus contratos y archivos actuales, sin copiar versiones previas.

Oleada 2: revisión favorable [reviews/oleada-02.md](evidence/reviews/oleada-02.md). Dos defectos de foco se corrigieron en código conservando las aserciones: vuelta de Tab en confirmaciones y Tab/Shift+Tab durante DELETE con todos los controles deshabilitados. La última verificación pasa build y lint globales, 47 E2E normales sobre preview en17,2s y 20 demo en40,0s. Evidencias negativa y positiva de operación pendiente conservadas en UX03. El documento se restaura desde scrollY1626 y los formularios usan controles de48px en contenedor propio estrecho. No acredita aún el flujo final de UX10 ni integración con backend real.

Oleada3, cierre del trabajo activo antes de pausar: revisión favorable [reviews/oleada-03.md](evidence/reviews/oleada-03.md), implementación810f5d9. Se retiraron las cabeceras del shell y se corrigió la pérdida del clic Guardar al colapsar el selector en pointerdown. Cinco expectativas de tests incompatibles se documentaron y adaptaron conservando sus garantías. El fallo de guardado se corrigió en código y se contrastó con registros de eventos negativos y positivos. Pasan tipos, build, lint, 24 demo en35,1s y 47 normales sobre preview en18,6s. Se comprobaron171 pruebas de páginas y luego57 de entrada/selector, con solapamiento. No se inició UX05 ni otra tarea después de la petición de pausa.

### Incidencias durante oleada 1

- Autorización aclarada explícitamente por el usuario: "Sí, implementar los tickets", en respuesta a si autoriza UX00 a UX17 sustituyendo "no solucionar". Se reactivan UX01 y UX02; la restricción anterior queda sustituida para este objetivo. No se eludió el rechazo automático.
- UX01 recibió rechazo de revisión automática antes de aplicar el primer parche de código y regresión. La razón cita la instrucción original de auditar sin solucionar, frente al objetivo actual de realizar la orquestación cuya guía exige implementación. Root informó el rechazo y solicitó confirmación explícita del alcance. Hasta la respuesta, UX01 y UX02 detienen nuevas ediciones de código y conservan las ya realizadas. Continúa el análisis documental independiente.
- La primera ejecución Compose heredó puerto 5173 del entorno, mientras las 46 pruebas normales usaron preview en 4173. Ese resultado demuestra preview de producción, no el contenedor. Root repitió la suite con FRONTEND_PORT=4173 y la imagen inicial sin reconstruir sobre ediciones parciales. Logs separados `compose-4173-*`. Se investigan diferencias contractuales y recuperación como condiciones de línea base, sin atribuirlas a UX01/UX02.
- Repetición Compose4173 finalizada: 37 pruebas pasan y 9 fallan en 41,6 s; JUnit y logs conservados. Contenedor y red propios detenidos/eliminados. No se modificaron tests para ocultar estos fallos. La preparación UX00 admite fallos previos documentados y sigue habilitando trabajo independiente cuando el alcance quede confirmado.
- Contraste controlado sobre la misma imagen inicial, puerto 4173 y API_BASE_URL vacío únicamente en el proceso de prueba: 46 pruebas aprobadas. La configuración anterior usaba API absoluta de otro origen, comprobado sin registrar su valor. La diferencia explica ETag no expuesto por los mocks cross-origin; no se cambia el contrato productivo ni las pruebas para ocultarla. Logs `compose-same-origin-*`; proyecto propio detenido al terminar.
