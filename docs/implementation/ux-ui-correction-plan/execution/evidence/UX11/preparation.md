# Preparación UX11

Estado: sólo lectura, 24 de octubre de 2026. No autoriza implementación. HEAD observado f64c2829d15635b76a5fc660ab47cd37c61e0452, base integrada informada 620c027. UX08 y UX09 siguen bajo verificación de root; UX10 todavía no integrado. La lectura de recetas y pasos es provisional.

Se leyeron AGENTS.md, DESIGN.md, orquestación, plan, ticket UX11 y registro. Se aplicaron pre-change-dependency-analysis y dependency-cruiser-impact a la decisión de dónde colocar el guard; ui-ux-pro-max a interacción y foco; unslop a esta propuesta; guías React/Jest al contrato y la verificación prevista. El índice existente .analysis/ux-ui-wave05-integrated.json se consultó sólo como guía estática. La fuente actual confirmó los contratos. No se instaló ni generó análisis global. No se ejecutaron tests, build, coverage, E2E ni servidor.

## Decisión propuesta

Una política compartida de cambios compara el borrador editable con la base confirmada. Cada formulario conserva su sesión y controlador de recuperación existentes. El guard decide salida y confirmación; no sella operaciones, reintenta peticiones, elimina registros ni replica recuperación. La limpieza de abandono ocurre después de la decisión explícita y sólo cuando las reglas de la operación la permiten.

Conviene separar tres responsabilidades pequeñas: cálculo de cambios de cada familia, decisión de salida común y adaptación de navegación de datos. La confirmación local usa el diálogo existente. En una página puede haber una confirmación modal, pero si un paso ya tiene un diálogo abierto debe reutilizar su contenedor. Un único dueño del bloqueo de navegación agrega los cambios del formulario padre y sus pasos, evitando dos useBlocker compitiendo por el mismo destino.

D04 ya decide que intacto cierra y dirty ofrece "Seguir editando" y "Descartar cambios". Retroceder entre pasos no abandona el formulario ni reinicializa su base. Pending/uncertain y su referencia de operación tienen prioridad: el nuevo guard no debe convertir "Descartar" en autorización implícita para olvidar una operación incierta, ni habilitar doble envío. Guardado confirmado desactiva el bloqueo antes de la navegación de éxito. F5 sólo restaura, nunca dispara POST automático.

## Evidencia y riesgo concreto

- App.tsx importa BrowserRouter y monta Routes dentro de Suspense con seis páginas lazy y repositorio inyectado. main.tsx monta App autónomo bajo StrictMode y selecciona el repositorio demo. useBlocker necesita contexto de router de datos: añadirlo directamente al montaje actual falla.
- Proponer factory de rutas compartida y createBrowserRouter estable durante la vida del montaje autónomo, usando inicialización diferida y conservando Suspense, rutas, /menu redirect, wildcard, params, query, state de regreso y repositorio. No crear el router en cada render. El contrato de pruebas con createMemoryRouter reutiliza esas rutas o monta las páginas pertinentes en contexto de datos. No anidar router. Shell real excluido por D01; no se afirma compatibilidad o integración con un shell no disponible.
- EntryFormPage.tsx:115/144 llama model.abandon antes de navegar. useEntryForm.ts:622 restablece saveSucceeded y abandona el controlador. Esto debe ocurrir tras descarte aprobado, nunca al presentar la confirmación ni al continuar editando.
- OfferFormPage.tsx:367 registra popstate y abandona al cambiar pathname. abandonEditor, alrededor de 1030, marca mountedRef=false, invalida validación, detachForReload y abandonFlow. Si permanece mientras useBlocker bloquea atrás, puede destruir la sesión antes de "Seguir editando". Sustituir la limpieza anticipada por el ciclo de salida aprobado. No corregirlo con saltos adicionales de historial.
- CategoryFormDialog.handleVoluntaryClose abandona el controlador o borra su registro y después onClose. RecipeFormDialog.handleVoluntaryClose marca activeRef=false, abandona y cierra. La confirmación debe preceder esos efectos; pending mantiene su bloqueo.
- SlotModal y OptionModal poseen estado local que se reinicializa según initialData/isOpen; Escape y onCancel llaman onClose. OptionModal publica onChangeDraft pero conserva también campos locales. UX10 cambia esta estructura. El guard debe leer la sesión final de UX10, conservar todos los campos entre selección/creación/regreso y no provocar remount de RecipeFormSession/Content.
- No se encontró beforeunload en src en esta lectura. Registrar el listener sólo mientras corresponde, retirarlo al quedar intacto, descartar o guardar. La advertencia usa el navegador, sin prometer texto propio.

## Archivos previstos, pendientes de nueva reserva

App.tsx y main.tsx para montaje; nueva utilidad/hook y contenido de confirmación en shared si la forma final lo requiere; EntryFormPage.tsx y useEntryForm.ts; CategoryFormDialog.tsx; RecipeFormSession/Content y adaptador de RecipeFormDialog resultantes de UX10; OfferFormPage.tsx, sesión de pasos y SlotModal/OptionModal si siguen siendo dueños de borradores tras UX10. Estilos únicamente para confirmación dentro de los contenedores existentes.

No cambiar application/operationAttempt ni pendingOperationStorage por conveniencia del guard. Sus reglas son restricciones, no nuevas implementaciones de UX11. La dependencia estática directa confirma que categorías, recetas, entradas y ofertas consumen operationAttempt; ofertas además consume los componentes de selección y composición. Cambiar el controlador compartido ampliaría innecesariamente el riesgo de identidad e idempotencia.

## Base y snapshots

Capturar base al resolver carga inicial confirmada, no antes del fetch ni en cada render. Para creación usar el borrador vacío real de cada familia. Para edición conservar versión y snapshot confirmados hasta aceptar explícitamente una revisión o guardar. Revertir todos los valores a la base vuelve intacto. Un indicador userEdited no basta para esa comparación.

Entradas incluye brandName, description, status, categorías y archivo. Comparar categoría por identidad semántica de selección sin convertir cambios de presentación en cambios del usuario. Un File se conserva por identidad en memoria y presencia respecto a la base; JSON.stringify del archivo no detecta sustituciones. No alterar el payload existente.

Recetas incluye nombre, descripción, instrucciones, estado y suministros/cantidades con sus identidades. Categorías incluye nombre y descripción. Ofertas incluye presentación, precio editable, estado, imagen, grupos, rondas, opciones, fuente e intención de asignación; incluir borradores aún no aplicados de paso. Las claves locales mantienen identidad, sin confundirlas con cambios de negocio. No normalizar o redondear importes en UX11: MXN dos decimales es UX12/D02; redacción de rondas es UX14/D03.

## Incompatibilidades identificadas antes de editar

EntryFormPage.test.tsx:245, "cancel discards the draft after modifying fields and image, and reopening shows clean initial state", exige navegación inmediata tras Cancelar. D04 exige decisión explícita. La adaptación justificada conserva nombre, descripción, imagen, retorno ?status=ARCHIVED y cero create/update; agrega continuar con todos los valores y descartar para completar la salida y reapertura limpia.

EntryFormPage.test.tsx helper alrededor de 56, montajes alrededor de 457 y 725; OfferFormPage.test.tsx helper alrededor de 244 y montaje de 722; RecipePage.test.tsx múltiples montajes; CategoryPage.test.tsx:47/72 usan MemoryRouter declarativo. Si montan un guard de navegación, requieren createMemoryRouter/RouterProvider. Esto es incompatibilidad de infraestructura por contexto de datos, no fallo funcional demostrado ni permiso para omitir el guard. Otros tests MemoryRouter que sólo monten tarjetas/enlaces no requieren migración automática. Diálogos unitarios sin navegación pueden probar el contrato local separado y su integración real se cubre con router de datos.

Los tests que esperan cierre inmediato de categoría/receta/opción/grupo modificados deben identificarse por nombre en la base UX10 integrada antes de cambiarse. No asumir que todos los casos de Escape son incompatibles: formularios intactos y navegación de pasos conservan sus garantías. No alterar expectativas de payload, versiones, idempotencia, imágenes, bloqueo, recuperación o referencia de operación.

## Pruebas propuestas tras autorización

1. Rutas autónomas de producción/demo con repositorio inyectado, lazy loading, /menu, wildcard, parámetros, query/hash y state de retorno. Router estable al rerender; atrás y adelante conservan el destino exacto al descartar, continuar mantiene URL y sesión.
2. Receta con nombre, categoría editada, entrada con imagen nueva y categorías, oferta con composición y opción/grupo locales. Para cada familia, intacto sale; dirty conserva todo y foco al continuar; descarte explícito sale. Revertir a la base elimina el aviso.
3. Cruz, Cancelar, Escape, enlace y navegación POP. Navegación de pasos UX10 conserva drafts sin advertencia de abandono; abandonar desde cualquier paso aplica la misma política. Máximo un diálogo/fondo y limpieza/restauración de foco y scroll.
4. Guardado confirmado navega sin aviso extra. Envío pendiente bloquea salida y doble submit. Resultado incierto conserva payload sellado, claves, referencias, archivo y recuperación. Continuar no ejecuta abandonFlow ni pierde mountedRef.
5. beforeunload se registra/retira según cambios y estado; navegador real cubre recarga/cierre y F5 sin POST automático, manteniendo recuperación. jsdom sólo comprueba registro y cancelación del evento; no acredita el aviso nativo.
6. Repetir V09, V10, V16, V17 y V18 sobre UX10 integrado. Root asigna recursos de navegador y comandos; quedan pendientes dispositivo físico/teclado virtual y lector de pantalla. Shell real fuera del alcance actual.

Antes de cualquier edición futura: releer los archivos concretos integrados de UX10, registrar snapshot de sesiones y cambios de tests por nombre, resolver el dueño único del bloqueo y pedir a root la reserva. Esta preparación no integra UX11 ni cierra U15.
