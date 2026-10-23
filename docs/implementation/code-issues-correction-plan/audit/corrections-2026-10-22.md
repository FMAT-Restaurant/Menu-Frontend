# Correcciones de la revisión del 22 de octubre de 2026

Alcance: RV01–RV13 de `review-2026-10-22.md`, sobre el árbol de trabajo que parte de `6687252`. Se conservan los cambios previos del usuario. RV14–RV16 quedan fuera de esta entrega. **T18 permanece pendiente de acreditación**; estos resultados no declaran cerrado el conjunto de 104 hallazgos.

## Correcciones y evidencia

| ID | Corrección aplicada | Comprobación concreta |
| --- | --- | --- |
| RV01 | El controlador se desconecta al salir/cambiar recurso; los enlaces y el historial abandonan la recuperación. La carga anterior no escribe refs del editor nuevo ni continúa con POST/PATCH. La cola de almacenamiento impide resucitar el registro abandonado. | Regresiones «salir durante upload detiene el PATCH posterior» y «salir voluntariamente elimina la recuperación y una respuesta tardía no la resucita»; prueba existente de cambio de identidad. |
| RV02 | Seleccionar imagen actualiza sólo el borrador editable. Se conservan la clave, bytes, imageId, JSON e If-Match de la operación incierta. Tras rechazo confirmado, una imagen nueva inicia otra cadena; la imagen sin cambios se reutiliza. | Regresión «cambiar imagen no reemplaza la clave del PATCH incierto»; pruebas existentes de selección de otro archivo y reutilización de carga después de 422. |
| RV03 | Cada envío exige persistencia terminada, incluida la segunda etapa. Un fallo mantiene imageId, borrador y clave sellada en memoria e impide la escritura HTTP final. | Regresión «no envía el POST si no puede persistir su clave antes del envío»; pruebas del controlador y del adaptador transaccional. |
| RV04 | El ejecutor de imagen siempre está disponible y toma los bytes del intento restaurado, independientemente del archivo inicialmente seleccionado en React. | Regresión de entrada tras remontar; E2E nuevo con F5 real durante upload incierto, comparación de clave y bytes multipart, cero envío automático y una sola creación final. |
| RV05 | La biblioteca entrega detalle y ETag de apertura juntos al diálogo, sin segundo GET. El consumidor que recibe sólo una receta carga todos los campos y su versión como unidad; si ya hubo ediciones, exige revisión explícita. | Regresión con datos v1/r1 y una segunda respuesta v2/r2: sólo se hace una lectura y el PATCH usa r1. |
| RV06 | El éxito recuperado se separa del borrador posterior. Se conserva el ID confirmado y se continúa como edición hasta otro guardado explícito. Se propaga el ETag fuerte de la respuesta confirmada; una reconciliación segura con versión disponible no exige adoptar composición otra vez. Sólo se consumen las intenciones enviadas; una nueva selección de la misma receta tiene otra identidad de intención. | Regresiones de oferta/entrada con cambios posteriores; segundo PATCH con ETag confirmado y clave nueva; tres pruebas de versión de respuesta sin GET; prueba de intención posterior de la misma receta. |
| RV07 | El callback de creación no cambia la key ni remonta el diálogo. El resultado confirmado y el borrador posterior se mantienen durables y se restauran como edición. | Regresión desde biblioteca y E2E nuevo: timeout → editar → recuperar → F5 → PATCH al ID confirmado con la versión de creación. |
| RV08 | El borrador actual, incluido su archivo, se actualiza al editar. El registro conserva aparte un snapshot inmutable del borrador enviado con identidades locales y padres; la recuperación reconcilia contra ese snapshot, no contra un ref vacío. Un registro antiguo sin snapshot sólo se reconstruye si sus versiones prueban que no hubo cambios posteriores; de lo contrario requiere revisión. | Regresiones de etiqueta tras remontar y del árbol de composición: eliminar primer grupo, editar segundo, añadir opción, recargar y recuperar respuesta reordenada; se conservan IDs correctos, eliminaciones y opción nueva sin ID. |
| RV09 | Entradas, recetas y ofertas usan el identificador de `sessionStorage` de la pestaña. Ofertas verifica también el recurso del contexto anidado. | E2E con IndexedDB nativo y dos pestañas: borradores A/B aislados, F5 conserva cada uno y cancelar A no borra B. Inspección de los tres constructores de alcance. |
| RV10 | El resultado confirmado permanece registrado hasta resolver su composición. La creación ambigua consulta mediante el ID confirmado y bloquea otro POST; adoptar reemplaza composición/versión, conservando campos comerciales y archivo actuales. | Regresión de creación ambigua: dos montajes, consulta al ID devuelto, adopción con etiqueta/precio locales intactos y siguiente escritura PATCH al ID confirmado, sin POST nuevo. |
| RV11 | Recetas y ofertas inician otro intento del borrador corregido tras `pre_commit_rejected` (incluye 422 y el 502 contractual), con otra clave. No cambian el intento incierto para enviar las correcciones. | Dos regresiones 422 → corregir → guardar: segundo JSON corregido y clave distinta. La clasificación contractual sigue cubierta por la suite de respuestas. |
| RV12 | La elegibilidad de reintento usa una política común y un reloj compartido de UI. Oferta/editor y listado respetan el fin de Retry-After; el reloj no envía solicitudes. Una cabecera ausente/inválida mantiene la pausa y muestra el motivo. | Regresión de habilitación después del plazo; prueba del listado que bloquea el clic temprano, verifica cero envío automático y luego reutiliza la clave; regresión de cabecera inválida. |
| RV13 | Pantalla/panel, buscador, estados vacíos, paginación, confirmación, enlace de retorno y texto común están en una hoja de primitivas cargada por el shell. El estilo del enlace sobre cabecera oscura tiene prioridad explícita sobre el botón base. | E2E nuevo de carga directa y navegación catálogo → categorías → catálogo → recetas: igualdad de estilos, contraste del retorno y ausencia de overflow a 375/320 px. Captura revisada visualmente. |

Las regresiones nuevas están en `src/audit-recovery.regression.test.tsx`, `src/api/writeVersion.regression.test.ts` y `e2e/audit-review-regressions.spec.ts`. Son escenarios de pérdida de datos, recuperación, concurrencia y presentación; no se añadieron para completar cobertura.

## Riesgos de mantenimiento atendidos

- Guardar y Reintentar en ofertas comparten `executeSave`, `handleConfirmedResult` y `handleAttemptFailure`; la limpieza, reconciliación y navegación ya no tienen dos implementaciones divergentes.
- `useRetryEligibility` centraliza el reloj de interfaz y consume la misma autorización de `operationAttempt`; lo usan receta, editor de ofertas y listado. La política de cabecera inválida también se aplica en el controlador, por lo que un envío programático no evita el bloqueo.
- `submittedDraft` y `editableDraft` tienen responsabilidades separadas. El contador sólo cambia cuando cambia el borrador, no por pulsar Reintentar. Los resultados confirmados retenidos no se convierten en inciertos al vencer la ventana de recuperación.
- Los adaptadores IndexedDB por defecto tienen una instancia estable durante la vida del editor. Esto evita repetir restauraciones por render y remontar involuntariamente un diálogo recuperado.
- Las escrituras idempotentes continúan usando su solicitud original. PATCH de entrada/receta conserva su revisión de versión; no se agregó un mecanismo de reintento idempotente a esos PATCH ni a DELETE.
- No se hizo la refactorización de variantes de tipos de RV14 ni la reconstrucción de la matriz T18 de RV15.

## Ajustes justificados de pruebas existentes

Se corrigieron cuatro casos incompatibles con el comportamiento requerido, conservando sus comprobaciones de negocio:

1. La recuperación anidada sembraba el ámbito global de otra pestaña; ahora siembra el alcance de la pestaña actual.
2. La adopción de oferta esperaba sustituir etiqueta/precio, pese a que la UI promete conservarlos; ahora exige conservar el borrador comercial.
3. El listado esperaba reintentar inmediatamente con Retry-After de cinco segundos; ahora prueba bloqueo temprano, cero envío automático y reintento explícito posterior con la misma clave.
4. El contrato de PATCH esperaba descartar el ETag de la respuesta; ahora exige conservar ese ETag, manteniendo la verificación del If-Match original y de cero GET adicionales.

Los demás fallos se resolvieron en producción. No se redujeron umbrales ni se modificaron expectativas para ocultar defectos.

## Validación final

| Comprobación | Resultado |
| --- | --- |
| `npm run typecheck` | Pasa |
| `npm run lint` | Pasa, sin reducir reglas |
| `npm run test:unit -- --silent` | **28 suites / 455 pruebas pasan**; umbrales configurados satisfechos |
| `npm run build` | Pasa, 124 módulos |
| Chromium con assets del build interceptados | **40 E2E pasan**: 36 anteriores y cuatro regresiones nuevas |
| Grafo actualizado de dependencias | 116 módulos, cero imports sin resolver; reglas y configuración originales conservadas |
| Inspección visual | Cabecera, panel, buscador, estado vacío y enlace de retorno revisados en captura de carga directa |

Se añadieron 21 pruebas unitarias y cuatro E2E de casos reales. Los logs finales son `typecheck-final.log`, `lint-final.log`, `unit-final.log`, `build-final.log` y `e2e-final.log`. `provenance.json` registra hashes SHA-256 de las entradas y verifica los trece archivos E2E originales frente a sus copias ejecutadas. La captura es `test-results/audit-review-regressions-R-186c0--estilos-después-de-navegar-chromium/recipes-direct-fixed.png`.

Los comandos y resultados finales se registran en `.analysis/audit-fixes/`. La ejecución E2E estándar quedó esperando al servidor local en este entorno y se detuvo. La alternativa usa Chromium real en un origen confiable `http://localhost:4173` con HTML/CSS/JS de `dist` servidos mediante interceptación, sin depender del puerto local. Los casos E2E son copias exactas de los originales con una única sustitución del import de la fixture; no se cambian acciones, respuestas API ni expectativas. IndexedDB y las recargas son nativos del navegador. Esto valida cliente y presentación frente a las API simuladas, no las garantías internas del backend.

El registro histórico de T18 está marcado como no acreditado y la orquestación declara su estado pendiente. Tampoco se acredita aquí zoom real del navegador al 200 %.
