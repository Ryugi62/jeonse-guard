// Build-time snapshot of the statute corpus from the law.go.kr Open API.
// Usage: LAW_OC=<your OC> npm run fetch:statutes   (OC defaults to the public "test" key)
import { writeFileSync } from 'node:fs';
import { fetchStatute, findVersions } from '../src/adapters/lawGoKr.ts';
import type { Corpus, LawId } from '../src/domain/statute.ts';

const oc = process.env.LAW_OC || 'test';
const ids: LawId[] = ['hlpa', 'hlpa-decree'];
const corpus = {} as Corpus;
for (const id of ids) {
  const v = await findVersions(id, { oc });
  corpus[id] = await fetchStatute(id, { oc }, v);
  console.log(`${id}: MST ${v.mst} (EN ${v.enMst}), ${Object.keys(corpus[id].articles).length} units, effective ${corpus[id].effectiveDate}`);
}
const out = { fetchedAt: new Date().toISOString(), source: 'https://www.law.go.kr/DRF (Korean text + official English translation, KLRI)', corpus };
writeFileSync(new URL('../src/adapters/snapshot/statutes.json', import.meta.url), JSON.stringify(out, null, 1));
console.log('wrote src/adapters/snapshot/statutes.json');
