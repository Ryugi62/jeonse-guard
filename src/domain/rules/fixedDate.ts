import type { CandidateFinding } from '../finding.ts';
import { CITE } from '../citations.ts';
import { t2 } from '../text.ts';

export function fixedDateRule(): CandidateFinding {
  return {
    id: 'fixed-date',
    severity: 'info',
    title: t2('Get a fixed date (확정일자) on the contract the day you sign', '계약한 날 계약서에 확정일자를 받으세요'),
    explanation: t2(
      'Art. 3-2(2): repayment priority needs both move-in registration and a fixed date on the lease contract. Art. 3-6(1): community service centers, registry offices, courts and notaries grant it.',
      '제3조의2제2항: 우선변제를 받으려면 대항요건(인도·전입)과 계약서상 확정일자가 모두 필요해요. 제3조의6제1항: 주민센터·등기소·법원·공증인이 부여해요.',
    ),
    action: t2('Bring the signed contract to the community service center, or use the online registry office.', '서명한 계약서를 들고 주민센터에 가거나 인터넷등기소에서 받으세요.'),
    citations: [CITE.art3_2FixedDate, CITE.art3_6Where],
    source: 'rule',
  };
}
