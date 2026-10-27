import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, Check, Sprout, Trash2 } from "lucide-react";
import { MOODS, type MoodEntry, type MoodValue } from "../../domain/models";
import { useApp, useDraftGuard, useRetainedState } from "../context";
import { Button } from "./Primitives";
import { MoodFace } from "./MoodFace";
import { ErrorLine } from "./Primitives";
import { WriteAttempt } from "../../domain/privateWrites";

export function MoodForm({
  day,
  existing,
  loading: historyLoading = false,
  onDone,
  onSettings,
  onStateChange,
}: {
  day: string;
  existing?: MoodEntry;
  loading?: boolean;
  onDone?(): void;
  onSettings(): void;
  onStateChange?(state: { dirty: boolean; busy: boolean }): void;
}) {
  const { services, identity, profile, policy, act, refresh } = useApp();
  const [value, setValue] = useRetainedState<MoodValue | null>(`mood.${day}.value`, existing?.value || null);
  const [note, setNote] = useRetainedState(`mood.${day}.note`, existing?.note || "");
  const [detailUnavailable, setDetailUnavailable] = useState(false);
  const [detailRetry, setDetailRetry] = useState(0);
  const [detailLoading, setDetailLoading] = useState(false);
  const loading = historyLoading || detailLoading;
  const [busy, setBusy] = useRetainedState(`mood.${day}.busy`, false);
  const [changed, setChanged] = useRetainedState(`mood.${day}.changed`, false);
  const [saveError, setSaveError] = useRetainedState(`mood.${day}.error`, "");
  const [saved, setSaved] = useRetainedState(`mood.${day}.saved`, existing);
  const [retainedAttempt, setRetainedAttempt] = useRetainedState(`mood.${day}.attempt`, () => new WriteAttempt(existing?.updatedAt ?? null, existing?.id));
  const attempt = useRef(retainedAttempt);
  attempt.current = retainedAttempt;
  const activeDay = useRef(day);
  useDraftGuard(changed || busy, `mood.${day}.editor`);
  useEffect(() => { onStateChange?.({ dirty: changed, busy }); }, [changed, busy, onStateChange]);
  function fill(entry?: MoodEntry) {
    setValue(entry?.value ?? null); setNote(entry?.note ?? ""); setSaved(entry);
    setChanged(false); setSaveError("");
    attempt.current = new WriteAttempt(entry?.updatedAt ?? null, entry?.id);
    setRetainedAttempt(attempt.current);
  }
  const noteId = useId();
  useEffect(() => {
    let active = true;
    if (changed || busy) return;
    activeDay.current = day;
    if (!existing?.summary) { fill(existing); return; }
    setDetailLoading(true); setDetailUnavailable(false);
    services.moods.get(identity!.id, day, detailRetry > 0).then(entry => { if (active) fill(entry ?? undefined); }).catch(() => { if (active) { setDetailUnavailable(true); setSaveError("The complete check-in could not load. Reconnect and reload its saved version before editing."); } }).finally(() => { if (active) setDetailLoading(false); });
    return () => { active = false; };
  }, [day, existing?.id, existing?.updatedAt, detailRetry]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (changed) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [changed]);
  if (detailUnavailable) return <div><ErrorLine>{saveError}</ErrorLine><Button tone="secondary" onClick={() => setDetailRetry(value => value + 1)}>Retry loading complete check-in</Button></div>;
  if (!profile?.healthConsent && !existing && !saved)
    return (
      <div className="consent-empty">
        <Sprout size={30} />
        <h3>Your space, your choice.</h3>
        <p>
          Enable private tools when you’re ready to keep your mood check-ins and
          notes.
        </p>
        <Button tone="secondary" onClick={onSettings}>
          Choose in Settings <ArrowRight size={15} />
        </Button>
      </div>
    );
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (!value || !identity || !profile?.healthConsent || !policy?.privateCollectionOpen || loading || busy) return;
        setBusy(true);
        setSaveError("");
        const result = await act(
          () =>
            services.moods.save(
              identity.id,
              day,
              value,
              note,
              profile.timezone,
              attempt.current.forContent([day, value, note.trim(), profile.timezone]),
            ),
          "Your check-in is saved in your space.",
          setSaveError,
        );
        setBusy(false);
        if (result) { fill(result); onDone?.(); }
      }}
    >
      {!policy?.privateCollectionOpen && <p className="inline-notice" role="status">Saving check-ins is temporarily unavailable. Your draft stays in this tab.</p>}
      <div
        className="mood-options"
        role="group"
        aria-label="Choose how you feel"
      >
        {MOODS.map((mood) => (
          <button
            key={mood.value}
            type="button"
            className={`mood-option mood-${mood.value} ${value === mood.value ? "selected" : ""}`}
            aria-pressed={value === mood.value}
            disabled={busy || loading}
            onClick={() => { setValue(mood.value); setChanged(true); }}
          >
            <span className="mood-face-wrap">
              <MoodFace value={mood.value} />
              {value === mood.value && (
                <span className="mood-tick">
                  <Check size={10} />
                </span>
              )}
            </span>
            <span>{mood.label}</span>
          </button>
        ))}
      </div>
      <label className="sr-only" htmlFor={noteId}>
        Add a private note, optional
      </label>
      <input
        id={noteId}
        className="mood-note-input"
        placeholder="A few words about today? Only if you want to."
        maxLength={1000}
        value={note}
        disabled={busy || loading}
        onChange={(event) => { setNote(event.target.value); setChanged(true); }}
      />
      <p className="private-save-status small-copy" role="status" aria-live="polite">{busy ? "Saving changes…" : saveError ? "Changes not confirmed. Your draft is still here." : changed ? "Unsaved changes" : saved ? "Saved in your space" : "Choose a mood to begin."}</p>
      {saveError && <div className="private-save-feedback"><ErrorLine>{saveError}</ErrorLine><p className="small-copy">Keep this tab open while you reconnect and retry.</p><Button type="button" tone="secondary" disabled={busy || loading} onClick={async () => {
        if (!window.confirm("Reload the saved check-in? This discards your current mood draft.")) return;
        setBusy(true);
        const entry = await act(() => services.moods.get(identity!.id, day, true), undefined, setSaveError, false);
        setBusy(false);
        if (entry !== undefined) { fill(entry ?? undefined); refresh(); }
      }}>Reload saved version</Button></div>}
      <div className="checkin-footer">
        <span>No right or wrong answers.</span>
        <Button type="submit" disabled={!profile?.healthConsent || !policy?.privateCollectionOpen || !value || busy || loading || !changed}>
          {busy ? "Saving…" : saveError ? "Retry save" : saved ? "Update check-in" : "Save check-in"}
          <ArrowRight size={15} />
        </Button>
      </div>
      {saved && (
        <button
          type="button"
          className="delete-text"
          disabled={busy || loading}
          onClick={async () => {
            setBusy(true);
            setSaveError("");
            const removed = await act(
              async () => {
                await services.moods.remove(identity!.id, day, saved);
                return true;
              },
              "Check-in removed.",
              setSaveError,
            );
            setBusy(false);
            if (removed) { fill(); onDone?.(); }
          }}
        >
          <Trash2 size={13} /> Remove this check-in
        </button>
      )}
    </form>
  );
}

