# Checks and the SSDF tasks behind them

Each check looks for one kind of evidence. The table says which SSDF 1.1 task the evidence supports, so a reviewer can decide whether it is enough for their own requirements. Task numbers are from NIST SP 800-218 version 1.1.

"Problem" means the check found something that works against the practice. A high-severity problem sets the practice to PROBLEM even when other evidence exists; a warning is reported but does not change the status.

## Pipeline

| Check | Looks for | Problems it reports | Practices | Task it supports |
|---|---|---|---|---|
| `ci-config` | Pipeline files for GitHub Actions, GitLab CI, CircleCI, Azure Pipelines, Bitbucket, Jenkins, Travis, Buildkite, Drone, Woodpecker | | PO.3 | PO.3.1: specify the tools in each toolchain and how they fit together |
| `workflow-permissions` | A `permissions:` block in each GitHub workflow | Missing block (warning), `write-all` (high) | PO.5, PS.1 | PO.5.1: separate and protect each environment; PS.1.1: least privilege for code and configuration-as-code |
| `actions-pinned` | Third-party actions referenced by a full 40-character commit hash | References by tag or branch (warning) | PS.1, PW.4 | PS.1.1; PW.4.1: acquire and maintain well-secured components |
| `pull-request-target` | | `pull_request_target` workflows that check out the pull request head (high) | PO.5, PS.1 | PO.5.1 |

## Dependencies

| Check | Looks for | Problems it reports | Practices | Task it supports |
|---|---|---|---|---|
| `lock-files` | A lock file next to each manifest: npm, Yarn, pnpm, Bun, Poetry, uv, PDM, Pipenv, Go, Cargo, Bundler, Composer, NuGet, Dart, SwiftPM | Manifest without a lock file (warning) | PW.4, PS.1 | PW.4.1; PW.4.4: verify third-party components |
| `dependency-updates` | Dependabot or Renovate configuration | | PW.4, RV.1 | PW.4.1; RV.1.1: gather information on vulnerabilities in the software and its components |
| `dependency-audit` | npm/pnpm/yarn audit, pip-audit, Safety, OSV-Scanner, govulncheck, cargo audit or deny, bundler-audit, composer audit, dotnet `--vulnerable`, dependency-review-action, Trivy, Grype, Snyk | | RV.1, PW.4 | RV.1.1; PW.4.4 |

## People and review

| Check | Looks for | Problems it reports | Practices | Task it supports |
|---|---|---|---|---|
| `security-policy` | `SECURITY.md` in the root, `.github` or `docs`, with an address, a link or private reporting | Policy that does not say where to report (warning) | RV.1, RV.2 | RV.1.3: have a vulnerability disclosure and remediation policy |
| `code-owners` | `CODEOWNERS` with at least one rule that names an owner | File with no rule (warning) | PO.2, PW.7 | PO.2.1: roles and responsibilities across the life cycle; PW.7.1 |
| `review-template` | A pull request or merge request template | | PW.7 | PW.7.2: perform code review and record what it finds |
| `contributing` | `CONTRIBUTING` with rules | | PO.1, PW.5 | PO.1.1: document security requirements for the development process |

## Code

| Check | Looks for | Problems it reports | Practices | Task it supports |
|---|---|---|---|---|
| `tests` | Test files, and a pipeline step that runs a test runner | Test files that no pipeline step runs (warning) | PW.8 | PW.8.2: scope, design and perform the testing |
| `static-analysis` | CodeQL, Semgrep, Sonar, Bandit, gosec, Brakeman, njsscan, PHPStan, Psalm, staticcheck, golangci-lint, Clippy, SpotBugs, DevSkim, zizmor, actionlint, or their configuration | | PW.7, PO.4 | PW.7.2; PO.4.1: define criteria for security checks and track them |
| `coding-rules` | Linter configuration and a pipeline step that runs it | | PW.5 | PW.5.1: follow secure coding practices for the language |
| `dynamic-testing` | Fuzz targets, Go native fuzzing, cargo-fuzz, Atheris, Jazzer, OSS-Fuzz, ZAP, Nuclei, Schemathesis, RESTler | | PW.8 | PW.8.2 |

## Secrets

| Check | Looks for | Problems it reports | Practices | Task it supports |
|---|---|---|---|---|
| `secret-scanner` | Gitleaks, TruffleHog, detect-secrets, ggshield, git-secrets, secretlint, Talisman in the pipeline, a pre-commit hook or configuration | | PS.1, PW.7 | PS.1.1 |
| `ignore-private` | `.gitignore` entries for `.env`, keys, keystores, credential files | | PS.1 | PS.1.1 |
| `committed-secrets` | | Committed `.env` files (high); text shaped like a private key, GitHub, AWS, Google, Slack, Stripe or npm token, or a cloud service account key (high). Values are never printed | PS.1 | PS.1.1 |

## Releases

| Check | Looks for | Problems it reports | Practices | Task it supports |
|---|---|---|---|---|
| `release-integrity` | cosign, Sigstore, build provenance attestations, SLSA generator, GPG or minisign signatures, platform code signing, npm provenance, published SHA-256 checksums | | PS.2 | PS.2.1: make integrity verification information available to acquirers |
| `sbom` | An SBOM generator in the pipeline (Syft, CycloneDX, SPDX tools, Microsoft SBOM tool, Trivy, `npm sbom`) or a committed SBOM | | PS.3, PW.4 | PS.3.2: collect and share provenance data, for example in an SBOM |
| `release-record` | Release notes and a workflow triggered by tags or releases | | PS.3 | PS.3.1: archive the files and data kept for each release |

## Build

| Check | Looks for | Problems it reports | Practices | Task it supports |
|---|---|---|---|---|
| `repeatable-build` | Installs that use only the locked versions (`npm ci`, frozen lock files, `--require-hashes`, `--locked`) | | PW.6, PO.3 | PW.6.2: decide and apply the build tool configuration |
| `compiler-hardening` | Stack protection, FORTIFY_SOURCE, PIE, RELRO, CFI flags, `-trimpath`, overflow checks; TypeScript or mypy strict mode | | PW.6 | PW.6.1: use compiler and build features that improve executable security |
| `containers` | Base images pinned by digest and a final non-root user (distroless nonroot and `scratch` count) | Runs as root (warning); base image by tag (warning) | PW.6, PW.9, PW.4 | PW.9.1: a secure baseline for default settings; PW.4.1 |

## Design documents

These checks only see that a document exists and has some content. They cannot judge it.

| Check | Looks for | Practices | Task it supports |
|---|---|---|---|
| `security-requirements` | Security requirements, secure coding standard, ASVS level | PO.1 | PO.1.1 |
| `threat-model` | Threat model, security design, attack surface, risk assessment | PW.1 | PW.1.1: risk modeling such as threat modeling or attack surface mapping |
| `design-decisions` | Decision records (`adr/`, `decisions/`, `rfcs/`) or an architecture document | PW.2 | PW.2.1: review the design against the security requirements |
| `secure-defaults` | Hardening or secure configuration guide | PW.9 | PW.9.1 |
| `vulnerability-history` | Root cause or incident write-ups; release notes that name CVE or GHSA ids or have a Security section | RV.2, RV.3 | RV.2.2: plan and apply risk responses; RV.3.1: find root causes |
