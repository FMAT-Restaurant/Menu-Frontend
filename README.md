# Menu-Frontend

![Node.js 24.21.0](https://img.shields.io/badge/Node.js-24.21.0-339933?logo=nodedotjs&logoColor=white)
![React 19.3.0](https://img.shields.io/badge/React-19.3.0-149eca?logo=react&logoColor=white)

Frontend del servicio Menu de FMAT Restaurant. SPA desarrollada con React y TypeScript, con Vite para desarrollo y Nginx para servir el build.

## Requisitos

- Node.js `24.21.0` (`.node-version`) y npm `12.1.0` (`package.json`).
- Docker con Docker Compose v2 para ejecutar el contenedor y las pruebas E2E.

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

El workflow [ci-cd.yml](.github/workflows/ci-cd.yml) valida pull requests y pushes a `dev` y `main`, además de tags `v*`; también permite ejecución manual cuando está en la rama predeterminada. Publica la imagen en GHCR solo desde `main` o tags `v*`, después de pasar calidad y E2E. Protege `dev` y `main`, y exige los checks `Quality and unit tests` y `Playwright E2E` para bloquear merges. Consulta el [diseño del pipeline](ci-cd/pipeline-design.md) para más detalles.

La [documentación del producto](https://fmat-restaurant.github.io/Menu-Documentation/) contiene requisitos y contratos. La [arquitectura del frontend](docs/arch.md) define las capas, los límites y la integración previstos. La interfaz actual es una pantalla inicial; las vistas del menú y la integración con el backend están pendientes.
