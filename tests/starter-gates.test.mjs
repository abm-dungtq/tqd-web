// Run: node --test tests/starter-gates.test.mjs
// Proves the audit and preflight gates catch demo content left in an untouched or half-edited starter.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { REAL, STARTER_DIR, makeRealSite } from './helpers/real-site.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.dirname(__dirname);
const AUDIT_SCRIPT = path.join(repoRoot, 'skills', 'tqd-web-audit', 'scripts', 'audit-html-health.mjs');
const PREFLIGHT_SCRIPT = path.join(repoRoot, 'skills', 'tqd-web-launch', 'scripts', 'preflight-launch-check.mjs');

function runAudit(siteDir, ...args) {
  return spawnSync(process.execPath, [AUDIT_SCRIPT, siteDir, '--json', ...args], { encoding: 'utf8' });
}

function runPreflight(siteDir, ...args) {
  return spawnSync(process.execPath, [PREFLIGHT_SCRIPT, siteDir, '--json', ...args], { encoding: 'utf8' });
}

function auditReport(siteDir, ...args) {
  const res = runAudit(siteDir, ...args);
  return { res, report: JSON.parse(res.stdout) };
}

function preflightReport(siteDir, ...args) {
  const res = runPreflight(siteDir, ...args);
  return { res, report: JSON.parse(res.stdout) };
}

function checksIn(report) {
  return new Set(report.findings.map((finding) => finding.check));
}

function withTempDir(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tqd-gate-'));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('gate: untouched starter fails the HTML audit', () => {
  const { res, report } = auditReport(STARTER_DIR);
  assert.equal(res.status, 1, res.stderr);
  assert.ok(checksIn(report).has('starter-default'));
  assert.ok(checksIn(report).has('reserved-domain'));
});

test('gate: untouched starter fails preflight', () => {
  const { res, report } = preflightReport(STARTER_DIR);
  assert.equal(res.status, 1, res.stderr);
  assert.equal(report.ok, false);
  const markers = new Set(report.blockers.map((blocker) => blocker.marker));
  assert.ok(markers.has('starter demo content'));
  assert.ok(markers.has('reserved demo domain'));
});

test('gate: one leftover demo value still fails both gates', () => {
  for (const keep of ['brand', 'address', 'domain', 'phone']) {
    withTempDir((dir) => {
      makeRealSite(dir, { keep: [keep] });
      const audit = runAudit(dir, '--strict-placeholders');
      assert.equal(audit.status, 1, `${keep}: ${audit.stdout}`);
      const preflight = runPreflight(dir);
      assert.equal(preflight.status, 1, `${keep}: ${preflight.stdout}`);
    });
  }
});

test('gate: a fully replaced site passes both gates', () => {
  withTempDir((dir) => {
    makeRealSite(dir);
    const audit = auditReport(dir, '--strict-placeholders');
    assert.equal(audit.res.status, 0, audit.res.stdout);
    assert.equal(audit.report.summary.errors, 0);
    const preflight = preflightReport(dir);
    assert.equal(preflight.res.status, 0, preflight.res.stdout);
    assert.equal(preflight.report.ok, true);
  });
});

test('gate: demo domain left only in sitemap.xml fails preflight', () => {
  withTempDir((dir) => {
    makeRealSite(dir);
    const sitemapPath = path.join(dir, 'sitemap.xml');
    const sitemap = fs.readFileSync(sitemapPath, 'utf8');
    fs.writeFileSync(sitemapPath, sitemap.replace(`${REAL.domain}/`, 'https://tiembanh-anlanh.example/'), 'utf8');

    const { res, report } = preflightReport(dir);
    assert.equal(res.status, 1, res.stdout);
    assert.ok(report.blockers.some((blocker) => blocker.file === 'sitemap.xml'));
  });
});

test('gate: a reserved demo domain alone fails both gates', () => {
  withTempDir((dir) => {
    makeRealSite(dir, { overrides: { domain: 'https://banhmaytrang.test' } });

    const audit = auditReport(dir);
    assert.equal(audit.res.status, 1, audit.res.stdout);
    assert.ok(checksIn(audit.report).has('reserved-domain'));
    assert.ok(!checksIn(audit.report).has('starter-default'), 'no starter trace should remain');

    const preflight = preflightReport(dir);
    assert.equal(preflight.res.status, 1, preflight.stdout);
    assert.ok(preflight.report.blockers.some((blocker) => blocker.marker === 'reserved demo domain'));
  });
});

test('gate: demo brand left only in a page title fails the audit', () => {
  withTempDir((dir) => {
    makeRealSite(dir);
    const pagePath = path.join(dir, '404.html');
    const page = fs.readFileSync(pagePath, 'utf8');
    fs.writeFileSync(pagePath, page.replace(/(<title\b[^>]*>)[\s\S]*?(<\/title>)/, '$1Không tìm thấy trang | Tiệm Bánh An Lành$2'), 'utf8');

    const audit = auditReport(dir);
    assert.equal(audit.res.status, 1, audit.res.stdout);
    assert.ok(audit.report.findings.some((finding) => finding.check === 'starter-default' && finding.file === '404.html'));
  });
});
