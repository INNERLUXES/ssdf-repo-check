# 2. Report evidence, never compliance

## Context

NIST SP 800-218 describes outcomes for an organization. Some of them can be seen in a repository, some partly, and some not at all. A tool that prints "compliant" for a practice would claim more than it can know, and a reader would trust it more than they should.

## Decision

- Each practice gets one of three statuses: `evidence` (something supporting was found), `problem` (something working against it was found), `none` (nothing found).
- Every report ends with a line saying that evidence in a repository is not proof that the practice is followed.
- Each practice carries a `scope`: `repository` when a repository can show it in full, `partial` when only part. `--require-all` uses only the `repository` ones.
- A high-severity problem outweighs any amount of evidence for the same practice. A committed credential is not balanced out by a secret scanner configuration.
- PW.3, which version 1.1 moved into PO.1.3 and PW.4.4, is not a practice in the list. Asking for it gives an error that says where it went.

## Consequences

- The report is useful for finding gaps and for tracking them over time, and less useful as a certificate. That is intended.
- Teams that want a stricter gate add practices with `--require` after deciding what evidence they accept for them.
