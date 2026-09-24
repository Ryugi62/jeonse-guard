import type { CandidateFinding } from '../finding.ts';
import { CITE, NO_LIEN_CLAUSE } from '../citations.ts';
import { t2 } from '../text.ts';

export function opposingPowerRule(hasNoLienClause: boolean): CandidateFinding {
  if (hasNoLienClause) {
    return {
      id: 'opposing-power-next-day',
      severity: 'ok',
      title: t2('Good: your contract closes the next-day gap', '좋아요: 특약이 ‘다음 날’ 공백을 막고 있어요'),
      explanation: t2(
        'Art. 3(1): protection starts the day after move-in and resident registration. Your special term forbids new mortgages until then.',
        '제3조제1항: 보호는 인도와 주민등록을 마친 다음 날부터예요. 특약이 그때까지 새 근저당을 막고 있어요.',
      ),
      action: t2('Still re-check the registry on the day you pay the balance.', '그래도 잔금 날 등기부등본을 다시 확인하세요.'),
      citations: [CITE.art3NextDay],
      source: 'rule',
    };
  }
  return {
    id: 'opposing-power-next-day',
    severity: 'caution',
    title: t2('Your protection starts the day AFTER move-in registration', '보호는 전입신고 ‘다음 날’부터 시작돼요'),
    explanation: t2(
      'Art. 3(1): the lease takes effect against third parties from the day after you take the home and complete resident registration. Anything the lessor registers before then — even on your move-in day — was registered before your protection began. Art. 3-2(2) puts you ahead only of creditors ranked after you.',
      '제3조제1항: 주택을 인도받고 주민등록을 마친 다음 날부터 제3자에게 효력이 생겨요. 그 전에 — 이사 당일이라도 — 집주인이 설정한 권리는 내 보호보다 먼저예요. 제3조의2제2항은 나보다 뒤 순위 채권자보다만 우선하게 해 줘요.',
    ),
    action: t2(
      'Add the suggested term below, and re-check the registry on the day you pay the balance.',
      '아래 추천 특약을 넣고, 잔금 날 등기부등본을 다시 확인하세요.',
    ),
    suggestedClause: NO_LIEN_CLAUSE,
    citations: [CITE.art3NextDay, CITE.art3_2Priority],
    source: 'rule',
  };
}
