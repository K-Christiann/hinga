/** Per-account tab memory. Never serialize this store to browser persistence. */
export class DraftMemory {
  private values = new Map<string, unknown>();
  private listeners = new Map<string, Set<() => void>>();
  private all = new Set<() => void>();
  initialize<T>(key: string, initial: T | (() => T)) {
    if (!this.values.has(key)) this.values.set(key, typeof initial === "function" ? (initial as () => T)() : initial);
  }
  get<T>(key: string) { return this.values.get(key) as T; }
  set<T>(key: string, value: T) {
    if (Object.is(this.values.get(key), value)) return;
    this.values.set(key, value); this.listeners.get(key)?.forEach(notify => notify()); this.all.forEach(notify => notify());
  }
  subscribe(key: string, notify: () => void) {
    const set = this.listeners.get(key) || new Set(); set.add(notify); this.listeners.set(key, set);
    return () => { set.delete(notify); if (!set.size) this.listeners.delete(key); };
  }
  subscribeAll = (notify: () => void) => { this.all.add(notify); return () => { this.all.delete(notify); }; };
  isDirty = () => [...this.values].some(([key, value]) => {
    if (/\.(dirty|changed|busy)$/.test(key)) return value === true;
    return (key === "thought.body" || /^reply\..*\.body$/.test(key)) && typeof value === "string" && Boolean(value.trim());
  });
}
