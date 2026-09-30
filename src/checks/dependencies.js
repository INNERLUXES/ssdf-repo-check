// Third-party code: pinned by a lock file, kept current, and checked for known vulnerabilities.

import { ciHits, evidence, problem } from './util.js';

// manifest -> lock files that pin it
const ECOSYSTEMS = [
  { name: 'npm', manifest: 'package.json', locks: ['package-lock.json', 'npm-shrinkwrap.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb', 'bun.lock'] },
  { name: 'Python (Poetry)', manifest: 'pyproject.toml', locks: ['poetry.lock', 'uv.lock', 'pdm.lock', 'requirements.txt'] },
  { name: 'Python (Pipenv)', manifest: 'Pipfile', locks: ['Pipfile.lock'] },
  { name: 'Go', manifest: 'go.mod', locks: ['go.sum'] },
  { name: 'Rust', manifest: 'Cargo.toml', locks: ['Cargo.lock'] },
  { name: 'Ruby', manifest: 'Gemfile', locks: ['Gemfile.lock'] },
  { name: 'PHP', manifest: 'composer.json', locks: ['composer.lock'] },
  { name: '.NET', manifest: /\.csproj$/, locks: ['packages.lock.json'] },
  { name: 'Dart', manifest: 'pubspec.yaml', locks: ['pubspec.lock'] },
  { name: 'Swift', manifest: 'Package.swift', locks: ['Package.resolved'] }
];

function dirOf(path) {
  const i = path.lastIndexOf('/');
  return i === -1 ? '' : path.slice(0, i + 1);
}

export const lockFiles = {
  id: 'lock-files',
  title: 'Dependencies pinned by lock files',
  practices: ['PW.4', 'PS.1'],
  async run(repo) {
    const found = [];
    const missing = [];
    for (const eco of ECOSYSTEMS) {
      const manifests = repo.files.filter((f) => {
        const base = f.slice(f.lastIndexOf('/') + 1);
        return typeof eco.manifest === 'string' ? base === eco.manifest : eco.manifest.test(base);
      });
      for (const manifest of manifests) {
        if (eco.name === 'npm' && !(await hasNpmDependencies(repo, manifest))) continue;
        const dir = dirOf(manifest);
        const lock = eco.locks.map((l) => dir + l).find((l) => repo.has(l));
        if (lock) found.push(lock);
        else missing.push(manifest);
      }
    }
    const out = [];
    if (found.length) out.push(evidence(this.id, found.sort(), `${found.length} lock file(s)`));
    if (missing.length) out.push(problem(this.id, missing.sort(), 'manifest without a lock file: each install can resolve different versions'));
    return out;
  }
};

async function hasNpmDependencies(repo, path) {
  try {
    const pkg = JSON.parse(await repo.text(path));
    return ['dependencies', 'devDependencies', 'optionalDependencies'].some((k) => pkg[k] && Object.keys(pkg[k]).length);
  } catch {
    return true;
  }
}

export const dependencyUpdates = {
  id: 'dependency-updates',
  title: 'Automated dependency updates',
  practices: ['PW.4', 'RV.1'],
  async run(repo) {
    const files = repo.find(/^(\.github\/dependabot\.ya?ml|renovate\.json5?|\.renovaterc(\.json)?|\.github\/renovate\.json5?|\.gitlab\/renovate\.json)$/);
    return files.length ? [evidence(this.id, files, 'update bot configured')] : [];
  }
};

const AUDIT = /\b(npm audit|pnpm audit|yarn (?:npm )?audit|pip-audit|safety check|osv-scanner|govulncheck|cargo[- ]audit|cargo deny|bundle[- ]audit|composer audit|dotnet list [^\n]*--vulnerable|actions\/dependency-review-action|google\/osv-scanner-action|aquasecurity\/trivy-action|trivy (?:fs|image|repo)|anchore\/scan-action|grype |snyk (?:test|monitor)|snyk\/actions)/;

export const dependencyAudit = {
  id: 'dependency-audit',
  title: 'Known-vulnerability check of dependencies in the pipeline',
  practices: ['RV.1', 'PW.4'],
  async run(repo, { ci }) {
    const hits = ciHits(ci, AUDIT);
    return hits.length ? [evidence(this.id, hits.map((h) => h.path), [...new Set(hits.map((h) => h.match))].join('; '))] : [];
  }
};

export default [lockFiles, dependencyUpdates, dependencyAudit];
