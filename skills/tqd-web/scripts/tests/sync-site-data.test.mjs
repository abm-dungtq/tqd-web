import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { escapeHtmlText, parseSiteData, syncHtmlWithSiteData } from '../sync-site-data.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.join(path.dirname(__dirname), 'sync-site-data.mjs');
const starterDir = path.join(path.dirname(path.dirname(__dirname)), 'assets', 'tier1-starter');

const NEW_ORIGIN = 'https://lomoi.example';
const NEW_PHONE_DISPLAY = '0935 111 222';
const NEW_PHONE_TEL = '0935111222';
const NEW_ZALO = 'https://zalo.me/0935111222';

function withTempStarter(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tqd-sync-site-'));
  try {
    fs.cpSync(starterDir, dir, { recursive: true });
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function readData(dir) {
  return parseSiteData(fs.readFileSync(path.join(dir, 'data', 'site-data.js'), 'utf8'));
}

/** Edit the data file by key, the way an owner would, never by matching starter sample values. */
function editData(dir, mutate) {
  const data = readData(dir);
  mutate(data);
  fs.writeFileSync(path.join(dir, 'data', 'site-data.js'), `window.SITE_DATA = ${JSON.stringify(data, null, 2)};\n`, 'utf8');
  return data;
}

function useNewContacts(data) {
  data.siteUrl = NEW_ORIGIN;
  data.phoneDisplay = NEW_PHONE_DISPLAY;
  data.phoneTel = NEW_PHONE_TEL;
  data.zaloUrl = NEW_ZALO;
}

function run(dir, ...args) {
  return spawnSync(process.execPath, [scriptPath, dir, ...args], { encoding: 'utf8' });
}

function read(dir, name) {
  return fs.readFileSync(path.join(dir, name), 'utf8');
}

function rootFiles(dir) {
  return fs.readdirSync(dir).filter((name) => /\.(?:html|txt|xml|md)$/.test(name)).sort();
}

function snapshot(dir) {
  return Object.fromEntries(rootFiles(dir).map((name) => [name, read(dir, name)]));
}

function count(text, pattern) {
  return (text.match(pattern) || []).length;
}

test('sync-site-data.mjs --help prints usage and exits 0', () => {
  const res = spawnSync(process.execPath, [scriptPath, '--help'], { encoding: 'utf8' });
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /Usage: node sync-site-data\.mjs/);
});

test('syncSiteDirectory updates index.html, JSON-LD, and llms.txt from site-data.js', () => {
  withTempStarter((dir) => {
    editData(dir, (data) => {
      data.brandName = 'Bếp Mây Đà Nẵng & Tea';
      data.metaTitle = 'Bếp Mây Đà Nẵng & Tea | Bánh ít ngọt';
      data.phoneDisplay = '0935 771 208';
      data.phoneTel = '0935771208';
      data.zaloUrl = 'https://zalo.me/0935771208';
      data.siteUrl = 'https://bepmay.vn';
    });

    const dry = run(dir, '--dry-run');
    assert.equal(dry.status, 0, dry.stderr);
    assert.match(dry.stdout, /\[dry-run\]/);
    assert.doesNotMatch(read(dir, 'index.html'), /Bếp Mây Đà Nẵng/);

    const res = run(dir);
    assert.equal(res.status, 0, res.stderr);

    const html = read(dir, 'index.html');
    assert.match(html, /<title>Bếp Mây Đà Nẵng &amp; Tea \| Bánh ít ngọt<\/title>/);
    assert.match(html, /data-edit="brandName">Bếp Mây Đà Nẵng &amp; Tea<\/span>/);
    assert.match(html, /href="tel:0935771208"/);
    assert.match(html, /href="https:\/\/zalo\.me\/0935771208"/);
    assert.match(html, /"name": "Bếp Mây Đà Nẵng & Tea"/);
    assert.match(html, /"telephone": "0935771208"/);

    const llms = read(dir, 'llms.txt');
    assert.match(llms, /^# Bếp Mây Đà Nẵng & Tea/m);
    assert.match(llms, /0935 771 208/);
  });
});

test('sync-site-data.mjs exits 2 on missing site-data.js or missing directory', () => {
  const missing = spawnSync(process.execPath, [scriptPath, path.join(os.tmpdir(), 'nonexistent-tqd-dir')], { encoding: 'utf8' });
  assert.equal(missing.status, 2);
});

test('contract: parseSiteData rejects executable values, prefixes and trailing code', () => {
  const rejected = [
    'window.SITE_DATA = { "a": window.constructor.constructor("return process")() };',
    'window.SITE_DATA = { "a": "x" };\nalert(1);',
    'alert(1); window.SITE_DATA = { "a": "x" };',
    'window.SITE_DATA = [1, 2];',
    "window.SITE_DATA = { brandName: 'kiểu cũ' };",
    'window.SITE_DATA = { "siteUrl": "https://a.vn/duong-dan" };',
    'window.SITE_DATA = { "siteUrl": "javascript:alert(1)" };',
  ];
  for (const code of rejected) {
    assert.throws(() => parseSiteData(code), (err) => err.code === 'EDATA', code);
  }

  const ok = parseSiteData('\uFEFF/* ghi chú */\nwindow.SITE_DATA = { "brandName": "Tiệm D\'Amour", "siteUrl": "https://a.vn/" };\n');
  assert.equal(ok.brandName, "Tiệm D'Amour");
  assert.equal(ok.siteUrl, 'https://a.vn');
});

test('contract: special characters are escaped per context', () => {
  withTempStarter((dir) => {
    const brand = 'Lò D\'Amour "Ngon" & <Rẻ> </script>';
    const title = "Giá $& và $' | Lò";
    editData(dir, (data) => {
      data.brandName = brand;
      data.metaTitle = title;
      data.offerings[0].title = 'Bánh {{abc}}';
    });

    const res = run(dir);
    assert.equal(res.status, 0, res.stderr);

    const html = read(dir, 'index.html');
    assert.ok(html.includes(`data-edit="brandName">${escapeHtmlText(brand)}</span>`));
    assert.ok(html.includes(`<title>${escapeHtmlText(title)}</title>`));
    const jsonLd = /<script id="site-jsonld"[^>]*>([\s\S]*?)<\/script>/.exec(html);
    assert.equal(JSON.parse(jsonLd[1]).name, brand);
    assert.ok(read(dir, 'llms.txt').startsWith(`# ${brand}\n`));
    assert.ok(read(dir, 'llms-full.txt').includes('**Bánh {{abc}}**'));

    const again = run(dir);
    assert.equal(again.status, 0, again.stderr);
    assert.match(again.stdout, /no changes/);
  });
});

test('contract: a typo exits 1 with a Vietnamese message and writes nothing', () => {
  withTempStarter((dir) => {
    const before = snapshot(dir);
    fs.writeFileSync(
      path.join(dir, 'data', 'site-data.js'),
      'window.SITE_DATA = {\n  "brandName": "Thiếu ngoặc kép,\n  "phoneDisplay": "0935 111 222"\n};\n',
      'utf8'
    );

    const res = run(dir);
    assert.equal(res.status, 1);
    assert.match(res.stderr, /lỗi gõ/);
    assert.deepEqual(snapshot(dir), before);
  });
});

test('contract: adding and removing list items re-renders HTML and text twins', () => {
  withTempStarter((dir) => {
    const counts = () => [
      count(read(dir, 'index.html'), /data-edit-item/g),
      count(read(dir, 'llms-full.txt'), /^\d+\. \*\*/gm),
      count(read(dir, 'index.html.md'), /^- \*\*/gm),
    ];

    editData(dir, (data) => {
      data.offerings = data.offerings.slice(0, 3);
      data.offerings.push({ title: 'Bánh quy bơ', summary: 'Mẻ nhỏ mỗi chiều.', price: '30.000đ / túi' });
    });
    assert.equal(run(dir).status, 0);
    assert.deepEqual(counts(), [4, 4, 4]);
    assert.match(read(dir, 'index.html'), /data-edit-field="title">Bánh quy bơ</);

    editData(dir, (data) => { data.offerings = data.offerings.slice(3); });
    assert.equal(run(dir).status, 0);
    assert.deepEqual(counts(), [1, 1, 1]);

    const oneItem = snapshot(dir);
    editData(dir, (data) => { data.offerings.push({ title: 'Thiếu giá', summary: 'Chưa có giá.' }); });
    const missingField = run(dir);
    assert.equal(missingField.status, 1);
    assert.match(missingField.stderr, /price/);
    assert.deepEqual(snapshot(dir), oneItem);

    editData(dir, (data) => { data.offerings = []; });
    assert.equal(run(dir).status, 1);
  });
});

test('contract: changed domain and phone reach every root file', () => {
  withTempStarter((dir) => {
    const old = readData(dir);
    editData(dir, useNewContacts);
    const res = run(dir);
    assert.equal(res.status, 0, res.stderr);

    const oldHost = new URL(old.siteUrl).host;
    for (const name of rootFiles(dir)) {
      const text = read(dir, name);
      for (const stale of [oldHost, old.phoneDisplay, old.phoneTel]) {
        assert.ok(!text.includes(stale), `${name} still contains ${stale}`);
      }
    }
    assert.ok(read(dir, 'robots.txt').includes(`Sitemap: ${NEW_ORIGIN}/sitemap.xml`));
    assert.ok(read(dir, 'sitemap.xml').includes(`<loc>${NEW_ORIGIN}/</loc>`));
    assert.ok(read(dir, 'index.html').includes(`<link rel="canonical" href="${NEW_ORIGIN}/">`));
  });
});

test('contract: a second root page is synced', () => {
  withTempStarter((dir) => {
    const old = readData(dir);
    fs.writeFileSync(path.join(dir, 'bang-gia.html'), [
      '<!doctype html>',
      '<html lang="vi">',
      '<head>',
      `  <title data-edit-template="Bảng giá | {{brandName}}">Bảng giá | ${old.brandName}</title>`,
      `  <link rel="canonical" href="${old.siteUrl}/bang-gia.html">`,
      '</head>',
      '<body>',
      `  <p>Gọi <span data-edit="phoneDisplay">${old.phoneDisplay}</span></p>`,
      `  <a href="tel:${old.phoneTel}" data-edit-tel="phoneTel">Gọi ngay</a>`,
      '</body>',
      '</html>',
      '',
    ].join('\n'), 'utf8');

    editData(dir, (data) => {
      useNewContacts(data);
      data.brandName = 'Lò Mới';
    });
    const res = run(dir);
    assert.equal(res.status, 0, res.stderr);

    const page = read(dir, 'bang-gia.html');
    assert.ok(page.includes('>Bảng giá | Lò Mới</title>'));
    assert.ok(page.includes(`href="${NEW_ORIGIN}/bang-gia.html"`));
    assert.ok(page.includes(`<span data-edit="phoneDisplay">${NEW_PHONE_DISPLAY}</span>`));
    assert.ok(page.includes(`href="tel:${NEW_PHONE_TEL}"`));
  });
});

test('contract: sync is idempotent', () => {
  withTempStarter((dir) => {
    editData(dir, (data) => {
      useNewContacts(data);
      data.brandName = 'Lò Mới';
      data.hours = '06:30 - 20:00 mỗi ngày';
      data.offerings.push({ title: 'Bánh quy bơ', summary: 'Mẻ nhỏ mỗi chiều.', price: '30.000đ / túi' });
    });
    assert.equal(run(dir).status, 0);
    const first = snapshot(dir);

    const second = run(dir);
    assert.equal(second.status, 0, second.stderr);
    assert.match(second.stdout, /no changes/);
    assert.deepEqual(snapshot(dir), first);
  });
});

test('contract: hard-coded contact values fail the run and name the file', () => {
  withTempStarter((dir) => {
    const { phoneDisplay } = readData(dir);
    const htmlPath = path.join(dir, 'index.html');
    fs.writeFileSync(htmlPath, read(dir, 'index.html').replace('</body>', `<p>Gọi ngay ${phoneDisplay}</p>\n</body>`), 'utf8');

    const res = run(dir);
    assert.equal(res.status, 1);
    assert.match(res.stderr, /index\.html:\d+\s+phoneDisplay/);
  });
});

test('contract: --check is 1 when pending, 0 after sync, and never writes', () => {
  withTempStarter((dir) => {
    editData(dir, (data) => { data.hours = '06:30 - 20:00 mỗi ngày'; });
    const before = snapshot(dir);

    const pending = run(dir, '--check');
    assert.equal(pending.status, 1);
    assert.match(pending.stdout, /Out of sync: index\.html/);
    assert.deepEqual(snapshot(dir), before);

    assert.equal(run(dir).status, 0);
    const synced = snapshot(dir);
    const clean = run(dir, '--check');
    assert.equal(clean.status, 0, clean.stderr);
    assert.match(clean.stdout, /In sync/);
    assert.deepEqual(snapshot(dir), synced);
  });
});

test('contract: a stale file is detected and repaired', () => {
  withTempStarter((dir) => {
    const staleRobots = read(dir, 'robots.txt');
    editData(dir, useNewContacts);
    assert.equal(run(dir).status, 0);

    fs.writeFileSync(path.join(dir, 'robots.txt'), staleRobots, 'utf8');
    const detected = run(dir, '--check');
    assert.equal(detected.status, 1);
    assert.match(detected.stdout, /Out of sync: robots\.txt/);

    assert.equal(run(dir).status, 0);
    assert.equal(run(dir, '--check').status, 0);
    assert.ok(read(dir, 'robots.txt').includes(`${NEW_ORIGIN}/sitemap.xml`));
  });
});

test('contract: renaming the brand to a longer name that contains the old one works', () => {
  withTempStarter((dir) => {
    const old = readData(dir);
    const longer = `${old.brandName} Mới`;
    editData(dir, (data) => {
      data.brandName = longer;
      data.metaTitle = old.metaTitle.replace(old.brandName, longer);
    });

    const res = run(dir);
    assert.equal(res.status, 0, res.stderr);
    const again = run(dir);
    assert.equal(again.status, 0, again.stderr);
    assert.match(again.stdout, /no changes/);

    const title = /<title>([\s\S]*?)<\/title>/.exec(read(dir, 'index.html'))[1];
    assert.equal(title.split(longer).length - 1, 1);
    assert.ok(read(dir, '404.html').includes(`| ${longer}</title>`));
  });
});

test('contract: the shipped starter is in sync', () => {
  const res = run(starterDir, '--check');
  assert.equal(res.status, 0, res.stdout + res.stderr);
});

test('contract: nested markup inside a list item survives rendering', () => {
  const html = [
    '<div class="offerings" data-edit-list="offerings">',
    '  <!-- list:offerings -->',
    '  <div class="card" data-edit-item>',
    '    <h3 data-edit-field="title">Mẫu</h3>',
    '    <div class="row"><p DATA-EDIT-FIELD="summary">Mẫu</p></div>',
    '  </div>',
    '  <!-- /list:offerings -->',
    '</div>',
  ].join('\n');
  const out = syncHtmlWithSiteData(html, {
    offerings: [{ title: 'Bánh mì', summary: 'Giòn' }, { title: 'Bánh ngọt', summary: 'Ít đường' }],
  });
  assert.equal(count(out, /<div\b/g), count(out, /<\/div>/g), out);
  assert.equal(count(out, /data-edit-item/g), 2);
  assert.equal(count(out, /<div class="row">/g), 2);
  assert.match(out, /<h3 data-edit-field="title">Bánh mì<\/h3>\n    <div class="row"><p DATA-EDIT-FIELD="summary">Giòn<\/p><\/div>\n  <\/div>/);
  assert.match(out, /<p DATA-EDIT-FIELD="summary">Ít đường<\/p>/);
  assert.ok(out.endsWith('  <!-- /list:offerings -->\n</div>'), out);
});

test('contract: a quoted ">" inside an item attribute does not end the item', () => {
  const html = [
    '<!-- list:items -->',
    '<div data-edit-item><p data-edit-field="title">old</p><div title="> </div>">inside</div></div>',
    '<!-- /list:items -->',
  ].join('\n');
  const out = syncHtmlWithSiteData(html, { items: [{ title: 'new' }] });
  assert.match(out, /<p data-edit-field="title">new<\/p>/);
  assert.match(out, /<div title="> <\/div>">inside<\/div><\/div>/);
});

test('contract: a list without its closing comment is a data error', () => {
  const html = '<!-- list:items --><div data-edit-item><p data-edit-field="title">old</p></div>';
  assert.throws(() => syncHtmlWithSiteData(html, { items: [{ title: 'new' }] }), /thiếu chú thích đóng/);
});

test('contract: a list field wrapped in another element is a data error', () => {
  const html = [
    '<!-- list:offerings -->',
    '<div class="card" data-edit-item><p data-edit-field="title"><span>Mẫu</span></p></div>',
    '<!-- /list:offerings -->',
  ].join('\n');
  assert.throws(
    () => syncHtmlWithSiteData(html, { offerings: [{ title: 'Bánh mì' }] }),
    /thẻ con/
  );
});

test('contract: meta description containing an apostrophe is replaced, not left stale', () => {
  const html = '<html><head><meta name="description" content="Mô tả cũ của L\'an"></head><body></body></html>';
  const out = syncHtmlWithSiteData(html, { metaDescription: "Bánh của L'an" });
  assert.match(out, /<meta name="description" content="Bánh của L&#39;an">/);
  assert.doesNotMatch(out, /Mô tả cũ/);
});

test('contract: a non-bakery site gets no bakery copy in generated text', () => {
  withTempStarter((dir) => {
    editData(dir, (data) => {
      data.brandName = 'Tiệm Nail Mây';
      data.metaTitle = 'Tiệm Nail Mây | Làm móng tại Quận 3';
      data.metaDescription = 'Làm móng tay, móng chân và chăm sóc da tay tại Quận 3. Mở cửa 09:00 - 20:00 mỗi ngày, đặt lịch trước qua Zalo.';
      data.hero.eyebrow = 'Tiệm nail tại Quận 3';
      data.hero.headline = 'Làm móng tay và móng chân theo lịch hẹn';
      data.hero.subheadline = 'Đặt lịch trước để không phải chờ; dụng cụ khử trùng sau mỗi khách.';
      data.menuSection.heading = 'Bảng giá dịch vụ';
      data.offerings = [
        { title: 'Sơn gel', price: '250.000đ', summary: 'Sơn bền ba tuần, chọn màu tại tiệm.' },
        { title: 'Chăm sóc da tay', price: '150.000đ', summary: 'Tẩy da chết và dưỡng ẩm.' },
      ];
      data.address = '12 Võ Văn Tần, Quận 3, TP.HCM';
      data.hours = '09:00 - 20:00 mỗi ngày';
    });
    const res = run(dir);
    assert.equal(res.status, 0, res.stdout + res.stderr);
    for (const name of ['llms.txt', 'llms-full.txt', 'index.html.md']) {
      const text = read(dir, name);
      assert.doesNotMatch(text, /bánh|bột|bơ lạt|nướng|mẻ|lò |giao nóng|thợ /i, `${name}:\n${text}`);
    }
  });
});

test('contract: a JSON-LD block that is not an object is a data error, not a crash', () => {
  const html = '<script type="application/ld+json" id="site-jsonld">null</script>';
  assert.throws(
    () => syncHtmlWithSiteData(html, { brandName: 'Tiệm Mới' }),
    (err) => err.code === 'EDATA' && /JSON-LD/.test(err.message)
  );
});

test('contract: an unreadable data file exits 2, not the drift code 1', () => {
  withTempStarter((dir) => {
    const dataPath = path.join(dir, 'data', 'site-data.js');
    fs.rmSync(dataPath);
    fs.mkdirSync(dataPath);
    const res = run(dir);
    assert.equal(res.status, 2, res.stdout + res.stderr);
  });
});
