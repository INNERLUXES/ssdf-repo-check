# 1. Read only, and no runtime dependencies

## Context

The tool is meant to run inside a pull request pipeline, on code that may come from anyone. Anything it installs is also code from someone else, and anything it executes from the scanned repository runs with the pipeline's permissions.

A tool that checks for secure development practices also has to pass its own checks, or the report is not believable.

## Decision

- The tool reads files as text and nothing else. It never imports, requires, installs, builds or runs anything from the scanned repository.
- It has no runtime dependencies. YAML is not parsed with a library; each check reads the few lines it needs with a pattern and ignores comment lines.
- It uses only Node's own modules and needs Node 22 or newer.

## Consequences

- Installing the tool pulls in nothing else, so there is no dependency tree to audit.
- A pipeline step that is written in an unusual layout, such as a YAML anchor or a multi-line string with the command split across lines, can be missed. That produces a missed finding, not a false one, and `docs/limits.md` says so.
- Adding a check never means adding a parser. If a check cannot be written with line patterns, it is a sign that the check is asking for more than a repository can show.
