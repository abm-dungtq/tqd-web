// Run: node --test tests/installed-layout.test.mjs
// Proves bundled scripts work from a plugin installed at an arbitrary path with spaces.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { makeRealSite } from './helpers/real-site.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.dirname(__dirname);

const PLUGIN_PARTS = ['skills', 'agents', 'rules', 'assets', '.claude-plugin', '.codex-plugin', '.agents', 'plugin.json', 'gemini-extension.json'];

function copyPlugin(destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const part of PLUGIN_PARTS) {
    const from = path.join(repoRoot, part);
    assert.ok(fs.existsSync(from), `missing ${part} in the plugin`);
    fs.cpSync(from, path.join(destDir, part), { recursive: true });
  }
  return destDir;
}

function runNodeScript(script, args, cwd) {
  return spawnSync(process.execPath, [script, ...args], { cwd, encoding: 'utf8' });
}

test('installed: scripts run from a copied plugin with cwd = website folder', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tqd-installed-'));
  // The folder name carries a space on purpose: installed paths are not always clean.
  const pluginDir = path.join(root, 'tqd plugin cache', 'tqd-web');
  const siteDir = path.join(root, 'my website');
  try {
    copyPlugin(pluginDir);
    fs.mkdirSync(siteDir, { recursive: true });
    makeRealSite(siteDir);

    const syncScript = path.join(pluginDir, 'skills', 'tqd-web', 'scripts', 'sync-site-data.mjs');
    const auditScript = path.join(pluginDir, 'skills', 'tqd-web-audit', 'scripts', 'audit-html-health.mjs');
    const preflightScript = path.join(pluginDir, 'skills', 'tqd-web-launch', 'scripts', 'preflight-launch-check.mjs');

    const sync = runNodeScript(syncScript, ['.'], siteDir);
    assert.equal(sync.status, 0, sync.stdout + sync.stderr);

    const check = runNodeScript(syncScript, ['.', '--check'], siteDir);
    assert.equal(check.status, 0, check.stdout + check.stderr);

    const audit = runNodeScript(auditScript, ['.', '--strict-placeholders'], siteDir);
    assert.equal(audit.status, 0, audit.stdout + audit.stderr);

    const preflight = runNodeScript(preflightScript, ['.'], siteDir);
    assert.equal(preflight.status, 0, preflight.stdout + preflight.stderr);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
