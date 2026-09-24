// Produces .vercel/output (Build Output API v3): static site + two Node functions pinned to Seoul (icn1),
// so the law.go.kr live check runs from a Korean region. Deploy with: vercel deploy --prebuilt --prod
import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { build } from 'esbuild';

const out = '.vercel/output';
rmSync(out, { recursive: true, force: true });
execSync('npx vite build', { stdio: 'inherit' });
mkdirSync(`${out}/static`, { recursive: true });
cpSync('dist', `${out}/static`, { recursive: true });

for (const name of ['verify', 'classify']) {
  const dir = `${out}/functions/api/${name}.func`;
  mkdirSync(dir, { recursive: true });
  await build({ entryPoints: [`api/${name}.ts`], bundle: true, platform: 'node', format: 'esm', target: 'node22', outfile: `${dir}/index.mjs`, logLevel: 'warning' });
  writeFileSync(
    `${dir}/.vc-config.json`,
    JSON.stringify({ runtime: 'nodejs22.x', handler: 'index.mjs', launcherType: 'Nodejs', shouldAddHelpers: false, maxDuration: 25, regions: ['icn1'] }, null, 1),
  );
}

writeFileSync(
  `${out}/config.json`,
  JSON.stringify(
    {
      version: 3,
      routes: [
        { src: '/assets/(.*)', headers: { 'cache-control': 'public, max-age=31536000, immutable' }, continue: true },
        { src: '/(.*)', headers: { 'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin' }, continue: true },
        { handle: 'filesystem' },
      ],
    },
    null,
    1,
  ),
);
console.log('built', out);
