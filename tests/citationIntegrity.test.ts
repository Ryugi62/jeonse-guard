import { describe, expect, it } from 'vitest';
import { allLibraryCitations } from '../src/domain/library.ts';
import { verifyCitation } from '../src/domain/statute.ts';
import { loadSnapshotCorpus } from '../src/adapters/snapshotSource.ts';
import { fixtureCorpus } from './helpers.ts';

describe('AC-3 citation integrity (S1: 100% of shipped citations verify)', () => {
  const cites = allLibraryCitations();

  it('the library is not trivially empty', () => {
    expect(cites.length).toBeGreaterThanOrEqual(20);
  });

  it.each([
    ['fixture corpus (API payload captured 2026-09-24)', fixtureCorpus()],
    ['shipped snapshot', loadSnapshotCorpus()],
  ])('every citation verifies against the %s', (_name, corpus) => {
    const failed = cites.filter((c) => verifyCitation(c, corpus) === null);
    expect(failed).toEqual([]);
  });

  it.each([
    ['fixture corpus', fixtureCorpus()],
    ['shipped snapshot', loadSnapshotCorpus()],
  ])('AC-15 every citation carries an English quote found in the official translation (%s)', (_name, corpus) => {
    const missing = cites.filter((c) => !verifyCitation(c, corpus)?.quoteEnFound);
    expect(missing).toEqual([]);
  });
});
