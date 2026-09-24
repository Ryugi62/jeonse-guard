import type { CandidateFinding } from '../finding.ts';
import type { LeaseFacts } from '../lease.ts';
import { CITE } from '../citations.ts';
import { t2 } from '../text.ts';

export function lessorDisclosureRule(f: Pick<LeaseFacts, 'lessorShowedTaxCertificates' | 'lessorShowedFixedDateInfo'>): CandidateFinding {
  const states = [f.lessorShowedTaxCertificates, f.lessorShowedFixedDateInfo];
  const explanation = t2(
    'Art. 3-7: when signing, the lessor must show you (1) the home’s fixed-date, rent and deposit information and (2) national and local tax payment certificates — or consent to you viewing them.',
    '제3조의7: 계약할 때 임대인은 (1) 해당 주택의 확정일자 부여일·차임·보증금 정보와 (2) 국세·지방세 납세증명서를 임차인에게 제시해야 해요(열람 동의로 갈음 가능).',
  );
  const citations = [CITE.art3_7Duty, CITE.art3_7FixedInfo, CITE.art3_7Tax];
  const base = { id: 'lessor-disclosure', explanation, citations, source: 'rule' as const };
  if (states.includes('no')) {
    return {
      ...base,
      severity: 'stop',
      title: t2('The lessor hasn’t shown what the law requires', '집주인이 법이 정한 정보를 보여주지 않았어요'),
      action: t2('Ask for both before paying anything. A lessor who refuses a legal duty is a reason to walk away.', '돈을 보내기 전에 두 가지를 요구하세요. 법적 의무를 거부한다면 계약하지 않는 편이 안전해요.'),
    };
  }
  if (states.includes('unknown')) {
    return {
      ...base,
      severity: 'caution',
      title: t2('Ask for the two things the lessor must show you', '집주인이 보여줘야 하는 두 가지를 요청하세요'),
      action: t2('Ask for the tax payment certificates and the fixed-date information before the down payment.', '계약금 전에 납세증명서와 확정일자 부여 현황을 요청하세요.'),
    };
  }
  return {
    ...base,
    severity: 'ok',
    title: t2('The lessor showed what the law requires', '집주인이 법이 정한 정보를 보여줬어요'),
    action: t2('Check the certificates for unpaid taxes and add up the other tenants’ deposits.', '납세증명서에 체납이 없는지, 다른 세입자 보증금 합계는 얼마인지 확인하세요.'),
  };
}
