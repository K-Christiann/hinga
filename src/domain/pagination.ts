export interface PageCursor {
  createdAt: string;
  id: string;
}
export interface CursorRequest {
  limit?: number;
  cursor?: PageCursor | null;
}
export interface CursorPage<T> {
  items: T[];
  nextCursor: PageCursor | null;
}
export type ThoughtFilter = "all" | "mine" | "saved";

export function validatePageRequest(request: CursorRequest): Required<CursorRequest> {
  const limit = request.limit ?? 8;
  if (!Number.isInteger(limit) || limit < 1 || limit > 20)
    throw new Error("Choose a page size from 1 to 20.");
  const cursor = request.cursor ?? null;
  if (cursor && (!cursor.id || cursor.id.length > 128 || !/^\d{4}-\d{2}-\d{2}T/.test(cursor.createdAt) || !Number.isFinite(Date.parse(cursor.createdAt))))
    throw new Error("This page could not be opened. Refresh the list and try again.");
  return { limit, cursor };
}

function timestampOrder(a: string, b: string): number {
  const difference = Date.parse(a) - Date.parse(b);
  if (difference) return difference;
  const precision = (value: string) =>
    Number((value.match(/\.(\d+)/)?.[1] || "").padEnd(9, "0").slice(3, 9));
  return precision(a) - precision(b);
}

export function newestFirst(a: PageCursor, b: PageCursor): number {
  return timestampOrder(b.createdAt, a.createdAt) || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0);
}

export function cursorPage<T extends PageCursor>(items: T[], request: CursorRequest): CursorPage<T> {
  const { limit, cursor } = validatePageRequest(request);
  const remaining = [...items].sort(newestFirst).filter((item) => !cursor || newestFirst(item, cursor) > 0);
  const page = remaining.slice(0, limit);
  const last = page.at(-1);
  return {
    items: page,
    nextCursor: remaining.length > limit && last ? { id: last.id, createdAt: last.createdAt } : null,
  };
}

export function numberedPage<T>(items: T[], requestedPage: number, size: number) {
  const pageSize = Math.max(1, Math.floor(size) || 1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(pageCount, Math.max(1, Math.floor(requestedPage) || 1));
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page,
    pageCount,
    total: items.length,
    from: items.length ? start + 1 : 0,
    to: Math.min(start + pageSize, items.length),
  };
}
