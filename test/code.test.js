import test from 'node:test';
import assert from 'node:assert/strict';
import { tests, staticAnalysis, codingRules, dynamicTesting } from '../src/checks/code.js';
import { runCheck } from './fixtures.js';

const ci = (run) => ({ '.github/workflows/ci.yml': `steps:\n  - run: ${run}\n` });

test('test files that the pipeline runs', async () => {
  const r = await runCheck(tests, { 'test/a.test.js': '', ...ci('npm test') });
  assert.equal(r[0].kind, 'evidence');
  assert.match(r[0].detail, /1 test file/);
});

test('test files that nothing runs are a warning', async () => {
  const r = await runCheck(tests, { 'pkg/sum_test.go': '', 'app/test_views.py': '' });
  assert.equal(r[0].kind, 'problem');
  assert.equal(r[0].severity, 'warning');
  assert.match(r[0].detail, /^2 test file/);
});

test('test runners of several languages', async () => {
  for (const run of ['pytest -q', 'go test ./...', 'cargo test --locked', 'dotnet test', './gradlew check', 'node --test']) {
    assert.equal((await runCheck(tests, ci(run))).length, 1, run);
  }
  assert.deepEqual(await runCheck(tests, ci('echo hello')), []);
});

test('static analysis in the pipeline or as configuration', async () => {
  const r = await runCheck(staticAnalysis, { '.github/workflows/codeql.yml': 'steps:\n  - uses: github/codeql-action/init@v3\n' });
  assert.match(r[0].detail, /github\/codeql-action/);
  const cfg = await runCheck(staticAnalysis, { '.semgrep.yml': 'rules: []' });
  assert.equal(cfg[0].detail, 'analysis configuration committed');
  assert.deepEqual(await runCheck(staticAnalysis, ci('npm test')), []);
});

test('coding rules: configured only, or run by the pipeline', async () => {
  const configured = await runCheck(codingRules, { 'eslint.config.js': '' });
  assert.match(configured[0].detail, /not run by the pipeline/);
  const run = await runCheck(codingRules, { 'ruff.toml': '', ...ci('ruff check .') });
  assert.match(run[0].detail, /^pipeline runs ruff check/);
  assert.deepEqual(await runCheck(codingRules, { '.editorconfig': 'root = true' }), []);
});

test('fuzzing and dynamic testing', async () => {
  assert.equal((await runCheck(dynamicTesting, ci('go test ./parser -fuzz=FuzzParse -fuzztime=60s'))).length, 1);
  assert.equal((await runCheck(dynamicTesting, { 'fuzz/fuzz_targets/parse.rs': '' })).length, 1);
  assert.deepEqual(await runCheck(dynamicTesting, ci('npm test')), []);
});
