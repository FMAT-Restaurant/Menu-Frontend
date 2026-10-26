# UX14. Texto operativo

Base leída e implementada desde `1f415c4`, con UX13 en `25c996b`. La preparación se contrastó con los recibos, terminales y cierres actuales antes de editar. No se modificaron `audit/`, DESIGN.md, la máquina de operaciones, validadores de imagen ni contratos API.

Se aplicaron ui-ux-pro-max para etiquetas visibles, ayuda persistente, claridad de errores y recuperación, y unslop para retirar repeticiones y términos de implementación que no ayudan a decidir. Se conservaron las palabras servidor y borrador donde distinguen datos confirmados de cambios locales.

## Decisión e impacto

Se consultaron los vecinos directos del índice `.analysis/ux-ui-wave09-integrated.json` con depcruise-fmt y se contrastaron los componentes y consultas de tests. SlotModal depende del guard y del diálogo compartidos; sus consumidores editan la misma `quantity`. OfferCommercialInfo presenta el estado pedido, mientras OfferFormPage calcula el estado enviado. EntryFormFeedback consume las categorías cargadas y conserva las decisiones de adoptar o mantener borrador. RecipeFormContent y CategoryFormDialog usan los estados del controlador para distinguir una nueva operación requerida de caducidad e incertidumbre.

Se cambió presentación y mensajes, sin cambiar reglas, fuentes, IDs, versiones o reintentos. CategoryPage incorpora el SVG compartido, corrección de adopción de UX02 detectada por root. El nuevo import requiere que root actualice el grafo al integrar la oleada. El índice estático sólo localiza candidatos; las consultas literales y los estados se contrastaron en fuente y pruebas.

## Tabla revisada

| Texto anterior y consumidor | Texto resultante | Estado operativo real | Acción o garantía |
| --- | --- | --- | --- |
| Unidades incluidas, SlotModal | Rondas de selección. Indica cuántas veces se elige entre las opciones de este grupo. | Edición local de grupo | Conserva `quantity` como entero positivo seguro. No cambia inventario. |
| La cantidad de rondas debe ser al menos 1 | Escribe un número entero de rondas de selección, igual o mayor que 1. | Validación antes de guardar grupo | Rechaza cero, fracciones y negativos, sin llamar onSave. |
| 1 ronda o n rondas, SlotCard | 1 ronda de selección o n rondas de selección | Resumen local | Muestra el mismo valor del editor. |
| Cada grupo define su participación y cantidad | Cada grupo indica cuántas rondas de selección incluye. En cada ronda se elige entre sus opciones. | Edición de composición | Distingue rondas de cantidades y unidades de insumos. |
| Grupo (slot), validación de composición | Grupo | Composición vacía o incompleta | Conserva mínimo de grupos y opciones válidas. |
| Hasta aprox. 10,49 MB y ayuda distinta en oferta | JPEG, PNG o WebP. Máximo 10 MiB y 4096 × 4096 px. | Selección de imagen de entrada u oferta | Los tipos y 10 × 1024 × 1024 bytes permanecen iguales. |
| Oferta nueva explicada con INACTIVE y aceptación del servidor | La oferta se crea inactiva. Guardar la composición no la activa; podrás solicitar su activación después. | Alta aún no confirmada | No ofrece activación inmediata. El alta conserva INACTIVE. |
| Párrafo repetido de INACTIVE sin grupo activo | Sin un grupo con opciones activas, la oferta se guardará inactiva. Añade opciones activas para solicitar su activación. Guardar no garantiza que se acepte la solicitud. | Edición que normaliza la solicitud a inactiva | No promete activación automática ni aceptación. |
| Párrafo de oferta activa con enums | El borrador tiene un grupo con opciones activas. Al guardar solicitarás la activación; sólo se aplicará si la composición cumple los requisitos. | Solicitud de activación local | Mantiene la diferencia entre solicitud y estado confirmado. |
| Versión fuerte, categoría, entrada y receta | No pudimos comprobar la versión de la entidad. Consulta sus datos actuales antes de guardar. | Versión ausente o no apta para escribir | Los botones de adopción y guardado mantienen los bloqueos existentes. |
| Clave de idempotencia usada o inválida, categoría y receta | Este envío fue rechazado y no puede repetirse como está. Pulsa Iniciar nueva operación para preparar otro envío. | Sólo requires_new_key | Requiere acción explícita. No se aplica a expired ni incertidumbre. |
| Clave usada al cambiar estado, OffersPage | El cambio de estado fue rechazado. Vuelve a solicitarlo para preparar un nuevo envío. | KEY_REUSED o clave inválida | Conserva nueva consulta y nueva clave sólo tras otra solicitud del usuario. |
| Existe una operación pendiente de confirmación, receta | Hay un envío sin confirmar. Reintentar recupera ese envío; tus cambios posteriores se conservan. | Incertidumbre recuperable | Reintentar mantiene payload y clave; conserva espera y bloqueo. |
| La categoría o receta se creó en el servidor mientras editabas | La entidad se creó. Conservamos tus cambios posteriores; guárdalos para actualizarla. | Alta confirmada con cambios posteriores | No declara guardados esos cambios ni repite el alta. |
| ETag visible en revisión de oferta | Etiqueta y precio actual. Usar estos datos reemplaza la composición del formulario. Conservaremos los demás campos y no enviaremos cambios hasta que guardes. | Revisión tras conflicto | Conserva ETag internamente. No sobrescribe precio local ni envía al adoptar. |
| Enum e IDs de categorías en revisión de entrada | Activa, Inactiva o Archivada. Nombres de categorías conocidas; Categoría no disponible con referencia en detalle | Revisión remota | No inventa nombres ni elimina IDs desconocidos. Adoptar conserva sus IDs. |
| URL o ID de imagen en texto principal | Vista previa y referencia de imagen desplegable, separadas del archivo local | Revisión remota frente a borrador | Conserva URL, referencia, ausencia y nombre del archivo sin confundir sus procedencias. |
| Artículo de inventario e IDs de receta/insumo en opción | Insumo de inventario o nombre no disponible, con referencia desplegable | Edición de opción existente | Conserva INVENTORY_ITEM, ID, cantidad y unidad. No añade selector pendiente. |
| Ingrediente/artículo en errores de receta | Insumo del inventario y cantidad de cada insumo | Validación local | Conserva mínimo un insumo, filas completas, cantidad positiva y cero escrituras inválidas. |

## Texto que se conserva

La incertidumbre de entrada sigue advirtiendo que el servidor pudo recibir el envío y que no se repetirá automáticamente. Caducidad conserva el aviso de ventana de recuperación y la revisión antes de otra operación. El error previo al envío conserva su distinción de una escritura posiblemente aplicada. Los mensajes de rechazo provenientes del contrato no se sustituyen indiscriminadamente.

Los mensajes y acciones UX13 de guardado confirmado, fallo de navegación y retorno al listado permanecen intactos. Los cierres con cambios siguen ofreciendo continuar o descartar. La receta retenida se distingue de borrar una receta persistida.

## Adaptaciones de tests informadas antes de editar

Root informó al usuario y autorizó las consultas incompatibles con D03 y el nuevo texto: OfferComponents, OfferFormPage, CategoryPage, RecipePage, OffersPage, EntryFormPage, shared/editGuard y E2E audit-layout, UX08, UX09 y UX12. Los escenarios y comprobaciones de payload, claves, versiones, composición y recuperación permanecen.

El test de URL de entrada abre el detalle y afirma la misma URL, vista previa y archivo local. Añade categoría conocida/desconocida y adopción con los IDs originales y versión revisada. El test UX12 deja de exigir ETag visible, mantiene precisión145.125 y cero envíos tras adoptar, y después comprueba un guardado explícito con If-Match rev2. El E2E conserva su fixture de412 y comprueba el mismo encabezado sin modificar parser ni contrato.

La primera focal de formularios pasó121/123. Dos consultas antiguas de creación inactiva y falta de grupo fueron incompatibles con el texto autorizado. No hubo fallo funcional. El resultado negativo se conserva en `jest-forms-first.log`.

## Navegador preparado

No se ejecutó navegador ni E2E desde este agente. `e2e/ux-ui-14.demo.spec.ts` prepara320,390 y1024px con ayuda común, etiqueta accesible de rondas, cero inválido, resumen de3rondas y cero API/erroresJS. Escribe PNG y JSON físicos antes de las aserciones de geometría generales.

`e2e/ux-ui-14.spec.ts` prepara rechazo409KEY_REUSED e incertidumbre503 de categoría. Captura el estado real antes de recuperar, comprueba ausencia de otro envío automático, mismo borrador y payload, nueva clave sólo tras nueva operación o misma clave al reintentar incertidumbre, y confirmación final. Root ejecuta ambos y las regresiones sobre la base integrada.

El teclado virtual físico y el lector de pantalla permanecen como validación manual pendiente. El shell real está excluido. Esta entrega de fuente no acredita por sí sola U20 ni reemplaza la revisión visual central.

## Corrección devuelta por revisión central

La primera captura HTTP503 de categoría mostró "No se pudo guardar la categoría. Servicio no disponible." Aunque la prueba conservaba claves y payload, ese texto presentaba como fracaso una escritura posible. La revisión de root devolvió ese defecto antes de integrar.

CategoryFormDialog y RecipeFormContent ahora priorizan el aviso de incertidumbre sólo en altas con `uncertain` o `conflict_in_progress`, los estados que ya muestran recuperación manual. La copia es "No sabemos si se creó la categoría. Reintentar recupera el mismo envío; tus cambios posteriores se conservan. No reintentaremos automáticamente." La receta usa el mismo texto con su nombre de entidad. La espera, Retry-After y habilitación del botón mantienen su lógica; no se promete una acción inmediata mientras el botón esté bloqueado.

La categoría muestra el aviso incluso si un registro incierto no contiene mensaje de backend. No se sustituyen las ramas `requires_new_key`, `expired`, error antes del envío o edición directa. No se cambian controlador, operaciones ni claves.

El HTTP503 preparado afirma el significado completo y ausencia del falso fracaso. Root autorizó sustituir la expectativa de transporte "Timeout" en CategoryPage.test por la incertidumbre semántica, manteniendo las mismas garantías. El caso existente de RecipeSelectionTask sobre timeout y remontaje añade las mismas aserciones antes y después de recuperar; conserva POST, key, payload, cambios posteriores y actualización versionada.
