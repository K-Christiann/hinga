import { useState } from "react";
import { ArrowRight, ArrowUpRight, LockKeyhole } from "lucide-react";
const tools = [
  { id: "mood", number: "01", title: "Name the day.", description: "Give today a word and notice your days over time.", heading: "There’s room for all of it.", detail: "Save a mood check-in in your personal space. Your calendar brings daily, weekly and monthly reflections together, at your pace.", privacy: "Your check-ins stay in your personal space." },
  { id: "note", number: "02", title: "Leave it on paper.", description: "For the things you want to put somewhere, without putting them out into the world.", heading: "A page that doesn’t need an audience.", detail: "Write a private note when you’re ready. Return to your words by date, or find the latest note alongside your check-ins in the calendar.", privacy: "Your notes aren’t community posts." },
  { id: "thought", number: "03", title: "Find a little company.", description: "Read quietly or choose to share. Your private notes never become posts on their own.", heading: "You can read. You can share.", detail: "Shared thoughts use discussion aliases and wait for moderator approval. Sharing is optional, and discussions are not a live crisis response channel.", privacy: "Shared thoughts are visible to members after approval." },
] as const;
export function SpaceFeatures({ onLogin }: { onLogin(): void }) {
  const [active, setActive] = useState<(typeof tools)[number]["id"]>("mood");
  const selected = tools.find(tool => tool.id === active)!;
  return <div className="lp-space-features">
    <div className="lp-tool-selector" role="group" aria-label="Explore Hinga tools">
      {tools.map(tool => <button key={tool.id} aria-pressed={active === tool.id} aria-controls="lp-tool-details" className={active === tool.id ? "is-active" : ""} onClick={() => setActive(tool.id)}>
        <span className="lp-tool-number">{tool.number}</span><span><strong>{tool.title}</strong><span className="lp-tool-description">{tool.description}</span></span><ArrowUpRight size={23} />
      </button>)}
    </div>
    <div className="lp-feature-panel" id="lp-tool-details" aria-live="polite">
      <div className="lp-feature-top"><span>YOUR SPACE / {selected.number}</span></div>
      <div className="lp-feature-heading"><span className="lp-paper-label">AT YOUR PACE</span><h3>{selected.heading}</h3></div>
      <p className="lp-feature-response">{selected.detail}</p>
      <div className="lp-feature-bottom"><span><LockKeyhole size={13} />{selected.privacy}</span><button onClick={onLogin}>Continue with Google <ArrowRight size={16} /></button></div>
    </div>
  </div>;
}
