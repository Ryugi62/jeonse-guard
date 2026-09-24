export type Region = 'seoul' | 'overcrowding' | 'metro' | 'other';
export const REGIONS: Region[] = ['seoul', 'overcrowding', 'metro', 'other'];
export type TriState = 'yes' | 'no' | 'unknown';

/** What a tenant knows before signing. Amounts are integer KRW. */
export interface LeaseFacts {
  region: Region;
  homeValue: number;
  deposit: number;
  /** Sum of maximum secured amounts (채권최고액) registered ahead of the tenant. */
  seniorDebt: number;
  /** Deposits of other tenants who rank ahead (e.g. multi-household buildings). */
  seniorDeposits: number;
  /** Registration date of the earliest mortgage, YYYY-MM-DD, or null if none. */
  earliestMortgageDate: string | null;
  lessorShowedTaxCertificates: TriState;
  lessorShowedFixedDateInfo: TriState;
  leaseMonths: number | null;
  specialTerms: string[];
  /** Assumed auction price as a share of home value (0.3–1.0). An assumption, not a statistic. */
  auctionRatio: number;
}

export interface FieldError {
  field: keyof LeaseFacts;
  message: string;
}

export type ParseResult = { ok: true; facts: LeaseFacts } | { ok: false; errors: FieldError[] };

const toNumber = (v: unknown): number => {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v.trim() !== '') return Number(v.replace(/[,\s₩원]/g, ''));
  return NaN;
};
const tri = (v: unknown): TriState => (v === 'yes' || v === 'no' ? v : 'unknown');

export function parseLeaseFacts(raw: Record<string, unknown>): ParseResult {
  const errors: FieldError[] = [];
  const money = (field: keyof LeaseFacts, min: number) => {
    const n = toNumber(raw[field] ?? (min === 0 ? 0 : undefined));
    if (!Number.isFinite(n) || n < min || n > 1e13) errors.push({ field, message: min > 0 ? 'Enter an amount above 0' : 'Enter 0 or more' });
    return Math.round(n);
  };
  const homeValue = money('homeValue', 1);
  const deposit = money('deposit', 1);
  const seniorDebt = money('seniorDebt', 0);
  const seniorDeposits = money('seniorDeposits', 0);

  const region = raw.region as Region;
  if (!REGIONS.includes(region)) errors.push({ field: 'region', message: 'Choose a region' });

  const ratio = toNumber(raw.auctionRatio ?? 0.7);
  if (!Number.isFinite(ratio) || ratio < 0.3 || ratio > 1) errors.push({ field: 'auctionRatio', message: 'Between 30% and 100%' });

  const d = raw.earliestMortgageDate;
  let earliestMortgageDate: string | null = null;
  if (typeof d === 'string' && d.trim() !== '') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(d.trim())) earliestMortgageDate = d.trim();
    else errors.push({ field: 'earliestMortgageDate', message: 'Use YYYY-MM-DD' });
  }

  let leaseMonths: number | null = null;
  if (raw.leaseMonths !== undefined && raw.leaseMonths !== null && raw.leaseMonths !== '') {
    const m = toNumber(raw.leaseMonths);
    if (!Number.isInteger(m) || m < 1 || m > 600) errors.push({ field: 'leaseMonths', message: 'Whole months, 1–600' });
    else leaseMonths = m;
  }

  const termsRaw = raw.specialTerms;
  const lines = Array.isArray(termsRaw) ? termsRaw.map(String) : typeof termsRaw === 'string' ? termsRaw.split(/\r?\n/) : [];
  const specialTerms = lines.map((s) => s.trim()).filter(Boolean).slice(0, 30).map((s) => s.slice(0, 500));

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    facts: {
      region,
      homeValue,
      deposit,
      seniorDebt,
      seniorDeposits,
      earliestMortgageDate,
      lessorShowedTaxCertificates: tri(raw.lessorShowedTaxCertificates),
      lessorShowedFixedDateInfo: tri(raw.lessorShowedFixedDateInfo),
      leaseMonths,
      specialTerms,
      auctionRatio: ratio,
    },
  };
}
