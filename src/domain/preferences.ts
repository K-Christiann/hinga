export type DisplayPreference = "feedAutoLoad" | "showBibleVerses";
export interface DisplayPreferences {
  get(key: DisplayPreference): boolean;
  set(key: DisplayPreference, value: boolean): void;
  subscribe(listener: () => void): () => void;
}
