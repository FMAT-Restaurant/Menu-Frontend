import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";

// This entry point owns the standalone document. Embedding App does not reset a host document.
document.documentElement.dataset.menuStandalone = "";
const repository = import.meta.env.DEV && import.meta.env.MODE === "demo"
  ? (await import("./demo/repository")).createDemoRepository()
  : undefined;
const demoToken = repository ? (await import("./demo/permissions")).createDemoToken(window.location.search) : undefined;

if (repository) document.title = "[DEMO] Menú | FMAT Restaurant";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App repository={repository} token={demoToken} />
  </React.StrictMode>,
);
