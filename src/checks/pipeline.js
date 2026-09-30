// The build pipeline: is there one, and is it locked down.

import { GITHUB_WORKFLOWS, evidence, problem } from './util.js';

export const ciConfig = {
  id: 'ci-config',
  title: 'Automated build pipeline',
  practices: ['PO.3'],
  async run(repo, { ci }) {
    if (!ci.length) return [];
    return [evidence(this.id, ci.map((f) => f.path), `${ci.length} pipeline file(s)`)];
  }
};

// A workflow without a permissions block gets the repository default, which can be write access to everything.
export const workflowPermissions = {
  id: 'workflow-permissions',
  title: 'Workflow token limited to what it needs',
  practices: ['PO.5', 'PS.1'],
  async run(repo, { ci }) {
    const workflows = ci.filter((f) => GITHUB_WORKFLOWS.test(f.path));
    if (!workflows.length) return [];
    const out = [];
    const missing = [];
    const writeAll = [];
    for (const { path, text } of workflows) {
      if (/^\s*permissions:\s*write-all\s*$/m.test(text)) writeAll.push(path);
      else if (!/^\s*permissions:/m.test(text)) missing.push(path);
    }
    const good = workflows.length - missing.length - writeAll.length;
    if (good) out.push(evidence(this.id, workflows.map((f) => f.path).filter((p) => !missing.includes(p) && !writeAll.includes(p)), `${good} of ${workflows.length} workflow(s) set token permissions`));
    if (writeAll.length) out.push(problem(this.id, writeAll, 'permissions: write-all gives the job write access to the whole repository', 'high'));
    if (missing.length) out.push(problem(this.id, missing, 'no permissions block: the job gets the repository default token permissions'));
    return out;
  }
};

// Third-party actions referenced by tag can change under the same tag; a full commit hash cannot.
export const actionsPinned = {
  id: 'actions-pinned',
  title: 'Third-party actions pinned to a commit',
  practices: ['PS.1', 'PW.4'],
  async run(repo, { ci }) {
    const workflows = ci.filter((f) => GITHUB_WORKFLOWS.test(f.path));
    const pinned = [];
    const loose = [];
    for (const { path, text } of workflows) {
      for (const m of text.matchAll(/^\s*-?\s*uses:\s*['"]?([^'"\s#]+)/gm)) {
        const ref = m[1];
        if (ref.startsWith('./') || ref.startsWith('docker://')) continue;
        const at = ref.lastIndexOf('@');
        const version = at === -1 ? '' : ref.slice(at + 1);
        (/^[0-9a-f]{40}$/.test(version) ? pinned : loose).push({ path, ref });
      }
    }
    const out = [];
    if (pinned.length) out.push(evidence(this.id, pinned.map((u) => u.path), `${pinned.length} action reference(s) pinned to a full commit hash`));
    if (loose.length) {
      const names = [...new Set(loose.map((u) => u.ref))].slice(0, 6).join(', ');
      out.push(problem(this.id, loose.map((u) => u.path), `${loose.length} action reference(s) by tag or branch: ${names}`));
    }
    return out;
  }
};

// pull_request_target runs with repository secrets; checking out the pull request's own code there runs untrusted code with them.
export const pullRequestTarget = {
  id: 'pull-request-target',
  title: 'No untrusted code run with repository secrets',
  practices: ['PO.5', 'PS.1'],
  async run(repo, { ci }) {
    const risky = ci.filter((f) => GITHUB_WORKFLOWS.test(f.path)
      && /\bpull_request_target\b/.test(f.text)
      && /ref:\s*\$\{\{\s*github\.event\.pull_request\.head\.(sha|ref)\s*\}\}/.test(f.text));
    return risky.length
      ? [problem(this.id, risky.map((f) => f.path), 'pull_request_target checks out the pull request head: code from a fork runs with repository secrets', 'high')]
      : [];
  }
};

export default [ciConfig, workflowPermissions, actionsPinned, pullRequestTarget];
