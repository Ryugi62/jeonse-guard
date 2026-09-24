import type { Citation, VerifiedCitation } from './statute.ts';
import type { Text2 } from './text.ts';

export type Severity = 'stop' | 'caution' | 'info' | 'ok';
export const SEVERITY_ORDER: Record<Severity, number> = { stop: 0, caution: 1, info: 2, ok: 3 };

export type FindingSource = 'rule' | 'clause-rule' | 'clause-ai';

export interface CandidateFinding {
  id: string;
  severity: Severity;
  title: Text2;
  explanation: Text2;
  action: Text2 | null;
  citations: Citation[];
  source: FindingSource;
  clause?: string;
  numbers?: Record<string, number>;
  /** A special term the tenant can paste into the contract. */
  suggestedClause?: Text2;
}

export interface Finding extends Omit<CandidateFinding, 'citations'> {
  citations: VerifiedCitation[];
}

export type SilenceReason =
  | 'citation-unverified'
  | 'no-verified-basis'
  | 'outside-corpus'
  | 'classifier-out-of-taxonomy'
  | 'law-changed';

export interface Silence {
  id: string;
  reason: SilenceReason;
  subject: Text2;
  detail: Text2;
  /** Citations that explain the silence itself (verified), possibly empty. */
  citations: VerifiedCitation[];
  clause?: string;
}

export interface CandidateSilence extends Omit<Silence, 'citations'> {
  citations: Citation[];
}

export const bySeverity = (a: Finding, b: Finding) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
