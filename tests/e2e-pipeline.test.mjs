// Run: node --test tests/e2e-pipeline.test.mjs
// Verifies the full cross-skill Tier 1 website pipeline end-to-end across all 6 skills.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.dirname(__dirname);

const starterDir = path.join(repoRoot, 'skills', 'tqd-web', 'assets', 'tier1-starter');
const syncBrandScript = path.join(repoRoot, 'skills', 'tqd-web-design', 'scripts', 'sync-brand-to-tokens.cjs');
const renderCheckScript = path.join(repoRoot, 'skills', 'tqd-web-design', 'scripts', 'render-check.mjs');
const syncSiteScript = path.join(repoRoot, 'skills', 'tqd-web', 'scripts', 'sync-site-data.mjs');
const generateSchemaScript = path.join(repoRoot, 'skills', 'tqd-web-content', 'scripts', 'generate-schema.cjs');
const validateSchemaScript = path.join(repoRoot, 'skills', 'tqd-web-content', 'scripts', 'validate-schema.cjs');
const generateSitemapScript = path.join(repoRoot, 'skills', 'tqd-web-content', 'scripts', 'generate-sitemap.cjs');
const auditHtmlScript = path.join(repoRoot, 'skills', 'tqd-web-audit', 'scripts', 'audit-html-health.mjs');
const checkDiscoveryScript = path.join(repoRoot, 'skills', 'tqd-web-audit', 'scripts', 'check-discovery-surfaces.mjs');
const preflightScript = path.join(repoRoot, 'skills', 'tqd-web-launch', 'scripts', 'preflight-launch-check.mjs');

const tempDirs = [];

function makeTempDir(prefix = 'tqd-e2e-') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

after(() => {
  for (const dir of tempDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function runNode(script, args, cwd) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: 'utf8',
    cwd,
    timeout: 60000,
  });
}

function runNodeAsync(script, args, cwd) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [script, ...args], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    const timer = setTimeout(() => child.kill(), 60000);
    child.on('exit', (status) => {
      clearTimeout(timer);
      resolve({ status, stdout, stderr });
    });
  });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function startStaticServer(rootDir) {
  const server = http.createServer((req, res) => {
    const urlPath = (req.url || '/').split('?')[0];
    const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
    const full = path.resolve(rootDir, rel);
    if (!full.startsWith(path.resolve(rootDir)) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(fs.existsSync(path.join(rootDir, '404.html')) ? fs.readFileSync(path.join(rootDir, '404.html')) : 'Not Found');
      return;
    }
    const ext = path.extname(full).toLowerCase();
    const headers = { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' };
    if (ext === '.md' || rel === 'llms.txt') {
      headers['X-Robots-Tag'] = 'noindex';
    }
    res.writeHead(200, headers);
    res.end(fs.readFileSync(full));
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

test('E2E pipeline builds a Tier 1 Vietnamese site and passes all 4 studio verifiers', async () => {
  const workDir = makeTempDir('tqd-e2e-site-');
  const siteDir = path.join(workDir, 'site');
  const metaDir = path.join(workDir, 'scratch');
  fs.mkdirSync(metaDir, { recursive: true });
  fs.cpSync(starterDir, siteDir, { recursive: true });

  // 1. tqd-web-design: Generate complete tokens.css from brand.md
  const brandPath = path.join(metaDir, 'brand.md');
  fs.writeFileSync(
    brandPath,
    `# Tiệm Bánh Mây Trắng

## Quick Reference
| Role | Value |
|---|---|
| Primary Color | #1D5B4C (Forest Teal) |
| Secondary Color | #334155 (Slate) |
| Accent Color | #B45309 (Warm Amber) |

### Neutral Colors
| Name | Hex |
|---|---|
| **Paper** | #FAF8F5 |
| **Paper 2** | #F1EDE6 |
| **Line** | #E2DBD0 |
| **Ink** | #1C1917 |
| **Ink 2** | #44403C |

### Typography
- **Display Font:** "Lora", Georgia, serif
- **Body Font:** "Be Vietnam Pro", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
`,
    'utf8'
  );

  const tokenRes = runNode(
    syncBrandScript,
    [
      '--brand', brandPath,
      '--json-out', path.join(metaDir, 'design-tokens.json'),
      '--css-out', path.join(siteDir, 'styles', 'tokens.css'),
    ],
    workDir
  );
  assert.equal(tokenRes.status, 0, tokenRes.stderr);
  const cssOut = fs.readFileSync(path.join(siteDir, 'styles', 'tokens.css'), 'utf8');
  assert.match(cssOut, /--step-5:/);
  assert.match(cssOut, /--space-8: 64px;/);
  assert.match(cssOut, /--container: 1200px;/);

  // 2. tqd-web: Owner edits data/site-data.js and syncs to static HTML + JSON-LD + llms.txt
  const siteDataPath = path.join(siteDir, 'data', 'site-data.js');
  let siteDataSrc = fs.readFileSync(siteDataPath, 'utf8');
  siteDataSrc = siteDataSrc
    .replace('Tiệm Bánh An Lành', 'Tiệm Bánh Mây Trắng')
    .replace('Tiệm Bánh An Lành | Bánh mì men tự nhiên nướng mới mỗi sáng', 'Tiệm Bánh Mây Trắng | Bánh mì men tự nhiên nướng mới mỗi sáng')
    .replace('0905 842 619', '0935 771 208')
    .replace(/0905842619/g, '0935771208');
  fs.writeFileSync(siteDataPath, siteDataSrc, 'utf8');

  const syncRes = runNode(syncSiteScript, [siteDir], workDir);
  assert.equal(syncRes.status, 0, syncRes.stderr + syncRes.stdout);
  const updatedHtml = fs.readFileSync(path.join(siteDir, 'index.html'), 'utf8');
  assert.match(updatedHtml, /<title>Tiệm Bánh Mây Trắng \|/);
  assert.match(updatedHtml, /href="https:\/\/zalo\.me\/0935771208"/);

  // 3. tqd-web-content: Generate + validate LocalBusiness JSON-LD and sitemap.xml
  const schemaInputPath = path.join(metaDir, 'business.json');
  const schemaOutputPath = path.join(metaDir, 'localbusiness.json');
  fs.writeFileSync(
    schemaInputPath,
    JSON.stringify({
      name: 'Tiệm Bánh Mây Trắng',
      telephone: '0935771208',
      streetAddress: '42 Nguyễn Văn Linh, Hải Châu',
      city: 'Đà Nẵng',
      country: 'VN',
      url: 'https://tiembanh-anlanh.vn',
      image: 'https://tiembanh-anlanh.vn/images/hero-bakery.svg',
    }),
    'utf8'
  );
  const genSchemaRes = runNode(
    generateSchemaScript,
    ['localbusiness', '--data', schemaInputPath, '--output', schemaOutputPath],
    workDir
  );
  assert.equal(genSchemaRes.status, 0, genSchemaRes.stderr);

  const valSchemaRes = runNode(validateSchemaScript, ['-f', schemaOutputPath], workDir);
  assert.equal(valSchemaRes.status, 0, valSchemaRes.stdout + valSchemaRes.stderr);

  const pagesJsonPath = path.join(metaDir, 'pages.json');
  fs.writeFileSync(
    pagesJsonPath,
    JSON.stringify([{ url: '/', priority: '1.0', changefreq: 'weekly', lastmod: '2026-11-16' }]),
    'utf8'
  );
  const sitemapRes = runNode(
    generateSitemapScript,
    ['https://tiembanh-anlanh.vn', path.join(siteDir, 'sitemap.xml'), '--pages', pagesJsonPath],
    workDir
  );
  assert.equal(sitemapRes.status, 0, sitemapRes.stderr);

  // 4. tqd-web-audit (offline): HTML health, JSON-LD syntax, real Vietnamese contact links, zero placeholders
  const htmlAuditRes = runNode(auditHtmlScript, [siteDir, '--strict-placeholders', '--json'], workDir);
  assert.equal(htmlAuditRes.status, 0, htmlAuditRes.stdout + htmlAuditRes.stderr);
  const htmlAudit = JSON.parse(htmlAuditRes.stdout);
  assert.equal(htmlAudit.summary.errors, 0);
  assert.equal(htmlAudit.summary.warnings, 0);

  // 5. tqd-web-launch: Preflight publish safety check
  const preflightRes = runNode(preflightScript, [siteDir, '--json'], workDir);
  assert.equal(preflightRes.status, 0, preflightRes.stdout + preflightRes.stderr);
  const preflight = JSON.parse(preflightRes.stdout);
  assert.equal(preflight.ok, true);
  assert.equal(preflight.blockers.length, 0);
  assert.equal(preflight.warnings.length, 0);

  // 6. tqd-web-audit (live HTTP): Discovery surfaces (robots, sitemap, llms.txt, OG, markdown twin)
  const { server, baseUrl } = await startStaticServer(siteDir);
  try {
    const discoveryRes = await runNodeAsync(
      checkDiscoveryScript,
      [baseUrl, '--site-origin', 'https://tiembanh-anlanh.vn', '--json'],
      workDir
    );
    assert.equal(discoveryRes.status, 0, discoveryRes.stdout + discoveryRes.stderr);
    const discovery = JSON.parse(discoveryRes.stdout);
    const errors = discovery.findings.filter((f) => f.severity === 'error');
    const warns = discovery.findings.filter((f) => f.severity === 'warn');
    assert.deepEqual(errors, []);
    assert.deepEqual(warns, []);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }

  // 7. tqd-web-design: Headless Chrome multi-viewport render check (375x812, 768x1024, 1440x900)
  const shotsDir = path.join(metaDir, 'shots');
  const renderRes = runNode(
    renderCheckScript,
    [path.join(siteDir, 'index.html'), '--out', shotsDir, '--viewports', '375x812,768x1024,1440x900'],
    workDir
  );
  if (renderRes.status !== 2) {
    assert.equal(renderRes.status, 0, renderRes.stdout + renderRes.stderr);
    const renderReport = JSON.parse(fs.readFileSync(path.join(shotsDir, 'render-report.json'), 'utf8'));
    assert.equal(renderReport.length, 3);
    for (const vp of renderReport) {
      assert.deepEqual(vp.findings, [], `Unexpected render finding on ${vp.viewport}: ${JSON.stringify(vp.findings)}`);
    }
  }
});
