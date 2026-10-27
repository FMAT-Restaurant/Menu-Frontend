# UX06. Corregir tarjetas y adaptación del catálogo

**Estado:** Pendiente de implementación.
**Oleada:** 4 · **Prioridad:** P2 · **Complejidad:** M.
**Requisitos previos:** [UX04](oleada-03-ux04.md)
**Hallazgos propios:** U11
**Aportes o condiciones que conserva:** U03, U07, U08, U09, U10, U19, U22, U24
**Casos de verificación:** V02, V03, V05, V06, V18 de la sección 7.2 del plan.
**Habilita:** [UX09](oleada-05-ux09.md), [UX17](oleada-12-ux17.md)
**Plan fuente:** [Plan de implementación](../ux-ui-implementation-plan.md), ficha UX06, matriz de la sección 4, reservas de la sección 5.1 y verificaciones de las secciones 7 a 9.
**Evidencia de origen:** [Auditoría UX/UI](../audit/ux-ui-audit-2026-10-23.md).
**Reglas comunes:** [Índice de tickets](README.md), [DESIGN.md](../../../DESIGN.md) y [AGENTS.md](../../../../AGENTS.md).

## Instrucciones

1. Reservar `src/features/catalog/CatalogPage.tsx`, `CatalogFilters.tsx`, `CatalogResults.tsx`, `EntryCard.tsx`, `src/features/catalog/styles.css` y sus tests. Mostrar un enlace o acción inequívoca "Ver ofertas", con conteo si ayuda. Distinguirlo de editar la identidad de la entrada. Evitar controles interactivos anidados y conservar la secuencia de teclado.

2. Reducir la jerarquía de eliminar y comunicar la condición de archivado de forma visible o mediante ayuda accesible con teclado y tacto. Si se usa un menú de acciones, debe abrir, recorrer y cerrar con teclado y devolver el foco. Conservar identificación y confirmación para la eliminación definitiva.

3. Aplicar una columna con ancho útil inferior a 768 px. La cuadrícula del catálogo usa dos columnas en tableta y tres o cuatro desde 1200 px útiles, con el contenido legible y los controles táctiles necesarios. Reorganizar filtros y selector de tamaño de página sin comprimir "12" a "1" ni reducir la altura para encajar. Conservar búsqueda, estado, categorías, paginación y destinos de regreso. Añadir identidades estables para que UX15 restaure el foco de origen.

4. Probar 320, 390, 740, 768 y 1200 px útiles, nombres largos, varias categorías y estados distintos. Ejecutar `CatalogPage.test.tsx`, `CatalogPage.remediation.test.tsx`, `CatalogResults.test.tsx` y E2E de catálogo afectados. No mostrar un precio único inventado en la entrada.

## Invariantes

- Ver ofertas y Editar son destinos distintos y visibles. No anides controles interactivos ni inventes un precio único para la entrada.
- Eliminar conserva identificación, confirmación y restricciones. La ayuda no depende exclusivamente del atributo title o del hover.
- Esta tarea posee catálogo; UX05 y UX07 poseen categorías y entradas. Los archivos compartidos y la configuración E2E tienen un editor por turno.
- Cada test debe comprobar un caso real. Ante un fallo, investiga el código. Informa un defecto o incompatibilidad del test antes de modificarlo y conserva sus garantías funcionales.

## Tests conceptuales

- Prueba nombres largos, varias categorías y estados distintos a 320, 390, 740, 768 y 1200 px útiles, incluidos los límites 767/768 y 1199/1200.
- Comprueba una columna por debajo de 768 px, dos en tableta y tres o cuatro desde 1200 px útiles, con controles táctiles sin encoger.
- Usa teclado para abrir Ver ofertas y Editar, y para abrir, recorrer y cerrar cualquier menú de acciones. Comprueba explicación accesible de eliminación restringida y retorno del foco.
- Comprueba que el selector de tamaño muestra 12 completo y conserva búsqueda, estado, categorías, página y regreso.
- Ejecuta CatalogPage.test.tsx, CatalogPage.remediation.test.tsx, CatalogResults.test.tsx y los E2E de catálogo afectados.

## Criterios de aceptación

- [ ] U11 tiene una acción Ver ofertas inequívoca, distinta de Editar y operable con teclado.
- [ ] Las tarjetas priorizan consulta y edición; la eliminación secundaria conserva confirmación y una restricción comprensible.
- [ ] Filtros, selector de tamaño y tarjetas se adaptan al ancho útil sin texto cortado ni scroll horizontal necesario.
- [ ] Las identidades de origen quedan disponibles para UX15 y el regreso conserva los parámetros actuales.
- [ ] La entrega aporta capturas y medidas a los responsables de los hallazgos compartidos; el cierre responsive conjunto espera también UX08 y UX09.

## Entrega

Registra base, archivos reales, reservas, comandos y resultados, casos y evidencia por ID según la [entrega común](README.md#entrega-y-cierre). Distingue integración del ticket y cierre de hallazgos. Las instrucciones anteriores describen trabajo futuro y no acreditan una corrección ya ejecutada.
