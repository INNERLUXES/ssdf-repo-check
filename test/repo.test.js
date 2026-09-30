import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openRepo, memoryRepo } from '../src/repo.js';

async function tempTree(files) {
  const root = await mkdtemp(join(tmpdir(), 'ssdf-'));
  for (const [path, content] of Object.entries(files)) {
    const full = join(root, ...path.split('/'));
    await mkdir(join(full, '..'), { recursive: true });
    await writeFile(full, content);
  }
  return root;
}

test('lists files with forward slashes and skips installed code', async (t) => {
  const root = await tempTree({
    'a.js': '1',
    'src/b.js': '2',
    'node_modules/x/index.js': '3',
    '.git/config': '4',
    'coverage/lcov.info': '5'
  });
  t.after(() => rm(root, { recursive: true, force: true }));
  const repo = await openRepo(root);
  assert.deepEqual(repo.files, ['a.js', 'src/b.js']);
  assert.ok(repo.has('src/b.js'));
  assert.deepEqual(repo.find(/^src\//), ['src/b.js']);
  assert.equal(await repo.text('src/b.js'), '2');
});

test('binary and oversized files are not read', async (t) => {
  const root = await tempTree({
    'logo.png': 'not really a png',
    'data.bin': Buffer.from([1, 2, 0, 3]),
    'big.txt': 'x'.repeat(600 * 1024)
  });
  t.after(() => rm(root, { recursive: true, force: true }));
  const repo = await openRepo(root);
  assert.equal(await repo.text('logo.png'), null);
  assert.equal(await repo.text('data.bin'), null);
  assert.equal(await repo.text('big.txt'), null);
  assert.equal(await repo.text('missing.txt'), null);
});

test('stops at the file limit and says so', async (t) => {
  const root = await tempTree({ 'a': '1', 'b': '2', 'c': '3' });
  t.after(() => rm(root, { recursive: true, force: true }));
  const repo = await openRepo(root, { maxFiles: 2 });
  assert.equal(repo.files.length, 2);
  assert.equal(repo.truncated, true);
});

test('symbolic links are not followed', async (t) => {
  const outside = await tempTree({ 'private.txt': 'outside the repository' });
  const root = await tempTree({ 'a.js': '1' });
  t.after(() => Promise.all([rm(root, { recursive: true, force: true }), rm(outside, { recursive: true, force: true })]));
  let made = 0;
  await symlink(outside, join(root, 'linked-dir'), 'junction').then(() => made++, () => {});
  await symlink(join(outside, 'private.txt'), join(root, 'linked-file.txt')).then(() => made++, () => {});
  if (!made) {
    t.skip('this system does not allow creating links');
    return;
  }
  const repo = await openRepo(root);
  assert.deepEqual(repo.files, ['a.js']);
});

test('a path that is not a directory is refused', async () => {
  await assert.rejects(openRepo(join(tmpdir(), 'no-such-dir-ssdf-check')), /not a directory/);
});

test('memoryRepo has the same interface', async () => {
  const repo = memoryRepo({ 'b.txt': 'B', 'a.txt': 'A' });
  assert.deepEqual(repo.files, ['a.txt', 'b.txt']);
  assert.equal(await repo.text('a.txt'), 'A');
  assert.equal(await repo.text('c.txt'), null);
});
