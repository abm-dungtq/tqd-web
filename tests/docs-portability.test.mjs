// Run: node --test tests/docs-portability.test.mjs
// Keeps skill docs runnable from a plugin installed anywhere, not only from the repo root.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.dirname(__dirname);
const DOC_ROOTS = ['skills', 'agents', 'rules'];

function markdownFiles() {
  const files = [];
  for (const root of DOC_ROOTS) {
    const abs = path.join(repoRoot, root);
    for (const entry of fs.readdirSync(abs, { recursive: true, withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith('.md')) files.push(path.join(entry.parentPath, entry.name));
    }
  }
  return files;
}

function skillDirs() {
  return fs
    .readdirSync(path.join(repoRoot, 'skills'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(repoRoot, 'skills', entry.name, 'SKILL.md')))
    .map((entry) => entry.name);
}

test('portability: no markdown tells the agent to run "node skills/..."', () => {
  const offenders = markdownFiles().filter((file) => fs.readFileSync(file, 'utf8').includes('node skills/'));
  assert.deepEqual(offenders, []);
});

test('portability: no host-specific tool names', () => {
  const offenders = markdownFiles().filter((file) => fs.readFileSync(file, 'utf8').includes('delegate_agent'));
  assert.deepEqual(offenders, []);
});

test('portability: every SKILL.md links rules/AGENTS.md', () => {
  const names = skillDirs();
  assert.equal(names.length, 6);
  for (const name of names) {
    const text = fs.readFileSync(path.join(repoRoot, 'skills', name, 'SKILL.md'), 'utf8');
    assert.ok(text.includes('(../../rules/AGENTS.md)'), `${name}/SKILL.md must link rules/AGENTS.md`);
  }
});

test('portability: every ../skill/scripts path in skill docs exists', () => {
  const pattern = /\.\.\/tqd-web[a-z-]*\/scripts\/[\w.-]*?\.(?:mjs|cjs|js)/g;
  for (const name of skillDirs()) {
    const skillDir = path.join(repoRoot, 'skills', name);
    for (const entry of fs.readdirSync(skillDir, { recursive: true, withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
      const file = path.join(entry.parentPath, entry.name);
      for (const match of fs.readFileSync(file, 'utf8').matchAll(pattern)) {
        const target = path.resolve(skillDir, match[0]);
        assert.ok(fs.existsSync(target), `${path.relative(repoRoot, file)}: ${match[0]} does not exist`);
      }
    }
  }
});

test('portability: every scripts/ file named in a SKILL.md exists', () => {
  // The lookbehind skips prefixed paths such as assets/tier1-starter/scripts/hydrate.js.
  const pattern = /(?<![\w./-])scripts\/[\w./-]+\.(?:mjs|cjs|js)/g;
  for (const name of skillDirs()) {
    const skillDir = path.join(repoRoot, 'skills', name);
    const text = fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8');
    for (const match of text.matchAll(pattern)) {
      const target = path.resolve(skillDir, match[0]);
      assert.ok(fs.existsSync(target), `skills/${name}/SKILL.md: ${match[0]} does not exist`);
    }
  }
});
