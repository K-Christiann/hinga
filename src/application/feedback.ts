import type { ActivityView, CaseDecision, CaseKind, CaseStatus, FeedbackDependencies } from "../domain/feedback";
import type { ReviewKind } from "../domain/moderation";
import { validatedText } from "../domain/models";
import { validatePageRequest, type CursorRequest } from "../domain/pagination";

export class MemberFeedbackService {
  constructor(private repository: FeedbackDependencies["member"]) {}
  page(userId: string, view: ActivityView, request: CursorRequest = {}) {
    if (!["submissions", "reports", "appeals"].includes(view)) throw new Error("Choose an activity view.");
    return this.repository.page(userId, view, validatePageRequest({ limit: 6, ...request }));
  }
  report(userId: string, kind: ReviewKind, id: string, reason: string) {
    if (!["post", "reply"].includes(kind) || !id) throw new Error("Choose an available thought or reply.");
    return this.repository.report(userId, kind, id, validatedText(reason, 500, "what concerned you"));
  }
  appeal(userId: string, decisionId: string, reason: string) {
    if (!decisionId) throw new Error("Choose an available moderation decision.");
    return this.repository.appeal(userId, decisionId, validatedText(reason, 1000, "why you would like another review"));
  }
}
export class CaseReviewService {
  constructor(private repository: FeedbackDependencies["staff"]) {}
  page(userId: string, kind: CaseKind, status: CaseStatus, request: CursorRequest = {}) {
    if (!["report", "appeal"].includes(kind) || !["open", "in_review", "closed"].includes(status))
      throw new Error("Choose an available review list.");
    return this.repository.page(userId, kind, status, validatePageRequest({ limit: 6, ...request }));
  }
  decide(userId: string, decision: CaseDecision) {
    const allowed = decision.kind === "report" ? ["start", "keep", "remove", "unavailable"]
      : decision.kind === "appeal" ? ["start", "restore", "uphold", "unavailable"] : [];
    if (!decision.id || !allowed.includes(decision.action)) throw new Error("Choose an available case and action.");
    return this.repository.decide(userId, { ...decision,
      publicResponse: validatedText(decision.publicResponse, 500, "an explanation for the member", decision.action === "start"),
      staffNote: validatedText(decision.staffNote, 500, "an internal staff note", true),
      authorExplanation: validatedText(decision.authorExplanation ?? "", 500, "an explanation for the author", !(decision.kind === "report" && decision.action === "remove")),
    });
  }
}
const unavailable = async (): Promise<never> => { throw new Error("Reports and appeals need the latest database update. Apply the reports-and-appeals migration, then retry."); };
export const unavailableFeedback: FeedbackDependencies = {
  member: { page: unavailable, report: unavailable, appeal: unavailable },
  staff: { page: unavailable, decide: unavailable },
};
