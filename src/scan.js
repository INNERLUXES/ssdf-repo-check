// Runs every check against a repository and sorts what was found under the SSDF practices.

import { PRACTICES, GROUPS, getPractice } from './practices.js';
import { openRepo } from './repo.js';
import { ciFiles } from './checks/util.js';
import pipeline from './checks/pipeline.js';
import dependencies from './checks/dependencies.js';
import people from './checks/people.js';
import code from './checks/code.js';
import secrets from './checks/secrets.js';
import release from './checks/release.js';
import build from './checks/build.js';
import design from './checks/design.js';

export const CHECKS = Object.freeze([...pipeline, ...dependencies, ...people, ...code, ...secrets, ...release, ...build, ...design]);

// Status of one practice:
//   'problem'  a check found something that works against the practice (high severity)
//   'evidence' at least one check found supporting evidence
//   'none'     nothing found in the repository
export async function scanRepo(repoOrPath, options = {}) {
  const repo = typeof repoOrPath === 'string' ? await openRepo(repoOrPath, options) : repoOrPath;
  const only = options.checks ? new Set(options.checks) : null;
  const ci = await ciFiles(repo);
  const ctx = { ci, ignore: options.ignore || [] };
  const results = [];
  const errors = [];
  for (const check of CHECKS) {
    if (only && !only.has(check.id)) continue;
    try {
      for (const r of await check.run(repo, ctx)) results.push({ ...r, title: check.title, practices: check.practices });
    } catch (err) {
      errors.push({ check: check.id, message: err.message });
    }
  }

  const practices = PRACTICES.map((p) => {
    const mine = results.filter((r) => r.practices.includes(p.id));
    const evidence = mine.filter((r) => r.kind === 'evidence');
    const problems = mine.filter((r) => r.kind === 'problem');
    const status = problems.some((r) => r.severity === 'high') ? 'problem' : evidence.length ? 'evidence' : 'none';
    return { id: p.id, name: p.name, group: p.group, scope: p.scope, status, evidence, problems };
  });

  const count = (s) => practices.filter((p) => p.status === s).length;
  return {
    tool: 'ssdf-repo-check',
    framework: 'NIST SP 800-218 SSDF 1.1',
    root: repo.root,
    files: repo.files.length,
    truncated: repo.truncated,
    summary: {
      practices: practices.length,
      evidence: count('evidence'),
      problem: count('problem'),
      none: count('none'),
      warnings: results.filter((r) => r.kind === 'problem' && r.severity !== 'high').length
    },
    groups: Object.entries(GROUPS).map(([id, name]) => ({ id, name, practices: practices.filter((p) => p.group === id).map((p) => p.id) })),
    practices,
    errors
  };
}

// Which of the required practices are not met: no evidence, or a high-severity problem.
export function unmet(report, required) {
  const ids = required.map((id) => getPractice(id).id);
  return report.practices.filter((p) => ids.includes(p.id) && p.status !== 'evidence').map((p) => p.id);
}
