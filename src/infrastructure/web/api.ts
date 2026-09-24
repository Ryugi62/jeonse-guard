export interface LawCheck {
  checkedAt: string;
  ok: boolean;
  drifted: { lawId: 'hlpa' | 'hlpa-decree'; article: string }[];
}

export async function fetchLawCheck(): Promise<LawCheck> {
  const res = await fetch('/api/verify', { signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`verify ${res.status}`);
  return res.json();
}

export async function classifyClauses(clauses: string[]): Promise<Record<string, string | null>> {
  const res = await fetch('/api/classify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clauses }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`classify ${res.status}`);
  const data = (await res.json()) as { labels: Record<string, string | null> };
  return data.labels;
}
