# Threat model

The tool reads repositories that other people wrote. In a pull request pipeline, that includes code from anyone who opens a pull request. This page lists what such a repository could try to do to the tool, and what the tool does about it.

## Assets

- Credentials that happen to be in the scanned repository. The tool finds some of them and must not spread them further.
- The machine and the pipeline the tool runs on, including the pipeline's own token.
- The trust a reader puts in the report.

## Threats and responses

| Threat | Response |
|---|---|
| The report copies a credential into a build log that more people can read | Results carry the kind of credential and the file path, never the value. A test checks that the value does not appear anywhere in the result. |
| A symbolic link points outside the repository, for example to `~/.ssh` | The walk reads directory entries without following links: an entry that is a link is neither a file nor a directory to it and is skipped. |
| A huge file, or a very large number of files, exhausts memory or time | Files over 512 KB are not read. Binary files are recognised by extension or by a zero byte and not read. The walk stops at 50,000 files and the report says so. |
| A file crafted to make a regular expression run for a very long time | No pattern nests one repetition inside another. Patterns that scan ahead stay within one line or within a fixed number of characters. File size is capped as above. |
| The scanned repository contains code that runs when a tool loads it | The tool does not import, require, execute or install anything from the repository. It reads text only. |
| A crafted file makes one check throw and hides the others | Each check runs on its own. An error is reported in `errors` and the other checks still run. |
| A repository fakes evidence to pass a gate, for example an empty `SECURITY.md` | Partly mitigated: documents must have content, `SECURITY.md` must say where to report, CODEOWNERS must name an owner. A determined author can still write text that passes. The gate is a floor, not a review. |
| The tool is used with the network | It opens no connections. It can run in a pipeline job with no network access. |

## Outside this model

- A compromised Node runtime or a compromised copy of this tool. Install from a release and check the attestation and checksums.
- Anything the pipeline does with the report after the tool writes it.
