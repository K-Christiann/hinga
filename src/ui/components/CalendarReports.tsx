import { useApp, useData } from "../context";
import { useMemo, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, FileText, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { dailyRecords, monthGrid, rangeDays, reportRange, reportSummary, shiftReport, type DayRecord, type ReportView } from "../../domain/calendar";
import { MOODS, dayLabel, daysBefore, type MoodEntry, type Note } from "../../domain/models";
import type { CalendarNoteSummary } from "../../domain/ports";
import { PrivateBadge } from "./Primitives";
import "./calendar-reports.css";

const views: { value: ReportView; label: string }[] = [
  { value: "month", label: "Month" },
  { value: "week", label: "Week" },
  { value: "day", label: "Day" },
];
const snippet = (record?: DayRecord) => (record?.latestNote?.body || record?.mood?.note || "").replace(/\s+/g, " ").slice(0, 85);

function MoodLabel({ mood }: { mood?: MoodEntry }) {
  if (!mood) return <span className="report-no-mood">No check-in</span>;
  const feeling = MOODS[mood.value - 1];
  return <span className="report-mood-label"><i style={{ background: feeling.color }} />{feeling.label}</span>;
}

function MonthReport({ days, records, selectedDay, today, earliest, onSelect }: {
  days: string[]; records: Map<string, DayRecord>; selectedDay: string; today: string; earliest: string; onSelect(day: string): void;
}) {
  return <div className="report-month">
    <div className="report-weekdays" aria-hidden="true">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <span key={day}>{day}</span>)}</div>
    <div className="report-month-grid" role="group" aria-label="Choose a calendar day to read its report">
      {days.map((day) => {
        const item = records.get(day);
        const preview = snippet(item);
        const selected = selectedDay === day;
        const outside = day.slice(0, 7) !== selectedDay.slice(0, 7);
        return <button key={day} type="button" disabled={day > today || day < earliest}
          className={`report-date ${selected ? "selected" : ""} ${outside ? "outside-month" : ""} ${day === today ? "today" : ""}`}
          aria-pressed={selected} aria-controls="calendar-day-detail"
          aria-label={`${dayLabel(day, { weekday: "long", year: "numeric" })}${day === today ? ", today" : ""}. ${item?.mood ? MOODS[item.mood.value - 1].label : "No check-in"}. ${item?.noteCount ? `${item.noteCount} private ${item.noteCount === 1 ? "note" : "notes"}. Latest: ${preview}` : preview ? `Check-in note: ${preview}` : "No note"}`}
          onClick={() => onSelect(day)}>
          <span className="report-date-top"><span>{Number(day.slice(-2))}</span>{item?.mood && <i className="report-mood-dot" style={{ background: MOODS[item.mood.value - 1].color }} aria-hidden="true" />}</span>
          {preview && <span className="report-date-snippet" aria-hidden="true">{preview}</span>}
          {!!item?.noteCount && <span className="report-note-indicator" aria-hidden="true"><FileText size={11} /><span className="report-note-text">{item.noteCount > 1 ? item.noteCount : "Note"}</span><span className="report-note-mobile-count">{item.noteCount}</span></span>}
        </button>;
      })}
    </div>
  </div>;
}

function WeekReport({ days, records, selectedDay, today, earliest, onSelect }: {
  days: string[]; records: Map<string, DayRecord>; selectedDay: string; today: string; earliest: string; onSelect(day: string): void;
}) {
  return <div className="report-week" role="group" aria-label="Days in this weekly report">
    {days.map((day) => {
      const item = records.get(day);
      return <button type="button" key={day} disabled={day > today || day < earliest}
        className={`report-week-day ${selectedDay === day ? "selected" : ""}`} aria-pressed={selectedDay === day}
        aria-controls="calendar-day-detail" onClick={() => onSelect(day)}>
        <span className="report-week-date"><span>{dayLabel(day, { weekday: "short", day: undefined, month: undefined })}</span><strong>{Number(day.slice(-2))}</strong>{day === today && <small>Today</small>}</span>
        <span className="report-week-content"><MoodLabel mood={item?.mood} /><span className={`report-week-snippet ${snippet(item) ? "" : "empty"}`}>{snippet(item) || (day > today ? "A day still to come." : "No note for this day.")}</span>{!!item?.noteCount && <small>{item.noteCount} {item.noteCount === 1 ? "note" : "notes"} · latest saved shown</small>}</span>
        <ArrowRight size={15} aria-hidden="true" />
      </button>;
    })}
  </div>;
}

function DailyReport({ record, day, timezone, onEditMood, onDailyView }: {
  record?: DayRecord; day: string; timezone: string; onEditMood(day: string): void; onDailyView?: () => void;
}) {
  const { services, identity } = useApp();
  const summary = record?.latestNote;
  const { data: full, loading, error } = useData(() => summary && identity ? services.notes.get(identity.id, summary.id) : Promise.resolve(null), null as Note | null, [summary?.id, summary?.updatedAt]);
  const note = full?.id === summary?.id ? full : summary;
  const { data: fullMood, loading: moodLoading, error: moodError } = useData(() => record?.mood && identity ? services.moods.get(identity.id, day) : Promise.resolve(null), null as MoodEntry | null, [day, record?.mood?.updatedAt]);
  return <section id="calendar-day-detail" className="report-day-detail" aria-labelledby="report-day-heading">
    <div className="report-detail-heading">
      <div><span className="eyebrow">YOUR DAY</span><h3 id="report-day-heading" aria-live="polite">{dayLabel(day, { weekday: "long", month: "long", year: "numeric" })}</h3></div>
      {onDailyView && <button type="button" className="inline-link" onClick={onDailyView}>Daily report <ArrowRight size={13} /></button>}
    </div>
    <div className="report-day-checkin"><MoodLabel mood={record?.mood} /><button type="button" className="inline-link" onClick={() => onEditMood(day)}>{record?.mood ? "Edit check-in" : "Add check-in"}</button></div>
    {record?.mood?.note && <div className="report-checkin-note"><span className="report-content-label">Check-in note</span><p>{moodLoading ? "Loading your check-in note…" : moodError ? "Your complete check-in note could not load. Open Edit check-in to retry." : fullMood?.note || ""}</p></div>}
    {note ? <article className="report-latest-note">
      <div className="report-note-heading"><span className="report-content-label"><FileText size={14} />{record!.noteCount > 1 ? `Latest of ${record!.noteCount} notes` : "Your private note"}</span><Link className="inline-link" to={`/notes?note=${encodeURIComponent(note.id)}`}>Open note <ArrowRight size={13} /></Link></div>
      <h4>{note.title}</h4>
      <div className="report-full-note" tabIndex={0} role="region" aria-label={`Full text of ${note.title}`}><p>{loading ? "Loading your note…" : error ? "The full note could not load. Open My Notes to retry." : full?.body || ""}</p></div>
      <p className="report-saved-time">Last saved {new Intl.DateTimeFormat("en", { timeZone: note.timezone, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(note.updatedAt))} · {note.timezone}</p>
    </article> : <div className="report-empty-note"><FileText size={20} /><div><h4>A little space for your words.</h4><p>No private note for this day. You can leave it as it is, or write when you’re ready.</p></div></div>}
    <div className="report-detail-footer"><span>Notes stay private to your account.</span><Link className="report-write-link" to={`/notes?day=${day}`}><Plus size={14} />{note ? "Add another note" : "Write a note"}</Link></div>
    <span className="sr-only">Calendar timezone: {timezone}.</span>
  </section>;
}

export function CalendarReports({ entries, today, initialDay, timezone, loading = false, error = "", onEditMood }: {
  entries: MoodEntry[]; today: string; initialDay?: string; timezone: string; loading?: boolean; error?: string; onEditMood(day: string): void;
}) {
  const [view, setView] = useState<ReportView>("month");
  const [selectedDay, setSelectedDay] = useState(initialDay && initialDay <= today && initialDay >= daysBefore(today, 3659) ? initialDay : today);
  const earliest = daysBefore(today, 3659);
  const range = reportRange(selectedDay, view);
  const { services, identity, refresh } = useApp();
  const grid = view === "month" ? monthGrid(selectedDay) : rangeDays(range);
  const rangeKey = `${grid[0]}:${grid[grid.length - 1]}`;
  const { data: calendar, loading: notesLoading, error: notesError } = useData(async () => ({
    key: rangeKey,
    items: await services.notes.calendar(identity!.id, grid[0], grid[grid.length - 1]),
  }), { key: "", items: [] as CalendarNoteSummary[] }, [rangeKey]);
  const currentNotes = calendar.key === rangeKey ? calendar.items : [];
  const records = useMemo(() => {
    const result = dailyRecords(entries, currentNotes.map(item => item.note));
    for (const item of currentNotes) result.get(item.note.day)!.noteCount = item.count;
    return result;
  }, [entries, calendar, rangeKey]);
  const reportLoading = loading || notesLoading || (!notesError && calendar.key !== rangeKey);
  const reportError = [error, notesError].filter(Boolean).join(" ");
  const summary = reportSummary(records, range);
  const previous = shiftReport(selectedDay, view, -1);
  const next = shiftReport(selectedDay, view, 1);
  const rangeTitle = view === "month" ? dayLabel(selectedDay, { month: "long", year: "numeric", day: undefined })
    : view === "week" ? `${dayLabel(range.start)} – ${dayLabel(range.end, { year: "numeric" })}`
    : dayLabel(selectedDay, { month: "long", year: "numeric" });
  const move = (day: string) => setSelectedDay(day > today ? today : day < earliest ? earliest : day);
  return <section className="card calendar-reports" aria-label="Your calendar and reports" aria-busy={reportLoading}>
    <div className="card-topline"><span className="eyebrow">YOUR CALENDAR & REPORTS</span><PrivateBadge /></div>
    <h2>Your days, in your own words.</h2>
    <p className="card-description">Check-ins and private notes, together. There’s no right way for your days to look.</p>
    <div className="report-view-control" role="group" aria-label="Report period">{views.map((option) => <button type="button" key={option.value} aria-pressed={view === option.value} className={view === option.value ? "active" : ""} onClick={() => setView(option.value)}>{option.label}</button>)}</div>
    <div className="report-navigation"><h3 aria-live="polite">{rangeTitle}</h3><div><button type="button" className="icon-button" aria-label={`Previous ${view}`} disabled={reportRange(previous, view).end < earliest} onClick={() => move(previous)}><ChevronLeft size={17} /></button><button type="button" className="report-today" onClick={() => setSelectedDay(today)}>Today</button><button type="button" className="icon-button" aria-label={`Next ${view}`} disabled={reportRange(next, view).start > today} onClick={() => move(next)}><ChevronRight size={17} /></button></div></div>
    <p className="report-timezone">{timezone} · {view === "week" ? "Monday–Sunday" : view === "month" ? "Select a day to read its notes" : "A closer look at this day"}</p>
    {reportLoading && <p className="report-load-state" role="status">Loading your saved entries…</p>}
    {reportError && <p className="report-load-error" role="alert">{reportError} Some entries may be missing from this report.</p>}
    {reportError && <button type="button" className="inline-link" onClick={refresh}>Retry loading calendar</button>}
    {!reportLoading && !reportError && <><div className="report-summary" aria-label={`${view} report summary`}>
      <div><strong>{summary.checkIns}</strong><span>{summary.checkIns === 1 ? "check-in" : "check-ins"}</span></div><div><strong>{summary.notes}</strong><span>{summary.notes === 1 ? "private note" : "private notes"}</span></div><div><strong>{summary.writingDays}</strong><span>{summary.writingDays === 1 ? "day with notes" : "days with notes"}</span></div>
    </div>
    {view === "month" && <MonthReport days={monthGrid(selectedDay)} records={records} selectedDay={selectedDay} today={today} earliest={earliest} onSelect={setSelectedDay} />}
    {view === "week" && <WeekReport days={rangeDays(range)} records={records} selectedDay={selectedDay} today={today} earliest={earliest} onSelect={setSelectedDay} />}
    <div className="report-mood-key" aria-label="Recorded moods in this report">{MOODS.map((mood, index) => <span key={mood.value}><i style={{ background: mood.color }} />{mood.label}{summary.distribution[index] > 0 && <strong>{summary.distribution[index]}</strong>}</span>)}</div>
    <DailyReport key={`${selectedDay}:${records.get(selectedDay)?.latestNote?.updatedAt || ""}`} day={selectedDay} record={records.get(selectedDay)} timezone={timezone} onEditMood={onEditMood} onDailyView={view !== "day" ? () => setView("day") : undefined} /></>}
    <div className="report-footnote"><p>Each date shows its most recently saved note. Earlier notes stay in My Notes. Blank days are simply blank.</p></div>
  </section>;
}
