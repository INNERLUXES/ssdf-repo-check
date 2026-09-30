// Using the library as a gate from your own script: scan this repository, require a set of practices,
// and print a short line per practice. Run: npm run example:gate

import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { scanRepo, unmet } from '../src/index.js';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const required = ['PO.3', 'PO.5', 'PS.1', 'PS.2', 'PS.3', 'PW.1', 'PW.4', 'PW.7', 'PW.8', 'RV.1'];

const report = await scanRepo(root);
for (const id of required) {
  const p = report.practices.find((x) => x.id === id);
  const first = p.evidence[0];
  console.log(`${id.padEnd(5)} ${p.status.padEnd(8)} ${first ? `${first.title}: ${first.detail}` : ''}`);
}

const missing = unmet(report, required);
if (missing.length) {
  console.error(`\nnot met: ${missing.join(', ')}`);
  process.exit(1);
}
console.log(`\nall ${required.length} required practices have evidence`);
