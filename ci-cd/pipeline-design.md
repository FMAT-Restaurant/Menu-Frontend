# CI/CD del frontend

**Proyecto:** Menu-Frontend  
**Fecha:** 2026-09-29  
**Estado:** workflows, aplicación mínima, pruebas, imagen Docker y Compose implementados. El despliegue a un host queda fuera de alcance; por ahora la entrega es GHCR.

## Diseño

```mermaid
flowchart LR
  PR[Pull request a dev o main] --> Q[Lint, TypeScript, Jest/RTL y build]
  Q --> E[Docker Compose y Playwright]
  E -->|push a main o tag v*| G[Publicación de imagen en GHCR]
```

La imagen se identifica por el SHA del commit. No se publica desde pull requests ni se agrega un destino de ejecución.

## Adaptación del ejemplo

El repositorio [`zackspike/cicd-test`](https://github.com/zackspike/cicd-test) separa verificación y publicación, conserva reportes y publica en GHCR con `GITHUB_TOKEN` solo después de pasar CI. Esos patrones se reflejan aquí. Se sustituyen la matriz, lint, pytest, imagen y configuración Python por npm, ESLint, TypeScript, Jest/React Testing Library, Vite y Playwright. No se trasladan los secretos de Sonar/Discord ni la publicación de `latest`.

Referencias del ejemplo: [`ci.yml`](https://github.com/zackspike/cicd-test/blob/main/.github/workflows/ci.yml), [`template.yml`](https://github.com/zackspike/cicd-test/blob/main/template.yml), [`QUICKSTART.md`](https://github.com/zackspike/cicd-test/blob/main/QUICKSTART.md) y [`dockerfile`](https://github.com/zackspike/cicd-test/blob/main/dockerfile).

## Workflow implementado

El archivo `.github/workflows/ci-cd.yml` ejecuta en pull requests y pushes a `dev` o `main`, tags `v*` y manualmente:

GitHub requiere que el archivo ya esté en la rama predeterminada para ofrecer `workflow_dispatch`. El push a `dev` se dispara en cuanto la versión modificada del workflow está comprometida y subida a esa rama.

1. **Quality and unit tests:** configura Node desde `.node-version`, usa npm 12.1.0, instala con `npm ci`, ejecuta ESLint, typecheck con TypeScript 7, Jest/RTL con cobertura y build Vite. Sube el reporte de cobertura incluso si falla el job.
2. **Playwright E2E:** después del job de calidad instala Chromium, construye y levanta la imagen de producción con `docker compose up --wait`, ejecuta la suite sobre Chromium y conserva reportes, XML JUnit, trazas y capturas como artefacto. Baja Compose al terminar incluso ante errores.
3. **Publish image to GHCR:** solo se activa para pushes a `main` o tags `v*`, y requiere que calidad y E2E pasen. El job tiene `packages: write`; autentica con `GITHUB_TOKEN` y publica `ghcr.io/<owner>/<repo>:<commit-sha>`.

Las acciones externas están fijadas por SHA completo. `.github/dependabot.yml` propone actualizaciones semanales para Actions y npm. GitHub requiere configuración del repositorio fuera del workflow: proteger `dev` y `main` y exigir los checks `Quality and unit tests` y `Playwright E2E` antes de merge. La publicación de GHCR sigue limitada a `main` y tags `v*`.

## Imagen y Compose

`Dockerfile` compila la SPA en Node y sirve los estáticos desde Nginx como usuario no-root. El endpoint `/healthz` es healthcheck de Docker y Compose. `compose.yaml` publica el puerto 8080 del contenedor en `4173` por defecto (`FRONTEND_PORT` lo cambia) y Compose espera que esté sano antes de iniciar E2E.

Comandos locales:

```sh
npm ci
npm run lint
npm run typecheck
npm run test:unit
npm run build
docker compose up --build --wait
PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173 npm run test:e2e
docker compose down
```

En PowerShell se puede omitir `PLAYWRIGHT_BASE_URL` si se deja el valor predeterminado de la configuración.

## Versiones y límites conocidos

Se aplicaron las versiones del texto adjunto. TypeScript 7.0.2 es el compilador principal (`@typescript/native`); `typescript` apunta al paquete de compatibilidad API TypeScript 6.0.2 para herramientas del ecosistema. El paquete `@eslint/js` no publica la versión `10.10.0`; el manifiesto fija la versión existente `10.0.1` junto con ESLint `10.10.0`.

La UI en `src/App.tsx` es una pantalla mínima para ejercitar los pipelines; falta integrar vistas y API del servicio de menú. En la máquina local se verificaron lint, tipos, Jest/RTL, build y Playwright contra `vite preview`. No se pudo verificar Docker/Compose porque Docker no está instalado. Además, el entorno local tiene Node 24.18.0 y npm 11.16.0; el workflow usa las versiones solicitadas (Node 24.21.0 y npm 12.1.0). Por ello la imagen Docker, healthcheck de Compose y ejecución E2E contra el contenedor requieren la primera corrida de GitHub Actions para confirmar el entorno objetivo.

Las variables `VITE_*` quedan incorporadas al bundle del navegador y no deben contener secretos. No se definieron endpoints ni credenciales del backend.

## Referencias técnicas

- [GitHub Actions: Node.js](https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs), [seguridad y permisos](https://docs.github.com/en/actions/reference/security/secure-use) y [GITHUB_TOKEN](https://docs.github.com/en/actions/tutorials/authenticate-with-github_token).
- [Playwright: CI](https://playwright.dev/docs/ci) y [Docker](https://playwright.dev/docs/docker).
- Docker: [Compose `config`](https://docs.docker.com/reference/cli/docker/compose/config/), [`up --wait`](https://docs.docker.com/reference/cli/docker/compose/up/) y [buenas prácticas de build](https://docs.docker.com/build/building/best-practices/).
- [Vite: variables y modos](https://vite.dev/guide/env-and-mode); [npm `ci`](https://docs.npmjs.com/cli/commands/npm-ci/).
- Versiones confirmadas en npm: [`eslint@10.10.0`](https://www.npmjs.com/package/eslint/v/10.10.0), [`@eslint/js@10.0.1`](https://www.npmjs.com/package/@eslint/js/v/10.0.1).
