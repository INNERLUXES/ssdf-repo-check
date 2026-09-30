import test from 'node:test';
import assert from 'node:assert/strict';
import { scanRepo } from '../src/scan.js';
import { toText, toMarkdown, toJson, toSarif } from '../src/report.js';
import { repoOf, WELL_KEPT, BARE } from './fixtures.js';

const bad = {
  ...BARE,
  '.github/workflows/ci.yml': 'on: push\npermissions: write-all\njobs:\n  t:\n    steps:\n      - uses: actions/checkout@v4\n',
  'Dockerfile': 'FROM node:22\n'
};

test('text report groups practices and ends with the totals', async () => {
  const text = toText(await scanRepo(repoOf(WELL_KEPT)));
  assert.match(text, /^NIST SP 800-218 SSDF 1\.1/);
  assert.match(text, /PS {2}Protect the Software/);
  assert.match(text, /PW\.8 {2}found/);
  assert.match(text, /19 of 19 practices with evidence/);
  assert.match(text, /not proof/);
});

test('text report shows problems with the files behind them', async () => {
  const text = toText(await scanRepo(repoOf(bad)));
  assert.match(text, /PO\.5 {2}PROBLEM/);
  assert.match(text, /! Workflow token limited to what it needs: permissions: write-all .*\[\.github\/workflows\/ci\.yml\]/);
});

test('markdown report is a table with one row per practice', async () => {
  const md = toMarkdown(await scanRepo(repoOf(bad)));
  const rows = md.split('\n').filter((l) => /^\| [A-Z]{2}\.\d/.test(l));
  assert.equal(rows.length, 19);
  assert.match(md, /\*\*Problem:\*\*/);
  assert.match(md, /Review and\/or Analyze/);
  assert.match(md, /nothing found; a repository shows part of this practice/);
});

test('json report round-trips', async () => {
  const report = await scanRepo(repoOf(BARE));
  assert.deepEqual(JSON.parse(toJson(report)).summary, report.summary);
});

test('SARIF has one rule per check and one result per file', async () => {
  const sarif = JSON.parse(toSarif(await scanRepo(repoOf(bad)), { version: '1.0.0' }));
  assert.equal(sarif.version, '2.1.0');
  const run = sarif.runs[0];
  assert.equal(run.tool.driver.version, '1.0.0');
  const ruleIds = run.tool.driver.rules.map((r) => r.id).sort();
  assert.deepEqual(ruleIds, ['actions-pinned', 'containers', 'lock-files', 'workflow-permissions']);
  const perm = run.results.find((r) => r.ruleId === 'workflow-permissions');
  assert.equal(perm.level, 'error');
  assert.equal(perm.locations[0].physicalLocation.artifactLocation.uri, '.github/workflows/ci.yml');
  assert.ok(run.tool.driver.rules.find((r) => r.id === 'containers').properties.tags.includes('ssdf/PW.9'));
});

test('SARIF of a clean repository has no results', async () => {
  const sarif = JSON.parse(toSarif(await scanRepo(repoOf(WELL_KEPT))));
  assert.deepEqual(sarif.runs[0].results, []);
});
