# Entrega de UX00

Estado solicitado: en revisión. La preparación no implementa correcciones ni acredita U01 a U28.

## Base y reserva

- Agente: `/root/ux00_baseline`. Rol: base, herramientas y trazabilidad.
- Checkout compartido: `Menu-Frontend`, rama `feature/ux-ui-improvement`.
- Base inicial: `21bd45a822c2345e695ddae419f5a0dcd715aec0`. El estado inicial de Git estaba limpio antes de crear esta carpeta.
- Reserva de escritura del agente: únicamente `execution/evidence/UX00/`. El orquestador es el editor del registro común y aporta sus propios logs en esta carpeta.
- No se editaron fuentes, configuración, tests, índice ni historial. La carpeta histórica `audit/` permanece intacta.
- Recursos `dist` y `coverage` liberados después de terminar sus comandos. No quedan procesos del agente en ejecución. El orquestador controla servidores, navegador y Compose.

## Entorno y fuentes

Node `24.21.0`, npm `12.1.0`, ejecutable `tsc` `7.0.2`, Playwright `1.64.0`, dependency-cruiser `18.7.0`, Windows x64. `installed-versions.json` conserva las versiones efectivas de los paquetes, distinguiendo los alias de TypeScript. El analizador encuentra `typescript@6.0.3`, mientras el ejecutable tsc corresponde al paquete nativo `7.0.2`.

`provenance.json` contiene los SHA256 de AGENTS.md, DESIGN.md, metodología, auditoría, plan, guía de orquestación, ticket UX00, configuración de herramientas, CI y manifiestos de paquetes. `dependency-input-hashes.json` identifica los archivos de entrada de src, e2e, public y scripts.

La puerta vigente `.github/workflows/ci-cd.yml` exige `npm run test:unit`, tipos, lint y build. `jest.config.cjs` mantiene umbrales de 80 en ramas, funciones, líneas y sentencias para los 18 archivos indicados en su configuración. No se modificó ningún umbral.

## Línea base

| Comando o comprobación | Resultado actual | Evidencia |
| --- | --- | --- |
| `npm run typecheck` | Pasa, salida 0 | `typecheck.log` |
| `npm run lint` | Pasa, salida 0 | `lint.log` |
| `npm test -- --silent` | Pasa, 33 suites y 498 pruebas, 61.653 s | `jest.log` |
| `npm run build` | Pasa, salida 0, 125 módulos, Vite 8.3.4 | `build.log` |
| `npm run test:unit` | Pasa con los umbrales vigentes, 33 suites y 498 pruebas, 52.651 s | `coverage.log`; salida generada `coverage/lcov.info` |
| `npx --no-install playwright test --config playwright.demo.config.ts --list` | Pasa, descubre exactamente las dos pruebas actuales en demo-mode.e2e.ts | `playwright-list.log` |
| `npm run test:e2e:demo` | El orquestador comunica dos pruebas aprobadas en Chromium, 16.8 s, ejecución escalada | `demo-e2e.log`, producido por el orquestador |
| Compose y suite E2E normal | A cargo del orquestador. No se ejecutaron desde este agente; consultar su resultado en el registro común | `compose-up.log`, producido por el orquestador |

Los resultados anteriores corresponden a la base inicial, antes de despachar correcciones. No se reutilizan las pruebas históricas de la auditoría como evidencia actual. Los comandos con salida propia de este agente finalizaron correctamente; no hay fallos de tests que corregir ni incompatibilidades revisadas.

Las nuevas regresiones de navegador se incorporarán expresamente a `playwright.demo.config.ts` por turno del integrador, con archivos propios por ticket. Se repetirá `--list` y se conservarán las dos pruebas existentes, su rechazo de llamadas a `/api/` y su comprobación de errores JavaScript.

## Dependencias y alcance para la primera oleada

Se descartó el grafo de `.analysis/dependencies-final` como índice actual. Su procedencia era `9ac4411`, y desde entonces cambiaron fuentes, tests, modo demo y tsconfig. El grafo nuevo se produjo con:

```powershell
npx --no-install depcruise src e2e public scripts vite.config.ts playwright.config.ts playwright.demo.config.ts eslint.config.js jest.config.cjs babel.config.cjs .dependency-cruiser.cjs --config .dependency-cruiser.cjs --ts-config tsconfig.json --ts-pre-compilation-deps -T json -f docs/implementation/ux-ui-correction-plan/execution/evidence/UX00/dependencies.json
```

El resultado tiene 130 módulos, 328 relaciones y cero dependencias marcadas como no resueltas. Conserva la infracción preexistente `not-to-dev-dep` en `src/test-setup.ts` por jest-dom y las dos advertencias de huérfanos para jest.config.cjs y public/runtime-config.js. Aunque el comando devuelve 0, el resumen propone `advisedExitCode: 1`. La generación correcta no demuestra ausencia de infracciones. No se alteraron reglas para ocultarlas.

`offer-card-neighbors.txt` y `base-neighbors.txt` conservan consultas nativas acotadas. OfferCard importa el contrato de catálogo, React y React Router. OffersPage lo utiliza, según el consumidor verificado en fuente y el plan. App monta las seis áreas mediante imports diferidos; SearchField participa en sus formularios y búsquedas. La base CSS se carga desde main y desde el import de primitives en styles. La reserva independiente de UX01 sobre OfferCard y estilos de ofertas puede coexistir con UX02 sobre App y la base compartida, sin editar archivos ajenos.

El índice conserva `skipAnalysisNotInRules: true`. No representa de forma completa CSS, llamadas por callbacks ni todas las relaciones JSX. Las consultas a CSS vacías no demuestran ausencia de consumidores. Cada ejecutor debe contrastar sus fuentes reales antes de ampliar una reserva y actualizar el índice si cambia imports o contratos pertinentes.

## Decisiones comunicadas por el orquestador

| ID | Fuente y dirección vigente | Responsable y efecto |
| --- | --- | --- |
| D01 | El orquestador comunica la decisión del usuario de excluir la integración con el shell real del alcance actual. La retirada de `.global-nav` sigue adoptada. La base observada usa createRoot en `#root`, StrictMode y BrowserRouter propio. | Orquestador, UX02, UX03 y UX15 documentan el montaje autónomo. Se verifica aislamiento con un host de prueba cuando corresponda, sin presentarlo como shell real. La evidencia de shell real queda fuera del cierre actual por instrucción del usuario. |
| D02 | El orquestador comunica que el usuario confirmó MXN con dos decimales; fija `es-MX` para la presentación. | Producto y orquestador aportan el contrato; UX12 lo consume. No alterar valores almacenados ni payload. |
| D03 | El orquestador comunica que el usuario confirmó que quantity son "rondas de selección", las veces que se entra al slot y se eligen opciones. | UX14 aplica el término confirmado, conservando valores, validación y payload. Distinguirlo de cantidad y unidad de un insumo. |
| D04 | Política ya adoptada en plan y guía: intacto cierra, modificado permite seguir editando o descartar; los pasos conservan borradores. | UX10 y UX11. El envío pendiente o resultado incierto conserva su recuperación y el bloqueo de doble envío. |
| D05 | Código verificado en shared/imageValidation.ts: 10 × 1024 × 1024 bytes; tipos JPEG, PNG y WebP. | UX14 unifica una ayuda exacta, por ejemplo 10 MiB, sin cambiar el límite ni los tipos. |

## Disponibilidad y límites

- Demo y Chromium: comprobación runtime del orquestador en `demo-e2e.log`. Un probe dentro del sandbox resolvió una ruta de Chromium inexistente en su perfil aislado. No se usó ese probe para negar el navegador disponible fuera del sandbox.
- Docker: CLI localizada en Docker Desktop. El orquestador comprobó versión 29.9.2 y ejecuta el entorno aislado. La presencia del ejecutable por sí sola no acredita que el stack ni la suite normal pasen.
- Shell real: excluido por la decisión D01 comunicada por el orquestador. No se afirma verificación de ese montaje.
- Dispositivo táctil y teclado virtual físico, y lector de pantalla: este agente no dispone de evidencia de ejecución. El orquestador asignará su comprobación o registrará el impedimento. Emular viewport en Chromium no sustituye estas pruebas.

## Revisión solicitada

El orquestador debe incorporar al registro común los resultados de Compose y E2E normal, las decisiones confirmadas y los recursos que permanezcan activos. UX00 puede integrarse con un impedimento concreto de entorno registrado, conforme a su ticket; no exige inventar un resultado verde. UX01 y UX02 reciben esta base identificable sin dar por cerrado ningún hallazgo.
