import type {
  BlockedAccount,
  Identity,
  MoodEntry,
  Note,
  Notification,
  Profile,
  Reply,
  ReviewItem,
  Thought,
} from "./models";
import type { CursorPage, CursorRequest, ThoughtFilter } from "./pagination";
import type { PrivateWrite, PrivateVersion } from "./privateWrites";

export interface AuthGateway {
  current(): Promise<Identity | null>;
  subscribe(listener: (identity: Identity | null) => void): () => void;
  google(): Promise<void>;
  signOut(): Promise<void>;
}
export interface ProfileRepository {
  get(userId: string): Promise<Profile>;
  save(userId: string, profile: Omit<Profile, "id">): Promise<Profile>;
}
export interface MoodRepository {
  list(userId: string): Promise<MoodEntry[]>;
  get(userId: string, day: string, fresh?: boolean): Promise<MoodEntry | null>;
  save(
    userId: string,
    entry: Omit<MoodEntry, "id" | "updatedAt">,
    write: PrivateWrite,
  ): Promise<MoodEntry>;
  remove(userId: string, day: string, version: PrivateVersion): Promise<void>;
}
export interface NotePage { items: Note[]; total: number; page: number; pageSize: number; }
export interface CalendarNoteSummary { note: Note; count: number; }
export interface NoteRepository {
  page(userId: string, page: number, query?: string): Promise<NotePage>;
  calendar(userId: string, start: string, end: string): Promise<CalendarNoteSummary[]>;
  list(userId: string, query?: string): Promise<Note[]>;
  get(userId: string, id: string, fresh?: boolean): Promise<Note>;
  save(
    userId: string,
    note: Pick<Note, "title" | "body" | "day" | "timezone"> & { id?: string },
    write: PrivateWrite,
  ): Promise<Note>;
  remove(userId: string, id: string, version: PrivateVersion): Promise<void>;
}
export interface CommunityRepository {
  list(userId: string): Promise<Thought[]>;
  page(userId: string, request: CursorRequest & { filter?: ThoughtFilter }): Promise<CursorPage<Thought>>;
  get(userId: string, postId: string): Promise<Thought | null>;
  replies(userId: string, postId: string): Promise<Reply[]>;
  repliesPage(userId: string, postId: string, request: CursorRequest): Promise<CursorPage<Reply>>;
  submit(userId: string, body: string, category: string, operationId?: string): Promise<void>;
  reply(userId: string, postId: string, body: string, operationId?: string): Promise<void>;
  withdraw(userId: string, postId: string): Promise<void>;
  toggleReplies(userId: string, postId: string): Promise<void>;
  bookmark(userId: string, postId: string, saved: boolean): Promise<void>;
  report(userId: string, postId: string, reason: string): Promise<void>;
  block(userId: string, postId: string): Promise<void>;
  blocked(userId: string): Promise<BlockedAccount[]>;
  unblock(userId: string, id: string): Promise<void>;
  queue(userId: string): Promise<ReviewItem[]>;
  review(userId: string, id: string, kind: "post" | "reply", approved: boolean): Promise<void>;
  canModerate(userId: string): Promise<boolean>;
}
export interface NotificationRepository {
  list(userId: string): Promise<Notification[]>;
  markRead(userId: string, id: string): Promise<void>;
}
export interface AccountRepository {
  export(userId: string): Promise<unknown>;
  remove(userId: string): Promise<void>;
}
