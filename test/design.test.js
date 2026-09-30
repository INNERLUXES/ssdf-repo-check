import test from 'node:test';
import assert from 'node:assert/strict';
import { securityRequirements, threatModel, designDecisions, secureDefaults, vulnerabilityHistory } from '../src/checks/design.js';
import { runCheck } from './fixtures.js';

const body = 'A real paragraph about the system and how it is protected. '.repeat(10);

test('documents count only when they have content', async () => {
  assert.equal((await runCheck(threatModel, { 'docs/threat-model.md': body })).length, 1);
  assert.deepEqual(await runCheck(threatModel, { 'docs/threat-model.md': '# TODO\n' }), []);
});

test('document names in files or folders', async () => {
  assert.equal((await runCheck(threatModel, { 'security/threats/payments.md': body })).length, 1);
  assert.equal((await runCheck(securityRequirements, { 'docs/Security_Requirements.md': body })).length, 1);
  assert.equal((await runCheck(secureDefaults, { 'docs/hardening-guide.md': body })).length, 1);
  assert.deepEqual(await runCheck(threatModel, { 'src/threat-model.js': body }), []);
});

test('decision records and architecture documents', async () => {
  const adr = await runCheck(designDecisions, { 'docs/adr/0001-record.md': 'short', 'docs/adr/0002-queue.md': 'short' });
  assert.equal(adr[0].detail, '2 decision record(s)');
  const arch = await runCheck(designDecisions, { 'ARCHITECTURE.md': body });
  assert.equal(arch[0].detail, 'architecture document');
});

test('security fixes in release notes and root cause write-ups', async () => {
  const notes = await runCheck(vulnerabilityHistory, { 'CHANGELOG.md': '## 2.0.1\n\n- Fix for GHSA-abcd-1234-wxyz\n' });
  assert.equal(notes[0].detail, 'release notes name security fixes');
  const heading = await runCheck(vulnerabilityHistory, { 'CHANGELOG.md': '## 3.1.0\n\n### Security\n\n- tightened cookie flags\n' });
  assert.equal(heading.length, 1);
  const rca = await runCheck(vulnerabilityHistory, { 'docs/postmortems/2-login.md': body });
  assert.equal(rca[0].detail, 'root cause or incident write-up');
  assert.deepEqual(await runCheck(vulnerabilityHistory, { 'CHANGELOG.md': '## 1.0\n\n- first release\n' }), []);
});
