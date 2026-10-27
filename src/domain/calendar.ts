import { daysBefore, type MoodEntry, type Note } from "./models";

export type ReportView = "month" | "week" | "day";
export interface DateRange {
  start: string;
  end: string;
}
export interface DayRecord {
  day: string;
  mood?: MoodEntry;
  latestNote?: Note;
  noteCount: number;
}

export function isCalendarDay(day: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const parsed = new Date(`${day}T12:00:00Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === day
  );
}

export function weekStart(day: string): string {
  const weekday = (new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7;
  return daysBefore(day, weekday);
}

export function reportRange(day: string, view: ReportView): DateRange {
  if (view === "day") return { start: day, end: day };
  if (view === "week") {
    const start = weekStart(day);
    return { start, end: daysBefore(start, -6) };
  }
  const start = `${day.slice(0, 7)}-01`;
  const next = new Date(`${start}T12:00:00Z`);
  next.setUTCMonth(next.getUTCMonth() + 1);
  return { start, end: daysBefore(next.toISOString().slice(0, 10), 1) };
}

export function rangeDays({ start, end }: DateRange): string[] {
  const length =
    Math.round(
      (Date.parse(`${end}T12:00:00Z`) - Date.parse(`${start}T12:00:00Z`)) /
        86400000,
    ) + 1;
  return Array.from({ length }, (_, index) => daysBefore(start, -index));
}

export function monthGrid(day: string): string[] {
  const range = reportRange(day, "month");
  return rangeDays({
    start: weekStart(range.start),
    end: daysBefore(weekStart(range.end), -6),
  });
}

export function shiftReport(
  day: string,
  view: ReportView,
  direction: -1 | 1,
): string {
  if (view !== "month")
    return daysBefore(day, -direction * (view === "week" ? 7 : 1));
  const first = new Date(`${day.slice(0, 7)}-01T12:00:00Z`);
  first.setUTCMonth(first.getUTCMonth() + direction);
  const month = first.toISOString().slice(0, 10);
  const last = Number(reportRange(month, "month").end.slice(-2));
  return `${month.slice(0, 7)}-${String(Math.min(Number(day.slice(-2)), last)).padStart(2, "0")}`;
}

// PostgreSQL timestamps can carry microseconds. Preserve their order even when
// Date.parse rounds both saves to the same millisecond. IDs settle exact ties.
function compareTimestamp(a: string, b: string): number {
  const milliseconds = Date.parse(a) - Date.parse(b);
  if (milliseconds) return milliseconds;
  const remainder = (value: string) =>
    Number(
      (value.match(/\.(\d+)/)?.[1] || "").padEnd(9, "0").slice(3, 9),
    );
  return remainder(a) - remainder(b);
}

export function newestNotesFirst(a: Note, b: Note): number {
  return (
    compareTimestamp(b.updatedAt, a.updatedAt) ||
    compareTimestamp(b.createdAt, a.createdAt) ||
    b.id.localeCompare(a.id)
  );
}

export function dailyRecords(
  moods: MoodEntry[],
  notes: Note[],
): Map<string, DayRecord> {
  const records = new Map<string, DayRecord>();
  const record = (day: string) => {
    let item = records.get(day);
    if (!item) {
      item = { day, noteCount: 0 };
      records.set(day, item);
    }
    return item;
  };
  for (const mood of moods) record(mood.day).mood = mood;
  for (const note of notes) {
    const item = record(note.day);
    item.noteCount++;
    if (!item.latestNote || newestNotesFirst(note, item.latestNote) < 0)
      item.latestNote = note;
  }
  return records;
}

export function reportSummary(records: Map<string, DayRecord>, range: DateRange) {
  const days = [...records.values()].filter(
    (item) => item.day >= range.start && item.day <= range.end,
  );
  const moods = days.flatMap((item) =>
    item.mood ? [item.mood] : [],
  );
  return {
    checkIns: moods.length,
    notes: days.reduce((count, item) => count + item.noteCount, 0),
    writingDays: days.filter((item) => item.noteCount > 0).length,
    distribution: [1, 2, 3, 4, 5].map(
      (value) => moods.filter((mood) => mood.value === value).length,
    ),
  };
}
