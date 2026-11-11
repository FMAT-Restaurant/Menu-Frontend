# Menu-Frontend

Frontend del servicio Menu de FMAT Restaurant: SPA en React + TypeScript (Vite) que se sirve con Nginx y se integra al Shell como remoto de Module Federation (`menu_app`).

Este repositorio contiene solo el cliente web. La API vive en `Menu-Backend` y los requisitos y el contrato OpenAPI en [Menu-Documentation](https://fmat-restaurant.github.io/Menu-Documentation/).

## Requisitos

- Node.js `24.21.0` (ver `.node-version`) y npm `12.x`.
- Docker con Docker Compose v2 (para el contenedor y las pruebas E2E).

## Configuración

```sh
cp .env.example .env
```

Las variables están documentadas en [`.env.example`](.env.example). Tanto `docker compose` como Vite leen `.env` automáticamente. Las URLs de la API se inyectan **en runtime** (`/runtime-config.js` → `window.MENU_CONFIG`), por lo que la misma imagen sirve para cualquier entorno; si se dejan vacías se usan rutas relativas al mismo origen.

> No coloques secretos en estas variables: el navegador puede leerlas.

## Levantar con Docker

```sh
docker compose up --build --wait   # http://localhost:4173 (o FRONTEND_PORT)
docker compose down                # detener
```

El contenedor valida `API_BASE_URL` e `INVENTORY_API_BASE_URL` al arrancar (vacías o URL HTTP(S) sin query ni fragmento) y falla si no son válidas.

Si la API está en otro origen, el backend debe permitir por CORS los headers `Authorization`, `If-Match` e `Idempotency-Key` y exponer `ETag` (`Access-Control-Expose-Headers: ETag`); sin eso no se pueden guardar ediciones.

## Desarrollo local

```sh
npm ci
npm run dev         # http://localhost:5173, proxy /api/v1 → MENU_API_PROXY_TARGET
npm run dev:mock    # http://127.0.0.1:5174, demo sin backend con datos en memoria
```

El modo demo (`[DEMO]` en el título) solo existe en desarrollo; los datos se reinician al recargar y no se incluye en builds de producción.

Para integrarlo con el Shell, `npm run dev:federation` sirve el remoto en `http://localhost:5175/assets/remoteEntry.js` (expone `./App`). `react` y `react-dom` se comparten con el Shell, así que deben coincidir en versión mayor.

## Scripts

| Comando | Propósito |
| --- | --- |
| `npm run lint` | ESLint. |
| `npm run typecheck` | Comprobación de tipos. |
| `npm test` | Pruebas unitarias (Jest + React Testing Library). |
| `npm run test:unit` | Pruebas unitarias con cobertura en `coverage/` (LCOV para SonarQube). |
| `npm run build` | Typecheck y build de producción en `dist/`. |
| `npm run test:e2e` | Pruebas E2E con Playwright. |
| `npm run test:e2e:demo` | Pruebas E2E del modo demo. |

### E2E contra Docker

```sh
npx playwright install chromium   # solo la primera vez
docker compose up --build --wait
PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173 PLAYWRIGHT_USE_EXTERNAL_SERVER=true npm run test:e2e
docker compose down
```

Requiere `API_BASE_URL` e `INVENTORY_API_BASE_URL` vacías. Playwright no lee `.env`, así que las variables `PLAYWRIGHT_*` se pasan en el shell (en PowerShell: `$env:PLAYWRIGHT_BASE_URL = "..."`). Sin ellas, Playwright compila y levanta su propia vista previa en el puerto 5175.

## CI/CD

[`ci-cd.yml`](.github/workflows/ci-cd.yml) ejecuta lint, tipos, pruebas, análisis de SonarQube Cloud y E2E en los PR y en los pushes a `dev` y `main`. Un push a `main` publica la imagen en `ghcr.io/fmat-restaurant/menu-frontend:<SHA>` y la promociona a `:staging`; [`promote-production.yml`](.github/workflows/promote-production.yml) promociona manualmente a `:production`. El análisis de Sonar requiere el secreto `SONAR_TOKEN`. Detalles en el [diseño del pipeline](ci-cd/pipeline-design.md).

## Documentación

- [Arquitectura](docs/arch.md) · [Sistema de diseño](docs/DESIGN.md) · [Mapa de UI](docs/ui-map.md)
- [Bitácora de tareas del MVP](docs/mvp-log/)
- [Mockups](mockups/): prototipos visuales de referencia.

## Licencia

[MIT](LICENSE)
