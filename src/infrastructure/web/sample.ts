/** A realistic trap lease used for the one-click demo. */
export const SAMPLE_FORM = {
  region: 'seoul',
  homeValue: '250,000,000',
  deposit: '200,000,000',
  seniorDebt: '60,000,000',
  earliestMortgageDate: '2022-11-30',
  seniorDeposits: '0',
  lessorShowedTaxCertificates: 'no',
  lessorShowedFixedDateInfo: 'unknown',
  leaseMonths: '24',
  specialTerms: [
    '임대인은 계약 체결 후 주택을 담보로 대출을 받을 수 있다.',
    '집주인 사정으로 전입신고는 잔금 후 조금 늦게 하기로 함',
    '보증금은 새로운 임차인이 입주하면 반환한다.',
    '임차인은 계약갱신요구권을 행사하지 않는다.',
    '반려동물 사육을 금지한다.',
  ].join('\n'),
  auctionRatio: 0.7,
};
export type FormState = typeof SAMPLE_FORM;

export const EMPTY_FORM: FormState = {
  region: '',
  homeValue: '',
  deposit: '',
  seniorDebt: '0',
  earliestMortgageDate: '',
  seniorDeposits: '0',
  lessorShowedTaxCertificates: 'unknown',
  lessorShowedFixedDateInfo: 'unknown',
  leaseMonths: '',
  specialTerms: '',
  auctionRatio: 0.7,
};
