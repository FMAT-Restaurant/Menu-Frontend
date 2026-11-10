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
    build: { target: "esnext", cssCodeSplit: false },
  };
});
