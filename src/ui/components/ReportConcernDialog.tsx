import { useEffect, useState } from "react";
import { Flag } from "lucide-react";
import { Link } from "react-router-dom";
import type { ReviewKind } from "../../domain/moderation";
import { useApp } from "../context";
import { Button, Modal } from "./Primitives";

export interface ReportTarget { id:string;kind:ReviewKind }
export function ReportConcernDialog({target,onClose}:{target:ReportTarget|null;onClose():void}) {
  const {services,identity,act}=useApp();const [reason,setReason]=useState("");const [busy,setBusy]=useState(false);
  useEffect(()=>{setReason("");},[target?.id,target?.kind]);
  return <Modal open={Boolean(target)} onClose={()=>{if(!busy)onClose();}} title="Tell us what concerned you." eyebrow={target?.kind === "reply" ? "RAISE A CONCERN ABOUT A REPLY" : "RAISE A CONCERN ABOUT A THOUGHT"}>
    <p className="modal-lead">Your concern goes to reviewers. Your account identity and report are kept out of the author’s member updates. You can follow the outcome in My activity.</p>
    <p className="small-copy">Reports are not continuously monitored. For support now, open <Link to="/help" onClick={onClose}>Get Help</Link>.</p>
    <form onSubmit={event=>{event.preventDefault();if(!target || busy)return;setBusy(true);void(async()=>{
      const saved=await act(async()=>{await services.feedback.report(identity?.id ?? "", target.kind,target.id,reason);return true;},"Your concern was received. Follow its review in My activity → Your reports.");
      if(saved)onClose();setBusy(false);
    })();}}>
      <label className="field-label" htmlFor="report-reason">What would you like the reviewer to know?</label>
      <textarea className="input" id="report-reason" rows={4} maxLength={500} value={reason} required disabled={busy} onChange={event=>setReason(event.target.value)}/>
      <p className="small-copy">{reason.length}/500 · Share only the details needed to review the concern.</p>
      <div className="modal-actions"><Button type="button" tone="ghost" disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy || !reason.trim()}>{busy ? "Sending…" : "Submit concern"}<Flag size={15}/></Button></div>
    </form>
  </Modal>;
}
