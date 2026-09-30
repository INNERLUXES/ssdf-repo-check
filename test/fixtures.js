// Repositories held in memory for the tests. Credential-shaped strings are assembled at run time
// so that this file does not itself look like it holds a credential.

import { memoryRepo } from '../src/repo.js';
import { ciFiles } from '../src/checks/util.js';

export const fakeGithubToken = () => ['gh', 'p_', 'Q7wR2tY9uI4oP1aS6dF3gH8jK5lZ0xC2vB7n'].join('');
export const fakeAwsKey = () => ['AK', 'IA', 'QW7ER2TY9UI4OP1A'].join('');
export const fakePrivateKey = () => ['-----BEGIN ', 'RSA PRIVATE KEY-----\nMIIEow\n-----END ', 'RSA PRIVATE KEY-----'].join('');

const long = (topic) => `# ${topic}\n\n` + `This section describes ${topic.toLowerCase()} for the service in plain words. `.repeat(12);

export const SHA = 'b4ffde65f46336ab88eb53be808477a3936bae11';

export const WELL_KEPT = {
  'package.json': JSON.stringify({ name: 'shop', dependencies: { express: '^5.0.0' } }),
  'package-lock.json': '{}',
  '.gitignore': 'node_modules\n.env\n*.pem\n',
  'SECURITY.md': '# Security\n\nReport problems to security@example.org. Do not open a public issue.\n',
  '.github/CODEOWNERS': '# owners\n* @shop/maintainers\n/src/payments/ @shop/payments\n',
  '.github/pull_request_template.md': '## What changed\n\n- [ ] tests added\n',
  'CONTRIBUTING.md': '# Contributing\n\nEvery change is reviewed and needs tests.\n',
  '.github/dependabot.yml': 'version: 2\nupdates:\n  - package-ecosystem: npm\n    directory: /\n    schedule:\n      interval: weekly\n',
  '.github/workflows/ci.yml': [
    'name: ci',
    'on: [push, pull_request]',
    'permissions:',
    '  contents: read',
    'jobs:',
    '  test:',
    '    runs-on: ubuntu-latest',
    '    steps:',
    `      - uses: actions/checkout@${SHA}`,
    `      - uses: actions/setup-node@${SHA}`,
    '      - run: npm ci',
    '      - run: npx eslint .',
    '      - run: npm test',
    '      - run: npm audit --audit-level=high',
    `      - uses: gitleaks/gitleaks-action@${SHA}`,
    `      - uses: github/codeql-action/analyze@${SHA}`
  ].join('\n'),
  '.github/workflows/release.yml': [
    'name: release',
    'on:',
    '  push:',
    '    tags: ["v*"]',
    'permissions:',
    '  contents: write',
    '  id-token: write',
    '  attestations: write',
    'jobs:',
    '  publish:',
    '    runs-on: ubuntu-latest',
    '    steps:',
    `      - uses: actions/checkout@${SHA}`,
    `      - uses: anchore/sbom-action@${SHA}`,
    `      - uses: actions/attest-build-provenance@${SHA}`
  ].join('\n'),
  'eslint.config.js': 'export default [];\n',
  'tsconfig.json': '{ "compilerOptions": { "strict": true } }',
  'CHANGELOG.md': '# Changes\n\n## 1.2.1\n\n### Security\n\n- Fixed CVE-2024-12345 in the upload handler.\n',
  'Dockerfile': `FROM node:22-slim@sha256:${'a'.repeat(64)}\nWORKDIR /app\nCOPY . .\nUSER node\nCMD ["node", "server.js"]\n`,
  'docs/threat-model.md': long('Threat model'),
  'docs/security-requirements.md': long('Security requirements'),
  'docs/adr/0001-use-postgres.md': '# Use Postgres\n\nAccepted.\n',
  'docs/hardening.md': long('Hardening'),
  'docs/postmortems/upload-bug.md': long('Root cause of the upload bug'),
  'test/cart.test.js': "import test from 'node:test';\n",
  'fuzz/parse_fuzz.go': 'package fuzz\n',
  'src/server.js': 'console.log(1);\n'
};

export const BARE = {
  'README.md': '# app\n',
  'package.json': JSON.stringify({ name: 'app', dependencies: { lodash: '^4.0.0' } }),
  'index.js': 'module.exports = 1;\n'
};

export function repoOf(files) {
  return memoryRepo(files);
}

export async function ctxOf(repo) {
  return { ci: await ciFiles(repo), ignore: [] };
}

export async function runCheck(check, files) {
  const repo = memoryRepo(files);
  return check.run(repo, await ctxOf(repo));
}
