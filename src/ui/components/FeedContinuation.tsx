import { useEffect, useRef } from "react";
import { ArrowDown, ArrowUp, LoaderCircle, RotateCcw } from "lucide-react";
import { Button } from "./Primitives";

export function FeedContinuation({ hasMore, loading, error, autoLoad, count, onMore, onRetry, onTop }: {
  hasMore: boolean; loading: boolean; error: string; autoLoad: boolean; count: number;
  onMore(): void; onRetry(): void; onTop(): void;
}) {
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!autoLoad || !hasMore || loading || error || typeof IntersectionObserver === "undefined" || !sentinel.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) onMore();
    }, { rootMargin: "0px 0px 240px 0px" });
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [autoLoad, hasMore, loading, error, onMore]);
  return <div className="feed-continuation" ref={sentinel}>
    <p className="feed-load-status" role="status" aria-live="polite">{loading ? <><LoaderCircle size={16} className="feed-loading-icon" /> Loading thoughts…</> : error ? "The next thoughts couldn’t load. Your place is still here." : hasMore ? `${count} thoughts shown. More are available when you’re ready.` : count ? "You’ve reached the thoughts available right now." : ""}</p>
    {(hasMore || error) && <Button tone="secondary" disabled={loading} onClick={error ? onRetry : onMore}>{error ? "Try again" : "Load more thoughts"}{error ? <RotateCcw size={15} /> : <ArrowDown size={15} />}</Button>}
    {count > 0 && <button type="button" className="feed-back-top" onClick={onTop}><ArrowUp size={14} /> Back to the top</button>}
  </div>;
}
