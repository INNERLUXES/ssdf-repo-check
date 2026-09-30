// The practices of the Secure Software Development Framework, NIST SP 800-218 version 1.1.
// Names are copied from the publication. PW.3 was moved into PO.1.3 and PW.4.4 in version 1.1
// and is kept here only so that a reference to it can be explained.

export const GROUPS = Object.freeze({
  PO: 'Prepare the Organization',
  PS: 'Protect the Software',
  PW: 'Produce Well-Secured Software',
  RV: 'Respond to Vulnerabilities'
});

// scope: 'repository' when a repository can hold evidence for the practice,
// 'partial' when a repository can hold some of it, 'organization' when the evidence lives elsewhere.
export const PRACTICES = Object.freeze([
  { id: 'PO.1', name: 'Define Security Requirements for Software Development', scope: 'partial' },
  { id: 'PO.2', name: 'Implement Roles and Responsibilities', scope: 'partial' },
  { id: 'PO.3', name: 'Implement Supporting Toolchains', scope: 'repository' },
  { id: 'PO.4', name: 'Define and Use Criteria for Software Security Checks', scope: 'repository' },
  { id: 'PO.5', name: 'Implement and Maintain Secure Environments for Software Development', scope: 'partial' },
  { id: 'PS.1', name: 'Protect All Forms of Code from Unauthorized Access and Tampering', scope: 'partial' },
  { id: 'PS.2', name: 'Provide a Mechanism for Verifying Software Release Integrity', scope: 'repository' },
  { id: 'PS.3', name: 'Archive and Protect Each Software Release', scope: 'repository' },
  { id: 'PW.1', name: 'Design Software to Meet Security Requirements and Mitigate Security Risks', scope: 'partial' },
  { id: 'PW.2', name: 'Review the Software Design to Verify Compliance with Security Requirements and Risk Information', scope: 'partial' },
  { id: 'PW.4', name: 'Reuse Existing, Well-Secured Software When Feasible Instead of Duplicating Functionality', scope: 'repository' },
  { id: 'PW.5', name: 'Create Source Code by Adhering to Secure Coding Practices', scope: 'repository' },
  { id: 'PW.6', name: 'Configure the Compilation, Interpreter, and Build Processes to Improve Executable Security', scope: 'repository' },
  { id: 'PW.7', name: 'Review and/or Analyze Human-Readable Code to Identify Vulnerabilities and Verify Compliance with Security Requirements', scope: 'repository' },
  { id: 'PW.8', name: 'Test Executable Code to Identify Vulnerabilities and Verify Compliance with Security Requirements', scope: 'repository' },
  { id: 'PW.9', name: 'Configure Software to Have Secure Settings by Default', scope: 'partial' },
  { id: 'RV.1', name: 'Identify and Confirm Vulnerabilities on an Ongoing Basis', scope: 'repository' },
  { id: 'RV.2', name: 'Assess, Prioritize, and Remediate Vulnerabilities', scope: 'partial' },
  { id: 'RV.3', name: 'Analyze Vulnerabilities to Identify Their Root Causes', scope: 'partial' }
].map((p) => Object.freeze({ ...p, group: p.id.slice(0, 2) })));

export const MOVED = Object.freeze({
  'PW.3': 'Verify Third-Party Software Complies with Security Requirements: moved to PO.1.3 and PW.4.4 in version 1.1'
});

const byId = new Map(PRACTICES.map((p) => [p.id, p]));

export function getPractice(id) {
  const key = String(id).trim().toUpperCase();
  const practice = byId.get(key);
  if (practice) return practice;
  if (MOVED[key]) throw new Error(`${key} is not a practice in SSDF 1.1 (${MOVED[key]})`);
  throw new Error(`unknown SSDF practice: ${id}`);
}

export function practicesInGroup(group) {
  const key = String(group).trim().toUpperCase();
  if (!GROUPS[key]) throw new Error(`unknown SSDF group: ${group}`);
  return PRACTICES.filter((p) => p.group === key);
}
