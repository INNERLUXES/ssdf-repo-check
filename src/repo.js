// A read-only view of a repository on disk: the list of files, and their text on demand.
// Directories that hold installed or generated code are skipped, and large or binary files are never read.

import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

export const DEFAULT_SKIP = Object.freeze([
  '.git', 'node_modules', 'vendor', 'dist', 'build', 'out', 'target', 'coverage',
  '.venv', 'venv', '__pycache__', '.tox', '.gradle', '.idea', '.next', '.cache'
]);

const TEXT_LIMIT = 512 * 1024;
const BINARY = /\.(png|jpe?g|gif|webp|ico|pdf|zip|gz|tgz|jar|exe|dll|so|dylib|woff2?|ttf|otf|mp4|mov|wasm)$/i;

export async function openRepo(root, { skip = DEFAULT_SKIP, maxFiles = 50000 } = {}) {
  const info = await stat(root).catch(() => null);
  if (!info || !info.isDirectory()) throw new Error(`not a directory: ${root}`);
  const skipSet = new Set(skip);
  const files = [];
  let truncated = false;

  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
    entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const entry of entries) {
      if (files.length >= maxFiles) { truncated = true; return; }
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!skipSet.has(entry.name)) await walk(full);
      } else if (entry.isFile()) {
        files.push(relative(root, full).split(sep).join('/'));
      }
    }
  }
  await walk(root);

  const cache = new Map();
  return {
    root,
    files,
    truncated,
    has(path) { return files.includes(path); },
    find(pattern) { return files.filter((f) => pattern.test(f)); },
    async text(path) {
      if (cache.has(path)) return cache.get(path);
      let value = null;
      if (!BINARY.test(path)) {
        const full = join(root, ...path.split('/'));
        const size = (await stat(full).catch(() => ({ size: Infinity }))).size;
        if (size <= TEXT_LIMIT) {
          const buf = await readFile(full).catch(() => null);
          if (buf && !buf.subarray(0, 8000).includes(0)) value = buf.toString('utf8');
        }
      }
      cache.set(path, value);
      return value;
    }
  };
}

// For tests and examples: a repository held in memory, same interface as openRepo.
export function memoryRepo(entries) {
  const map = new Map(Object.entries(entries));
  const files = [...map.keys()].sort();
  return {
    root: '(memory)',
    files,
    truncated: false,
    has(path) { return map.has(path); },
    find(pattern) { return files.filter((f) => pattern.test(f)); },
    async text(path) { return map.has(path) ? map.get(path) : null; }
  };
}
