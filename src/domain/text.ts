/** A user-facing sentence in both UI languages. */
export interface Text2 {
  en: string;
  ko: string;
}

export const t2 = (en: string, ko: string): Text2 => ({ en, ko });

/** ₩85,000,000 — digits grouped, no rounding. */
export function formatWon(amount: number): string {
  const n = Math.max(0, Math.round(amount));
  return '₩' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** 8,500만원 / 1억 1,500만원 — Korean reading of an amount. */
export function formatWonKo(amount: number): string {
  const n = Math.max(0, Math.round(amount));
  const eok = Math.floor(n / 100_000_000);
  const man = Math.floor((n % 100_000_000) / 10_000);
  const rest = n % 10_000;
  const group = (x: number) => x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const parts: string[] = [];
  if (eok) parts.push(`${group(eok)}억`);
  if (man) parts.push(`${group(man)}만`);
  if (rest || parts.length === 0) parts.push(group(rest));
  return parts.join(' ') + '원';
}

/** Parses Korean statute amounts like "1억6천500만원" or "5천500만원" into KRW. */
export function parseKoreanWon(s: string): number | null {
  const m = /^(?:(\d+)억)?(?:(\d+)천)?(?:(\d+))?만원$/.exec(s.replace(/\s+/g, ''));
  if (!m || (!m[1] && !m[2] && !m[3])) return null;
  const eok = Number(m[1] ?? 0);
  const cheon = Number(m[2] ?? 0);
  const man = Number(m[3] ?? 0);
  return eok * 100_000_000 + (cheon * 1000 + man) * 10_000;
}
