# Contributing

Every change goes through a pull request and is reviewed before it is merged. The pipeline runs the tests on Linux, Windows and macOS, the repository checks, CodeQL, and this tool on its own repository.

## Adding or changing a check

1. A check lives in `src/checks/` and has `id`, `title`, `practices` and `run(repo, ctx)`.
2. `run` returns a list of results made with `evidence()` or `problem()` from `src/checks/util.js`. Use `severity: 'high'` only for something that works directly against a practice, such as a committed credential.
3. Map the check only to practices that the evidence really supports. Quote the task in NIST SP 800-218 that it matches in `docs/checks.md`.
4. Write a test for what the check finds and a test for a near miss it must ignore, such as a commented-out line or an example value.
5. Never put the value of a credential in a result, a log line or a test fixture. Tests build credential-shaped strings at run time; see `test/fixtures.js`.

## Rules for the code

- No runtime dependencies. The tool runs with Node 22 or newer and nothing else.
- The tool only reads files. It does not run anything from the repository it scans and does not use the network.
- Plain JavaScript modules, two-space indent, single quotes.

## Before you open the pull request

```
npm test
npm run check
node bin/ssdf-repo-check.js . --require-all --fail-on-problem
```
