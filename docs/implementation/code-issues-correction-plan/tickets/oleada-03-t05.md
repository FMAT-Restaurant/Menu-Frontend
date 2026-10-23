# T05 — Guardado y recuperación de categorías

**Estado:** Pendiente de implementación.
**Oleada:** 3 · **Prioridad:** P1 · **Complejidad:** M
**Requisitos previos:** [T02A](oleada-02-t02a.md).
**Hallazgos propios:** G01, G02, G03, G04.
**Plan fuente:** [Plan de corrección](../audit-issues-correction-plan.md), ficha T05, reglas 3.4 y matriz 7.5.

## Instrucciones

1. Edita `src/features/categories/CategoryPage.tsx`, `CategoryFormDialog.tsx`, `CategoryPage.test.tsx` y `e2e/categories.spec.ts`. Consume sin modificar los puertos y operaciones integrados por T02A.
2. Bloquea campos y handlers sólo mientras la petición esté en curso. Tras timeout/IN_PROGRESS permite editar y mantén el envío original separado del borrador actual; impide otro guardado equivalente mientras se desconoce el anterior.
3. Conserva el formulario completo y ofrece mensajes/acciones apropiados para validación, permisos, conflicto e incertidumbre. La creación incierta se recupera con su misma clave/JSON, sin búsquedas por nombre ni otra categoría.
4. Tras éxito sin cambios posteriores, cierra/refresca una vez. Si existen cambios nuevos, conserva categoría confirmada y borrador para edición explícita, sin otro POST. Corregir los datos tras rechazo confirmado inicia otra operación expresamente.
5. En edición, conserva detalle/ETag de apertura; consulta y revisa ante 412 o incertidumbre, sin renovación y reenvío automático. Distingue cuenta desconocida, cero, uno y plural. Ajusta el doble para que el refresco incluya realmente la categoría creada.

## Invariantes

- Aplica 3.4 y el mecanismo común: cero reintentos automáticos, recuperación manual, errores de idempotencia distintos de 412 y borrador conservado ante fallos locales.
- Recargar restaura el mismo diálogo sin envío automático. Salir descarta su recuperación y bloquea respuestas tardías sobre otro formulario; una categoría ya creada permanece en servidor.
- El PATCH sigue sin Idempotency-Key. No conviertas el timeout de POST en un conflicto de versión.
- T06 posee el recorrido completo categoría → entrada → catálogo en catalog-traffic.spec.ts. Aporta el formulario corregido y no dupliques ese recorrido ni su reserva.

## Tests conceptuales

- Campos/handlers bloqueados durante la promesa y editables tras timeout/IN_PROGRESS; 422 con detalles conserva valores y 412 exige revisión.
- Sin cambios posteriores hay una continuación; con cambios se conserva el ID y el próximo guardado actualiza esa categoría. KEY_REUSED/IN_PROGRESS muestran sus acciones correctas, sin nueva creación.
- La lista posterior muestra la categoría creada. Ausencia de entryCount, cero, uno y plural se distinguen.
- Reutiliza solicitud/ID y recarga nativa de T02A. Comprueba el cableado particular en Jest y amplía categories.spec sólo por garantías distintas.

## Criterios de aceptación

- [ ] G01: ni campos ni handler permiten cambios/envíos durante la petición.
- [ ] G02: cada clase de fallo conserva borrador y ofrece recuperación correcta, sin otra categoría ni PATCH automático con nueva versión.
- [ ] G03: los cuatro casos de cuenta tienen representaciones diferentes.
- [ ] G04: el test comprueba el resultado visible tras crear, con un doble que cambia la lista.
- [ ] Typecheck y pruebas afectadas pasan; entrega evidencia y el formulario integrado para el recorrido de T06.
