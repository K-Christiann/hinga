import type { CursorPage, CursorRequest } from "./pagination";
import type { ReviewKind } from "./moderation";

export type ActivityView = "submissions" | "reports" | "appeals";
export type CaseKind = "report" | "appeal";
export type CaseStatus = "open" | "in_review" | "closed";
export type CaseAction = "start" | "keep" | "remove" | "restore" | "uphold" | "unavailable";
export interface ActivityItem {
  id: string;
  kind: ReviewKind;
  createdAt: string;
  status: "pending" | "published" | "removed" | CaseStatus;
  body: string;
  reason: string;
  explanation: string;
  resolution: string | null;
  decisionId: string | null;
  canAppeal: boolean;
}
export interface ReviewCase {
  id: string;
  kind: CaseKind;
  createdAt: string;
  status: CaseStatus;
  reason: string;
  publicResponse: string;
  staffNote: string;
  resolution: string | null;
  isInvolved: boolean;
  canRestore: boolean;
  canUphold: boolean;
  decisionExplanation: string;
  target: { id: string; kind: ReviewKind; alias: string; body: string; status: string } | null;
  context: { alias: string; body: string; available: boolean } | null;
  actions: { action: CaseAction; staffNote: string; publicResponse: string; authorExplanation?: string; reviewer: string; createdAt: string }[];
}
export interface CaseDecision {
  id: string;
  kind: CaseKind;
  action: CaseAction;
  publicResponse: string;
  staffNote: string;
  authorExplanation?: string;
}
// Member feedback and privileged case handling are independent interfaces.
// The actor ID guards browser account changes; the database derives ownership
// from the verified token, never from a caller-supplied owner field.
export interface MemberFeedbackRepository {
  page(userId: string, view: ActivityView, request: CursorRequest): Promise<CursorPage<ActivityItem>>;
  report(userId: string, kind: ReviewKind, id: string, reason: string): Promise<void>;
  appeal(userId: string, decisionId: string, reason: string): Promise<void>;
}
export interface CaseReviewRepository {
  page(userId: string, kind: CaseKind, status: CaseStatus, request: CursorRequest): Promise<CursorPage<ReviewCase>>;
  decide(userId: string, decision: CaseDecision): Promise<void>;
}
export interface FeedbackDependencies {
  member: MemberFeedbackRepository;
  staff: CaseReviewRepository;
}
