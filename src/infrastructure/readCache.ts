/** Short-lived tab-memory reads only. No HTTP, disk or shared-user persistence. */
export class ReadCache {
  private entries = new Map<string, { value: string; expires: number; bytes: number }>();
  private pending = new Map<string, Promise<unknown>>();
  private version = 0;
  constructor(private now = Date.now, private maxBytes = 2 * 1024 * 1024, private maxEntries = 32) {}
  clear() { this.version++; this.entries.clear(); this.pending.clear(); }
  invalidate(prefixes: string[]) {
    // In-flight work may finish for its caller, but must not refill a cache
    // invalidated by an acknowledged mutation.
    this.version++; this.pending.clear();
    for (const key of this.entries.keys()) if (prefixes.some(prefix => key.startsWith(prefix))) this.entries.delete(key);
  }
  async read<T>(key: string, load: () => Promise<T>, ttl: number): Promise<T> {
    const old = this.entries.get(key);
    if (old && old.expires > this.now()) {
      this.entries.delete(key); this.entries.set(key, old);
      return JSON.parse(old.value) as T;
    }
    this.entries.delete(key);
    const waiting = this.pending.get(key); if (waiting) return JSON.parse(JSON.stringify(await waiting)) as T;
    const version = this.version;
    const work = load(); this.pending.set(key, work);
    try {
      const value = await work; const serialized = JSON.stringify(value);
      if (version === this.version && serialized !== undefined) {
        const bytes = new TextEncoder().encode(serialized).byteLength;
        if (bytes <= this.maxBytes) {
          this.entries.set(key, { value: serialized, bytes, expires: this.now() + ttl });
          let total = [...this.entries.values()].reduce((n, item) => n + item.bytes, 0);
          while (this.entries.size > this.maxEntries || total > this.maxBytes) {
            const oldest = this.entries.keys().next().value!; total -= this.entries.get(oldest)!.bytes; this.entries.delete(oldest);
          }
        }
      }
      return value;
    } finally { if (this.pending.get(key) === work) this.pending.delete(key); }
  }
}
