# Impacto previo UX09

Base 620c027, índice src .analysis/ux-ui-wave05-dependencies.json aportado por root y contrastado con imports reales. CompositionEditor consume SlotCard/SlotOptionItem; OfferFormPage conserva todos los callbacks y la reconciliación. OptionModal conserva optionDraft, useTaskDialog y el selector externo de recetas. OfferCard consume navegación React Router. El cambio es de presentación, sin nuevas capacidades, payloads ni servicios. El índice no demuestra CSS ni comportamiento.

Antes del diff se notificó a root la incompatibilidad de los casos históricos de OfferComponents de inventario pendiente y copia pendiente. Ambos exigen controles deshabilitados que U21 obliga a retirar. Se cambian sólo expectativas de presencia por ausencia y se conservan callbacks sin operaciones y acciones reales de receta/grupo. Root lo comunicó al usuario y autorizó esa adaptación.

Los handlers de grupo/opción sólo retiran elementos del borrador; no ejecutan borrado persistente ni tenían confirmación. La oferta mantiene confirmación y restricciones existentes en OffersPage. Se aclara retirada del borrador junto a estas acciones sin inventar recuperación.

El CSS adoptará contenedores propios y reglas con minmax(0,1fr), sin ocultar desbordes para encubrirlos. Icon existente image reemplaza emoji y no requiere tocar shared. U01 mantiene posición absoluta y contención de la imagen.

La primera focalizada detectó también expectativas de controles pendientes en OfferFormPage.test.tsx y texto de estado dentro del botón en OfferComponents/OfferFormPage. Se informaron a root antes de su edición y root confirmó su comunicación al usuario. Se conserva aria-pressed y todos los callbacks/refrescos/escenarios de repositorio. Los modificadores CSS de estado del control OfferCard siguen disponibles sin dar color redundante al control. No se cambió OffersPage.test.tsx.
