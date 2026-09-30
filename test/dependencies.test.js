import test from 'node:test';
import assert from 'node:assert/strict';
import { lockFiles, dependencyUpdates, dependencyAudit } from '../src/checks/dependencies.js';
import { runCheck } from './fixtures.js';

const pkg = (deps) => JSON.stringify({ name: 'x', dependencies: deps });

test('manifests with and without a lock file, in sub-folders too', async () => {
  const r = await runCheck(lockFiles, {
    'package.json': pkg({ a: '1' }),
    'package-lock.json': '{}',
    'services/api/go.mod': 'module api',
    'services/api/go.sum': '',
    'tools/Cargo.toml': '[package]',
    'web/package.json': pkg({ b: '1' })
  });
  const ev = r.find((x) => x.kind === 'evidence');
  const pr = r.find((x) => x.kind === 'problem');
  assert.deepEqual(ev.files, ['package-lock.json', 'services/api/go.sum']);
  assert.deepEqual(pr.files, ['tools/Cargo.toml', 'web/package.json']);
});

test('a package.json without dependencies needs no lock file', async () => {
  assert.deepEqual(await runCheck(lockFiles, { 'package.json': JSON.stringify({ name: 'x', scripts: {} }) }), []);
});

test('a package.json that does not parse is treated as having dependencies', async () => {
  const r = await runCheck(lockFiles, { 'package.json': '{ broken' });
  assert.equal(r[0].kind, 'problem');
});

test('Dependabot and Renovate configuration', async () => {
  assert.equal((await runCheck(dependencyUpdates, { '.github/dependabot.yml': 'version: 2' }))[0].kind, 'evidence');
  assert.equal((await runCheck(dependencyUpdates, { 'renovate.json': '{}' }))[0].kind, 'evidence');
  assert.deepEqual(await runCheck(dependencyUpdates, { 'README.md': '' }), []);
});

test('vulnerability audit steps in the pipeline', async () => {
  for (const step of ['npm audit --omit=dev', 'pip-audit -r requirements.txt', 'govulncheck ./...', 'uses: actions/dependency-review-action@v4', 'osv-scanner -r .']) {
    const r = await runCheck(dependencyAudit, { '.github/workflows/a.yml': `steps:\n  - run: ${step}\n` });
    assert.equal(r.length, 1, step);
  }
  assert.deepEqual(await runCheck(dependencyAudit, { '.github/workflows/a.yml': 'steps:\n  # - run: npm audit\n  - run: npm test\n' }), []);
});
