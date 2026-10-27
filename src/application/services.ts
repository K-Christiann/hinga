import type { DisplayPreferences } from "../domain/preferences";
import type { PolicyGateway } from "../domain/policy";
import {
  validatedText,
  localDay,
  daysBefore,
  type MoodValue,
  type Note,
  type Profile,
} from "../domain/models";
import { isCalendarDay } from "../domain/calendar";
import { WriteAttempt, type PrivateWrite, type PrivateVersion } from "../domain/privateWrites";
import type { ThoughtProvider } from "../domain/encouragement";
import type { DiagnosticSink, OperationsRepository } from "../domain/operations";
import { ModerationService, unavailableModeration } from "./moderation";
import type { ModerationDependencies } from "../domain/moderation";
import type { FeedbackDependencies } from "../domain/feedback";
import { MemberFeedbackService, CaseReviewService, unavailableFeedback } from "./feedback";
import { validatePageRequest, type CursorRequest, type ThoughtFilter } from "../domain/pagination";
import type {
  AccountRepository,
  AuthGateway,
  CommunityRepository,
  MoodRepository,
  NoteRepository,
  ProfileRepository,
  NotificationRepository,
} from "../domain/ports";

export class ConsentPolicy {
  constructor(private profiles: ProfileRepository) {}
  async assertPrivateTools(userId: string) {
    const profile = await this.profiles.get(userId);
    if (!profile.healthConsent)
      throw new Error(
        "Enable private tools in Settings before saving a mood or note.",
      );
    return profile;
  }
}
export class MoodService {
  get(userId: string, day: string, fresh = false) { return this.repository.get(userId, day, fresh); }
  constructor(
    private repository: MoodRepository,
    private consent: ConsentPolicy,
  ) {}
  list(userId: string) {
    return this.repository.list(userId);
  }
  async save(
    userId: string,
    day: string,
    value: MoodValue,
    note: string,
    timezone: string,
    write?: PrivateWrite,
  ) {
    await this.consent.assertPrivateTools(userId);
    const parsed = new Date(`${day}T12:00:00Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
      Number.isNaN(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== day ||
      ![1, 2, 3, 4, 5].includes(value)
    )
      throw new Error("Choose a valid day and mood.");
    if (!write) {
      const existing = (await this.repository.list(userId)).find((item) => item.day === day);
      write = new WriteAttempt(existing?.updatedAt ?? null, existing?.id).forContent([day, value, note, timezone]);
    }
    return this.repository.save(userId, {
      day,
      value,
      note: validatedText(note, 1000, "your note", true),
      timezone,
    }, write);
  }
  async remove(userId: string, day: string, version?: PrivateVersion) {
    const existing = version ?? (await this.repository.list(userId)).find((item) => item.day === day);
    if (existing) return this.repository.remove(userId, day, existing);
  }
}
export class NotesService {
  constructor(
    private repository: NoteRepository,
    private consent: ConsentPolicy,
  ) {}
  list(userId: string, query = "") { return this.repository.list(userId, query); }
  page(userId: string, page: number, query = "") {
    if (!Number.isSafeInteger(page) || page < 1 || query.length > 200) throw new Error("Choose a valid note page and search.");
    return this.repository.page(userId, page, query);
  }
  calendar(userId: string, start: string, end: string) {
    if (!isCalendarDay(start) || !isCalendarDay(end) || end < start || Date.parse(end) - Date.parse(start) > 41 * 86400000)
      throw new Error("Choose a calendar range of up to 42 days.");
    return this.repository.calendar(userId, start, end);
  }
  get(userId: string, id: string, fresh = false) { return this.repository.get(userId, id, fresh); }
  async save(
    userId: string,
    note: Pick<Note, "title" | "body"> & { id?: string; day?: string; timezone?: string },
    write?: PrivateWrite,
  ) {
    const profile = await this.consent.assertPrivateTools(userId);
    const existing = note.id && !write
      ? await this.repository.get(userId, note.id)
      : undefined;
    if (note.id && !write && !existing)
      throw new Error("This note is not available in your space.");
    const timezone = existing?.timezone || note.timezone || profile.timezone;
    const today = localDay(new Date(), timezone);
    const day = note.day ?? existing?.day ?? today;
    if (!isCalendarDay(day) || day > today || day < daysBefore(today, 3659))
      throw new Error("Choose a valid note date within the last ten years, up to today.");
    write ??= new WriteAttempt(existing?.updatedAt ?? null, existing?.id).forContent(note);
    return this.repository.save(userId, {
      ...note,
      day,
      timezone,
      title:
        validatedText(note.title, 120, "a title", true) ||
        "A little note to myself",
      body: validatedText(note.body, 20000, "your note"),
    }, write);
  }
  async remove(userId: string, id: string, version?: PrivateVersion) {
    const existing = version ?? await this.repository.get(userId, id);
    if (existing) return this.repository.remove(userId, id, existing);
  }
}
export class CommunityService {
  constructor(private repository: CommunityRepository) {}
  list(userId: string) {
    return this.repository.list(userId);
  }
  page(userId: string, request: CursorRequest & { filter?: ThoughtFilter } = {}) {
    const filter = request.filter ?? "all";
    if (!["all", "mine", "saved"].includes(filter))
      throw new Error("Choose an available discussion filter.");
    return this.repository.page(userId, { ...validatePageRequest(request), filter });
  }
  get(userId: string, postId: string) {
    return this.repository.get(userId, postId);
  }
  replies(userId: string, postId: string) {
    return this.repository.replies(userId, postId);
  }
  repliesPage(userId: string, postId: string, request: CursorRequest = {}) {
    return this.repository.repliesPage(userId, postId, validatePageRequest(request));
  }
  submit(userId: string, body: string, category: string, operationId?: string) {
    return this.repository.submit(
      userId,
      validatedText(body, 3000, "your thought"),
      validatedText(category, 30, "a topic"),
      operationId,
    );
  }
  reply(userId: string, postId: string, body: string, operationId?: string) {
    return this.repository.reply(
      userId,
      postId,
      validatedText(body, 1000, "your reply"),
      operationId,
    );
  }
  withdraw(userId: string, id: string) {
    return this.repository.withdraw(userId, id);
  }
  toggleReplies(userId: string, id: string) {
    return this.repository.toggleReplies(userId, id);
  }
  bookmark(userId: string, id: string, saved: boolean) {
    return this.repository.bookmark(userId, id, saved);
  }
  report(userId: string, id: string, reason: string) {
    return this.repository.report(
      userId,
      id,
      validatedText(reason, 500, "a reason"),
    );
  }
  block(userId: string, id: string) {
    return this.repository.block(userId, id);
  }
  blocked(userId: string) {
    return this.repository.blocked(userId);
  }
  unblock(userId: string, id: string) {
    return this.repository.unblock(userId, id);
  }
  queue(userId: string) {
    return this.repository.queue(userId);
  }
  review(userId: string, id: string, kind: "post" | "reply", approved: boolean) {
    return this.repository.review(userId, id, kind, approved);
  }
  canModerate(userId: string) {
    return this.repository.canModerate(userId);
  }
}
export class ProfileService {
  constructor(private repository: ProfileRepository) {}
  get(userId: string) {
    return this.repository.get(userId);
  }
  save(userId: string, profile: Omit<Profile, "id">) {
    const alias = validatedText(profile.alias, 40, "an alias") || "Quiet Fern";
    try {
      new Intl.DateTimeFormat("en", { timeZone: profile.timezone });
    } catch {
      throw new Error("Choose a supported timezone.");
    }
    return this.repository.save(userId, { ...profile, alias });
  }
}
export interface Services {
  preferences: DisplayPreferences;
  policy: PolicyGateway;
  diagnostics: DiagnosticSink;
  operations: OperationsRepository;
  thoughts: ThoughtProvider;
  feedback: MemberFeedbackService;
  cases: CaseReviewService;
  moderation: ModerationService;
  auth: AuthGateway;
  profiles: ProfileService;
  moods: MoodService;
  notes: NotesService;
  community: CommunityService;
  notifications: NotificationRepository;
  accounts: AccountRepository;
  communityEnabled: boolean;
}
export function composeServices(repositories: {
  preferences: DisplayPreferences;
  policy: PolicyGateway;
  diagnostics?: DiagnosticSink;
  operations?: OperationsRepository;
  thoughts: ThoughtProvider;
  feedback?: FeedbackDependencies;
  moderation?: ModerationDependencies;
  auth: AuthGateway;
  profiles: ProfileRepository;
  moods: MoodRepository;
  notes: NoteRepository;
  community: CommunityRepository;
  notifications: NotificationRepository;
  accounts: AccountRepository;
  communityEnabled: boolean;
}): Services {
  const consent = new ConsentPolicy(repositories.profiles);
  return {
    preferences: repositories.preferences,
    policy: repositories.policy,
    diagnostics: repositories.diagnostics ?? { capture() {} },
    operations: repositories.operations ?? { async summary() { return null; } },
    thoughts: repositories.thoughts,
    feedback: new MemberFeedbackService((repositories.feedback ?? unavailableFeedback).member),
    cases: new CaseReviewService((repositories.feedback ?? unavailableFeedback).staff),
    moderation: new ModerationService(repositories.moderation ?? unavailableModeration),
    auth: repositories.auth,
    profiles: new ProfileService(repositories.profiles),
    moods: new MoodService(repositories.moods, consent),
    notes: new NotesService(repositories.notes, consent),
    community: new CommunityService(repositories.community),
    notifications: repositories.notifications,
    accounts: repositories.accounts,
    communityEnabled: repositories.communityEnabled,
  };
}
