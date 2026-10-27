import { useApp } from "../context";
import { ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

export function SharingReviewNotice() {
  const { policy } = useApp();
  return <div className="sharing-review-notice"><ShieldCheck size={20}/><p><strong>{policy?.communityCollectionOpen ? "You can submit at any time." : "New submissions are currently paused."}</strong>
    Your thought or reply will appear to others after a moderator approves it. Reviews may take time. {policy?.reviewHours || "Staffed review hours are awaiting confirmation."} Follow your submission in <Link to="/activity">My activity</Link>.</p></div>;
}
