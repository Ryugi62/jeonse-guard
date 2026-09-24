import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildStatute } from '../src/adapters/drfParser.ts';
import type { Corpus } from '../src/domain/statute.ts';

const here = dirname(fileURLToPath(import.meta.url));
export const fixture = (name: string): unknown =>
  JSON.parse(readFileSync(join(here, 'fixtures', name), 'utf8'));

export function fixtureCorpus(): Corpus {
  return {
    hlpa: buildStatute('hlpa', fixture('hlpa.json'), fixture('hlpa_en.json'), '276291'),
    'hlpa-decree': buildStatute('hlpa-decree', fixture('decree.json'), fixture('decree_en.json'), '287183'),
  };
}
