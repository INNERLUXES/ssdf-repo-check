// Who owns what, how problems are reported, and how changes get reviewed.

import { evidence, problem } from './util.js';

const SECURITY_FILE = /^(|\.github\/|docs\/)SECURITY(\.md|\.txt|\.rst)?$/i;

export const securityPolicy = {
  id: 'security-policy',
  title: 'Vulnerability reporting policy',
  practices: ['RV.1', 'RV.2'],
  async run(repo) {
    const files = repo.find(SECURITY_FILE);
    if (!files.length) return [];
    const text = (await repo.text(files[0])) || '';
    const contact = /[\w.+-]+@[\w-]+\.[\w.-]+|https?:\/\/\S+|security advisor(y|ies)|private vulnerability report/i.test(text);
    return contact
      ? [evidence(this.id, files, 'security policy with a way to report')]
      : [problem(this.id, files, 'security policy does not say where to report a vulnerability')];
  }
};

export const codeOwners = {
  id: 'code-owners',
  title: 'Named owners for the code',
  practices: ['PO.2', 'PW.7'],
  async run(repo) {
    const files = repo.find(/^(|\.github\/|docs\/)CODEOWNERS$/);
    if (!files.length) return [];
    const text = (await repo.text(files[0])) || '';
    const rules = text.split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith('#') && /\s@\S+|\s\S+@\S+/.test(l));
    return rules.length
      ? [evidence(this.id, files, `${rules.length} ownership rule(s)`)]
      : [problem(this.id, files, 'CODEOWNERS has no rule that names an owner')];
  }
};

export const reviewTemplate = {
  id: 'review-template',
  title: 'Pull request template for reviewers',
  practices: ['PW.7'],
  async run(repo) {
    const files = repo.find(/^(|\.github\/|docs\/)(pull_request_template\.md|PULL_REQUEST_TEMPLATE\.md|PULL_REQUEST_TEMPLATE\/[^/]+\.md)$/i)
      .concat(repo.find(/^\.gitlab\/merge_request_templates\/[^/]+\.md$/));
    return files.length ? [evidence(this.id, files, 'review template')] : [];
  }
};

export const contributing = {
  id: 'contributing',
  title: 'Contribution rules',
  practices: ['PO.1', 'PW.5'],
  async run(repo) {
    const files = repo.find(/^(|\.github\/|docs\/)CONTRIBUTING(\.md|\.rst|\.txt)?$/i);
    if (!files.length) return [];
    const text = (await repo.text(files[0])) || '';
    const security = /\b(secur|review|test|sign(ed|-off)|lint)/i.test(text);
    return [evidence(this.id, files, security ? 'contribution rules that cover review, testing or security' : 'contribution rules')];
  }
};

export default [securityPolicy, codeOwners, reviewTemplate, contributing];
