# ssdf-repo-check

Looks through a software repository for evidence of the secure development practices in [NIST SP 800-218, the Secure Software Development Framework (SSDF) version 1.1](https://csrc.nist.gov/pubs/sp/800/218/final), and reports what it found under each practice.

It answers questions such as: is there a pipeline, and is its token limited? Are third-party actions pinned? Is every manifest locked? Does anything check dependencies for known vulnerabilities? Are tests run, is code analysed, is there a way to report a vulnerability? Do releases come with checksums, provenance and an SBOM? Is anything that looks like a live credential committed?

It is plain JavaScript with no dependencies. It only reads files: it never runs, installs or sends anything from the repository it scans.

```
npm test
```

```
# tests 73
# pass 73
# fail 0
```

## Try it

Requires Node 22 or newer. There is nothing to install.

```
git clone https://github.com/INNERLUXES/ssdf-repo-check.git
cd ssdf-repo-check
node bin/ssdf-repo-check.js /path/to/your/repository
```

Part of the output for this repository:

```
PS  Protect the Software
  PS.1  found    Protect All Forms of Code from Unauthorized Access and Tampering
          + Workflow token limited to what it needs: 3 of 3 workflow(s) set token permissions
          + Third-party actions pinned to a commit: 13 action reference(s) pinned to a full commit hash
          + Private files kept out of version control: ignores .env, .env.*, *.pem, *.key
  PS.2  found    Provide a Mechanism for Verifying Software Release Integrity
          + Signed releases or published checksums: sha256sum * > SHA256SUMS
  PS.3  found    Archive and Protect Each Software Release
          + Software bill of materials: generated in the pipeline (npm sbom)
          + Release history and an automated release: release notes and release workflow
...
  RV.3  -        Analyze Vulnerabilities to Identify Their Root Causes

18 of 19 practices with evidence, 0 with a problem, 1 with nothing found, 0 warning(s).
```

RV.3 is empty because this repository has no vulnerability to analyse yet. The tool says so rather than guess.

## Options

| Option | What it does |
|---|---|
| `--format text\|markdown\|json\|sarif` | Text for a terminal, Markdown for a job summary or pull request comment, JSON for your own scripts, SARIF 2.1.0 for code scanning |
| `--output <file>` | Write the report to a file |
| `--require PS.1,PW.8` | Exit 1 if any of these practices has no evidence or has a high-severity problem |
| `--require-all` | The same for every practice a repository can show in full: PO.3, PO.4, PS.2, PS.3, PW.4, PW.5, PW.6, PW.7, PW.8, RV.1 |
| `--fail-on-problem` | Exit 1 on any high-severity problem, such as a committed credential or a `write-all` workflow token |
| `--ignore <regex>` | Skip matching paths in the credential search, for test data that holds credential-shaped strings on purpose |
| `--checks <ids>` | Run only these checks |
| `--list` | Print the practices and the checks mapped to each |
| `--verbose` | Name the files behind each finding |

Exit codes: 0 done, 1 a requirement was not met, 2 wrong usage.

## What it checks

29 checks, each mapped to the practices it supports. [docs/checks.md](docs/checks.md) gives the SSDF task behind each one.

| Area | Checks | Practices |
|---|---|---|
| Pipeline | pipeline present; workflow token permissions; actions pinned to a commit; `pull_request_target` running fork code with secrets | PO.3, PO.5, PS.1, PW.4 |
| Dependencies | lock file for each manifest (JavaScript, Python, Go, Rust, Ruby, PHP, .NET, Dart, Swift); Dependabot or Renovate; audit step such as `npm audit`, pip-audit, OSV-Scanner, govulncheck, Trivy | PW.4, PS.1, RV.1 |
| People and review | `SECURITY.md` with a way to report; CODEOWNERS with owners; review template; contribution rules | PO.1, PO.2, PW.5, PW.7, RV.1, RV.2 |
| Code | tests run by the pipeline; static analysis such as CodeQL or Semgrep; linters run by the pipeline; fuzzing and dynamic testing | PO.4, PW.5, PW.7, PW.8 |
| Secrets | secret scanner in pipeline or pre-commit; `.gitignore` for private files; committed `.env` files and credential-shaped text (values never printed) | PS.1, PW.7 |
| Releases | signatures, provenance or checksums; SBOM; release notes and release workflow | PS.2, PS.3, PW.4 |
| Build | locked installs; hardening compiler flags or strict type checking; container base pinned by digest and non-root user | PO.3, PW.4, PW.6, PW.9 |
| Design | security requirements; threat model; decision records; hardening guide; root cause write-ups and security fixes in release notes | PO.1, PW.1, PW.2, PW.9, RV.2, RV.3 |

## What the report means

**found** means the tool saw something in the repository that supports the practice. It does not mean the practice is followed. **PROBLEM** means it saw something that works against the practice. **-** means it saw nothing, and the evidence may live outside the repository: branch protection, access control, training and triage are not in the files.

[docs/limits.md](docs/limits.md) lists, for each practice, what a repository can show and what it cannot.

## In a pipeline

This repository runs the tool on itself in [ci.yml](.github/workflows/ci.yml): a Markdown report in the job summary, SARIF uploaded to code scanning, and a gate with `--require-all --fail-on-problem`. [docs/ci.md](docs/ci.md) has the steps for GitHub Actions and GitLab CI, and a way to introduce a gate without blocking a team on the first day.

## As a library

```js
import { scanRepo, unmet, toMarkdown } from './src/index.js';

const report = await scanRepo('/path/to/repository');
console.log(toMarkdown(report));
const missing = unmet(report, ['PS.1', 'PW.8', 'RV.1']);
```

`examples/compare.mjs` scans two versions of a small service and prints which practices changed. `examples/gate.mjs` uses the library as a gate.

## How this repository follows the practices it checks

- No runtime dependencies, a committed lock file, `npm ci` in the pipeline.
- Every workflow sets its token permissions; every action is pinned to a full commit hash; Dependabot keeps both current.
- Tests on Linux, Windows and macOS with Node 22 and 24; CodeQL with the extended security queries; repository checks for syntax, exports, leftovers and credentials.
- Releases are built from a tag, tested again, packed, and published with a CycloneDX SBOM, SHA-256 checksums and a build provenance attestation.
- [SECURITY.md](SECURITY.md), [threat model](docs/threat-model.md), [secure defaults](docs/secure-defaults.md) and [design decisions](docs/decisions).

## Related

Built and maintained by the [software development team at INNERLUXES](https://innerluxes.dev/software-development), where the same practices are part of how custom software, web and mobile apps, and cloud systems are delivered.

## License

MIT
