import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = path.resolve(__dirname, '..', 'preflight-launch-check.mjs');

function withTempDir(fn) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tqd-web-launch-test-'));
  try {
    return fn(tmpDir);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function runScript(args) {
  try {
    const stdout = execFileSync(process.execPath, [SCRIPT_PATH, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { status: 0, stdout, stderr: '' };
  } catch (err) {
    return {
      status: err.status ?? 1,
      stdout: err.stdout ? err.stdout.toString() : '',
      stderr: err.stderr ? err.stderr.toString() : '',
    };
  }
}

function createCleanPublishFolder(dir) {
  fs.writeFileSync(
    path.join(dir, 'index.html'),
    '<!doctype html><html lang="vi"><head><title>Cửa hàng mẫu</title></head><body><h1>Xin chào</h1></body></html>\n',
    'utf8',
  );
  fs.writeFileSync(
    path.join(dir, '404.html'),
    '<!doctype html><html lang="vi"><head><title>404</title></head><body><p>Không tìm thấy trang</p></body></html>\n',
    'utf8',
  );
  fs.writeFileSync(path.join(dir, 'robots.txt'), 'User-agent: *\nAllow: /\nSitemap: https://example.com/sitemap.xml\n', 'utf8');
  fs.writeFileSync(
    path.join(dir, 'sitemap.xml'),
    '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>\n',
    'utf8',
  );
}

describe('preflight-launch-check.mjs', () => {
  it('exits 0 with zero blockers and zero warnings on a complete clean publish folder', () => {
    withTempDir((dir) => {
      createCleanPublishFolder(dir);
      const res = runScript([dir, '--json']);
      assert.equal(res.status, 0);
      const report = JSON.parse(res.stdout);
      assert.equal(report.ok, true);
      assert.equal(report.summary.blockers, 0);
      assert.equal(report.summary.warnings, 0);
      assert.equal(report.checks.indexHtml, 'pass');
      assert.equal(report.checks.notFoundHtml, 'pass');
      assert.equal(report.checks.robotsTxt, 'pass');
      assert.equal(report.checks.sitemapXml, 'pass');
      assert.equal(report.checks.exposedSecrets, 'pass');
      assert.equal(report.checks.placeholders, 'pass');
    });
  });

  it('exits 0 with warnings when optional 404/robots/sitemap files are missing', () => {
    withTempDir((dir) => {
      fs.writeFileSync(path.join(dir, 'index.html'), '<!doctype html><html><body>OK</body></html>\n', 'utf8');
      const res = runScript([dir, '--json']);
      assert.equal(res.status, 0);
      const report = JSON.parse(res.stdout);
      assert.equal(report.ok, true);
      assert.equal(report.checks.indexHtml, 'pass');
      assert.equal(report.checks.notFoundHtml, 'warn');
      assert.equal(report.checks.robotsTxt, 'warn');
      assert.equal(report.checks.sitemapXml, 'warn');
      assert.equal(report.summary.warnings, 3);
    });
  });

  it('exits 1 when .env or sensitive key files are exposed in the publish folder', () => {
    withTempDir((dir) => {
      createCleanPublishFolder(dir);
      fs.writeFileSync(path.join(dir, '.env'), 'SECRET_TOKEN=demo\n', 'utf8');
      fs.writeFileSync(path.join(dir, 'server.pem'), '---PRIVATE KEY---\n', 'utf8');
      fs.mkdirSync(path.join(dir, '.git'));
      const res = runScript([dir, '--json']);
      assert.equal(res.status, 1);
      const report = JSON.parse(res.stdout);
      assert.equal(report.ok, false);
      assert.equal(report.checks.exposedSecrets, 'fail');
      assert.ok(report.blockers.some((b) => b.file === '.env'));
      assert.ok(report.blockers.some((b) => b.file === 'server.pem'));
      assert.ok(report.blockers.some((b) => b.file === '.git'));
    });
  });

  it('exits 1 on lorem ipsum, TODO, FIXME, or [Cần bổ sung placeholders unless --allow-placeholders is passed', () => {
    withTempDir((dir) => {
      createCleanPublishFolder(dir);
      fs.mkdirSync(path.join(dir, 'dich-vu'));
      fs.writeFileSync(
        path.join(dir, 'dich-vu', 'index.html'),
        [
          '<!doctype html><html><body>',
          '<p>Lorem ipsum dolor sit amet</p>',
          '<p>[Cần bổ sung: số điện thoại]</p>',
          '<!-- TODO: thay ảnh -->',
          '<!-- FIXME: cập nhật giá -->',
          '</body></html>',
        ].join('\n'),
        'utf8',
      );
      const blocked = runScript([dir, '--json']);
      assert.equal(blocked.status, 1);
      const blockedReport = JSON.parse(blocked.stdout);
      assert.equal(blockedReport.checks.placeholders, 'fail');
      assert.equal(blockedReport.blockers.length, 4);

      const allowed = runScript([dir, '--allow-placeholders', '--json']);
      assert.equal(allowed.status, 0);
      const allowedReport = JSON.parse(allowed.stdout);
      assert.equal(allowedReport.ok, true);
      assert.equal(allowedReport.checks.placeholders, 'warn');
      assert.equal(allowedReport.warnings.length, 4);

      const textRes = runScript([dir]);
      assert.equal(textRes.status, 1);
      assert.match(textRes.stdout, /BLOCKED:/);
    });
  });

  it('warns when robots.txt blocks User-agent: * with Disallow: /, but allows blocking specific bots', () => {
    withTempDir((dir) => {
      createCleanPublishFolder(dir);
      fs.writeFileSync(path.join(dir, 'robots.txt'), 'User-agent: GPTBot\nDisallow: /\n\nUser-agent: *\nAllow: /\n', 'utf8');
      const allowedRes = runScript([dir, '--json']);
      assert.equal(allowedRes.status, 0);
      assert.equal(JSON.parse(allowedRes.stdout).checks.robotsTxt, 'pass');

      fs.writeFileSync(path.join(dir, 'robots.txt'), 'User-agent: *\nDisallow: /\n', 'utf8');
      const res = runScript([dir, '--json']);
      assert.equal(res.status, 0);
      const report = JSON.parse(res.stdout);
      assert.equal(report.checks.robotsTxt, 'warn');
      assert.ok(report.warnings.some((w) => w.check === 'robotsTxt'));
    });
  });

  it('exits 1 when index.html is missing or empty', () => {
    withTempDir((dir) => {
      const missingRes = runScript([dir, '--json']);
      assert.equal(missingRes.status, 1);
      const missingReport = JSON.parse(missingRes.stdout);
      assert.equal(missingReport.checks.indexHtml, 'fail');

      fs.writeFileSync(path.join(dir, 'index.html'), '   \n', 'utf8');
      const emptyRes = runScript([dir, '--json']);
      assert.equal(emptyRes.status, 1);
      const emptyReport = JSON.parse(emptyRes.stdout);
      assert.equal(emptyReport.checks.indexHtml, 'fail');
    });
  });

  it('exits 2 on invalid arguments or nonexistent target directory and 0 on --help', () => {
    const helpRes = runScript(['--help']);
    assert.equal(helpRes.status, 0);
    assert.match(helpRes.stdout, /Usage:/);

    const badFlagRes = runScript(['--unknown-flag']);
    assert.equal(badFlagRes.status, 2);

    const extraArgRes = runScript(['dir-a', 'dir-b']);
    assert.equal(extraArgRes.status, 2);

    const missingDir = path.join(os.tmpdir(), 'nonexistent-tqd-launch-dir-xyz-99999');
    const missingDirRes = runScript([missingDir]);
    assert.equal(missingDirRes.status, 2);
  });
});
