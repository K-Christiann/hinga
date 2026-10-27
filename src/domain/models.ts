export type MoodValue = 1 | 2 | 3 | 4 | 5;
export const MOODS: {
  value: MoodValue;
  label: string;
  short: string;
  color: string;
}[] = [
  {
    value: 1,
    label: "Very difficult",
    short: "Very difficult",
    color: "#ddd4e4",
  },
  { value: 2, label: "Difficult", short: "Difficult", color: "#eed6cd" },
  { value: 3, label: "Mixed", short: "Mixed", color: "#eadfaf" },
  { value: 4, label: "Okay", short: "Okay", color: "#cbdac4" },
  { value: 5, label: "Good", short: "Good", color: "#8ca786" },
];
export interface Identity {
  id: string;
  email?: string;
}
export interface Profile {
  id: string;
  alias: string;
  timezone: string;
  onboardingComplete: boolean;
  healthConsent: boolean;
}
export interface MoodEntry {
  summary?: boolean;
  id: string;
  day: string;
  value: MoodValue;
  note: string;
  timezone: string;
  updatedAt: string;
}
export interface Note {
  id: string;
  day: string;
  timezone: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}
export type PublicationStatus = "pending" | "published" | "removed";
export interface Thought {
  id: string;
  alias: string;
  body: string;
  category: string;
  createdAt: string;
  status: PublicationStatus;
  isMine: boolean;
  repliesOpen: boolean;
  saved?: boolean;
}
export interface Reply {
  id: string;
  postId: string;
  alias: string;
  body: string;
  createdAt: string;
  status: PublicationStatus;
  isMine: boolean;
}
export interface Notification {
  id: string;
  postId: string;
  read: boolean;
  createdAt: string;
  kind?: "reply" | "moderation" | "report" | "appeal";
}
export interface BlockedAccount {
  id: string;
  alias: string;
}
export interface ReviewItem {
  id: string;
  kind: "post" | "reply";
  alias: string;
  body: string;
  createdAt: string;
}
export function localDay(date: Date, timezone = "Asia/Manila"): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return ["year", "month", "day"]
    .map((key) => parts.find((part) => part.type === key)!.value)
    .join("-");
}
export function daysBefore(day: string, count: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - count);
  return date.toISOString().slice(0, 10);
}
export function dayLabel(
  day: string,
  options: Intl.DateTimeFormatOptions = {},
): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
    ...options,
  }).format(new Date(`${day}T12:00:00Z`));
}
export function validatedText(
  value: string,
  limit: number,
  label: string,
  allowEmpty = false,
): string {
  const text = value.trim();
  if (!allowEmpty && !text) throw new Error(`Please add ${label}.`);
  if (text.length > limit)
    throw new Error(
      `Please keep ${label} within ${limit.toLocaleString()} characters.`,
    );
  return text;
}
