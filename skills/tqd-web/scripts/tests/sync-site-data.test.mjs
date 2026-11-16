import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadSiteDataSandboxed, syncSiteDirectory } from '../sync-site-data.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.join(path.dirname(__dirname), 'sync-site-data.mjs');
const starterDir = path.join(path.dirname(path.dirname(__dirname)), 'assets', 'tier1-starter');

function withTempStarter(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tqd-sync-site-'));
  try {
    fs.cpSync(starterDir, dir, { recursive: true });
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('sync-site-data.mjs --help prints usage and exits 0', () => {
  const res = spawnSync(process.execPath, [scriptPath, '--help'], { encoding: 'utf8' });
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /Usage: node sync-site-data\.mjs/);
});

test('syncSiteDirectory updates index.html, JSON-LD, and llms.txt from site-data.js', () => {
  withTempStarter((dir) => {
    const dataFile = path.join(dir, 'data', 'site-data.js');
    let raw = fs.readFileSync(dataFile, 'utf8');
    raw = raw
      .replace('Tiệm Bánh An Lành', 'Bếp Mây Đà Nẵng & Tea')
      .replace('Tiệm Bánh An Lành | Bánh mì men tự nhiên nướng mới mỗi sáng', 'Bếp Mây Đà Nẵng & Tea | Bánh ít ngọt')
      .replace('0905 842 619', '0935 771 208')
      .replace(/0905842619/g, '0935771208')
      .replace('https://tiembanh-anlanh.vn', 'https://bepmay.vn');
    fs.writeFileSync(dataFile, raw, 'utf8');

    const dry = spawnSync(process.execPath, [scriptPath, dir, '--dry-run'], { encoding: 'utf8' });
    assert.equal(dry.status, 0, dry.stderr);
    assert.match(dry.stdout, /\[dry-run\]/);
    assert.doesNotMatch(fs.readFileSync(path.join(dir, 'index.html'), 'utf8'), /Bếp Mây Đà Nẵng/);

    const res = spawnSync(process.execPath, [scriptPath, dir], { encoding: 'utf8' });
    assert.equal(res.status, 0, res.stderr);

    const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
    assert.match(html, /<title>Bếp Mây Đà Nẵng &amp; Tea \| Bánh ít ngọt<\/title>/);
    assert.match(html, /data-edit="brandName">Bếp Mây Đà Nẵng &amp; Tea<\/span>/);
    assert.match(html, /href="tel:0935771208"/);
    assert.match(html, /href="https:\/\/zalo\.me\/0935771208"/);
    assert.match(html, /"name": "Bếp Mây Đà Nẵng & Tea"/);
    assert.match(html, /"telephone": "0935771208"/);

    const llms = fs.readFileSync(path.join(dir, 'llms.txt'), 'utf8');
    assert.match(llms, /^# Bếp Mây Đà Nẵng & Tea/m);
    assert.match(llms, /0935 771 208/);
  });
});

test('loadSiteDataSandboxed blocks process access and infinite loops via vm timeout', () => {
  assert.throws(() => loadSiteDataSandboxed('while (true) {}'), /Script execution timed out/);
  assert.throws(() => loadSiteDataSandboxed('const e = process.env; window.SITE_DATA = { e };'), /process is not defined/);
});

test('sync-site-data.mjs exits 2 on missing site-data.js or missing directory', () => {
  const missing = spawnSync(process.execPath, [scriptPath, path.join(os.tmpdir(), 'nonexistent-tqd-dir')], { encoding: 'utf8' });
  assert.equal(missing.status, 2);
});
