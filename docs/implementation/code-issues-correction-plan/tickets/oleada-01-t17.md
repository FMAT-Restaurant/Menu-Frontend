# T17 — Acotar los consumidores del repositorio con Pick

**Estado:** Pendiente de implementación.
**Oleada:** 1 · **Prioridad:** P2 · **Complejidad:** S
**Requisitos previos:** [T00](oleada-00-t00.md).
**Hallazgos propios:** D02.
**Plan fuente:** [Plan de corrección](../audit-issues-correction-plan.md), ficha T17 y matriz 7.3.

## Instrucciones

1. Revisa los métodos realmente usados antes de editar. Acota con Pick los tipos de props/parámetros de `src/features/catalog/CatalogPage.tsx`, `src/features/entries/EntryFormPage.tsx`, `useEntryForm.ts`, `useEntryResources.ts` y `src/features/offers/OfferFormPage.tsx`.
2. Adapta sus dobles en `CatalogPage.test.tsx`, `CatalogPage.remediation.test.tsx`, `EntryFormPage.test.tsx` y `OfferFormPage.test.tsx` en sus respectivas carpetas. Incluye las capacidades que el editor entrega a su selector de recetas hijo.
3. Usa `src/App.test.tsx` sólo para concentrar la preparación repetida del repositorio completo si hace falta. Las llamadas no preparadas deben fallar explícitamente, sin métodos ficticios de éxito.
4. Conserva los consumidores de categorías, RecipePage, OffersPage y entryCategories que ya usan Pick. Las entregas posteriores actualizarán únicamente sus conjuntos locales cuando incorporen métodos contractuales.

## Invariantes

- MenuRepository permanece en `src/application/catalog.ts`; App y el adaptador conservan la interfaz completa y la misma instancia compartida.
- No crees otro módulo de puertos, no muevas DTO ni recompongas la interfaz. No alteres firmas, payloads o comportamiento.
- No edites API, caché, OfferComponents.test ni la configuración de Jest, reservados a las otras tareas de esta oleada.
- Esta acotación no constituye una dependencia funcional de los estilos de T16.

## Tests conceptuales

- Un consumidor de entradas o catálogo compila y funciona con sus métodos sin tener que proporcionar recetas/ofertas ajenas.
- El editor de ofertas conserva todas las capacidades necesarias para el selector hijo.
- App/API siguen usando el repositorio completo y las rutas reciben la misma instancia.

## Criterios de aceptación

- [ ] D02: sólo los consumidores pendientes quedan acotados y sus dobles dejan de exigir métodos ajenos.
- [ ] Typecheck completo y unitarias de los consumidores modificados pasan.
- [ ] Los contratos de producción permanecen iguales y los imports se contrastan si cambian.
- [ ] Entrega evidencia y libera esos consumidores para las migraciones siguientes; no añadas E2E ni otra suite general por este cambio de tipos.
