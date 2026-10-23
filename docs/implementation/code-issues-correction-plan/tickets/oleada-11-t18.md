# T18 — Verificación integrada y cierre de la auditoría

**Estado:** Pendiente de implementación.
**Oleada:** 11 · **Prioridad:** P0 · **Complejidad:** M
**Requisitos previos:** [T16](oleada-10-t16.md), [T17](oleada-01-t17.md).
**Hallazgos propios:** Ninguno; verifica los 104 cierres sin duplicar responsables.
**Plan fuente:** [Plan de corrección](../audit-issues-correction-plan.md), ficha T18 y secciones 7, 8 y 9 completas.

## Instrucciones

1. Integra la evidencia de todas las tareas en el registro de ejecución/cierre de `docs/implementation/audit-issues-correction-plan/audit-issues-correction-plan.md` y sus artefactos auxiliares en `.analysis`. Cada fila debe identificar ID/tarea, responsable, base/entrega, archivos reales, caso/comando con resultado y pendiente o cierre. Consulta todos los tickets y la auditoría original.
2. Cruza los 104 IDs, gravedad, responsable y condición individual de la matriz con la evidencia entregada. Verifica especialmente los ocho altos: A01, E03, O11, O12, O17, O23, P07 y P09. Si falta evidencia o queda una regresión, conserva estado pendiente y su motivo.
3. Comprueba DEC-01, DEC-02 y contrato v7.0.0: recetas sin recipeRevision en ofertas, intención de conservar/reasignar, Inventario parametrizado y seis operaciones protegidas con solicitud/clave originales. Verifica recarga, salida, cambios posteriores, archivo/tipo, If-Match y correspondencia segura de composición según 3.4/3.6.
4. Ejecuta sobre una misma base integrada typecheck, lint, unitarias con cobertura, build y todos los E2E, existentes y nuevos, mediante los comandos de 8.1. Usa el servidor de preview del build comprobado, base URL y Chromium registrados; no reutilices un servidor antiguo.
5. Contrasta los resultados con T00. Distingue fallos previos, regresiones, tests nuevos y evidencia inicial ausente por impedimento; no inventes un resultado de base ni uses un fallo previo como aprobación final.
6. Reutiliza las pruebas existentes según 8.2/8.3: las seis recargas del E2E común, categoría → entrada → catálogo de T06 y crear/borrar oferta → conteos de T07, además de diálogos, rutas y presentación. Identifica archivo y nombre de caso por condición; no crees otra suite que repita esos recorridos.
7. Comprueba parámetros, evidencia visual y cobertura trasladada. Inspecciona el diff final y actualiza/contrasta el grafo después de las migraciones. Retira compatibilidades provisionales, callbacks vacíos y casts que oculten migraciones; conserva el trabajo previo del usuario.
8. Limita las ediciones a registro y ajustes de integración localizados, con responsable original y pruebas pertinentes. No incorpores nuevas funciones ni cambios de backend para cerrar esta entrega.

## Invariantes

- Los 104 hallazgos conservan su dueño; E05 queda excluido. Una decisión documentada, un UUID aislado o un test que sólo comprueba llamadas no acreditan una corrección.
- Los PATCH de entradas/categorías/recetas conservan consulta/revisión; DELETE incierto usa consulta normal sin otra revisión ni repetición automática. No atribuyas idempotencia a operaciones fuera del contrato.
- Recargar ofrece recuperación manual; salir descarta recuperación local, bloquea continuaciones y no envía escrituras para deshacer lo confirmado. Las funciones pendientes de copiar/seleccionar Inventario de ofertas siguen pendientes y honestamente deshabilitadas.
- Mocks comprueban comportamiento cliente, no registro persistente, restricción única, transacción, recuperación de archivos ni outbox del servidor. Registra separadamente evidencia real disponible sin exigir implementar el backend aquí.
- No rebajes cobertura ni alteres configuración de dependency-cruiser para ocultar advertencias previas. Un resultado no ejecutado no es un resultado aprobado.

## Tests conceptuales

- Comprueba que cada ID tiene un caso que falla ante su defecto original y evidencia ejecutada en la base final; un mismo caso puede cubrir varias condiciones si demuestra sus efectos.
- Revisa identidad y resultado de las seis operaciones, diferencias entre ejecución nueva/reproducción y campos actuales frente a solicitud pendiente, sin duplicar sus matrices.
- Acredita 12/20/120 s por petición, cero reintentos automáticos, LRU de 50 consultas y TTL fijo de 30 s mediante los casos comunes ya integrados.
- Verifica todos los escenarios de 8.3 y los resultados de T16: cuatro tamaños, tolerancia horizontal de 1 px, diálogos de hasta 90 %, capturas antes/después y revisión manual de zoom real al 200 %.

## Criterios de aceptación

- [ ] Los 104 cierres individuales están acreditados, incluidos los ocho altos, sin pérdidas/duplicados ni E05. Cualquier pendiente impide anunciar corrección completa.
- [ ] Contrato, decisiones y políticas de recuperación/identidad están implementados con evidencia correspondiente a cada capa.
- [ ] Typecheck, lint, unitarias con cobertura, build y E2E completo pasan en la misma base y se comparan correctamente con T00.
- [ ] Parámetros de 3.5, cobertura conservada y presentación/zoom real tienen resultados verificables.
- [ ] Diff final, migraciones y grafo están revisados; las diferencias previas del usuario permanecen preservadas.
- [ ] El registro distingue evidencia cliente, evidencia externa disponible y limitaciones reales; no declara cerrado algo pendiente o no probado.
