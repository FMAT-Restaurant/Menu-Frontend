# Comparación de revisión y correcciones del 22 de octubre de 2026

> **Antecedente histórico.** El resultado siguiente corresponde a la base comparada el 22 de octubre. RV14–RV16 y la acreditación de T18 se resolvieron posteriormente en el [informe de cierre](closure-2026-10-22.md), verificado el 23 de octubre; no se reescriben aquí sus conclusiones históricas.

**Resultado: RV01–RV13 tienen correcciones y evidencia registrada; RV14, RV15 y RV16 permanecen abiertos. T18 continúa pendiente.** Son 13 hallazgos atendidos de los 16 de la revisión, no 104 cierres acreditados del plan original. Los tres pendientes tienen prioridad P2 en la revisión.

Fuentes: [revisión](review-2026-10-22.md), [correcciones](corrections-2026-10-22.md), [plan](../implementation/audit-issues-correction-plan/audit-issues-correction-plan.md) y [orquestación](../implementation/audit-issues-correction-plan/orchestration.md). Esta comparación no modifica producción ni pruebas y no constituye otra auditoría completa del código.

## Hallazgos que quedan abiertos

| ID | Estado contrastado | Trabajo faltante y condición de cierre |
| --- | --- | --- |
| **RV14 — D01 / tipos de opciones** | Sin corregir. `RecipeSlotOptionUpdate` e `InventoryItemSlotOptionUpdate` siguen teniendo `optionId` y los datos de origen opcionales. `OptionDraft` conserva ambos orígenes en una estructura de campos opcionales. La adición de `recipeAssignmentToken` resuelve una intención posterior de RV06, pero no cambia este contrato. | Separar variantes de opción nueva/existente y RECIPE/INVENTORY_ITEM; exigir los datos de origen de una opción nueva y permitir las omisiones contractuales de una existente. Separar el borrador incompleto del payload válido. Revisar mapeos, validaciones y consumidores; acreditar casos de compilación válidos/inválidos y JSON real, sin casts o defaults que oculten invariantes. Dueño original: T08, D01/O21. |
| **RV15 — matriz T18** | Parcialmente atendido sólo en el estado documental: T18 y la orquestación advierten que el cierre no está acreditado. La matriz histórica conserva las discrepancias y sus antiguas declaraciones de cierre bajo esa advertencia. | Reconstruir la matriz con los 104 IDs originales, significado, gravedad, dueño y condición de cierre. Asociar evidencia individual vigente, incluida la reapertura de lo que siga incumplido; contrastar los ocho altos y los requisitos integrados de la sección 9. Sólo entonces decidir el cierre de T18. Marcarlo pendiente fue necesario, pero no resuelve la matriz. |
| **RV16 — zoom real al 200 %** | Sin acreditar. El informe de correcciones lo reconoce expresamente. `audit-layout.spec.ts` sigue usando `style.zoom` y un viewport reducido; T16 conserva una afirmación de éxito sin el registro manual concreto exigido. | Ejecutar zoom real del navegador al 200 %, registrar navegador/entorno, viewport inicial y resultante, capturas y resultado de acceso por teclado/desplazamiento a campos y Guardar/Cancelar. Actualizar T16/T18 según la evidencia. Acreditar también la comparación visual antes/después por área, escritorio y móvil, prevista por T16. No se ha demostrado aquí un fallo visual a zoom real; falta demostrar el cumplimiento. |

La comparación de IDs del árbol actual confirma **104 en el plan frente a 105 en la matriz T18**:

- Faltan en T18: `D02`, `D03`, `D04`, `G01`, `G02`, `G03`, `G04`, `P17`.
- Sobran respecto al plan: `C17`, `C18`, `E09`, `E10`, `E11`, `E12`, `E13`, `E14`, `E15`.
- Además del conteo, deben corregirse los significados desplazados. Por ejemplo, A02 trata de ETag fuerte en el plan; E03, de coherencia de activación; O23, de proteger el `finally` de los listados. La matriz histórica les atribuye otras condiciones.

## Qué quedó atendido y qué no implica

El informe de correcciones tiene una fila y comprobaciones concretas para cada ID de RV01 a RV13: salida de cadenas, conservación de identidad y borradores, persistencia previa al envío, recuperación tras recarga, par detalle/ETag, continuidad después del éxito, aislamiento entre pestañas, composición ambigua, rechazo confirmado, Retry-After y estilos compartidos. No falta una fila de corrección para ninguno de esos trece IDs.

Los riesgos de mantenimiento tienen correspondencia concreta:

| Riesgo de la revisión | Respuesta de las correcciones | Pendiente |
| --- | --- | --- |
| Duplicación de Guardar/Reintentar en ofertas | Ambos caminos llaman a `executeSave`, con `handleConfirmedResult` y `handleAttemptFailure` comunes. Confirmado en el código actual. | No queda una omisión documental identificada para esa duplicación. |
| Políticas divergentes de Retry-After y transición tras rechazo | `useRetryEligibility` compartido por recetas, editor y listado de ofertas; autorización en el controlador; nuevos intentos tras rechazo confirmado en recetas/ofertas. | La evidencia atiende las divergencias señaladas. No acredita una unificación completa de todos los formularios ni la exige para cerrar esta comparación. |
| Invariantes débiles de opciones | Se excluyó expresamente la refactorización. | **RV14 sigue abierto**, también como riesgo de mantenimiento. |

No se reabre RV01–RV13 únicamente porque T18 esté pendiente. Tampoco se declara que esos trece cambios estén libres de cualquier otro defecto: esta tarea compara alcance y evidencia, sin repetir todas las reproducciones ni otra revisión completa de la implementación.

## Evidencia disponible y límites de acreditación

Se inspeccionaron los logs finales existentes: **28 suites / 455 unitarias** y **40 E2E** aprobados. Los 101 archivos registrados en `provenance.json` coinciden por SHA-256 con el árbol actual. Esto vincula la evidencia conservada con esas entradas actuales; no se ejecutaron nuevamente las suites durante esta comparación.

La limitación de la ejecución E2E estándar sigue expresada: quedó esperando al servidor local y se detuvo. Los 40 casos sí se ejecutaron en Chromium real mediante interceptación de assets de `dist`, con API simulada e IndexedDB nativo. No corresponde clasificarlos como inexistentes o fallidos, ni usarlos para acreditar el servidor preview, un despliegue o las transacciones internas del backend.

La captura de recetas corregidas y los casos a 320/375 px cubren RV13. No sustituyen el zoom real ni la comparación visual completa antes/después por área exigidos para T16/T18. Los totales verdes tampoco sustituyen la matriz individual de los 104 IDs ni su comparación con la línea base T00.

## Orden propuesto para terminar

1. Resolver RV14 y sus consumidores con evidencia del contrato de tipos y payloads.
2. Completar RV16 y registrar las verificaciones visuales exigidas por T16.
3. Reconstruir RV15/T18 sobre la base integrada final: conservar IDs originales, contrastar cada condición y registrar las verificaciones de calidad, contratos y presentación de la sección 9. Si aparece un incumplimiento, mantenerlo abierto en esa matriz.

No se necesita otra corrección para «marcar T18 pendiente»: ya está hecho. Lo que falta es producir la acreditación válida que permita cambiar ese estado.
