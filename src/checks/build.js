// How the software is built and shipped: repeatable installs, strict compiler settings, and containers that do not run as root.

import { ciHits, evidence, problem } from './util.js';

const REPEATABLE_INSTALL = /\b(npm ci\b|pnpm install [^\n]*--frozen-lockfile|yarn install [^\n]*--(?:frozen-lockfile|immutable)|yarn --frozen-lockfile|pip install [^\n]*--require-hashes|uv sync [^\n]*--(?:locked|frozen)|poetry install [^\n]*--(?:sync|no-root)|go mod verify|cargo (?:build|test) [^\n]*--locked|bundle install [^\n]*--frozen|bundle config [^\n]*frozen|composer install|dotnet restore [^\n]*--locked-mode)/;

export const repeatableBuild = {
  id: 'repeatable-build',
  title: 'Pipeline installs exactly the locked versions',
  practices: ['PW.6', 'PO.3'],
  async run(repo, { ci }) {
    const hits = ciHits(ci, REPEATABLE_INSTALL);
    return hits.length ? [evidence(this.id, hits.map((h) => h.path), [...new Set(hits.map((h) => h.match))].join('; '))] : [];
  }
};

const HARDENING_FLAGS = /(-fstack-protector(?:-strong|-all)?|-D_FORTIFY_SOURCE=\d|-fPIE|-pie\b|-Wl,-z,(?:relro|now|noexecstack)|-fcf-protection|-ftrivial-auto-var-init|\/guard:cf|\/GS\b|\/DYNAMICBASE|\/NXCOMPAT|-trimpath|overflow-checks\s*=\s*true|-Werror)/;
const BUILD_FILES = /(^|\/)(CMakeLists\.txt|Makefile|[\w.-]+\.mk|meson\.build|configure\.ac|build\.rs|Cargo\.toml|\.cargo\/config\.toml|[\w.-]+\.vcxproj|Directory\.Build\.props|BUILD(\.bazel)?|\.bazelrc|go\.mod|\.goreleaser\.ya?ml)$/;

export const compilerHardening = {
  id: 'compiler-hardening',
  title: 'Strict or hardened compiler settings',
  practices: ['PW.6'],
  async run(repo, { ci }) {
    const out = [];
    const files = [];
    for (const path of repo.find(BUILD_FILES)) {
      const text = await repo.text(path);
      if (text && HARDENING_FLAGS.test(text)) files.push(path);
    }
    const ciFlags = ciHits(ci, HARDENING_FLAGS);
    const strict = [];
    for (const path of repo.find(/(^|\/)tsconfig(\.[\w-]+)?\.json$/)) {
      const text = await repo.text(path);
      if (text && /"strict"\s*:\s*true/.test(text)) strict.push(path);
    }
    for (const path of repo.find(/(^|\/)(pyproject\.toml|mypy\.ini|setup\.cfg)$/)) {
      const text = await repo.text(path);
      if (text && /^\s*strict\s*=\s*true/m.test(text) && /mypy/.test(text)) strict.push(path);
    }
    if (files.length || ciFlags.length) out.push(evidence(this.id, [...files, ...ciFlags.map((h) => h.path)], 'hardening flags in the build'));
    if (strict.length) out.push(evidence(this.id, strict, 'strict type checking'));
    return out;
  }
};

export const containers = {
  id: 'containers',
  title: 'Container images: pinned base, not run as root',
  practices: ['PW.6', 'PW.9', 'PW.4'],
  async run(repo) {
    const out = [];
    const dockerfiles = repo.find(/(^|\/)(Dockerfile|Containerfile)(\.[\w-]+)?$|\.dockerfile$/i);
    if (!dockerfiles.length) return out;
    const rootUser = [];
    const floating = [];
    const good = [];
    for (const path of dockerfiles) {
      const text = (await repo.text(path)) || '';
      const froms = [...text.matchAll(/^\s*FROM\s+(?:--platform=\S+\s+)?(\S+)/gim)].map((m) => m[1]);
      const users = [...text.matchAll(/^\s*USER\s+(\S+)/gim)].map((m) => m[1]);
      const last = users.at(-1);
      const distroless = froms.length && /distroless|chainguard|:nonroot/.test(froms.at(-1));
      const scratch = froms.at(-1) === 'scratch';
      const root = !scratch && !distroless && (!last || /^(root|0)(:|$)/.test(last));
      const stageNames = new Set([...text.matchAll(/^\s*FROM\s+\S+(?:\s+\S+)?\s+AS\s+(\S+)/gim)].map((m) => m[1].toLowerCase()));
      const unpinned = froms.filter((f) => f !== 'scratch' && !stageNames.has(f.toLowerCase()) && !/@sha256:[0-9a-f]{64}$/.test(f));
      if (root) rootUser.push(path);
      if (unpinned.length) floating.push(path);
      if (!root && !unpinned.length) good.push(path);
    }
    if (good.length) out.push(evidence(this.id, good, 'base image pinned by digest and a non-root user'));
    if (rootUser.length) out.push(problem(this.id, rootUser, 'the container runs as root: add a USER line with an unprivileged user'));
    if (floating.length) out.push(problem(this.id, floating, 'base image by tag: pin it by @sha256 digest so a rebuild uses the same image'));
    return out;
  }
};

export default [repeatableBuild, compilerHardening, containers];
