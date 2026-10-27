import { useEffect, useState } from "react";
import type { OperationsSnapshot } from "../../domain/operations";
import { useApp } from "../context";
import { Button, ErrorLine } from "../components/Primitives";

const age = (minutes: number | null) => minutes === null ? "None waiting" : minutes < 60 ? `${Math.max(0, minutes)} min` : `${Math.floor(minutes / 60)} hr`;
const date = (value: string | null) => value ? new Date(value).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" }) : "Not recorded";
export function OperationsPanel({ snapshot, checkedAt }: { snapshot: OperationsSnapshot; checkedAt: string }) {
  const attention = (snapshot.oldestSubmissionMinutes ?? 0) >= 1440 || (snapshot.oldestReportMinutes ?? 0) >= 240 || (snapshot.oldestAppealMinutes ?? 0) >= 1440;
  const stale = (value: string | null, hours: number) => !value || !Number.isFinite(Date.parse(value)) || Date.now() - Date.parse(value) > hours * 3600000;
  const clientFaults = ["render_error", "unhandled_error", "unhandled_rejection"].reduce((total, code) => total + Number(snapshot.recentCounts[`client_${code}`] ?? 0), 0);
  return <section className="card operations-panel" aria-labelledby="operations-heading">
    <h2 id="operations-heading">Service & review checks</h2>
    <p className="small-copy">Checked {checkedAt}. Technical counts cover the last hour and contain no entry text or member identities.</p>
    {(!snapshot.gatewayRequired || !snapshot.gatewayHookActive) && <p className="inline-notice" role="status">Gateway enforcement is not enabled. Finish the production setup before public launch.</p>}
    {attention && <p className="inline-notice" role="status">A queue has been waiting beyond the review reminder threshold. Check reviewer coverage and the pending lists.</p>}
    {(stale(snapshot.lastBackupAt, 24) || stale(snapshot.lastRestoreAt, 24 * 30)) && <p className="inline-notice" role="status">Backup or restore evidence is missing or overdue. Check the recovery guide and record a verified result.</p>}
    <dl className="operations-grid">
      <div><dt>Pending submissions</dt><dd>{snapshot.pendingPosts + snapshot.pendingReplies}</dd><small>Oldest: {age(snapshot.oldestSubmissionMinutes)}</small></div>
      <div><dt>Open reports</dt><dd>{snapshot.openReports}</dd><small>Oldest: {age(snapshot.oldestReportMinutes)}</small></div>
      <div><dt>Open appeals</dt><dd>{snapshot.openAppeals}</dd><small>Oldest: {age(snapshot.oldestAppealMinutes)}</small></div>
      <div><dt>Recorded server faults</dt><dd>{snapshot.recentCounts.backend_error ?? 0}</dd><small>Rate-limited requests: {snapshot.recentCounts.rate_limited ?? 0}</small></div>
      <div><dt>Recorded app faults</dt><dd>{clientFaults}</dd><small>Fixed technical codes only</small></div>
    </dl>
    <p className="small-copy">Last encrypted backup: {date(snapshot.lastBackupAt)}<br/>Last database restore check: {date(snapshot.lastRestoreAt)}</p>
    <p className="small-copy">These are operational reminders. Monitoring is not continuous crisis response. A database restore check does not verify Google sign-in or physical devices.</p>
  </section>;
}
export function OperationsStatus() {
  const { services, identity, policy } = useApp(); const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ snapshot: OperationsSnapshot | null; checkedAt: string; error: string }>({ snapshot: null, checkedAt: "", error: "" });
  useEffect(() => {
    let active = true; let loading = false;
    const load = async () => {
      if (!identity || loading || document.visibilityState === "hidden") return;
      loading = true;
      try { const snapshot = await services.operations.summary(identity.id); if (active) setState({ snapshot, checkedAt: new Date().toLocaleTimeString("en-PH"), error: "" }); }
      catch { if (active) setState(previous => ({ ...previous, snapshot: null, error: "Service checks could not load. Refresh to check again." })); }
      finally { loading = false; }
    };
    void load(); const timer = window.setInterval(() => { void load(); }, 60000);
    const focus = () => { void load(); }; window.addEventListener("focus", focus);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener("focus", focus); };
  }, [services, identity?.id, attempt]);
  return <><p className="inline-notice" role="status">{policy?.privateCollectionOpen ? "Private saving: open." : "Private saving: paused. Complete privacy approval, account-isolation, gateway and recovery requirements."} {policy?.communityCollectionOpen ? "Community submissions: open for moderator review." : "Community submissions: paused. Private readiness, staffed coverage, published review hours and sharing enabled are required."} See docs/LAUNCH_SETUP.md.</p>{state.snapshot && <OperationsPanel snapshot={state.snapshot} checkedAt={state.checkedAt}/>}<ErrorLine>{state.error}</ErrorLine>
    {state.error && <Button tone="secondary" onClick={() => setAttempt(value => value + 1)}>Refresh service checks</Button>}</>;
}
