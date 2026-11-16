import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptsDir = path.dirname(__dirname);

const { generateSitemap, escapeXml } = require(path.join(scriptsDir, 'generate-sitemap.cjs'));
const { generateSchema } = require(path.join(scriptsDir, 'generate-schema.cjs'));
const { validateSchema } = require(path.join(scriptsDir, 'validate-schema.cjs'));

test('escapeXml escapes all five XML special characters', () => {
  assert.equal(
    escapeXml(`https://example.com/?a=1&b=<2>&c="3"&d='4'`),
    'https://example.com/?a=1&amp;b=&lt;2&gt;&amp;c=&quot;3&quot;&amp;d=&apos;4&apos;'
  );
});

test('generateSitemap escapes loc values, normalizes baseUrl, and omits missing lastmod', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tqd-sitemap-'));
  const out = path.join(dir, 'sitemap.xml');
  const origLog = console.log;
  console.log = () => {};
  try {
    generateSitemap(
      'https://example.com/',
      [
        { url: '/search?q=a&b=<c>', lastmod: '2026-05-01' },
        { url: 'undated-page' },
      ],
      out
    );
    const xml = fs.readFileSync(out, 'utf8');
    assert.match(xml, /<loc>https:\/\/example\.com\/search\?q=a&amp;b=&lt;c&gt;<\/loc>/);
    assert.match(xml, /<loc>https:\/\/example\.com\/undated-page<\/loc>/);
    assert.equal(xml.match(/<lastmod>/g)?.length, 1, 'undated pages omit lastmod');
    assert.match(xml, /<lastmod>2026-05-01<\/lastmod>/);
  } finally {
    console.log = origLog;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('generateSchema generates valid Article, Product, Organization, LocalBusiness, and BreadcrumbList schemas', () => {
  const article = generateSchema('article', {
    title: 'Cách chọn bàn làm việc gỗ tự nhiên',
    author: 'Minh Anh',
    date: '2026-05-10',
    image: 'https://example.com/images/ban-go.jpg',
    org: 'Xưởng Gỗ Minh Anh',
  });
  assert.equal(article['@type'], 'Article');
  assert.equal(validateSchema(article).isValid, true);

  const product = generateSchema('product', {
    name: 'Bàn làm việc gỗ sồi 1m4',
    description: 'Bàn gỗ sồi tự nhiên phủ dầu bảo vệ, bảo hành 24 tháng.',
    image: 'https://example.com/images/ban-soi.jpg',
    price: '4200000',
    currency: 'VND',
  });
  assert.equal(product['@type'], 'Product');
  assert.equal(product.offers.priceCurrency, 'VND');
  assert.equal(validateSchema(product).isValid, true);

  const organization = generateSchema('organization', {
    name: 'Xưởng Gỗ Minh Anh',
    url: 'https://example.com',
    social: ['https://facebook.com/xuonggominhanh'],
  });
  assert.equal(organization['@type'], 'Organization');
  assert.equal(validateSchema(organization).isValid, true);

  const localBusiness = generateSchema('localbusiness', {
    name: 'Nha Khoa An Tâm',
    telephone: '+84-901-234-567',
    streetAddress: '120 Nguyễn Đình Chiểu, Quận 3',
    city: 'TP. Hồ Chí Minh',
    country: 'VN',
    url: 'https://example.com',
  });
  assert.equal(localBusiness['@type'], 'LocalBusiness');
  assert.equal(localBusiness.address['@type'], 'PostalAddress');
  assert.equal(validateSchema(localBusiness).isValid, true);

  const breadcrumb = generateSchema('breadcrumb', {
    items: [
      { name: 'Trang chủ', url: 'https://example.com/' },
      { name: 'Sản phẩm', url: 'https://example.com/san-pham' },
    ],
  });
  assert.equal(breadcrumb['@type'], 'BreadcrumbList');
  assert.equal(breadcrumb.itemListElement.length, 2);
  assert.equal(validateSchema(breadcrumb).isValid, true);

  assert.throws(() => generateSchema('unknown-type', {}), /Unknown schema type/);
});

test('validate-schema.cjs CLI exits 0 for valid JSON-LD and non-zero for invalid JSON-LD', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tqd-schema-cli-'));
  const validatorPath = path.join(scriptsDir, 'validate-schema.cjs');
  const validPath = path.join(dir, 'valid.json');
  const invalidMissingPath = path.join(dir, 'invalid-missing.json');
  const invalidSyntaxPath = path.join(dir, 'invalid-syntax.json');

  try {
    const validSchema = generateSchema('product', {
      name: 'Trà Ô Long Bảo Lộc 250g',
      description: 'Trà thu hoạch vụ xuân tại Bảo Lộc.',
      image: 'https://example.com/tra-o-long.jpg',
      price: '280000',
      currency: 'VND',
    });
    fs.writeFileSync(validPath, JSON.stringify(validSchema, null, 2), 'utf8');
    fs.writeFileSync(
      invalidMissingPath,
      JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: 'Thiếu trường' }),
      'utf8'
    );
    fs.writeFileSync(invalidSyntaxPath, '{ invalid json', 'utf8');

    const validRun = spawnSync(process.execPath, [validatorPath, '-f', validPath], { encoding: 'utf8' });
    assert.equal(validRun.status, 0, `Expected exit 0, got ${validRun.status}: ${validRun.stdout}${validRun.stderr}`);
    assert.match(validRun.stdout, /Schema validation passed/);

    const missingRun = spawnSync(process.execPath, [validatorPath, '-f', invalidMissingPath], { encoding: 'utf8' });
    assert.notEqual(missingRun.status, 0, 'Missing required fields should fail validation');
    assert.match(missingRun.stdout, /Schema validation failed/);

    const syntaxRun = spawnSync(process.execPath, [validatorPath, '-f', invalidSyntaxPath], { encoding: 'utf8' });
    assert.notEqual(syntaxRun.status, 0, 'Malformed JSON should exit non-zero');
    assert.match(syntaxRun.stdout, /JSON parsing error/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('generate-sitemap.cjs and generate-schema.cjs handle --help and missing input files cleanly', () => {
  const sitemapPath = path.join(scriptsDir, 'generate-sitemap.cjs');
  const schemaPath = path.join(scriptsDir, 'generate-schema.cjs');

  const helpMap = spawnSync(process.execPath, [sitemapPath, '--help'], { encoding: 'utf8' });
  assert.equal(helpMap.status, 0);
  assert.match(helpMap.stdout, /Usage: node generate-sitemap\.cjs/);

  const helpSchema = spawnSync(process.execPath, [schemaPath, '--help'], { encoding: 'utf8' });
  assert.equal(helpSchema.status, 0);
  assert.match(helpSchema.stdout, /Usage: node generate-schema\.cjs/);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tqd-seo-err-'));
  try {
    const missingPages = spawnSync(
      process.execPath,
      [sitemapPath, 'https://example.com', path.join(dir, 'sitemap.xml'), '--pages', path.join(dir, 'missing.json')],
      { encoding: 'utf8' }
    );
    assert.equal(missingPages.status, 2);
    assert.match(missingPages.stderr, /pages file not found/);

    const missingData = spawnSync(
      process.execPath,
      [schemaPath, 'article', '--data', path.join(dir, 'missing.json')],
      { encoding: 'utf8' }
    );
    assert.equal(missingData.status, 2);
    assert.match(missingData.stderr, /data file not found/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
