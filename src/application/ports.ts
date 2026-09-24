import type { Corpus } from '../domain/statute.ts';

/** Loads the statute corpus (snapshot or live). */
export interface StatuteSource {
  load(): Promise<Corpus>;
}

/** Maps each clause to one taxonomy id, or null. May return ids outside the taxonomy — callers must check. */
export interface ClauseClassifier {
  classify(clauses: string[]): Promise<Record<string, string | null>>;
}

export type AiLabels = Record<string, string | null>;
