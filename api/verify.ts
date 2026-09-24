// GET /api/verify — compares every article the rules cite with the live official text on law.go.kr.
import type { IncomingMessage, ServerResponse } from 'node:http';
import { loadSnapshot } from '../src/adapters/snapshotSource.ts';
import { fetchKoreanStatute } from '../src/adapters/lawGoKr.ts';
import { allLibraryCitations } from '../src/domain/library.ts';
import { diffArticles, type LawId } from '../src/domain/statute.ts';
import { sendJson } from './_http.ts';

export default async function handler(_req: IncomingMessage, res: ServerResponse) {
  const snap = loadSnapshot();
  const cited: Record<LawId, string[]> = { hlpa: [], 'hlpa-decree': [] };
  for (const c of allLibraryCitations()) if (!cited[c.lawId].includes(c.article)) cited[c.lawId].push(c.article);
  const oc = process.env.LAW_OC || 'test';
  try {
    const laws = await Promise.all(
      (Object.keys(cited) as LawId[]).map(async (lawId) => {
        const live = await fetchKoreanStatute(lawId, { oc, timeoutMs: 7000 });
        return { lawId, snapshotMst: snap.corpus[lawId].mst, liveMst: live.mst, articles: diffArticles(snap.corpus[lawId], live, cited[lawId]) };
      }),
    );
    const drifted = laws.flatMap((l) => l.articles.filter((a) => !a.match).map((a) => ({ lawId: l.lawId, article: a.article })));
    sendJson(
      res,
      200,
      { checkedAt: new Date().toISOString(), ok: drifted.length === 0, drifted, snapshotFetchedAt: snap.fetchedAt, laws },
      { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=86400' },
    );
  } catch (e) {
    sendJson(res, 502, { error: 'law.go.kr did not answer', detail: e instanceof Error ? e.message : String(e) }, { 'Cache-Control': 'no-store' });
  }
}
