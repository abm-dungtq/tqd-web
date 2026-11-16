// Run: node --test scripts/tests/audit-html-health.test.mjs
// Tests offline HTML health checks using isolated os.tmpdir() fixtures.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeHtml, auditTarget, formatText, parseArgs } from '../audit-html-health.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const script = join(dirname(here), 'audit-html-health.mjs');
const tempDirs = [];

function makeTempDir(prefix = 'html-health-') {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function writeFixture(root, relPath, content) {
  const full = join(root, relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content, 'utf8');
  return full;
}

function runCli(...args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [script, ...args], { encoding: 'utf8' });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    const timer = setTimeout(() => child.kill(), 30000);
    child.on('exit', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}

after(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('valid multi-page HTML build directory passes with zero findings', () => {
  const dir = makeTempDir();
  writeFixture(dir, 'styles.css', 'body { margin: 0; }');
  writeFixture(dir, 'images/hero.webp', 'webp-bytes');
  writeFixture(dir, 'images/dot.png', 'png-bytes');
  writeFixture(dir, 'index.html', `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Tiệm Bánh An Nhiên | Trang chủ</title>
  <meta name="description" content="Bánh ngọt thủ công làm mới mỗi sáng tại Quận 3.">
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <header>
    <nav>
      <a href="/about">Giới thiệu</a>
      <a href="contact.html">Liên hệ</a>
      <a href="tel:0905842619">Gọi ngay</a>
      <a href="https://zalo.me/0905842619">Zalo</a>
      <a href="#menu">Thực đơn</a>
    </nav>
    <svg aria-hidden="true"><title>Icon Trang Trí</title></svg>
  </header>
  <main id="menu">
    <h1>Bánh ngọt thủ công mỗi sáng</h1>
    <img src="images/hero.webp" alt="Bánh croissant > 2 lớp giòn rụm">
    <img src="images/dot.png" alt="">
    <h2>Món nổi bật</h2>
    <h3>Croissant bơ Pháp</h3>
    <h2>Đặt hàng trong ngày</h2>
  </main>
</body>
</html>`);
  writeFixture(dir, 'about/index.html', `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta content="Câu chuyện bếp bánh thủ công từ năm 2020." name="description">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Giới thiệu | Tiệm Bánh An Nhiên</title>
</head>
<body>
  <main><h1>Về Tiệm Bánh An Nhiên</h1></main>
</body>
</html>`);
  writeFixture(dir, 'contact.html', `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Liên hệ | Tiệm Bánh An Nhiên</title>
  <meta name="description" content="Địa chỉ cửa hàng và số Zalo đặt bánh nhanh.">
</head>
<body>
  <main><h1>Liên hệ đặt bánh</h1></main>
</body>
</html>`);

  const result = auditTarget({ target: dir });
  assert.equal(result.filesScanned, 3);
  assert.deepEqual(result.findings, []);
  assert.equal(result.summary.errors, 0);
  assert.equal(result.summary.warnings, 0);
});

test('missing metadata, heading order violations, and img alt/src defects are reported', () => {
  const html = `<!doctype html>
<html>
<head><title></title></head>
<body>
  <h2>Section before H1</h2>
  <h1>First H1</h1>
  <h1>Second H1</h1>
  <h3>Skipped H2</h3>
  <img src="hero.png">
  <img alt="No source">
  <img src="  " alt="Blank source">
</body>
</html>`;
  const page = analyzeHtml(html, 'bad.html');
  const checks = new Set(page.findings.filter((f) => f.severity === 'error').map((f) => f.check));
  for (const expected of ['html-lang', 'viewport', 'title', 'meta-description', 'h1', 'heading-order', 'img-alt', 'img-src']) {
    assert.ok(checks.has(expected), `expected error check ${expected}, got ${[...checks].join(', ')}`);
  }
});

test('duplicate title and description across pages are flagged', () => {
  const dir = makeTempDir();
  const makePage = (h1) => `<!doctype html><html lang="vi"><head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Same Title</title>
<meta name="description" content="Same Description">
</head><body><h1>${h1}</h1></body></html>`;
  writeFixture(dir, 'index.html', makePage('Trang một'));
  writeFixture(dir, 'pricing.html', makePage('Trang hai'));

  const result = auditTarget({ target: dir });
  const checks = new Set(result.findings.map((f) => f.check));
  assert.ok(checks.has('duplicate-title'));
  assert.ok(checks.has('duplicate-description'));
});

test('broken local links, missing assets, and escaping paths are flagged', () => {
  const dir = makeTempDir();
  writeFixture(dir, 'index.html', `<!doctype html>
<html lang="vi">
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Link Check</title>
  <meta name="description" content="Check broken links">
  <link rel="stylesheet" href="/css/missing.css">
</head>
<body>
  <h1>Trang kiểm tra liên kết</h1>
  <a href="not-found.html">Trang thiếu</a>
  <a href="../../secret.txt">Ngoài thư mục</a>
  <img src="images/missing.webp" srcset="images/1x.webp 1x, images/2x.webp 2x" alt="Ảnh minh họa">
</body>
</html>`);

  const result = auditTarget({ target: dir });
  const broken = result.findings.filter((f) => f.check === 'broken-link');
  assert.equal(broken.length, 6);
});

test('placeholder detection handles lorem ipsum, TODO, example.com, and --strict-placeholders', () => {
  const dir = makeTempDir();
  writeFixture(dir, 'index.html', `<!doctype html>
<html lang="vi">
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Todo App Demo</title>
  <meta name="description" content="Quản lý việc cần làm đơn giản.">
</head>
<body>
  <!-- TODO: thay số điện thoại thật -->
  <h1>Bảng giá dịch vụ</h1>
  <p>Lorem ipsum dolor sit amet.</p>
  <p>Liên hệ tại <a href="https://www.example.com/demo">trang mẫu</a>.</p>
  <p>Giá gói tiêu chuẩn: [Cần bổ sung: bảng giá chính thức]</p>
</body>
</html>`);

  const relaxed = auditTarget({ target: dir, strictPlaceholders: false });
  const relaxedErrors = relaxed.findings.filter((f) => f.severity === 'error' && f.check === 'placeholder');
  assert.equal(relaxedErrors.length, 3);
  assert.ok(!relaxed.findings.some((f) => /Todo App/i.test(f.message)));
  assert.ok(relaxed.findings.some((f) => f.severity === 'warn' && f.check === 'placeholder-pending'));

  const strict = auditTarget({ target: dir, strictPlaceholders: true });
  const strictErrors = strict.findings.filter((f) => f.severity === 'error' && f.check === 'placeholder');
  assert.equal(strictErrors.length, 4);
});

test('CLI exit codes: 0 clean, 1 errors found, 2 usage or IO error', async () => {
  const cleanDir = makeTempDir('html-clean-');
  writeFixture(cleanDir, 'index.html', `<!doctype html><html lang="vi"><head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Clean Site</title>
<meta name="description" content="Valid static site.">
</head><body><h1>Xin chào</h1></body></html>`);

  const badFile = writeFixture(makeTempDir('html-bad-'), 'broken.html', '<html><body><h2>Thiếu đủ thứ</h2></body></html>');
  const draftDir = makeTempDir('html-draft-');
  writeFixture(draftDir, 'index.html', `<!doctype html><html lang="vi"><head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Draft Site</title>
<meta name="description" content="Draft with owner placeholder.">
</head><body><h1>Xin chào</h1><p>[Cần bổ sung: số hotline]</p></body></html>`);

  const emptyDir = makeTempDir('html-empty-');
  const txtFile = writeFixture(makeTempDir('html-txt-'), 'note.txt', 'hello');

  const okRes = await runCli(cleanDir, '--json');
  assert.equal(okRes.code, 0);
  const parsedOk = JSON.parse(okRes.stdout);
  assert.equal(parsedOk.summary.errors, 0);

  const draftRelaxed = await runCli(draftDir);
  assert.equal(draftRelaxed.code, 0);
  const draftStrict = await runCli(draftDir, '--strict-placeholders');
  assert.equal(draftStrict.code, 1);

  const errRes = await runCli(badFile);
  assert.equal(errRes.code, 1);
  assert.match(errRes.stdout, /ERROR/);

  assert.equal((await runCli()).code, 2);
  assert.equal((await runCli('--unknown-flag', cleanDir)).code, 2);
  assert.equal((await runCli(join(cleanDir, 'does-not-exist'))).code, 2);
  assert.equal((await runCli(emptyDir)).code, 2);
  assert.equal((await runCli(txtFile)).code, 2);
});

test('CLI runs via symlinked scripts directory and parseArgs/formatText helpers work', async () => {
  const linkParent = makeTempDir('html-link-');
  const link = join(linkParent, 'scripts');
  symlinkSync(dirname(here), link, process.platform === 'win32' ? 'junction' : 'dir');
  const cleanDir = makeTempDir('html-sym-target-');
  writeFixture(cleanDir, 'index.html', `<!doctype html><html lang="vi"><head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Symlink Test</title>
<meta name="description" content="Symlink invocation check.">
</head><body><h1>Sẵn sàng</h1></body></html>`);

  const code = await new Promise((resolve) => {
    const child = spawn(process.execPath, [join(link, 'audit-html-health.mjs'), cleanDir], { stdio: 'ignore' });
    child.on('exit', resolve);
  });
  assert.equal(code, 0);

  assert.deepEqual(parseArgs(['dist', '--json', '--strict-placeholders']), {
    target: 'dist',
    json: true,
    strictPlaceholders: true,
    help: false,
  });
  assert.throws(() => parseArgs([]));
  assert.throws(() => parseArgs(['a', 'b']));
  const formatted = formatText(auditTarget({ target: cleanDir }));
  assert.match(formatted, /0 error\(s\), 0 warning\(s\)/);
});

test('flags invalid inline JSON-LD and dummy/spaced tel or Zalo contact links offline', () => {
  const html = `<!doctype html>
<html lang="vi">
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Shop Test</title>
  <meta name="description" content="Kiểm tra số điện thoại và JSON-LD.">
  <script type="application/ld+json">{ invalid json</script>
</head>
<body>
  <h1>Cửa hàng mẫu</h1>
  <a href="tel:0905 842 619">Gọi ngay</a>
  <a href="tel:0123456789">Số giả</a>
  <a href="https://zalo.me/09xxxxxxxx">Zalo mẫu</a>
</body>
</html>`;
  const page = analyzeHtml(html, 'contact-bad.html');
  const jsonLdErrors = page.findings.filter((f) => f.check === 'json-ld' && f.severity === 'error');
  const contactErrors = page.findings.filter((f) => f.check === 'contact-link' && f.severity === 'error');
  assert.equal(jsonLdErrors.length, 1);
  assert.equal(contactErrors.length, 3);
});
