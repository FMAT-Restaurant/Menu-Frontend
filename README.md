# Menu-Frontend

![Node.js 24.21.0](https://img.shields.io/badge/Node.js-24.21.0-339933?logo=nodedotjs&logoColor=white)
![React 19.3.0](https://img.shields.io/badge/React-19.3.0-149eca?logo=react&logoColor=white)

Frontend del servicio Menu de FMAT Restaurant. SPA desarrollada con React y TypeScript, con Vite para desarrollo y Nginx para servir el build.

Este repositorio contiene solo el cliente web y sus herramientas. El servicio HTTP vive en `Menu-Backend`; la ERS y el contrato OpenAPI vigentes viven en `Menu-Documentation`. Los límites y dependencias están descritos en la [arquitectura del frontend](docs/arch.md).

## Requisitos

- Node.js `24.21.0` (`.node-version`) y npm `12.1.0` (`package.json`).
- Docker con Docker Compose v2 para ejecutar el contenedor y las pruebas E2E.

`package.json` fija React 19.3.0, React Router 7.18.4, Axios 1.20.0, Vite 8.3.1, ESLint 10.10.0, Jest 30.5.2, React Testing Library 16.3.3, Playwright 1.63.0 y TypeScript 7.0.2. TypeScript 6 queda como alias de compatibilidad para herramientas que requieren su API. `npm exec -- tsc --version` debe mostrar `7.0.2` después de instalar dependencias.

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
| `npm run test:unit` | Ejecuta Jest y React Testing Library. |
| `npm run build` | Comprueba tipos y genera el build de producción. |

## Docker y E2E

```sh
npx playwright install chromium  # solo la primera vez
docker compose up --build --wait
npm run test:e2e
docker compose down
```

La aplicación queda en `http://localhost:4173`; `FRONTEND_PORT` cambia el puerto local. Playwright usa esa dirección por defecto; también puede configurarse con `PLAYWRIGHT_BASE_URL`.

## CI/CD

El workflow [ci-cd.yml](.github/workflows/ci-cd.yml) valida pull requests y pushes a `dev` y `main`, además de tags `v*`. Solo un push a `main` que pase calidad y E2E publica `ghcr.io/fmat-restaurant/menu-frontend:<SHA>`; después extrae el digest, descarga y comprueba la imagen publicada (revisión, healthcheck y configuración externa), y promociona ese mismo digest a `:staging`. El workflow [promote-production.yml](.github/workflows/promote-production.yml) permite promocionar manualmente a `:production` una imagen de un commit de `main` ya publicado, incluido uno anterior para revertir. En cada ejecución, el resumen de Actions registra imagen, digest y commit. `staging` y `production` son etiquetas de promoción en GHCR; el host de despliegue sigue pendiente de acuerdo.

Para producción, crea los entornos de GitHub `staging` y `production`, restringe `production` a `main` y configura los revisores requeridos según la política del equipo. `GITHUB_TOKEN` con `packages: write` publica y promociona en GHCR; no hacen falta credenciales de registry adicionales. El repositorio debe permitir que Actions escriba en el paquete GHCR. Protege `main` y exige los checks `Quality and unit tests` y `Playwright E2E` antes del merge. Consulta el [diseño del pipeline](ci-cd/pipeline-design.md) para el procedimiento y las verificaciones.

`API_BASE_URL` se entrega al contenedor al arrancar, por ejemplo `https://api.example.com/api/v1`. El endpoint `/runtime-config.js` expone esa URL al navegador con `Cache-Control: no-store`. La misma imagen y digest sirven para ambos entornos. No coloques secretos en `API_BASE_URL`: el navegador puede leerlo. La interfaz actual aún no hace llamadas a la API.

La [documentación del producto](https://fmat-restaurant.github.io/Menu-Documentation/) contiene requisitos y contratos. La interfaz actual es una pantalla inicial; las vistas del menú y la integración con el backend están pendientes.
