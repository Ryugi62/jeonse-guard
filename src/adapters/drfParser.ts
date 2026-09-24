import type { Article, ArticleNo, LawId, Statute } from '../domain/statute.ts';

/**
 * Adapter for the law.go.kr Open API (DRF) JSON payloads:
 *   Korean text:            lawService.do?target=law&type=JSON&MST=…
 *   Official English text:  lawService.do?target=elaw&type=JSON&MST=…
 */
type Json = any;

const asArray = <T>(v: T | T[] | undefined | null): T[] => (v == null ? [] : Array.isArray(v) ? v : [v]);
const ymd = (s: string | undefined | null) => (s && /^\d{8}$/.test(s) ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : '');
const flat = (v: unknown): string[] => (Array.isArray(v) ? v.flatMap(flat) : typeof v === 'string' ? [v] : []);

function koArticleText(unit: Json): string {
  const lines: string[] = [String(unit['조문내용'] ?? '').trim()];
  for (const hang of asArray(unit['항'])) {
    if (hang?.['항내용']) lines.push(String(hang['항내용']).trim());
    for (const ho of asArray(hang?.['호'])) {
      if (ho?.['호내용']) lines.push(String(ho['호내용']).trim());
      for (const mok of asArray(ho?.['목'])) if (mok?.['목내용']) lines.push(...flat(mok['목내용']).map((x) => x.trim()));
    }
  }
  return lines.filter(Boolean).join('\n');
}

const articleKey = (main: string | number, branch?: string | number | null): ArticleNo => {
  const b = branch == null || branch === '' ? 0 : Number(branch);
  return b ? `${Number(main)}-${b}` : `${Number(main)}`;
};

export function parseKorean(payload: Json): { nameKo: string; effectiveDate: string; articles: Record<ArticleNo, Article> } {
  const law = payload['법령'];
  if (!law) throw new Error('Not a DRF Korean law payload');
  const info = law['기본정보'];
  const articles: Record<ArticleNo, Article> = {};
  for (const unit of asArray(law['조문']?.['조문단위'])) {
    if (unit['조문여부'] !== '조문') continue;
    const head = String(unit['조문내용'] ?? '');
    if (/^제\d+조(의\d+)?\s*삭제/.test(head)) continue;
    const no = articleKey(unit['조문번호'], unit['조문가지번호']);
    articles[no] = { no, titleKo: String(unit['조문제목'] ?? ''), titleEn: null, textKo: koArticleText(unit), textEn: null };
  }
  for (const add of asArray(law['부칙']?.['부칙단위'])) {
    const date = String(add['부칙공포일자'] ?? '');
    for (const line of flat(add['부칙내용'])) {
      const m = /^\s*제(\d+)조\(([^)]*)\)/.exec(line);
      if (!m || !/^\d{8}$/.test(date)) continue;
      const no = `A${date}-${m[1]}`;
      articles[no] = { no, titleKo: `부칙 제${m[1]}조(${m[2]})`, titleEn: null, textKo: line.trim(), textEn: null };
    }
  }
  return { nameKo: String(info['법령명_한글']), effectiveDate: ymd(info['시행일자']), articles };
}

export function parseEnglish(payload: Json): { nameEn: string; versionDate: string; articles: Record<ArticleNo, { titleEn: string | null; textEn: string }> } {
  const law = payload['Law'];
  if (!law) throw new Error('Not a DRF English law payload');
  const articles: Record<ArticleNo, { titleEn: string | null; textEn: string }> = {};
  for (const jo of asArray(law['JoSection']?.['Jo'])) {
    if (jo['joYn'] !== 'Y') continue;
    const no = articleKey(jo['joNo'], jo['joBrNo']);
    const title = jo['joTtl'];
    articles[no] = { titleEn: title && title !== 'null' ? String(title) : null, textEn: String(jo['joCts'] ?? '').trim() };
  }
  for (const ar of asArray(law['ArSection']?.['Ar'])) {
    const date = String(ar['arAncYd'] ?? '');
    const text = String(ar['arCts'] ?? '');
    const parts = [...text.matchAll(/Article (\d+) \(([^)]*)\)/g)];
    parts.forEach((m, i) => {
      const end = i + 1 < parts.length ? parts[i + 1]!.index : text.length;
      articles[`A${date}-${m[1]}`] = { titleEn: m[2] ?? null, textEn: text.slice(m.index, end).trim() };
    });
  }
  return { nameEn: String(law['InfSection']?.['lsNmEng'] ?? ''), versionDate: ymd(law['InfSection']?.['ancYd']), articles };
}

export function buildStatute(lawId: LawId, koPayload: Json, enPayload: Json | null, mst: string): Statute {
  const ko = parseKorean(koPayload);
  const en = enPayload ? parseEnglish(enPayload) : null;
  const articles: Record<ArticleNo, Article> = {};
  for (const [no, a] of Object.entries(ko.articles)) {
    const e = en?.articles[no];
    articles[no] = { ...a, titleEn: e?.titleEn ?? null, textEn: e?.textEn ?? null };
  }
  return {
    lawId,
    nameKo: ko.nameKo,
    nameEn: en?.nameEn ?? '',
    mst,
    effectiveDate: ko.effectiveDate,
    enVersionDate: en?.versionDate || null,
    articles,
  };
}
