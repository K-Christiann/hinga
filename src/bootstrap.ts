import type { Services } from "./application/services";
import { apiTransport, productionConfiguration, resolveConfiguration } from "./application/configuration";

export async function bootstrap(): Promise<Services> {
  const env = {
    VITE_APP_MODE: import.meta.env.VITE_APP_MODE,
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    VITE_API_TRANSPORT: import.meta.env.VITE_API_TRANSPORT,
  };
  const configuration = import.meta.env.PROD
    ? productionConfiguration(env)
    : resolveConfiguration(env);
  const { createSupabaseServices } = await import("./infrastructure/supabase");
  return apiTransport(env.VITE_API_TRANSPORT) === "gateway"
    ? createSupabaseServices(configuration.url, configuration.publishableKey, { transport: "gateway" })
    : createSupabaseServices(configuration.url, configuration.publishableKey);
}
