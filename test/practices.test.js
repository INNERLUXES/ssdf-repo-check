import test from 'node:test';
import assert from 'node:assert/strict';
import { GROUPS, PRACTICES, MOVED, getPractice, practicesInGroup } from '../src/practices.js';

test('the four groups of SSDF 1.1', () => {
  assert.deepEqual(Object.keys(GROUPS), ['PO', 'PS', 'PW', 'RV']);
  assert.equal(GROUPS.PW, 'Produce Well-Secured Software');
});

test('19 practices, PW.3 moved', () => {
  assert.equal(PRACTICES.length, 19);
  assert.equal(practicesInGroup('po').length, 5);
  assert.equal(practicesInGroup('PS').length, 3);
  assert.equal(practicesInGroup('PW').length, 8);
  assert.equal(practicesInGroup('RV').length, 3);
  assert.ok(!PRACTICES.some((p) => p.id === 'PW.3'));
  assert.match(MOVED['PW.3'], /PO\.1\.3 and PW\.4\.4/);
});

test('ids are unique and each practice names its group', () => {
  assert.equal(new Set(PRACTICES.map((p) => p.id)).size, PRACTICES.length);
  for (const p of PRACTICES) assert.equal(p.group, p.id.slice(0, 2));
  for (const p of PRACTICES) assert.ok(['repository', 'partial', 'organization'].includes(p.scope));
});

test('getPractice accepts any case and explains moved or unknown ids', () => {
  assert.equal(getPractice(' ps.2 ').name, 'Provide a Mechanism for Verifying Software Release Integrity');
  assert.throws(() => getPractice('PW.3'), /not a practice in SSDF 1\.1/);
  assert.throws(() => getPractice('XX.1'), /unknown SSDF practice/);
  assert.throws(() => practicesInGroup('ZZ'), /unknown SSDF group/);
});

test('practice objects cannot be changed', () => {
  assert.throws(() => { PRACTICES[0].name = 'x'; }, TypeError);
});
