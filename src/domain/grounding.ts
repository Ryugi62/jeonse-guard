import type { CandidateFinding, CandidateSilence, Finding, Silence } from './finding.ts';
import { verifyCitation, type Corpus, type VerifiedCitation } from './statute.ts';
import { t2 } from './text.ts';

/**
 * The grounding gate. A candidate becomes a finding only if it has at least one citation
 * and every citation's quote is found verbatim in the official text. Otherwise it is a silence.
 */
export function groundCandidates(
  candidates: (CandidateFinding | CandidateSilence)[],
  corpus: Corpus,
): { findings: Finding[]; silences: Silence[] } {
  const findings: Finding[] = [];
  const silences: Silence[] = [];
  for (const c of candidates) {
    const verified = c.citations.map((x) => verifyCitation(x, corpus));
    const ok = verified.filter((v): v is VerifiedCitation => v !== null);
    if ('reason' in c) {
      silences.push({ ...c, citations: ok });
      continue;
    }
    if (c.citations.length > 0 && ok.length === c.citations.length) {
      findings.push({ ...c, citations: ok });
    } else {
      silences.push({
        id: c.id,
        reason: 'citation-unverified',
        subject: c.title,
        detail: t2(
          'A rule wanted to warn you here, but its legal citation did not match the official text, so Jeonse Guard withheld it.',
          '경고할 규칙이 있었지만 인용한 조문이 공식 원문과 일치하지 않아 판단을 보류했어요.',
        ),
        citations: [],
        ...(c.clause !== undefined ? { clause: c.clause } : {}),
      });
    }
  }
  return { findings, silences };
}
