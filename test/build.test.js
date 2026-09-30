import test from 'node:test';
import assert from 'node:assert/strict';
import { repeatableBuild, compilerHardening, containers } from '../src/checks/build.js';
import { runCheck } from './fixtures.js';

const DIGEST = `@sha256:${'b'.repeat(64)}`;

test('locked installs in the pipeline', async () => {
  for (const run of ['npm ci', 'pnpm install --frozen-lockfile', 'pip install --require-hashes -r requirements.txt', 'cargo build --release --locked', 'go mod verify']) {
    assert.equal((await runCheck(repeatableBuild, { '.gitlab-ci.yml': `build:\n  script:\n    - ${run}\n` })).length, 1, run);
  }
  assert.deepEqual(await runCheck(repeatableBuild, { '.gitlab-ci.yml': 'build:\n  script:\n    - npm install\n' }), []);
});

test('hardening flags and strict type checking', async () => {
  const c = await runCheck(compilerHardening, { 'CMakeLists.txt': 'add_compile_options(-fstack-protector-strong -D_FORTIFY_SOURCE=2)' });
  assert.equal(c[0].detail, 'hardening flags in the build');
  const ts = await runCheck(compilerHardening, { 'tsconfig.base.json': '{ "compilerOptions": { "strict": true } }' });
  assert.equal(ts[0].detail, 'strict type checking');
  const py = await runCheck(compilerHardening, { 'pyproject.toml': '[tool.mypy]\nstrict = true\n' });
  assert.equal(py[0].detail, 'strict type checking');
  assert.deepEqual(await runCheck(compilerHardening, { 'tsconfig.json': '{ "compilerOptions": {} }' }), []);
});

test('container: pinned and non-root is evidence', async () => {
  const r = await runCheck(containers, { 'Dockerfile': `FROM python:3.12-slim${DIGEST}\nUSER 10001\n` });
  assert.equal(r.length, 1);
  assert.equal(r[0].kind, 'evidence');
});

test('container: root user and floating tag are problems', async () => {
  const r = await runCheck(containers, { 'Dockerfile': 'FROM ubuntu:24.04\nRUN apt-get update\n' });
  assert.equal(r.length, 2);
  assert.ok(r.every((x) => x.kind === 'problem'));
  const back = await runCheck(containers, { 'Dockerfile': `FROM node:22${DIGEST}\nUSER node\nUSER root\n` });
  assert.match(back[0].detail, /runs as root/);
});

test('container: build stages, scratch and distroless', async () => {
  const multi = [
    `FROM golang:1.23${DIGEST} AS build`,
    'RUN go build -o /app',
    `FROM gcr.io/distroless/static:nonroot${DIGEST}`,
    'COPY --from=build /app /app'
  ].join('\n');
  assert.equal((await runCheck(containers, { 'Dockerfile': multi }))[0].kind, 'evidence');
  const scratch = `FROM rust:1${DIGEST} AS build\nFROM scratch\nCOPY --from=build /x /x\n`;
  assert.equal((await runCheck(containers, { 'deploy/api.Dockerfile': scratch }))[0].kind, 'evidence');
  assert.deepEqual(await runCheck(containers, { 'README.md': '' }), []);
});
