import type { Citation } from './statute.ts';
import type { Region } from './lease.ts';
import type { Text2 } from './text.ts';
import { CLAUSE_PATTERNS } from './clauses.ts';
import { CITE, decree } from './citations.ts';

export { CITE };

export interface SmallDepositRow {
  name: Text2;
  /** Decree Art. 11: deposits at or below this qualify. */
  limit: number;
  limitQuote: Citation;
  /** Decree Art. 10(1): the protected part is at most this. */
  cap: number;
  capQuote: Citation;
}

/**
 * Decree Art. 10(1) and 11 thresholds by region. The amounts are also embedded in the quotes,
 * so the integrity test proves the numbers used in the math equal the official text.
 */
export const SMALL_DEPOSIT: Record<Region, SmallDepositRow> = {
  seoul: {
    name: { en: 'Seoul', ko: '서울특별시' },
    limit: 165_000_000,
    limitQuote: decree('11', '1. 서울특별시: 1억6천500만원', 'Seoul Special Metropolitan City: 165 million won'),
    cap: 55_000_000,
    capQuote: decree('10', '1. 서울특별시: 5천500만원', 'Seoul Special Metropolitan City: 55 million won'),
  },
  overcrowding: {
    name: { en: 'the capital-region overcrowding control areas, Sejong, Yongin, Hwaseong and Gimpo', ko: '과밀억제권역·세종·용인·화성·김포' },
    limit: 145_000_000,
    limitQuote: decree('11', '세종특별자치시, 용인시, 화성시 및 김포시: 1억4천500만원', 'Sejong City, Yongin-si, Hwaseong-si, and Gimpo-si: 145 million won'),
    cap: 48_000_000,
    capQuote: decree('10', '세종특별자치시, 용인시, 화성시 및 김포시: 4천800만원', 'Sejong City, Yongin-si, Hwaseong-si, and Gimpo-si: 48 million won'),
  },
  metro: {
    name: { en: 'metropolitan cities, Ansan, Gwangju (Gyeonggi), Paju, Icheon and Pyeongtaek', ko: '광역시·안산·광주·파주·이천·평택' },
    limit: 85_000_000,
    limitQuote: decree('11', '안산시, 광주시, 파주시, 이천시 및 평택시: 8천500만원', 'Ansan-si, Gwangju-si, Paju-si, Icheon-si, and Pyeongtaek-si: 85 million won'),
    cap: 28_000_000,
    capQuote: decree('10', '안산시, 광주시, 파주시, 이천시 및 평택시: 2천800만원', 'Ansan-si, Gwangju-si, Paju-si, Icheon-si, and Pyeongtaek-si: 28 million won'),
  },
  other: {
    name: { en: 'other areas', ko: '그 밖의 지역' },
    limit: 75_000_000,
    limitQuote: decree('11', '4. 그 밖의 지역: 7천500만원', 'Other areas: 75 million won'),
    cap: 25_000_000,
    capQuote: decree('10', '4. 그 밖의 지역: 2천500만원', 'Other areas: 25 million won'),
  },
};

/** The date the current Decree Art. 10(1)/11 thresholds took effect (Addendum 2023-02-21). */
export const THRESHOLDS_SINCE = '2023-02-21';

export function allLibraryCitations(): Citation[] {
  return [
    ...Object.values(CITE),
    ...Object.values(SMALL_DEPOSIT).flatMap((r) => [r.limitQuote, r.capQuote]),
    ...CLAUSE_PATTERNS.flatMap((p) => p.citations),
  ];
}
