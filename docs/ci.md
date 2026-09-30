# Running it in a pipeline

The tool needs Node 22 or newer and a checkout of the repository. It does not need network access or any secret.

## GitHub Actions

Report in the job summary, results in code scanning, and a gate:

```yaml
name: ssdf
on: [pull_request, push]
permissions:
  contents: read
jobs:
  ssdf:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      security-events: write
    steps:
      - uses: actions/checkout@<full commit hash>
      - uses: actions/setup-node@<full commit hash>
        with:
          node-version: 22
      - run: git clone --depth 1 https://github.com/INNERLUXES/ssdf-repo-check.git "$RUNNER_TEMP/ssdf"
      - run: node "$RUNNER_TEMP/ssdf/bin/ssdf-repo-check.js" . --format markdown >> "$GITHUB_STEP_SUMMARY"
      - run: node "$RUNNER_TEMP/ssdf/bin/ssdf-repo-check.js" . --format sarif --output ssdf.sarif
      - uses: github/codeql-action/upload-sarif@<full commit hash>
        with:
          sarif_file: ssdf.sarif
          category: ssdf
      - run: node "$RUNNER_TEMP/ssdf/bin/ssdf-repo-check.js" . --require PS.1,PW.8,RV.1 --fail-on-problem
```

Pin the clone to a release tag or commit, as you would pin an action. This repository's own `.github/workflows/ci.yml` runs the same steps on itself.

## GitLab CI

```yaml
ssdf:
  image: node:22-slim
  script:
    - git clone --depth 1 https://github.com/INNERLUXES/ssdf-repo-check.git /tmp/ssdf
    - node /tmp/ssdf/bin/ssdf-repo-check.js . --format markdown --output ssdf.md
    - node /tmp/ssdf/bin/ssdf-repo-check.js . --require-all --fail-on-problem
  artifacts:
    paths: [ssdf.md]
    when: always
```

## Choosing what to require

Start with a report only, no gate, and read it with the team. Then:

1. add `--fail-on-problem` so that committed credentials and write-all tokens block a merge;
2. add `--require` for each practice the repository already shows, so it cannot quietly go away;
3. add the rest one at a time as the evidence is put in place.

## Ignoring test data

Test fixtures that hold credential-shaped strings on purpose can be skipped in the credential search:

```
node bin/ssdf-repo-check.js . --ignore '^test/fixtures/'
```

The other checks still see those files.
