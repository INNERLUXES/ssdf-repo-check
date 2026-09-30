# Secure defaults

What the tool does when it is run with no options, and why each default was chosen.

| Setting | Default | Why |
|---|---|---|
| What it reads | Only the folder it is given, without following symbolic links | A link must not lead the scan into the home folder or system files. |
| What it runs | Nothing from the scanned repository | Scanning an untrusted pull request must not run its code. |
| Network | None | The tool can run in a job with no network access, and it never sends repository content anywhere. |
| Credential values | Never printed, in any format | Build logs are often readable by more people than the repository. |
| Skipped folders | `.git`, `node_modules`, `vendor`, build and coverage output, virtual environments | Installed and generated code belongs to other projects and would bury the results. |
| File size | Files over 512 KB are not read | Keeps time and memory bounded on hostile input. |
| File count | Stops at 50,000 files and says so | Same reason. The report never hides that it was cut short. |
| Exit code | 0 unless `--require`, `--require-all` or `--fail-on-problem` is given | The tool reports by default and only blocks a pipeline when asked to. |
| Output | Text on standard output | Nothing is written to disk unless `--output` is given. |

## Choices for a pipeline gate

A gate that blocks merges should be explicit about what it requires. Start with the practices that a repository can show in full, then add more as the evidence appears:

```
node bin/ssdf-repo-check.js . --require-all --fail-on-problem
```

`--require-all` covers PO.3, PO.4, PS.2, PS.3, PW.4, PW.5, PW.6, PW.7, PW.8 and RV.1. The others are only partly visible in a repository; require them one by one with `--require` once the team has decided what counts.
