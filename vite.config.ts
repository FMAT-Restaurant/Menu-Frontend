import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import federation from "@originjs/vite-plugin-federation";

export default defineConfig(({ mode }) => {
  // Solo para el proxy de desarrollo; las URLs de la API se configuran en runtime (window.MENU_CONFIG).
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), federation({
      name: "menu_app",
      filename: "remoteEntry.js",
      exposes: { "./App": "./src/App.tsx" },
      shared: ["react", "react-dom"],
    })],
    server: {
      port: 5175, strictPort: true, cors: true, host: true,
      proxy: {
        "/api/v1": env.MENU_API_PROXY_TARGET || "http://127.0.0.1:8080",
      },
    },
    preview: { port: 5175, strictPort: true, cors: true, host: true },
    // Requisitos de @originjs/vite-plugin-federation para el remoto.
    // minify: false -> el minificador de Vite 8 (Oxc) convierte el placeholder '__v__css__...'
    // a template literal (`...`) y el plugin (v1.4.1) solo lo reemplaza si usa comillas simples/dobles.
    // Sin el reemplazo, remoteEntry.js llama dynamicLoadingCss con un string y falla con "e.forEach is not a function".
    build: { target: "esnext", cssCodeSplit: false, minify: false },
  };
});
