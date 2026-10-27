import { ChevronLeft, ChevronRight } from "lucide-react";
import "./pagination.css";

export function Pagination({ page, pageCount, total, from, to, label, controls, onChange, disabled = false, compact = false }: {
  page: number; pageCount: number; total: number; from: number; to: number;
  label: string; controls: string; onChange(page: number): void; disabled?: boolean; compact?: boolean;
}) {
  return <nav className={`pagination ${compact ? "compact" : ""}`} aria-label={`${label} pagination`}>
    <p role="status" aria-live="polite">{total ? `${from}–${to} of ${total}` : "0 items"}</p>
    <div className="pagination-controls">
      <button type="button" disabled={disabled || page <= 1} onClick={() => onChange(page - 1)} aria-label={`Previous ${label.toLowerCase()} page`} aria-controls={controls}><ChevronLeft size={16} /></button>
      <label><span className="sr-only">Choose {label.toLowerCase()} page</span><select value={page} disabled={disabled || pageCount <= 1} aria-controls={controls} onChange={(event) => onChange(Number(event.target.value))}>{Array.from({ length: pageCount }, (_, index) => <option key={index + 1} value={index + 1}>Page {index + 1} of {pageCount}</option>)}</select></label>
      <button type="button" disabled={disabled || page >= pageCount} onClick={() => onChange(page + 1)} aria-label={`Next ${label.toLowerCase()} page`} aria-controls={controls}><ChevronRight size={16} /></button>
    </div>
  </nav>;
}
