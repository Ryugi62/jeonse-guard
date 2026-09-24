import type { Citation } from './statute.ts';
import type { Severity } from './finding.ts';
import { t2, type Text2 } from './text.ts';
import { CITE, NO_LIEN_CLAUSE } from './citations.ts';

/**
 * The closed taxonomy of special-term (특약) clause types Jeonse Guard can judge.
 * Citations live here, not in any model output: an AI classifier may only pick an id.
 */
export interface ClausePattern {
  id: string;
  severity: Severity;
  title: Text2;
  explanation: Text2;
  action: Text2 | null;
  citations: Citation[];
  /** Short description given to the AI classifier. */
  definition: string;
  suggestedClause?: Text2;
  match: (text: string) => boolean;
}

const any = (...res: RegExp[]) => (text: string) => res.some((re) => re.test(text));

/** Lease-term months written in a clause, ignoring calendar dates like "2026년 10월". */
export function termMonths(text: string): number | null {
  if (!/(기간|term|period)/i.test(text)) return null;
  const words: Record<string, number> = { one: 1, two: 2, three: 3, six: 6, twelve: 12, eighteen: 18 };
  const ko = [...text.matchAll(/(\d+)\s*(개월|년)(?!\s*\d+\s*월)/g)];
  for (const m of ko) {
    const n = Number(m[1]);
    if (m[2] === '년' && n > 50) continue;
    return m[2] === '년' ? n * 12 : n;
  }
  const en = /\b(\d+|one|two|three|six|twelve|eighteen)[\s-]*(months?|years?)\b/i.exec(text);
  if (en) {
    const n = /\d/.test(en[1]!) ? Number(en[1]) : words[en[1]!.toLowerCase()]!;
    return /year/i.test(en[2]!) ? n * 12 : n;
  }
  return null;
}

export const CLAUSE_PATTERNS: ClausePattern[] = [
  {
    id: 'no-lien-until-next-day',
    severity: 'ok',
    title: t2('Good: no new mortgage until your protection starts', '좋아요: 보호가 시작될 때까지 새 근저당을 막는 특약이에요'),
    explanation: t2(
      'Art. 3(1): your lease binds third parties from the day after move-in and resident registration. This clause keeps the lessor from registering anything before then.',
      '제3조제1항: 인도와 주민등록을 마친 다음 날부터 제3자에게 효력이 생겨요. 이 특약은 그 전까지 집주인이 권리를 설정하지 못하게 막아요.',
    ),
    action: t2('Still check the registry again on the day you pay the balance.', '그래도 잔금 날 등기부등본을 한 번 더 확인하세요.'),
    citations: [CITE.art3NextDay],
    definition: 'The lessor promises not to create any mortgage/lien/right on the home until the day after the tenant moves in or registers.',
    match: any(
      /(다음\s*날|다음날|익일)[^.]{0,15}(까지|전까지|전에는)[^.]{0,30}(근저당|담보|권리|저당)[^.]{0,20}(설정하지|하지\s*않|아니한다|않는다)/,
      /\b(not|no)\b[^.]{0,40}\b(mortgage|lien|security right)s?\b[^.]{0,60}\b(day after|following day)\b/i,
    ),
  },
  {
    id: 'waive-renewal-right',
    severity: 'stop',
    title: t2('This clause tries to waive your renewal right', '계약갱신요구권을 포기시키는 특약이에요'),
    explanation: t2(
      'Art. 6-3(1): if you request renewal in time, the lessor may not refuse without a listed reason. Art. 10: an agreement that violates this Act to the tenant’s disadvantage has no effect.',
      '제6조의3제1항: 기간 안에 갱신을 요구하면 집주인은 정당한 사유 없이 거절하지 못해요. 제10조: 이 법에 위반되어 임차인에게 불리한 약정은 효력이 없어요.',
    ),
    action: t2('Ask to delete this clause before signing.', '서명 전에 이 특약을 빼 달라고 요청하세요.'),
    citations: [CITE.art6_3Renewal, CITE.art10Mandatory],
    definition: 'The tenant gives up, promises not to use, or cannot use the right to request a contract renewal (계약갱신요구권).',
    match: any(
      /(계약\s*갱신\s*(요구|청구)권|갱신\s*(요구|청구)권)[^.]{0,15}(포기|행사하지|행사\s*하지|없)/,
      /(갱신|재계약)[^.]{0,12}(요구|청구)[^.]{0,10}(하지\s*않|할\s*수\s*없|못한다|포기)/,
      /\bwaive[sd]?\b[^.]{0,40}\brenew/i,
      /\bnot\b[^.]{0,20}\b(exercise|request)[^.]{0,30}\brenew/i,
    ),
  },
  {
    id: 'delay-move-in-registration',
    severity: 'stop',
    title: t2('This clause delays your move-in registration', '전입신고를 늦추게 하는 특약이에요'),
    explanation: t2(
      'Art. 3(1): protection starts only the day after move-in and resident registration, so every day of delay is a day a new mortgage or sale can come first. Art. 8(1): small-deposit priority also requires registration before an auction is registered.',
      '제3조제1항: 보호는 인도와 주민등록을 마친 다음 날부터 시작돼요. 늦추는 만큼 새 근저당이나 매매가 먼저 들어올 수 있어요. 제8조제1항: 최우선변제도 경매신청 등기 전에 요건을 갖춰야 해요.',
    ),
    action: t2('Do not accept a delay. Register your move-in on the day you get the keys.', '늦추는 조건은 받아들이지 마세요. 열쇠 받는 날 전입신고를 하세요.'),
    citations: [CITE.art3NextDay, CITE.art8BeforeAuction],
    definition: 'The tenant must postpone, delay, or not file the move-in/resident registration (전입신고, 주민등록) for some time or until a lessor event.',
    match: any(
      /(전입(신고)?|주민등록(\s*이전)?)[^.]{0,20}(하지\s*않|미룬|미루|유예|늦추|연기)/,
      /(\d+\s*(일|주|개월|달)|며칠|일주일|한\s*달)[^.]{0,8}(후|뒤|이후)에?\s*(전입|주민등록)/,
      /\btenant\b[^.]{0,30}\b(not|postpone|delay|defer)\b[^.]{0,25}\b(register|registration|move-in report)/i,
    ),
  },
  {
    id: 'lessor-may-add-lien',
    severity: 'stop',
    title: t2('This clause lets the lessor add a mortgage after you sign', '계약 후 집주인이 근저당을 더 잡을 수 있게 하는 특약이에요'),
    explanation: t2(
      'Art. 3-2(2) gives you priority only over creditors ranked after you, and Art. 3(1) protection starts the day after move-in registration. A mortgage registered before then is not behind you.',
      '제3조의2제2항은 나보다 뒤 순위 채권자보다만 우선하게 해 줘요. 제3조제1항의 보호는 전입 다음 날부터예요. 그 전에 설정된 근저당은 내 뒤에 있지 않아요.',
    ),
    action: t2('Ask to replace it with the suggested term below.', '아래 추천 특약으로 바꿔 달라고 요청하세요.'),
    citations: [CITE.art3_2Priority, CITE.art3NextDay],
    suggestedClause: NO_LIEN_CLAUSE,
    definition: 'The lessor may take a new loan, mortgage, or lien secured on the home after the contract, or the tenant consents to one.',
    match: any(
      /(담보|근저당|대출)[^.]{0,20}(받을\s*수\s*있|설정할\s*수\s*있|설정에\s*동의|동의한다|가능하다)/,
      /\b(lessor|landlord|owner)\b[^.]{0,30}\b(may|can|reserves the right to)\b[^.]{0,40}\b(mortgage|loan|lien|refinanc)/i,
    ),
  },
  {
    id: 'deposit-after-new-tenant',
    severity: 'caution',
    title: t2('Your deposit return depends on a new tenant', '보증금 반환이 다음 세입자에게 달려 있어요'),
    explanation: t2(
      'Art. 4(2): even after the term ends, the lease is deemed to continue until you get your deposit back. Art. 3-3(1): if it is not returned after the lease ends, you can apply to the court for a leasehold registration order.',
      '제4조제2항: 기간이 끝나도 보증금을 받을 때까지 임대차가 존속하는 것으로 봐요. 제3조의3제1항: 끝난 뒤 돌려받지 못하면 법원에 임차권등기명령을 신청할 수 있어요.',
    ),
    action: t2('Ask for a fixed return date instead — for example, the last day of the term.', '대신 날짜를 정해 달라고 하세요 — 예: 계약 만료일.'),
    citations: [CITE.art4Continues, CITE.art3_3Order],
    definition: 'Return of the deposit is conditioned on finding, moving in, or receiving money from a new/next tenant.',
    match: any(
      /(새로운|새|신규|다음|후속)\s*(임차인|세입자)[^.]{0,30}(보증금|반환|돌려)/,
      /보증금[^.]{0,20}(반환|돌려)[^.]{0,20}(새로운|새|신규|다음|후속)\s*(임차인|세입자)/,
      /\bdeposit\b[^.]{0,60}\b(new|next|incoming|following)\s+(tenant|lessee|renter)/i,
      /\b(new|next|incoming|following)\s+(tenant|lessee|renter)\b[^.]{0,60}\bdeposit/i,
    ),
  },
  {
    id: 'evict-on-sale',
    severity: 'stop',
    title: t2('This clause ends your lease if the home is sold', '집이 팔리면 나가야 한다는 특약이에요'),
    explanation: t2(
      'Art. 3(4): whoever acquires the leased home is deemed to take over the lessor’s position. Art. 10: an agreement that violates this Act to the tenant’s disadvantage has no effect.',
      '제3조제4항: 집을 산 사람은 임대인의 지위를 승계한 것으로 봐요. 제10조: 이 법에 위반되어 임차인에게 불리한 약정은 효력이 없어요.',
    ),
    action: t2('Ask to delete this clause before signing.', '서명 전에 이 특약을 빼 달라고 요청하세요.'),
    citations: [CITE.art3Transferee, CITE.art10Mandatory],
    definition: 'If the home is sold or ownership changes, the tenant must leave or the lease ends.',
    match: any(
      /(매도|매매|팔리|팔면|소유자가?\s*바뀌|소유권\s*이전)[^.]{0,25}(퇴거|비워|종료|해지|나가)/,
      /\b(sold|sale|sells)\b[^.]{0,40}\b(vacate|terminat|move out|leave)/i,
    ),
  },
  {
    id: 'short-term',
    severity: 'info',
    title: t2('A term under 2 years counts as 2 years — if you want', '2년 미만 계약도 원하면 2년으로 봐요'),
    explanation: t2(
      'Art. 4(1): a lease with no term or a term under 2 years is deemed to be 2 years, but the tenant may claim the shorter term is valid.',
      '제4조제1항: 기간을 정하지 않았거나 2년 미만이면 2년으로 봐요. 다만 임차인은 짧은 기간이 유효하다고 주장할 수 있어요.',
    ),
    action: null,
    citations: [CITE.art4TwoYears],
    definition: 'The lease term stated in the clause is shorter than 24 months.',
    match: (text) => {
      const m = termMonths(text);
      return m !== null && m < 24;
    },
  },
];

export const CLAUSE_IDS = CLAUSE_PATTERNS.map((p) => p.id);
export const patternById = (id: string) => CLAUSE_PATTERNS.find((p) => p.id === id);

/** Rule-based matcher (precision first). Returns matching pattern ids in taxonomy order. */
export function matchClausePatterns(text: string): string[] {
  const hits = CLAUSE_PATTERNS.filter((p) => p.match(text)).map((p) => p.id);
  // A clause that promises "no mortgage until the next day" is never also a permission to add one.
  return hits.includes('no-lien-until-next-day') ? hits.filter((h) => h !== 'lessor-may-add-lien') : hits;
}
