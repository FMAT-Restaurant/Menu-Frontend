# Entrega UX12

Implementación entregada a root el 25 de octubre de 2026. Agente `/root/ux12_money`. Código y E2E congelados para validación integrada. No acredita todavía cierre U12 ni ejecución de navegador. Root conserva el registro y la auditoría.

## Base, autoridad y dependencias

Encargo recibido con UX11 `a9408b8` integrado y reserva exclusiva de ofertas para UX12. HEAD observado al finalizar `c2ea7bbcea933ddb13bce610dbc406763747e1ea`. No hice commits. Se leyeron AGENTS.md, DESIGN.md, orquestación, ticket UX12, registro y preparación anterior. Se aplicaron ui-ux-pro-max, unslop, dependency-cruiser-impact, React, Jest y Playwright. La búsqueda UX `form numeric currency label` confirmó etiquetas asociadas; se mantuvo el diseño existente.

D02 procede del usuario, registrada por root: "de momento dejalo en mxn y dos decimales". Localización explícita `es-MX`; root autorizó `currencyDisplay: code` para mostrar MXN. Esta presentación no añade moneda al contrato API ni cambia su tipo numérico. D01 sigue excluyendo responsabilidades del shell.

Índice consultado `.analysis/ux-ui-wave07-integrated.json`, SHA256 `BBE1D09DE6AC6BC43AA093A437C711FEC484A0EA62A2EEE796124A032BDFB3DF`, con `npx --no-install depcruise-fmt -T text --focus '^src/features/offers/(OfferCard|OfferCommercialInfo|OfferFormPage)\.tsx$' .analysis/ux-ui-wave07-integrated.json`. Se contrastó fuente actual. OfferCommercialInfo se consume desde OfferFormPage, OfferCard desde OffersPage. El formulario conserva operación, recuperación, guardas y tareas de receta. El índice describe relaciones estáticas; no acredita CSS ni ejecución. Los únicos imports nuevos son el formateador puro en las tres superficies. Root debe refrescar el índice al integrar.

## Cambios y archivos reservados

- `src/shared/formatMoney.ts` y `.test.ts` nuevos. Una instancia de Intl.NumberFormat con MXN/es-MX, código visible y mínimo/máximo dos decimales. No parsea texto localizado ni devuelve un cero sustituto.
- `OfferCard.tsx` usa el helper. `OfferCommercialInfo.tsx` mantiene el input numérico original, `step=any`, callbacks y validadores. Etiqueta visible `Precio base (MXN)`, prefijo MXN y texto monetario adyacente asociado por `aria-describedby`. Vacío o no finito no produce salida monetaria.
- `OfferFormPage.tsx` sólo importa el helper y separa el importe remoto en una fila dentro de la revisión existente. Revisar no adopta versión ni sustituye el precio local. Adoptar sigue conservando campos comerciales.
- `src/features/offers/styles.css` alinea importes/input a derecha y peso600, usa cifras tabulares y permite contener texto largo. La fila de revisión puede envolver sin solaparse.
- `OfferMoney.test.tsx` nuevo y `OfferFormPage.test.tsx` añaden casos reales de presentación, precisión, validación y conflicto.
- Adaptaciones autorizadas de presentación en `OffersPage.test.tsx`, `demo-mode.e2e.ts`, `ux-ui-01.demo.spec.ts` y las etiquetas exactas de OfferFormPage/audit-recovery/closure-review. Se conservan datos, escenarios, payloads y garantías anteriores.
- E2E nuevos `e2e/ux-ui-12.demo.spec.ts`, `e2e/ux-ui-12.spec.ts` y helper `e2e/ux-ui-12-evidence.ts`.

No modifiqué App, main, guardas, configuración, contratos, parser, datos demo, repositorio demo, registro, auditoría, build, dist ni cobertura. La modificación concurrente del registro pertenece a root.

## Casos y resultados ejecutados

`npx --no-install jest --runInBand --runTestsByPath src/shared/formatMoney.test.ts src/features/offers/OfferMoney.test.tsx src/features/offers/OfferComponents.test.tsx src/features/offers/OffersPage.test.tsx src/features/offers/OfferFormPage.test.tsx src/audit-recovery.regression.test.tsx src/closure-review.regression.test.tsx`

Resultado final `jest-final.log`: 7 suites, 135 pruebas aprobadas, 0 fallos, 17.51s. Cubre entero145, fracción145.5, largo123456789.5, lectura cero, precisión145.125, vacío, inválido y callbacks sin redondeo. La prueba de edición carga245.125, edita145.125 y comprueba PATCH145.125 mientras muestra145.13. Cero, negativo y vacío conservan error positivo sin requests. Revisión412 muestra el importe remoto largo con versión2, mantiene145.125 local y no ejecuta otro PATCH al revisar/adoptar. Las regresiones existentes de recuperación/versiones siguen aprobadas.

`npx --no-install tsc --noEmit` pasó con exit0, log `typecheck-final.log`. ESLint focalizado en los 15 archivos TS/TSX de esta reserva pasó con exit0, comando conservado en `lint-final.log`. `git diff --check` pasó con exit0; sólo advirtió la política CRLF del registro concurrente de root.

Los logs iniciales se conservan. Hubo incompatibilidades de presentación ya anticipadas en preparación. RTL normaliza NBSP; las consultas pertinentes conservan el espacio exacto con un normalizador identidad y los tests puros comparan U+00A0 literalmente. Una etiqueta audit usaba comillas simples y también se adaptó al nombre autorizado.

La primera implementación usaba `<output aria-live="off">`. Su rol implícito `status` permitía que una prueba de recuperación encontrara el supuesto éxito antes de completar la operación. Se corrigió producción a `<p>` asociado, sin región viva. No se modificó la espera de la prueba de recuperación. Las pruebas monetarias comprueban que la presentación no crea un status. El primer typecheck detectó `image` ausente en una fixture nueva; se corrigió la fixture a `image:null`, conservando el tipo obligatorio.

## Navegador preparado para root

No ejecuté E2E, servidor, build ni cobertura, por reserva de root. No quedan procesos o puertos propios.

Demo tiene siete casos en320/390/600/740/1024/1440 y host1440 con módulo390. Cada uno edita/guarda importe largo, comprueba la tarjeta, guarda145.125 con display145.13 y vuelve a editar para demostrar precisión conservada en el repositorio real demo. Comprueba cero llamadas API y errores de página.

HTTP tiene siete casos equivalentes de geometría con fixtures propias en el límite de red. Lee cero válido, envía145.125 con If-Match versión1, recibe412, revisa versión2 con123456789.5 y conserva el precio local antes y después de adoptar explícitamente. Verifica sólo un PATCH y dos lecturas. No altera fixtures compartidas, parser o API por formato.

El helper persiste PNG y JSON físicos mediante outputPath/attach antes de las aserciones de geometría, incluidas las mediciones que fallen. Mide contención de módulo/padres, rectángulos de texto, separación de prefijo/input y fila remota, alineación, pesos y controles40/48 según contenedor. Root deberá ejecutar estos14 casos y repetir los10 U01 existentes y el recorrido demo completo. No son resultados ejecutados todavía.

## Límites y freeze

No se acredita dispositivo físico, teclado virtual ni lector manual. No se anticipó UX13 ni se alteró guardado, reintento, Escape local UX10 o protección UX11.

`freeze-sha256.txt` identifica los16 archivos de código/tests/E2E entregados. Reservas liberables por root tras revisión. No habrá nuevas ediciones src/E2E desde este agente sin reasignación por fallo investigado. Root decide integración, cierre U12/U01 y desbloqueo UX13 con evidencia de navegador y base integrada.

## Corrección de fixture tras primera integración

Root comunicó build/lint aprobados y19 demo aprobados, incluidos los10 U01 y los7 UX12. La revisión de capturas320 de tarjeta/editor fue favorable. Las55 pruebas HTTP anteriores pasaron y los7 nuevos casos UX12 fallaron antes del campo con "Respuesta de oferta inválida". Esa primera ejecución HTTP no acredita el recorrido UX12. Logs y capturas son de root, `http-first` y `http-root.log`.

La investigación contrastó `isOfferDetail`, `nonNegativeFiniteNumber` e `isCatalogImage` en `src/api/catalogResponse.ts`. El contrato sí admite precio cero leído. El defecto estaba en mi fixture nuevo, cuya imagen omitía `thumbnailUrl` obligatorio y no vacío. La aplicación rechazó correctamente la respuesta. Se corrigió únicamente `e2e/ux-ui-12.spec.ts`, añadiendo `thumbnailUrl` igual al recurso de imagen existente y tipando la fixture como `MenuOfferDetail`. No se cambiaron API, parser, aplicación ni aserciones. Se conservan leído0, PATCH145.125, If-Match1,412 y revisión2 con importe remoto largo.

La corrección pasó `npx --no-install tsc --noEmit` y `npx --no-install eslint e2e/ux-ui-12.spec.ts`, ambos exit0. Logs `typecheck-fixture.log` y `lint-fixture.log`. No repetí navegador ni unitarias porque sólo cambió la fixture nueva. Root repetirá primero los7 HTTP.

`freeze-first-sha256.txt` conserva la versión original con fixture rechazado. `freeze-sha256.txt` actualiza únicamente el hash de `e2e/ux-ui-12.spec.ts` para la segunda entrega. Src y los demás E2E siguen congelados sin modificaciones adicionales.
