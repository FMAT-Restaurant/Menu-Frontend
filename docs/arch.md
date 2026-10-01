# Arquitectura del frontend de Menu

**Estado:** decisión de arquitectura para las vistas e integración de Menu. El repositorio ya contiene un esqueleto React/Vite, pruebas y CI/CD; las capas de dominio y la integración con la API aún no están implementadas.
**Referencias:** ERS Menu 2.1.1 (2026-09-29), contrato API Menu 2.2.1 (OpenAPI 3.1.0) y arquitectura de `Menu-Backend` en la rama `dev`.

## Fuentes y alcance

- [Configuración de la ERS](https://github.com/FMAT-Restaurant/Menu-Documentation/blob/main/docs/ers/configuration.md) establece la precedencia: modelo conceptual y ERS vigentes prevalecen sobre auditorías y propuestas históricas en `docs/other/md/`.
- [Modelo conceptual](https://github.com/FMAT-Restaurant/Menu-Documentation/blob/main/docs/other/md/domain-model.md), [requisitos](https://github.com/FMAT-Restaurant/Menu-Documentation/blob/main/docs/ers/functional-requirements.md), [reglas](https://github.com/FMAT-Restaurant/Menu-Documentation/blob/main/docs/ers/business-rules.md), [cuestiones abiertas](https://github.com/FMAT-Restaurant/Menu-Documentation/blob/main/docs/ers/open.md) y [roadmap](https://github.com/FMAT-Restaurant/Menu-Documentation/blob/main/docs/product/README.md) definen el comportamiento y las entregas.
- [OpenAPI modular](https://github.com/FMAT-Restaurant/Menu-Documentation/blob/main/docs/contracts/api/openapi.yaml) es la fuente de operaciones, rutas, cuerpos, respuestas y errores. El archivo `dist/openapi.yaml` es su proyección compilada.
- [Arquitectura del backend](https://github.com/FMAT-Restaurant/Menu-Backend/blob/dev/docs/arch.md) define `api → application → infrastructure`, con `domain` usado por aplicación e infraestructura. El frontend adopta la misma separación de responsabilidades sin copiar detalles de Java, JPA ni repositorios.

La aplicación es una **SPA web de administración y consulta de catálogo**. Menu conserva entradas, ofertas, composiciones, recetas y personalizaciones; Inventario conserva identidad y existencias de artículos; Órdenes conserva elecciones concretas y precio final. El frontend no calcula reglas autoritativas del dominio ni convierte una definición de catálogo en una orden.

## Decisión tecnológica

Usar React, TypeScript, React Router, Axios y Vite conforme a [`docs/stack.md`](https://github.com/FMAT-Restaurant/Menu-Documentation/blob/main/docs/stack.md) y al plan [MVP1-T001](https://github.com/FMAT-Restaurant/Menu-Documentation/blob/main/docs/product/mvp-01-catalogo-publicable.md). Jest y React Testing Library cubren componentes y casos de uso; Playwright cubre recorridos en navegador. Node.js y npm son herramientas de desarrollo y build. `package.json` fija las versiones y declara TypeScript 7.0.2 en `@typescript/native` junto al alias de compatibilidad TypeScript 6. `npm run typecheck` y `npm run build` invocan `tsc`, que resuelve a TypeScript 7.0.2; `tsc6` queda disponible para las herramientas que todavía necesitan la API anterior. La versión del compilador principal se verificó con `npm exec -- tsc --version`.

## Límite del repositorio

`Menu-Frontend` contiene la SPA web, sus pruebas, configuración de build, contenedor y documentación de implementación del cliente. `Menu-Backend` conserva el servicio HTTP, las invariantes y la persistencia. `Menu-Documentation` conserva el modelo conceptual, la ERS y el contrato OpenAPI aceptado. Los tipos de transporte del frontend deben seguir ese contrato; no se copian entidades JPA ni se crea aquí una segunda definición normativa de la API. Las integraciones con Inventario y Órdenes se agregan cuando existan sus contratos aprobados.

El proyecto de la rama `dev` ya utiliza una **SPA web**, acorde con React Router/Vite y las pruebas E2E en navegador del plan. Un cliente móvil exigiría otra decisión y otra estrategia de navegación/build.

## Estructura y dependencias

El esqueleto actual tiene `src/App.tsx`, `src/main.tsx` y `src/styles.css`. Al implementar las vistas de Menu, organizar ese mismo proyecto Vite por capas y áreas de dominio:

```text
src/
  app/                    # arranque, rutas, composición de dependencias y proveedores
  api/                    # adaptadores HTTP: cliente Axios, operaciones, DTOs y errores
  application/            # casos de uso y puertos para consultar/mutar Menu
  domain/                 # tipos y reglas puras de presentación del catálogo
  features/               # vistas y componentes por capacidad
    catalog/
    categories/
    entries/
    offers/
    compositions/
    recipes/              # MVP-2
    personalizations/     # MVP-3
  shared/                 # componentes UI, utilidades y estado de interfaz reutilizables
tests/
  e2e/                   # recorridos Playwright
```

| Capa | Responsabilidad | Depende de |
| --- | --- | --- |
| `features` | Rutas/vistas, formularios, estados de carga, errores y controles de usuario. Agrupa por capacidad, no crea reglas comerciales propias. | `application`, `domain`, `shared` |
| `application` | Coordina casos de uso, paginación, transformación de DTOs, invalidación/recarga tras escrituras y puertos de acceso. | `domain` |
| `domain` | Tipos de Menu y funciones puras para expresar estados y validaciones inmediatas documentadas. | Ninguna capa del proyecto |
| `api` | Implementa puertos de aplicación con Axios, rutas/verbos/cuerpos OpenAPI, mapeo de respuestas y errores. | `application` (contratos), `domain` |
| `app` | Crea adaptadores, configura rutas y entrega dependencias a las vistas. | Todas, solo como punto de composición |
| `shared` | Piezas de interfaz y utilidades sin conocimiento de Menu. | Ninguna capa de negocio |

```mermaid
flowchart LR
  Views[features: vistas] --> UseCases[application: casos de uso y puertos]
  UseCases --> Domain[domain: tipos y reglas puras]
  Http[api: adaptador Axios] -. implementa puertos .-> UseCases
  Http --> Contract[OpenAPI Menu /api/v1]
  App[app: composición y rutas] --> Views
  App --> Http
```

`features` no importa Axios ni DTOs HTTP. `api` no importa componentes React. `domain` no depende de React, Axios ni del backend. Los tipos de transporte viven en `api`; si difieren del lenguaje usado por la UI, se convierten en el adaptador o caso de uso, sin duplicar entidades por anticipado. La organización de carpetas no impide imports erróneos: ESLint y revisión de PR deben vigilar estos límites.

**Correspondencia con el backend:** la capa `features` cumple el papel de entrada de usuario que `api` cumple para HTTP en el backend; `application` coordina el flujo; `domain` expresa conceptos compartidos del contrato sin duplicar la autoridad del servidor; `api` es infraestructura de red. Los nombres no implican que una entidad JPA se envíe al navegador. El backend separa DTOs HTTP de entidades; el frontend también conserva esa frontera.

## Integración con Menu

1. Configurar una base URL externa que incluya `/api/v1`, como indica el campo `servers` de OpenAPI. En desarrollo, Vite puede usar un proxy hacia el backend; en despliegue, la URL se configura para cada entorno. No incrustar secretos en el bundle.
2. Mantener una función por `operationId` del contrato para categorías, entradas, ofertas, catálogo publicable, composiciones y, después, recetas. Centralizar codificación de parámetros, `Content-Type`, parseo de `Error { code, message, details }` y cancelación de solicitudes al salir de una vista. Los identificadores y revisiones son **cadenas opacas**.
3. Usar la respuesta del servidor como estado confirmado. Un formulario mantiene su borrador local y solo actualiza el recurso confirmado tras éxito. Las validaciones locales mejoran la respuesta inmediata; el backend decide invariantes, transiciones y aceptación final. En 400/404/409/415/422, conservar el borrador y mostrar el mensaje y los detalles asociados a campos cuando existan.
4. Para crear entradas y ofertas, enviar `FormData` con `entry` u `offer` como parte JSON (`application/json`) e `image` como archivo. Para editar entrada sin imagen, enviar JSON; para reemplazarla, usar multipart. Las revisiones de oferta admiten JSON o multipart con imagen opcional. No enviar `imageRef` como sustituto del archivo. Validar antes del envío JPEG/PNG/WebP, 10 MiB y hasta 4096 × 4096 px; tras 415/422 conservar la imagen vigente.
5. El catálogo publicable usa `limit` y cursor opaco `nextCursor`, siempre con los mismos filtros al continuar; no inventar un total. Las listas administrativas usan `page` desde 1, `pageSize` y los totales devueltos. Una búsqueda nueva reinicia el cursor o la página. El contrato define `q` y `categoryId` para catálogo publicable; la semántica de búsqueda la decide el servicio.
6. El frontend distingue consulta publicable de administración. No filtra una lista administrativa para simular `/catalog`: el servidor excluye entradas u ofertas no publicables. Mostrar `brandName` de la entrada y `presentationTag` de la oferta por separado; mostrar `basePrice` tal como viene, sin sumar slots, opciones ni ofertas hijas.
7. No interpretar `imageRef`/`offerImageRef` como URL pública. Falta un contrato que permita resolver esas referencias a bytes o URL visualizable. Conservarlas como referencias hasta definir ese acceso.

**Seguridad y concurrencia:** el contrato todavía no define mecanismo de autenticación, permisos, roles ni política de concurrencia. Reservar en el adaptador HTTP el lugar para incorporar credenciales y 401/403 cuando se aprueben. No asumir acceso anónimo ni inventar login, Bearer, cookies, `ETag` o `If-Match`. Las revisiones se tratan como identificadores opacos e inmutables; la política de conflictos de escritura requiere contrato. La seguridad por menú y las transiciones las aplica el servidor; ocultar controles en la UI no constituye autorización.

## Flujos y módulos por entrega

| Entrega | Vistas/casos de uso | Operaciones del contrato |
| --- | --- | --- |
| MVP-1 | Categorías; lista/detalle/edición de entradas; ofertas; editor de composición; catálogo publicable. Publicar exige primero oferta válida y luego entrada activa. Desarchivar deja la entrada inactiva. | `listMenuCategories`, `createMenuCategory`, `patchMenuCategory`; `listMenuEntries`, `createMenuEntry`, `getMenuEntry`, `patchMenuEntry`; `listEntryOffers`, `createEntryOffer`, `getEntryOffer`, `setEntryOfferStatus`; `getOfferComposition`, `replaceOfferComposition`; `listPublishedCatalog`, `getPublishedCatalogEntry` |
| MVP-2 | Bibliotecas y recetas; revisiones de recetas y ofertas; fuentes `INLINE`, `PREPARATION` y `CATALOG_OFFER`. | Operaciones `recipe-libraries`, revisiones de oferta/receta y composición existente |
| MVP-3 | Personalizaciones por `ComponentOption` y eliminación de entrada archivada con confirmación y presentación del resultado. | `replaceOfferComposition`, `deleteArchivedMenuEntry` y consultas de revisiones |

El editor de composición debe separar: (a) inclusión de slots (`selectable`, `requiredSlots`, límites de elegibles), (b) elección de una opción para cada slot incluido, y (c) cantidad y curso descriptivos del slot. Una opción pertenece a una aparición concreta; sus personalizaciones no se comparten automáticamente con otra aparición del mismo origen. El frontend puede explicar estas reglas y validar formas evidentes, pero no declarar una oferta publicable antes de la respuesta del backend.

La especificación semántica de vistas y flujos, cuando se escriba, seguirá [UI Specification Architecture](https://github.com/FMAT-Restaurant/Menu-Documentation/blob/main/docs/other/ui-spec-arch.md): YAML para las vistas, Mermaid para navegación y flujos, trazabilidad a `REQ-MENU-*`, y documentos derivados generados. Esta arquitectura de código no reemplaza esa especificación ni fija colores o maquetas.

## Estado y pruebas

- Estado remoto: cada consulta se carga por sus parámetros (`menuId`, filtros, página/cursor e identificadores). Tras una mutación exitosa, volver a consultar los recursos afectados. No mantener una copia global mutable de todo el catálogo.
- Estado local: formularios, selección de archivo, expansión de secciones y confirmaciones. No persistir borradores sensibles o datos de administración en almacenamiento del navegador por defecto.
- Rutas: incluir `menuId` e identificadores necesarios en la URL de cada vista; los filtros/páginas navegables pueden ir en query params. La política de acceso a rutas se añade cuando se aprueben identidad y permisos.
- Probar `domain` y `application` con Jest para reglas/transformaciones que aporten valor; componentes con React Testing Library para acciones y estados visibles; adaptadores con respuestas y errores representativos del contrato; recorridos Playwright para crear/editar con imagen, rechazos 415/422, publicación y paginación. Evitar tests que solo reflejen la implementación.
- La CI actual ejecuta lint, verificación de tipos, build Vite, pruebas unitarias y E2E en navegador, y construye una imagen. Al agregar integración con Menu, ampliar las pruebas para detectar desajustes con OpenAPI 2.2.1 y cubrir los flujos correspondientes. Playwright mide la experiencia visible; la herramienta de generación de carga sigue sin decidirse.

## Decisiones pendientes que afectan implementación

| Tema | Límite actual |
| --- | --- |
| Inventario | No hay contrato para buscar `InventoryItem` ni validar su unidad. El origen del identificador y el selector de UI requieren acuerdo; no crear un endpoint de Inventario en Menu. |
| Imágenes | `imageRef` no define cómo obtener o servir los bytes. Acordar un mecanismo de lectura antes de prometer previsualización de imágenes persistidas. |
| Seguridad | Autenticación, autorización, roles y alcance por menú no definidos. El backend incluye Spring Security con credencial generada para desarrollo, sin que eso sea contrato del producto. |
| Concurrencia | Sin política para ediciones simultáneas, composición y revisiones; no implementar resolución ficticia en el cliente. |
| Dominio | OPEN-001/002/003/006/007/008/009 siguen pendientes. No fijar moneda, precisión, default implícito, alcance de biblioteca, unidades/rangos, lista cerrada de cursos ni validez de opciones activas por inferencia. |
| Operación | El contrato aceptado declara OpenAPI 3.1.0; `stack.md` menciona 3.2.1. Mantener compatibilidad con el contrato hasta una revisión formal. La imagen ya se publica en GHCR; faltan destino de despliegue, URL de API por entorno y política de recuperación. |

## Criterio para cerrar esta decisión

La siguiente implementación debe incorporar una llamada de Menu detrás de un puerto de `application`, mantener los límites de dependencias y ampliar las pruebas/CI para el contrato. La integración funcional depende de que el backend implemente las operaciones aceptadas: la rama `dev` del backend inspeccionada contiene paquetes y configuración, pero aún no los controladores del contrato.
