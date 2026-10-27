import { RotatingThoughts } from "../application/encouragement";
import { encouragingThoughts } from "../data/encouragingThoughts";
import type { ThoughtHistory } from "../domain/encouragement";

export const thoughtHistoryKey = "hinga.encouragement.rotation.v1";

export class BrowserThoughtHistory implements ThoughtHistory {
  constructor(private readonly storage: () => Pick<Storage, "getItem" | "setItem"> = () => window.sessionStorage) {}
  read(): unknown {
    const raw = this.storage().getItem(thoughtHistoryKey);
    return raw && raw.length <= 4096 ? JSON.parse(raw) : null;
  }
  write(history: { lastId: string; remaining: string[] }) {
    this.storage().setItem(thoughtHistoryKey, JSON.stringify(history));
  }
}
export const createEncouragements = () => new RotatingThoughts(encouragingThoughts, new BrowserThoughtHistory());
