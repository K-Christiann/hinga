import type { CursorPage, CursorRequest, PageCursor } from "../domain/pagination";

export interface CollectionSnapshot<T> {
  items: T[];
  nextCursor: PageCursor | null;
  loading: boolean;
  refreshing: boolean;
  initialized: boolean;
  error: string;
}

// Fetch coordination lives outside React and the persistence adapters. A new
// generation invalidates old requests when a member/filter/thread changes.
export class CursorCollection<T extends { id: string }> {
  private state: CollectionSnapshot<T> = {
    items: [], nextCursor: null, loading: true, refreshing: false,
    initialized: false, error: "",
  };
  private generation = 0;
  private failedAction: "refresh" | "more" = "refresh";
  private listeners = new Set<() => void>();

  constructor(private fetchPage: (request: CursorRequest) => Promise<CursorPage<T>>, private pageSize = 8) {}

  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  cancel = () => { this.generation++; };
  retry = () => this.failedAction === "more" ? this.loadMore() : this.refresh();

  private publish(patch: Partial<CollectionSnapshot<T>>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }
  private merge(current: T[], incoming: T[]) {
    const result = new Map(current.map((item) => [item.id, item]));
    incoming.forEach((item) => result.set(item.id, item));
    return [...result.values()];
  }
  private message(error: unknown) {
    return error instanceof Error ? error.message : "The next thoughts could not load. Please try again.";
  }

  refresh = async () => {
    const generation = ++this.generation;
    const target = this.pageSize;
    this.publish({ loading: true, refreshing: this.state.initialized, error: "" });
    try {
      let items: T[] = [];
      let cursor: PageCursor | null = null;
      const seen = new Set<string>();
      do {
        const page = await this.fetchPage({ limit: this.pageSize, cursor });
        if (generation !== this.generation) return;
        items = this.merge(items, page.items);
        cursor = page.nextCursor;
        if (cursor) {
          const key = JSON.stringify(cursor);
          if (seen.has(key)) throw new Error("The list could not continue. Please refresh it.");
          seen.add(key);
        }
      } while (cursor && items.length < target);
      this.publish({ items, nextCursor: cursor, loading: false, refreshing: false, initialized: true });
    } catch (error) {
      if (generation === this.generation) {
        this.failedAction = "refresh";
        this.publish({ loading: false, refreshing: false, initialized: true, error: this.message(error) });
      }
    }
  };

  loadMore = async () => {
    if (this.state.loading || !this.state.nextCursor) return false;
    const generation = this.generation;
    const cursor = this.state.nextCursor;
    this.publish({ loading: true, error: "" });
    try {
      const page = await this.fetchPage({ limit: this.pageSize, cursor });
      if (generation !== this.generation) return false;
      if (page.nextCursor && JSON.stringify(page.nextCursor) === JSON.stringify(cursor))
        throw new Error("The list could not continue. Please refresh it.");
      this.publish({ items: this.merge(this.state.items, page.items), nextCursor: page.nextCursor, loading: false });
      return true;
    } catch (error) {
      if (generation === this.generation) {
        this.failedAction = "more";
        this.publish({ loading: false, error: this.message(error) });
      }
      return false;
    }
  };
}
