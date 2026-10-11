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

Abre `http://localhost:5173`. Comandos de calidad y pruebas:

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

La cobertura incluye todos los archivos `.ts` y `.tsx` de `src`, aunque ningún test los importe, incluido `main.tsx`. Solo excluye tests, declaraciones `.d.ts` y `test-setup.ts`. Playwright mantiene su suite E2E independiente; su reporte no se mezcla con esta cobertura unitaria. T22 exige al menos 80 % de líneas, sentencias, funciones y ramas en cada archivo funcional nuevo o modificado; Jest aplica ese umbral a `App.tsx`, el adaptador HTTP y los componentes de catálogo. SonarQube puede exigir además su propio Quality Gate.

[sonar-project.properties](sonar-project.properties) identifica el proyecto `FMAT-Restaurant_Menu-Frontend` de la organización `fmat-restaurant`, delimita fuentes/tests e indica `sonar.javascript.lcov.reportPaths=coverage/lcov.info`, válido para JavaScript y TypeScript.

El workflow existente ejecuta `SonarSource/sonarqube-scan-action` **v8.1.0**, fijada al SHA `7006c4492b2e0ee0f816d36501671557c97f5995`, en Linux (`ubuntu-latest`). Se usa la versión estable del tutorial de SonarQube Cloud, que incluye SonarScanner CLI `8.1.0.6389`, sin añadir dependencias npm. El checkout descarga el historial completo (`fetch-depth: 0`) y el scanner analiza en el mismo workspace inmediatamente después de generar y verificar el LCOV. Envía el análisis a `https://sonarcloud.io` en pushes a `main` y PR del mismo repositorio. Los PR desde forks generan cobertura, pero omiten el scanner porque GitHub no les entrega el secreto.

Para activar la conexión, añade `SONAR_TOKEN` en GitHub → Settings → Secrets and variables → Actions → Repository secrets, con un token autorizado para analizar este proyecto. En SonarQube Cloud → Administration → Analysis Method, desactiva Automatic Analysis y selecciona GitHub Actions. El token solo se pasa al paso del scanner; no se almacena en archivos. Un token ausente o inválido hace fallar el análisis. El workflow envía el análisis; no espera el resultado del Quality Gate. Para exigirlo antes del merge, configura el check de SonarQube Cloud en las reglas de protección de rama.

Referencias: [configuración de cobertura de Jest](https://jestjs.io/docs/configuration#collectcoveragefrom-array) y [cobertura JS/TS en SonarQube](https://docs.sonarsource.com/sonarqube-cloud/enriching/test-coverage/javascript-typescript-test-coverage).

## Docker y E2E

```sh
npx playwright install chromium  # solo la primera vez
docker compose up --build --wait
npm run test:e2e
docker compose down
```

La aplicación queda en `http://localhost:4173`; `FRONTEND_PORT` cambia el puerto local. Playwright usa esa dirección por defecto; también puede configurarse con `PLAYWRIGHT_BASE_URL`.

## CI/CD

El workflow [ci-cd.yml](.github/workflows/ci-cd.yml) valida todos los pull requests y los pushes a `dev` y `main`, además de tags `v*`. Solo un push a `main` que pase calidad y E2E publica `ghcr.io/fmat-restaurant/menu-frontend:<SHA>`; después extrae el digest, descarga y comprueba la imagen publicada (revisión, healthcheck y configuración externa), y promociona ese mismo digest a `:staging`. El workflow [promote-production.yml](.github/workflows/promote-production.yml) permite promocionar manualmente a `:production` una imagen de un commit de `main` ya publicado, incluido uno anterior para revertir. En cada ejecución, el resumen de Actions registra imagen, digest y commit. `staging` y `production` son etiquetas de promoción en GHCR; el host de despliegue sigue pendiente de acuerdo.

Para producción, crea los entornos de GitHub `staging` y `production`, restringe `production` a `main` y configura los revisores requeridos según la política del equipo. `GITHUB_TOKEN` con `packages: write` publica y promociona en GHCR; no hacen falta credenciales de registry adicionales. El repositorio debe permitir que Actions escriba en el paquete GHCR. Protege `main` y exige los checks `Quality and unit tests` y `Playwright E2E` antes del merge. Consulta el [diseño del pipeline](ci-cd/pipeline-design.md) para el procedimiento y las verificaciones.

`API_BASE_URL` se entrega al contenedor al arrancar, por ejemplo `https://api.example.com/api/v1`. El endpoint `/runtime-config.js` expone esa URL al navegador con `Cache-Control: no-store`. La misma imagen y digest sirven para ambos entornos. No coloques secretos en `API_BASE_URL`: el navegador puede leerlo. En desarrollo, Vite envía `/api/v1` al Back en `http://127.0.0.1:8080`; `MENU_API_PROXY_TARGET` cambia ese destino. La vista administrativa V1 usa esa API para entradas, categorías y cambios de estado.

La [documentación del producto](https://fmat-restaurant.github.io/Menu-Documentation/) contiene requisitos y contratos. [T22](docs/T22-catalogo-administrable.md) describe V1 y [T23](docs/T23-categorias.md) describe la administración de categorías V5. V2, V3 y V6 tienen rutas de navegación preparadas y se implementarán en sus tareas correspondientes.
