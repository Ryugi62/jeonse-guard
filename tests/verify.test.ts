import { describe, expect, it } from 'vitest';
import { diffArticles } from '../src/domain/statute.ts';
import { fixtureCorpus } from './helpers.ts';

describe('UC-3 law drift check', () => {
  it('reports a match when live text equals the snapshot', () => {
    const c = fixtureCorpus();
    const d = diffArticles(c.hlpa, c.hlpa, ['3', '3-2']);
    expect(d.every((x) => x.match)).toBe(true);
  });
  it('flags an article whose live text changed and a vanished article', () => {
    const c = fixtureCorpus();
    const live = structuredClone(c.hlpa);
    live.articles['3']!.textKo = live.articles['3']!.textKo.replace('그 다음 날부터', '그 날부터');
    delete live.articles['3-2'];
    const d = diffArticles(c.hlpa, live, ['3', '3-2', '4']);
    expect(d).toEqual([
      { article: '3', match: false },
      { article: '3-2', match: false },
      { article: '4', match: true },
    ]);
  });
});
