# T02A — Categorías con versión de apertura y creación recuperable

**Estado:** Pendiente de implementación.
**Oleada:** 2 · **Prioridad:** P0 · **Complejidad:** M
**Requisitos previos:** [T01](oleada-01-t01.md).
**Hallazgos propios:** Ninguno.
**Aportes:** Casos de categoría de A01 y A09.
**Plan fuente:** [Plan de corrección](../audit-issues-correction-plan.md), ficha T02A, acuerdos 3.2–3.4 y verificación 8.1–8.3.

## Instrucciones

1. Reserva los métodos/tipos de categorías en `src/application/catalog.ts`, `src/api/menuApi.ts` y sus tests; `src/features/categories/CategoryPage.tsx`, `CategoryFormDialog.tsx` y sus tests; `e2e/categories.spec.ts` y los dobles/interceptores realmente afectados, incluidos los de App.
2. Introduce la forma compartida de detalle asociado a su ETag y la consulta `getCategory`. El dato validado y la cabecera HTTP deben permanecer vinculados al abrir la edición; no aceptes un ETag del JSON como sustituto.
3. Haz que `updateCategory` reciba la versión de apertura y elimina la consulta que sólo renueva el ETag al guardar. Conserva el borrador ante 412 o incertidumbre, con consulta/revisión y adopción explícita de datos/versión antes de otro guardado.
4. Migra `createCategory` con identidad obligatoria de operación, almacenamiento y recuperación manual en el diálogo. Aplica toda la política de 3.4, incluida separación entre solicitud enviada y borrador editable, fallos locales y éxito con cambios posteriores.
5. Crea `e2e/operation-recovery.spec.ts` con el caso de categorías y recarga real. Migra juntos todos los consumidores, dobles y expectativas de estos métodos. Esta entrega debe funcionar sin esperar recetas, entradas u ofertas.

## Invariantes

- El POST usa una clave por creación lógica y conserva el JSON original; ni timeout ni IN_PROGRESS permiten crear otra categoría por nombre o rotar la clave silenciosamente. El PATCH de categorías no tiene Idempotency-Key.
- Recargar restaura diálogo, solicitud y borrador sin enviar. Salir descarta esa recuperación y bloquea efectos tardíos, sin deshacer escrituras remotas.
- Los campos pueden editarse entre intentos inciertos; Reintentar usa la solicitud anterior. Si se confirma la creación con cambios nuevos, conserva su ID y los cambios pendientes para una actualización explícita, sin otro POST ni cierre que los pierda.
- Mantén los plazos y errores comunes de T01. No cambies todavía las firmas de las otras familias ni edites el modal/tests de ofertas reservados a T09.
- Conserva los consumidores ya acotados por T17. Si descubres otro archivo necesario, registra y reserva esa ampliación antes de editarlo.

## Tests conceptuales

- Abrir v1, producir un cambio externo a v2 y guardar con v1 devuelve 412, sin GET de renovación. El borrador completo permanece y adoptar v2 es una acción explícita.
- POST aplicado sin respuesta: recuperar con la misma clave/JSON devuelve el mismo ID y 201, con una sola continuación.
- En navegador, recarga el diálogo pendiente; no hay POST al montar y Reintentar usa la operación conservada.
- En Jest del formulario, conexión de almacenamiento fallido, avisos y cambios posteriores al envío. Reutiliza las tablas de tiempos/códigos de T01, sin repetirlas completas en navegador.

## Criterios de aceptación

- [ ] Categorías queda migrado de extremo a extremo, sin consumidores antiguos ni claves generadas por el transporte.
- [ ] Los casos de categoría aportados a A01/A09 identifican la evidencia que reutilizarán T02B/T02D; no se adjudica aquí su cierre global.
- [ ] La recarga nativa de categorías pasa y queda integrada en el E2E común que ampliarán las siguientes entregas.
- [ ] Typecheck, pruebas afectadas y build pasan; si se extrae lógica sujeta al 80 %, conserva su garantía con la reserva mínima de configuración.
- [ ] Entrega evidencia y libera adaptador/tipos y pruebas para T02B. T05 completará los hallazgos de presentación y guardado de categorías sin volver a migrar el contrato.
