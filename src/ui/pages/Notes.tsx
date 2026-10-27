import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Check,
  FileText,
  NotebookPen,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { dayLabel, daysBefore, localDay, type Note } from "../../domain/models";
import { isCalendarDay } from "../../domain/calendar";
import { WriteAttempt } from "../../domain/privateWrites";
import "./notes-calendar.css";
import { useApp, useData, useDraftGuard, useRetainedState } from "../context";
import type { NotePage } from "../../domain/ports";
import { Pagination } from "../components/Pagination";
import {
  Button,
  EmptyState,
  ErrorLine,
  PageIntro,
  PrivateBadge,
} from "../components/Primitives";

export function Notes({ onSettings }: { onSettings(): void }) {
  const { services, identity, profile, policy, act, refresh } = useApp();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageKey = `${search}:${page}`;
  useEffect(() => { const timer = window.setTimeout(() => setSearch(query), 300); return () => window.clearTimeout(timer); }, [query]);
  const { data: result, error, loading: fetching } = useData(async () => ({
    key: pageKey, value: await services.notes.page(identity!.id, page, search),
  }), { key: "", value: { items: [], total: 0, page: 1, pageSize: 6 } as NotePage }, [pageKey]);
  const loading = fetching || query !== search || (!error && result.key !== pageKey);
  const notes = result.key === pageKey ? result.value.items : [];
  const total = result.key === pageKey ? result.value.total : 0;
  const notePage = {
    page: result.key === pageKey ? result.value.page : page,
    pageCount: Math.max(1, Math.ceil(total / 6)), total,
    from: total ? (result.value.page - 1) * 6 + 1 : 0,
    to: total ? (result.value.page - 1) * 6 + notes.length : 0,
    setPage,
  };
  const [dirty, setDirty] = useRetainedState("notes.dirty", false);
  const [selectedId, setSelectedId] = useRetainedState<string | null>("notes.id", null);
  const [title, setTitle] = useRetainedState("notes.title", "");
  const [body, setBody] = useRetainedState("notes.body", "");
  const [busy, setBusy] = useRetainedState("notes.busy", false);
  const [loadId, setLoadId] = useRetainedState("notes.loadId", "");
  const [operation, setOperation] = useRetainedState<"" | "load" | "save" | "delete">("notes.operation", "");
  useDraftGuard(dirty || busy, "notes.editor");
  const [savedAt, setSavedAt] = useRetainedState<string | null>("notes.savedAt", null);
  const [saveError, setSaveError] = useRetainedState(`notes.error`, "");
  const [retainedAttempt, setRetainedAttempt] = useRetainedState("notes.attempt", () => new WriteAttempt());
  const attempt = useRef(retainedAttempt);
  attempt.current = retainedAttempt;
  const profileTimezone = profile?.timezone || "Asia/Manila";
  const [noteTimezone, setNoteTimezone] = useRetainedState("notes.noteTimezone", profileTimezone);
  const today = localDay(new Date(), noteTimezone);
  const [day, setDay] = useRetainedState("notes.day", today);
  const [linkError, setLinkError] = useState("");
  const handledRequest = useRef("");
  const noteList = useRef<HTMLDivElement>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const requestedNote = params.get("note") || "";
  const requestedDay = params.get("day") || "";
  const requestKey = JSON.stringify([requestedNote, requestedDay]);

  function fill(note?: Note, date = localDay(new Date(), profileTimezone)) {
    setSelectedId(note?.id || null);
    setTitle(note?.title || "");
    setBody(note?.body || "");
    setSavedAt(note?.updatedAt || null);
    attempt.current = new WriteAttempt(note?.updatedAt ?? null, note?.id);
    setRetainedAttempt(attempt.current);
    setSaveError("");
    setDay(note?.day || date);
    setNoteTimezone(note?.timezone || profileTimezone);
    setDirty(false);
  }
  async function openNote(id: string) {
    if (busy) return;
    setLoadId(id); setOperation("load"); setBusy(true); setSaveError("");
    const full = await act(() => services.notes.get(identity!.id, id), undefined, setSaveError, false);
    if (full) { fill(full); updateLocation(full.id); }
    setBusy(false);
  }
  function updateLocation(noteId?: string) {
    handledRequest.current = JSON.stringify([noteId || "", ""]);
    if (mounted.current) setParams(noteId ? { note: noteId } : {}, { replace: true });
    setLinkError("");
  }
  useEffect(() => {
    if (loading || error || handledRequest.current === requestKey) return;
    handledRequest.current = requestKey;
    if (dirty && ((requestedNote && requestedNote !== selectedId) || requestedDay)) {
      setLinkError("Your unsaved note is still open. Save it first, or choose a note/New note to explicitly discard it before opening a different calendar entry."); return;
    }
    if (requestedNote && requestedNote === selectedId) return;
    if (requestedNote) {
      void openNote(requestedNote);
    } else if (requestedDay) {
      const currentDay = localDay(new Date(), profileTimezone);
      if (isCalendarDay(requestedDay) && requestedDay <= currentDay && requestedDay >= daysBefore(currentDay, 3659)) fill(undefined, requestedDay);
      else setLinkError("Choose a note date within the last ten years, up to today.");
    }
  }, [requestKey, loading, error, notes, profileTimezone]);
  useEffect(() => {
    const listener = (event: BeforeUnloadEvent) => {
      if (dirty) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", listener);
    return () => window.removeEventListener("beforeunload", listener);
  }, [dirty]);

  const select = (note?: Note) => {
    if (busy || loading) return;
    if (
      dirty &&
      !window.confirm(
        "Leave this unsaved note? Your changes have not been saved.",
      )
    )
      return;
    if (note) { void openNote(note.id); return; }
    fill();
    updateLocation();
    if (!note) notePage.setPage(1);
  };
  const filtered = notes;
  useEffect(() => {
    if (noteList.current) noteList.current.scrollLeft = 0;
  }, [notePage.page, query]);

  return (
    <>
      <PageIntro
        eyebrow="YOUR WORDS, JUST FOR YOU"
        title="A little room for your thoughts."
        action={
          <Button disabled={busy || loading} onClick={() => select()}>
            <Plus size={17} /> New note
          </Button>
        }
      >
        You don’t have to make sense of it all to write it down.
      </PageIntro>
      {!profile?.healthConsent && <p className="inline-notice">Private writing is off. You can still read or remove saved entries. <button className="inline-link" onClick={onSettings}>Choose in Settings</button></p>}
      {!policy?.privateCollectionOpen && <p className="inline-notice" role="status">Saving new notes is temporarily unavailable. You can still read, export or remove existing entries. Drafts stay in this tab.</p>}
      <ErrorLine>{error}</ErrorLine>
      {error && <Button tone="secondary" onClick={refresh} disabled={loading}>Retry loading notes</Button>}
      {linkError && <p className="note-link-error" role="alert">{linkError}</p>}
      <p className="small-copy">Your draft stays in this tab as you move between pages. Save it before closing or refreshing.</p>
      <Link className="note-calendar-back" to={`/dashboard?day=${isCalendarDay(day) ? day : today}`}>Back to your calendar <ArrowRight size={14} /></Link>
      {!profile?.healthConsent && !total && !loading && !error && !selectedId ? (
        <section className="card">
          <EmptyState
            icon={<NotebookPen size={32} />}
            title="Your words can wait for you."
            action={
              <Button onClick={onSettings}>
                Enable private tools <ArrowRight size={16} />
              </Button>
            }
          >
            Choose whether to keep private notes and mood entries in Settings.
            You can still explore resources and Get Help.
          </EmptyState>
        </section>
      ) : (
        <div className="notes-workspace">
          <aside className="notes-sidebar">
            <div className="notes-list-heading">
              <h2>
                My Notes <span>{loading ? "…" : total}</span>
              </h2>
              <PrivateBadge>Private</PrivateBadge>
            </div>
            <label className="search-field">
              <Search size={16} />
              <input
                aria-label="Search your private notes"
                maxLength={200}
                placeholder="Find a little thought…"
                value={query}
                onChange={(event) => { setPage(1); setQuery(event.target.value); }}
              />
            </label>
            <div className="notes-list" ref={noteList} id="notes-list" aria-busy={loading}>
              {filtered.length ? (
                notes.map((note) => (
                  <button
                    key={note.id}
                    className={`note-list-item ${selectedId === note.id ? "active" : ""}`}
                    disabled={busy || loading}
                    onClick={() => select(note)}
                  >
                    <span className="note-list-date">
                      {dayLabel(note.day, { year: "numeric" })}
                    </span>
                    <strong>{note.title}</strong>
                    <span>{note.body.slice(0, 90)}</span>
                  </button>
                ))
              ) : (
                <div className="note-list-empty">
                  <FileText size={25} />
                  <h3>{loading ? "Loading your notes…" : error ? "Notes could not load." : query ? "No matching notes." : "A fresh page."}</h3>
                  <p>
                    {error ? "Reconnect and retry. Your saved notes have not been removed." : loading ? "Please wait before choosing an entry." : query
                      ? "Try another word."
                      : "Your notes will find a home here."}
                  </p>
                </div>
              )}
            </div>
            <Pagination {...notePage} label="Notes" controls="notes-list" compact disabled={busy || loading} onChange={notePage.setPage} />
            {selectedId && <p className="note-browsing-hint">Your note stays open while you browse other pages. Save it before closing or refreshing this tab.</p>}
            <p className="notes-private-copy">
              Your notes aren’t shared with the community or monitored for
              emergency response.
            </p>
          </aside>
          <section className="note-editor">
            <div className="editor-toolbar">
              <span role="status" aria-live="polite" className={`save-state ${dirty ? "unsaved" : ""}`}>
                {busy ? (operation === "load" ? "Loading note…" : operation === "delete" ? "Deleting note…" : "Saving changes…") : saveError ? (operation === "load" ? "Note could not load" : operation === "delete" ? "Deletion not confirmed" : "Save not confirmed") : dirty ? (
                  "Unsaved changes"
                ) : savedAt ? (
                  <>
                    <Check size={13} /> Saved in your space
                  </>
                ) : (
                  "A blank page, a fresh start"
                )}
              </span>
              <div>
                {selectedId && (
                  <button
                    className="icon-button"
                    aria-label="Delete selected note"
                    disabled={busy || loading}
                    onClick={async () => {
                      if (
                        !window.confirm(
                          "Delete this private note? This cannot be undone.",
                        )
                      )
                        return;
                      setOperation("delete"); setBusy(true);
                      setSaveError("");
                      const removed = await act(async () => {
                        await services.notes.remove(identity!.id, selectedId, { id: selectedId, updatedAt: savedAt! });
                        return true;
                      }, "Your note was removed.", setSaveError);
                      if (removed) { fill(); updateLocation(); }
                      setBusy(false);
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <Button
                  disabled={!profile?.healthConsent || !policy?.privateCollectionOpen || !body.trim() || busy || loading || Boolean(error) || !dirty || !day}
                  onClick={async () => {
                    setOperation("save"); setBusy(true);
                    setSaveError("");
                    const saved = await act(
                      () =>
                        services.notes.save(identity!.id, {
                          id: selectedId || undefined,
                          title,
                          body,
                          day,
                          timezone: noteTimezone,
                        }, attempt.current.forContent([title.trim(), body.trim(), day, noteTimezone])),
                      "Your note is saved.",
                      setSaveError,
                    );
                    setBusy(false);
                    if (saved) {
                      fill(saved);
                      updateLocation(saved.id);
                    }
                  }}
                >
                  {busy ? (operation === "load" ? "Loading…" : operation === "delete" ? "Deleting…" : "Saving…") : saveError && operation === "save" ? "Retry save" : "Save note"}
                  <Check size={15} />
                </Button>
              </div>
            </div>
            {saveError && <div className="private-save-feedback"><ErrorLine>{saveError}</ErrorLine>{operation === "load" ? <Button tone="secondary" disabled={busy || loading} onClick={() => void openNote(loadId)}>Retry loading note</Button> : <><p className="small-copy">Your draft stays in this tab. It is not stored offline. Keep the tab open until you see “Saved in your space”.</p>{selectedId && <Button tone="secondary" disabled={busy || loading} onClick={async () => {
              if (!window.confirm("Reload the saved version? This discards the draft currently shown in this editor.")) return;
              setLoadId(selectedId!); setOperation("load"); setBusy(true);
              const latest = await act(() => services.notes.get(identity!.id, attempt.current.id, true), undefined, setSaveError, false);
              setBusy(false);
              if (latest) { fill(latest); updateLocation(latest.id); refresh(); }
            }}>Reload saved version</Button>}</>}</div>}
            <div className="note-date-field">
              <label htmlFor="note-day">Calendar date</label>
              <input id="note-day" type="date" required value={day} min={daysBefore(today, 3659)} max={today} disabled={busy || loading} onChange={(event) => { setDay(event.target.value); setDirty(true); }} />
              <span>{noteTimezone} · shown on this day in your calendar</span>
            </div>
            <label className="field-label note-input-label" htmlFor="note-title">
              Title — optional
            </label>
            <input
              id="note-title"
              className="note-title-input"
              placeholder="Give this moment a name…"
              maxLength={120}
              value={title}
              disabled={busy || loading}
              onChange={(event) => {
                setTitle(event.target.value);
                setDirty(true);
              }}
            />
            <label className="field-label note-input-label" htmlFor="note-body">
              Your note
            </label>
            <textarea
              id="note-body"
              aria-describedby="note-length-limit"
              className="note-body-input"
              placeholder={
                "What’s taking up space in your mind today?\n\nYou can start anywhere. No perfect words needed."
              }
              maxLength={20000}
              value={body}
              disabled={busy || loading}
              onChange={(event) => {
                setBody(event.target.value);
                setDirty(true);
              }}
            />
            <div className="editor-footer">
              <PrivateBadge>Private to your account</PrivateBadge>
              <span>
                {body.trim() ? body.trim().split(/\s+/).length : 0} words
              </span>
            </div>
            <p id="note-length-limit" className={`note-length-limit ${body.length >= 18000 ? "near-limit" : ""}`}>{body.length.toLocaleString()} / 20,000 characters{body.length >= 20000 ? " · Character limit reached" : body.length >= 18000 ? ` · ${(20000 - body.length).toLocaleString()} remaining` : ""}</p>
            {!body && (
              <button
                className="writing-prompt"
                disabled={busy || loading}
                onClick={() => {
                  setBody("One thing I want to make room for today is…\n\n");
                  setDirty(true);
                  document.getElementById("note-body")?.focus();
                }}
              >
                <span>NEED A SMALL BEGINNING?</span>
                <p>“One thing I want to make room for today is…”</p>
                <ArrowRight size={17} />
              </button>
            )}
          </section>
        </div>
      )}
    </>
  );
}
