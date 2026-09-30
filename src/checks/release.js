// Releases: can a user check that what they downloaded is what was built, and is each release kept with its parts list.

import { ciHits, evidence } from './util.js';

const SIGN = /\b(cosign (?:sign|attest)|sigstore\/(?:cosign-installer|gh-action-sigstore-python)|actions\/attest-build-provenance|actions\/attest-sbom|actions\/attest\b|slsa-framework\/slsa-github-generator|gpg (?:[^\n]*)--(?:detach-sign|clearsign|armor --sign)|minisign -S|signtool sign|codesign |jarsigner|notation sign|npm publish [^\n]*--provenance|goreleaser[^\n]*sign|sha256sum [^\n]*> ?[\w.-]*(?:SHA256SUMS|checksums)[\w.-]*|shasum -a 256)/i;
const SIGN_FILES = /(^|\/)(cosign\.pub|[\w.-]*\.sig|SHA256SUMS(\.asc)?|checksums\.txt)$/;

export const releaseIntegrity = {
  id: 'release-integrity',
  title: 'Signed releases or published checksums',
  practices: ['PS.2'],
  async run(repo, { ci }) {
    const hits = ciHits(ci, SIGN);
    const files = repo.find(SIGN_FILES);
    if (repo.has('.goreleaser.yml') || repo.has('.goreleaser.yaml')) {
      const cfg = (await repo.text(repo.has('.goreleaser.yml') ? '.goreleaser.yml' : '.goreleaser.yaml')) || '';
      if (/^\s*(signs|checksum):/m.test(cfg)) hits.push({ path: repo.has('.goreleaser.yml') ? '.goreleaser.yml' : '.goreleaser.yaml', match: 'goreleaser signs or checksums' });
    }
    if (!hits.length && !files.length) return [];
    return [evidence(this.id, [...hits.map((h) => h.path), ...files], hits.length ? [...new Set(hits.map((h) => h.match))].join('; ') : 'signature or checksum files committed')];
  }
};

const SBOM_CI = /\b(anchore\/sbom-action|syft (?:packages|scan|dir:|\.)|cyclonedx[\w-]*|@cyclonedx\/[\w-]+|spdx-sbom-generator|microsoft\/sbom-tool|sbom-tool generate|trivy [^\n]*--format (?:cyclonedx|spdx)|npm sbom|actions\/attest-sbom)/i;
const SBOM_FILES = /(^|\/)([\w.-]*\.(cdx|spdx)\.(json|xml|ya?ml)|bom\.(json|xml)|sbom\.(json|xml|spdx)|[\w.-]*\.spdx)$/i;

export const sbom = {
  id: 'sbom',
  title: 'Software bill of materials',
  practices: ['PS.3', 'PW.4'],
  async run(repo, { ci }) {
    const hits = ciHits(ci, SBOM_CI);
    const files = repo.find(SBOM_FILES);
    if (!hits.length && !files.length) return [];
    return [evidence(this.id, [...hits.map((h) => h.path), ...files], hits.length ? `generated in the pipeline (${hits[0].match})` : 'SBOM file committed')];
  }
};

export const releaseRecord = {
  id: 'release-record',
  title: 'Release history and an automated release',
  practices: ['PS.3'],
  async run(repo, { ci }) {
    const log = repo.find(/^(CHANGELOG|CHANGES|HISTORY|RELEASES|NEWS)(\.md|\.rst|\.txt)?$/i);
    const workflows = ci.filter((f) => /^\s*(release|tags|create):/m.test(f.text) || /\bon:\s*\[?[^\n]*\brelease\b/.test(f.text) || /\bsemantic-release|release-please|changesets\/action|goreleaser/.test(f.text));
    const files = [...log, ...workflows.map((f) => f.path)];
    if (!files.length) return [];
    const parts = [log.length && 'release notes', workflows.length && 'release workflow'].filter(Boolean).join(' and ');
    return [evidence(this.id, files, parts)];
  }
};

export default [releaseIntegrity, sbom, releaseRecord];
