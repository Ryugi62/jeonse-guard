import type { CandidateFinding } from '../finding.ts';
import type { LeaseFacts } from '../lease.ts';
import { CITE } from '../citations.ts';
import { formatWon, formatWonKo, t2 } from '../text.ts';

export interface AuctionScenario {
  ratio: number;
  proceeds: number;
  paidBeforeYou: number;
  recovery: number;
  shortfall: number;
}

/** Who gets paid first if the home is auctioned at `ratio` of its value. Pure arithmetic. */
export function auctionScenario(f: Pick<LeaseFacts, 'homeValue' | 'deposit' | 'seniorDebt' | 'seniorDeposits' | 'auctionRatio'>, ratio = f.auctionRatio): AuctionScenario {
  const proceeds = Math.round(f.homeValue * ratio);
  const paidBeforeYou = f.seniorDebt + f.seniorDeposits;
  const recovery = Math.min(f.deposit, Math.max(0, proceeds - paidBeforeYou));
  return { ratio, proceeds, paidBeforeYou, recovery, shortfall: f.deposit - recovery };
}

const pct = (r: number) => Math.round(r * 100);

export function auctionShortfallRule(f: LeaseFacts): CandidateFinding {
  const s = auctionScenario(f);
  const lower = auctionScenario(f, Math.max(0.3, f.auctionRatio - 0.1));
  const numbers = { proceeds: s.proceeds, paidBeforeYou: s.paidBeforeYou, recovery: s.recovery, shortfall: s.shortfall, ratioPct: pct(s.ratio) };
  const why = t2(
    `If the home sells at ${pct(s.ratio)}% of the value you entered (${formatWon(s.proceeds)}), the ${formatWon(s.paidBeforeYou)} registered ahead of you is paid first. Art. 3-2(2) puts you ahead only of creditors ranked after you, so ${formatWon(s.recovery)} is left for your ${formatWon(f.deposit)} deposit. Uses the maximum secured amounts you entered, which can be higher than the actual debt; assumes you hold move-in registration and a fixed date before any later creditor; auction costs ignored.`,
    `집이 입력한 시세의 ${pct(s.ratio)}%(${formatWonKo(s.proceeds)})에 팔리면, 나보다 앞선 ${formatWonKo(s.paidBeforeYou)}이 먼저 배당돼요. 제3조의2제2항은 나보다 뒤 순위 채권자보다만 우선하게 해 주므로, 보증금 ${formatWonKo(f.deposit)} 중 ${formatWonKo(s.recovery)}이 남아요. 입력한 채권최고액을 그대로 썼어요(실제 빚보다 클 수 있어요). 전입신고·확정일자를 뒤 순위 채권자보다 먼저 갖췄다고 가정했고 경매 비용은 뺐어요.`,
  );
  const base = { id: 'auction-shortfall', explanation: why, citations: [CITE.art3_2Priority], source: 'rule' as const, numbers };
  if (s.shortfall > 0) {
    return {
      ...base,
      severity: 'stop',
      title: t2(`You could lose ${formatWon(s.shortfall)} if this home is auctioned`, `경매로 넘어가면 ${formatWonKo(s.shortfall)}을 잃을 수 있어요`),
      action: t2(
        'Before paying anything: ask for a lower deposit, or for the senior mortgage to be paid off and deleted, or get a deposit-return guarantee.',
        '돈을 보내기 전에: 보증금을 낮추거나, 선순위 근저당을 갚고 말소해 달라고 하거나, 전세보증금 반환보증을 알아보세요.',
      ),
    };
  }
  if (lower.shortfall > 0) {
    return {
      ...base,
      severity: 'caution',
      title: t2(`Thin margin: at ${pct(lower.ratio)}% you would lose ${formatWon(lower.shortfall)}`, `여유가 적어요: ${pct(lower.ratio)}%에 팔리면 ${formatWonKo(lower.shortfall)}을 잃어요`),
      action: t2('Try the slider — see how far the price can fall before your deposit is hit.', '슬라이더로 낙찰가를 낮춰 보며 어디서부터 보증금이 깎이는지 확인하세요.'),
    };
  }
  return {
    ...base,
    severity: 'ok',
    title: t2(`Your deposit is covered even at ${pct(lower.ratio)}% in this scenario`, `이 가정에서는 ${pct(lower.ratio)}%에 팔려도 보증금이 남아요`),
    action: null,
  };
}
