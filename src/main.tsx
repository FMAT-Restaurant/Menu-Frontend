import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./styles.css";

async function bootstrap() {
  // This entry point owns the standalone document. Embedding App does not reset a host document.
  document.documentElement.dataset.menuStandalone = "";
  const repository = import.meta.env.DEV && import.meta.env.MODE === "demo"
    ? (await import("./demo/repository")).createDemoRepository()
    : undefined;

  if (repository) document.title = "[DEMO] Menú | FMAT Restaurant";

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App repository={repository} />
    </React.StrictMode>,
  );
}

void bootstrap();
