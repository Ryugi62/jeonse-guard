import type { Text2 } from './text.ts';

export type LawId = 'hlpa' | 'hlpa-decree';

/** "3", "3-2" (Article 3-2), or "A20230221-2" (Addendum of 2023-02-21, Article 2). */
export type ArticleNo = string;

export interface Article {
  no: ArticleNo;
  titleKo: string;
  titleEn: string | null;
  textKo: string;
  textEn: string | null;
}

export interface Statute {
  lawId: LawId;
  nameKo: string;
  nameEn: string;
  /** law.go.kr version serial (법령일련번호). */
  mst: string;
  effectiveDate: string;
  /** Promulgation date of the version the official English translation was made from. */
  enVersionDate: string | null;
  articles: Record<ArticleNo, Article>;
}

export type Corpus = Record<LawId, Statute>;

/** A pointer into the statute plus a quote that must appear verbatim in the Korean text. */
export interface Citation {
  lawId: LawId;
  article: ArticleNo;
  quote: string;
  /** The same passage in the official English translation, highlighted when found (Korean stays authoritative). */
  quoteEn?: string;
}

export interface VerifiedCitation extends Citation {
  lawNameKo: string;
  lawNameEn: string;
  label: Text2;
  articleTitleKo: string;
  articleTitleEn: string | null;
  textKo: string;
  textEn: string | null;
  url: string;
  effectiveDate: string;
  mst: string;
  enVersionDate: string | null;
  /** True when quoteEn was found in the official English translation. */
  quoteEnFound: boolean;
}

const MIN_QUOTE = 6;

/** Whitespace-insensitive comparison key. */
export const normalize = (s: string): string => s.replace(/\s+/g, '');

export function articleLabel(no: ArticleNo): Text2 {
  const add = /^A(\d{4})(\d{2})(\d{2})-(\d+)$/.exec(no);
  if (add) {
    const [, y, m, d, a] = add;
    const months = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.'];
    return {
      en: `Addendum (${months[Number(m) - 1]} ${Number(d)}, ${y}) Art. ${a}`,
      ko: `부칙(${y}.${Number(m)}.${Number(d)}) 제${a}조`,
    };
  }
  const [main, branch] = no.split('-');
  return { en: `Art. ${no}`, ko: branch ? `제${main}조의${branch}` : `제${main}조` };
}

export function articleUrl(statute: Statute, no: ArticleNo): string {
  const name = statute.nameKo.replace(/\s+/g, '');
  if (no.startsWith('A')) return `https://www.law.go.kr/법령/${name}`;
  return `https://www.law.go.kr/법령/${name}/${articleLabel(no).ko}`;
}

export function verifyCitation(c: Citation, corpus: Corpus): VerifiedCitation | null {
  const statute = corpus[c.lawId];
  const article = statute?.articles[c.article];
  const q = normalize(c.quote);
  if (!statute || !article || q.length < MIN_QUOTE) return null;
  if (!normalize(article.textKo).includes(q)) return null;
  return {
    ...c,
    lawNameKo: statute.nameKo,
    lawNameEn: statute.nameEn,
    label: articleLabel(c.article),
    articleTitleKo: article.titleKo,
    articleTitleEn: article.titleEn,
    textKo: article.textKo,
    textEn: article.textEn,
    url: articleUrl(statute, c.article),
    effectiveDate: statute.effectiveDate,
    mst: statute.mst,
    enVersionDate: statute.enVersionDate,
    quoteEnFound: !!c.quoteEn && !!article.textEn && normalize(article.textEn).includes(normalize(c.quoteEn)),
  };
}

/** Law-drift check: does the live Korean text of each article still equal the snapshot? */
export function diffArticles(snapshot: Statute, live: Statute, articles: ArticleNo[]): { article: ArticleNo; match: boolean }[] {
  return articles.map((no) => {
    const a = snapshot.articles[no];
    const b = live.articles[no];
    return { article: no, match: !!a && !!b && normalize(a.textKo) === normalize(b.textKo) };
  });
}
