import type { Corpus } from '../domain/statute.ts';
import snapshot from './snapshot/statutes.json' with { type: 'json' };

export interface Snapshot {
  fetchedAt: string;
  source: string;
  corpus: Corpus;
}

export const loadSnapshot = (): Snapshot => snapshot as unknown as Snapshot;
export const loadSnapshotCorpus = (): Corpus => loadSnapshot().corpus;
