import { useState } from "react";
import { Check, FileText, Flag, MessageCircle, RefreshCw, RotateCcw } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import type { ActivityItem, ActivityView } from "../../domain/feedback";
import { useApp } from "../context";
import { useCursorCollection, usePagination } from "../hooks/pagination";
import { Button, EmptyState, ErrorLine, Modal, PageIntro } from "../components/Primitives";
import { CursorPagination } from "../components/CursorPagination";
import "./review-desk.css";
import "./feedback.css";

export const activityStatus = (status: ActivityItem["status"]) => ({ pending:"Pending review",published:"Approved",removed:"Removed",open:"Received",in_review:"In review",closed:"Resolved" })[status];
const when=(value:string)=>new Date(value).toLocaleString("en-PH",{dateStyle:"medium",timeStyle:"short"});
const resolutionLabels:Record<string,string>={kept:"Content kept after review",removed:"Content removed",restored:"Submission restored",upheld:"Original decision upheld",unavailable:"Content or decision no longer available"};

export function ActivityCard({ item, view, onAppeal }: { item:ActivityItem;view:ActivityView;onAppeal(item:ActivityItem):void }) {
  return <li className="card activity-card">
    <div className="activity-meta"><span className={`activity-status activity-${item.status}`}>{activityStatus(item.status)}</span><time dateTime={item.createdAt}>{when(item.createdAt)}</time></div>
    <h2>{view === "submissions" ? `Your ${item.kind === "post" ? "shared thought" : "reply"}` : view === "reports" ? `Concern about a ${item.kind === "post" ? "thought" : "reply"}` : "Your request for another review"}</h2>
    {item.body && <details className="activity-content"><summary>Read your submission</summary><p>{item.body}</p></details>}
    {item.reason && <div className="activity-explanation"><strong>{view === "reports" ? "What you shared with reviewers" : "Your request"}</strong><p>{item.reason}</p></div>}
    {item.explanation ? <div className="activity-explanation"><strong>{view === "reports" ? "Review update" : "Message from the review team"}</strong><p>{item.explanation}</p></div>
      : <p className="small-copy">{item.status === "pending" ? "Waiting for moderator approval. This submission is not visible to other members yet." : item.status === "published" ? "This submission was approved for sharing." : item.status === "removed" ? "This submission is no longer shared." : item.status === "closed" ? "This concern has been resolved." : "Your request is waiting for a reviewer. Review times can vary."}</p>}
    {item.resolution && <p className="activity-resolution"><Check size={15}/>{resolutionLabels[item.resolution] || "Review completed"}</p>}
    {item.canAppeal && <Button tone="secondary" onClick={()=>onAppeal(item)}><RotateCcw size={16}/>Request another review</Button>}
  </li>;
}

function ActivityList({view}:{view:ActivityView}) {
  const { services, identity, act }=useApp();
  const collection=useCursorCollection<ActivityItem>(request=>services.feedback.page(identity?.id ?? "", view,request),[services,identity?.id,view],true,6);
  const page=usePagination(collection.items,6,`${identity?.id}:${view}`);
  const [selected,setSelected]=useState<ActivityItem|null>(null);
  const [reason,setReason]=useState("");const [busy,setBusy]=useState(false);
  return <>
    <div className="activity-list-toolbar"><h2 id="activity-list-heading" tabIndex={-1}>{view === "submissions" ? "Your shared submissions" : view === "reports" ? "Concerns you raised" : "Requests for another review"}</h2>
      <Button tone="ghost" disabled={collection.loading || busy} onClick={()=>{void collection.refresh();}}><RefreshCw size={15}/>Refresh</Button></div>
    <ErrorLine>{collection.error}</ErrorLine>
    {collection.error && <Button tone="secondary" onClick={()=>{void collection.retry();}}>Try loading again</Button>}
    {collection.loading && !collection.items.length ? <p className="card" role="status">Loading your activity…</p> : page.items.length ?
      <ul className="activity-list" aria-label="Your activity">{page.items.map(item=><ActivityCard key={item.id} item={item} view={view} onAppeal={item=>{setSelected(item);setReason("");}}/>)}</ul>
      : <section className="card"><EmptyState icon={view === "reports" ? <Flag size={28}/> : view === "appeals" ? <RotateCcw size={28}/> : <MessageCircle size={28}/>} title={view === "submissions" ? "Room for your words." : view === "reports" ? "No concerns submitted." : "No review requests yet."}>
        {view === "submissions" ? "Thoughts and replies you submit will appear here, together with their review updates." : view === "reports" ? "If you raise a concern about a thought or reply, you can follow its review here." : "When an eligible submission is removed, you can request another review from the Submissions tab."}
      </EmptyState></section>}
    <CursorPagination label="My activity" page={page} collection={collection} busy={busy} focusId="activity-list-heading"/>
    <Modal open={Boolean(selected)} onClose={()=>{if(!busy)setSelected(null);}} title="Ask for another look." eyebrow="REQUEST ANOTHER REVIEW">
      <p className="modal-lead">A different reviewer will consider your request. Your submission stays out of the community while the decision is reviewed. This does not affect your private notes or moods.</p>
      {selected?.explanation && <blockquote className="activity-explanation">{selected.explanation}</blockquote>}
      <form onSubmit={event=>{event.preventDefault();if(busy || !selected?.decisionId)return;setBusy(true);void(async()=>{
        const saved=await act(async()=>{await services.feedback.appeal(identity?.id ?? "", selected.decisionId!,reason);return true;},"Your request was received. You can follow it in My activity → Appeals.");
        if(saved){setSelected(null);setReason("");}setBusy(false);
      })();}}>
        <label className="field-label" htmlFor="appeal-reason">What would you like the reviewer to consider?</label>
        <textarea className="input" id="appeal-reason" rows={5} value={reason} maxLength={1000} disabled={busy} required onChange={e=>setReason(e.target.value)} placeholder="Explain why you would like another review. Please leave out identifying details."/>
        <p className="small-copy">{reason.length}/1,000 · One request per removal decision. Review times can vary.</p>
        <Button type="submit" disabled={busy || !reason.trim()}>{busy ? "Sending…" : "Send review request"}</Button>
      </form>
    </Modal>
  </>;
}
export function Activity() {
  const {identity, policy}=useApp(); const [params,setParams]=useSearchParams();
  const value=params.get("view"); const view:ActivityView=value === "reports" || value === "appeals" ? value : "submissions";
  return <div className="member-activity"><PageIntro eyebrow="YOUR COMMUNITY ACTIVITY" title="Your words, with clarity.">Follow the review of your submissions, concerns, and appeals. This page is kept out of the member feed; authorized reviewers handle your shared submissions and requests.</PageIntro>
    <div className="activity-intro"><p>{policy?.communityCollectionOpen ? "You can submit a thought or reply for moderator approval." : "New submissions are currently paused. You can still follow existing submissions here."} Approved thoughts and replies appear to signed-in members. Reviews are not continuously monitored; urgent support is available through <Link to="/help">Get Help</Link>.</p><Link to="/thoughts" className="button button-secondary"><MessageCircle size={16}/>{policy?.communityCollectionOpen ? "Share a thought" : "View shared thoughts"}</Link></div>
    <div className="review-tabs activity-tabs" role="group" aria-label="Your activity view">{([['submissions','Submissions',FileText],['reports','Your reports',Flag],['appeals','Appeals',RotateCcw]] as const).map(([id,label,Icon])=><button key={id} aria-pressed={view===id} className={view===id ? "active" : ""} onClick={()=>setParams({view:id})}><Icon size={16}/>{label}</button>)}</div>
    <ActivityList key={`${identity?.id}:${view}`} view={view}/>
  </div>;
}
