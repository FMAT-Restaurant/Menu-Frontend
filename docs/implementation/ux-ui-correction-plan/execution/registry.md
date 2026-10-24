# Registro de ejecución UX/UI

Inicio: 23 de octubre de 2026. Orquestador y único editor de este registro: `/root`.
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

Todos los hallazgos U01 a U28 siguen abiertos. La integración de un ticket no cierra automáticamente hallazgos compartidos.

| Ticket | Agente y rol | Base/requisitos | Reserva | Estado | Hallazgos y evidencia | Pendientes |
| --- | --- | --- | --- | --- | --- | --- |
| UX00 | `/root/ux00_baseline`, preparación; root integra | Base inicial | Evidencia retenida; salidas liberadas al terminar limpieza | Integrada | V18; tipos/lint/build pasan; Jest y cobertura 33 suites/498 tests; demo 2 tests; E2E normal 46 tests | Shell excluido; dispositivo/lector aún sin acreditar. Logs en evidence/UX00. |
| UX01 | `/root/ux01_images`, contención de imagen | 21bd45a + UX00 integrada | OfferCard.tsx, offers/styles.css completo, e2e/ux-ui-01.demo.spec.ts, evidence/UX01 | En ejecución | U01, V01 | Revisión geométrica y visual; conservar para UX09/UX12 |
| UX02 | `/root/ux02_foundation`, base visual | 21bd45a + UX00 integrada | src/styles.css, shared/primitives.css, SearchField.tsx, Icon.tsx nuevo, App.tsx/App.test.tsx, main.tsx si necesario, shared tests nuevos, e2e/ux-ui-02.demo.spec.ts, evidence/UX02 | En ejecución | U03/U07/U08/U22; V02/V03/V13/V18 | Adopciones posteriores; no editar módulos ni CSS ofertas |
| UX03 | Por asignar | UX02 | Ninguna activa | Pendiente | U26/U28 | D01 para cierre integrado |
| UX04 | Por asignar | UX01/UX03 | Ninguna activa | Pendiente | U05/U06 | UX10 y D01 para cierre |
| UX05 | Por asignar | UX04 | Ninguna activa | Pendiente | Aporte U04 | Validación categorías |
| UX06 | Por asignar | UX04 | Ninguna activa | Pendiente | U11 y aportes | Catálogo |
| UX07 | Por asignar | UX04 | Ninguna activa | Pendiente | U14 y aportes | Entradas |
| UX08 | Por asignar | UX05 | Ninguna activa | Pendiente | U04/U13 y aportes | Recetas |
| UX09 | Por asignar | UX06/UX07 | Ninguna activa | Pendiente | U02/U09/U10/U19/U21/U23 | Repetir U01 |
| UX10 | Por asignar | UX08/UX09 | Ninguna activa | Pendiente | U16/U27 | Flujo único |
| UX11 | Por asignar | UX10 | Ninguna activa | Pendiente | U15 | Borradores y router |
| UX12 | Por asignar | UX11/D02 | Ninguna activa | Pendiente | U12 | Decisión D02 |
| UX13 | Por asignar | UX11; turno libre UX12 | Ninguna activa | Pendiente | U17/U18 | Guardado |
| UX14 | Por asignar | UX13/D03/D05 | Ninguna activa | Pendiente | U20 | D03 para cantidad |
| UX15 | Por asignar | UX13/D01 | Ninguna activa | Pendiente | U24 | Shell real |
| UX16 | Por asignar | UX14/UX15 | Ninguna activa | Pendiente | U25 | Layout final |
| UX17 | Root verifica | UX01 a UX16 y decisiones | Ninguna activa | Pendiente | U01 a U28, V01 a V18 | Evidencia integrada, shell/dispositivo/lector |

## Recursos

- Capacidad: cuatro agentes incluido root. UX00 revisada sobre la base inicial sin cambios de aplicación; habilita UX01 y UX02.
- Root coordina E2E, `test-results`, `playwright-report`, puertos 5174 y 4173 y sus contextos. Demo escalada sesión 86947 terminó con 2 pruebas aprobadas. Intento sandbox 74998 se detuvo tras comprobar Vite vivo sin puerto; no se presenta como resultado de tests. Producción sesión 12292 terminó con 46 pruebas aprobadas en 17,9 s. Los casos HTTP usan fixtures de las pruebas, no acreditan servicios reales.
- Docker 29.9.2 disponible mediante ejecución autorizada fuera del sandbox. Proyecto Compose aislado previsto `menu-ux-ui-baseline`, sin contenedores previos en ese proyecto. No detener contenedores ajenos.
- Shell real excluido del alcance actual por el usuario. Dispositivo físico con teclado virtual y lector de pantalla aún sin evidencia. La emulación no los acredita.
- Los agentes escriben su evidencia individual, nunca este registro ni `audit/`. Nuevos archivos E2E se incorporarán expresamente a la selección demo y se comprobarán con `--list`.

## Revisión y continuidad

Se registrarán asignaciones, ampliaciones, resultados, referencia de integración y liberación al recibir cada entrega. Las ediciones compartidas se integran por turnos. El historial de auditoría permanece intacto.
