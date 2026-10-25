# Preparación UX14

Fecha de lectura: 25 de octubre de 2026. Responsable: `/root/ux14_prepare`. Preparación de lectura, sin implementación ni pruebas ejecutadas. UX13 todavía modifica los formularios. Esta tabla requiere contrastarse con su commit integrado antes de editar.

Se leyeron el ticket UX14, DESIGN.md y las skills ui-ux-pro-max y unslop. Se aplica lenguaje concreto, términos constantes y mensajes que indiquen qué ocurrió y qué acción sigue. La guía web de formularios pide etiquetas visibles, ayuda y errores próximos al campo. No se propone cambiar el sistema visual ni introducir otra capa de feedback.

## Decisiones vigentes

- D03 define `CompositionSlot.quantity` como rondas de selección. Cada ronda permite elegir entre las opciones del grupo. No representa unidades de un insumo. Se conserva el entero positivo y el payload `quantity`.
- D05 conserva JPEG, PNG y WebP, exactamente 10 × 1024 × 1024 bytes y 4096 × 4096 píxeles. La ayuda común debe decir 10 MiB. No cambiar validadores ni ampliar tipos.
- D02 está integrado en UX12. MXN y dos decimales se mantienen, sin redondear el dato almacenado.
- El shell real queda fuera del alcance por decisión del usuario. Dispositivo físico y lector de pantalla permanecen como validación manual pendiente.

## Inventario inicial y propuesta

Las propuestas son texto de revisión, no cambios aprobados de comportamiento. Donde la rama operativa sea distinta se conserva un mensaje específico.

| Consumidor y texto actual | Propuesta | Estado real | Acción habilitada y garantía |
| --- | --- | --- | --- |
| SlotModal: "Unidades incluidas" | "Rondas de selección". Ayuda: "Indica cuántas veces se elige entre las opciones de este grupo." | Edición local de grupo | Guardar grupo conserva quantity. No modifica existencias. |
| SlotModal: "La cantidad de rondas debe ser al menos 1." | "Escribe un número entero de rondas de selección, igual o mayor que 1." | Validación local, sin envío | Corregir el campo. Conservar rechazo de fracciones, cero, negativos y valores no seguros. |
| SlotCard: "1 ronda" o "n rondas" | "1 ronda de selección" o "n rondas de selección" | Resumen de grupo | Identifica el mismo valor que el formulario. Verificar ajuste de líneas en ancho estrecho. |
| EntryImageField: "hasta aprox. 10,49 MB" | "JPEG, PNG o WebP. Máximo 10 MiB y 4096 × 4096 px." | Selección de archivo | Informa exactamente el límite vigente. |
| OfferCommercialInfo ya dice "10 MiB" | Usar la misma ayuda que entradas | Selección de archivo | No ampliar formatos ni bytes. |
| Oferta nueva: "Toda oferta se crea con estado inactivo (INACTIVE); la composición del borrador local no garantiza la aceptación del servidor ni activa la oferta automáticamente." | "La oferta se crea inactiva. Guardar la composición no la activa; podrás solicitar su activación después." | Alta, aún no confirmada | Mantener creación INACTIVE y activación explícita posterior. El envío puede ser rechazado. |
| Oferta sin grupo activo: párrafo repetido con INACTIVE y aceptación del servidor | "Para solicitar la activación, añade un grupo con opciones activas y guarda la oferta. Hasta que se confirme, seguirá inactiva." | Edición con activación no disponible o normalizada | Verificar la condición real antes de adoptar: no prometer que cualquier grupo permite publicar. |
| Oferta activa solicitada: párrafo con INACTIVE y aceptación | "Solicitarás la activación al guardar. La oferta se activará si su composición cumple los requisitos." | Solicitud local, no confirmada | No presentar el radio seleccionado como estado ya publicado. |
| CategoryFormDialog: "La clave de idempotencia ya fue utilizada o es inválida... generar una nueva clave" | "Este envío fue rechazado y no puede repetirse como está. Pulsa «Iniciar nueva operación» para preparar otro envío." | Rechazo que exige nueva operación | Conservar acción explícita. No aplicar este mensaje a incertidumbre o expiración con posible escritura. |
| EntryFormFeedback: "No se recibió una versión fuerte" | "No pudimos comprobar la versión actual. Consulta de nuevo antes de continuar." | Revisión sin versión apta para editar | Botones de adopción siguen deshabilitados. No cambiar comprobación de ETag. |
| Revisión de oferta: "ETag {valor}, etiqueta..." | Texto principal con etiqueta, precio, estado y composición actuales. Omitir ETag del texto principal. | Conflicto o revisión | Conservar la versión internamente para la siguiente escritura y las dos decisiones, adoptar o mantener borrador. |
| EntryFormFeedback muestra `current.status` en revisión | Mostrar Activa, Inactiva o Archivada | Versión consultada | No cambiar enum ni restricciones de desarchivo. |
| EntryFormFeedback categorías unidas por ID y referencias de imagen | Mostrar nombres cuando estén disponibles; conservar comparación útil y archivo local. Identificador técnico sólo como detalle cuando sea necesario distinguir un recurso sin nombre. | Revisión remota frente a borrador | No ocultar diferencias ni inventar nombres. Necesita revisar los datos disponibles antes de decidir alcance. |
| Categoría y receta: "se creó en el servidor... cambios posteriores..." | "La categoría se creó. Conservamos los cambios que hiciste después; guárdalos para actualizarla." Equivalente para receta. | Alta confirmada y cambios posteriores sin confirmar | No navegar ni declarar guardados esos cambios. Conservar identidad creada y operación posterior explícita. |
| EntryFormFeedback: "No se confirmó el resultado. El servidor pudo haber recibido la operación; no se repetirá automáticamente." | Conservar el significado. Puede decir "No sabemos si se guardó. Revisa el resultado antes de volver a intentarlo. No repetiremos el envío automáticamente." | Incertidumbre, posible escritura | Mantener revisar y repetición explícita. Nunca ofrecer "crear de nuevo" sin la decisión vigente. |
| RecipeFormContent: "Existe una operación pendiente de confirmación" | "Hay un envío sin confirmar. Puedes reintentarlo con los mismos datos cuando termine la espera." Sólo en rama que permite ese reintento. | Pendiente recuperable | Preservar espera, clave, payload sellado y botón deshabilitado cuando proceda. |
| Ofertas: "Conservamos el borrador del envío rechazado..." | Conservar distinción entre rechazo y borrador editable. "El envío fue rechazado. Conservamos tus cambios; inicia una nueva operación para enviarlos." | Rechazo confirmado | No reenvío automático ni reutilización indebida de clave. |
| OptionModal: descarte de receta retenida al guardar opción | Conservar decisión explícita y objeto que se descarta | Cambios locales retenidos | Seguir editando conserva receta. Descartar receta no debe confundirse con borrar una receta persistida. |
| EntryFormFeedback y OfferFormPage incorporan éxito y fallo de navegación UX13 | Releer tras integración. Conservar entidad, nombre y acción en confirmación; fallo de listado separado del éxito de escritura | Confirmado, navegación o lectura posterior fallida | Volver al listado no debe repetir POST/PATCH. No convertir ese estado en error de guardado. |

No se debe sustituir cada aparición de "servidor" o "borrador" indiscriminadamente. Ambas palabras explican decisiones reales en conflicto y cambios posteriores. Deben retirarse las referencias de implementación que no ayuden a decidir, no las diferencias operativas.

## Reservas y consumidores

La implementación necesita archivos completos de categorías, entradas, ofertas y recetas que contengan los textos finalmente seleccionados, con sus tests. Reserva inicial concreta: CategoryFormDialog, CategoryPage, EntryFormPage, EntryFormFeedback, EntryImageField, useEntryForm, OfferFormPage, OfferCommercialInfo, OffersPage, CompositionEditor, SlotModal, SlotCard, OptionModal y RecipeFormContent. Revisar mensajes producidos por helpers antes de ampliar la reserva; no reescribir la máquina de operaciones ni clasificadores para cambiar una frase.

UX15 conserva App, main, coordinador nuevo y sus tests. Si UX15 requiere OfferCard, no incluir ese archivo en UX14 sin turno explícito. UX13 debe liberar primero formularios, feedback y sus consumidores de recibos. El registro permanece bajo edición exclusiva de root.

## Pruebas que deben conservarse

Los literales visibles cambiarán por un requisito de producto. Informar la incompatibilidad antes de adaptar cada test. No sustituir aserciones de negocio por la mera presencia del nuevo texto.

- OfferComponents.test.tsx busca INACTIVE en la explicación. Debe seguir comprobando que una oferta nueva no ofrece activación inmediata, que se crea inactiva y que editar permite solicitar activación bajo las condiciones vigentes.
- SlotModal cambia el nombre accesible "Unidades incluidas". Consumidores conocidos incluyen shared/editGuard.test.tsx y e2e/audit-layout.spec.ts. Conservar cambio de 1 a 3, protección de borrador, reversión a 1 y payload; sólo adaptar el nombre accesible tras informar.
- OfferFormPage, OffersPage, EntryFormPage y RecipePage contienen casos de conflicto y recuperación. Conservar un único envío, clave y payload estables, espera, versión revisada, decisiones explícitas y cambios posteriores.
- entryImage.test.ts y offerImage.test.ts acreditan límites reales. Añadir o conservar comprobación útil de la ayuda exacta de ambos consumidores sin alterar el límite para facilitar el caso.
- Las nuevas pruebas de UX13 deben reejecutarse tras tocar confirmaciones. La confirmación de guardado y el error de carga del listado pueden coexistir.
- La demo basta para etiquetas, ayudas y composición local. Rechazo, incertidumbre, expiración, conflicto y confirmado con cambios posteriores requieren casos dirigidos del repositorio o HTTP, con capturas de su estado real y observación de las escrituras. Una captura de éxito no acredita recuperación.

## Estado y siguiente paso

No se ejecutaron tests, navegador, build ni E2E, y no se modificó aplicación. No se acredita U20 ni se libera UX16. Tras el commit UX13, releer los textos y contratos, confirmar reservas con root, justificar los cambios de literales y ejecutar la implementación con evidencia de V09, V12 y V18.
