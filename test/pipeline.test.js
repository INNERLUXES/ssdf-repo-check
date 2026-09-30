import test from 'node:test';
import assert from 'node:assert/strict';
import { ciConfig, workflowPermissions, actionsPinned, pullRequestTarget } from '../src/checks/pipeline.js';
import { runCheck, SHA } from './fixtures.js';

const wf = (body) => ({ '.github/workflows/ci.yml': body });

test('pipeline files of several CI systems are found', async () => {
  const r = await runCheck(ciConfig, { '.gitlab-ci.yml': 'test:\n  script: make\n', 'Jenkinsfile': 'pipeline {}', 'README.md': '' });
  assert.equal(r.length, 1);
  assert.deepEqual(r[0].files, ['.gitlab-ci.yml', 'Jenkinsfile']);
  assert.deepEqual(await runCheck(ciConfig, { 'README.md': '' }), []);
});

test('workflow permissions: set, missing, write-all', async () => {
  const good = await runCheck(workflowPermissions, wf('on: push\npermissions:\n  contents: read\njobs: {}\n'));
  assert.equal(good[0].kind, 'evidence');

  const missing = await runCheck(workflowPermissions, wf('on: push\njobs: {}\n'));
  assert.equal(missing[0].kind, 'problem');
  assert.equal(missing[0].severity, 'warning');

  const all = await runCheck(workflowPermissions, wf('on: push\npermissions: write-all\njobs: {}\n'));
  assert.equal(all[0].severity, 'high');
});

test('a commented-out permissions line does not count', async () => {
  const r = await runCheck(workflowPermissions, wf('on: push\n# permissions:\n#   contents: read\njobs: {}\n'));
  assert.equal(r[0].kind, 'problem');
});

test('actions pinned by hash versus by tag', async () => {
  const r = await runCheck(actionsPinned, wf([
    'steps:',
    `  - uses: actions/checkout@${SHA}`,
    '  - uses: actions/setup-node@v4',
    "  - uses: 'some/action@main'",
    '  - uses: ./local-action',
    '  - uses: docker://alpine:3'
  ].join('\n')));
  const ev = r.find((x) => x.kind === 'evidence');
  const pr = r.find((x) => x.kind === 'problem');
  assert.match(ev.detail, /^1 action/);
  assert.match(pr.detail, /^2 action.*actions\/setup-node@v4, some\/action@main/);
});

test('pull_request_target that checks out the fork head is flagged', async () => {
  const risky = await runCheck(pullRequestTarget, wf([
    'on: pull_request_target',
    'jobs:',
    '  t:',
    '    steps:',
    '      - uses: actions/checkout@v4',
    '        with:',
    '          ref: ${{ github.event.pull_request.head.sha }}'
  ].join('\n')));
  assert.equal(risky[0].severity, 'high');
  const safe = await runCheck(pullRequestTarget, wf('on: pull_request_target\njobs:\n  label:\n    steps:\n      - run: echo labels only\n'));
  assert.deepEqual(safe, []);
});
