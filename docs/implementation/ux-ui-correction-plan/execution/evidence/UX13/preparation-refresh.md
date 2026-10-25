# UX13: preparación actualizada tras UX11

Preparación de lectura por `/root/ux13_save`, 25 de octubre de 2026. HEAD observado `c2ea7bbcea933ddb13bce610dbc406763747e1ea`; UX11 integrado `a9408b8`. UX12 sigue activo y conserva sus archivos. Única escritura de este encargo: este documento. No se ejecutaron tests, build, cobertura, navegador, servidor ni commit. No se implementó UX13 y no se cierran U17/U18.

Se leyeron AGENTS.md, docs/DESIGN.md, ticket UX13, orquestación, ficha y verificaciones V09/V11/V18 del plan y preparación anterior. Se consultaron skills de análisis previo, dependency-cruiser, React, ui-ux-pro-max y unslop. La búsqueda local `focus not obscured` devolvió reglas específicas de foco y scroll-padding; no acredita conformidad. El índice `.analysis/ux-ui-wave07-integrated.json` se consultó con depcruise-fmt como localizador y se contrastó la fuente actual. No se regeneró. No se aplicó todavía una skill de escritura de tests.

## Contrato real integrado

`App.tsx` crea un data router en efecto, lo dispone al desmontar y monta `EditGuardProvider` en el árbol de rutas. El proveedor agrega participantes mediante un único `useBlocker`. Consulta getters actuales al intentar salir y otra vez al aceptar descarte; blocked impide salir y dirty ofrece seguir o descartar. `useEditGuard.request` conserva datos al cancelar. No hay API pública `allowNavigation`: UX13 debe actualizar las condiciones locales antes de navegar, sin cambiar App ni desactivar el guard en tests. Incluso un replace del state pasa por el router; los listados no registran borrador y el editor confirmado debe devolver dirty=false y blocked=false.

Entrada usa getters de `model.dirty`/`exitBlocked`, ambos condicionados por `saveSucceeded.current`. Alta confirma en `save`, después de `controller.submit/retryPending` con status succeeded y sin cambios posteriores. Cambios posteriores adoptan el ID y permanecen editables; no equivalen a finalización. Edición confirma cuando `persist` termina. `persist` hoy descarta la respuesta de updateEntry. Ambos caminos terminales ponen saveSucceeded, llaman abandonFlow y después onSaved. El callback fallido se captura y no habilita submit en esa instancia, pero el registro ya se borró. La restauración de alta succeeded con confirmedResult hoy adopta ID y muestra borrador posterior incluso cuando no hubo cambios posteriores. Debe distinguirse ese caso para reanudar sólo salida.

Oferta confirma en `handleConfirmedResult`, después de reconciliar composición y comprobar hasDraftChangesSinceSubmission. Ambigüedad conserva revisión; cambios posteriores conservan editableDraft y versión. Sólo la rama final llama abandonFlow, pone exitSucceeded y navega. Dirty/blocked ya consultan exitSucceeded dinámicamente. Sin embargo executeSave y disabled no usan ese latch; el catch general puede convertir fallo de navegación en error de formulario y la siguiente acción crear otro intento. No basta añadir un aviso.

Las sesiones actuales son `getOrCreateTabId` en sessionStorage y scopes de operationAttempt. Entrada alta usa `entry-form/entry-create`; oferta usa scopes create por entrada y update por oferta. `retainConfirmedResult` conserva resultado en el registro existente. `abandonFlow` marca detached/abandoned y borra ese registro; `detachForReload` sólo separa el controlador. No se debe usar abandonFlow como paso previo obligatorio a la salida confirmada. La persistencia posterior al progreso es best-effort: una prueba con fallo de almacenamiento debe conservar la clave sellada previa y no presentar garantía de persistencia que el adaptador no dio. El fallback de tabId cuando sessionStorage no funciona tampoco acredita recuperación entre recargas.

## API propuesta para el turno de implementación

Añadir un contrato pequeño de presentación, sin una segunda máquina de recuperación:

```ts
type LocalSaveReceipt = {
  receiptId: string;
  entity: "entry" | "offer";
  entityId: string;
  entryId?: string;
  label: string;
  action: "created" | "updated";
};
type OnEntrySaved = (receipt: LocalSaveReceipt) => Promise<void>;
```

Un callback sin argumentos sigue siendo asignable. Obtener entidad/etiqueta del resultado confirmado o snapshot enviado, nunca del borrador posterior ni del listado. La identidad del recibo debe ser estable por operación confirmada, preferiblemente la clave del intento final existente. Para edición de entrada sin controlador de cadena, usar un identificador de presentación por envío confirmado y no convertirlo en idempotencia del backend.

En alta de entrada y oferta derivar terminal de registro succeeded + resultado + ausencia de cambios posteriores y composición reconciliada. Conservar el registro hasta completar navegación. En montaje restaurado, reconstruir ese terminal y recibo sin POST automático. Guardar y su handler deben bloquearse tanto con terminal nuevo como restaurado. Separar `finishNavigation(receipt)` de la escritura y permitir reintentar sólo ese paso. Fallo de navegación produce status local de confirmación y acción de retorno, sin alerta de incertidumbre, sin nuevo submit y sin modificar la clave sellada. No repetir callbacks externos desde Guardar.

La retirada del registro se hará sólo después de navegación resuelta; debe poder limpiar aunque el componente ya esté desmontado sin borrar una cadena nueva del mismo scope. Conservar copia del controlador/identidad y condicionar la limpieza a la operación confirmada. Si la navegación resuelve sin llegada efectiva, conservar registro hasta que el destino pueda acreditar recepción. Antes de implementar se contrastará el comportamiento del data router con carga lazy y error de destino. No añadir un registro paralelo para reemplazar operationAttempt. La edición de entrada ya tiene identidad de ruta que impide otro POST; el recibo no debe forzar migrar sus reglas de actualización.

Transportar `{ ...estadoDeRegreso, saveResult: receipt }`. CatalogPage y OffersPage validan el discriminante, IDs y pertenencia a la entrada actual antes de mostrar. Copian el mensaje a estado local y reemplazan la ubicación exacta con pathname/search/hash y todos los otros campos de state conservados, retirando sólo saveResult. Marcar receiptId como consumido en ref antes del replace evita doble efecto StrictMode. Si el replace falla, conservar marca y feedback y permitir limpiar después sin reanunciar. Un reload posterior al consumo no debe volver a recibir saveResult. No prometer consumo durable si el reemplazo falló.

Mantener éxito separado de errores de listado y de notices de acciones. CatalogPage borra notice al cambiar key; OffersPage lo borra por entryId/page. Evitar que esos efectos eliminen el recibo en el mismo montaje o que reintentar fetch lo vuelva a anunciar. Una sola región local `role=status` identifica nombre y acción. No esperar listEntries/listOffers/getEntry para confirmar una escritura ya confirmada.

## Acciones del formulario

Medir primero la composición final de UX12, corto/largo, imagen, grupos, error/revisión y campo final. Un único footer y un único submit conservan handlers y disabled. Propuesta de hook de presentación `useFormActionsLayout(formRef, actionsRef)` que devuelva persistent y altura real mediante ResizeObserver, sólo si se necesita reutilizarlo. No medir todos los renders ni añadir listeners de scroll que reposicionen constantemente. Persistencia sólo si formulario supera alto útil y queda área editable suficiente; en poca altura y zoom puede volver al flujo. Reservar alto medido y aplicarlo al scroll-margin/padding del scrollport efectivo. Retirar la constante de 112 px únicamente tras comprobar foco real. Los diálogos y pasos conservan sus acciones propias.

Medidas previstas 390x844, 390x568, 844x390, escritorio estrecho y zoom 200%; Tab/Shift+Tab, resumen, campos, último grupo y footer sin cobertura ni scroll horizontal. D01 shell excluido. Teclado virtual físico y lector permanecen manuales pendientes. D02 pertenece a UX12; D03 y textos finales pertenecen a UX14.

## Tests y compatibilidades antes de editar

E04 de EntryFormPage exige una creación y callback, submit bloqueado y ninguna alerta de incertidumbre tras fallo de callback. Sigue siendo válido. Feedback de salida será status local, no alerta. No cambiar estas garantías para facilitar implementación.

El test `keyboard focus reveals a field obscured by sticky actions...` presupone sticky y rectángulos simulados. Si la variante corta vuelve al flujo, su premisa requiere parametrizar explícitamente la variante persistente y conservar la garantía de revelar campo cubierto y no desplazar campo visible ni acciones. Esto es una incompatibilidad de premisa conocida, no permiso para borrar el caso.

Los tests de retorno y URLs inseguras siguen siendo válidos. No se encontró todavía una igualdad de state incompatible en los casos leídos; si aparece, documentarla antes de editar. Los harness ya deben usar GuardedMemoryRouter de UX11. No degradarlos a MemoryRouter sin guard.

Añadir casos reales de alta/edición entrada/oferta con recibo correcto; filtros/página/hash/state ajenos conservados; doble efecto, atrás/adelante y recarga sin repetir; fetch fallido conservando éxito. Fallo de navegación y recarga antes de salir deben mantener una sola creación y reanudar sólo navegación. También rechazo, incertidumbre, Retry-After, recuperación sellada, cambios posteriores y composición ambigua no emiten finalización y conservan borradores/claves/versiones. Comprobar almacenamiento fallido después del resultado sin nueva clave automática. Las suites se ejecutarán sólo cuando el integrador reserve recursos.

## Reserva solicitada y espera

Archivos del ticket: EntryFormPage/useEntryForm/EntryFormFeedback y estilos de entradas si la presentación lo requiere; OfferFormPage/OffersPage y estilos de ofertas; CatalogPage y sus tests. EntryFormFeedback se solicita por cualquier exposición de status de salida. Solicitar antes de crear `src/shared/localSaveReceipt.ts` o hook de presentación compartido con sus tests pertinentes. OperationAttempt/pendingOperationStorage quedan sólo lectura por ahora; si su API actual no permite limpieza segura por identidad se pedirá ampliación antes de editar. App/main/editGuard, tarjetas, categorías, recetas, registry/audit y configuración quedan fuera de reserva.

Esperar comunicación de UX12 integrado con hash y liberación explícita de archivos. Releer diff y medir fuente final antes de implementar. Esta preparación no es aprobación ni integración de UX13.
