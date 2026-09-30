// Written design work: security requirements, threat models, design decisions, secure defaults and lessons from past vulnerabilities.
// These are documents, so the check can only see that they exist and are not empty, not whether they are good.

import { evidence } from './util.js';

const MIN_LENGTH = 400;

async function substantial(repo, paths) {
  const kept = [];
  for (const path of paths) {
    const text = await repo.text(path);
    if (text && text.replace(/\s+/g, ' ').length >= MIN_LENGTH) kept.push(path);
  }
  return kept;
}

const DOC = '\\.(md|rst|txt|adoc|org)$';

function docs(repo, words) {
  const re = new RegExp(`(^|/)[^/]*(${words})[^/]*${DOC}|(^|/)(${words})[^/]*/[^/]+${DOC}`, 'i');
  return repo.find(re);
}

export const securityRequirements = {
  id: 'security-requirements',
  title: 'Written security requirements',
  practices: ['PO.1'],
  async run(repo) {
    const files = await substantial(repo, docs(repo, 'security[-_ ]?requirements|security[-_ ]?policy[-_ ]?for[-_ ]?dev|secure[-_ ]?coding|security[-_ ]?standard|asvs'));
    return files.length ? [evidence(this.id, files, 'security requirements document')] : [];
  }
};

export const threatModel = {
  id: 'threat-model',
  title: 'Threat model or security design',
  practices: ['PW.1'],
  async run(repo) {
    const files = await substantial(repo, docs(repo, 'threat[-_ ]?model|threats|security[-_ ]?design|security[-_ ]?architecture|attack[-_ ]?surface|risk[-_ ]?assessment'));
    return files.length ? [evidence(this.id, files, 'threat model or security design document')] : [];
  }
};

export const designDecisions = {
  id: 'design-decisions',
  title: 'Recorded design decisions',
  practices: ['PW.2'],
  async run(repo) {
    const adr = repo.find(new RegExp(`(^|/)(adr|adrs|decisions|architecture[-_ ]decisions|rfcs?)/[^/]+${DOC}`, 'i'));
    const arch = await substantial(repo, repo.find(new RegExp(`(^|/)(ARCHITECTURE|architecture|design)${DOC}`)));
    const files = [...adr, ...arch];
    if (!files.length) return [];
    return [evidence(this.id, files.slice(0, 10), adr.length ? `${adr.length} decision record(s)` : 'architecture document')];
  }
};

export const secureDefaults = {
  id: 'secure-defaults',
  title: 'Secure default settings documented',
  practices: ['PW.9'],
  async run(repo) {
    const files = await substantial(repo, docs(repo, 'hardening|secure[-_ ]?(defaults|configuration|deployment)|security[-_ ]?(configuration|settings)'));
    return files.length ? [evidence(this.id, files, 'hardening or secure configuration guide')] : [];
  }
};

export const vulnerabilityHistory = {
  id: 'vulnerability-history',
  title: 'Past vulnerabilities fixed and analysed',
  practices: ['RV.2', 'RV.3'],
  async run(repo) {
    const out = [];
    const analysis = await substantial(repo, docs(repo, 'post[-_ ]?mortem|incident|root[-_ ]?cause|rca'));
    if (analysis.length) out.push(evidence(this.id, analysis, 'root cause or incident write-up'));
    const logs = repo.find(/^(CHANGELOG|CHANGES|HISTORY|RELEASES|NEWS)(\.md|\.rst|\.txt)?$/i);
    for (const path of logs) {
      const text = (await repo.text(path)) || '';
      if (/\bCVE-\d{4}-\d{4,}\b|\bGHSA-\w{4}-\w{4}-\w{4}\b|\bsecurity fix|\bvulnerabilit(y|ies) fixed|^#{2,4} Security\b/im.test(text)) {
        out.push(evidence(this.id, [path], 'release notes name security fixes'));
      }
    }
    return out;
  }
};

export default [securityRequirements, threatModel, designDecisions, secureDefaults, vulnerabilityHistory];
