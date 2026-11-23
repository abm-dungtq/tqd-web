import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseSiteData } from '../../skills/tqd-web/scripts/sync-site-data.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..', '..');
export const STARTER_DIR = path.join(repoRoot, 'skills', 'tqd-web', 'assets', 'tier1-starter');
const SYNC_SCRIPT = path.join(repoRoot, 'skills', 'tqd-web', 'scripts', 'sync-site-data.mjs');

export const REAL = {
  brand: 'Tiệm Bánh Mây Trắng',
  address: '15 Lê Duẩn, Hải Châu, Đà Nẵng',
  domain: 'https://banhmaytrang.vn',
  phoneDisplay: '0935 771 208',
  phoneTel: '0935771208',
};

// Each group reads the old values from the site's own data, so no starter sample value is typed here.
const GROUPS = {
  brand: { read: (data) => [data.brandName], write: (real) => [real.brand] },
  address: { read: (data) => [data.address], write: (real) => [real.address] },
  domain: { read: (data) => [data.siteUrl], write: (real) => [real.domain] },
  phone: { read: (data) => [data.phoneDisplay, data.phoneTel], write: (real) => [real.phoneDisplay, real.phoneTel] },
};

function mapStrings(value, fn) {
  if (typeof value === 'string') return fn(value);
  if (Array.isArray(value)) return value.map((entry) => mapStrings(entry, fn));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, mapStrings(entry, fn)]));
  }
  return value;
}

/**
 * Replace the starter's sample identity with a plausible owner's details and sync the site.
 * `keep` leaves one group untouched, so a test can prove a single leftover value is caught.
 */
export function applyRealValues(siteDir, { keep = [], overrides = {} } = {}) {
  const dataFile = path.join(siteDir, 'data', 'site-data.js');
  let data = parseSiteData(fs.readFileSync(dataFile, 'utf8'));
  const real = { ...REAL, ...overrides };

  for (const [name, group] of Object.entries(GROUPS)) {
    if (keep.includes(name)) continue;
    const olds = group.read(data);
    const news = group.write(real);
    const pairs = olds
      .map((oldValue, i) => [oldValue, news[i] ?? news[0]])
      .filter(([oldValue, newValue]) => oldValue && newValue && oldValue !== newValue);
    data = mapStrings(data, (text) => pairs.reduce((acc, [oldValue, newValue]) => acc.split(oldValue).join(newValue), text));
  }

  fs.writeFileSync(dataFile, `window.SITE_DATA = ${JSON.stringify(data, null, 2)};\n`, 'utf8');
  const res = spawnSync(process.execPath, [SYNC_SCRIPT, siteDir], { encoding: 'utf8' });
  if (res.status !== 0) {
    throw new Error(`sync-site-data.mjs exited ${res.status} for ${siteDir}\n${res.stdout}${res.stderr}`);
  }
  return data;
}

export function makeRealSite(destDir, opts = {}) {
  fs.cpSync(STARTER_DIR, destDir, { recursive: true });
  return applyRealValues(destDir, opts);
}
