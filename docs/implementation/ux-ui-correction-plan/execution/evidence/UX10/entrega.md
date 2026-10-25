# UX10 · entrega para integración

Base reanudada `b6d23ef8e9aa89251190745db0367fa102515330`. UX08 y UX09 estaban integradas como `3beabea` y `6318581`. Se conservaron los cambios de la sesión interrumpida. Esta entrega no acredita cierre de U16/U27 hasta completar la validación nativa centralizada.

## Cambio y límites

`OptionModal` es el único dueño de diálogo y `useTaskDialog` en el recorrido opción, selector y creación. `RecipeSelector` contiene búsqueda/resultados/asignación, sin la banda administrativa. `RecipeSelectionTask` mantiene la sesión de receta y el estado de búsqueda/página montados al volver. Los pasos inactivos usan `hidden` con CSS explícito. El foco depende de la transición: buscador al elegir, nombre al crear, Nueva receta al volver, Elegir receta al asignar, disparador de confirmación al continuar.

`RecipeFormContent` contiene la máquina operativa extraída de `RecipeFormDialog`; administración conserva un adaptador modal sobre el mismo contenido. Cambiar de paso no llama a abandonFlow/detachForReload. Se conservan resultado confirmado, modificaciones posteriores, retry con payload sellado, versiones de recurso y actualización separada de la creación. La recuperación limita su contexto a entrada/oferta e índices/identidad de opción, restaura File y no escribe al restaurar. Una operación pendiente de otra tarea bloquea una creación nueva.

Una receta editada permite seguir o conservar y volver dentro del mismo diálogo. Resultado pendiente/incierto tiene prioridad y bloquea esa salida. Cerrar opción modificada requiere decisión. Guardar una opción que todavía conserva un borrador de receta también requiere decidir entre continuar y descartar receta antes de guardar opción. Esta protección acotada evita desmontar silenciosamente la sesión; UX11 sigue a cargo de la política común.

Asignar receta no guarda oferta. Guardar opción sólo actualiza composición local. Se conservan localId, optionId, disponibilidad, nombre personalizado, recipeAssignmentToken y validación previa. UX08 conserva errores accesibles y controles; UX09 conserva imágenes y composición. CSS mantiene los nombres menu-dialog, recipe-form y offer-dialog y el límite por 100cqw.

Archivos de aplicación reservados/modificados: `src/features/offers/OfferFormPage.tsx`, `OptionModal.tsx`, `styles.css`; `src/features/recipes/RecipeFormDialog.tsx`, `RecipeFormContent.tsx`, `RecipeSelectionTask.tsx`, `RecipeSelector.tsx`, `styles.css`. Consumidores: OfferComponents.test.tsx, OfferFormPage.test.tsx y nuevo RecipeSelectionTask.test.tsx. No se modificaron módulos compartidos, API, App, configuración ni registry en esta reanudación.

## Dependencias y decisiones verificadas

Se releyeron imports y consumidores concretos. OfferFormPage usa RecipeSelectionTask y buildRecipeCreateScope; RecipePage sigue usando el adaptador RecipeFormDialog; ambos caminos consumen el mismo RecipeFormContent. La sesión depende de operationAttempt/storage existentes, sin segunda máquina. El grafo histórico de preparation.md sólo sirve de índice anterior a la extracción, no acredita los nuevos consumidores. No se generó callgraph global.

Para el fallo de foco se comprobó un efecto competidor: el selector enfocaba el buscador al activarse y el padre intentaba enfocar Nueva receta. Se dejó al selector como único responsable con destino explícito por sesión. Se corrigió código, no la expectativa. La revisión detectó después la pérdida de borrador al guardar opción; se añadió la decisión y un caso funcional de conservación/descartado explícito.

## Validación ejecutada

PowerShell con login:false. Sin E2E, servidores, navegador, build, cobertura ni commits desde esta reserva; root centraliza esas comprobaciones.

- `node node_modules/jest/bin/jest.js --runInBand --runTestsByPath src/features/offers/OfferFormPage.test.tsx src/features/offers/OfferComponents.test.tsx src/features/recipes/RecipePage.test.tsx src/features/recipes/RecipeSelectionTask.test.tsx src/audit-recovery.regression.test.tsx`: exit 0, 5 suites, 120 pruebas. Log `jest-final.log`. Incluye 116 consumidoras y cuatro casos nuevos reales de sesión.
- `node node_modules/@typescript/native/bin/tsc --noEmit`: exit 0, `types-final.log` sin errores.
- `node node_modules/eslint/bin/eslint.js` sobre los siete componentes/prueba de sesión y los dos E2E nuevos: exit 0, `lint-final.log` sin errores.
- Intentos auxiliares: npm12 rechazó el flag de npm test; el binario TypeScript supuesto en node_modules/typescript no existía. Se usaron los binarios instalados arriba. `jest-task-fixed.log` acredita 3/3 tras corregir foco; `jest-task-final.log` acredita 4/4 antes de ampliar la focalizada. Logs iniciales/adapted/lint previos pertenecen a la sesión reanudada y no reemplazan los finales.

Los cuatro casos nuevos comprueban query/página y borrador con ida/vuelta/foco/asignación única; incertidumbre con remount sin POST, mismo payload/clave al retry y posterior update versionado; limpiar búsqueda sin coincidencias con foco; y guardar opción con receta conservada exige decisión sin POST implícito.

## Compatibilidad y E2E entregados sin ejecutar

Las incompatibilidades estructurales se documentaron antes de editar en preparation.md. Se adaptaron únicamente premisas de múltiples ventanas y Escape global a cancel nativo/pasos, preservando O19/O34, borrador Papas Rústicas, composición, foco, recuperación F5 y contratos de escritura. Archivos: e2e/offer-form.spec.ts, operation-recovery.spec.ts, audit-closure-layout.spec.ts y ux-ui-03.demo.spec.ts. La confirmación de descarte expresa D04 dentro del contenedor único.

`e2e/ux-ui-10.demo.spec.ts` prepara cuatro escenarios: viewport390/1024 y host1440 con módulo600/740. Verifica identidad del nodo modal, máximo1, cero final, foco de pasos, Tab/Shift+Tab, scroll de fondo, búsqueda vacía/sin coincidencias, receta conservada, ancho modal y controles48. Genera PNG/JSON en outputPath y adjuntos.

`e2e/ux-ui-10.spec.ts` prepara HTTP422 de rechazo previo a escritura con nueva clave tras acción explícita y HTTP503 incierto con misma clave/payload al retry. Comprueba borrador de opción, query/página inicial, ausencia de guardado automático de oferta y cero modal final. Genera PNG del rechazo y JSON de solicitudes. El F5 real, sin POST al restaurar y retry sellado sigue en operation-recovery.spec.ts.

Estos scripts aún no acreditan resultados nativos ni existen aquí PNG/JSON de navegador. Root debe ejecutar, revisar capturas y corregir cualquier defecto de código observado antes de cierre. D01 shell real excluido; físico y lector de pantalla manual pendientes. D02 moneda pertenece a UX12, D03 rondas a UX14. No se implementaron UX11/12/13.

## Corrección tras validación nativa

Root conservó rondas negativas. Primero se corrigieron localizadores nuevos que no coincidían con los nombres accesibles existentes, sin alterar garantías. Después el navegador descubrió un defecto real al acumular Escape en el mismo diálogo. El diagnóstico `browser-noncancelable-negative/events390` muestra `cancelable:false`, preventDefault inefectivo, cierre nativo sin llamada JavaScript a close y fondo todavía bloqueado. Jsdom no reproduce esa política de CloseWatcher.

Se corrigió `OptionModal` con Escape local al diálogo, preventDefault y stopPropagation antes de la solicitud de cierre nativa. La función requestStepBack comparte la misma política con onCancel de respaldo y conserva el bloqueo pendiente/incierto. No se añadió listener global ni se modificó useTaskDialog. Un quinto caso nuevo recorre Escape local desde receta editada, conservación, selector, opción y confirmación, con borrador/foco y sin escritura implícita. Los casos anteriores conservan cancel nativo.

Verificación final tras esta corrección: 121/121, cinco suites, exit 0 en jest-final.log; tipos y lint finales exit 0. Los números 120/4 anteriores identifican el estado previo a esta corrección. Root ejecuta nuevamente los mismos escenarios nativos. Los diagnósticos del demo guardan eventos cancel/close/keydown, cancelable/defaultPrevented y estado open/modal antes de la aserción para conservar evidencia del defecto y la corrección.

Freeze de fuentes y E2E comunicado a root tras esta corrección. La integración y los hallazgos permanecen abiertos hasta la evidencia centralizada.
