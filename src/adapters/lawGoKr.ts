import type { LawId, Statute } from '../domain/statute.ts';
import { buildStatute } from './drfParser.ts';

export type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

/** The two laws in the corpus, by their law.go.kr names. */
export const LAWS: Record<LawId, { nameKo: string; lawIdGov: string }> = {
  hlpa: { nameKo: '주택임대차보호법', lawIdGov: '001248' },
  'hlpa-decree': { nameKo: '주택임대차보호법 시행령', lawIdGov: '004950' },
};

const BASE = 'https://www.law.go.kr/DRF';

export interface LawGoKrOptions {
  oc: string;
  fetcher?: Fetcher;
  timeoutMs?: number;
}

async function getJson(url: string, fetcher: Fetcher, timeoutMs: number): Promise<any> {
  const res = await fetcher(url, { signal: AbortSignal.timeout(timeoutMs), headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`law.go.kr HTTP ${res.status}`);
  const text = await res.text();
  if (!text.trim().startsWith('{')) throw new Error('law.go.kr returned a non-JSON page');
  return JSON.parse(text);
}

/** Finds the current version serial (MST) of a law and of its official English translation. */
export async function findVersions(lawId: LawId, o: LawGoKrOptions): Promise<{ mst: string; enMst: string | null }> {
  const f = o.fetcher ?? fetch;
  const t = o.timeoutMs ?? 8000;
  const { nameKo, lawIdGov } = LAWS[lawId];
  const q = encodeURIComponent(nameKo);
  const ko = await getJson(`${BASE}/lawSearch.do?OC=${o.oc}&target=law&type=JSON&query=${q}`, f, t);
  const koRows: any[] = [].concat(ko?.LawSearch?.law ?? []);
  const cur = koRows.find((r) => r['법령ID'] === lawIdGov && r['현행연혁코드'] === '현행');
  if (!cur) throw new Error(`current version of ${nameKo} not found`);
  const en = await getJson(`${BASE}/lawSearch.do?OC=${o.oc}&target=elaw&type=JSON&query=${q}`, f, t);
  const enRows: any[] = [].concat(en?.LawSearch?.law ?? []).filter((r: any) => r['법령ID'] === lawIdGov);
  enRows.sort((a, b) => String(b['공포일자']).localeCompare(String(a['공포일자'])));
  return { mst: String(cur['법령일련번호']), enMst: enRows[0] ? String(enRows[0]['법령일련번호']) : null };
}

export async function fetchStatute(lawId: LawId, o: LawGoKrOptions, versions?: { mst: string; enMst: string | null }): Promise<Statute> {
  const f = o.fetcher ?? fetch;
  const t = o.timeoutMs ?? 8000;
  const v = versions ?? (await findVersions(lawId, o));
  const ko = await getJson(`${BASE}/lawService.do?OC=${o.oc}&target=law&type=JSON&MST=${v.mst}`, f, t);
  const en = v.enMst ? await getJson(`${BASE}/lawService.do?OC=${o.oc}&target=elaw&type=JSON&MST=${v.enMst}`, f, t) : null;
  return buildStatute(lawId, ko, en, v.mst);
}

/** Korean text only (used by the live drift check): 2 requests per law. */
export async function fetchKoreanStatute(lawId: LawId, o: LawGoKrOptions): Promise<Statute> {
  const f = o.fetcher ?? fetch;
  const t = o.timeoutMs ?? 8000;
  const { nameKo, lawIdGov } = LAWS[lawId];
  const ko = await getJson(`${BASE}/lawSearch.do?OC=${o.oc}&target=law&type=JSON&query=${encodeURIComponent(nameKo)}`, f, t);
  const rows: any[] = [].concat(ko?.LawSearch?.law ?? []);
  const cur = rows.find((r) => r['법령ID'] === lawIdGov && r['현행연혁코드'] === '현행');
  if (!cur) throw new Error(`current version of ${nameKo} not found`);
  const mst = String(cur['법령일련번호']);
  const body = await getJson(`${BASE}/lawService.do?OC=${o.oc}&target=law&type=JSON&MST=${mst}`, f, t);
  return buildStatute(lawId, body, null, mst);
}
