/// <reference types="node" />
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { readFileSync } from "node:fs";
import { productionConfiguration } from "./src/application/configuration.ts";

export default defineConfig(({ command, mode }) => {
  const configuration = command === "build"
    ? productionConfiguration(loadEnv(mode, ".", "VITE_")) : null;
  const restrictConnections = (source: string) => configuration
    ? source.replaceAll("https://*.supabase.co wss://*.supabase.co", configuration.url)
    : source;
  return {
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "connected-production-config",
      apply: "build",
      transformIndexHtml: restrictConnections,
      generateBundle() {
        this.emitFile({ type: "asset", fileName: "_headers",
          source: restrictConnections(readFileSync("public/_headers", "utf8")) });
      },
    },
    {
      name: "development-csp",
      apply: "serve",
      // Vite HMR injects development scripts. Production keeps the stricter CSP.
      transformIndexHtml: (html) =>
        html.replace(
          /<meta\s+http-equiv="Content-Security-Policy"[^>]*>/gi,
          "",
        ),
    },
  ],
  build: { target: "es2020", sourcemap: false },
  };
});
