import test from 'node:test';
import assert from 'node:assert/strict';
import { secretScanner, ignorePrivate, committedSecrets, findSecrets } from '../src/checks/secrets.js';
import { memoryRepo } from '../src/repo.js';
import { runCheck, fakeGithubToken, fakeAwsKey, fakePrivateKey } from './fixtures.js';

test('findSecrets knows the common credential shapes', () => {
  assert.deepEqual(findSecrets(`token = "${fakeGithubToken()}"`), ['GitHub token']);
  assert.deepEqual(findSecrets(`aws_access_key_id=${fakeAwsKey()}`), ['AWS access key']);
  assert.deepEqual(findSecrets(fakePrivateKey()), ['private key']);
  assert.deepEqual(findSecrets('nothing here'), []);
});

test('placeholders next to the value are not reported', () => {
  assert.deepEqual(findSecrets(`example: ${fakeAwsKey()}`), []);
  assert.deepEqual(findSecrets(`AKIA${'X'.repeat(16)}`), []);
});

test('committed credentials are a high-severity problem, without printing the value', async () => {
  const token = fakeGithubToken();
  const r = await runCheck(committedSecrets, { 'config/deploy.sh': `export GH_TOKEN=${token}\n`, 'src/ok.js': '1' });
  assert.equal(r.length, 1);
  assert.equal(r[0].severity, 'high');
  assert.deepEqual(r[0].files, ['config/deploy.sh']);
  assert.ok(!JSON.stringify(r).includes(token));
});

test('committed .env files are flagged, examples are not', async () => {
  const r = await runCheck(committedSecrets, { '.env': 'A=1', 'api/.env.production': 'B=2', '.env.example': 'A=' });
  assert.deepEqual(r[0].files, ['.env', 'api/.env.production']);
});

test('lock files and ignored paths are skipped', async () => {
  const token = fakeGithubToken();
  const repo = memoryRepo({ 'package-lock.json': token, 'test/data/token.txt': token });
  assert.deepEqual(await committedSecrets.run(repo, { ci: [], ignore: [/^test\/data\//] }), []);
});

test('secret scanner in pipeline, pre-commit or configuration', async () => {
  const pipeline = await runCheck(secretScanner, { '.github/workflows/s.yml': 'steps:\n  - uses: gitleaks/gitleaks-action@v2\n' });
  assert.match(pipeline[0].detail, /pipeline/);
  const hook = await runCheck(secretScanner, { '.pre-commit-config.yaml': 'repos:\n  - repo: https://github.com/Yelp/detect-secrets\n' });
  assert.match(hook[0].detail, /pre-commit hook/);
  assert.deepEqual(await runCheck(secretScanner, { 'README.md': 'we use gitleaks' }), []);
});

test('.gitignore that keeps private files out', async () => {
  const r = await runCheck(ignorePrivate, { '.gitignore': 'node_modules\n.env\n*.pem\n' });
  assert.match(r[0].detail, /\.env, \*\.pem/);
  assert.deepEqual(await runCheck(ignorePrivate, { '.gitignore': 'node_modules\n' }), []);
  assert.deepEqual(await runCheck(ignorePrivate, {}), []);
});
