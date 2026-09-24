import { describe, expect, it } from 'vitest';
import { createGeminiClassifier, buildGeminiRequest } from '../src/adapters/geminiClassifier.ts';
import { CLAUSE_PATTERNS } from '../src/domain/clauses.ts';

const okResponse = (labels: unknown) =>
  new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ labels }) }] } }] }), { status: 200 });

describe('Gemini clause classifier adapter', () => {
  it('constrains the model with a JSON schema enum = taxonomy ids + none', () => {
    const body = buildGeminiRequest(['a', 'b']) as any;
    const en = body.generationConfig.responseSchema.properties.labels.items.properties.id.enum;
    expect(en).toEqual([...CLAUSE_PATTERNS.map((p) => p.id), 'none']);
    expect(body.generationConfig.responseMimeType).toBe('application/json');
    expect(body.contents[0].parts[0].text).toContain('0: a');
  });

  it('maps labels back to clauses, turning none into null', async () => {
    const fetcher = async () => okResponse([{ index: 0, id: 'evict-on-sale' }, { index: 1, id: 'none' }]);
    const c = createGeminiClassifier({ apiKey: 'k', model: 'm', fetcher, timeoutMs: 1000 });
    expect(await c.classify(['x', 'y'])).toEqual({ x: 'evict-on-sale', y: null });
  });

  it('passes unknown ids through so the application can reject them', async () => {
    const fetcher = async () => okResponse([{ index: 0, id: 'made-up' }]);
    const c = createGeminiClassifier({ apiKey: 'k', model: 'm', fetcher, timeoutMs: 1000 });
    expect(await c.classify(['x'])).toEqual({ x: 'made-up' });
  });

  it('throws on HTTP errors so callers can fall back', async () => {
    const fetcher = async () => new Response('quota', { status: 429 });
    const c = createGeminiClassifier({ apiKey: 'k', model: 'm', fetcher, timeoutMs: 1000 });
    await expect(c.classify(['x'])).rejects.toThrow(/429/);
    const bad = createGeminiClassifier({ apiKey: 'k', model: 'm', fetcher: async () => new Response('no', { status: 400 }), timeoutMs: 1000 });
    await expect(bad.classify(['x'])).rejects.toThrow(/400/);
  });

  it('falls back to the next model on 503 and remembers nothing', async () => {
    const seen: string[] = [];
    const fetcher = async (url: string) => {
      seen.push(url.split('/models/')[1]!.split(':')[0]!);
      return seen.length === 1 ? new Response('busy', { status: 503 }) : okResponse([{ index: 0, id: 'short-term' }]);
    };
    const c = createGeminiClassifier({ apiKey: 'k', model: ['a', 'b'], fetcher, timeoutMs: 1000 });
    expect(await c.classify(['x'])).toEqual({ x: 'short-term' });
    expect(seen).toEqual(['a', 'b']);
  });

  it('rejects oversized input before calling the model', async () => {
    let called = false;
    const fetcher = async () => { called = true; return okResponse([]); };
    const c = createGeminiClassifier({ apiKey: 'k', model: 'm', fetcher, timeoutMs: 1000 });
    await expect(c.classify(Array(13).fill('x'))).rejects.toThrow(/at most 12/);
    await expect(c.classify(['x'.repeat(301)])).rejects.toThrow(/300/);
    expect(called).toBe(false);
  });
});
