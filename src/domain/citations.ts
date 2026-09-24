import type { Citation } from './statute.ts';

export const hlpa = (article: string, quote: string, quoteEn?: string): Citation => ({ lawId: 'hlpa', article, quote, ...(quoteEn ? { quoteEn } : {}) });
export const decree = (article: string, quote: string, quoteEn?: string): Citation => ({ lawId: 'hlpa-decree', article, quote, ...(quoteEn ? { quoteEn } : {}) });

/** Every statute quote the rules rely on. Each must appear verbatim in the official Korean text (see citationIntegrity.test.ts). */
export const CITE = {
  art3NextDay: hlpa('3', '그 다음 날부터 제삼자에 대하여 효력이 생긴다', 'the lease shall take effect against any third party from the following day thereof'),
  art3Transferee: hlpa('3', '임차주택의 양수인(讓受人)(그 밖에 임대할 권리를 승계한 자를 포함한다)은 임대인(賃貸人)의 지위를 승계한 것으로 본다', 'The transferee (including any person who has succeeded to the right to lease) of a leased house shall be deemed to have succeeded to the status of the lessor'),
  art3_2Priority: hlpa('3-2', '후순위권리자(後順位權利者)나 그 밖의 채권자보다 우선하여 보증금을 변제(辨濟)받을 권리가 있다', 'in preference to any junior creditors and other creditors'),
  art3_2FixedDate: hlpa('3-2', '임대차계약증서(제3조제2항 및 제3항의 경우에는 법인과 임대인 사이의 임대차계약증서를 말한다)상의 확정일자(確定日字)를 갖춘 임차인은', 'obtained the fixed date on the lease contract document'),
  art3_3Order: hlpa('3-3', '임대차가 끝난 후 보증금이 반환되지 아니한 경우 임차인은 임차주택의 소재지를 관할하는 지방법원ㆍ지방법원지원 또는 시ㆍ군 법원에 임차권등기명령을 신청할 수 있다', 'If no deposit is refunded after the termination of a lease, the lessee may file an application for a leasehold registration order'),
  art3_6Where: hlpa('3-6', '확정일자는 주택 소재지의 읍ㆍ면사무소, 동 주민센터', 'shall be granted at the Eup/Myeon office, Dong community service center'),
  art3_7Duty: hlpa('3-7', '임대차계약을 체결할 때 임대인은 다음 각 호의 사항을 임차인에게 제시하여야 한다', 'When entering into a lease agreement, the lessor shall disclose the following matters to the lessee'),
  art3_7FixedInfo: hlpa('3-7', '해당 주택의 확정일자 부여일, 차임 및 보증금 등 정보', 'Information, such as the date when a fixed date is assigned to the relevant house, rent, and deposit'),
  art3_7Tax: hlpa('3-7', '「국세징수법」 제108조에 따른 납세증명서 및 「지방세징수법」 제5조제2항에 따른 납세증명서', 'Tax payment certificates referred to in Article 108 of the National Tax Collection Act and tax payment certificates referred to in Article 5(2) of the Local Tax Collection Act'),
  art4TwoYears: hlpa('4', '기간을 정하지 아니하거나 2년 미만으로 정한 임대차는 그 기간을 2년으로 본다', 'With respect to a lease whose term is not fixed or is fixed for less than two years, the term of such lease shall be deemed to be two years'),
  art4Continues: hlpa('4', '임차인이 보증금을 반환받을 때까지는 임대차관계가 존속되는 것으로 본다', 'the relations of lease shall be deemed to continue until a deposit is repaid to a lessee'),
  art6_3Renewal: hlpa('6-3', '임대인은 임차인이 제6조제1항 전단의 기간 이내에 계약갱신을 요구할 경우 정당한 사유 없이 거절하지 못한다', 'where a lessee requests the renewal of a contract within the period prescribed in the former part of Article 6(1), a lessor shall not refuse the request without good reason'),
  art8Priority: hlpa('8', '임차인은 보증금 중 일정액을 다른 담보물권자(擔保物權者)보다 우선하여 변제받을 권리가 있다', 'The lessee shall be entitled to receive a repayment of a specified amount of the deposit in preference to other persons holding the security rights in the leased house'),
  art8BeforeAuction: hlpa('8', '주택에 대한 경매신청의 등기 전에 제3조제1항의 요건을 갖추어야 한다', 'the lessee shall satisfy requirements provided for in Article 3(1) before an application for auction of the house is registered'),
  art10Mandatory: hlpa('10', '이 법에 위반된 약정(約定)으로서 임차인에게 불리한 것은 그 효력이 없다', 'Any agreement contrary to this Act and unfavorable to the lessee shall be ineffective'),
  decree10Half: decree('10', '임차인의 보증금 중 일정액이 주택가액의 2분의 1을 초과하는 경우에는 주택가액의 2분의 1에 해당하는 금액까지만 우선변제권이 있다', 'Where a specified amount of the security deposit of a tenant exceeds 1/2 of the value of a housing unit, the right of preferential repayment shall only apply to the amount equivalent to 1/2 of the value of the housing unit'),
  decree10Split: decree('10', '하나의 주택에 임차인이 2명 이상이고, 그 각 보증금 중 일정액을 모두 합한 금액이 주택가액의 2분의 1을 초과하는 경우에는', 'Where at least two tenants dwell in a housing unit, and the total sum of specified amounts of security deposits exceeds 1/2 of the value of the housing unit'),
  decreeAddendum2023: decree('A20230221-2', '이 영 시행 전에 임차주택에 대하여 담보물권을 취득한 자에 대해서는 종전의 규정에 따른다', 'the previous provisions thereof shall apply to persons who have acquired security rights over a leased house before this Decree enters into force'),
} as const;

/** The special term that closes the next-day gap of Art. 3(1). */
export const NO_LIEN_CLAUSE = {
  ko: '임대인은 임차인의 전입신고 다음 날까지 근저당권 등 어떠한 권리도 설정하지 않는다. 이를 위반하면 임차인은 계약을 해제할 수 있고 임대인은 보증금 전액을 즉시 반환한다.',
  en: 'The lessor will not create any mortgage or other right on the home until the day after the tenant’s move-in registration. If the lessor does, the tenant may cancel the contract and the lessor returns the full deposit at once.',
};
