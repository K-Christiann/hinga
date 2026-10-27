export type DiagnosticCode = "render_error" | "unhandled_error" | "unhandled_rejection";
export interface DiagnosticSink { capture(code: DiagnosticCode): void }
export interface OperationsSnapshot {
  gatewayRequired: boolean; gatewayHookActive: boolean;
  pendingPosts: number; pendingReplies: number; openReports: number; openAppeals: number;
  oldestSubmissionMinutes: number | null; oldestReportMinutes: number | null; oldestAppealMinutes: number | null;
  recentCounts: Record<string, number>;
  lastBackupAt: string | null; lastRestoreAt: string | null;
}
export interface OperationsRepository { summary(userId: string): Promise<OperationsSnapshot | null> }
