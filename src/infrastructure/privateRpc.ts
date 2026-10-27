import { ReadCache } from "./readCache";
import type { SupabaseClient } from "@supabase/supabase-js";

export const connectionMessage = "The connection was interrupted. We could not confirm this request. Your draft has been kept in this tab; reconnect and retry. Do not close this tab until saving is confirmed.";
export const sessionMessage = "Your account changed or signed out. Open your own space again before continuing.";

/** Bound both connection and response-body reads; no hidden write retries. */
export async function boundedFetch(input: RequestInfo | URL, init?: RequestInit, timeoutMs = 20000) {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  init?.signal?.addEventListener("abort", cancel, { once: true });
  if (init?.signal?.aborted) cancel();
  const timer = setTimeout(cancel, timeoutMs);
  try {
    const response = await fetch(input, { ...init, signal: controller.signal, cache: "no-store" });
    // Buffer under the same deadline: a stalled response body must also time out.
    const body = await response.arrayBuffer();
    return new Response(body.byteLength ? body : null, { status: response.status, statusText: response.statusText, headers: response.headers });
  } finally {
    clearTimeout(timer);
    init?.signal?.removeEventListener("abort", cancel);
  }
}

export type SessionGuard = ReturnType<typeof sessionGuard>;
export type OwnedRpc = ReturnType<typeof privateRpc>;

/** Same-owner token refresh is allowed. Sign-out/account changes invalidate the
 * entire operation, including an A → B → A transition while a response waits. */
export function sessionGuard(client: SupabaseClient, isLocked: () => boolean, generation = () => 0) {
  return async (userId: string) => {
    const expected = generation();
    const assertActive = () => {
      if (!userId || isLocked() || generation() !== expected) throw new Error(sessionMessage);
    };
    const assertSession = async () => {
      assertActive();
      const current = await client.auth.getSession();
      const session = current.data.session;
      if (isLocked() || generation() !== expected || current.error || !session || session.user.id !== userId)
        throw new Error(sessionMessage);
      return session;
    };
    const session = await assertSession();
    return { accessToken: session.access_token, assertActive, assertCurrent: async () => { await assertSession(); } };
  };
}

/** Every authenticated data request captures its initiating owner's token.
 * Actor IDs stay in the browser; SQL derives ownership from the verified JWT. */
export function privateRpc(client: SupabaseClient, url: string, key: string, isLocked: () => boolean, generation = () => 0, transport: "direct" | "gateway" = "direct", cache = new ReadCache()) {
  const capture = sessionGuard(client, isLocked, generation);
  return async <T>(userId: string, name: string, args: Record<string, unknown> = {}, fresh = false): Promise<T> => {
    const scope = await capture(userId);
    scope.assertActive();
    const affected: Record<string, string[]> = {
      save_private_note: ["list_note_summaries", "page_private_notes", "calendar_private_notes", "get_private_note"], remove_private_note: ["list_note_summaries", "page_private_notes", "calendar_private_notes", "get_private_note"],
      save_private_mood: ["list_my_moods", "get_private_mood"], remove_private_mood: ["list_my_moods", "get_private_mood"],
      read_notification: ["list_my_notifications"], unblock_author: ["list_my_blocks"], block_thought_author: ["list_my_blocks"],
      save_my_profile: ["list_note_summaries", "page_private_notes", "calendar_private_notes", "get_private_note", "list_my_moods", "get_private_mood"],
    };
    if (affected[name]) cache.invalidate(affected[name].map(method => `${userId}:${method}:`));
    const cacheKey = `${userId}:${name}:${JSON.stringify(args)}`;
    if (fresh) cache.invalidate([`${userId}:${name}:`]);
    const ttl = name === "list_my_notifications" ? 10000 : ["list_note_summaries", "page_private_notes", "calendar_private_notes", "get_private_note", "list_my_moods", "get_private_mood", "list_my_blocks"].includes(name) ? 20000 : 0;
    const execute = async (): Promise<T> => {
    let response: Response;
    let payload: unknown;
    try {
      response = await boundedFetch(transport === "gateway" ? "/api/rpc" : `${url}/rest/v1/rpc/${name}`, {
        method: "POST",
        headers: { ...(transport === "direct" ? { apikey: key } : {}), Authorization: `Bearer ${scope.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(transport === "gateway" ? { name, args } : args),
      }, transport === "gateway" ? 30000 : 20000);
      // Host-level rate limits may return a non-JSON body. Preserve the HTTP
      // failure state without treating that response as a successful save.
      payload = await response.json().catch(() => null);
    } catch {
      throw new Error(connectionMessage);
    }
    await scope.assertCurrent();
    if (!response.ok) {
      const error = payload as { code?: string; message?: string };
      throw new Error(error?.code === "P0001" && error.message ? error.message
        : response.status === 429 ? "Too many requests. Please wait a moment before trying again. Your changes are not confirmed."
        : error?.code === "PGRST202" ? "This feature needs a database setup update. Apply only the unapplied migrations listed in START-HERE.md, then retry."
        : response.status === 401 ? "Please sign in again before continuing."
        : "This request could not be completed. Your changes are not confirmed. Please retry; if this continues, check the Supabase setup.");
    }
    return payload as T;
    };
    try {
      const value = ttl ? await cache.read(cacheKey, execute, ttl) : await execute();
      await scope.assertCurrent(); return value;
    } finally { if (affected[name]) cache.invalidate(affected[name].map(method => `${userId}:${method}:`)); }
  };
}
