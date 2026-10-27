import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PageCursor } from "../../domain/pagination";
import { Button } from "./Primitives";

export function CursorPagination({ page, collection, label, busy = false, focusId }: {
  page: { page:number;pageCount:number;from:number;to:number;total:number;setPage(value:number):void };
  collection: { loading:boolean;nextCursor:PageCursor|null;loadMore():Promise<boolean> };
  label:string;busy?:boolean;focusId?:string;
}) {
  const move = (value: number) => { page.setPage(value); if (focusId) window.requestAnimationFrame(() => document.getElementById(focusId)?.focus()); };
  return <nav className="review-pagination" aria-label={`${label} pagination`}>
    <span aria-live="polite">{page.total ? `${page.from}–${page.to} of ${page.total} loaded` : "No items loaded"}</span>
    <div><Button tone="secondary" disabled={busy || collection.loading || page.page===1} onClick={()=>move(page.page-1)}><ChevronLeft size={16}/>Previous</Button>
      <span>Page {page.page}{!collection.nextCursor ? ` of ${page.pageCount}` : ""}</span>
      <Button tone="secondary" disabled={busy || collection.loading || (page.page>=page.pageCount && !collection.nextCursor)} onClick={()=>{void(async()=>{
        if(page.page<page.pageCount) move(page.page+1); else if(await collection.loadMore()) move(page.page+1);
      })();}}>{collection.loading ? "Loading…" : "Next"}<ChevronRight size={16}/></Button></div>
  </nav>;
}
