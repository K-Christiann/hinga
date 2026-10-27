import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { CursorCollection } from "../../application/cursorCollection";
import { numberedPage, type CursorPage, type CursorRequest } from "../../domain/pagination";
import { useApp } from "../context";

export function usePagination<T>(items: T[], size: number, resetKey = "") {
  const [position, setPosition] = useState({ key: resetKey, page: 1 });
  const result = numberedPage(items, position.key === resetKey ? position.page : 1, size);
  return { ...result, setPage: (page: number) => setPosition({ key: resetKey, page }) };
}

export function useCursorCollection<T extends { id: string }>(
  loader: (request: CursorRequest) => Promise<CursorPage<T>>,
  dependencies: unknown[],
  enabled = true,
  pageSize = 8,
) {
  const { revision } = useApp();
  // The dependencies identify the member, filter, or thread captured by loader.
  const collection = useMemo(() => new CursorCollection(loader, pageSize), [...dependencies,pageSize]);
  const state = useSyncExternalStore(collection.subscribe, collection.getSnapshot, collection.getSnapshot);
  useEffect(() => {
    if (enabled) void collection.refresh();
    return collection.cancel;
  }, [collection, revision, enabled]);
  return { ...state, loadMore: collection.loadMore, refresh: collection.refresh, retry: collection.retry };
}
