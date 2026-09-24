// Post-deploy smoke test. Usage: npm run smoke -- https://jeonse-guard-kr.vercel.app
export {};
const base = (process.argv[2] || 'https://jeonse-guard-kr.vercel.app').replace(/\/$/, '');
const checks: [string, () => Promise<string | true>][] = [
  ['home 200', async () => ((await fetch(base + '/')).ok ? true : 'not ok')],
  ['live law check matches', async () => {
    const r = await fetch(base + '/api/verify');
    const d: any = await r.json();
    return r.ok && d.ok === true && d.drifted.length === 0 ? true : JSON.stringify(d).slice(0, 200);
  }],
  ['classifier stays in taxonomy', async () => {
    const clause = '집주인 사정으로 전입신고는 잔금 후 조금 늦게 하기로 함';
    const r = await fetch(base + '/api/classify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clauses: [clause] }) });
    const d: any = await r.json();
    return r.ok && d.labels[clause] === 'delay-move-in-registration' ? true : JSON.stringify(d).slice(0, 200);
  }],
  ['classifier rejects bad input', async () => ((await fetch(base + '/api/classify', { method: 'POST', body: '{"clauses":5}' })).status === 400 ? true : 'expected 400')],
];
let failed = 0;
for (const [name, fn] of checks) {
  const res = await fn().catch((e) => String(e));
  console.log(res === true ? 'PASS' : 'FAIL', name, res === true ? '' : res);
  if (res !== true) failed++;
}
process.exit(failed ? 1 : 0);
