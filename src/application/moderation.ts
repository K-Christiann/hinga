import type { ModerationDependencies, ReviewDecision, ReviewKind } from "../domain/moderation";
import { validatedText } from "../domain/models";
import { validatePageRequest, type CursorRequest } from "../domain/pagination";

export class ModerationService {
  constructor(private dependencies: ModerationDependencies) {}
  access(userId: string) { return this.dependencies.repository.access(userId); }
  queue(userId: string, kind: ReviewKind, request: CursorRequest = {}) {
    if (!["post", "reply"].includes(kind)) throw new Error("Choose thoughts or replies.");
    return this.dependencies.repository.queue(userId, kind, validatePageRequest({ limit: 6, ...request }));
  }
  history(userId: string, request: CursorRequest = {}) {
    return this.dependencies.repository.history(userId, validatePageRequest({ limit: 6, ...request }));
  }
  async decide(userId: string, decision: ReviewDecision) {
    if (!["post", "reply"].includes(decision.kind) || typeof decision.approved !== "boolean" || !decision.id)
      throw new Error("Choose an available submission and decision.");
    const reason = validatedText(decision.reason, 500, "a review note", decision.approved);
    const publicReason = validatedText(decision.publicReason ?? (decision.approved ? "" : "This submission could not be shared under our community guidelines. You can request another review."), 500, "an explanation for the author", decision.approved);
    await this.dependencies.repository.decide(userId, { ...decision, reason, publicReason });
  }
  factors(userId: string) { return this.dependencies.authenticator.factors(userId); }
  async enroll(userId: string) {
    const access = await this.access(userId);
    if (!access.role) throw new Error("Only assigned reviewers can set up staff access here.");
    return this.dependencies.authenticator.enroll(userId);
  }
  verify(userId: string, factorId: string, code: string) {
    if (!factorId || !/^\d{6}$/.test(code)) throw new Error("Enter the six-digit code from your authenticator.");
    return this.dependencies.authenticator.verify(userId, factorId, code);
  }
  discardUnverified(userId: string, factorId: string) { return this.dependencies.authenticator.discardUnverified(userId, factorId); }
}

// Fail closed for an older integration that has not supplied the new staff port.
export const unavailableModeration: ModerationDependencies = {
  repository: {
    async access() { return { role: null, verified: false }; },
    async queue() { throw new Error("Review desk is not connected."); },
    async history() { throw new Error("Review desk is not connected."); },
    async decide() { throw new Error("Review desk is not connected."); },
  },
  authenticator: {
    async factors() { return []; },
    async enroll() { throw new Error("Staff authentication is not connected."); },
    async verify() { throw new Error("Staff authentication is not connected."); },
    async discardUnverified() { throw new Error("Staff authentication is not connected."); },
  },
};
