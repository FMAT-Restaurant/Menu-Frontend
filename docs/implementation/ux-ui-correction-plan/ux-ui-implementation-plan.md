# Plan de implementación de las correcciones de UX y UI

Fecha de planificación: 23 de octubre de 2026. Estado: plan preparado, implementación pendiente.

Este plan organiza los 28 hallazgos de la [auditoría de UX y UI](audit/ux-ui-audit-2026-10-23.md). Sigue [DESIGN.md](../../DESIGN.md) y la [metodología de planificación](../../planning-method.png). La entrega es documental. Ninguna tarea de implementación se considera realizada por aparecer aquí.

Las fichas UX00 a UX17 están distribuidas en los [tickets por oleada](tickets/README.md), con instrucciones, invariantes, pruebas y criterios de aceptación. Todos permanecen pendientes de implementación.

La [guía de orquestación](orchestation.md) organiza el despliegue de agentes, sus roles, reservas, revisión e integración sobre estas oleadas.

La secuencia comienza con las imágenes que ocultan información comercial y con los fondos modales redundantes. Después consolida la base visual, retira la barra global interna y corrige cada módulo. Los cambios de flujo se hacen sobre esa base, con conservación de borradores, foco y recuperación de operaciones.

## 1. Método, alcance y resultado esperado

La imagen de metodología establece esta secuencia:

1. Partir del reporte original y conservar sus identificadores U01 a U28.
2. Clasificar por complejidad, dependencias, archivos y prioridad.
3. Formar oleadas con tareas desbloqueadas y compatibles.

Este documento aplica esa secuencia mediante la matriz de hallazgos, las fichas UX00 a UX17 y el calendario lógico de oleadas. La prioridad mide el impacto de la auditoría. La oleada considera también requisitos técnicos y reservas de archivos. Un P3 puede entrar antes si prepara una pieza necesaria para corregir un P2.

El resultado esperado comprende catálogo, categorías, entradas, ofertas, composición, biblioteca de recetas, selección de receta y estados de ruta. Debe retirar la marca interna, contener las imágenes, mostrar controles legibles, reducir las capas, proteger la edición y aplicar los tamaños y geometría documentados.

Se mantienen estas restricciones durante toda la ejecución:

- El shell conserva marca, navegación entre módulos, sesión y notificaciones globales. El módulo conserva cabeceras, navegación y feedback propios de la tarea.
- Una tarea modal tiene un solo fondo visible. La selección y creación de receta son pasos de una misma tarea, sin tres ventanas abiertas debajo.
- Se conservan reglas de publicación, estados, identidades de grupos y opciones, paginación, versiones, idempotencia y recuperación. Un cambio de presentación no autoriza nuevas reglas de negocio ni reenvíos automáticos.
- El precio pertenece a la oferta. No se agrega un precio inventado a la entrada ni se transforma su valor almacenado para darle formato.
- Se retiran controles de capacidades pendientes. No se implementan copiar composición ni elegir inventario como parte de esta corrección.
- Se reutilizan los tokens de DESIGN.md. No se agrega otra paleta, una biblioteca visual completa, métricas simuladas, una portada ni ilustraciones para ocultar problemas de estructura.
- Se preservan los cambios previos del usuario. No se restablecen archivos ni se integra trabajo de otra auditoría sin revisar su estado actual.

## 2. Base comprobada para planificar

La base Git es `c73755d98de89f690756a5b179c69761c4934119`, con modificaciones locales previas. Se contrastaron el reporte ampliado, DESIGN.md, las rutas, componentes, estilos, configuración y tests presentes. La planificación usa ese directorio de trabajo, no solo el commit.

Al iniciar ya estaban modificados `README.md`, `docs/DESIGN.md`, `package.json`, `skills-lock.json`, `CategoryFormDialog.tsx`, `useEntryForm.ts`, `RecipeFormDialog.tsx`, `main.tsx` y `tsconfig.json`. También existían archivos sin seguimiento de demo y la skill unslop. UX00 debe registrar de nuevo la base antes de implementar.

Se regeneró un índice con dependency-cruiser 18.7.0 desde `src`, usando `.dependency-cruiser.cjs`, `tsconfig.json` y dependencias TypeScript anteriores a compilación. Contiene 95 módulos y cero dependencias marcadas como no resueltas. El JSON temporal se llama `ux-ui-plan-dependencies.json` y quedó en el directorio de visualizaciones de esta sesión, fuera del repositorio. No es un archivo necesario para ejecutar el plan.

Las consultas nativas a los vecinos de `OfferFormPage`, `RecipePage` y `useEntryResources` se contrastaron con sus imports. La configuración usa `skipAnalysisNotInRules: true`. La consulta de `primitives.css` fue vacía y el grafo omite algunas relaciones verificadas en JSX. Por ello se usa para localizar dependencias, sin atribuirle cobertura exhaustiva de CSS, callbacks o comportamiento.

| Relación comprobada | Implicación para el orden |
| --- | --- |
| `main.tsx` carga `styles.css`, que importa `shared/primitives.css`. | La base compartida se integra antes de ajustar consumidores. Se vuelve a recorrer cada ruta después de cambiarla. |
| `OffersPage` utiliza `OfferCard`. | U01 puede corregirse de forma acotada. Las revisiones posteriores de la tarjeta deben conservar esa corrección. |
| `OfferFormPage` importa `CompositionEditor`, `OfferCommercialInfo`, `OptionModal`, `SlotModal`, `RecipePage` y `RecipeFormDialog`. | El flujo de receta requiere una entrega coordinada entre ofertas y recetas. No conviene repartirlo como dos cambios independientes. |
| `RecipePage` sirve a administración y selección, y monta `RecipeFormDialog`. | El nuevo selector debe reutilizar datos y lógica sin reproducir la cabecera administrativa. La página de administración debe seguir funcionando. |
| `useEntryResources` convierte el error a texto, aunque `entryError.ts` ya distingue `notFound`. | U14 necesita conservar la clasificación para presentar 404 y fallo temporal de forma distinta. No requiere inventar otro contrato HTTP. |
| `App.tsx` usa `BrowserRouter`. La implementación instalada de `useBlocker` consume el contexto de un router de datos. | UX11 incluye la adaptación de rutas necesaria para proteger la navegación. No se añade `useBlocker` directamente sobre el montaje actual. |
| Los tests comprueban recuperación, bloqueo durante envíos y asignación de recetas. | La corrección de capas y borradores debe conservar esas garantías. La sección 8 identifica incompatibilidades de presentación que necesitan revisión explícita. |

El grafo no convierte cada import en una dependencia entre tickets. Las dependencias de la sección 5 se justifican por contratos que cambian, estructura que debe existir o edición de los mismos archivos.

### 2.1 Convención de archivos

Las abreviaturas siguientes se usan únicamente para compactar las tablas. Todos los archivos indicados sin la palabra "nuevo" existen al redactar el plan.

| Clave | Directorio desde la raíz del repositorio |
| --- | --- |
| BASE | [src/styles.css](../../../src/styles.css), [src/shared/primitives.css](../../../src/shared/primitives.css), [src/shared/SearchField.tsx](../../../src/shared/SearchField.tsx) |
| APP | [src/App.tsx](../../../src/App.tsx), [src/main.tsx](../../../src/main.tsx) |
| CAT | [src/features/catalog/](../../../src/features/catalog/) |
| CAG | [src/features/categories/](../../../src/features/categories/) |
| ENT | [src/features/entries/](../../../src/features/entries/) |
| OFE | [src/features/offers/](../../../src/features/offers/) |
| REC | [src/features/recipes/](../../../src/features/recipes/) |

Los archivos nuevos propuestos en las fichas son destinos de implementación. No se presentan como componentes que ya existan.

## 3. Decisiones y condiciones previas

UX00 registra cada decisión con responsable, fuente y estado. Una incertidumbre del anfitrión no detiene la corrección acotada de U01. Tampoco permite dar por validada la integración.

| Decisión | Dirección y condición de salida | Responsable y efecto |
| --- | --- | --- |
| D01. Montaje y responsabilidad del shell | Retirar `.global-nav` de las pantallas ya está decidido por DESIGN.md y la auditoría. Confirmar por separado DOM compartido o iframe, área que puede bloquear un modal, propietario del scroll, anuncio de rutas y título de documento. En demo se usa un contenedor de módulo explícito, sin otra barra de marca obligatoria. | Responsable de integración con el shell. UX02 y UX03 documentan el contrato autónomo; UX15 y UX17 necesitan evidencia del montaje real para cerrar U24 y las condiciones de integración de U05 y U28. |
| D02. Moneda y presentación numérica | `MenuOffer.basePrice` es un número sin moneda en el tipo local. La [arquitectura local](../../arch.md) mantiene abierta la decisión de moneda y precisión. Confirmar moneda, localización y presentación de decimales antes de cerrar U12. No deducir MXN a partir de `$`, de los ejemplos ni de la zona horaria. | Responsable de producto y contrato. UX12 queda condicionado a la respuesta. Las demás correcciones pueden avanzar. La moneda de demostración, si se define, se identifica como tal. |
| D03. Cantidad de grupo | Acordar un único término para `CompositionSlot.quantity`, que actualmente aparece como "Unidades incluidas" y "rondas". Distinguirlo de cantidad y unidad de un insumo de inventario. Conservar valores, validación y payload. | Responsable de dominio/producto. UX14 necesita el término confirmado para cerrar esa parte de U20; la geometría del grupo puede corregirse antes. |
| D04. Cierre con cambios | Formulario intacto cierra directamente. Formulario modificado permite continuar o descartar de forma explícita. Avanzar y regresar entre pasos conserva los borradores en memoria. Durante envío o resultado incierto manda la política de recuperación existente. | Dirección adoptada para UX10 y UX11. No exige persistir nuevos borradores en almacenamiento local. |
| D05. Archivos de imagen | Conservar el límite real de `MAX_IMAGE_BYTES`, 10 × 1024 × 1024 bytes, y los tipos admitidos. Elegir una expresión única y exacta del límite, por ejemplo "10 MiB", acompañada de la misma ayuda en ambos formularios. | UX14. No reducir ni ampliar el límite para simplificar el texto. |

Si D01, D02 o D03 siguen pendientes, se registra su alcance exacto. Un ticket puede entregar partes independientes, pero el hallazgo afectado continúa abierto. No se aprueba una moneda provisional ni una integración simulada como cierre de producción.

## 4. Clasificación y trazabilidad de los 28 hallazgos

Complejidad S significa cambio localizado con contrato estable. M requiere coordinar componentes o estados de una misma área. L abarca varios flujos, consumidores o integración con el anfitrión. Son tamaños relativos, sin promesas de horas. La prioridad conserva la clasificación de la auditoría, con 1 P1, 24 P2 y 3 P3.

Cada hallazgo tiene un responsable de cierre. Los aportes de otros tickets son obligatorios cuando aparecen en la tabla. Una definición compartida no cierra un defecto mientras sus consumidores sigan mostrando el problema.

| ID | Prioridad | Complejidad | Archivos principales | Responsable de cierre y aportes requeridos |
| --- | --- | --- | --- | --- |
| U01 | P1 | S | OFE/OfferCard.tsx, OFE/styles.css | UX01; UX09 conserva el resultado. |
| U02 | P2 | M | OFE/CompositionEditor.tsx, OFE/SlotCard.tsx, OFE/styles.css | UX09. |
| U03 | P2 | L | BASE y controles en CAT, CAG, ENT, OFE y REC | UX02; adopción en UX03, UX05, UX06, UX07, UX08 y UX09. |
| U04 | P2 | M | CAG/CategoryFormDialog.tsx, REC/RecipeFormDialog.tsx | UX08; aporte de UX05 y patrón conservado de ENT/EntryFormPage.tsx. |
| U05 | P2 | M | APP, CAT/CatalogPage.tsx, ENT/EntryFormPage.tsx, OFE/OffersPage.tsx, OFE/OfferFormPage.tsx | UX04; comprobación D01 en UX17. |
| U06 | P2 | M | BASE, páginas y styles.css de las cinco áreas | UX04; UX10 elimina la estructura administrativa del selector. |
| U07 | P2 | M | BASE y styles.css de CAT, CAG, ENT, OFE y REC | UX02; adopción en UX04 a UX09. |
| U08 | P2 | M | BASE y styles.css de CAT, CAG, ENT, OFE y REC | UX02; adopción en UX03 a UX09. |
| U09 | P2 | M | OFE/SlotCard.tsx, OFE/SlotOptionItem.tsx, OFE/OfferCard.tsx, OFE/OfferCommercialInfo.tsx, OFE/styles.css | UX09; tratamiento compartido de UX02 y estados de UX06, UX07 y UX08. |
| U10 | P2 | M | CAT/EntryCard.tsx, REC/RecipeCard.tsx, OFE/OfferCard.tsx, OFE/SlotCard.tsx, OFE/SlotOptionItem.tsx | UX09; aportes de UX06 y UX08, confirmación conservada por UX03. |
| U11 | P2 | S | CAT/EntryCard.tsx, CAT/styles.css | UX06. |
| U12 | P2 | M | OFE/OfferCard.tsx, OFE/OfferCommercialInfo.tsx, OFE/OfferFormPage.tsx, OFE/styles.css | UX12, condicionado a D02. |
| U13 | P2 | S | REC/RecipePage.tsx | UX08; variante de selección comprobada de nuevo en UX10. |
| U14 | P2 | M | ENT/useEntryResources.ts, ENT/entryError.ts, ENT/EntryFormPage.tsx | UX07. |
| U15 | P2 | L | APP, formularios de CAG, ENT, OFE y REC, ENT/useEntryForm.ts | UX11; flujo de pasos de UX10. |
| U16 | P2 | L | OFE/OfferFormPage.tsx, OFE/OptionModal.tsx, REC/RecipePage.tsx, REC/RecipeFormDialog.tsx | UX10. |
| U17 | P2 | M | OFE/OfferFormPage.tsx, OFE/styles.css, ENT/EntryFormPage.tsx, ENT/styles.css | UX13; requiere composición final de UX04, UX09 y UX10. |
| U18 | P2 | M | OFE/OfferFormPage.tsx, OFE/OffersPage.tsx, ENT/EntryFormPage.tsx, ENT/useEntryForm.ts, CAT/CatalogPage.tsx | UX13. |
| U19 | P2 | L | styles.css y componentes responsive de CAT, ENT, OFE y REC, BASE | UX09; aportes de UX02, UX06, UX07 y UX08. |
| U20 | P2 | M | Formularios y feedback de CAG, ENT, OFE y REC, OFE/CompositionEditor.tsx, OFE/SlotModal.tsx, OFE/SlotCard.tsx | UX14, con D03 y D05. |
| U21 | P3 | S | OFE/CompositionEditor.tsx, OFE/OptionModal.tsx | UX09. |
| U22 | P3 | S | BASE, cierres de formularios y OFE/OfferCommercialInfo.tsx | UX02; adopción en UX03 y UX05 a UX09. |
| U23 | P2 | S | OFE/OfferCommercialInfo.tsx, OFE/styles.css | UX09. |
| U24 | P2 | L | APP, cabeceras y destinos de regreso de CAT, CAG, ENT, OFE y REC | UX15; marcadores de UX04, UX06 y UX09, contrato D01. |
| U25 | P3 | M | APP, páginas de CAT, ENT, OFE y REC, CAG/CategoryPage.tsx y estilos | UX16. |
| U26 | P2 | M | BASE, CAT/CatalogPage.tsx, OFE/OffersPage.tsx, REC/RecipePage.tsx y fondos de diálogos | UX03; UX10 y UX11 conservan un solo nivel. |
| U27 | P2 | L | OFE/OfferFormPage.tsx, OFE/OptionModal.tsx, REC/RecipePage.tsx, REC/RecipeFormDialog.tsx y sus estilos | UX10. |
| U28 | P2 | L | Ciclo de diálogos de CAT, CAG, OFE y REC, BASE y contrato D01 | UX03; comprobación con pasos de UX10 e integración en UX17. |

## 5. Oleadas y dependencias de ejecución

Un requisito debe estar integrado en la base de trabajo, no solo anunciado como terminado. Las oleadas no son sprints con duración fija. Las que tienen varios tickets permiten trabajo compatible, sin obligar a usar varios agentes.

| Oleada | Tickets desbloqueados | Requisitos directos | Resultado que permite continuar |
| --- | --- | --- | --- |
| 0 | UX00 | Ninguno | Base registrada, decisiones y evidencia organizadas. |
| 1 | UX01 y UX02 | UX00 | Información comercial visible y base visual compartida disponible. Sus archivos de aplicación son distintos. |
| 2 | UX03 | UX02 | Contrato modal aplicado, un solo fondo y conservación de scroll. |
| 3 | UX04 | UX01 y UX03 | Pantallas sin marca interna, cabeceras locales y destinos de foco definidos. |
| 4 | UX05, UX06 y UX07 | UX04 | Categorías, catálogo y entradas corregidos en conjuntos separados. |
| 5 | UX08 y UX09 | UX08 requiere UX05; UX09 requiere UX06 y UX07 | Recetas y ofertas adoptan la base sin editar los archivos de la otra área. |
| 6 | UX10 | UX08 y UX09 | Opción, selección y creación funcionan como pasos de una sola tarea. |
| 7 | UX11 | UX10 | Cierre y navegación protegen los cambios en todos los formularios. |
| 8 | UX12 | UX11 y D02 | Presentación financiera consistente, sin alterar importes almacenados. |
| 9 | UX13 | UX11; UX12 si está en ejecución | Guardado accesible y resultado confirmado al regresar a listados. |
| 10 | UX14 y UX15 | UX13; UX14 requiere D03 y D05; UX15 requiere D01 para cierre integrado | Microcopia final y contexto de navegación. Las reservas separan textos de formularios y coordinación de rutas. |
| 11 | UX16 | UX14 y UX15 | Cargas iniciales y actualizaciones conservan la estructura final. |
| 12 | UX17 | UX01 a UX16 y aportes de la matriz | Evidencia integrada por hallazgo, pruebas y revisión en demo, dispositivo y shell. |

Si D02 no se ha resuelto, UX13 puede adelantarse a UX12. Comparten archivos de ofertas, por lo que trabajan por turnos. UX13 no decide el formato monetario. UX12 se integra después sobre la misma base y repite las comprobaciones de guardado afectadas. U12 y UX17 siguen pendientes hasta resolver D02.

Si D03 sigue pendiente, UX14 puede entregar los demás textos y UX16 puede preparar las cargas. El vocabulario de cantidad y el cierre completo de U20 se mantienen abiertos. Esta excepción no elimina requisitos del cierre.

### 5.1 Reservas y compatibilidad

Se reserva el archivo completo, incluidos sus tests y estilos. Un import compartido no obliga a serializar, pero dos ediciones del mismo archivo sí requieren turnos. Si aparece un archivo adicional, se amplía la reserva y se vuelve a comprobar la compatibilidad antes de editarlo.

| Archivos compartidos | Orden de edición previsto |
| --- | --- |
| `src/styles.css`, `src/shared/primitives.css`, `src/shared/SearchField.tsx` | UX02 define la base; UX03 añade el tratamiento modal; UX04 consolida cabeceras; UX16 añade cargas. Los tickets de área consumen esa base sin redefinirla en paralelo. |
| `src/App.tsx` y `src/App.test.tsx` | UX02 añade el ámbito del módulo; UX04 retira la marca de la ruta inexistente; UX11 adapta el router y sus pruebas; UX15 gestiona foco y título; UX16 ajusta el fallback. |
| `src/main.tsx` | UX02 solo si el ámbito exige cambiar el montaje; UX15 coordina título y demo. Preservar los cambios previos. |
| `OFE/styles.css`, `OFE/OfferCard.tsx` | UX01 corrige la imagen; UX03 cambia fondos; UX04 cambia cabecera; UX09 adopta diseño y responsive; UX10 ajusta pasos; UX12 formatea importes; UX13 ajusta acciones; UX16 añade carga. |
| `OFE/OfferFormPage.tsx` | UX03, UX04, UX09, UX10, UX11, UX12, UX13, UX14 y UX16, por ese orden salvo la excepción D02. Ninguno conserva una copia antigua del formulario. |
| `REC/RecipeFormDialog.tsx` y `REC/RecipePage.tsx` | UX03, UX04 donde corresponda, UX08, UX10, UX11, UX14 y UX16. Extraer contenido reutilizable no duplica el estado de recuperación. |
| `CAG/CategoryFormDialog.tsx`, `CAG/styles.css` | UX03, UX04 donde corresponda, UX05, UX11, UX14 y UX16. |
| `CAT/CatalogPage.tsx`, `ENT/EntryFormPage.tsx` y sus estilos | UX03 y UX04 preparan; UX06 y UX07 trabajan en áreas distintas; UX11, UX13, UX14 y UX16 entran después por turnos. |
| `OFE/OfferComponents.test.tsx` | UX03, UX09, UX10, UX11, UX12 y UX14 según casos afectados. No repartir este archivo entre ejecutores simultáneos. |
| `e2e/demo-mode.e2e.ts` y configuración compartida de Playwright | Un editor a la vez. Las oleadas con varios tickets usan archivos de regresión propios. La modificación compartida se integra al recibir cada entrega. |

UX14 y UX15 pueden coincidir porque UX04 deja marcadores de foco y UX06 y UX09 dejan identidades de regreso. UX15 edita APP y un coordinador nuevo de rutas, sin modificar textos o formularios. Si esa separación deja de ser suficiente, ambos tickets se ejecutan por turnos.

## 6. Fichas de implementación

Cada ficha incluye el comportamiento, su alcance y la evidencia que debe entregar. Los tests asociados son consumidores que deben ejecutarse. Su inclusión no autoriza cambiar expectativas por conveniencia.

### UX00. Preparar base, decisiones y registro

Complejidad M. Sin requisitos previos. Habilita todos los tickets.

Registrar commit, cambios locales, versiones instaladas, hashes de las fuentes normativas y disponibilidad de demo, Chromium, Docker, shell y dispositivo. Actualizar las dependencias si cambian imports respecto de esta base. Resolver o asignar D01 a D05 y conservar visibles sus pendientes.

Ejecutar la línea base de la sección 7. Guardar resultados y fallos preexistentes sin corregirlos por conveniencia. Preparar `execution/` y `execution/evidence/` dentro de esta carpeta cuando comience la implementación. Conservar el directorio `audit/` como evidencia histórica.

La salida es un registro de ejecución con tareas, reserva activa, base integrada, decisiones y resultado por comando. No se exige que la base inicial esté verde para documentarla. Una falla debe investigarse antes de atribuirla a un ticket nuevo.

### UX01. Recuperar nombre y precio en tarjetas de oferta

Complejidad S. Prioridad P1. Requiere UX00. Cierra U01.

Reservar `OFE/OfferCard.tsx`, la sección de tarjeta de `OFE/styles.css` y la regresión visual correspondiente. Mantener estable el contrato de props. Contener el tamaño intrínseco de la imagen, separar su zona de nombre, entrada y precio, y conservar el fallback por error de carga.

Comprobar "Individual" y "Combo con bebida" a 1440 y 390 px, además de archivos cuadrados, verticales y apaisados. La evidencia debe mostrar texto completo y ausencia de intersección con la imagen. Un encabezado presente en el DOM no basta. Ejecutar `OfferComponents.test.tsx` y `OffersPage.test.tsx`.

Entregar capturas comparables con las evidencias 11 y 17 de la auditoría y una comprobación geométrica del defecto. UX09 debe repetirla al rediseñar la tarjeta. No esperar a la decisión de moneda para recuperar la visibilidad del importe existente.

### UX02. Definir y limitar la base visual compartida

Complejidad M. Requiere UX00. Responsable de U03, U07, U08 y U22, con adopción posterior.

Reservar BASE, el ámbito de montaje en APP y tests nuevos de los componentes compartidos que lo necesiten. Añadir un contenedor identificable del módulo. Limitar tokens, resets y selectores generales a su ámbito; documentar cualquier regla que deba pertenecer al montaje autónomo. No declarar probada la ausencia de fugas al shell sin la verificación de D01.

Definir roles de texto 28/36, 22/30, 18/26, 16/24, 14/20 y 12/16; radios 4, 8 y 12; espacios de base 4; controles estándar de 40 px y variante táctil de 48 px. Los botones de icono tienen al menos 40 × 40 px y la presentación táctil usa 48 px. Evitar excepciones compactas en los controles que la auditoría encontró insuficientes.

Definir estados con punto y texto, focus visible, campos con error y familia SVG pequeña para buscar, cerrar, agregar e imagen. Puede añadirse `src/shared/Icon.tsx`, nuevo, sin instalar una biblioteca para cuatro símbolos. Los SVG decorativos se ocultan al lector; los controles conservan nombre accesible.

Preparar también el contrato de marcador de cabecera y de origen de navegación que consumirán UX04, UX06, UX09 y UX15. El punto de corte depende del ancho útil del módulo o componente. Preferir contenedores CSS cuando el viewport no represente ese ancho. Los diálogos y los paneles de insumos necesitan evaluar su propio espacio.

La salida es una base utilizada por controles existentes, con comparación de todas las rutas. El cierre de los cuatro hallazgos espera los aportes de consumidores de la matriz y su verificación en UX17.

### UX03. Unificar fondo, foco y scroll de diálogos

Complejidad L. Requiere UX02. Cierra U26 y U28 con verificación de integración D01.

Reservar las confirmaciones de `CAT/CatalogPage.tsx`, `OFE/OffersPage.tsx` y `REC/RecipePage.tsx`; los diálogos de categorías, recetas, grupo, opción y selector; sus reglas modales en BASE y estilos de área. Coordinar un solo contrato de ciclo de vida. Pueden añadirse `src/shared/TaskDialog.tsx` y `src/shared/useModalScrollLock.ts`, nuevos, con alcance limitado a este comportamiento.

Usar un solo mecanismo de fondo por confirmación. En el montaje autónomo con diálogo nativo, `::backdrop` define el fondo y el wrapper deja de oscurecer. Usar el ejemplo de confirmación `rgba(17,24,39,0.4)` y un tratamiento documentado para el resto de la familia. No resolver la acumulación cambiando `z-index`.

Conservar foco inicial seguro, Tab contenido, retorno al disparador y bloqueo de cierre durante operaciones cuando ya corresponde. Bloquear el documento desplazable correcto durante la sesión modal. Guardar y restituir posición y estilos anteriores sin dejar `overflow` o listeners residuales. Asegurar apertura y limpieza bajo StrictMode. En integración, consumir el contrato del anfitrión si este controla el bloqueo.

Probar entrada archivada, oferta inactiva y receta al abrir y cancelar. En una página larga, PageUp, PageDown, rueda y gesto táctil fuera del área desplazable del diálogo no deben mover el fondo. El contenido del diálogo sí debe poder desplazarse. Cancelar y Escape dejan cero fondos y recuperan foco y posición.

En esta oleada se unifica el mecanismo de cada diálogo existente. La cadena de varios diálogos todavía no se declara resuelta: su sustitución completa corresponde a UX10. Ejecutar las suites de páginas y componentes afectados y una regresión en Chromium, porque jsdom no acredita la capa superior nativa ni el scroll real.

### UX04. Retirar marca interna y consolidar cabeceras locales

Complejidad M. Requiere UX01 y UX03. Cierra U05 y U06, con aporte posterior de UX10.

Reservar APP para `NotFoundPage`, las páginas de CAT, CAG, ENT, OFE y REC, y sus reglas de cabecera y ancho. Retirar `.global-nav`, marca y texto global de las pantallas. No reemplazarlos por otra banda global obligatoria en la demo.

Componer una cabecera local con regreso, un título de tarea, contexto de entidad y acciones necesarias. Eliminar el rótulo repetido "Administración / Menú / Ofertas" cuando no aporta navegación. Retirar la banda oscura y títulos de colección duplicados de categorías y recetas. Usar superficies y alineación comunes. Documentar anchos de trabajo distintos solo cuando los justifique el contenido.

Añadir el destino de foco acordado por UX02 sin ejecutar todavía una segunda política de navegación. Preservar `returnTo`, filtros y páginas. Comparar el editor con la referencia del usuario y con la captura 31. La salida muestra el contenido de tarea desde el comienzo, sin los 72 px de marca interna. No se impone una altura exacta a la nueva cabecera.

Revisar catálogo, categorías, recetas, entrada nueva y editada, ofertas, editor y ruta inexistente. Ejecutar `App.test.tsx` y suites de las páginas afectadas. Confirmar D01 en UX17 antes de afirmar que el shell completo tiene una sola marca.

### UX05. Corregir formulario de categorías

Complejidad M. Requiere UX04. Aporta U03, U04, U07, U08 y U22.

Reservar `CAG/CategoryFormDialog.tsx`, `CAG/styles.css`, `CategoryPage.test.tsx` y regresiones de categorías. Presentar obligatorio u opcional antes del envío, error persistente junto al campo, `aria-invalid` y asociación mediante `aria-describedby`. El resumen complementa los mensajes y el foco lleva al error sin perder datos.

Adoptar tamaños, cierres SVG, radios y escala compartidos. Conservar tratamiento de errores HTTP, recuperación de creación, bloqueo durante envío y revisión de versión. No reemplazar estas garantías por una validación HTML que oculte la información.

Probar envío vacío, corrección, error de servicio y recuperación con teclado en 390 y 1024 px. Un envío inválido no debe llamar al repositorio. La entrega aporta evidencia de categoría a U04; el cierre conjunto lo completa UX08 con recetas.

### UX06. Corregir tarjetas y adaptación del catálogo

Complejidad M. Requiere UX04. Cierra U11 y aporta U03, U07, U08, U09, U10, U19 y U22.

Reservar `CAT/CatalogPage.tsx`, `CatalogFilters.tsx`, `CatalogResults.tsx`, `EntryCard.tsx`, `CAT/styles.css` y sus tests. Mostrar un enlace o acción inequívoca "Ver ofertas", con conteo si ayuda. Distinguirlo de editar la identidad de la entrada. Evitar controles interactivos anidados y conservar la secuencia de teclado.

Reducir la jerarquía de eliminar y comunicar la condición de archivado de forma visible o mediante ayuda accesible con teclado y tacto. Si se usa un menú de acciones, debe abrir, recorrer y cerrar con teclado y devolver el foco. Conservar identificación y confirmación para la eliminación definitiva.

Aplicar una columna con ancho útil inferior a 768 px. La cuadrícula del catálogo usa dos columnas en tableta y tres o cuatro desde 1200 px útiles, con el contenido legible y los controles táctiles necesarios. Reorganizar filtros y selector de tamaño de página sin comprimir "12" a "1" ni reducir la altura para encajar. Conservar búsqueda, estado, categorías, paginación y destinos de regreso. Añadir identidades estables para que UX15 restaure el foco de origen.

Probar 320, 390, 740, 768 y 1200 px útiles, nombres largos, varias categorías y estados distintos. Ejecutar `CatalogPage.test.tsx`, `CatalogPage.remediation.test.tsx`, `CatalogResults.test.tsx` y E2E de catálogo afectados. No mostrar un precio único inventado en la entrada.

### UX07. Corregir estado inexistente y presentación de entradas

Complejidad M. Requiere UX04. Cierra U14 y aporta U03, U07, U08, U09, U19 y U22.

Reservar `ENT/EntryFormPage.tsx`, `useEntryResources.ts`, `entryError.ts`, `EntryImageField.tsx`, `EntryCategorySelector.tsx`, `ENT/styles.css` y pruebas de entradas. Ampliar el resultado de recursos para conservar el tipo de error existente. El 404 presenta contexto y una salida al catálogo; no conserva un formulario vacío de alta deshabilitado ni reintento inútil.

El fallo temporal mantiene un reintento apropiado. La carga independiente de categorías no debe bloquear identidad, borrar selecciones o forzar consultas repetidas. Conservar las ayudas de edición y la imagen actual. Adoptar escala y geometría sin perder el resumen de validación ni el mecanismo que revela controles cubiertos por el footer.

Comprobar `/entries/audit-missing-entry/edit` en demo y una respuesta HTTP 404 en el entorno de pruebas correspondiente. Probar aparte error temporal, categorías lentas y carga de una entrada real. Ejecutar `EntryFormPage.test.tsx` y `entryError.test.ts`. La recuperación tras éxito se completa en UX13; la protección al abandonar se completa en UX11.

### UX08. Corregir biblioteca y formulario de recetas

Complejidad L. Requiere UX05. Cierra U04 y U13; aporta U03, U07, U08, U09, U10, U19 y U22.

Reservar `REC/RecipePage.tsx`, `RecipeCard.tsx`, `RecipeFormDialog.tsx`, `REC/styles.css`, `RecipePage.test.tsx` y regresiones de recetas. Separar biblioteca vacía de búsqueda sin coincidencias. La búsqueda fallida conserva el término y ofrece limpiar o cambiar la consulta como recuperación principal.

Situar errores de nombre, instrucciones, insumo y cantidad junto al control y asociarlos de forma accesible. El resumen lleva al campo y no oculta el motivo bajo toda la lista de insumos. Conservar la lógica de consulta, selección de inventario, unidades autoritativas y tratamiento de respuestas tardías.

Transformar la tabla de insumos según el ancho útil de su contenedor. A 600 y 740 px no deben comprimirse select ni cantidades. Aplicar los tamaños táctiles también en tableta. Reducir cajas repetidas y el protagonismo de eliminar recetas, conservando su confirmación y restricciones de referencia.

Probar biblioteca con tres recetas y consulta sin coincidencias, biblioteca realmente vacía, varios insumos, cantidades inválidas y texto largo. Verificar administración y el modo de selección existente antes de sustituir su contenedor en UX10. La entrega no debe cambiar el contrato de creación ni descartar recuperación de operaciones.

### UX09. Corregir composición, tarjetas y controles de ofertas

Complejidad L. Requiere UX06 y UX07. Cierra U02, U09, U10, U19, U21 y U23 con los aportes previos; completa adopción de U03, U07, U08 y U22.

Reservar los componentes de OFE, `OfferFormPage.tsx`, `OffersPage.tsx`, `OFE/styles.css`, `OfferComponents.test.tsx`, `OffersPage.test.tsx`, `OfferFormPage.test.tsx` y regresiones propias. Repetir la prueba de U01 y conservar su contención de imagen.

Apilar los grupos por debajo de 768 px útiles. Todos los grupos y "Agregar grupo" deben descubrirse con recorrido vertical. Retirar mínimos rígidos que causan el ancho de 792 px dentro de 349 px. En espacios amplios, el layout puede distribuir grupos sin cortar información ni acciones.

Aplicar títulos, metadatos de al menos 12/16, radios y espacios compartidos. Retirar franjas laterales de opciones y señales de estado redundantes. Unificar punto y texto, separar indicador de estado y control, y usar terracota para radios seleccionados. Curso y cantidad usan tratamiento neutro.

Reducir el peso de eliminar ofertas, grupos y opciones. Comunicar restricciones junto a la acción o de forma accesible al abrir sus alternativas. Diferenciar eliminación persistente de retirada de una opción del borrador. No quitar confirmaciones ni inventar una recuperación que aún no existe.

Retirar el botón de copiar composición y la tarjeta de elegir inventario pendiente. Mantener disponibles los orígenes ya soportados por el contrato y la edición de opciones existentes. Sustituir el emoji de imagen y mostrar "Cambiar imagen" también con teclado y tacto, con vista previa y selector de archivo funcionales.

Probar dos o más grupos, varias opciones, oferta sin etiqueta, estados activos e inactivos, imágenes fallidas y navegación de vuelta al catálogo. Entregar medidas de controles y capturas en 320, 390, 600, 740, 1024 y 1440 px, registrando el ancho útil real. No añadir todavía una barra global de guardado. UX13 decide las acciones con esta composición final.

### UX10. Convertir la selección de receta en pasos de una tarea

Complejidad L. Requiere UX08 y UX09. Cierra U16 y U27.

Reservar `OFE/OfferFormPage.tsx`, `OptionModal.tsx`, `REC/RecipePage.tsx`, `RecipeFormDialog.tsx`, sus estilos y pruebas consumidoras. Separar contenido de formulario y datos reutilizables del contenedor modal. Pueden añadirse `REC/RecipeSelector.tsx` y `REC/RecipeFormContent.tsx`, nuevos. El formulario de administración reutiliza la misma lógica; no se duplica la máquina de recuperación.

El contenedor de opción presenta los pasos "Editar opción", "Elegir receta" y "Crear receta" sustituyendo su contenido. El selector tiene título de tarea y grupo, buscador, resultados y asignación. Elimina banda administrativa, segundo título de panel y cajas que retrasan el primer resultado.

| Transición | Comportamiento requerido |
| --- | --- |
| Opción a elegir receta | Conservar nombre, estado, identidad local y demás datos de la opción. Mantener un solo diálogo modal. |
| Seleccionar receta existente | Asignar la receta y volver a la opción, con foco en su disparador o resumen. No guardar la oferta automáticamente. |
| Elegir receta a crear receta | Mantener consulta, página y selección en memoria. Sustituir el paso, sin abrir otra ventana. |
| Regresar desde creación | Recuperar la búsqueda y la opción. Si hay edición de receta, aplicar la decisión D04 dentro del mismo contenedor. |
| Crear con éxito | Crear una sola vez y conservar el comportamiento de asignación de la receta nueva al flujo de opción. Volver al editor con su resto de datos intacto. |
| Error o resultado incierto | Permanecer en el paso con borrador y recuperación apropiados. No cerrar ni repetir la escritura automáticamente. |

Escape o Volver afecta al paso actual; no cierra toda la oferta por un listener global. UX11 añade la protección común de cambios antes de descartar. Conservar foco contenido y retorno lógico sin mantener tres diálogos ocultos abiertos.

La evidencia debe contar un máximo de un `dialog[open]:modal` en este recorrido, un fondo y cero capas tras cerrar. Comprobar ida y vuelta, creación rechazada, reintento controlado, cierre y retorno de foco. Ejecutar suites de ofertas, recetas y recuperación, y revisar el caso O19/O34 de `e2e/offer-form.spec.ts` sin perder sus garantías de borrador.

### UX11. Proteger cambios al cerrar y navegar

Complejidad L. Requiere UX10. Cierra U15.

Reservar APP, formularios de CAG, ENT, OFE y REC, `ENT/useEntryForm.ts` y sus tests. Añadir una política común de edición modificada basada en el borrador inicial confirmado, incluido archivo de imagen, categorías y composición. Conservar los borradores de pasos; regresar de un selector no equivale a abandonar el formulario.

Migrar el montaje autónomo de `BrowserRouter` a un router de datos compatible con `useBlocker`, manteniendo las rutas actuales, carga diferida, inyección de repositorio y query params. La instancia del router debe ser estable. Si el anfitrión ya aporta router, usar su contrato en lugar de anidarlo. UX00 registra esta variante en D01. Los tests de rutas deben cubrir ambos contratos que se soporten.

Aplicar "Seguir editando" y "Descartar cambios" a cruz, Cancelar, Escape, enlaces y atrás o adelante del navegador. En un diálogo abierto, sustituir temporalmente su contenido o usar una confirmación interna; no crear un segundo fondo. Un formulario intacto cierra sin pregunta. Un guardado exitoso permite navegar sin una nueva advertencia.

Para recarga o cierre del documento, registrar `beforeunload` solo mientras haya cambios y aceptar la advertencia nativa del navegador. No prometer texto personalizado. No interceptar la navegación con una combinación de saltos de historial que pierda la URL de destino.

Mantener el tratamiento de envíos pendientes e inciertos, las referencias de operación y la prohibición de doble envío. Probar receta con nombre escrito, categoría editada, entrada con imagen nueva, oferta con composición y opción/grupo modificados. Reabrir tras "Seguir editando" conserva todo; descartar exige decisión explícita. Ejecutar pruebas de rutas, formularios y recuperación.

### UX12. Presentar importes con un contrato explícito

Complejidad M. Requiere UX11 y D02. Cierra U12.

Reservar `OFE/OfferCard.tsx`, `OfferCommercialInfo.tsx`, los importes de revisión en `OfferFormPage.tsx`, `OFE/styles.css` y tests afectados. Añadir un formateador compartido, por ejemplo `src/shared/formatMoney.ts`, nuevo, con moneda y localización explícitas confirmadas por D02.

Usar el mismo formato en tarjeta, edición y revisión de conflictos. Alinear importes a la derecha, con peso 600 o 700. El campo de precio indica la moneda y mantiene una etiqueta visible. El formateador no altera payload, precisión de dominio ni valor almacenado. No fijar dos decimales si la decisión normativa establece otra presentación.

Probar importe entero, fraccionario y de varios dígitos con la precisión acordada. Revisar que separadores, símbolo o código y etiqueta caben en móvil. Conservar los validadores de precio existentes. Si D02 sigue abierta, entregar el pendiente explícito y avanzar UX13 por turnos, sin cerrar U12.

### UX13. Completar acceso al guardado y feedback de regreso

Complejidad M. Requiere UX11 y turno libre de UX12. Cierra U17 y U18.

Reservar `OFE/OfferFormPage.tsx`, `OffersPage.tsx`, `OFE/styles.css`, `ENT/EntryFormPage.tsx`, `useEntryForm.ts`, `ENT/styles.css`, `CAT/CatalogPage.tsx` y tests de esos consumidores.

Medir de nuevo el formulario después de compactar cabecera, retirar controles pendientes y adaptar grupos. Si sigue siendo largo, añadir acciones persistentes limitadas al formulario, con espacio reservado y una sola acción principal de guardado. En una variante corta no se añade la barra por defecto. El diálogo tiene sus propias acciones. Evitar que campos, mensajes y último grupo queden tapados, también con poca altura y teclado virtual.

Después de un guardado confirmado, transmitir un resultado local al listado de destino que identifique entrada u oferta. Consumirlo una sola vez y anunciarlo mediante una región de estado, sin sistema global de notificaciones ni temporizador artificial. Diferenciar rechazo y resultado incierto de éxito. Un fallo posterior de navegación o recarga del listado no debe habilitar una segunda creación ya confirmada.

Probar alta y edición de entrada, alta y edición de oferta, error de guardado y resultado incierto. Comprobar foco por Tab y Shift+Tab sobre controles cercanos al footer a 390 × 844, 390 × 568 y 844 × 390. La variante táctil necesita además dispositivo con teclado virtual. Conservar filtros y regreso al listado.

### UX14. Reescribir microcopia sin perder decisiones operativas

Complejidad M. Requiere UX13, D03 y D05. Cierra U20.

Reservar textos visibles de páginas, formularios y feedback de CAG, ENT, OFE y REC, incluidos `ENT/EntryFormFeedback.tsx`, `OFE/CompositionEditor.tsx` y `SlotModal.tsx`. No editar APP ni el coordinador de rutas reservado a UX15. Aplicar unslop a una tabla de texto anterior, texto propuesto, estado real y acción que habilita.

Usar entrada, oferta, grupo, opción, receta e insumo de forma consistente. Retirar enums, ETag, claves de idempotencia e identificadores de implementación del texto principal cuando no ayudan a decidir. Conservar en recuperación las diferencias entre no enviado, rechazado, incierto y confirmado. No ocultar que repetir una operación puede requerir una decisión explícita.

Unificar cantidad de grupo según D03 y límite de imagen según D05. "Guardar oferta" sigue la capitalización del producto. Las restricciones de activación y publicación permanecen aunque la explicación sea más breve.

Revisar alta, edición, validación, conflicto, recuperación y cierre con cambios. Los textos de estados difíciles de producir en demo requieren casos dirigidos con el repositorio o entorno HTTP de pruebas, no capturas de éxito usadas como sustituto. Ejecutar las suites que verifican esas garantías y explicar cualquier cambio de texto literal de la sección 8.

### UX15. Restaurar foco y contexto al navegar

Complejidad M con cierre de integración L. Requiere UX13 y contrato D01. Cierra U24.

Reservar APP, `src/App.test.tsx` y un coordinador nuevo, por ejemplo `src/shared/RouteContext.tsx`. Consumir los marcadores ya añadidos por UX04 y las identidades de origen de UX06 y UX09. No añadir una nueva cabecera ni un segundo enlace global de salto dentro de las pantallas.

Al cambiar de tarea, enfocar el título o inicio de contenido local. Al regresar, recuperar el elemento de origen si aún existe; si se eliminó o filtró, usar el título o resultados como alternativa. Cambiar filtros o página de resultados no se trata automáticamente como entrar en otra pantalla. El foco de un error y el de un diálogo tienen prioridad sobre el anuncio de ruta.

Coordinar título de documento con el anfitrión. En demo conservar el prefijo `[DEMO]` y añadir el nombre de tarea. El shell define su enlace global de salto cuando sea dueño del documento. Verificar con lector de pantalla el anuncio en ambos montajes y que no haya dos coordinadores compitiendo.

Probar catálogo, recetas, edición, regreso, ruta inexistente y retorno a un elemento que ya no está. Verificar rutas diferidas y atrás o adelante tras la migración de UX11. El resultado de una búsqueda no debe lanzar el foco a `BODY` ni reiniciar sin necesidad el recorrido del usuario.

### UX16. Definir cargas locales sobre el layout final

Complejidad M. Requiere UX14 y UX15. Cierra U25.

Reservar el fallback de APP, estados de carga de páginas y formularios, y sus estilos. Puede añadirse `src/shared/LoadingState.tsx`, nuevo, con variantes acotadas para listado, detalle y formulario.

La carga inicial reserva zonas de título, filtros, imagen o contenido que corresponden a cada pantalla. La actualización conserva datos disponibles y contexto. Las categorías lentas no sustituyen todo el formulario de entrada por un bloqueo. Mantener texto de estado accesible y deshabilitar solo acciones dependientes de la operación.

Usar superficies neutras, sin métricas falsas ni brillo decorativo. Respetar movimiento reducido. La demora se controla en el test o adaptador de prueba; no se agrega a la demo ni a producción para mostrar el esqueleto.

Probar carga inicial, actualización, error después de demora y llegada de respuestas antiguas. Adjuntar comparación de zonas reservadas y layout resuelto. Medir cambios reales sin adjudicar a la auditoría una cifra de CLS que nunca observó. No añadir una máscara global de carga.

### UX17. Verificar el conjunto y acreditar cierre por hallazgo

Complejidad L. Requiere UX01 a UX16 y las decisiones que condicionan el cierre.

No introduce otro rediseño. Revisa la base integrada, repite los recorridos y comprueba cada fila U01 a U28 con la sección 7. Un fallo vuelve al responsable de su ficha y mantiene abierto el hallazgo. Los aportes compartidos deben tener evidencia en todos sus consumidores, no solo una captura del componente base.

Entregar `execution/closure.md` con resultado por ID, referencia a la implementación, evidencia, comandos y pendientes. Separar demo, entorno HTTP de pruebas, shell, navegador y dispositivo. Una comprobación ausente conserva el estado pendiente. Un test verde de presencia de texto no acredita visibilidad ni ausencia de capas.

## 7. Verificaciones y condiciones de cierre

### 7.1 Comandos y alcance

En UX00 se registra la línea base. Durante cada ticket se ejecutan los tests de consumidores pertinentes y las comprobaciones de tipos o estilos afectadas. UX17 ejecuta los controles completos sobre la base integrada.

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e:demo
```

El script demo actual solo descubre `e2e/demo-mode.e2e.ts`. Los nuevos casos de navegador deben incorporarse de forma explícita a la selección de `playwright.demo.config.ts`, por ejemplo con archivos `e2e/ux-ui-*.demo.spec.ts`. Comprobar la selección con:

```powershell
npx --no-install playwright test --config playwright.demo.config.ts --list
```

Usar tests separados por ticket para evitar reservas compartidas. Mantener las dos pruebas demo existentes y la observación que rechaza llamadas a `/api/` y errores de JavaScript. Probar estas regresiones contra las pantallas reales y el repositorio demo en memoria. Interceptar `/api/` no controla una demo que no hace esas peticiones.

Las pruebas HTTP, latencia y conflictos pueden usar los dobles acotados del repositorio o los escenarios contractuales del entorno de tests existente. Registrar que demuestran presentación y manejo de ese caso. El contrato real y el shell necesitan su comprobación propia. No afirmar integración de servicios por una demo o una respuesta simulada.

Ejecutar además `npm run test:unit` si lo requiere la puerta vigente de CI, manteniendo sus umbrales. La cobertura no es criterio para inventar tests. Para la suite E2E normal, preparar el entorno de `playwright.config.ts`, que usa puerto 4173 y el build de producción; no asumir que apunta a la demo de 5174. Seguir el flujo existente de build y Compose para el cierre de esa suite:

```powershell
docker compose up --build --wait
npm run test:e2e
docker compose down
```

Registrar la disponibilidad de Docker y Chromium. Si falta el entorno, el comando no ejecutado queda pendiente con su motivo. No reutilizar como resultado actual las dos pruebas aprobadas que documenta la auditoría anterior.

### 7.2 Matriz de casos y evidencia

| Caso | Condición de aceptación y evidencia mínima | Hallazgos |
| --- | --- | --- |
| V01. Tarjeta comercial | Imágenes vertical, horizontal y cuadrada no se superponen con nombre, entrada o precio. Ver "Individual", "Combo con bebida", oferta sin etiqueta e importe largo en captura y geometría. | U01, U12 |
| V02. Anchuras | Registrar ancho útil de 320, 390, 600, 740, 768, 1024, 1199 y 1200 px, más escritorio de 1440 px. Verificar límites 767/768 y 1199/1200, también dentro de un host más ancho con módulo reducido. Sin scroll horizontal necesario, etiquetas cortadas ni controles encogidos. | U02, U03, U19 |
| V03. Tipografía y geometría | Comparar roles equivalentes en cada área. Metadatos no menores de 12/16, radios 4/8/12 y espacios de base 4. Controles 40 px estándar y 48 px táctiles; cierres e iconos con área suficiente. Documentar excepciones funcionales. | U03, U07, U08, U22 |
| V04. Cabecera | La referencia aportada por el usuario se compara con la nueva pantalla sin barra de marca interna. Revisar inicio de tarea, alineación y ausencia de títulos duplicados. Verificar propiedad de marca en shell. | U05, U06 |
| V05. Estados y acciones | Activo, inactivo y archivado se leen sin depender del color. No hay franjas laterales decorativas. Editar o consultar tiene más jerarquía que eliminar. Restricciones de eliminación comprensibles con teclado y tacto. | U09, U10 |
| V06. Catálogo | "Ver ofertas" y "Editar" son destinos visibles distintos. Conteos, filtros y página se conservan al regresar. Varias categorías y nombres largos no ocultan acciones. | U11, U19, U24 |
| V07. Validación | Categoría y receta vacías, instrucciones, insumo y cantidad inválidos muestran error junto al campo, asociación accesible y foco útil. Cero escrituras inválidas. Entrada conserva su resumen y mensajes. | U04 |
| V08. Vacíos y errores | Biblioteca realmente vacía y búsqueda sin coincidencias tienen mensajes y recuperación distintos. Probar además 404, fallo temporal y categorías lentas como casos separados. | U13, U14 |
| V09. Borradores | Nombre escrito, archivo elegido, categorías, grupos, opciones y receta se conservan al continuar editando. Escape, cruz, Cancelar, navegación, atrás y recarga aplican la política correspondiente. Un formulario intacto cierra sin fricción. | U15 |
| V10. Selección | En 390 px aparecen búsqueda y primer resultado sin dos cabeceras. Recorrer opción, selección, creación, regreso y asignación con borradores íntegros. Máximo un diálogo modal y un fondo visibles. | U16, U27 |
| V11. Guardado | Formularios largos mantienen acceso a guardar sin cubrir foco, error ni último grupo. Probar poca altura, zoom al 200 % y teclado virtual. Éxito confirmado se anuncia una vez en destino; error o incertidumbre no anuncian éxito. | U17, U18 |
| V12. Texto | Inventariar textos de alta, edición, validación y recuperación. Mismo término para cantidad de grupo y mismo límite de imagen. Sin pérdida de restricciones de activación, revisión o repetición de operaciones. | U20 |
| V13. Capacidades pendientes e imagen | Copiar composición y elegir inventario pendiente no ocupan el camino principal. Cambiar imagen es visible sin hover y funciona con teclado. SVG consistentes con nombres accesibles preservados. | U21, U22, U23 |
| V14. Rutas | Título y foco coherentes al entrar, regresar y no encontrar una ruta. Cambiar filtros no roba foco. Probar lector de pantalla y contrato con el shell, sin duplicar anuncios. | U24 |
| V15. Carga | Demora controlada en listado, detalle y formulario mantiene contexto y espacio útil. Actualización no borra datos disponibles. Respeta movimiento reducido y no añade máscara global. | U25 |
| V16. Confirmaciones | Abrir y cancelar eliminación de entrada archivada, oferta inactiva y receta. Contar un fondo, foco en Cancelar y limpieza completa al cancelar o pulsar Escape. Una operación pendiente conserva su bloqueo. | U26 |
| V17. Scroll modal | En página larga, PageUp, PageDown, rueda y tacto fuera del contenido desplazable no mueven el documento. Cerrar restaura posición y disparador. Repetir en pasos internos y dentro del shell. | U28 |
| V18. Integración y regresiones | Verificar styles del módulo sin afectar controles externos, marco del host, funcionamiento demo sin API y rutas de producción. Ejecutar suites de concurrencia, versiones, imagen, identidad, composición y recuperación afectadas. | Todos, especialmente U05, U15, U18, U24, U26 a U28 |

La inspección visual debe acompañar las aserciones DOM cuando se evalúa visibilidad. Las capturas originales son evidencia de defectos, no snapshots válidos de la solución. Crear una nueva referencia visual requiere revisar que el cambio cumple DESIGN.md, no ejecutar una actualización masiva de snapshots.

Para las mediciones de ancho, modificar solo el viewport no acredita el caso de un módulo estrecho dentro de un shell ancho. Registrar ambos tamaños. En diálogos, medir además el ancho útil del formulario. Probar controles táctiles en tableta aunque el ancho exterior supere 700 px.

Un recorrido con emulación de tamaño no demuestra teclado virtual ni tacto físico. Reservar al menos una comprobación con dispositivo táctil y teclado virtual, y otra con lector de pantalla. Registrar navegador, sistema, dispositivo y resultado. Las pruebas nativas de diálogo se ejecutan en navegador real; jsdom no sustituye su comportamiento.

## 8. Tests existentes que necesitan una revisión de compatibilidad

Las [instrucciones de AGENTS.md](../../../AGENTS.md) prohíben cambiar tests para que pasen o elevar cobertura con casos artificiales. La auditoría propone cambiar comportamientos que algunos tests actuales exigen expresamente. Se identifican aquí antes de implementar. No se presentan como fallos ejecutados durante esta planificación.

| Evidencia actual | Incompatibilidad posible y tratamiento |
| --- | --- |
| `OFE/OfferComponents.test.tsx`, casos de las líneas 670 y 1143, exigen los controles deshabilitados de inventario y copiar composición. | UX09 retira esos controles conforme a U21. Documentar que la expectativa visual queda obsoleta por un requisito nuevo. Revisar el caso conservando la comprobación de que esas capacidades no ejecutan operaciones y de que las acciones disponibles funcionan. No implementar funciones pendientes para satisfacer el test. |
| `ENT/EntryFormPage.test.tsx`, caso de la línea 245, espera descarte al cancelar una entrada modificada. | UX11 exige una decisión explícita. Informar el cambio de contrato de interacción y probar continuar y descartar con sus resultados reales. El valor perdido sin aviso deja de ser el resultado correcto. |
| `OFE/OfferComponents.test.tsx`, caso de la línea 920, y `e2e/offer-form.spec.ts`, recorrido de la línea 233, describen jerarquía multimodal. | UX10 sustituye la estructura por pasos. Conservar los casos de Escape, borrador y foco, revisando únicamente la suposición de varias ventanas. No quitar esos escenarios porque el nuevo layout tenga menos diálogos. |
| Tests que buscan la explicación literal de `INACTIVE`, servidor o borrador, incluido el caso de estado de `OfferComponents.test.tsx` de la línea 143. | UX14 modifica la redacción. Conservar aserciones sobre oferta nueva inactiva, activación explícita y resultado confirmado. Revisar texto solo después de documentar que expresa la misma restricción operativa. |
| Pruebas de rutas o formularios que montan un router de memoria sin el contexto de datos consumido por el guard. | UX11 puede necesitar un montaje de test compatible. Mantener escenarios y aserciones funcionales. Justificar el cambio de infraestructura; no suprimir el guard solo en test. |

Las líneas son referencias de esta base y pueden moverse. Buscar también por el nombre del caso. Si aparece una falla distinta, investigar código y test antes de clasificarla. Conservar evidencia de la incompatibilidad y su motivo. No borrar expectativas de payload, idempotencia, bloqueo durante envío, conflictos, imágenes o recuperación por tratarse de una revisión visual.

Los casos nuevos deben detectar defectos reales del reporte. Son ejemplos suficientes la superposición de imagen, pérdida de borrador, búsqueda contradictoria, fondo duplicado o scroll detrás del diálogo. No crear un test por cada selector CSS ni una aserción que replique la implementación sin comprobar su efecto.

## 9. Entrega de cada ticket y cierre del plan

Al comenzar implementación se crea un registro con estas columnas:

| Ticket | Base integrada | Reserva activa | Estado | Hallazgos propios y aportes | Evidencia | Pendientes |
| --- | --- | --- | --- | --- | --- | --- |
| UX00 a UX17 | Registrar al asignar | Registrar archivos y tests | Pendiente | Según matriz | Completar con resultados reales | Mantener explícitos |

Usar estados pendiente, en ejecución, en revisión e integrada. El estado del hallazgo es independiente: abierto, parcialmente acreditado o cerrado. Un ticket de base puede estar integrado sin haber cerrado todavía todos sus hallazgos compartidos.

Cada entrega incluye archivos reales, comportamiento observado, consumidores verificados, comandos con resultado y capturas o mediciones vinculadas a IDs. La integración se realiza por turnos. Un cambio posterior en un componente compartido obliga a repetir las condiciones de sus consumidores afectadas.

UX17 solo propone cerrar la auditoría cuando cada U01 a U28 cumple su condición, las decisiones necesarias están resueltas y existe evidencia suficiente del entorno correspondiente. Si falta shell, dispositivo, moneda o una prueba contractual, registra esa condición pendiente. No convierte una entrega demo en cierre total.

La reversión de un ticket debe limitarse a sus cambios y preservar el trabajo previo. Si la corrección requiere más archivos o altera un contrato, se actualizan reserva, dependencias y validación antes de continuar. Los fallos de UX17 regresan al ticket responsable para corregir el defecto, en lugar de aprobarlos mediante cambios en tests.

## 10. Verificación de esta planificación

Este documento conserva los 28 IDs, sus prioridades, un responsable de cierre por hallazgo, aportes, archivos, complejidades, dependencias y condiciones observables. Se contrastaron las rutas de archivo con el directorio actual y las oleadas con sus reservas. La revisión documental no ejecuta ni acredita las correcciones propuestas.

Las fuentes normativas usadas tienen estos SHA-256. Sirven para detectar que una nueva versión exige revisar el plan, sin convertir un hash en prueba de comportamiento.

| Fuente | SHA-256 al planificar |
| --- | --- |
| Auditoría ampliada | `02b53a960ebbc3b06e262684cf76166191ab3fafbafd7d767a734972f1e88121` |
| DESIGN.md | `b31ee2415af651d993da4acd9f708cb4d0fadc59f946be70d3ad10597bdd7493` |
| planning-method.png | `d84864f373551bc691536b72626fd151ff1fada24fd9eee7d5e0338851844385` |
| .dependency-cruiser.cjs | `8e10b53fbfabc5f5ef4a0d2def4da91c7cc145d0b1197c44e16464d53b6b3e49` |
| tsconfig.json | `0a1b83861052631120e9a4c783c50d5d50bdf4d02708e536a4aea594088ba4c5` |

Se aplicaron las skills [ui-ux-pro-max](../../../.agents/skills/ui-ux-pro-max/SKILL.md), [unslop](../../../.agents/skills/unslop/SKILL.md), [dependency-cruiser-impact](../../../.agents/skills/dependency-cruiser-impact/SKILL.md) y [pre-change-dependency-analysis](../../../.agents/skills/pre-change-dependency-analysis/SKILL.md). La estrategia de comprobación visual se contrastó con [playwright-best-practices](../../../.agents/skills/playwright-best-practices/SKILL.md). No se generó un sistema de diseño alternativo.

La consulta local `focus not obscured` aportó recomendaciones sobre visibilidad del foco útiles para UX13. No se declara conformidad WCAG por esa consulta. `unsaved changes confirmation` no aportó una regla específica de protección de borradores y el intento acotado `draft loss warning` no encontró coincidencias. D04 se apoya en la pérdida reproducida de U15 y sus criterios, sin atribuirle una recomendación inexistente a la skill.

La implementación, los tests nuevos y la evidencia de cierre quedan para la ejecución de este plan.
