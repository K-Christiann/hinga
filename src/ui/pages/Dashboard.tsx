import { useEffect, useState } from "react";
import { ArrowRight, HeartHandshake, NotebookPen, Pause, Play, RotateCcw } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { dayLabel, localDay, type MoodEntry } from "../../domain/models";
import { isCalendarDay } from "../../domain/calendar";
import { useApp, useData } from "../context";
import { Button, ErrorLine, FlowerMark, Modal, PageIntro, PrivateBadge } from "../components/Primitives";
import { MoodForm } from "../components/MoodForm";
import { CalendarReports } from "../components/CalendarReports";
import { ThoughtToKeep } from "../components/ThoughtToKeep";

function QuietPause() {
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(30);
  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(
      () => setSeconds((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => window.clearInterval(interval);
  }, [running]);
  useEffect(() => {
    if (seconds === 0) setRunning(false);
  }, [seconds]);
  return (
    <section className="pause-card">
      <span className="eyebrow">A SMALL MOMENT</span>
      <div className={`pause-orbit ${running ? "breathing" : ""}`}>
        <div>
          <FlowerMark size={49} />
        </div>
      </div>
      <h2>A little pause.</h2>
      <p>
        {seconds === 0
          ? "Take the next moment at your own pace."
          : "Let your shoulders soften. Notice where you are. There’s no need to rush."}
      </p>
      <Button
        tone="secondary"
        onClick={() => {
          if (seconds === 0) setSeconds(30);
          setRunning(!running);
        }}
      >
        {running ? (
          <Pause size={15} />
        ) : seconds === 0 ? (
          <RotateCcw size={15} />
        ) : (
          <Play size={15} />
        )}{" "}
        {running
          ? "Pause"
          : seconds === 0
            ? "Another moment"
            : seconds < 30
              ? "Continue"
              : "Take 30 seconds"}{" "}
        {seconds < 30 && seconds > 0 && (
          <span className="timer-count" aria-hidden="true">
            {seconds}s
          </span>
        )}
      </Button>
      <span className="small-copy">Optional. Pause whenever you like.</span>
    </section>
  );
}

export function Dashboard({ onSettings }: { onSettings(): void }) {
  const { services, identity, profile, act } = useApp();
  const [params] = useSearchParams();
  const { data: entries, error, loading: moodsLoading } = useData(
    () => services.moods.list(identity!.id),
    [] as MoodEntry[],
  );
  const today = localDay(new Date(), profile?.timezone);
  const requestedDay = params.get("day") || "";
  const [editDay, setEditDay] = useState<string | null>(null);
  const [editState, setEditState] = useState({ dirty: false, busy: false });
  return (
    <>
      <PageIntro
        eyebrow={`A LITTLE CHECK-IN, ${profile?.alias.toUpperCase() || "JUST FOR YOU"}`}
        title="How are you, really?"
      >
        Whatever today feels like, you can start from here.
      </PageIntro>
      <div className="dashboard-grid">
        <div className="dashboard-main">
          <section className="card checkin-card">
            <div className="card-topline">
              <span className="eyebrow">TODAY’S CHECK-IN</span>
              <PrivateBadge />
            </div>
            <h2>Let’s make room for how you feel.</h2>
            <p className="card-description">
              A word, a feeling, a small beginning.
            </p>
            <MoodForm
              day={today}
              loading={moodsLoading}
              existing={entries.find((entry) => entry.day === today)}
              onSettings={onSettings}
            />
          </section>
          <ErrorLine>{error}</ErrorLine>
          <CalendarReports
            entries={entries}
            today={today}
            initialDay={isCalendarDay(requestedDay) ? requestedDay : undefined}
            timezone={profile?.timezone || "Asia/Manila"}
            loading={moodsLoading}
            error={error}
            onEditMood={setEditDay}
          />
          <section className="dashboard-bottom">
            <div className="small-resource">
              <NotebookPen size={23} />
              <div>
                <h3>Something on your mind?</h3>
                <p>A little note can be a place to start.</p>
              </div>
              <Link
                className="round-link"
                to="/notes"
                aria-label="Open My Notes"
              >
                <ArrowRight size={18} />
              </Link>
            </div>
          </section>
        </div>
        <aside className="dashboard-aside">
          <QuietPause />
          <ThoughtToKeep />
          <section className="help-mini">
            <HeartHandshake size={21} />
            <h3>It’s okay to reach out.</h3>
            <p>Support is available, even when finding the words feels hard.</p>
            <Link to="/help" className="text-link">
              Find support <ArrowRight size={15} />
            </Link>
          </section>
        </aside>
      </div>
      <div className="gentle-footer">
        <FlowerMark size={17} />
        <span>One day doesn’t tell your whole story.</span>
      </div>
      <Modal
        open={Boolean(editDay)}
        onClose={() => {
          if (editState.busy) return;
          if (!editState.dirty || window.confirm("Leave this unsaved check-in? Your changes have not been saved.")) setEditDay(null);
        }}
        title={
          editDay ? `A check-in for ${dayLabel(editDay)}.` : "Your check-in"
        }
        eyebrow="PRIVATE MOOD ENTRY"
      >
        <p className="modal-lead">
          This is a record of how you felt, not a measure of how you’re doing.
        </p>
        {editDay && (
          <MoodForm
            key={editDay}
            day={editDay}
            loading={moodsLoading}
            existing={entries.find((entry) => entry.day === editDay)}
            onDone={() => setEditDay(null)}
            onStateChange={setEditState}
            onSettings={onSettings}
          />
        )}
      </Modal>
    </>
  );
}
