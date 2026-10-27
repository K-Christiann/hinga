import type { CursorPage, CursorRequest } from "./pagination";

export type ReviewKind = "post" | "reply";
export interface StaffAccess {
  role: "moderator" | "admin" | null;
  verified: boolean;
}
export interface ReviewSubmission {
  id: string;
  kind: ReviewKind;
  alias: string;
  body: string;
  category: string;
  createdAt: string;
  isOwn: boolean;
  context: { alias: string; body: string; available: boolean } | null;
}
export interface ReviewDecision {
  id: string;
  kind: ReviewKind;
  approved: boolean;
  reason: string;
  publicReason?: string;
}
export interface ReviewRecord extends ReviewDecision {
  submissionId: string;
  reviewer: string;
  createdAt: string;
  source?: "review" | "report" | "appeal";
}
export interface AuthenticatorFactor {
  id: string;
  name: string;
  status: "verified" | "unverified";
}
export interface AuthenticatorSetup {
  id: string;
  qrCode: string;
  secret: string;
}
// Staff data and second-factor authentication are separate ports. Neither
// requires the UI or application services to depend on the Supabase SDK.
export interface ModerationRepository {
  access(userId: string): Promise<StaffAccess>;
  queue(userId: string, kind: ReviewKind, request: CursorRequest): Promise<CursorPage<ReviewSubmission>>;
  history(userId: string, request: CursorRequest): Promise<CursorPage<ReviewRecord>>;
  decide(userId: string, decision: ReviewDecision): Promise<void>;
}
export interface AuthenticatorGateway {
  factors(userId: string): Promise<AuthenticatorFactor[]>;
  enroll(userId: string): Promise<AuthenticatorSetup>;
  verify(userId: string, factorId: string, code: string): Promise<void>;
  discardUnverified(userId: string, factorId: string): Promise<void>;
}
export interface ModerationDependencies {
  repository: ModerationRepository;
  authenticator: AuthenticatorGateway;
}
