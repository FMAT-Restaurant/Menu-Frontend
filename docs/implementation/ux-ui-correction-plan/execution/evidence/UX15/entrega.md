# UX15. Entrega para revisión

25 de octubre de 2026. Ejecutor `/root/ux15_execute`. Base `1f415c4`, con UX13 integrado en `25c996b`. Fuente congelada para revisión central. No se ejecutaron build, navegador, E2E, cobertura, servidores ni commits. El registro y la auditoría histórica no se modificaron.

## Cambio y alcance

`RouteContext` se monta dentro del layout de rutas y fuera de Suspense. Consume los títulos `data-route-heading` y los orígenes `data-return-key`. Al entrar enfoca el título local. Al regresar espera a que la colección deje de estar ocupada, busca el control de origen y después el artículo de su entidad. Si ya no existen, usa el título. El mapa conserva URLs de los dos niveles, catálogo y ofertas, sin sustituir el origen anterior al entrar en edición.

El coordinador conserva el foco al cambiar consulta, página o hash. Consumir el recibo UX13 mediante replace en la misma ruta no inicia otra tarea. La vía de anuncio de ruta es el título o control enfocado, sin otra región live. El recibo conserva su región status local y no se vuelve a escribir su texto. Este comportamiento DOM no acredita el anuncio percibido con un lector de pantalla real.

Una interacción durante la espera conserva el foco si su control sigue presente. Si ese control se desmonta y el foco termina en BODY, el título nuevo proporciona el contexto de la tarea. Un diálogo abierto, una validación enfocada o el foco activo fuera del módulo tienen prioridad. Los eventos del documento sólo informan esa decisión; no ejecutan navegación ni capturan atajos. Las mutaciones se observan dentro del módulo y permiten actualizar un nombre tardío en el título sin volver a enfocar. La limpieza cancela el frame, el observador y los listeners.

El documento cambia de título sólo con `data-menu-standalone`. Conserva el prefijo `[DEMO]`. Un montaje controlado sin esa marca conserva el título y el foco externo. No representa una integración con el shell real, excluido por el usuario.

El artículo de OfferCard ahora admite foco programático con `tabIndex=-1`, sin añadir una parada al recorrido por Tab. Los controles de la tarjeta conservan sus identidades y acciones.

## Archivos propios

- `src/App.tsx`: montaje del coordinador y canal de notificaciones del router. La creación y disposición del router siguen en el efecto, que ahora limpia también su suscripción.
- `src/shared/RouteContext.tsx` y `RouteContext.test.tsx`: comportamiento y casos reales de navegación.
- `src/features/offers/OfferCard.tsx` y `OfferCard.route-context.test.tsx`: alternativa de retorno programático.
- `e2e/ux-ui-15.demo.spec.ts`, `e2e/ux-ui-15.spec.ts` y `e2e/ux-ui-15-evidence.ts`: recorridos y escritura física de PNG/JSON para ejecución central.
- Evidencia individual en esta carpeta. No se editaron tests existentes, `main.tsx`, formularios, listados, guard, recibos ni configuración.

## Análisis previo

Se aplicaron ui-ux-pro-max, unslop, pre-change-dependency-analysis, dependency-cruiser-impact y las guías de React, Jest y Playwright. Las consultas UX devolvieron reglas generales de teclado y anuncios contextuales, sin una coincidencia específica verificada de coordinación de rutas. El diseño concreto se deriva del ticket y de la fuente actual, no de atribuir ese contrato al buscador.

El índice wave09 ubicó App, sus páginas diferidas, guard y OfferCard. Se contrastaron JSX, marcadores, aria-busy y el recibo UX13. La decisión fue añadir un consumidor local de los marcadores, sin cambiar firmas de formularios ni recrear el router. Después de añadir el import se regeneró `.analysis/ux-ui-15-source.json`, raíces `src`, configuración `.dependency-cruiser.cjs`, sobre el checkout compartido en edición. SHA256 `65ADFE27B6F7E8B7B842B238D7117E8CBD51B7212A2C07AC33675E8AC4173EDB`. Vecinos directos en `dependencies.txt`. El índice incluye cambios concurrentes de UX14 y no sustituye pruebas de comportamiento.

## Verificación ejecutada

- `node node_modules/jest/bin/jest.js --runInBand --runTestsByPath src/shared/RouteContext.test.tsx src/features/offers/OfferCard.route-context.test.tsx src/App.test.tsx`: exit0,19/19 en tres suites,49,225s. Log `jest-first.log`.
- `node node_modules/@typescript/native/bin/tsc --noEmit`: exit0. Log `typecheck-final.log`.
- ESLint de los archivos propios de fuente y E2E: exit0. Log `lint-final.log`.
- `git diff --check` sobre archivos propios: exit0.

Los tests comprueban rutas, query/página/hash sin salto de foco, retorno catálogo→ofertas→editar→ofertas→catálogo, atrás/adelante, colección pendiente, acción ausente, entidad ausente, interacción durante espera, prioridad modal/error, recibo consumido y foco externo. App.test mantiene el caso de un solo router vivo y limpieza tras desmontar. La primera comprobación de tipos detectó que el fixture nuevo de OfferCard omitía `image`; se completó con `null`, sin modificar el contrato del producto.

## Verificación central pendiente

La demo prepara10 casos: siete entradas directas, retorno anidado y navegador, búsqueda/dialogo y éxito con recibo. Observa cero API y errores JS. La suite HTTP prepara tres casos controlados: nombre de entrada tardío sin robar foco, chunk retenido con control externo persistente y chunk retenido con control anterior desmontado. Ambas suites escriben JSON y capturas físicas. El ejecutor no las ejecutó.

Root debe ejecutar estos casos tras integrar la fuente de UX14 y revisar capturas, foco, títulos y regresiones compartidas. UX16 todavía puede cambiar fallback y cargas; deberá conservar la coordinación. Lector de pantalla físico permanece como validación manual pendiente por decisión del usuario. Shell real excluido. U24 no se declara cerrado por esta entrega de código.

## Corrección después de la revisión central

Root informó10demo aprobadas y una suite HTTP de65/66. El caso nuevo de chunk suspendido tenía dos defectos de fixture: buscaba un enlace duplicado de Nueva entrada sin limitarlo a la cabecera y esperaba un fallback que React no muestra en esa transición. Root informó esas incompatibilidades antes de corregir el selector y devolver el escenario al ejecutor. No se modificaron tests existentes para ocultar un fallo.

La transición real mantiene el catálogo anterior mientras llega el chunk. Observar sólo el pathname dentro de un efecto de React es demasiado tarde para saber si el usuario interactuó antes de ese commit. Con ampliación de reserva aprobada por root, App crea un tracker junto al router y se suscribe antes de montar RouterProvider. El callback registra cambios de pathname antes del commit; los eventos de puntero y teclado posteriores quedan asociados a esa transición. La suscripción se retira junto con dispose. No se añade otro listener de popstate, ni se cambia el guard o el contrato de los formularios.

El tracker ignora la repetición del mismo pathname, por lo que los filtros y la limpieza de state del recibo no reinician el foco. El gesto que inicia la navegación ocurre antes de la notificación y no se considera una interacción posterior. El coordinador consulta esa señal cuando monta la nueva pantalla. Conserva un control todavía enfocado y disponible, incluido un botón persistente dentro del layout. Si desapareció el control de la vista anterior y quedó BODY, enfoca el nuevo título. La ubicación usada para capturar orígenes se actualiza en layout effect, para no publicar la ubicación de un render suspendido que aún no se ha confirmado.

Se añadieron cinco casos con createMemoryRouter, RouterProvider, React.lazy y Suspense reales. Retienen el módulo, confirman que sigue visible el catálogo y prueban links, atrás y adelante con un control persistente. Otro caso comprueba el fallback cuando se desmonta el campo anterior y otro la navegación sin interacción posterior. El HTTP usa un botón externo de fixture que sigue presente y exige exactamente su foco después de resolver el chunk. El otro caso HTTP exige el título nuevo cuando el buscador se desmonta. No se acepta notFocused como única prueba ni se declara que BODY sea un resultado útil.

Verificación final de esta corrección:24/24 en tres suites,12,761s, `jest-transitions-final.log`; tipos y lint exit0, `typecheck-transitions-final.log` y `lint-transitions-final.log`. App.test conserva su test de lifecycle sin modificaciones. La primera ejecución de la corrección pasó22/23 y registró un timeout de la importación diferida del formulario en App.test; se conserva `jest-transitions.log`. No se cambió ese test y la repetición final completa pasa. Root repetirá build y navegador sobre esta fuente congelada. Los resultados iniciales de19casos y el índice de dependencias anterior son históricos respecto a esta corrección, no una ejecución final del conjunto.
