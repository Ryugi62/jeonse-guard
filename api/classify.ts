// POST /api/classify {clauses: string[]} — taxonomy-constrained Gemini labels. Citations never come from here.
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createGeminiClassifier, MAX_CLAUSE_CHARS, MAX_CLAUSES } from '../src/adapters/geminiClassifier.ts';
import { readJson, sendJson } from './_http.ts';

const MODELS = (process.env.GEMINI_MODELS || 'gemini-3.5-flash-lite,gemini-3-flash-preview,gemini-2.5-flash').split(',');
const hits = new Map<string, number[]>();

function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 8;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'POST only' }, { Allow: 'POST' });
  const ip = String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? '').split(',')[0]!.trim();
  if (limited(ip)) return sendJson(res, 429, { error: 'Too many requests. Try again in a minute.' });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return sendJson(res, 503, { error: 'AI classifier not configured' });
  let clauses: string[];
  try {
    const body = (await readJson(req)) as { clauses?: unknown };
    if (!Array.isArray(body.clauses) || body.clauses.some((c) => typeof c !== 'string')) throw new Error('clauses must be strings');
    clauses = (body.clauses as string[]).map((c) => c.trim()).filter(Boolean);
    if (clauses.length === 0 || clauses.length > MAX_CLAUSES || clauses.some((c) => c.length > MAX_CLAUSE_CHARS)) throw new Error('1–12 clauses, ≤300 characters each');
  } catch (e) {
    return sendJson(res, 400, { error: e instanceof Error ? e.message : 'bad request' });
  }
  try {
    const labels = await createGeminiClassifier({ apiKey: key, model: MODELS, timeoutMs: 6000 }).classify(clauses);
    sendJson(res, 200, { labels }, { 'Cache-Control': 'no-store' });
  } catch (e) {
    sendJson(res, 503, { error: 'AI classifier unavailable', detail: e instanceof Error ? e.message : String(e) }, { 'Cache-Control': 'no-store' });
  }
}
