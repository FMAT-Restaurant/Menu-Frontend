# Foco durante DELETE pendiente

La revisión encontró un caso que la demo en memoria no podía acreditar: un DELETE retenido mientras todos los controles de confirmación quedan deshabilitados. Se añadió `e2e/ux-ui-03-modal-pending.spec.ts` a la suite HTTP normal sin cambiar tests existentes ni simular API en la demo.

El primer probe de Chromium falló en Tab y Shift+Tab. El JSON de [evidencia negativa](pending-negative/pending-modal-focus.json) muestra `activeTag: BODY`, `focusWithin: false` y una sola escritura. Escape siguió bloqueado y no hubo errores JavaScript. El listener que antes vivía en el diálogo no recibía el teclado después de que Chromium desplazara el foco a BODY al deshabilitar el botón activo.

Se movió la escucha de Tab al documento en fase de captura. Solo responde el diálogo superior de la pila. Recupera el foco externo al primer o último control habilitado según la dirección; si no existen controles habilitados, usa el encabezado. El listener se retira con la misma fase de captura al cerrar, también durante la limpieza de StrictMode.

La nueva prueba de ciclo verifica recuperación desde un foco externo, prioridad del diálogo superior y ausencia del listener después del desmontaje. Las cinco pruebas focalizadas pasan, al igual que tipos y lint. Las aserciones del probe HTTP permanecen intactas.

Root repitió las verificaciones sobre la corrección. Build y lint global terminaron con salida 0. La suite de producción preview aprobó 47 tests en 17,2 s, incluido este probe, y la demo integrada aprobó 20 tests en 40,0 s. Los resultados están en `../oleada-02-production-preview-final.log`, `production-preview-final-junit.xml`, `../oleada-02-demo-verified.log`, `../oleada-02-build-final.log` y `../oleada-02-lint-final.log`.

La [evidencia positiva](pending-positive/pending-modal-focus.json) conserva el caso de BODY al deshabilitar el botón y muestra recuperación al H2, `focusWithin: true`, después de Tab y Shift+Tab. El modal permanece abierto durante la operación, se registra una sola escritura y no hay errores JavaScript. Este caso acredita recuperación del foco al usar el teclado, no permanencia automática dentro del diálogo en el instante en que Chromium deshabilita el control. Las capturas positiva y negativa se conservan separadas, sin reemplazar el resultado fallido.
