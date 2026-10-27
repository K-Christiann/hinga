import type { OwnedRpc } from "./privateRpc";
import type { ActivityItem, FeedbackDependencies, ReviewCase } from "../domain/feedback";
import type { CursorPage, CursorRequest } from "../domain/pagination";

export function createSupabaseFeedback(rpc: OwnedRpc): FeedbackDependencies {
  const pageArgs = (request: CursorRequest) => ({ p_limit: request.limit ?? 6,
    p_before_time: request.cursor?.createdAt ?? null, p_before_id: request.cursor?.id ?? null });
  return {
    member: {
      page: (userId, view, request) => rpc<CursorPage<ActivityItem>>(userId, "list_member_activity_page", { p_view: view, ...pageArgs(request) }),
      async report(userId, kind, id, reason) { await rpc(userId, "raise_concern", { p_kind: kind, p_id: id, p_reason: reason }); },
      async appeal(userId, decisionId, reason) { await rpc(userId, "request_appeal", { p_decision_id: decisionId, p_reason: reason }); },
    },
    staff: {
      page: (userId, kind, status, request) => rpc<CursorPage<ReviewCase>>(userId, "list_review_cases_page", { p_kind: kind, p_status: status, ...pageArgs(request) }),
      async decide(userId, decision) { await rpc(userId, "decide_review_case", { p_kind: decision.kind, p_id: decision.id,
        p_action: decision.action, p_public_response: decision.publicResponse, p_staff_note: decision.staffNote,
        p_author_explanation: decision.authorExplanation ?? "" }); },
    },
  };
}
