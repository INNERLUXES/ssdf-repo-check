// Small helpers shared by the checks.

export const CI_FILES = /^(\.github\/workflows\/[^/]+\.ya?ml|\.gitlab-ci\.ya?ml|\.circleci\/config\.ya?ml|azure-pipelines\.ya?ml|bitbucket-pipelines\.ya?ml|Jenkinsfile|\.travis\.ya?ml|\.buildkite\/[^/]+\.ya?ml|\.drone\.ya?ml|\.woodpecker\.ya?ml|\.woodpecker\/[^/]+\.ya?ml)$/;

export const GITHUB_WORKFLOWS = /^\.github\/workflows\/[^/]+\.ya?ml$/;

// Every CI file with its text. Comment lines are dropped so that a commented-out step is not counted.
export async function ciFiles(repo) {
  const out = [];
  for (const path of repo.find(CI_FILES)) {
    const text = await repo.text(path);
    if (text == null) continue;
    out.push({ path, text: stripComments(text) });
  }
  return out;
}

export function stripComments(text) {
  return text.split(/\r?\n/).filter((line) => !/^\s*#/.test(line)).join('\n');
}

// Files whose text matches: [{ path, match }]
export async function grepFiles(repo, paths, pattern) {
  const hits = [];
  for (const path of paths) {
    const text = await repo.text(path);
    if (text == null) continue;
    const m = text.match(pattern);
    if (m) hits.push({ path, match: m[0].trim() });
  }
  return hits;
}

export function ciHits(files, pattern) {
  const hits = [];
  for (const { path, text } of files) {
    const m = text.match(pattern);
    if (m) hits.push({ path, match: m[0].trim() });
  }
  return hits;
}

export function evidence(check, files, detail) {
  return { kind: 'evidence', check, files: unique(files), detail };
}

export function problem(check, files, detail, severity = 'warning') {
  return { kind: 'problem', check, files: unique(files), detail, severity };
}

export function unique(list) {
  return [...new Set(list)];
}
