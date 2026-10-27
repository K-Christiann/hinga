import { useId, useState } from "react";
import { BookOpen, RefreshCw } from "lucide-react";
import type { EncouragingThought } from "../../domain/encouragement";
import { useApp, useDisplayPreference } from "../context";
import "./thought-to-keep.css";

export function ThoughtCard({ thought, onAnother, verseVisible, onVerseVisibility }: {
  thought: EncouragingThought;
  onAnother(): void;
  verseVisible: boolean;
  onVerseVisibility(value: boolean): void;
}) {
  const titleId = useId();
  return (
    <section className="thought-card rotating-thought-card" aria-labelledby={titleId}>
      <h2 className="eyebrow" id={titleId}>A THOUGHT TO KEEP</h2>
      <span className="quote-mark" aria-hidden="true">“</span>
      <div className="thought-content" aria-live="polite" aria-atomic="true">
        <p className="thought-message">{thought.message}</p>
        {verseVisible && <figure className="thought-scripture">
          <div className="thought-verse-label"><BookOpen size={14} aria-hidden="true" /> A moment in Scripture</div>
          <blockquote><p>“{thought.verse.text}”</p></blockquote>
          <figcaption>
            <a href={thought.verse.source} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" aria-label={`Read ${thought.verse.reference} in context (opens a new tab)`}>
              {thought.verse.reference}{thought.verse.excerpt && " (excerpt)"}
            </a>
            <span>World English Bible</span>
          </figcaption>
        </figure>}
      </div>
      <div className="thought-actions">
        <button type="button" className="thought-next" onClick={onAnother}>
          <RefreshCw size={14} aria-hidden="true" /> Another thought
        </button>
        <label className="thought-verse-choice">
          <input type="checkbox" checked={verseVisible} onChange={event => onVerseVisibility(event.target.checked)} />
          Include Bible verse (remembered on this browser)
        </label>
      </div>
    </section>
  );
}

export function ThoughtToKeep() {
  const { services } = useApp();
  // Service caches current(): Strict Mode, saving and route changes do not
  // advance the rotation. A fresh page creates a service and picks the next ID.
  const [thought, setThought] = useState(() => services.thoughts.current());
  const [verseVisible, setVerseVisible] = useDisplayPreference("showBibleVerses");
  return <ThoughtCard thought={thought} verseVisible={verseVisible} onVerseVisibility={setVerseVisible}
    onAnother={() => { const next = services.thoughts.next(); setThought(next); }} />;
}
