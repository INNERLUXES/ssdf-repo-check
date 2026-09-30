// Turns a scan result into text for a terminal, Markdown for a pull request or job summary, or SARIF for code scanning.

const MARK = { evidence: 'found', problem: 'PROBLEM', none: '-' };
const SCOPE_NOTE = {
  partial: 'a repository shows part of this practice',
  organization: 'evidence for this practice lives outside the repository'
};

function filesText(files, max = 3) {
  if (!files.length) return '';
  const shown = files.slice(0, max).join(', ');
  return files.length > max ? `${shown} and ${files.length - max} more` : shown;
}

export function toText(report, { verbose = false } = {}) {
  const lines = [];
  lines.push(`${report.framework}: ${report.root} (${report.files} files)`);
  lines.push('');
  for (const group of report.groups) {
    lines.push(`${group.id}  ${group.name}`);
    for (const id of group.practices) {
      const p = report.practices.find((x) => x.id === id);
      lines.push(`  ${p.id.padEnd(5)} ${MARK[p.status].padEnd(8)} ${p.name}`);
      if (verbose || p.status !== 'none') {
        for (const e of p.evidence) lines.push(`          + ${e.title}: ${e.detail}${verbose ? ` [${filesText(e.files)}]` : ''}`);
        for (const w of p.problems) lines.push(`          ! ${w.title}: ${w.detail} [${filesText(w.files)}]`);
      }
    }
    lines.push('');
  }
  const s = report.summary;
  lines.push(`${s.evidence} of ${s.practices} practices with evidence, ${s.problem} with a problem, ${s.none} with nothing found, ${s.warnings} warning(s).`);
  lines.push('Evidence in a repository is not proof that a practice is followed. Read the notes in docs/limits.md.');
  if (report.truncated) lines.push('The file limit was reached: part of the repository was not read.');
  for (const e of report.errors) lines.push(`check ${e.check} failed: ${e.message}`);
  return lines.join('\n');
}

const md = (s) => String(s).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');

export function toMarkdown(report) {
  const s = report.summary;
  const out = [];
  out.push('## SSDF evidence report');
  out.push('');
  out.push(`${report.framework}. ${s.evidence} of ${s.practices} practices with evidence, ${s.problem} with a problem, ${s.none} with nothing found, ${s.warnings} warning(s).`);
  out.push('');
  out.push('| Practice | Status | What was found |');
  out.push('|---|---|---|');
  for (const p of report.practices) {
    const found = [
      ...p.evidence.map((e) => `${e.title}: ${e.detail}`),
      ...p.problems.map((w) => `**${w.severity === 'high' ? 'Problem' : 'Warning'}:** ${w.detail} (${filesText(w.files)})`)
    ];
    const note = p.status === 'none' && SCOPE_NOTE[p.scope] ? `nothing found; ${SCOPE_NOTE[p.scope]}` : '';
    out.push(`| ${p.id} ${md(p.name)} | ${MARK[p.status]} | ${md(found.join('<br>') || note || 'nothing found')} |`);
  }
  out.push('');
  out.push('Evidence in a repository is not proof that a practice is followed.');
  return out.join('\n');
}

export function toJson(report) {
  return JSON.stringify(report, null, 2);
}

// SARIF 2.1.0: one rule per check that found a problem, one result per file.
export function toSarif(report, { version = '0.0.0' } = {}) {
  const problems = report.practices.flatMap((p) => p.problems);
  const seen = new Map();
  for (const w of problems) if (!seen.has(w.check)) seen.set(w.check, w);
  const rules = [...seen.values()].map((w) => ({
    id: w.check,
    name: w.check.replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase()),
    shortDescription: { text: w.title },
    properties: { tags: ['security', 'ssdf', ...w.practices.map((id) => `ssdf/${id}`)] },
    defaultConfiguration: { level: w.severity === 'high' ? 'error' : 'warning' }
  }));
  const results = [];
  const done = new Set();
  for (const w of problems) {
    for (const file of w.files) {
      const key = `${w.check}|${file}|${w.detail}`;
      if (done.has(key)) continue;
      done.add(key);
      results.push({
        ruleId: w.check,
        level: w.severity === 'high' ? 'error' : 'warning',
        message: { text: `${w.detail} (SSDF ${w.practices.join(', ')})` },
        locations: [{ physicalLocation: { artifactLocation: { uri: file }, region: { startLine: 1 } } }]
      });
    }
  }
  return JSON.stringify({
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [{
      tool: { driver: { name: 'ssdf-repo-check', version, informationUri: 'https://github.com/INNERLUXES/ssdf-repo-check', rules } },
      results
    }]
  }, null, 2);
}
