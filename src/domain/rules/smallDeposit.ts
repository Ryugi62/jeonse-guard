import type { CandidateFinding, CandidateSilence } from '../finding.ts';
import type { LeaseFacts } from '../lease.ts';
import { CITE } from '../citations.ts';
import { SMALL_DEPOSIT, THRESHOLDS_SINCE } from '../library.ts';
import { formatWon, formatWonKo, t2 } from '../text.ts';
import { auctionScenario } from './auctionShortfall.ts';

export function smallDepositRule(f: LeaseFacts): CandidateFinding | CandidateSilence {
  const row = SMALL_DEPOSIT[f.region];
  if (f.earliestMortgageDate !== null && f.earliestMortgageDate < THRESHOLDS_SINCE) {
    return {
      id: 'small-deposit-priority',
      reason: 'outside-corpus',
      subject: t2('Small-deposit top priority', '소액임차인 최우선변제'),
      detail: t2(
        'Your earliest mortgage was registered before Feb. 21, 2023. The decree’s addendum says the previous thresholds apply to that creditor, and Jeonse Guard does not hold those older thresholds — so it will not estimate this.',
        '가장 앞선 근저당이 2023년 2월 21일 전에 설정됐어요. 시행령 부칙은 그 담보권자에게 종전 기준을 적용한다고 해요. Jeonse Guard는 종전 기준을 갖고 있지 않아 추정하지 않아요.',
      ),
      citations: [CITE.decreeAddendum2023],
    };
  }
  const proceeds = auctionScenario(f).proceeds;
  if (f.deposit > row.limit) {
    return {
      id: 'small-deposit-priority',
      severity: 'info',
      title: t2(
        `Your deposit is above the small-deposit limit (${formatWon(row.limit)} in ${row.name.en})`,
        `보증금이 소액임차인 기준(${row.name.ko} ${formatWonKo(row.limit)})을 넘어요`,
      ),
      explanation: t2(
        `Art. 8(1) gives top priority to part of a small deposit. Decree Art. 11: in ${row.name.en}, only deposits up to ${formatWon(row.limit)} qualify.`,
        `제8조제1항은 소액보증금 중 일정액을 최우선으로 보호해요. 시행령 제11조: ${row.name.ko}는 보증금 ${formatWonKo(row.limit)} 이하만 해당돼요.`,
      ),
      action: null,
      citations: [CITE.art8Priority, row.limitQuote],
      source: 'rule',
      numbers: { protectedAmount: 0, limit: row.limit },
    };
  }
  const protectedAmount = Math.min(f.deposit, row.cap, Math.floor(proceeds / 2));
  const shared = f.seniorDeposits > 0;
  return {
    id: 'small-deposit-priority',
    severity: 'info',
    title: t2(`Up to ${formatWon(protectedAmount)} of your deposit gets top priority`, `보증금 중 ${formatWonKo(protectedAmount)}까지 최우선으로 돌려받을 수 있어요`),
    explanation: t2(
      `Art. 8(1): part of a small deposit is repaid before other secured creditors, if you complete move-in and resident registration before the auction is registered. Decree Art. 11: in ${row.name.en}, deposits up to ${formatWon(row.limit)} qualify. Decree Art. 10: the protected part is up to ${formatWon(row.cap)} and no more than half the home’s value (this scenario uses the auction price, ${formatWon(proceeds)}).` +
        (shared ? ' If other small-deposit tenants share the home, Decree Art. 10(3) splits that half between you.' : ''),
      `제8조제1항: 경매신청 등기 전에 인도·주민등록을 마치면 보증금 중 일정액을 다른 담보권자보다 먼저 받아요. 시행령 제11조: ${row.name.ko}는 보증금 ${formatWonKo(row.limit)} 이하가 대상이에요. 시행령 제10조: 보호되는 금액은 ${formatWonKo(row.cap)}까지, 그리고 주택가액의 절반까지예요(여기서는 낙찰가 ${formatWonKo(proceeds)} 기준).` +
        (shared ? ' 같은 집에 다른 소액임차인이 있으면 시행령 제10조제3항에 따라 그 절반을 나눠요.' : ''),
    ),
    action: t2('Register your move-in as early as possible — the timing is what counts.', '전입신고를 최대한 빨리 하세요 — 시점이 핵심이에요.'),
    citations: [CITE.art8Priority, CITE.art8BeforeAuction, row.limitQuote, row.capQuote, CITE.decree10Half, ...(shared ? [CITE.decree10Split] : [])],
    source: 'rule',
    numbers: { protectedAmount, limit: row.limit, cap: row.cap },
  };
}
