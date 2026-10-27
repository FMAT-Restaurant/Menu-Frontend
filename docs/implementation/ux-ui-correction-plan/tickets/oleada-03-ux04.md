# UX04. Retirar marca interna y consolidar cabeceras locales

**Estado:** Pendiente de implementación.
**Oleada:** 3 · **Prioridad:** P2 · **Complejidad:** M.
**Requisitos previos:** [UX01](oleada-01-ux01.md), [UX03](oleada-02-ux03.md)
**Hallazgos propios:** U05, U06
**Aportes o condiciones que conserva:** U07, U08, U24
**Casos de verificación:** V03, V04, V18 de la sección 7.2 del plan.
**Habilita:** [UX05](oleada-04-ux05.md), [UX06](oleada-04-ux06.md), [UX07](oleada-04-ux07.md), [UX17](oleada-12-ux17.md)
**Plan fuente:** [Plan de implementación](../ux-ui-implementation-plan.md), ficha UX04, matriz de la sección 4, reservas de la sección 5.1 y verificaciones de las secciones 7 a 9.
**Evidencia de origen:** [Auditoría UX/UI](../audit/ux-ui-audit-2026-10-23.md).
**Reglas comunes:** [Índice de tickets](README.md), [DESIGN.md](../../../DESIGN.md) y [AGENTS.md](../../../../AGENTS.md).

## Instrucciones

1. Reservar `src/App.tsx` y `src/main.tsx` para `NotFoundPage`, las páginas de `src/features/catalog/`, `src/features/categories/`, `src/features/entries/`, `src/features/offers/` y `src/features/recipes/`, y sus reglas de cabecera y ancho. Retirar `.global-nav`, marca y texto global de las pantallas. No reemplazarlos por otra banda global obligatoria en la demo.

2. Componer una cabecera local con regreso, un título de tarea, contexto de entidad y acciones necesarias. Eliminar el rótulo repetido "Administración / Menú / Ofertas" cuando no aporta navegación. Retirar la banda oscura y títulos de colección duplicados de categorías y recetas. Usar superficies y alineación comunes. Documentar anchos de trabajo distintos solo cuando los justifique el contenido.

3. Añadir el destino de foco acordado por UX02 sin ejecutar todavía una segunda política de navegación. Preservar `returnTo`, filtros y páginas. Comparar el editor con la referencia del usuario y con la captura 31. La salida muestra el contenido de tarea desde el comienzo, sin los 72 px de marca interna. No se impone una altura exacta a la nueva cabecera.

4. Revisar catálogo, categorías, recetas, entrada nueva y editada, ofertas, editor y ruta inexistente. Ejecutar `App.test.tsx` y suites de las páginas afectadas. Confirmar D01 en UX17 antes de afirmar que el shell completo tiene una sola marca.

## Invariantes

- El shell conserva marca y navegación global. La demo no recibe una segunda barra de marca obligatoria.
- Una cabecera de tarea sigue siendo válida. No se impone una altura exacta ni un nuevo diseño global.
- Los marcadores de foco se preparan para UX15 sin introducir otro coordinador de navegación.
- U06 espera también el selector de UX10; U05 conserva la comprobación real de D01 en UX17.
- Cada test debe comprobar un caso real. Ante un fallo, investiga el código. Informa un defecto o incompatibilidad del test antes de modificarlo y conserva sus garantías funcionales.

## Tests conceptuales

- Recorre catálogo, categorías, recetas, entrada nueva y editada, listado de ofertas, editor de oferta y ruta inexistente.
- Compara la nueva cabecera con la referencia del usuario y la captura 31 del complemento de overlays. Comprueba eliminación de los 72 px de marca interna sin usar ese valor como altura de la nueva cabecera.
- Comprueba returnTo, filtros, páginas y destinos de regreso. Revisa títulos, contexto de entidad, acciones y alineación.
- Ejecuta App.test.tsx y suites de las páginas afectadas. Verifica que la corrección de imagen de UX01 y el contrato modal de UX03 se conservan.

## Criterios de aceptación

- [ ] Las pantallas y NotFoundPage dejan de renderizar .global-nav y funciones de marca del shell.
- [ ] Cada pantalla presenta una cabecera local coherente, sin banda administrativa oscura ni títulos y rótulos repetidos que no aporten contexto.
- [ ] Los anchos de trabajo distintos tienen justificación por contenido. Los marcadores de cabecera cumplen el contrato compartido.
- [ ] La navegación conserva sus parámetros y contexto, con capturas comparables de todas las rutas.
- [ ] El registro identifica el aporte posterior de UX10 a U06 y la verificación de shell pendiente para U05.

## Entrega

Registra base, archivos reales, reservas, comandos y resultados, casos y evidencia por ID según la [entrega común](README.md#entrega-y-cierre). Distingue integración del ticket y cierre de hallazgos. Las instrucciones anteriores describen trabajo futuro y no acreditan una corrección ya ejecutada.
