// Local production-like server: serves dist/ and the two API handlers. Usage: npm run build && npm run serve
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import verify from '../api/verify.ts';
import classify from '../api/classify.ts';

const root = new URL('../dist/', import.meta.url).pathname;
const types: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json' };
const port = Number(process.env.PORT || 4173);
createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://x');
  if (url.pathname === '/api/verify') return verify(req, res);
  if (url.pathname === '/api/classify') return classify(req, res);
  const path = normalize(join(root, url.pathname === '/' ? 'index.html' : url.pathname));
  try {
    const body = await readFile(path.startsWith(root) ? path : join(root, 'index.html'));
    res.setHeader('Content-Type', types[extname(path)] ?? 'application/octet-stream');
    res.end(body);
  } catch {
    res.setHeader('Content-Type', types['.html']!);
    res.end(await readFile(join(root, 'index.html')));
  }
}).listen(port, () => console.log(`http://localhost:${port}`));
