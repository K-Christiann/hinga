import type { DisplayPreference, DisplayPreferences } from "../domain/preferences";
interface PreferenceStorage { getItem(key: string): string | null; setItem(key: string, value: string): void; }
/** Only two display flags. No account identifier, entry text or credentials. */
export class SavedDisplayPreferences implements DisplayPreferences {
  private values = new Map<DisplayPreference, boolean>();
  private listeners = new Set<() => void>();
  constructor(private storage: () => PreferenceStorage) {}
  get(key: DisplayPreference) {
    if (!this.values.has(key)) {
      let value = true;
      try { const stored = this.storage().getItem(`hinga.display.${key}`); if (stored === "false") value = false; } catch { /* Restricted storage keeps a tab-memory preference. */ }
      this.values.set(key, value);
    }
    return this.values.get(key)!;
  }
  set(key: DisplayPreference, value: boolean) {
    this.values.set(key, value);
    try { this.storage().setItem(`hinga.display.${key}`, String(value)); } catch { /* The choice still survives route changes in this tab. */ }
    this.listeners.forEach(listener => listener());
  }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
}
