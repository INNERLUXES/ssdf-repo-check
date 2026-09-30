// The code itself: tests, analysis tools, and coding rules that a machine enforces.

import { ciHits, evidence, problem } from './util.js';

const TEST_FILE = /(^|\/)(tests?|__tests__|spec|specs)\/|(^|\/)[^/]+[._-](test|spec)\.[a-z]+$|(^|\/)test_[^/]+\.py$|_test\.go$|Tests?\.(cs|java|kt|swift)$/;
const TEST_RUN = /\b(npm (?:run )?test|npm run test:[\w-]+|pnpm (?:run )?test|yarn (?:run )?test|node --test|pytest|python -m (?:pytest|unittest)|tox\b|nox\b|go test|cargo test|cargo nextest|mvn (?:-\S+ )*(?:test|verify)|gradle(?:w)? (?:\S+ )*(?:test|check)|\.\/gradlew (?:\S+ )*(?:test|check)|dotnet test|bundle exec (?:rspec|rake)|rspec\b|phpunit|swift test|flutter test|dart test|make (?:test|check)|ctest\b)/;

export const tests = {
  id: 'tests',
  title: 'Automated tests, run by the pipeline',
  practices: ['PW.8'],
  async run(repo, { ci }) {
    const files = repo.find(TEST_FILE);
    const runs = ciHits(ci, TEST_RUN);
    const out = [];
    if (files.length && runs.length) out.push(evidence(this.id, runs.map((r) => r.path), `${files.length} test file(s), run by the pipeline (${runs[0].match})`));
    else if (files.length) out.push(problem(this.id, files.slice(0, 5), `${files.length} test file(s), but no pipeline step runs them`));
    else if (runs.length) out.push(evidence(this.id, runs.map((r) => r.path), `pipeline runs tests (${runs[0].match})`));
    return out;
  }
};

const SAST_CI = /\b(github\/codeql-action|codeql database|semgrep|returntocorp\/semgrep-action|sonarsource\/[\w-]+|sonar-scanner|bandit\b|gosec\b|brakeman\b|njsscan|horusec|snyk code|checkmarx|fortify|psalm --taint|phpstan|staticcheck|golangci-lint|cargo clippy|spotbugs|find-sec-bugs|devskim|zizmor|actionlint)/i;
const SAST_FILES = /^(\.github\/codeql\/[^/]+|\.semgrep\.ya?ml|\.semgrep\/[^/]+|sonar-project\.properties|\.bandit|bandit\.ya?ml|\.golangci\.ya?ml|\.gosec\.json|phpstan\.neon(\.dist)?|psalm\.xml)$/;

export const staticAnalysis = {
  id: 'static-analysis',
  title: 'Static analysis for vulnerabilities',
  practices: ['PW.7', 'PO.4'],
  async run(repo, { ci }) {
    const hits = ciHits(ci, SAST_CI);
    const files = repo.find(SAST_FILES);
    if (!hits.length && !files.length) return [];
    const tools = [...new Set(hits.map((h) => h.match.toLowerCase()))].join(', ');
    return [evidence(this.id, [...hits.map((h) => h.path), ...files], tools ? `in the pipeline: ${tools}` : 'analysis configuration committed')];
  }
};

const LINT_FILES = /^(eslint\.config\.(js|mjs|cjs|ts)|\.eslintrc(\.(js|cjs|json|ya?ml))?|biome\.jsonc?|\.ruff\.toml|ruff\.toml|\.flake8|\.pylintrc|\.rubocop\.yml|\.golangci\.ya?ml|clippy\.toml|\.clippy\.toml|\.swiftlint\.yml|detekt\.yml|\.editorconfig|\.pre-commit-config\.yaml|\.stylelintrc(\.json)?|tslint\.json)$/;
const LINT_CI = /\b(eslint|biome (?:check|lint|ci)|ruff (?:check)?|flake8|pylint|rubocop|golangci-lint|cargo clippy|swiftlint|ktlint|detekt|npm run (?:lint|check)|node --check|mypy|tsc --noEmit|pre-commit run)/;

export const codingRules = {
  id: 'coding-rules',
  title: 'Coding rules checked by a tool',
  practices: ['PW.5'],
  async run(repo, { ci }) {
    const files = repo.find(LINT_FILES).filter((f) => f !== '.editorconfig');
    const hits = ciHits(ci, LINT_CI);
    if (hits.length) return [evidence(this.id, [...hits.map((h) => h.path), ...files], `pipeline runs ${hits[0].match}`)];
    if (files.length) return [evidence(this.id, files, 'rules configured, not run by the pipeline')];
    return [];
  }
};

const DAST_CI = /\b(zaproxy\/action-[\w-]+|zap-baseline|zap-full-scan|nuclei|burp|schemathesis|restler|cargo fuzz|go test [^\n]*-fuzz|atheris|jazzer|oss-fuzz|cifuzz|afl\+\+|libfuzzer)/i;

export const dynamicTesting = {
  id: 'dynamic-testing',
  title: 'Fuzzing or dynamic security testing',
  practices: ['PW.8'],
  async run(repo, { ci }) {
    const hits = ciHits(ci, DAST_CI);
    const fuzz = repo.find(/(^|\/)(fuzz|fuzzing)\/|_fuzz(er)?\.(c|cc|cpp|go|rs|py)$|\.fuzz\.[a-z]+$/);
    if (!hits.length && !fuzz.length) return [];
    return [evidence(this.id, [...hits.map((h) => h.path), ...fuzz.slice(0, 5)], hits.length ? hits[0].match : `${fuzz.length} fuzz target file(s)`)];
  }
};

export default [tests, staticAnalysis, codingRules, dynamicTesting];
