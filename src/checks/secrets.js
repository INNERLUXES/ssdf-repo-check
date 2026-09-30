// Secrets: a scanner in place, private files kept out, and nothing that looks like a live credential committed.

import { ciHits, evidence, problem } from './util.js';

const SCANNER_CI = /\b(gitleaks|trufflehog|trufflesecurity\/trufflehog|detect-secrets|ggshield|gitguardian|git-secrets|secretlint|talisman|kingfisher|betterleaks)/i;
const SCANNER_FILES = /^(\.gitleaks\.toml|gitleaks\.toml|\.secrets\.baseline|\.talismanrc|\.secretlintrc(\.json)?|\.gitguardian\.ya?ml)$/;

export const secretScanner = {
  id: 'secret-scanner',
  title: 'Secret scanning',
  practices: ['PS.1', 'PW.7'],
  async run(repo, { ci }) {
    const hits = ciHits(ci, SCANNER_CI);
    const files = repo.find(SCANNER_FILES);
    const preCommit = repo.has('.pre-commit-config.yaml') && SCANNER_CI.test((await repo.text('.pre-commit-config.yaml')) || '');
    if (!hits.length && !files.length && !preCommit) return [];
    const where = [hits.length && 'pipeline', preCommit && 'pre-commit hook', files.length && 'configuration'].filter(Boolean).join(', ');
    return [evidence(this.id, [...hits.map((h) => h.path), ...files, ...(preCommit ? ['.pre-commit-config.yaml'] : [])], `secret scanner in: ${where}`)];
  }
};

export const ignorePrivate = {
  id: 'ignore-private',
  title: 'Private files kept out of version control',
  practices: ['PS.1'],
  async run(repo) {
    if (!repo.has('.gitignore')) return [];
    const text = (await repo.text('.gitignore')) || '';
    const lines = text.split(/\r?\n/).map((l) => l.trim());
    const covers = lines.filter((l) => /^\/?(\*\*\/)?(\.env(\*|\.\*|\.local)?|\*\.pem|\*\.key|\*\.p12|\*\.pfx|\*\.jks|\*\.keystore|id_rsa\*?|credentials(\.json)?|secrets?(\/|\.\w+)?|\*\.tfvars|\.npmrc|\.pypirc)$/.test(l));
    return covers.length ? [evidence(this.id, ['.gitignore'], `ignores ${covers.slice(0, 5).join(', ')}`)] : [];
  }
};

// Shapes of real credentials. Each has a fixed prefix or structure, so example text rarely matches.
export const SECRET_PATTERNS = Object.freeze([
  { name: 'private key', pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY(?: BLOCK)?-----/ },
  { name: 'GitHub token', pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}\b|\bgithub_pat_[A-Za-z0-9_]{60,}\b/ },
  { name: 'AWS access key', pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/ },
  { name: 'Google API key', pattern: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { name: 'Slack token', pattern: /\bxox[abprs]-[0-9A-Za-z-]{10,}\b/ },
  { name: 'Stripe live key', pattern: /\b(?:sk|rk)_live_[0-9A-Za-z]{20,}\b/ },
  { name: 'npm token', pattern: /\bnpm_[A-Za-z0-9]{36}\b/ },
  { name: 'service account key', pattern: /"type"\s*:\s*"service_account"[\s\S]{0,400}"private_key"\s*:\s*"-----BEGIN/ }
]);

const PLACEHOLDER = /(example|placeholder|dummy|fake|redacted|x{8,}|0{16,}|your[_-]?(key|token))/i;
const SKIP_FILES = /(^|\/)(\.secrets\.baseline|\.gitleaks\.toml)$|\.(lock|lockb|min\.js|map|svg)$|(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml)$/;

export function findSecrets(text) {
  const found = [];
  for (const { name, pattern } of SECRET_PATTERNS) {
    const m = text.match(pattern);
    if (!m) continue;
    const around = text.slice(Math.max(0, m.index - 80), m.index + m[0].length + 80);
    if (PLACEHOLDER.test(around)) continue;
    found.push(name);
  }
  return found;
}

export const committedSecrets = {
  id: 'committed-secrets',
  title: 'No credentials in the repository',
  practices: ['PS.1'],
  async run(repo, { ignore = [] } = {}) {
    const out = [];
    const envFiles = repo.find(/(^|\/)\.env(\.[\w-]+)?$/).filter((f) => !/\.(example|sample|template|dist|defaults)$/.test(f));
    if (envFiles.length) out.push(problem(this.id, envFiles, 'environment file committed: these usually hold real settings and secrets', 'high'));
    const hits = [];
    for (const path of repo.files) {
      if (SKIP_FILES.test(path) || ignore.some((p) => p.test(path))) continue;
      const text = await repo.text(path);
      if (text == null) continue;
      const names = findSecrets(text);
      if (names.length) hits.push({ path, names });
    }
    if (hits.length) {
      const kinds = [...new Set(hits.flatMap((h) => h.names))].join(', ');
      out.push(problem(this.id, hits.map((h) => h.path), `text shaped like a live credential (${kinds}); the value itself is not printed`, 'high'));
    }
    return out;
  }
};

export default [secretScanner, ignorePrivate, committedSecrets];
