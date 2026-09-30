import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs, main } from '../src/cli.js';
import { WELL_KEPT, BARE } from './fixtures.js';

function sink() {
  let data = '';
  return { write(s) { data += s; }, get text() { return data; } };
}

async function tree(files) {
  const root = await mkdtemp(join(tmpdir(), 'ssdf-cli-'));
  for (const [path, content] of Object.entries(files)) {
    const full = join(root, ...path.split('/'));
    await mkdir(join(full, '..'), { recursive: true });
    await writeFile(full, content);
  }
  return root;
}

test('parseArgs defaults and options', () => {
  const d = parseArgs([]);
  assert.equal(d.path, '.');
  assert.equal(d.format, 'text');
  const o = parseArgs(['repo', '--format', 'sarif', '--require', 'ps.1, pw.8', '--ignore', '^fixtures/', '-v']);
  assert.equal(o.path, 'repo');
  assert.deepEqual(o.require, ['PS.1', 'PW.8']);
  assert.ok(o.ignore[0].test('fixtures/a'));
  assert.equal(o.verbose, true);
});

test('--require-all adds every practice a repository can show in full', () => {
  const o = parseArgs(['--require-all']);
  assert.ok(o.require.includes('PS.2'));
  assert.ok(!o.require.includes('PO.2'));
});

test('parseArgs refuses bad input', () => {
  assert.throws(() => parseArgs(['--format', 'xml']), /unknown format/);
  assert.throws(() => parseArgs(['--require', 'PW.3']), /not a practice/);
  assert.throws(() => parseArgs(['--nope']), /unknown option/);
  assert.throws(() => parseArgs(['--output']), /needs a value/);
  assert.throws(() => parseArgs(['a', 'b']), /only one path/);
  assert.throws(() => parseArgs(['--checks', 'tests,nope']), /unknown check: nope/);
});

test('help, list and usage errors', async () => {
  const out = sink();
  assert.equal(await main(['--help'], { stdout: out, stderr: sink() }), 0);
  assert.match(out.text, /Exit codes/);
  const list = sink();
  assert.equal(await main(['--list'], { stdout: list, stderr: sink() }), 0);
  assert.match(list.text, /PS\.2 {2}Provide a Mechanism[\s\S]*checks: release-integrity/);
  const err = sink();
  assert.equal(await main(['--format'], { stdout: sink(), stderr: err }), 2);
  assert.match(err.text, /needs a value/);
});

test('scans a folder and fails when a required practice is not met', async (t) => {
  const root = await tree(BARE);
  t.after(() => rm(root, { recursive: true, force: true }));
  const out = sink();
  const err = sink();
  assert.equal(await main([root, '--require', 'PW.8'], { stdout: out, stderr: err }), 1);
  assert.match(out.text, /0 of 19 practices with evidence/);
  assert.match(err.text, /required practice\(s\) not met: PW\.8/);
});

test('writes markdown to a file and passes a well-kept repository', async (t) => {
  const root = await tree(WELL_KEPT);
  t.after(() => rm(root, { recursive: true, force: true }));
  const file = join(root, 'report.md');
  const code = await main([root, '--format', 'markdown', '--output', file, '--require-all', '--fail-on-problem'], { stdout: sink(), stderr: sink() });
  assert.equal(code, 0);
  assert.match(await readFile(file, 'utf8'), /^## SSDF evidence report/);
});

test('--fail-on-problem fails on a high-severity problem', async (t) => {
  const root = await tree({ ...BARE, '.env': 'SECRET=1' });
  t.after(() => rm(root, { recursive: true, force: true }));
  const err = sink();
  assert.equal(await main([root, '--format', 'json', '--fail-on-problem'], { stdout: sink(), stderr: err }), 1);
  assert.match(err.text, /1 practice\(s\) with a high-severity problem/);
});

test('a missing folder is a usage error', async () => {
  const err = sink();
  assert.equal(await main([join(tmpdir(), 'ssdf-missing-folder')], { stdout: sink(), stderr: err }), 2);
  assert.match(err.text, /not a directory/);
});
