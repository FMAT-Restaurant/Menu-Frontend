FROM node:24.21.0-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --global npm@12.1.0 \
  && npm ci

COPY index.html vite.config.ts tsconfig.json ./
COPY src ./src
RUN npm run build

FROM nginx:1.29-alpine AS runtime

COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/healthz || exit 1

USER nginx
