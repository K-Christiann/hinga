export class ConfigurationError extends Error {
  constructor(message: string) { super(message); this.name = "ConfigurationError"; }
}
export interface EnvironmentConfiguration {
  VITE_APP_MODE?: string;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  VITE_API_TRANSPORT?: string;
}
export type ResolvedConfiguration = { url: string; publishableKey: string };

export function supabaseConfiguration(urlInput: string, keyInput: string) {
  const url = urlInput.trim();
  const publishableKey = keyInput.trim();
  if (!url || !publishableKey) throw new ConfigurationError(
    "Supabase configuration is incomplete. Put VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local beside package.json, then restart Vite. On Netlify, set both build environment variables and rebuild.",
  );
  let parsed: URL;
  try { parsed = new URL(url); } catch { throw new ConfigurationError("VITE_SUPABASE_URL must be your HTTPS project URL from Supabase Project Settings → API."); }
  if (parsed.protocol !== "https:" || !parsed.hostname || parsed.username || parsed.password || parsed.search || parsed.hash || !/^\/*$/.test(parsed.pathname))
    throw new ConfigurationError("VITE_SUPABASE_URL must be an HTTPS project origin without an API path, query, password or fragment.");
  let isPublishable = /^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey);
  if (!isPublishable && publishableKey.split(".").length === 3) {
    try {
      const payload = publishableKey.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      isPublishable = JSON.parse(atob(payload)).role === "anon";
    } catch { isPublishable = false; }
  }
  if (!isPublishable) throw new ConfigurationError(
    "VITE_SUPABASE_PUBLISHABLE_KEY must contain the Supabase publishable key (or legacy anon key). Use one equals sign in the setting. Secret and service-role keys must stay on the server.",
  );
  return { url: parsed.origin, publishableKey };
}

export function resolveConfiguration(env: EnvironmentConfiguration): ResolvedConfiguration {
  const url = (env.VITE_SUPABASE_URL || "").trim();
  const key = (env.VITE_SUPABASE_PUBLISHABLE_KEY || "").trim();
  if (env.VITE_APP_MODE && env.VITE_APP_MODE.trim().toLowerCase() !== "supabase")
    throw new ConfigurationError("Hinga requires VITE_APP_MODE=supabase and a connected Supabase project.");
  return supabaseConfiguration(url, key);
}

/** Deployable builds require the protected gateway. Never include credential values in errors. */
export function productionConfiguration(env: EnvironmentConfiguration) {
  if (env.VITE_APP_MODE?.trim().toLowerCase() !== "supabase")
    throw new ConfigurationError("Production builds require VITE_APP_MODE=supabase.");
  if (env.VITE_API_TRANSPORT !== "gateway")
    throw new ConfigurationError("Production builds require VITE_API_TRANSPORT=gateway. Configure the Netlify gateway and its database migration using docs/OPERATIONS_SETUP.md before launch.");
  return supabaseConfiguration(env.VITE_SUPABASE_URL ?? "", env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "");
}

export function apiTransport(value: string | undefined): "direct" | "gateway" {
  if (!value || value === "direct") return "direct";
  if (value === "gateway") return "gateway";
  throw new ConfigurationError("VITE_API_TRANSPORT must be direct for local development or gateway for the protected Netlify API.");
}
