import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-600.css";
import "@fontsource/dm-sans/latin-700.css";
import { bootstrap } from "./bootstrap";
import { AppProvider } from "./ui/context";
import { App } from "./ui/App";
import { StartupFailure } from "./ui/components/StartupFailure";
import { RenderBoundary } from "./ui/components/RenderBoundary";
import { installGlobalDiagnostics } from "./infrastructure/diagnostics";
import type { DiagnosticSink } from "./domain/operations";
import "./styles.css";

let diagnostics: DiagnosticSink = { capture: () => undefined };
const root = createRoot(document.getElementById("root")!, {
  // Boundaries report fixed codes. Keep React's default error-object reporter
  // out of production logging; no error/stack object crosses this interface.
  onCaughtError: () => undefined,
  onUncaughtError: () => diagnostics.capture("unhandled_error"),
  onRecoverableError: () => diagnostics.capture("unhandled_error"),
});
bootstrap()
  .then((services) => {
    diagnostics = services.diagnostics;
    const release = installGlobalDiagnostics(services.diagnostics);
    import.meta.hot?.dispose(release);
    root.render(
      <React.StrictMode>
        <RenderBoundary sink={services.diagnostics}>
        <HashRouter>
          <AppProvider services={services}>
            <App />
          </AppProvider>
        </HashRouter>
        </RenderBoundary>
      </React.StrictMode>,
    );
  })
  .catch((error) => root.render(<StartupFailure error={error} />));
