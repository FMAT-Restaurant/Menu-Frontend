# Investigación de la línea base de producción

Revisión de solo lectura del código, configuración, mocks y evidencia de ejecución. No se modificaron fuentes, tests ni configuración. La imagen examinada contiene la base inicial `21bd45a`; no incluye la implementación de UX02 presente después en el directorio compartido.

## Resultados que deben distinguirse

| Entorno | Evidencia | Resultado y alcance |
| --- | --- | --- |
| Primer Compose, publicado en 5173 | `compose-ps.log`, `production-e2e.log` | El contenedor estaba sano en 5173, mientras Playwright usaba 4173. Pasaron 46 pruebas en 17.9 s contra Vite preview. No acredita esas pruebas contra Nginx. |
| Misma imagen Compose, publicada en 4173, API externa heredada | `compose-4173-ps.log`, `compose-4173-runtime.log`, `compose-4173-e2e.log`, `compose-4173-junit.xml` | 37 pruebas aprobadas y nueve fallidas en 41.6 s. Los accesos Nginx registran las páginas y los assets iniciales. La ejecución terminó; `compose-4173-down.log` acredita la retirada del stack propio. |
| Misma imagen Compose, 4173, API relativa explícita | `compose-same-origin-e2e.log`, `compose-same-origin-junit.xml`, `compose-same-origin-runtime.log`, `compose-same-origin-up.log`, `compose-same-origin-down.log` | Pasan las 46 pruebas en 16.3 s, salida 0. El orquestador reutilizó la imagen inicial sin reconstruir código ni modificar tests. Stack propio retirado. |

La configuración normal de Playwright reutiliza un servidor existente en 4173 cuando no está en CI. En la primera ejecución Compose recibió `FRONTEND_PORT=5173` del entorno local y el servidor administrado por Playwright ocupó 4173. El resultado de 46 pruebas aprobado es evidencia de preview, aunque Compose estuviera levantado al mismo tiempo.

## Causa investigada

El orquestador verificó de forma segura que la API configurada en el segundo contenedor era absoluta y de un origen diferente de `127.0.0.1:4173`. Solo se comunicaron los indicadores `absoluteApiBaseUrl=true` y `crossOriginFrom4173=true`. No se inspeccionaron ni publicaron valores secretos. Se constató la presencia de las claves API_BASE_URL y FRONTEND_PORT en `.env`, sin divulgar sus valores.

`compose.yaml` entrega API_BASE_URL al contenedor y permite heredar FRONTEND_PORT. `docker/40-runtime-config.sh` escribe apiBaseUrl en el JavaScript servido por Nginx. `App.tsx` usa ese valor para crear el cliente Axios y recurre a `/api/v1` cuando está vacío. En preview se sirve `public/runtime-config.js` con apiBaseUrl vacío. Por ello ambos entornos pueden consumir rutas distintas aunque carguen los mismos assets.

Los mocks de las pruebas fallidas devuelven ETag en `route.fulfill`, pero no añaden `Access-Control-Expose-Headers`. En una respuesta de otro origen, ETag no forma parte de las cabeceras expuestas automáticamente al JavaScript del navegador. El cuerpo puede llegar correctamente mientras la cabecera no aparece en Axios. Las pruebas de preview con API relativa no ejercitan esa restricción.

El contraste experimental confirmó que la diferencia procede de la configuración de API externa. Sobre la misma imagen inicial, con los mismos tests y puerto 4173, establecer API_BASE_URL vacío hizo pasar las 46 pruebas. El código y los mocks sustentan la explicación concreta de ETag no expuesto al JavaScript en respuestas de otro origen. No se alteró el producto ni se corrigió un test para obtener ese resultado.

## Correspondencia con los nueve fallos

| Caso | Evidencia observada | Relación con la versión fuerte |
| --- | --- | --- |
| RV07, recuperación de receta tras F5 | `Guardar cambios` permanece deshabilitado después de la creación confirmada | El mock entrega `ETag: created-version`; RecipeFormDialog conserva `result.etag` y exige una versión fuerte para habilitar la edición. Su ausencia se conserva también al restaurar el resultado confirmado. |
| Categorías, creación y edición | La edición muestra que no se recibió una versión fuerte y deshabilita guardar | El GET mock devuelve `rev-3`, pero el formulario no lo recibe en el escenario fallido. |
| Entrada, edición con carga separada de imagen | El contexto de error muestra falta de versión fuerte y guardar deshabilitado | El formulario exige el ETag de apertura antes de escribir. |
| Entrada, conflicto y revisión de nueva versión | Mismo bloqueo de falta de versión antes de alcanzar el conflicto esperado | La prueba no llega todavía a su operación principal. |
| Oferta, recuperación de PATCH tras F5 | Falta el campo de presentación; alerta de ausencia de versión fuerte al abrir | `getOffer` en menuApi.ts exige el ETag del GET. La prueba falla antes de emitir el PATCH incierto. |
| Catálogo, eliminación y recuperación 412 | Contador DELETE sigue en cero; error de resultado incierto | `deleteArchivedEntry` consulta primero `currentEntry`, que exige ETag fuerte. Puede abortar antes de invocar DELETE. |
| O18, creación y eliminación de oferta | No aparece `Oferta eliminada`; error genérico de eliminación | `deleteInactiveOffer` consulta primero `currentOffer`, que exige ETag fuerte. |
| Ofertas, eliminación de última página y reconciliación | No cambia la URL según la página esperada; error de eliminación | La eliminación no se completa y no habilita la reconciliación prevista. |
| Ofertas, recuperación 412 en modal | Aparece error genérico en lugar de `Los datos cambiaron` | La falta de ETag puede impedir que el código alcance el DELETE mock que devuelve 412. |

Se inspeccionaron los archivos e2e/categories.spec.ts, e2e/audit-review-regressions.spec.ts, e2e/catalog-remediation.spec.ts, e2e/offers.spec.ts y e2e/operation-recovery.spec.ts. Las rutas mock ya expresan versiones fuertes. Los mensajes y contadores observados son coherentes con la pérdida de la cabecera en el límite del navegador. No justifican quitar los validadores de ETag, aceptar versiones débiles ni forzar los botones habilitados.

## Siguiente acción y límites

La línea base aprobada de Nginx es la ejecución con API_BASE_URL vacío y FRONTEND_PORT 4173 explícitos. Las corridas siguientes de esta suite mock deben controlar esos valores, comprobar runtime-config y el servidor efectivo, y registrar la imagen o build probado. No deben depender de `.env` ni confundir un servidor preview reutilizado con el contenedor. Se conservan las corridas de preview y de API externa como evidencia distinta, sin reemplazar sus resultados por el aprobado.

No queda un fallo de código demostrado por estos nueve casos sobre la base inicial. La corrida con API externa sigue teniendo nueve fallos y no acredita ese entorno. La configuración de mismo origen es una condición explícita de la suite mock sobre Nginx, no una recomendación para cambiar el destino de la API de producción. La comprobación final deberá reconstruir y probar la base integrada posterior, sin reutilizar esta aprobación como evidencia de los tickets todavía no implementados.

Una suite mock sobre Nginx no comprueba el backend real. Si se desea certificar una API externa, se necesita una comprobación contractual propia de sus cabeceras CORS, incluidos los encabezados de versión e idempotencia que el navegador deba leer. Cambiar los mocks para simular esa respuesta sería un ajuste justificado de infraestructura de prueba y exigiría documentar su alcance, sin presentarlo como validación del servicio real.

La integración con el shell real está fuera del alcance actual por D01. No explica ni resuelve esta diferencia de API. Tampoco se atribuyen estos fallos a los nuevos estilos UX02: el contenedor estaba construido antes de esas ediciones.
