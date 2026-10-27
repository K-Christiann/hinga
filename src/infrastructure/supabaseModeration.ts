import type { SupabaseClient } from "@supabase/supabase-js";
import type { OwnedRpc, SessionGuard } from "./privateRpc";
import type { AuthTransition } from "./authTransitions";
import type { ModerationDependencies, ReviewSubmission, ReviewRecord } from "../domain/moderation";
import type { CursorPage } from "../domain/pagination";

export function createSupabaseModeration(client: SupabaseClient, rpc: OwnedRpc, capture: SessionGuard, transition: AuthTransition): ModerationDependencies {
  async function authenticated<T>(userId: string, action: (scope: Awaited<ReturnType<SessionGuard>>) => Promise<T>): Promise<T> {
    const scope = await capture(userId);
    return transition(async () => {
      scope.assertActive();
      const result = await action(scope);
      await scope.assertCurrent();
      return result;
    });
  }
  function authError(error: { code?: string } | null) {
    if (!error) return;
    if (["mfa_verification_failed", "mfa_challenge_expired"].includes(error.code || ""))
      throw new Error("That code could not be verified. Try the current code from your authenticator.");
    if (["over_request_rate_limit", "over_mfa_rate_limit"].includes(error.code || ""))
      throw new Error("Too many attempts. Wait a moment before trying again.");
    throw new Error("Authenticator setup could not complete. Check that TOTP MFA is enabled in Supabase, then try again.");
  }
  return {
    repository: {
      access: (userId) => rpc(userId, "get_staff_access"),
      queue: (userId, kind, request) => rpc<CursorPage<ReviewSubmission>>(userId, "list_review_queue_page", {
        p_kind: kind, p_limit: request.limit,
        p_before_time: request.cursor?.createdAt ?? null, p_before_id: request.cursor?.id ?? null,
      }),
      history: (userId, request) => rpc<CursorPage<ReviewRecord>>(userId, "list_review_history_page", {
        p_limit: request.limit,
        p_before_time: request.cursor?.createdAt ?? null, p_before_id: request.cursor?.id ?? null,
      }),
      async decide(userId, decision) {
        await rpc(userId, "decide_submission", {
          p_id: decision.id, p_kind: decision.kind, p_approved: decision.approved, p_staff_note: decision.reason,
          p_public_reason: decision.publicReason ?? "",
        });
      },
    },
    authenticator: {
      async factors(userId) {
        return authenticated(userId, async () => {
        const { data, error } = await client.auth.mfa.listFactors();
        authError(error);
        return (data?.all || []).filter((factor) => factor.factor_type === "totp").map((factor) => ({
          id: factor.id, name: factor.friendly_name || "Authenticator", status: factor.status,
        }));
        });
      },
      async enroll(userId) {
        return authenticated(userId, async () => {
        const { data, error } = await client.auth.mfa.enroll({
          factorType: "totp", friendlyName: `Hinga review desk ${Date.now()}`, issuer: "Hinga",
        });
        authError(error);
        if (!data || data.type !== "totp") throw new Error("Authenticator setup is unavailable. Please try again.");
        return { id: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
        });
      },
      async verify(userId, factorId, code) {
        return authenticated(userId, async () => {
        const { error } = await client.auth.mfa.challengeAndVerify({ factorId, code });
        authError(error);
        });
      },
      async discardUnverified(userId, factorId) {
        return authenticated(userId, async (scope) => {
        const { data, error } = await client.auth.mfa.listFactors();
        authError(error);
        await scope.assertCurrent();
        if (!data?.all.some((factor) => factor.id === factorId && factor.factor_type === "totp" && factor.status === "unverified"))
          throw new Error("Only an unfinished authenticator setup can be removed here.");
        const result = await client.auth.mfa.unenroll({ factorId });
        authError(result.error);
        });
      },
    },
  };
}
