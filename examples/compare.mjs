// Two versions of the same small service: before and after the team put its build pipeline in order.
// Scans both and prints which practices changed. Run: npm run example:compare

import { memoryRepo, scanRepo } from '../src/index.js';

const before = {
  'package.json': JSON.stringify({ name: 'orders', dependencies: { fastify: '^5.0.0' } }),
  'src/server.js': 'export {};\n',
  'test/orders.test.js': 'export {};\n',
  'Dockerfile': 'FROM node:22\nCOPY . .\nCMD ["node", "src/server.js"]\n',
  '.github/workflows/ci.yml': 'on: push\njobs:\n  t:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: npm install\n'
};

const HASH = '3d3c42e5aac5ba805825da76410c181273ba90b1';
const after = {
  ...before,
  'package-lock.json': '{}',
  '.gitignore': 'node_modules\n.env\n',
  'SECURITY.md': 'Report security problems through private vulnerability reporting on this repository.\n',
  '.github/CODEOWNERS': '* @orders-team\n',
  '.github/dependabot.yml': 'version: 2\n',
  'Dockerfile': `FROM node:22-slim@sha256:${'c'.repeat(64)}\nCOPY . .\nUSER node\nCMD ["node", "src/server.js"]\n`,
  '.github/workflows/ci.yml': [
    'on: [push, pull_request]',
    'permissions:',
    '  contents: read',
    'jobs:',
    '  t:',
    '    runs-on: ubuntu-latest',
    '    steps:',
    `      - uses: actions/checkout@${HASH}`,
    '      - run: npm ci',
    '      - run: npm test',
    '      - run: npm audit --audit-level=high',
    '      - run: npx gitleaks detect'
  ].join('\n')
};

const a = await scanRepo(memoryRepo(before));
const b = await scanRepo(memoryRepo(after));

console.log(`before: ${a.summary.evidence} of ${a.summary.practices} practices with evidence, ${a.summary.warnings} warning(s)`);
console.log(`after:  ${b.summary.evidence} of ${b.summary.practices} practices with evidence, ${b.summary.warnings} warning(s)\n`);

for (const p of b.practices) {
  const old = a.practices.find((x) => x.id === p.id);
  if (old.status === p.status) continue;
  console.log(`${p.id.padEnd(5)} ${old.status.padEnd(8)} -> ${p.status.padEnd(8)} ${p.name}`);
  for (const e of p.evidence) console.log(`        + ${e.title}: ${e.detail}`);
}

const left = b.practices.flatMap((p) => p.problems).map((w) => `${w.title}: ${w.detail}`);
console.log(`\nstill open:\n${[...new Set(left)].map((l) => `  ! ${l}`).join('\n') || '  nothing'}`);

if (b.summary.evidence <= a.summary.evidence) process.exit(1);
