# Entrega UX09

Ticket UX09, composición, tarjetas y controles de ofertas. Agente `/root/ux09_offers`. Base `620c027`, rama `feature/ux-ui-improvement`. UX00–UX07 integradas antes del despacho; UX08 trabaja en recetas en paralelo. Estado solicitado: en revisión, pendiente de verificación visual e integración por root.

## Archivos y alcance

- `CompositionEditor.tsx` retira copiar composición y conserva los callbacks de grupos/opciones.
- `SlotCard.tsx` y `SlotOptionItem.tsx` presentan estados con punto y texto, controles separados y acciones secundarias para retirar del borrador. La ayuda aclara que se aplican al guardar. No existía confirmación en esos handlers locales y no se incorpora persistencia ni recuperación nuevas.
- `OptionModal.tsx` retira la selección pendiente de inventario. Conserva el selector de receta y el contenido/edición de opciones INVENTORY_ITEM existentes.
- `OfferCard.tsx` separa estado y acción Activar/Desactivar, mantiene las restricciones y confirmación en OffersPage, añade ayuda de desactivación antes de eliminar y claves `offer:<id>`, `:edit`, `:status`, `:delete` únicas. Conserva returnTo/catalogReturnTo.
- `OfferCommercialInfo.tsx` sustituye emoji por `Icon image` compartido. Cambiar imagen permanece visible en la vista previa. Se conserva botón nativo, teclado, archivo, drop y validación.
- `styles.css` elimina mínimos rígidos y scroll horizontal de composición. El formulario y el módulo de ofertas tienen contenedores propios; los grupos se apilan por debajo de 768 px útiles. Adopta geometría 8/12, títulos 18/26 y 22/30, metadatos de al menos 12/16 y controles 40/48 con crecimiento para texto. Curso/cantidad son neutros y se retiran franjas de grupos/opciones.
- `OfferComponents.test.tsx` y `OfferFormPage.test.tsx` adaptan sólo expectativas incompatibles comunicadas antes del cambio, detalladas en impact.md. `OfferPresentation.ux.test.tsx` añade un escenario real de oferta sin etiqueta, estado separado, eliminación restringida y claves únicas por acción.
- `e2e/ux-ui-09.demo.spec.ts` prepara tres regresiones con evidencia física JSON/PNG vía outputPath y attach por path. No modifica configuración común.

Todos los archivos de producción y tests están dentro de la reserva ofertas, además del E2E UX09 y esta carpeta. No se editaron App, main, BASE/shared, recetas, registro común ni auditoría histórica. No se hicieron commits, build, cobertura, servidores ni ejecuciones E2E desde este agente.

## Contratos y consumidores

Los consumidores directos son OfferFormPage, OffersPage, CompositionEditor y sus componentes. Se contrastó el grafo fresco `.analysis/ux-ui-wave05-dependencies.json` con los imports y callbacks reales. El único vínculo estático nuevo es OfferCommercialInfo → shared/Icon, cuya actualización del índice corresponde a root al integrar. El índice no demuestra CSS ni comportamiento.

No cambian identidades, opción/grupo persistidos o locales, payloads, ETag, versiones, idempotencia, reconciliación, incertidumbre, activación ni reglas de publicación. No cambia OfferFormPage, por lo que se conservan todos los handlers y pasos antes de UX10. No se añade barra de guardado ni formato de importe. D05 mantiene tipos y 10 MiB. La protección común corresponde a UX11.

La imagen U01 conserva la misma caja reservada de 112 px, posición absoluta del img, object-fit y límites; el título, entrada y precio siguen fuera de esa caja. Root debe repetir sus diez regresiones con los estilos finales.

## Verificación

`unit.log`, `typecheck.log` y `lint.log` contienen las últimas ejecuciones focalizadas, sin cobertura. La primera ejecución descubrió expectativas de pendientes y texto dentro del control incompatibles con UX09, informadas antes de adaptarlas. Una repetición intermedia aprobó 95/95. Durante la integración concurrente UX08 se identificaron tres nombres exactos `✕ Cancelar` incompatibles con SVG decorativo y Cancelar; se informó y root autorizó cambiar sólo el nombre, conservando cierres/borrador/PATCH. Los errores transitorios de Icon sin uso y fixture sin image fueron corregidos antes de la ejecución final.

Las tres regresiones preparadas comprueban:

1. Dos grupos y varias opciones con estado activo/inactivo; viewport 320/390/600/740/1024/1440, módulo en host de 1440 y ancho propio de formulario. Miden ancho útil, columnas, orden vertical, controles, texto sin recorte, metadatos y ausencia de franjas. Guardan seis pares PNG/JSON y una matriz completa.
2. Edición de opción de inventario existente, Cambiar imagen visible sin hover, selector por Enter y tacto emulado, archivo y preview blob. No equivalen a dispositivo físico.
3. Guardado real de oferta sin etiqueta en demo, indicadores activo/inactivo separados, eliminación activa restringida, confirmación y cancelar de oferta inactiva, claves únicas y retorno a filtros del catálogo.

Resultado focalizado final: cuatro suites y 96 tests pasan en 24,573 s. Typecheck y ESLint focalizado pasan. `git diff --check` del alcance de ofertas pasa. Los tres Cancelar se localizan dentro del diálogo Biblioteca de recetas, conservando la selección del control correcto frente al modal padre en jsdom. La producción queda congelada para el turno integrado de build/navegador de root.

Se vigilan cero API y cero errores JavaScript en los escenarios demo preparados. Sus datos se preparan por la UI del repositorio en memoria, sin interceptar API. La evidencia de navegador aún debe ser ejecutada e inspeccionada por root; no se presenta una prueba escrita como resultado aprobado.

## Aportes y pendientes

Se reúnen los aportes integrados de [UX06](../UX06/entrega.md), commit `487340e`, y [UX07](../UX07/entrega.md), commit `bf7d6cb`: estados, acciones secundarias, controles, tipografía y responsive según contenedor. UX08 debe aportar recetas antes de proponer cierre conjunto U09/U10/U19. No se cierran esos hallazgos con ofertas solamente.

U02/U21/U23 tienen implementación y regresiones preparadas. Sus medidas y capturas finales, U01 y V01/V02/V03/V05/V06/V13/V18 esperan el turno de navegador de root. U03/U07/U08/U22/U24 reciben aportes de geometría/estados/identidades, sujetos a los demás consumidores. Dispositivo físico, teclado virtual y lector manual siguen pendientes. D01 shell está excluido del alcance actual.

La integración, revisión visual, registro y liberación de reserva corresponden a root. No hay procesos de servidor propios activos.
