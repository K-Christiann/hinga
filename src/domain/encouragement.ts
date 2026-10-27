export interface EncouragingThought {
  readonly id: string;
  readonly message: string;
  readonly verse: {
    readonly reference: string;
    readonly text: string;
    readonly source: string;
    readonly excerpt?: boolean;
  };
}

/** Public content only. No account, mood or journal data enters this boundary. */
export interface ThoughtProvider {
  current(): EncouragingThought;
  next(): EncouragingThought;
}
export interface ThoughtHistory {
  read(): unknown;
  write(history: { lastId: string; remaining: string[] }): void;
}
