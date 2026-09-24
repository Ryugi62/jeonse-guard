// Clause classifier evaluation: rule matcher vs. Gemini (taxonomy-constrained) vs. combined policy.
// Usage: GEMINI_API_KEY=... npm run eval:clauses
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { matchClausePatterns, CLAUSE_IDS } from '../src/domain/clauses.ts';
import { decideClauses } from '../src/application/reviewClauses.ts';
import { createGeminiClassifier, MAX_CLAUSES } from '../src/adapters/geminiClassifier.ts';

type Row = { text: string; label: string | null };
const fx = (n: string) => JSON.parse(readFileSync(new URL(`../tests/fixtures/${n}`, import.meta.url), 'utf8'));
const labeled = fx('clauses.labeled.json');
const sets: Record<string, Row[]> = { dev: labeled.dev, paraphrase: labeled.holdout, blind: fx('clauses.blind.json').rows };
const MODELS = (process.env.GEMINI_MODELS || 'gemini-3.5-flash-lite,gemini-3-flash-preview,gemini-2.5-flash').split(',');

function metrics(rows: Row[], pred: (string | null)[]) {
  let tp = 0, fp = 0, fn = 0, exact = 0;
  rows.forEach((r, i) => {
    const p = pred[i] ?? null;
    if (p === r.label) exact++;
    if (p && p === r.label) tp++;
    if (p && p !== r.label) fp++;
    if (r.label && p !== r.label) fn++;
  });
  const precision = tp + fp ? tp / (tp + fp) : 1;
  const recall = tp + fn ? tp / (tp + fn) : 1;
  return { n: rows.length, tp, fp, fn, precision: +precision.toFixed(3), recall: +recall.toFixed(3), accuracy: +(exact / rows.length).toFixed(3) };
}

const key = process.env.GEMINI_API_KEY;
const ai = key ? createGeminiClassifier({ apiKey: key, model: MODELS, timeoutMs: 30000 }) : null;
const results: Record<string, unknown> = { date: new Date().toISOString(), models: MODELS };
let outOfTaxonomy = 0;
for (const [name, rows] of Object.entries(sets)) {
  const rule = rows.map((r) => matchClausePatterns(r.text)[0] ?? null);
  const entry: Record<string, unknown> = { rule: metrics(rows, rule) };
  if (ai) {
    const labels: Record<string, string | null> = {};
    for (let i = 0; i < rows.length; i += MAX_CLAUSES) {
      const batch = rows.slice(i, i + MAX_CLAUSES).map((r) => r.text.slice(0, 300));
      Object.assign(labels, await ai.classify(batch));
    }
    const aiOnly = rows.map((r) => labels[r.text.slice(0, 300)] ?? null);
    outOfTaxonomy += aiOnly.filter((x) => x && !CLAUSE_IDS.includes(x)).length;
    const combined = decideClauses(rows.map((r) => r.text.slice(0, 300)), labels).map((d) => d.patternId);
    entry.ai = metrics(rows, aiOnly.map((x) => (x && CLAUSE_IDS.includes(x) ? x : null)));
    entry.combined = metrics(rows, combined);
    entry.misses = rows
      .map((r, i) => ({ text: r.text, label: r.label, rule: rule[i], ai: aiOnly[i], combined: combined[i] }))
      .filter((x) => x.combined !== x.label);
  }
  results[name] = entry;
}
results.aiOutOfTaxonomy = outOfTaxonomy;
mkdirSync(new URL('../eval/', import.meta.url), { recursive: true });
writeFileSync(new URL('../eval/clauses.results.json', import.meta.url), JSON.stringify(results, null, 1));
for (const name of Object.keys(sets)) {
  const e: any = results[name];
  const fmt = (m: any) => (m ? `P ${m.precision} R ${m.recall} (fp ${m.fp})` : '—');
  console.log(`${name.padEnd(10)} n=${e.rule.n}  rule: ${fmt(e.rule)}  ai: ${fmt(e.ai)}  combined: ${fmt(e.combined)}`);
}
console.log(`AI ids outside taxonomy: ${outOfTaxonomy}`);
