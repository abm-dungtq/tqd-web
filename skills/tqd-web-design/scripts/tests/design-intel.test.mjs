import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = path.resolve(HERE, '..', '..');
const REPO_ROOT = path.resolve(SKILL_DIR, '..', '..');
const DATA_DIR = path.join(SKILL_DIR, 'data');
const SCRIPT = path.join(SKILL_DIR, 'scripts', 'design-intel.mjs');
const REFS = path.join(HERE, 'fixtures', 'design-refs');

const VERIFIED_FONTS = new Set([
  'Be Vietnam Pro',
  'Lora',
  'Fraunces',
  'Cormorant Garamond',
  'Plus Jakarta Sans',
  'Inter',
  'Manrope',
  'Nunito',
  'JetBrains Mono',
]);

function run(args, env = {}) {
  const { TQD_DESIGN_REFS, ...base } = process.env;
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8', env: { ...base, ...env } });
}

function readData(name) {
  return JSON.parse(readFileSync(path.join(DATA_DIR, name), 'utf8'));
}

function luminance(hex) {
  const value = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((index) => {
    const channel = Number.parseInt(value.slice(index, index + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground, background) {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

test('intel: cafe landing returns a style, palette, font pair and rules', () => {
  const result = run(['quán cà phê thủ công', '--surface', 'landing']);
  assert.equal(result.status, 0, result.stderr);
  for (const heading of ['HƯỚNG PHONG CÁCH', 'BẢNG MÀU', 'CẶP FONT', 'LUẬT UX', 'BỀ MẶT']) {
    assert.match(result.stdout, new RegExp(heading));
  }
  assert.match(result.stdout, /Quán cà phê ấm/);
  assert.doesNotMatch(result.stdout, /undefined/);
});

test('intel: dashboard brief carries empty, error and permission states', () => {
  const result = run(['dashboard tài chính', '--surface', 'dashboard', '--json']);
  assert.equal(result.status, 0, result.stderr);
  const brief = JSON.parse(result.stdout);
  assert.equal(brief.surface.id, 'dashboard');
  assert.ok(brief.surface.states.some((state) => state.includes('trống')));
  assert.ok(brief.surface.states.some((state) => state.includes('lỗi')));
  assert.ok(brief.surface.states.some((state) => state.includes('quyền')));
  assert.match(brief.surface.permission, /server\/API/);
  assert.equal(brief.palettes[0].id, 'finance-dark');
});

test('intel: the same query produces the same brief', () => {
  const first = run(['tiệm nail', '--surface', 'booking', '--json']).stdout;
  const second = run(['tiệm nail', '--surface', 'booking', '--json']).stdout;
  assert.equal(first, second);
});

test('intel: diacritics do not change the matched styles', () => {
  const signed = JSON.parse(run(['quán cà phê thủ công', '--surface', 'landing', '--json']).stdout);
  const unsigned = JSON.parse(run(['quan ca phe thu cong', '--surface', 'landing', '--json']).stdout);
  assert.deepEqual(
    signed.styles.map((style) => style.id),
    unsigned.styles.map((style) => style.id),
  );
});

test('intel: missing query and unknown surface exit 2', () => {
  assert.equal(run(['--surface', 'landing']).status, 2);
  assert.equal(run(['spa', '--surface', 'nope']).status, 2);
  assert.equal(run(['spa', '--surface', 'landing', '--limit', '99']).status, 2);
});

test('intel: every palette passes 4.5:1 for body, muted and button text', () => {
  const { palettes } = readData('palettes.json');
  assert.ok(palettes.length >= 20);
  for (const palette of palettes) {
    assert.ok(contrast(palette.ink, palette.paper) >= 4.5, `${palette.id} ink/paper`);
    assert.ok(contrast(palette.ink, palette.surface) >= 4.5, `${palette.id} ink/surface`);
    assert.ok(contrast(palette.mutedInk, palette.paper) >= 4.5, `${palette.id} muted/paper`);
    assert.ok(contrast(palette.onAccent, palette.accent) >= 4.5, `${palette.id} onAccent/accent`);
  }
});

test('intel: font pairs only use families with verified Vietnamese coverage', () => {
  const { pairs } = readData('font-pairs.json');
  assert.ok(pairs.length >= 10);
  for (const pair of pairs) {
    assert.ok(VERIFIED_FONTS.has(pair.display), pair.id);
    assert.ok(VERIFIED_FONTS.has(pair.body), pair.id);
  }
});

test('intel: data stays within the size budget and keeps upstream attribution', () => {
  const files = readdirSync(DATA_DIR).filter((name) => name.endsWith('.json'));
  const bytes = files.reduce((total, name) => total + statSync(path.join(DATA_DIR, name)).size, 0);
  assert.ok(bytes <= 150 * 1024, `data is ${bytes} bytes`);

  const notice = readFileSync(path.join(REPO_ROOT, 'NOTICE.txt'), 'utf8');
  assert.match(notice, /281e4537afb11333ac9947783779aaf314ebfbf2/);
  assert.match(notice, /ui-ux-pro-max-skill/);
  assert.match(notice, /MIT License/);

  const upstreamLicense = readFileSync(path.join(DATA_DIR, 'LICENSE-upstream.txt'), 'utf8');
  assert.match(upstreamLicense, /Copyright \(c\) 2024 Next Level Builder/);

  for (const name of readdirSync(DATA_DIR).filter((entry) => entry.endsWith('.json'))) {
    const content = readFileSync(path.join(DATA_DIR, name), 'utf8');
    assert.doesNotMatch(content, /AgentKit/, `${name} chứa tài liệu AgentKit`);
  }
});

test('intel: JSON mode exposes stable top-level keys', () => {
  const result = run(['spa', '--surface', 'settings', '--json']);
  assert.equal(result.status, 0, result.stderr);
  const brief = JSON.parse(result.stdout);
  assert.deepEqual(Object.keys(brief).sort(), [
    'fonts',
    'matched',
    'note',
    'palettes',
    'query',
    'rules',
    'styles',
    'surface',
  ]);
  assert.ok(brief.styles.length >= 1);
  assert.ok(brief.fonts.length >= 1);
  assert.ok(brief.palettes.length >= 1);
  assert.ok(brief.rules.length >= 1);
});

test('intel: --check validates the dataset and reports its size', () => {
  const result = run(['--check']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /design-intel check: OK/);
  assert.match(result.stdout, /21 bảng màu/);
  assert.match(result.stdout, /bytes/);
});

test('intel: --plan without a query prints an actionable checklist', () => {
  const result = run(['--plan']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /KẾ HOẠCH THIẾT KẾ/);
  assert.match(result.stdout, /Dựng đúng thứ tự/);
  assert.match(result.stdout, /render-check/);
  assert.match(result.stdout, /chưa mô tả/);
});

test('intel: --plan with a query returns the chosen direction and steps as JSON', () => {
  const result = run(['quán ăn gia đình', '--surface', 'landing', '--plan', '--json']);
  assert.equal(result.status, 0, result.stderr);
  const brief = JSON.parse(result.stdout);
  assert.match(brief.styles[0].label, /Nhà hàng|hoài niệm/);
  assert.ok(brief.plan.length >= 5);
  assert.match(brief.plan.join('\n'), /tokens\.css/);
});

test('intel: help exits 0 and lists every surface', () => {
  const result = run(['--help']);
  assert.equal(result.status, 0);
  for (const surface of ['landing', 'menu', 'booking', 'dashboard', 'auth', 'settings']) {
    assert.match(result.stdout, new RegExp(surface));
  }
});

test('intel: unmatched query reports fallback and does not pick a direction', () => {
  const json = run(['zzqvv', '--json']);
  assert.equal(json.status, 0, json.stderr);
  const brief = JSON.parse(json.stdout);
  assert.equal(brief.matched, false);
  assert.match(brief.note, /^Không khớp từ khoá rõ/);
  const plan = run(['zzqvv', '--plan']);
  assert.equal(plan.status, 0, plan.stderr);
  assert.match(plan.stdout, /không khớp từ khoá/);
  assert.match(plan.stdout, /Hướng tham khảo:/);
  assert.doesNotMatch(plan.stdout, /Chốt hướng/);
  assert.equal(JSON.parse(run(['quán cà phê', '--json']).stdout).matched, true);
});

function refsBrief(query, extra = []) {
  const result = run([query, '--refs', REFS, '--json', ...extra]);
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout).references;
}

// Kỳ vọng dưới đây đã được đọc tay trên 5 fixture tự viết, không lấy từ dữ liệu bên thứ ba.
test('intel refs: café query ranks the reviewed café reference first', () => {
  const refs = refsBrief('quán cà phê ấm cúng');
  assert.equal(refs.total, 5, '_index.md must be skipped');
  assert.equal(refs.matches[0].name, 'Roastery Counter');
  assert.ok(refs.matches[0].industries.includes('fnb'));
  assert.ok(!refs.matches.some((ref) => ref.name === 'Night Ledger'));
});

test('intel refs: a single metaphorical mention does not assign an industry', () => {
  const salon = refsBrief('salon làm đẹp').matches.find((ref) => ref.name === 'Ink Salon');
  assert.deepEqual(salon.industries, ['beauty']);
});

test('intel refs: styles without industry evidence stay unknown but are found by visual tags', () => {
  const refs = refsBrief('tối giản nền sáng', ['--limit', '5']);
  const gallery = refs.matches.find((ref) => ref.name === 'Gallery Objects');
  assert.ok(gallery, 'visual query must retrieve the untagged gallery style');
  assert.deepEqual(gallery.industries, ['unknown']);
  assert.ok(gallery.visual.includes('minimal'));
  assert.equal(refs.withIndustry, 4);
});

test('intel refs: one style can carry several industries', () => {
  const bakery = refsBrief('tiệm bánh').matches[0];
  assert.equal(bakery.name, 'Corner Bakery');
  assert.deepEqual(bakery.industries, ['fnb', 'retail']);
  assert.deepEqual(bakery.accents, ['#fff3c4', '#6b3e1f']);
  assert.deepEqual(bakery.fonts, ['Lora']);
});

test('intel refs: TQD_DESIGN_REFS is honoured and absence adds no references key', () => {
  const viaEnv = JSON.parse(run(['ngân hàng tài chính', '--json'], { TQD_DESIGN_REFS: REFS }).stdout);
  assert.equal(viaEnv.references.matches[0].name, 'Night Ledger');
  const without = JSON.parse(run(['ngân hàng tài chính', '--json']).stdout);
  assert.equal('references' in without, false);
});

test('intel refs: missing folder exits 2 and a folder without DESIGN.md exits 1', () => {
  assert.equal(run(['cafe', '--refs', path.join(REFS, 'missing')]).status, 2);
  assert.equal(run(['cafe', '--refs']).status, 2);
  const empty = mkdtempSync(path.join(os.tmpdir(), 'tqd-refs-'));
  try {
    const result = run(['cafe', '--refs', empty]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /không có file DESIGN\.md/);
  } finally {
    rmSync(empty, { recursive: true, force: true });
  }
});
