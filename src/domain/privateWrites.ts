/** A stable entry ID and operation ID make an unconfirmed write safe to retry. */
export interface PrivateWrite {
  id: string;
  writeId: string;
  expectedUpdatedAt: string | null;
}
export interface PrivateVersion { id: string; updatedAt: string }
export const conflictMessage = "This entry changed elsewhere or was removed. Reload the saved version before trying again. Your draft is still here.";

/** Holds no storage or network access. Drafts stay in this tab's memory. */
export class WriteAttempt {
  private fingerprint = "";
  private writeId = "";
  readonly id: string;
  constructor(readonly expectedUpdatedAt: string | null = null, id?: string) {
    this.id = id ?? randomId();
  }
  forContent(content: unknown): PrivateWrite {
    const fingerprint = JSON.stringify(content);
    if (this.fingerprint !== fingerprint || !this.writeId) {
      this.fingerprint = fingerprint;
      this.writeId = randomId();
    }
    return { id: this.id, writeId: this.writeId, expectedUpdatedAt: this.expectedUpdatedAt };
  }
}
import { randomId } from "./ids";
