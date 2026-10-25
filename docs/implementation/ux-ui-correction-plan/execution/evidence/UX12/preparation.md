# Preparación UX12, sólo lectura

Agente `/root/ux09_offers`. Encargo recibido sobre `db2defc`, con UX09 `6318581` y UX08 `3beabea` integradas. HEAD observado durante la lectura: `065d005e6cb7ead5484f69e29a47d9e4a51285fc`. UX10 posee ofertas/recetas y puede cambiar las líneas y dependencias descritas. Implementación bloqueada hasta integrar UX11 y recibir la reserva de root. Este documento es la única escritura del encargo. No acredita implementación, pruebas ni cierre U12.

## Autoridad y contrato

Leídos ticket `oleada-08-ux12.md`, ficha UX12 y decisiones del plan, DESIGN.md y registro de ejecución. D02 está resuelta en `execution/registry.md`: usuario "de momento dejalo en mxn y dos decimales"; presentación `es-MX`, moneda `MXN`, dos decimales. La condición histórica abierta del plan no revoca esa decisión posterior. No hace falta pedir nuevamente moneda. DESIGN exige importes alineados a derecha y peso 600 o 700.

La precisión de visualización es dos decimales. No autoriza redondear el dominio, limitar los decimales aceptados, cambiar valores almacenados, convertir a centavos ni cambiar validación. El precio pertenece a la oferta; grupos, opciones e insumos no aportan importes comerciales.

## Inventario de superficies y recorrido de datos

La búsqueda de `basePrice` en todo `src` identifica estas tres superficies de producción. No se detectaron otros renders de importes de oferta fuera de ellas.

| Lugar actual | Presentación y responsabilidad | Cambio propuesto |
| --- | --- | --- |
| `OfferCard.tsx:42` | `$ {offer.basePrice}` en `.offer-card__price`, consumida por OffersPage. CSS ya usa derecha y peso600, caja independiente de imagen. | Usar el formateador común, conservar contención y permitir el importe agrupado largo. |
| `OfferCommercialInfo.tsx:100–116` | Etiqueta visible Precio base, prefijo `$` decorativo y `input type=number`, `min=0`, `step=any`, valor string y callback directo con `event.target.value`. Placeholder0.00 no implica dos decimales persistidos. | Etiqueta Precio base (MXN), prefijo MXN si se conserva el bloque, campo numérico crudo alineado a derecha/peso600 y vista monetaria adyacente con el mismo formateador. No insertar separadores/código en el value del input. |
| `OfferFormPage.tsx:1220–1225` | Región Versión del servidor con ETag, presentación y `precio $ {reviewedOffer.data.basePrice}` en un párrafo. | Separar el importe en una fila/celda identificable, derecha/peso600, usando el mismo formateador; conservar contexto ETag y acciones de adoptar. |

`OfferFormPage` recibe/recupera el precio como string en `basePrice`, `OfferFormDraftState`, `draftRef`, contexto de receta y almacenamiento de operación. Al abrir una oferta usa `String(offerData.data.basePrice ?? "")`; al recuperar usa el string editable existente. `validateOfferForm` aplica `Number(basePrice)`, finitud y `>0`. `buildFinalStageInput` convierte mediante `Number(currentDraft.basePrice)` y pasa ese número sin redondeo a buildCreateDraft/buildUpdateDraft y sealJsonPayload. Se conserva todo ese recorrido, incluido reintento con payload sellado.

`MenuOffer`, `MenuOfferDetail` y drafts POST/PATCH en `src/application/catalog.ts` usan `basePrice:number` sin propiedad currency. `src/api/catalogResponse.ts:215–240` acepta importe finito no negativo al leer; esto permite una lectura cero aunque el editor exija positivo. No cambiar esa diferencia contractual. `src/demo/data.ts` tiene145,185,45; `src/demo/repository.ts` conserva el número del draft. No se necesita reescribir fixtures, repositorios, parsers, APIs ni tipos por decidir cómo se muestran los importes.

La revisión de servidor adopta composición y versión conservando los demás campos. La nueva salida monetaria no debe adoptar ni sobrescribir el precio editable. Tampoco debe normalizarlo como efecto de render, blur, cambios de pasos o confirmación de descarte UX11.

## Dependencias y reserva propuesta

Se consultó con `depcruise-fmt -T text --focus` el índice integrado `.analysis/ux-ui-wave05-integrated.json` para OfferCard, OfferCommercialInfo, OfferFormPage y OffersPage. OfferCard depende de catálogo/React/Router; OffersPage la consume. OfferCommercialInfo depende de catálogo, Icon y React; OfferFormPage la consume y mantiene los contratos de operación, reconciliación, recetas y estilos. El grafo no demuestra CSS, callbacks ni comportamiento; estos se contrastaron en fuente. El índice describe la oleada5, no acredita el formulario futuro que extraiga UX10 ni la protección UX11. Antes de implementar, releer las fuentes y refrescar o recibir un índice posterior a UX11.

Reserva posterior propuesta: OfferCard, OfferCommercialInfo, bloque real de revisión de oferta donde quede tras UX10, estilos propios de ofertas, nuevo `src/shared/formatMoney.ts` y su test, tests afectados de ofertas y regresión propia `e2e/ux-ui-12.demo.spec.ts`. El formateador nuevo no cambia la BASE visual ni requiere dependencias. Las adaptaciones E2E existentes, pruebas generales de recuperación y selección común requieren ampliar la reserva con root antes de editarlas. No tocar App/main/configuración/registro/auditoría desde UX12 salvo asignación expresa. UX13 comparte ofertas y debe trabajar por turno.

## Formateador y edición propuestos

Usar una instancia `Intl.NumberFormat` a nivel de módulo con locale explícito `es-MX`, `style:currency`, `currency:MXN`, `minimumFractionDigits:2`, `maximumFractionDigits:2`. Propuesta concreta para evitar ambigüedad del símbolo: `currencyDisplay:code`, de modo que tarjeta, revisión y salida del editor indiquen MXN. No es una nueva moneda ni requiere cambiar contratos. Confirmar la decisión visual con root al reservar, sin volver a consultar D02 al usuario.

Exportar una función pequeña `formatMoney(value:number):string`; no aceptar ni parsear texto localizado, no mezclar validación de formularios ni introducir fallbacks de importe0 para datos inválidos. El llamador del editor sólo monta salida cuando hay un string no vacío que convierte a número finito; vacío o inválido conserva la ayuda/validación existente. Un cero leído se representa como cero con dos decimales y un cero editado continúa rechazándose al guardar por el validador actual. No restringir el campo a step0.01.

El input conserva exactamente el string editable mientras se escribe, por ejemplo `145.125`, y envía el número145.125. La salida visual muestra su representación con dos decimales. No llamar `toFixed` para actualizar estado, no persistir el texto de Intl y no volver a parsear la salida. La separación entre entrada numérica y salida monetaria permite el mismo formato en edición sin romper escritura parcial, teclado numérico ni precisión. El output puede asociarse por aria-describedby para evitar una región viva que anuncie cada tecla.

## Expectativas incompatibles identificadas antes de cualquier edición

Ninguna fue modificada durante esta preparación. Informar de nuevo a root al desbloquear UX12 si UX10/11 incorporan otras. Son incompatibilidades del requisito de presentación, no fallos que permitan reducir escenarios.

| Prueba actual | Incompatibilidad prevista y garantía que debe conservarse |
| --- | --- |
| `src/features/offers/OffersPage.test.tsx:77` | Exige exactamente `$ 180` dos veces. Cambiar únicamente la presentación esperada a MXN/dos decimales, conservando dos tarjetas, composición, estado, links, filtros y acciones. |
| `e2e/demo-mode.e2e.ts:100` | Exige exactamente `$ 135` tras editar y guardar. Conservar flujo demo completo, valor135, retorno, cero API/errores y comprobación del resultado guardado. |
| `e2e/ux-ui-01.demo.spec.ts:105` | Los seis casos de imagen cuadrada/vertical/horizontal a390/1440 esperan substring crudo123456789.5; agrupación y dos decimales lo contradicen. Mantener entrada123456789.5, nombre largo, proporciones, las seis geometrías y los otros cuatro casos U01. Esperar el importe localizado largo en lugar del substring sin agrupar. |
| `src/features/offers/OfferFormPage.test.tsx:1681,1775` | RTL busca etiqueta exacta Precio base; añadir (MXN) cambia su nombre. Ajustar sólo localizador al nombre explícito nuevo, conservando garantías POST sin option.status y payload exacto con validación sin llamadas. Los demás localizadores con regex ya admiten el sufijo. |
| `src/closure-review.regression.test.tsx:76` | Precio base exacto en recuperación/nueva operación. Adaptar sólo etiqueta; conservar precio17, cambios posteriores, key/ETag y payload. |
| `src/audit-recovery.regression.test.tsx:239` | Precio base exacto al restaurar borrador. Adaptar sólo etiqueta; conservar valor250 y recuperación. |

Playwright `getByLabel("Precio base")` sin exact:true admite un sufijo de etiqueta y no requiere adaptación por sí solo. Se revisarán `audit-layout.spec.ts`, `offer-form.spec.ts`, `operation-recovery.spec.ts`, demo y UX01 al integrar. No cambiar localizadores o fixtures que continúen siendo compatibles. No se encontró una expectativa existente del texto monetario de revisión de servidor; añadir una prueba real para esa ausencia de cobertura funcional.

Los fixtures numéricos en OfferComponents/OfferPresentation/OfferFormPage/OffersPage, App, las regresiones audit/closure, contratos API/catálogo/idempotencia y repositorio demo siguen expresando datos válidos. No añadir currency ni convertir150 a150.00 en los objetos por presentación. Los tests de reintento/versiones deben seguir comparando números y payloads sellados sin modificaciones.

## Pruebas reales propuestas al desbloquear

1. Formateador: entero145, fracción145.5, importe largo123456789.5 y lectura válida0; verificar MXN, agrupación es-MX y dos decimales. Escribir expectativas independientes del propio helper. Verificar el espacio real de Intl entre código e importe en el runtime de proyecto al implementar y conservarlo en la expectativa; no aceptar strings arbitrarios por un replace excesivo.
2. Componentes: tarjeta y revisión muestran la misma cantidad formateada, clase financiera derecha/peso600, etiqueta del input contieneMXN y la vista editable usa el mismo formato sin formatear value. Vacío no inventa0. Un nombre y un importe largos conservan contenido.
3. Formulario: cargar precio con más de dos decimales, editar a145.125, guardar y comprobar número145.125 en POST/PATCH mientras la salida muestra dos decimales. Probar un caso de revisión de conflicto con precio remoto distinto y confirmar que revisar/adoptar mantiene el precio local conforme al contrato actual. Mantener pruebas de positivo/finitud y cero operaciones inválidas.
4. Repetir las diez U01 y recorrido demo de guardado/retorno. Añadir geometría UX12 a320/390/600/740/1024/1440 y módulo estrecho en host ancho para importe largo, etiquetaMXN, output y revisión de servidor. Medir contención, ausencia de superposición, texto financiero y controles40/48; persistir PNG/JSON por outputPath/attachpath. La demo se prepara por UI sin interceptar su repositorio en memoria; la revisión/409 puede usar HTTP controlado en un escenario separado.
5. Tipos, lint, suites focalizadas del helper/componentes/formulario y regresiones generales afectadas. Root centraliza build, cobertura, E2E, puertos y resultados. Si UX13 ya se integró por decisión del orquestador, repetir sus pruebas de guardado/regreso afectadas.

No se ejecutaron tests, build, navegador, cobertura ni servidores en esta preparación. Sólo lectura de fuentes y formateo del índice existente. No se escribieron aplicación/tests/configuración/registro/auditoría ni se hicieron commits. UX12 permanece pendiente hasta UX11 y reserva explícita. Dispositivo físico, teclado virtual y lector manual no se acreditan con esta propuesta.
