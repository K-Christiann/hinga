import { useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Clock3, FileText, Flag, History, LockKeyhole, MessageCircle, RefreshCw, RotateCcw, ShieldCheck, X } from "lucide-react";
import { Link } from "react-router-dom";
import type { AuthenticatorFactor, AuthenticatorSetup, ReviewKind, ReviewRecord, ReviewSubmission } from "../../domain/moderation";
import { useApp } from "../context";
import { useCursorCollection, usePagination } from "../hooks/pagination";
import { useStaffAccess } from "../moderation/StaffAccess";
import { Button, EmptyState, ErrorLine, PageIntro } from "../components/Primitives";
import "./review-desk.css";
import { OperationsStatus } from "../moderation/OperationsStatus";
import { CaseWorkspace } from "../moderation/CaseWorkspace";

const when = (value: string) => new Date(value).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });

function StaffAuthenticator() {
  const { services, identity } = useApp();
  const { reload } = useStaffAccess();
  const [factors, setFactors] = useState<AuthenticatorFactor[]>([]);
  const [setup, setSetup] = useState<AuthenticatorSetup | null>(null);
  const [selected, setSelected] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    services.moderation.factors(identity?.id ?? "").then((items) => {
      if (active) { setFactors(items); setSelected(items.find((item) => item.status === "verified")?.id || ""); }
    }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Your authenticators could not load."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [services, identity?.id, attempt]);
  const verified = factors.filter((factor) => factor.status === "verified");
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError("");
    try { await action(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Please try again."); }
    finally { setBusy(false); }
  }
  return <section className="card staff-authenticator" aria-labelledby="staff-auth-heading">
    <span className="staff-lock"><LockKeyhole size={25} /></span>
    <p className="eyebrow">ONE MORE STEP FOR STAFF</p>
    <h2 id="staff-auth-heading">Protect this shared space.</h2>
    <p>Your Google account has staff access. Verify an authenticator code before opening submissions.</p>
    <ErrorLine>{error}</ErrorLine>
    {loading ? <p role="status">Checking your authenticator…</p> : verified.length ? <form onSubmit={(event) => {
      event.preventDefault(); void run(async () => { await services.moderation.verify(identity?.id ?? "", selected, code); setCode(""); reload(); });
    }}>
      <label className="field-label" htmlFor="staff-factor">Authenticator</label>
      <select className="input" id="staff-factor" value={selected} disabled={busy} onChange={(event) => setSelected(event.target.value)}>
        {verified.map((factor) => <option key={factor.id} value={factor.id}>{factor.name}</option>)}
      </select>
      <AuthenticatorCode code={code} setCode={setCode} disabled={busy} />
      <Button type="submit" disabled={busy || !/^\d{6}$/.test(code)}>{busy ? "Verifying…" : "Verify & open review desk"}</Button>
    </form> : setup ? <form onSubmit={(event) => {
      event.preventDefault(); void run(async () => { await services.moderation.verify(identity?.id ?? "", setup.id, code); setCode(""); setSetup(null); reload(); });
    }}>
      <p>Scan this code with your authenticator app, then enter its current six-digit code.</p>
      <img className="staff-qr" src={setup.qrCode.startsWith("data:image/") ? setup.qrCode : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(setup.qrCode)}`} alt="Scan to set up your Hinga staff authenticator" />
      <details className="staff-setup-key"><summary>Use a setup key instead</summary><code>{setup.secret}</code><p>Keep this key private. It gives access to your authenticator codes.</p></details>
      <AuthenticatorCode code={code} setCode={setCode} disabled={busy} />
      <Button type="submit" disabled={busy || !/^\d{6}$/.test(code)}>{busy ? "Verifying…" : "Finish setup & open review desk"}</Button>
      <Button tone="ghost" type="button" disabled={busy} onClick={() => { void run(async () => {
        await services.moderation.discardUnverified(identity?.id ?? "", setup.id); setSetup(null); setCode(""); setAttempt((value) => value + 1);
      }); }}>Cancel this setup</Button>
    </form> : <div className="staff-enroll">
      <p>Add an authenticator app to this staff account. Google sign-in remains your first step.</p>
      <Button disabled={busy || !!error} onClick={() => { void run(async () => setSetup(await services.moderation.enroll(identity?.id ?? ""))); }}>{busy ? "Starting setup…" : "Set up authenticator"}</Button>
      {factors.filter((factor) => factor.status === "unverified").map((factor) => <div className="staff-unfinished" key={factor.id}>
        <span>Unfinished setup: {factor.name}</span><Button tone="ghost" disabled={busy} onClick={() => { void run(async () => {
          await services.moderation.discardUnverified(identity?.id ?? "", factor.id); setAttempt((value) => value + 1);
        }); }}>Remove unfinished setup</Button>
      </div>)}
    </div>}
    {!loading && <button type="button" className="text-link" disabled={busy} onClick={() => setAttempt((value) => value + 1)}>Check authenticators again <RefreshCw size={14} /></button>}
  </section>;
}
function AuthenticatorCode({ code, setCode, disabled }: { code: string; setCode(value: string): void; disabled: boolean }) {
  return <div className="staff-code-field"><label className="field-label" htmlFor="staff-code">Six-digit authenticator code</label>
    <input id="staff-code" className="input" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6}
      value={code} disabled={disabled} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} required />
  </div>;
}

export function ReviewDecisionPanel({ item, busy, onDecision }: {
  item: ReviewSubmission; busy: boolean; onDecision(approved: boolean, reason: string, publicReason: string): void;
}) {
  const [reason, setReason] = useState("");
  const [publicReason, setPublicReason] = useState("");
  const unavailable = item.kind === "reply" && item.context && !item.context.available;
  return <section className="card review-detail" aria-labelledby="review-detail-title">
    <div className="review-detail-top"><span className="eyebrow">{item.kind === "post" ? "SHARED THOUGHT" : "SUPPORTIVE REPLY"}</span><span className="review-pending"><Clock3 size={13} /> Pending</span></div>
    <h2 id="review-detail-title" tabIndex={-1}>{item.alias}’s {item.kind === "post" ? "thought" : "reply"}</h2>
    <p className="review-date">Submitted {when(item.createdAt)} · {item.category}</p>
    {item.context && <details className="review-parent" open><summary>Original thought · {item.context.alias}</summary><p>{item.context.body}</p></details>}
    <div className="review-full-body">{item.body}</div>
    {item.isOwn ? <p className="inline-notice">This is your submission. A different reviewer must make the decision.</p> : <>
      {unavailable && <p className="inline-notice">This conversation is no longer available for this reply. You can remove the pending reply.</p>}
      <label className="field-label" htmlFor="review-public-reason">Explanation for the author <span>(required for removal)</span></label>
      <textarea id="review-public-reason" className="input" rows={3} maxLength={500} value={publicReason} disabled={busy}
        onChange={(event)=>setPublicReason(event.target.value)} placeholder="Explain with care which guideline applies and how they can share safely."/>
      <p className="review-note-hint">The author sees this explanation. Keep other members’ identities and internal notes private.</p>
      <label className="field-label" htmlFor="review-reason">Internal decision note <span>(required for removal)</span></label>
      <textarea id="review-reason" className="input" rows={3} maxLength={500} value={reason} disabled={busy}
        onChange={(event) => setReason(event.target.value)} placeholder="Give a brief reason that another reviewer can understand." />
      <p className="review-note-hint">Staff-only note · {reason.length}/500. Approval makes this submission visible to members.</p>
      <div className="review-decision-actions">
        <Button disabled={busy || !!unavailable} onClick={() => onDecision(true, reason, publicReason)}><Check size={17} />{busy ? "Saving decision…" : "Approve & publish"}</Button>
        <Button tone="danger" disabled={busy || !reason.trim() || !publicReason.trim()} onClick={() => onDecision(false, reason, publicReason)}><X size={17} />Remove</Button>
      </div>
    </>}
  </section>;
}

function ReviewPageControls({ page, pages, from, to, total, hasMore, loading, onNext, onPrevious }: {
  page: number; pages: number; from: number; to: number; total: number; hasMore: boolean; loading: boolean; onNext(): void; onPrevious(): void;
}) {
  return <nav className="review-pagination" aria-label="Review queue pagination"><span>{total ? `${from}–${to} of ${total} loaded` : "No submissions loaded"}</span>
    <div><Button tone="secondary" disabled={page === 1 || loading} onClick={onPrevious} aria-label="Previous review page"><ChevronLeft size={16} />Previous</Button>
      <span>Page {page}{!hasMore ? ` of ${pages}` : ""}</span>
      <Button tone="secondary" disabled={loading || (page >= pages && !hasMore)} onClick={onNext} aria-label="Next review page">{loading ? "Loading…" : "Next"}<ChevronRight size={16} /></Button></div>
  </nav>;
}

function ReviewWorkspace() {
  const { services, identity, act } = useApp();
  const [view, setView] = useState<"queue" | "history" | "report" | "appeal">("queue");
  const [kind, setKind] = useState<ReviewKind>("post");
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const queue = useCursorCollection<ReviewSubmission>((request) => services.moderation.queue(identity?.id ?? "", kind, request), [services, identity?.id, kind], view === "queue",6);
  const history = useCursorCollection<ReviewRecord>((request) => services.moderation.history(identity?.id ?? "", request), [services, identity?.id], view === "history",6);
  const queuePage = usePagination(queue.items, 6, kind);
  const historyPage = usePagination(history.items, 6);
  const page = view === "queue" ? queuePage : historyPage;
  const collection = view === "queue" ? queue : history;
  const selected = queuePage.items.find((item) => item.id === selectedId) || queuePage.items[0];
  async function decide(approved: boolean, reason: string, publicReason: string) {
    if (busy || !selected) return;
    setBusy(true);
    const saved = await act(async () => {
      await services.moderation.decide(identity?.id ?? "", { id: selected.id, kind: selected.kind, approved, reason, publicReason });
      return true;
    }, approved ? "Approved. This submission is now visible to members." : "Removed from the publication queue.");
    if (saved) setSelectedId("");
    setBusy(false);
  }
  function focusQueue() { heading.current?.focus(); }
  return <>
    <div className="review-guidance"><ShieldCheck size={20} /><p>Read with care. Review only shared submissions. Private notes and mood entries are outside this desk.</p></div>
    <div className="review-toolbar"><div className="review-tabs" role="group" aria-label="Review desk view">
      <button disabled={busy} className={view === "queue" ? "active" : ""} aria-pressed={view === "queue"} onClick={() => setView("queue")}><FileText size={17} />Pending submissions</button>
      <button disabled={busy} className={view === "report" ? "active" : ""} aria-pressed={view === "report"} onClick={() => setView("report")}><Flag size={17}/>Reports</button>
      <button disabled={busy} className={view === "appeal" ? "active" : ""} aria-pressed={view === "appeal"} onClick={() => setView("appeal")}><RotateCcw size={17}/>Appeals</button>
      <button disabled={busy} className={view === "history" ? "active" : ""} aria-pressed={view === "history"} onClick={() => setView("history")}><History size={17} />Decision history</button></div>
      {(view === "queue" || view === "history") && <Button tone="ghost" disabled={busy || collection.loading} onClick={() => { void collection.refresh(); }}><RefreshCw size={15} />Refresh</Button>}</div>
    {view === "report" || view === "appeal" ? <CaseWorkspace key={view} kind={view}/> : <>
    {view === "queue" && <div className="review-kind-tabs" role="group" aria-label="Submission type">
      <button disabled={busy} className={kind === "post" ? "active" : ""} aria-pressed={kind === "post"} onClick={() => { setKind("post"); setSelectedId(""); }}><FileText size={15} />Thoughts</button>
      <button disabled={busy} className={kind === "reply" ? "active" : ""} aria-pressed={kind === "reply"} onClick={() => { setKind("reply"); setSelectedId(""); }}><MessageCircle size={15} />Replies</button>
      <span>Latest submissions first</span></div>}
    <ErrorLine>{collection.error}</ErrorLine>
    {collection.error && <Button tone="secondary" disabled={collection.loading} onClick={() => { void collection.retry(); }}>Try loading again</Button>}
    <h2 className="review-list-heading" ref={heading} tabIndex={-1}>{view === "queue" ? "Awaiting a careful review" : "Recorded decisions"}</h2>
    {collection.loading && !collection.items.length ? <p role="status" className="card">Loading {view === "queue" ? "submissions" : "decisions"}…</p> : view === "queue" ? queuePage.items.length ? <div className="review-workspace">
      <ul className="review-submission-list" aria-label="Pending submissions">{queuePage.items.map((item) => <li key={item.id}>
        <button disabled={busy} className={`review-submission ${selected?.id === item.id ? "selected" : ""}`} aria-pressed={selected?.id === item.id} onClick={() => {
          setSelectedId(item.id); window.requestAnimationFrame(() => document.getElementById("review-detail-title")?.focus());
        }}><span className="review-item-meta"><strong>{item.alias}</strong><span>{item.isOwn ? "Your submission" : "Pending"}</span></span>
          <p>{item.body.length > 150 ? `${item.body.slice(0, 150)}…` : item.body}</p><small>{when(item.createdAt)}</small></button>
      </li>)}</ul>
      {selected && <ReviewDecisionPanel key={`${kind}:${selected.id}`} item={selected} busy={busy} onDecision={(approved, reason, publicReason) => { void decide(approved, reason, publicReason); }} />}
    </div> : <section className="card"><EmptyState icon={<Check size={29} />} title="A clear queue.">There are no pending {kind === "post" ? "thoughts" : "replies"} to show. Refresh to check for new submissions.</EmptyState></section>
      : historyPage.items.length ? <ul className="review-history" aria-label="Decision history">{historyPage.items.map((item) => <li className="card" key={item.id}>
        <div className="review-history-top"><span className={item.approved ? "review-approved" : "review-removed"}>{item.approved ? <Check size={15} /> : <X size={15} />}{item.approved ? "Approved" : "Removed"}</span><time dateTime={item.createdAt}>{when(item.createdAt)}</time></div>
        <h3>{item.kind === "post" ? "Shared thought" : "Supportive reply"}{item.source && item.source !== "review" ? ` · ${item.source}` : ""}</h3>
        {item.publicReason && <p><strong>Author explanation:</strong> {item.publicReason}</p>}
        <p><strong>Internal note:</strong> {item.reason || "No additional decision note."}</p><small>Reviewed by {item.reviewer}</small>
      </li>)}</ul> : <section className="card"><EmptyState icon={<History size={29} />} title="No decisions yet.">Approvals and removals will be recorded here.</EmptyState></section>}
    <ReviewPageControls page={page.page} pages={page.pageCount} from={page.from} to={page.to} total={page.total} hasMore={!!collection.nextCursor} loading={busy || collection.loading}
      onPrevious={() => { page.setPage(page.page - 1); focusQueue(); }} onNext={() => { void (async () => {
        if (page.page >= page.pageCount && collection.nextCursor && !(await collection.loadMore())) return;
        page.setPage(page.page + 1); focusQueue();
      })(); }} />
    <p className="review-footer-note">Approval publishes a submission. Removal keeps it out of the member feed. A different reviewer must decide your own submissions.</p>
    </>}
  </>;
}

export function ReviewDesk() {
  const { access, loading, error, reload } = useStaffAccess();
  return <div className="review-desk"><PageIntro eyebrow="STAFF SPACE" title="Review with care.">A quieter place to read, decide, and keep this shared space thoughtful.</PageIntro>
    {loading ? <p className="card" role="status">Checking staff access…</p> : error ? <section className="card"><h2>Staff access needs attention.</h2><ErrorLine>{error}</ErrorLine><Button tone="secondary" onClick={reload}>Check access again</Button></section>
      : !access?.role ? <section className="card review-access-denied"><LockKeyhole size={30} /><h2>This space is for assigned reviewers.</h2><p>Your account does not have reviewer access. Your personal space is still available.</p><Link className="button button-secondary" to="/dashboard">Back to your dashboard</Link></section>
        : !access.verified ? <StaffAuthenticator /> : <><div className="review-staff-status"><ShieldCheck size={15} />{access.role === "admin" ? "Admin" : "Moderator"} · Staff session verified</div><OperationsStatus/><ReviewWorkspace /></>}
  </div>;
}
