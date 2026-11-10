# Menu-Frontend

![Node.js 24.21.0](https://img.shields.io/badge/Node.js-24.21.0-339933?logo=nodedotjs&logoColor=white)
![React 19.3.0](https://img.shields.io/badge/React-19.3.0-149eca?logo=react&logoColor=white)

Frontend del servicio Menu de FMAT Restaurant. SPA desarrollada con React y TypeScript, con Vite para desarrollo y Nginx para servir el build.

Este repositorio contiene solo el cliente web y sus herramientas. El servicio HTTP vive en `Menu-Backend`; la ERS y el contrato OpenAPI vigentes viven en `Menu-Documentation`. Los límites y dependencias están descritos en la [arquitectura del frontend](docs/arch.md).

## Requisitos

- Node.js `24.21.0` (`.node-version`) y npm `12.1.0` (`package.json`).
- Docker con Docker Compose v2 para ejecutar el contenedor y las pruebas E2E.

`package.json` fija React 19.3.0, React Router 7.18.4, Axios 1.20.0, Vite 8.3.2, ESLint 10.12.0, Jest 30.5.2, React Testing Library 16.3.3, Playwright 1.63.0 y TypeScript 7.0.2. TypeScript 6 queda como alias de compatibilidad para herramientas que requieren su API. `npm exec -- tsc --version` debe mostrar `7.0.2` después de instalar dependencias.

## Mockups

En la carpeta [Mockups](mockups/) se encuentran los prototipos visuales y medianamente funcionales de la aplicación. Estos archivos sirven como **punto de partida y guía de referencia para el desarrollo del frontend**, permitiendo visualizar la estructura, distribución de componentes y la experiencia de usuario antes de su integración definitiva con el sistema.

## Desarrollo

```sh
npm ci
npm run dev
```

Abre `http://localhost:5173`.

### Modo demo sin backend

```sh
npm run dev:mock
```

Abre `http://127.0.0.1:5174`. El título de la pestaña empieza con `[DEMO]`.
Este modo carga las pantallas reales con un repositorio en memoria y datos de
ejemplo de entradas, categorías, ofertas, recetas e insumos. Permite buscar,
filtrar, crear, editar, cambiar estados, cargar imágenes locales y eliminar los
registros que cumplan las reglas de estado o asociación del demo, sin llamar a
los servicios de Menu, Inventory o Media.

Los cambios duran mientras navegas en la misma pestaña. Al recargar la página,
abrir otra pestaña o reiniciar el servidor, se recuperan los datos iniciales. El
puerto separado mantiene el almacenamiento del navegador del demo aislado del
desarrollo normal en el puerto 5173. El puerto es fijo; si está ocupado, detén la
instancia anterior antes de iniciar otra.

Es una herramienta de desarrollo para explorar la interfaz; no sustituye las
pruebas contra el contrato HTTP ni reproduce todas las reglas del backend. Se
activa únicamente con Vite en desarrollo y `--mode demo`. `npm run dev` mantiene
la conexión real y los builds de producción excluyen el repositorio y los datos
del demo, incluso si se usa `vite build --mode demo`.

Para verificar los flujos del demo con Chromium de Playwright instalado:

```sh
npm run test:e2e:demo
```

### Comandos de calidad

| Comando | Propósito |
| --- | --- |
| `npm run lint` | Analiza el código con ESLint. |
| `npm run typecheck` | Comprueba tipos con TypeScript. |
| `npm run test:unit` | Ejecuta Jest y React Testing Library con cobertura LCOV y HTML. |
| `npm run build` | Comprueba tipos y genera el build de producción. |

## Cobertura y SonarQube

`npm run test:unit` genera `coverage/lcov.info` para SonarQube, `coverage/lcov-report/index.html` para revisión local y un resumen en consola. `npm test` sigue ejecutando la misma suite sin cobertura. Los reportes se regeneran en cada ejecución y `coverage/` está excluido de Git.

Se usa el proveedor `babel` (Istanbul) integrado en Jest, compatible con la transformación TypeScript/TSX mediante Babel y los tests de React Testing Library existentes. No hace falta instalar otro paquete de cobertura. Se conserva la línea estable Jest 30 del stack actual y sus versiones exactas, sin introducir versiones preliminares ni una migración de herramientas por la cobertura:

| Dependencia | Versión fijada | Función |
| --- | --- | --- |
| `jest` | `30.5.2` | Ejecuta tests y coordina la cobertura integrada. |
| `babel-jest` | `30.5.2` | Transforma TS/TSX e instrumenta el código con Istanbul. |
| `jest-environment-jsdom` | `30.5.2` | Entorno DOM para los tests React. |
| `@testing-library/react` | `16.3.3` | Mantiene los tests de componentes existentes. |

Las tres dependencias de Jest están alineadas y admiten Node.js 24 según sus requisitos de instalación; se verificaron con Node.js `24.21.0` y npm `12.1.0`. `package-lock.json` fija las dependencias transitivas de instrumentación y reportes para `npm ci`.

La cobertura incluye todos los archivos `.ts` y `.tsx` de `src`, aunque ningún test los importe, incluido `main.tsx`. Solo excluye tests, declaraciones `.d.ts` y `test-setup.ts`. Playwright mantiene su suite E2E independiente; su reporte no se mezcla con esta cobertura unitaria. Jest genera el reporte, pero no impone umbrales de cobertura. El Quality Gate de SonarQube Cloud es el control de cobertura; sus condiciones se administran en SonarCloud.

[sonar-project.properties](sonar-project.properties) identifica el proyecto `FMAT-Restaurant_Menu-Frontend` de la organización `fmat-restaurant`, delimita fuentes/tests e indica `sonar.javascript.lcov.reportPaths=coverage/lcov.info`, válido para JavaScript y TypeScript.

El workflow existente ejecuta `SonarSource/sonarqube-scan-action` **v8.1.0**, fijada al SHA `7006c4492b2e0ee0f816d36501671557c97f5995`, en Linux (`ubuntu-latest`). Se usa la versión estable del tutorial de SonarQube Cloud, que incluye SonarScanner CLI `8.1.0.6389`, sin añadir dependencias npm. El checkout descarga el historial completo (`fetch-depth: 0`) y el scanner analiza en el mismo workspace inmediatamente después de generar y verificar el LCOV. Envía el análisis a `https://sonarcloud.io` en pushes a `main` y PR del mismo repositorio. Los PR desde forks generan cobertura, pero omiten el scanner porque GitHub no les entrega el secreto.

Para activar la conexión, añade `SONAR_TOKEN` en GitHub → Settings → Secrets and variables → Actions → Repository secrets, con un token autorizado para analizar este proyecto. En SonarQube Cloud → Administration → Analysis Method, desactiva Automatic Analysis y selecciona GitHub Actions. El token solo se pasa al paso del scanner; no se almacena en archivos. Un token ausente o inválido hace fallar el análisis. El scanner envía el análisis; el check `SonarCloud Code Analysis` de SonarCloud reporta el Quality Gate en GitHub. El ruleset activo de `main` exige ese check, por lo que GitHub bloquea la fusión si falla. Los PR desde forks omiten el scanner porque GitHub no les entrega `SONAR_TOKEN`.

Referencias: [configuración de cobertura de Jest](https://jestjs.io/docs/configuration#collectcoveragefrom-array) y [cobertura JS/TS en SonarQube](https://docs.sonarsource.com/sonarqube-cloud/enriching/test-coverage/javascript-typescript-test-coverage).

## Docker y E2E

```sh
npx playwright install chromium  # solo la primera vez
docker compose up --build --wait
npm run test:e2e
docker compose down
```

La aplicación en Docker queda en `http://localhost:4173`; `FRONTEND_PORT` cambia el puerto local. Para probar Docker con Playwright, deja vacías `API_BASE_URL` e `INVENTORY_API_BASE_URL` y configura `PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173` y `PLAYWRIGHT_USE_EXTERNAL_SERVER=true`. Sin servidor externo, Playwright compila y usa la vista previa en el puerto 5175.

### Integración con el Shell

`npm run dev:federation` compila y sirve el remoto `menu_app` en el puerto 5175. El Shell puede cargar `http://localhost:5175/assets/remoteEntry.js` y montar `./App` con `token`, `currentUser` y `theme`. Si no se proporcionan sesión o usuario, se leen de `fmat_restaurant_auth_session`. El remoto conserva la navegación interna del módulo y, cuando se monta en `/menu`, usa esa ruta como base.

`react` y `react-dom` se comparten con el Shell mediante Module Federation, por lo que deben tener la misma versión mayor que el Shell (actualmente React 18). El código compila en React 18 y 19: los handlers de `onSubmit` usan `SyntheticEvent<HTMLFormElement>` y las props que solo se pasan a `ref` usan `Ref<T>`.

### Configuración

Las URLs de la API se configuran solo en runtime, así que la misma imagen sirve para cualquier entorno. `window.MENU_CONFIG` define `apiBaseUrl` (Menú) e `inventoryApiBaseUrl` (Inventario). En Docker lo genera `/runtime-config.js`; dentro del Shell, el Shell puede definirlo antes de montar el remoto. Si no hay configuración, se usan `/api/v1/menu` y `/api/v1`, rutas relativas al origen que sirve la página. Ambos clientes envían el token de la sesión. Copia [`.env.example`](.env.example) como `.env` para uso local.

| Variable | Dónde aplica | Uso |
|---|---|---|
| `API_BASE_URL` | Contenedor | Base de Menú. Debe terminar en `/api/v1/menu`, porque la subida de imágenes usa `/api/v1/menu/media/images`. |
| `INVENTORY_API_BASE_URL` | Contenedor | Base de Inventario (ruta `/items`), por ejemplo `https://api.example.com/api/v1`. |
| `FRONTEND_PORT` | `docker compose` | Puerto local del contenedor (por defecto `4173`). |
| `MENU_API_PROXY_TARGET` | `npm run dev` | Destino del proxy `/api/v1` (por defecto `http://127.0.0.1:8080`). |
| `PLAYWRIGHT_BASE_URL`, `PLAYWRIGHT_USE_EXTERNAL_SERVER` | E2E | Probar contra un servidor ya levantado. |

Las variables del contenedor se validan al arrancar: vacías o URL HTTP(S) sin query ni fragmento. No coloques secretos en ellas, porque el navegador puede leerlas. La imagen sirve `/assets/` con CORS para que el Shell cargue el remoto desde otro origen; `remoteEntry.js` se sirve con `Cache-Control: no-cache` y los archivos con hash como inmutables.

Si la API se sirve desde otro origen, el backend debe responder con `Access-Control-Expose-Headers: ETag` y permitir los headers `Authorization`, `If-Match` e `Idempotency-Key`; sin eso el navegador oculta el `ETag` y no se pueden guardar ediciones.

## CI/CD

El workflow [ci-cd.yml](.github/workflows/ci-cd.yml) valida todos los pull requests y los pushes a `dev` y `main`, además de tags `v*`. Solo un push a `main` que pase calidad y E2E publica `ghcr.io/fmat-restaurant/menu-frontend:<SHA>`; después extrae el digest, descarga y comprueba la imagen publicada (revisión, healthcheck y configuración externa), y promociona ese mismo digest a `:staging`. El workflow [promote-production.yml](.github/workflows/promote-production.yml) permite promocionar manualmente a `:production` una imagen de un commit de `main` ya publicado, incluido uno anterior para revertir. En cada ejecución, el resumen de Actions registra imagen, digest y commit. `staging` y `production` son etiquetas de promoción en GHCR; el host de despliegue sigue pendiente de acuerdo.

Para producción, crea los entornos de GitHub `staging` y `production`, restringe `production` a `main` y configura los revisores requeridos según la política del equipo. `GITHUB_TOKEN` con `packages: write` publica y promociona en GHCR; no hacen falta credenciales de registry adicionales. El repositorio debe permitir que Actions escriba en el paquete GHCR. El ruleset activo de `main` exige `SonarCloud Code Analysis`, que bloquea la fusión cuando Sonar no aprueba el Quality Gate. Consulta el [diseño del pipeline](ci-cd/pipeline-design.md) para el procedimiento y las verificaciones.

El pipeline verifica la imagen publicada arrancándola con `API_BASE_URL` e `INVENTORY_API_BASE_URL` de ejemplo y comprobando `/runtime-config.js`; la misma imagen y digest sirven para ambos entornos (ver [Configuración](#configuración)). La vista administrativa V1 usa esa API para entradas, categorías y cambios de estado. El menú lo provisiona el servicio, sin `MENU_ID` en las rutas del [contrato publicado](https://fmat-restaurant.github.io/Menu-Documentation/api/).

La [documentación del producto](https://fmat-restaurant.github.io/Menu-Documentation/) contiene requisitos y contratos. [T22](docs/T22-catalogo-administrable.md) describe las rutas de V1, las operaciones utilizadas y las brechas actuales del Back. [T24](docs/T24-crear-editar-entrada.md) describe el formulario de creación y edición y su integración con el OpenAPI vigente. V2, V3 y V6 tienen rutas de navegación preparadas y se implementarán en sus tareas correspondientes.
