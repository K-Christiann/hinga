import { useState } from "react";
import { Check, Flag, RefreshCw, RotateCcw } from "lucide-react";
import type { CaseAction, CaseDecision, CaseKind, CaseStatus, ReviewCase } from "../../domain/feedback";
import { useApp } from "../context";
import { useCursorCollection, usePagination } from "../hooks/pagination";
import { Button, EmptyState, ErrorLine } from "../components/Primitives";
import { CursorPagination } from "../components/CursorPagination";
import "../pages/feedback.css";

const when=(value:string)=>new Date(value).toLocaleString("en-PH",{dateStyle:"medium",timeStyle:"short"});
const statusLabels:Record<CaseStatus,string>={open:"New",in_review:"In review",closed:"Resolved"};
const actionLabels:Record<CaseAction,string>={start:"Start review",keep:"Keep content",remove:"Remove content",restore:"Restore submission",uphold:"Uphold removal",unavailable:"Resolve as unavailable"};
function availableActions(item:ReviewCase):CaseAction[] {
  if(item.kind === "report") return item.target?.status === "published" && (!item.context || item.context.available) ? ["keep","remove"] : ["unavailable"];
  return [...(item.canRestore ? ["restore" as const] : []),...(item.canUphold ? ["uphold" as const] : []),...(!item.canRestore ? ["unavailable" as const] : [])];
}
export function CaseDecisionPanel({item,busy,onDecision}:{item:ReviewCase;busy:boolean;onDecision(decision:CaseDecision):void}) {
  const actions=availableActions(item);
  const [action,setAction]=useState<CaseAction>(actions[0] || "unavailable");
  const [response,setResponse]=useState("");const [note,setNote]=useState("");const [authorExplanation,setAuthorExplanation]=useState("");
  return <section className="card review-detail case-detail" aria-labelledby="case-detail-heading">
    <div className="review-detail-top"><span className="eyebrow">{item.kind === "report" ? "RAISED CONCERN" : "ANOTHER REVIEW REQUESTED"}</span><span className={`activity-status activity-${item.status}`}>{statusLabels[item.status]}</span></div>
    <h2 id="case-detail-heading" tabIndex={-1}>{item.kind === "report" ? "Read the concern in context." : "Give this a fresh look."}</h2>
    <p className="review-date">Received {when(item.createdAt)}</p>
    {item.isInvolved ? <p className="inline-notice">You are involved in this case. A different reviewer must handle it. An appeal also needs a reviewer who did not make the original decision.</p> : <>
      <div className="activity-explanation"><strong>{item.kind === "report" ? "What concerned the member" : "What the author asks you to consider"}</strong><p>{item.reason}</p></div>
      {item.decisionExplanation && <div className="activity-explanation"><strong>Original explanation to the author</strong><p>{item.decisionExplanation}</p></div>}
      {item.target ? <><h3>{item.target.alias}’s {item.target.kind === "post" ? "thought" : "reply"}</h3><p className="small-copy">Current state: {item.target.status}</p><div className="review-full-body">{item.target.body}</div></> : <p className="inline-notice">The shared content is no longer available.</p>}
      {item.context && <details className="review-parent"><summary>Original thought · {item.context.alias}</summary><p>{item.context.body}</p></details>}
      {item.status !== "closed" ? <>
        {item.status === "open" && <Button tone="secondary" disabled={busy} onClick={()=>onDecision({id:item.id,kind:item.kind,action:"start",staffNote:"",publicResponse:""})}>Start review</Button>}
        <form className="case-decision-form" onSubmit={event=>{event.preventDefault();onDecision({id:item.id,kind:item.kind,action,publicResponse:response,staffNote:note,authorExplanation});}}>
          <label className="field-label" htmlFor="case-outcome">Decision</label>
          <select className="input" id="case-outcome" value={action} disabled={busy} onChange={event=>setAction(event.target.value as CaseAction)}>{actions.map(value=><option key={value} value={value}>{actionLabels[value]}</option>)}</select>
          <label className="field-label" htmlFor="case-response">{item.kind === "report" ? "Update for the person who raised the concern" : "Explanation for the author"}</label>
          <textarea className="input" id="case-response" rows={4} required maxLength={500} disabled={busy} value={response} onChange={e=>setResponse(e.target.value)} placeholder="Explain the outcome with care. Leave out other members’ private details."/>
          {item.kind === "report" && action === "remove" && <><label className="field-label" htmlFor="case-author-explanation">Separate explanation for the content’s author</label>
            <textarea className="input" id="case-author-explanation" rows={4} required maxLength={500} disabled={busy} value={authorExplanation} onChange={e=>setAuthorExplanation(e.target.value)} placeholder="Explain which guideline applies and how they can share safely. Do not identify or quote the reporter."/>
            <p className="small-copy">The author receives only this explanation. Reporter details stay private.</p></>}
          <label className="field-label" htmlFor="case-staff-note">Internal staff note <span>(optional)</span></label>
          <textarea className="input" id="case-staff-note" rows={3} maxLength={500} disabled={busy} value={note} onChange={e=>setNote(e.target.value)} placeholder="Context for other reviewers. This note is not sent to members."/>
          <p className="small-copy">Each message has a 500-character limit. A decision is recorded when you save it.</p>
          <Button type="submit" tone={action === "remove" || action === "uphold" ? "danger" : "primary"} disabled={busy || !response.trim() || (action === "remove" && !authorExplanation.trim())}><Check size={16}/>{busy ? "Saving…" : "Save decision & send update"}</Button>
        </form>
      </> : <div className="activity-explanation"><strong>Recorded outcome: {item.resolution}</strong><p>{item.publicResponse}</p></div>}
      {item.actions.length>0 && <details className="case-history" open={item.status === "closed"}><summary>Case history</summary><ol>{item.actions.map((entry,index)=><li key={index}><strong>{actionLabels[entry.action]} · {entry.reviewer}</strong><small>{when(entry.createdAt)}</small>{entry.publicResponse && <p>Member update: {entry.publicResponse}</p>}{entry.authorExplanation && <p>Author explanation: {entry.authorExplanation}</p>}{entry.staffNote && <p>Internal note: {entry.staffNote}</p>}</li>)}</ol></details>}
    </>}
  </section>;
}
export function CaseWorkspace({kind}:{kind:CaseKind}) {
  const {services,identity,act}=useApp();const [status,setStatus]=useState<CaseStatus>("open");const [selectedId,setSelectedId]=useState("");const [busy,setBusy]=useState(false);
  const collection=useCursorCollection<ReviewCase>(request=>services.cases.page(identity?.id ?? "", kind,status,request),[services,identity?.id,kind,status],true,6);
  const page=usePagination(collection.items,6,`${identity?.id}:${kind}:${status}`);
  const selected=page.items.find(item=>item.id===selectedId)||page.items[0];
  async function decide(decision:CaseDecision){if(busy)return;setBusy(true);const saved=await act(async()=>{await services.cases.decide(identity?.id ?? "", decision);return true;},decision.action === "start" ? "Review started. Find this case under In review." : "Decision saved. The member can see their update in My activity.");if(saved)setSelectedId("");setBusy(false);}
  return <>
    <div className="case-list-toolbar"><div className="review-kind-tabs" role="group" aria-label={`${kind} status`}>{(["open","in_review","closed"] as const).map(value=><button key={value} disabled={busy} className={status===value ? "active" : ""} aria-pressed={status===value} onClick={()=>{setStatus(value);setSelectedId("");}}>{statusLabels[value]}</button>)}</div>
      <Button tone="ghost" disabled={busy || collection.loading} onClick={()=>{void collection.refresh();}}><RefreshCw size={15}/>Refresh</Button></div>
    <ErrorLine>{collection.error}</ErrorLine>{collection.error && <Button tone="secondary" onClick={()=>{void collection.retry();}}>Try loading again</Button>}
    <h2 className="review-list-heading" id="case-list-heading" tabIndex={-1}>{kind === "report" ? "Concerns to consider" : "Requests for another look"}</h2>
    {collection.loading && !collection.items.length ? <p role="status" className="card">Loading {kind === "report" ? "reports" : "appeals"}…</p> : page.items.length ? <div className="review-workspace">
      <ul className="review-submission-list" aria-label={kind === "report" ? "Reported content" : "Appeal requests"}>{page.items.map(item=><li key={item.id}><button disabled={busy} className={`review-submission ${selected?.id===item.id ? "selected" : ""}`} aria-pressed={selected?.id===item.id} onClick={()=>{setSelectedId(item.id);window.requestAnimationFrame(()=>document.getElementById("case-detail-heading")?.focus());}}>
        <span className="review-item-meta"><strong>{item.target?.alias || "Unavailable content"}</strong><span>{item.isInvolved ? "Another reviewer needed" : statusLabels[item.status]}</span></span><p>{item.reason.slice(0,150)}{item.reason.length>150 ? "…" : ""}</p><small>{when(item.createdAt)}</small></button></li>)}</ul>
      {selected && <CaseDecisionPanel key={`${selected.id}:${selected.status}:${selected.actions.length}`} item={selected} busy={busy} onDecision={decision=>{void decide(decision);}}/>}
    </div> : <section className="card"><EmptyState icon={kind === "report" ? <Flag size={28}/> : <RotateCcw size={28}/>} title="A quiet list.">There are no {statusLabels[status].toLowerCase()} {kind === "report" ? "reports" : "appeals"} here. Refresh to check again.</EmptyState></section>}
    <CursorPagination page={page} collection={collection} label={kind === "report" ? "Reports" : "Appeals"} busy={busy} focusId="case-list-heading"/>
  </>;
}
