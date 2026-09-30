import test from 'node:test';
import assert from 'node:assert/strict';
import { releaseIntegrity, sbom, releaseRecord } from '../src/checks/release.js';
import { runCheck } from './fixtures.js';

const ci = (step) => ({ '.github/workflows/release.yml': `on:\n  push:\n    tags: ["v*"]\njobs:\n  r:\n    steps:\n      - ${step}\n` });

test('signing, provenance and checksums', async () => {
  for (const step of ['run: cosign sign --yes $IMAGE', 'uses: actions/attest-build-provenance@v2', 'run: npm publish --provenance --access public', 'run: sha256sum dist/* > SHA256SUMS']) {
    assert.equal((await runCheck(releaseIntegrity, ci(step))).length, 1, step);
  }
  assert.deepEqual(await runCheck(releaseIntegrity, ci('run: npm publish')), []);
});

test('goreleaser counts only when it signs or writes checksums', async () => {
  assert.equal((await runCheck(releaseIntegrity, { '.goreleaser.yaml': 'builds: []\nchecksum:\n  name_template: checksums.txt\n' })).length, 1);
  assert.deepEqual(await runCheck(releaseIntegrity, { '.goreleaser.yaml': 'builds: []\n' }), []);
});

test('SBOM generated or committed', async () => {
  const gen = await runCheck(sbom, ci('uses: anchore/sbom-action@v0'));
  assert.match(gen[0].detail, /generated in the pipeline/);
  const file = await runCheck(sbom, { 'dist/app.cdx.json': '{}' });
  assert.equal(file[0].detail, 'SBOM file committed');
  assert.deepEqual(await runCheck(sbom, { 'README.md': '' }), []);
});

test('release notes and release workflow', async () => {
  const both = await runCheck(releaseRecord, { 'CHANGELOG.md': '# 1.0', ...ci('run: echo') });
  assert.equal(both[0].detail, 'release notes and release workflow');
  const notes = await runCheck(releaseRecord, { 'CHANGES.rst': 'x' });
  assert.equal(notes[0].detail, 'release notes');
  assert.deepEqual(await runCheck(releaseRecord, { '.github/workflows/ci.yml': 'on: push\n' }), []);
});
