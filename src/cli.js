// Command line: ssdf-repo-check [path] [--format text|markdown|json|sarif] [--require PS.1,PW.8] [--output file]

import { writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { scanRepo, unmet, CHECKS } from './scan.js';
import { toText, toMarkdown, toJson, toSarif } from './report.js';
import { getPractice, PRACTICES } from './practices.js';

export const USAGE = `ssdf-repo-check [path] [options]

Looks through a repository for evidence of the practices in NIST SP 800-218 (SSDF 1.1).

Options
  --format <f>       text (default), markdown, json or sarif
  --output <file>    write the report to a file instead of the terminal
  --require <ids>    comma separated practice ids; exit 1 if any has no evidence or has a problem
  --require-all      the same for every practice that a repository can show in full
  --fail-on-problem  exit 1 if any practice has a high-severity problem
  --ignore <regex>   skip matching paths in the credential search (can be repeated)
  --checks <ids>     run only these checks (comma separated)
  --list             list the practices and the checks, then exit
  --verbose          name the files behind each finding
  --help             this text

Exit codes: 0 done, 1 a requirement was not met, 2 wrong usage.`;

export function parseArgs(argv) {
  const opts = { path: '.', format: 'text', require: [], ignore: [], verbose: false, failOnProblem: false, list: false, help: false };
  const value = (i, name) => {
    if (i + 1 >= argv.length || argv[i + 1].startsWith('--')) throw new Error(`${name} needs a value`);
    return argv[i + 1];
  };
  let pathSet = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--format': opts.format = value(i, a); i++; break;
      case '--output': opts.output = value(i, a); i++; break;
      case '--require': opts.require.push(...value(i, a).split(',').map((s) => s.trim()).filter(Boolean)); i++; break;
      case '--require-all': opts.requireAll = true; break;
      case '--fail-on-problem': opts.failOnProblem = true; break;
      case '--ignore': opts.ignore.push(new RegExp(value(i, a))); i++; break;
      case '--checks': opts.checks = value(i, a).split(',').map((s) => s.trim()).filter(Boolean); i++; break;
      case '--list': opts.list = true; break;
      case '--verbose': case '-v': opts.verbose = true; break;
      case '--help': case '-h': opts.help = true; break;
      default:
        if (a.startsWith('-')) throw new Error(`unknown option: ${a}`);
        if (pathSet) throw new Error(`only one path can be scanned, got a second: ${a}`);
        opts.path = a;
        pathSet = true;
    }
  }
  if (!['text', 'markdown', 'json', 'sarif'].includes(opts.format)) throw new Error(`unknown format: ${opts.format}`);
  opts.require = opts.require.map((id) => getPractice(id).id);
  if (opts.requireAll) opts.require = [...new Set([...opts.require, ...PRACTICES.filter((p) => p.scope === 'repository').map((p) => p.id)])];
  if (opts.checks) {
    const known = new Set(CHECKS.map((c) => c.id));
    for (const id of opts.checks) if (!known.has(id)) throw new Error(`unknown check: ${id}`);
  }
  return opts;
}

function listing() {
  const lines = ['Practices (NIST SP 800-218 SSDF 1.1)'];
  for (const p of PRACTICES) {
    const checks = CHECKS.filter((c) => c.practices.includes(p.id)).map((c) => c.id);
    lines.push(`  ${p.id.padEnd(5)} ${p.name}`);
    lines.push(`        checks: ${checks.join(', ') || 'none; evidence lives outside the repository'}`);
  }
  return lines.join('\n');
}

async function version() {
  try {
    const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
    return pkg.version;
  } catch {
    return '0.0.0';
  }
}

// Returns the exit code; the caller decides whether to exit.
export async function main(argv, { stdout = process.stdout, stderr = process.stderr } = {}) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (err) {
    stderr.write(`${err.message}\n\n${USAGE}\n`);
    return 2;
  }
  if (opts.help) { stdout.write(`${USAGE}\n`); return 0; }
  if (opts.list) { stdout.write(`${listing()}\n`); return 0; }

  let report;
  try {
    report = await scanRepo(resolve(opts.path), { ignore: opts.ignore, checks: opts.checks });
  } catch (err) {
    stderr.write(`${err.message}\n`);
    return 2;
  }
  const text = opts.format === 'json' ? toJson(report)
    : opts.format === 'markdown' ? toMarkdown(report)
      : opts.format === 'sarif' ? toSarif(report, { version: await version() })
        : toText(report, { verbose: opts.verbose });
  if (opts.output) await writeFile(opts.output, `${text}\n`);
  else stdout.write(`${text}\n`);

  let code = 0;
  const missing = unmet(report, opts.require);
  if (missing.length) {
    stderr.write(`required practice(s) not met: ${missing.join(', ')}\n`);
    code = 1;
  }
  if (opts.failOnProblem && report.summary.problem) {
    stderr.write(`${report.summary.problem} practice(s) with a high-severity problem\n`);
    code = 1;
  }
  return code;
}
