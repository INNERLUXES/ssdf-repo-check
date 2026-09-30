import test from 'node:test';
import assert from 'node:assert/strict';
import { securityPolicy, codeOwners, reviewTemplate, contributing } from '../src/checks/people.js';
import { runCheck } from './fixtures.js';

test('security policy with and without a way to report', async () => {
  const good = await runCheck(securityPolicy, { '.github/SECURITY.md': 'Use private vulnerability reporting on GitHub.' });
  assert.equal(good[0].kind, 'evidence');
  const vague = await runCheck(securityPolicy, { 'SECURITY.md': 'We take security seriously.' });
  assert.equal(vague[0].kind, 'problem');
  assert.deepEqual(await runCheck(securityPolicy, { 'README.md': 'x' }), []);
});

test('CODEOWNERS needs at least one rule with an owner', async () => {
  const good = await runCheck(codeOwners, { 'CODEOWNERS': '* @team\n/docs/ docs@example.org\n' });
  assert.match(good[0].detail, /^2 ownership/);
  const empty = await runCheck(codeOwners, { '.github/CODEOWNERS': '# nobody yet\n' });
  assert.equal(empty[0].kind, 'problem');
});

test('pull request and merge request templates', async () => {
  assert.equal((await runCheck(reviewTemplate, { '.github/pull_request_template.md': 'x' })).length, 1);
  assert.equal((await runCheck(reviewTemplate, { '.github/PULL_REQUEST_TEMPLATE/bug.md': 'x' })).length, 1);
  assert.equal((await runCheck(reviewTemplate, { '.gitlab/merge_request_templates/default.md': 'x' })).length, 1);
  assert.deepEqual(await runCheck(reviewTemplate, { 'README.md': 'x' }), []);
});

test('contribution rules', async () => {
  const r = await runCheck(contributing, { 'CONTRIBUTING.md': 'Changes need a review and tests.' });
  assert.match(r[0].detail, /review, testing or security/);
  const plain = await runCheck(contributing, { 'CONTRIBUTING.md': 'Thanks for helping.' });
  assert.equal(plain[0].detail, 'contribution rules');
});
