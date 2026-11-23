// Run: node --test tests/version-consistency.test.mjs
// One source of truth: the version in .claude-plugin/plugin.json must appear everywhere it is published.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.dirname(__dirname);

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

function versionsAtAnyDepth(value, found = []) {
  if (Array.isArray(value)) {
    for (const entry of value) versionsAtAnyDepth(entry, found);
  } else if (value && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) {
      if (key === 'version') found.push(entry);
      else versionsAtAnyDepth(entry, found);
    }
  }
  return found;
}

test('version: every manifest, skill, README, NOTICE and CHANGELOG agree', () => {
  const canonical = JSON.parse(read('.claude-plugin/plugin.json')).version;
  assert.match(canonical, /^\d+\.\d+\.\d+$/);

  assert.equal(JSON.parse(read('plugin.json')).version, canonical, 'plugin.json');
  assert.equal(JSON.parse(read('gemini-extension.json')).version, canonical, 'gemini-extension.json');
  assert.deepEqual(versionsAtAnyDepth(JSON.parse(read('.claude-plugin/marketplace.json'))), [canonical, canonical], 'marketplace.json');

  const skillsDir = path.join(repoRoot, 'skills');
  const skills = fs.readdirSync(skillsDir, { withFileTypes: true }).filter((entry) => entry.isDirectory());
  assert.equal(skills.length, 6);
  for (const skill of skills) {
    const frontmatter = read(path.join('skills', skill.name, 'SKILL.md')).split(/^---$/m)[1] ?? '';
    const match = /^\s+version:\s*"([^"]+)"/m.exec(frontmatter);
    assert.ok(match, `${skill.name}: frontmatter version`);
    assert.equal(match[1], canonical, `${skill.name}: frontmatter version`);
  }

  assert.ok(read('README.md').includes(`Phiên bản ${canonical}`), 'README.md version line');
  assert.match(read('NOTICE.txt').split('\n')[0], new RegExp(`v${canonical.replace(/\./g, '\\.')}\\b`), 'NOTICE.txt version');

  const changelog = read('CHANGELOG.md');
  const heading = /^## \[(\d+\.\d+\.\d+)\]/m.exec(changelog);
  assert.ok(heading, 'CHANGELOG.md has a version heading');
  assert.equal(heading[1], canonical, 'CHANGELOG.md latest version');
});
