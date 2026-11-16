// Run: node --test scripts/tests/design-scripts.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const scriptsDir = dirname(here);
const extractScript = join(scriptsDir, 'extract-colors.cjs');
const syncScript = join(scriptsDir, 'sync-brand-to-tokens.cjs');

const extractMod = require(extractScript);
const syncMod = require(syncScript);

const SAMPLE_BRAND_MD = `# Brand Identity: Tiệm Bánh Mộc

- **Tagline / Positioning:** Bánh mì men tự nhiên nướng mới mỗi sáng.

## Quick Reference

| Role | Value | Notes |
|---|---|---|
| Primary Color | #8B4513 (Terracotta Clay) | Primary CTA |
| Secondary Color | #2F4F4F (Deep Slate) | Supporting bands |
| Accent Color | #D97706 (Warm Amber) | Highlights |
| Display Font | Lora | Vietnamese subset |
| Body Font | Be Vietnam Pro | Vietnamese subset |

## Color Palette

### Primary
- **Base** | #8B4513 | Main action buttons
- **Dark** | #6B340E | Hover state
- **Light** | #F4EAE1 | Soft highlight

### Secondary
- **Base** | #2F4F4F | Supporting headings

### Accent
- **Base** | #D97706 | Focus ring

### Neutral
- **Canvas (\`--paper\`)** | #FAF8F5 | Background
- **Surface (\`--paper-2\`)** | #F2EDE6 | Section tint
- **Text (\`--ink\`)** | #1C1917 | Body text
- **Muted (\`--ink-2\`)** | #57534E | Captions

### Semantic
- **Success** | #15803D | Confirmed
`;

function withTempDir(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'tqd-web-design-test-'));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('extract-colors.cjs --help prints usage and exits 0', () => {
  const res = spawnSync(process.execPath, [extractScript, '--help'], { encoding: 'utf8' });
  assert.equal(res.status, 0);
  assert.match(res.stdout, /Usage: node extract-colors\.cjs/);
  assert.doesNotMatch(res.stdout, /ai-multimodal/i);
});

test('extract-colors.cjs fails cleanly on missing brand file', () => {
  withTempDir((dir) => {
    const res = spawnSync(
      process.execPath,
      [extractScript, '--palette', '--brand-file', join(dir, 'missing.md')],
      { encoding: 'utf8', cwd: dir }
    );
    assert.equal(res.status, 1);
    assert.match(res.stderr, /Brand file not found/);
  });
});

test('extract-colors.cjs parses brand.md palette and computes compliance', () => {
  withTempDir((dir) => {
    const brandPath = join(dir, 'brand.md');
    writeFileSync(brandPath, SAMPLE_BRAND_MD, 'utf8');

    const res = spawnSync(
      process.execPath,
      [extractScript, '--palette', '--json', '--brand-file', brandPath],
      { encoding: 'utf8', cwd: dir }
    );
    assert.equal(res.status, 0, res.stderr);
    const palette = JSON.parse(res.stdout);
    assert.deepEqual(palette.primary, ['#8B4513', '#6B340E', '#F4EAE1']);
    assert.deepEqual(palette.secondary, ['#2F4F4F']);
    assert.deepEqual(palette.accent, ['#D97706']);
    assert.ok(palette.neutral.includes('#FAF8F5'));
    assert.ok(palette.semantic.includes('#15803D'));

    const compliance = extractMod.calculateCompliance(['#8C4614', '#00FF00'], palette.all);
    assert.equal(compliance, 50);

    const parsedHistogram = extractMod.parseImageMagickOutput(
      '  1200: (139,69,19) #8B4513 srgb(139,69,19)\n   400: (47,79,79) #2F4F4F srgb(47,79,79)\n'
    );
    assert.equal(parsedHistogram[0].hex, '#8B4513');
    assert.equal(parsedHistogram[0].count, 1200);
  });
});

test('sync-brand-to-tokens.cjs --help exits 0 and avoids external paths', () => {
  const res = spawnSync(process.execPath, [syncScript, '--help'], { encoding: 'utf8' });
  assert.equal(res.status, 0);
  assert.match(res.stdout, /Usage: node sync-brand-to-tokens\.cjs/);
  const source = readFileSync(syncScript, 'utf8');
  assert.doesNotMatch(source, /\.claude\/skills/);
  assert.doesNotMatch(source, new RegExp('agent' + 'kit', 'i'));
});

test('sync-brand-to-tokens.cjs --dry-run does not create output files', () => {
  withTempDir((dir) => {
    const brandPath = join(dir, 'brand.md');
    const jsonOut = join(dir, 'out', 'design-tokens.json');
    const cssOut = join(dir, 'out', 'tokens.css');
    writeFileSync(brandPath, SAMPLE_BRAND_MD, 'utf8');

    const res = spawnSync(
      process.execPath,
      [syncScript, '--brand', brandPath, '--json-out', jsonOut, '--css-out', cssOut, '--dry-run'],
      { encoding: 'utf8', cwd: dir }
    );
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /Dry run complete/);
    assert.equal(existsSync(jsonOut), false);
    assert.equal(existsSync(cssOut), false);
  });
});

test('sync-brand-to-tokens.cjs generates design-tokens.json and tokens.css cleanly', () => {
  withTempDir((dir) => {
    const brandPath = join(dir, 'brand.md');
    const jsonOut = join(dir, 'docs', 'design-tokens.json');
    const cssOut = join(dir, 'styles', 'tokens.css');
    writeFileSync(brandPath, SAMPLE_BRAND_MD, 'utf8');

    const res = spawnSync(
      process.execPath,
      [syncScript, '--brand', brandPath, '--json-out', jsonOut, '--css-out', cssOut],
      { encoding: 'utf8', cwd: dir }
    );
    assert.equal(res.status, 0, res.stderr);
    assert.equal(existsSync(jsonOut), true);
    assert.equal(existsSync(cssOut), true);

    const tokens = JSON.parse(readFileSync(jsonOut, 'utf8'));
    assert.equal(tokens.brand, 'Tiệm Bánh Mộc');
    assert.equal(tokens.primitive.color['terracotta-clay']['500'].$value, '#8B4513');
    assert.equal(tokens.primitive.color['terracotta-clay']['600'].$value, '#6B340E');
    assert.equal(tokens.primitive.color['deep-slate']['500'].$value, '#2F4F4F');
    assert.equal(tokens.primitive.color['warm-amber']['500'].$value, '#D97706');
    assert.equal(tokens.semantic.typography['leading-display'].$value, '1.2');

    const css = readFileSync(cssOut, 'utf8');
    assert.match(css, /--color-terracotta-clay-500: #8B4513;/);
    assert.match(css, /--color-primary: #8B4513;/);
    assert.match(css, /--accent: #D97706;/);
    assert.match(css, /--color-accent: #D97706;/);
    assert.match(css, /--paper: #FAF8F5;/);
    assert.match(css, /--ink: #1C1917;/);
    assert.match(css, /--leading-display: 1\.2;/);
    assert.match(css, /--step-5:/);
    assert.match(css, /--space-8: 64px;/);
    assert.match(css, /--container: 1200px;/);
    assert.match(css, /--section-y:/);
    assert.match(css, /--accent-deep:/);
    assert.match(css, /--shadow-1:/);
    assert.match(css, /--dur-enter: 700ms;/);
    assert.match(css, /"Lora"/);
    assert.match(css, /"Be Vietnam Pro"/);
    assert.match(css, /prefers-reduced-motion: reduce/);
  });
});

test('render-check.mjs --help prints usage and exits 0 without launching browser', () => {
  const renderScript = join(scriptsDir, 'render-check.mjs');
  const res = spawnSync(process.execPath, [renderScript, '--help'], {
    encoding: 'utf8',
    env: { ...process.env, CHROME_PATH: '/nonexistent' },
  });
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /usage: node render-check\.mjs/);
});

test('sync-brand-to-tokens.cjs works with minimal Quick Reference brand.md', () => {
  withTempDir((dir) => {
    const brandPath = join(dir, 'brand.md');
    const jsonOut = join(dir, 'design-tokens.json');
    const cssOut = join(dir, 'tokens.css');
    writeFileSync(
      brandPath,
      '# Tư Vấn Minh An\n\n| Role | Value |\n|---|---|\n| Primary Color | #1E3A5F (Navy) |\n',
      'utf8'
    );
    const { brandData, tokens, css } = syncMod.syncBrandToTokens({
      brand: brandPath,
      jsonOut,
      cssOut,
      dryRun: false,
    });
    assert.equal(brandData.brand, 'Tư Vấn Minh An');
    assert.equal(tokens.primitive.color.navy['500'].$value, '#1E3A5F');
    assert.match(css, /--color-primary: #1E3A5F;/);
    assert.equal(existsSync(jsonOut), true);
    assert.equal(existsSync(cssOut), true);
  });
});

test('sync-brand-to-tokens.cjs errors cleanly when Primary hex is absent', () => {
  assert.throws(
    () => syncMod.extractBrandData('# Empty Brand\n\nNo hex colors here.'),
    /Could not find a Primary hex color/
  );
});
