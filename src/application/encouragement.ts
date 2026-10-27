import type { EncouragingThought, ThoughtHistory, ThoughtProvider } from "../domain/encouragement";

/** One shuffled cycle, without repetition, across refreshes in the same tab. */
export class RotatingThoughts implements ThoughtProvider {
  private selected?: EncouragingThought;
  private remaining: string[] = [];
  private lastId = "";
  private restored = false;
  constructor(
    private readonly catalog: readonly EncouragingThought[],
    private readonly history: ThoughtHistory,
    private readonly random: () => number = Math.random,
  ) {
    if (!catalog.length || new Set(catalog.map(item => item.id)).size !== catalog.length)
      throw new Error("Encouragements need a nonempty catalog with unique IDs.");
  }
  current() {
    return this.selected ?? this.next();
  }
  next() {
    if (!this.restored) {
      this.restored = true;
      try {
        const saved = this.history.read() as { lastId?: unknown; remaining?: unknown } | null;
        const ids = new Set(this.catalog.map(item => item.id));
        if (saved && typeof saved.lastId === "string" && ids.has(saved.lastId)) {
          this.lastId = saved.lastId;
          if (Array.isArray(saved.remaining) && saved.remaining.length < this.catalog.length &&
            saved.remaining.every(id => typeof id === "string" && ids.has(id) && id !== this.lastId) &&
            new Set(saved.remaining).size === saved.remaining.length) {
            this.remaining = [...saved.remaining];
          }
        }
      } catch { /* Blocked browser storage must not hide encouragement. */ }
    }
    if (!this.remaining.length) {
      this.remaining = this.catalog.map(item => item.id);
      for (let i = this.remaining.length - 1; i > 0; i--) {
        const value = this.random();
        const index = Number.isFinite(value) ? Math.max(0, Math.min(i, Math.floor(value * (i + 1)))) : 0;
        [this.remaining[i], this.remaining[index]] = [this.remaining[index], this.remaining[i]];
      }
      if (this.remaining.length > 1 && this.remaining[0] === this.lastId)
        [this.remaining[0], this.remaining[1]] = [this.remaining[1], this.remaining[0]];
    }
    this.lastId = this.remaining.shift()!;
    this.selected = this.catalog.find(item => item.id === this.lastId)!;
    try { this.history.write({ lastId: this.lastId, remaining: [...this.remaining] }); }
    catch { /* Continue with the in-memory cycle when storage is unavailable. */ }
    return this.selected;
  }
}
