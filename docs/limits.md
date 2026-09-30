# What a repository can and cannot show

The SSDF describes what an organization does, not what a repository contains. A repository holds some of the evidence: pipeline files, lock files, a security policy, tests. Much of the rest lives elsewhere: in branch protection settings, in the identity provider, in training records, in the issue tracker, in the heads of the people who do the work.

So read the report this way:

- **found** means the tool saw something in the repository that supports the practice. It does not mean the practice is followed. A `SECURITY.md` with an address that nobody reads is still found.
- **PROBLEM** means the tool saw something that works against the practice, such as a committed credential. It is worth fixing whatever else the report says.
- **-** means the tool saw nothing. The evidence may still exist outside the repository.

## Practices where the repository shows only part

| Practice | What the repository can show | What lives elsewhere |
|---|---|---|
| PO.1 | Written requirements, contribution rules | Requirements set by the organization, contracts with suppliers (PO.1.3) |
| PO.2 | CODEOWNERS | Roles, training, management commitment |
| PO.5 | Workflow token permissions | Separate environments, hardened build machines, access to production |
| PS.1 | Pinned actions, ignored private files, no committed credentials | Who may push, branch protection, signed commits enforced on the server |
| PW.1, PW.2 | Threat models and decision records | Whether the review happened and who did it |
| PW.9 | Container user, a hardening guide | The defaults inside the product itself |
| RV.2, RV.3 | Security fixes named in release notes, root cause write-ups | Triage, risk decisions, timelines |

## Settings the tool does not read

These are on the hosting platform, not in the files. Check them by hand or with the platform's own API:

- branch protection or rulesets on the default branch: required reviews, required status checks, no force pushes
- required signed commits
- secret scanning and push protection turned on
- private vulnerability reporting turned on
- who has admin and write access

## Things that fool the checks

- A tool mentioned in a pipeline step that never runs (for example behind an `if:` that is always false) still counts.
- Documents are counted by name and length. A long empty template counts.
- The credential search looks for known shapes. A credential without a fixed prefix, such as a database password, is not found. Use a real secret scanner as well; the `secret-scanner` check looks for one.
