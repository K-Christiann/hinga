import { SavedDisplayPreferences } from "../application/displayPreferences";
import { ReadCache } from "./readCache";
import { randomId } from "../domain/ids";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseModeration } from "./supabaseModeration";
import { createSupabaseFeedback } from "./supabaseFeedback";
import { supabaseConfiguration } from "../application/configuration";
import type {
  Identity,
  MoodEntry,
  Note,
  Profile,
  Thought,
  Reply,
} from "../domain/models";
import type { AuthGateway } from "../domain/ports";
import { composeServices } from "../application/services";
import type { CursorPage } from "../domain/pagination";
import { boundedFetch, privateRpc, sessionGuard, sessionMessage } from "./privateRpc";
import { createEncouragements } from "./encouragement";
import { authTransitions } from "./authTransitions";
import type { PublicPolicy } from "../domain/policy";
import { diagnosticSink } from "./diagnostics";

export function createSupabaseServices(urlInput: string, publishableKeyInput: string, options: { transport?: "direct" | "gateway" } = {}) {
  const { url, publishableKey } = supabaseConfiguration(urlInput, publishableKeyInput);
  const reads = new ReadCache();
  let locked = false;
  let authGeneration = 0;
  let observedUser: string | null | undefined;
  const observe = (id: string | null) => { if (id !== observedUser) { observedUser = id; authGeneration++; reads.clear(); } };
  let lastAccessToken = "";
  const transition = authTransitions();
  const listeners = new Set<(identity: Identity | null) => void>();
  const storageKey = `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;
  const storage = {
    getItem: (key: string) => locked ? null : window.sessionStorage.getItem(key),
    setItem: (key: string, value: string) => { if (!locked) window.sessionStorage.setItem(key, value); },
    removeItem: (key: string) => window.sessionStorage.removeItem(key),
  };
  function clearLocalSession() {
    reads.clear();
    locked = true;
    observe(null);
    for (const key of [storageKey, `${storageKey}-code-verifier`, `${storageKey}-user`]) storage.removeItem(key);
    listeners.forEach((listener) => listener(null));
  }
  const client = createClient(url, publishableKey, {
    db: { retry: false },
    global: { fetch: boundedFetch },
    auth: {
      flowType: "pkce",
      persistSession: true,
      storage,
      storageKey,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  const ownedSession = sessionGuard(client, () => locked, () => authGeneration);
  const ownedRpc = privateRpc(client, url, publishableKey, () => locked, () => authGeneration, options.transport, reads);
  const identityOf = (
    user: { id: string; email?: string } | null,
  ): Identity | null => (user ? { id: user.id, email: user.email } : null);
  const auth: AuthGateway = {
    async current() {
      if (locked) return null;
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      observe(data.session?.user.id ?? null);
      lastAccessToken = data.session?.access_token ?? "";
      return identityOf(data.session?.user || null);
    },
    subscribe(listener) {
      listeners.add(listener);
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        observe(locked ? null : session?.user.id ?? null);
        if (!locked) lastAccessToken = session?.access_token ?? "";
        listener(locked ? null : identityOf(session?.user || null));
      });
      return () => { listeners.delete(listener); data.subscription.unsubscribe(); };
    },
    async google() {
      // End the previous local identity immediately, but do not unlock storage
      // for a new OAuth flow while an old SDK MFA/logout step can still write.
      authGeneration++;
      clearLocalSession();
      const expected = authGeneration;
      await transition(async () => {
        if (authGeneration !== expected) throw new Error(sessionMessage);
        locked = false;
        const { error } = await client.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: `${window.location.origin}${window.location.pathname}` },
        });
        if (error) throw error;
      });
    },
    async signOut() {
      const token = lastAccessToken;
      lastAccessToken = "";
      clearLocalSession();
      // Local access ends immediately, including offline. Remote revocation is
      // best-effort; capture the token before removing it from browser storage.
      await transition(async () => {
        const cleanup = client.auth.signOut({ scope: "local" }).catch(() => undefined);
        if (token) await boundedFetch(`${url}/auth/v1/logout?scope=local`, {
          method: "POST", headers: { apikey: publishableKey, Authorization: `Bearer ${token}` },
        }).catch(() => undefined);
        await cleanup;
      });
    },
  };
  const profileFrom = (row: Record<string, unknown>): Profile => ({
    id: String(row.id),
    alias: String(row.alias),
    timezone: String(row.timezone),
    onboardingComplete: Boolean(row.onboarding_complete),
    healthConsent: Boolean(row.health_consent),
  });
  const moodFrom = (row: Record<string, unknown>): MoodEntry => ({
    id: String(row.id),
    day: String(row.day),
    value: Number(row.value) as MoodEntry["value"],
    summary: Boolean(row.summary),
    note: String(row.note || ""),
    timezone: String(row.timezone),
    updatedAt: String(row.updated_at),
  });
  const noteFrom = (row: Record<string, unknown>): Note => ({
    id: String(row.id),
    day: String(row.day),
    timezone: String(row.timezone),
    title: String(row.title),
    body: String(row.body),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  });
  const thoughtFrom = (row: Record<string, unknown>): Thought => ({
    id: String(row.id), alias: String(row.alias), body: String(row.body),
    category: String(row.category), status: row.status as Thought["status"],
    createdAt: String(row.created_at), isMine: Boolean(row.is_mine),
    repliesOpen: Boolean(row.replies_open), saved: Boolean(row.saved),
  });
  const replyFrom = (row: Record<string, unknown>, postId: string): Reply => ({
    id: String(row.id), postId, alias: String(row.alias), body: String(row.body),
    status: row.status as Reply["status"], createdAt: String(row.created_at), isMine: Boolean(row.is_mine),
  });
  type DatabasePage = { items: Record<string, unknown>[]; next_cursor: { id: string; created_at: string } | null };
  const pageFrom = <T>(page: DatabasePage, convert: (row: Record<string, unknown>) => T): CursorPage<T> => ({
    items: page.items.map(convert),
    nextCursor: page.next_cursor ? { id: page.next_cursor.id, createdAt: page.next_cursor.created_at } : null,
  });
  return composeServices({
    preferences: new SavedDisplayPreferences(() => window.localStorage),
    policy: { async get() {
      const response = await boundedFetch(options.transport === "gateway" ? "/api/policy" : `${url}/rest/v1/rpc/get_public_launch_policy`, options.transport === "gateway" ? undefined : { method: "POST", headers: { apikey: publishableKey, "Content-Type": "application/json" }, body: "{}" });
      if (!response.ok) throw new Error("The operator notice could not load. New entries are paused; existing data and Get Help remain available.");
      return await response.json() as PublicPolicy;
    } },
    diagnostics: diagnosticSink(async (code) => {
      if (locked || import.meta.env.VITE_ENABLE_DIAGNOSTICS === "false") return;
      const session = await client.auth.getSession();
      if (session.data.session) await ownedRpc(session.data.session.user.id, "record_client_event", { p_code: code });
    }),
    operations: { summary: (userId) => ownedRpc(userId, "get_operations_status") },
    thoughts: createEncouragements(),
    feedback: createSupabaseFeedback(ownedRpc),
    moderation: createSupabaseModeration(client, ownedRpc, ownedSession, transition),
    auth,
    profiles: {
      async get(userId) {
        return profileFrom(await ownedRpc(userId, "get_my_profile"));
      },
      async save(userId, profile) {
        return profileFrom(
          await ownedRpc(userId, "save_my_profile", {
            p_alias: profile.alias,
            p_timezone: profile.timezone,
            p_onboarding: profile.onboardingComplete,
            p_consent: profile.healthConsent,
          }),
        );
      },
    },
    moods: {
      async get(userId, day, fresh = false) { const row = await ownedRpc<Record<string, unknown> | null>(userId, "get_private_mood", { p_day: day }, fresh); return row ? moodFrom(row) : null; },
      async list(userId) {
        return (await ownedRpc<Record<string, unknown>[]>(userId, "list_my_moods")).map(
          moodFrom,
        );
      },
      async save(userId, entry, write) {
        return moodFrom(
          await ownedRpc(userId, "save_private_mood", {
            p_id: write.id, p_write_id: write.writeId, p_expected: write.expectedUpdatedAt,
            p_day: entry.day,
            p_value: entry.value,
            p_note: entry.note,
            p_timezone: entry.timezone,
          }),
        );
      },
      async remove(userId, day, version) {
        await ownedRpc(userId, "remove_private_mood", { p_id: version.id, p_day: day, p_expected: version.updatedAt });
      },
    },
    notes: {
      async page(userId, page, query = "") {
        const result = await ownedRpc<{ items: Record<string, unknown>[]; total: number; page: number; pageSize: number }>(userId, "page_private_notes", { p_page: page, p_query: query });
        return { ...result, items: result.items.map(noteFrom) };
      },
      async calendar(userId, start, end) {
        const result = await ownedRpc<{ note: Record<string, unknown>; count: number }[]>(userId, "calendar_private_notes", { p_start: start, p_end: end });
        return result.map(item => ({ note: noteFrom(item.note), count: item.count }));
      },
      async list(userId, query = "") {
        return (await ownedRpc<Record<string, unknown>[]>(userId, "list_note_summaries", { p_query: query })).map(noteFrom);
      },
      async get(userId, id, fresh = false) { return noteFrom(await ownedRpc(userId, "get_private_note", { p_id: id }, fresh)); },
      async save(userId, note, write) {
        return noteFrom(
          await ownedRpc(userId, "save_private_note", {
            p_id: write.id, p_write_id: write.writeId, p_expected: write.expectedUpdatedAt,
            p_title: note.title,
            p_body: note.body,
            p_day: note.day,
            p_timezone: note.timezone,
          }),
        );
      },
      async remove(userId, id, version) {
        await ownedRpc(userId, "remove_private_note", { p_id: id, p_expected: version.updatedAt });
      },
    },
    community: {
      async page(userId, request) {
        return pageFrom(await ownedRpc<DatabasePage>(userId, "list_thoughts_page", {
          p_limit: request.limit ?? 8, p_filter: request.filter ?? "all",
          p_before: request.cursor?.createdAt ?? null, p_before_id: request.cursor?.id ?? null,
        }), thoughtFrom);
      },
      async get(userId, postId) {
        const row = await ownedRpc<Record<string, unknown> | null>(userId, "get_thought", { p_id: postId });
        return row ? thoughtFrom(row) : null;
      },
      async repliesPage(userId, postId, request) {
        return pageFrom(await ownedRpc<DatabasePage>(userId, "list_replies_page", {
          p_post_id: postId, p_limit: request.limit ?? 8,
          p_before: request.cursor?.createdAt ?? null, p_before_id: request.cursor?.id ?? null,
        }), (row) => replyFrom(row, postId));
      },
      async list(userId) {
        return (
          await ownedRpc<
            (Record<string, unknown> & {
              id: string;
              alias: string;
              body: string;
              category: string;
              status: Thought["status"];
            })[]
          >(userId, "list_thoughts")
        ).map((row) => ({
          id: row.id,
          alias: row.alias,
          body: row.body,
          category: row.category,
          status: row.status,
          createdAt: String(row.created_at),
          isMine: Boolean(row.is_mine),
          repliesOpen: Boolean(row.replies_open),
          saved: Boolean(row.saved),
        }));
      },
      async replies(userId, postId) {
        return (
          await ownedRpc<
            (Record<string, unknown> & {
              id: string;
              alias: string;
              body: string;
              status: Reply["status"];
            })[]
          >(userId, "list_replies", { p_post_id: postId })
        ).map((row) => ({
          id: row.id,
          postId,
          alias: row.alias,
          body: row.body,
          status: row.status,
          createdAt: String(row.created_at),
          isMine: Boolean(row.is_mine),
        }));
      },
      async submit(userId, body, category, operationId = randomId()) {
        await ownedRpc(userId, "submit_thought_once", { p_operation_id: operationId, p_body: body, p_category: category });
      },
      async reply(userId, postId, body, operationId = randomId()) {
        await ownedRpc(userId, "submit_reply_once", { p_operation_id: operationId, p_post_id: postId, p_body: body });
      },
      async withdraw(userId, postId) {
        await ownedRpc(userId, "withdraw_thought", { p_post_id: postId });
      },
      async toggleReplies(userId, postId) {
        await ownedRpc(userId, "toggle_thought_replies", { p_post_id: postId });
      },
      async bookmark(userId, postId, saved) {
        await ownedRpc(userId, "bookmark_thought", { p_post_id: postId, p_saved: saved });
      },
      async report(userId, postId, reason) {
        await ownedRpc(userId, "report_thought", { p_post_id: postId, p_reason: reason });
      },
      async block(userId, postId) {
        await ownedRpc(userId, "block_thought_author", { p_post_id: postId });
      },
      async blocked(userId) {
        return ownedRpc(userId, "list_my_blocks");
      },
      async unblock(userId, id) {
        await ownedRpc(userId, "unblock_author", { p_block_id: id });
      },
      async queue(userId) {
        return ownedRpc(userId, "moderation_queue");
      },
      async review(userId, id, kind, approved) {
        await ownedRpc(userId, "review_content", {
          p_id: id,
          p_kind: kind,
          p_approved: approved,
        });
      },
      async canModerate(userId) {
        return ownedRpc(userId, "can_moderate");
      },
    },
    notifications: {
      async list(userId) {
        const items = await ownedRpc<
          {
            id: string;
            post_id: string;
            is_read: boolean;
            created_at: string;
            kind?: "reply" | "moderation" | "report" | "appeal";
          }[]
        >(userId, "list_my_notifications");
        return items.map((item) => ({
          id: item.id,
          postId: item.post_id,
          read: item.is_read,
          createdAt: item.created_at,
          kind: item.kind ?? "reply",
        }));
      },
      async markRead(userId, id) {
        await ownedRpc(userId, "read_notification", { p_id: id });
      },
    },
    accounts: {
      async export(userId) {
        type Manifest = { owner: string; snapshot: string; exported_at: string; sections: string[] };
        const first = await ownedRpc<Manifest>(userId, "get_export_manifest", { p_start: true });
        const allowed = ["profile","notes","moods","thoughts","replies","consent_history","notifications","bookmarks","reports","appeals","moderation_decisions"];
        if (first.owner !== userId || first.sections.length !== allowed.length || first.sections.some(s => !allowed.includes(s))) throw new Error("Your export could not be verified. Please sign in again and retry.");
        const parts: BlobPart[] = [`{\"exported_at\":${JSON.stringify(first.exported_at)}`];
        let bytes = 0;
        for (const section of first.sections) {
          parts.push(`,${JSON.stringify(section)}:[`);
          let cursor: string | null = null; let comma = "";
          const seen = new Set<string>();
          do {
            const page: { items: unknown[]; next: string | null } = await ownedRpc(userId, "export_my_data_page", { p_section: section, p_after: cursor, p_limit: 10 });
            if (!Array.isArray(page.items) || page.items.length > 10) throw new Error("The export could not be verified.");
            for (const item of page.items) {
              const text = JSON.stringify(item); bytes += new TextEncoder().encode(text).byteLength;
              if (bytes > 64 * 1024 * 1024) throw new Error("This export needs operator assistance because of its size. Contact the privacy address in Privacy & choices. No partial download was created.");
              parts.push(comma + text); comma = ",";
            }
            cursor = page.next;
            if (cursor) { if (seen.has(cursor)) throw new Error("The export could not continue safely."); seen.add(cursor); }
          } while (cursor);
          parts.push("]");
        }
        const last = await ownedRpc<Manifest>(userId, "get_export_manifest", { p_start: false });
        if (last.owner !== userId || last.snapshot !== first.snapshot) throw new Error("Your data changed during export. Please retry when your entries are no longer being edited. No partial download was created.");
        parts.push("}"); return new Blob(parts, { type: "application/json" });
      },
      async remove(userId) {
        const result = await ownedRpc<{ deleted?: boolean }>(userId, "delete_private_account");
        if (result?.deleted !== true) throw new Error("Account deletion could not be confirmed. Please retry.");
        clearLocalSession();
        // Deletion is already confirmed; a failed remote logout cannot undo it.
        void transition(() => client.auth.signOut({ scope: "local" })).catch(() => undefined);
      },
    },
    communityEnabled: import.meta.env.VITE_ENABLE_COMMUNITY !== "false",
  });
}
