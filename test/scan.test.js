import test from 'node:test';
import assert from 'node:assert/strict';
import { scanRepo, unmet, CHECKS } from '../src/scan.js';
import { PRACTICES } from '../src/practices.js';
import { repoOf, WELL_KEPT, BARE, fakeGithubToken } from './fixtures.js';

test('every check names real practices and has a unique id', () => {
  const ids = new Set(PRACTICES.map((p) => p.id));
  assert.equal(new Set(CHECKS.map((c) => c.id)).size, CHECKS.length);
  for (const c of CHECKS) {
    assert.ok(c.practices.length, c.id);
    for (const p of c.practices) assert.ok(ids.has(p), `${c.id} -> ${p}`);
  }
});

test('every practice that a repository can show has at least one check', () => {
  for (const p of PRACTICES.filter((x) => x.scope !== 'organization')) {
    assert.ok(CHECKS.some((c) => c.practices.includes(p.id)), p.id);
  }
});

test('a well-kept repository shows evidence for every practice', async () => {
  const report = await scanRepo(repoOf(WELL_KEPT));
  const missing = report.practices.filter((p) => p.status !== 'evidence').map((p) => p.id);
  assert.deepEqual(missing, []);
  assert.equal(report.summary.evidence, 19);
  assert.equal(report.summary.problem, 0);
  assert.deepEqual(report.errors, []);
});

test('a bare repository shows almost nothing and the missing lock file', async () => {
  const report = await scanRepo(repoOf(BARE));
  assert.equal(report.summary.evidence, 0);
  const pw4 = report.practices.find((p) => p.id === 'PW.4');
  assert.equal(pw4.status, 'none');
  assert.match(pw4.problems[0].detail, /without a lock file/);
  assert.equal(report.summary.warnings, 1);
});

test('a high-severity problem outweighs evidence', async () => {
  const report = await scanRepo(repoOf({ ...WELL_KEPT, 'deploy.sh': `TOKEN=${fakeGithubToken()}` }));
  const ps1 = report.practices.find((p) => p.id === 'PS.1');
  assert.equal(ps1.status, 'problem');
  assert.ok(ps1.evidence.length > 0);
  assert.equal(report.summary.problem, 1);
});

test('unmet lists required practices without evidence', async () => {
  const report = await scanRepo(repoOf(BARE));
  assert.deepEqual(unmet(report, ['ps.1', 'PW.8']), ['PS.1', 'PW.8']);
  const good = await scanRepo(repoOf(WELL_KEPT));
  assert.deepEqual(unmet(good, ['PS.1', 'PW.8']), []);
  assert.throws(() => unmet(good, ['PW.3']), /not a practice/);
});

test('a failing check is reported, not thrown', async () => {
  const repo = repoOf({ 'SECURITY.md': 'x' });
  repo.text = async () => { throw new Error('disk gone'); };
  const report = await scanRepo(repo);
  assert.ok(report.errors.some((e) => e.check === 'security-policy' && e.message === 'disk gone'));
});

test('only the chosen checks run', async () => {
  const report = await scanRepo(repoOf(WELL_KEPT), { checks: ['tests'] });
  assert.deepEqual(report.practices.filter((p) => p.status === 'evidence').map((p) => p.id), ['PW.8']);
});
