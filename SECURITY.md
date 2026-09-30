# Security

## Reporting a problem

Write to info@innerluxes.dev with the subject line "ssdf-repo-check security", or use private vulnerability reporting on this repository. Please do not open a public issue for a vulnerability.

Include what you ran, the repository layout that triggers it (a small made-up one is best), what you expected and what happened.

## Scope

In scope:

- anything that makes the tool print, write or send the value of a credential it found
- a repository layout that makes the tool read files outside the folder it was given
- a file that makes a scan hang or use unbounded memory
- a false "found" for a practice caused by a flaw in a check, where it could hide a real gap

Out of scope: a check that misses evidence written in a form it does not know. Open a normal issue for those.

## What this tool assumes

- It is run on a copy of the repository, as a user who may read every file in it.
- Its reports may be seen by anyone who can see the build log. It never prints credential values, but it does print file paths.

Read [docs/threat-model.md](docs/threat-model.md) for how the tool treats the repositories it reads.
