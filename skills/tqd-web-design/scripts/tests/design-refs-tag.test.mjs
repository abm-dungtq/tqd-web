import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPTS = path.resolve(HERE, '..');
const TAGGER = path.join(SCRIPTS, 'design-refs-tag.mjs');
const INTEL = path.join(SCRIPTS, 'design-intel.mjs');
const FIXTURES = path.join(HERE, 'fixtures', 'design-refs');

// Không bao giờ gọi API thật: mọi lần chạy trỏ TQD_JEV_ENDPOINT về server giả cục bộ.
function run(script, args, env = {}) {
  const { TQD_DESIGN_REFS, TYPESAFE_API_KEY, TQD_JEV_ENDPOINT, ...base } = process.env;
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [script, ...args], { env: { ...base, ...env } });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (status) => resolve({ status, stdout, stderr }));
  });
}

async function withJevMock(answer, fn) {
  const requests = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      const parsed = JSON.parse(body);
      requests.push({ auth: req.headers.authorization, body: parsed });
      const answers = Object.fromEntries(Object.keys(parsed.questions)
        .map((id) => [id, { type: 'noul', noul: answer(id, parsed.state) }]));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ model: 'jev-mock', answers }));
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    return await fn(`http://127.0.0.1:${server.address().port}/v1/systemone`, requests);
  } finally {
    server.close();
  }
}

function copyFixtures() {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'tqd-refs-tag-'));
  cpSync(FIXTURES, dir, { recursive: true });
  return dir;
}

function readTags(dir) {
  return JSON.parse(readFileSync(path.join(dir, 'local-tags.json'), 'utf8'));
}

test('refs-tag: offline run writes local-tags.json without any network call', async () => {
  const dir = copyFixtures();
  try {
    await withJevMock(() => 1, async (endpoint, requests) => {
      const result = await run(TAGGER, [dir], { TQD_JEV_ENDPOINT: endpoint, TYPESAFE_API_KEY: 'k' });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(requests.length, 0);
    });
    const tags = readTags(dir);
    assert.equal(Object.keys(tags.files).length, 5, '_index.md must be skipped');
    const { hash, ...gallery } = tags.files['gallery-objects.md'];
    assert.match(hash, /^[0-9a-f]{16}$/);
    assert.deepEqual(gallery, { industries: ['unknown'], visual: ['dark', 'light', 'minimal'], source: 'offline' });
    assert.equal(tags.counts.unknown, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('refs-tag: --jev without TYPESAFE_API_KEY exits 2 and writes nothing', async () => {
  const dir = copyFixtures();
  try {
    const result = await run(TAGGER, [dir, '--jev'], { TQD_JEV_ENDPOINT: 'http://127.0.0.1:9/unused' });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /TYPESAFE_API_KEY/);
    assert.equal(existsSync(path.join(dir, 'local-tags.json')), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('refs-tag: --jev sends only unknown files, only their description, and feeds design-intel', async () => {
  const dir = copyFixtures();
  try {
    await withJevMock((id) => (id === 'retail' || id === 'creative' ? 0.9 : 0.1), async (endpoint, requests) => {
      const result = await run(TAGGER, [dir, '--jev'], { TQD_JEV_ENDPOINT: endpoint, TYPESAFE_API_KEY: 'test-key' });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(requests.length, 1, 'only the single unknown fixture is sent');
      const [request] = requests;
      assert.equal(request.auth, 'Bearer test-key');
      assert.equal(request.body.questions.fnb.type, 'noul');
      assert.match(request.body.state, /Gallery Objects/);
      assert.match(request.body.state, /3D renders/);
      assert.doesNotMatch(request.body.state, /#111111|--color-ink|Soehne/, 'tokens are never sent');
    });
    const gallery = readTags(dir).files['gallery-objects.md'];
    assert.deepEqual(gallery.industries, ['retail', 'creative']);
    assert.equal(gallery.source, 'jev');
    assert.equal(readTags(dir).files['night-ledger.md'].source, 'offline');

    const intel = await run(INTEL, ['cửa hàng', '--refs', dir, '--json']);
    assert.equal(intel.status, 0, intel.stderr);
    const refs = JSON.parse(intel.stdout).references;
    assert.equal(refs.localTags, true);
    const ref = refs.matches.find((match) => match.name === 'Gallery Objects');
    assert.deepEqual(ref.industries, ['retail', 'creative']);
    assert.equal(ref.tagSource, 'jev');

    // Sửa mô tả sau khi gắn thẻ: design-intel không được xếp hạng bằng thẻ Jev cũ như thẻ hiện hành,
    // dù chưa chạy lại tagger hay đã chạy lại offline (bản ghi Jev được giữ trên đĩa với `stale`).
    const file = path.join(dir, 'gallery-objects.md');
    writeFileSync(file, readFileSync(file, 'utf8').replace('No people', 'Still no people'));
    for (const retag of [false, true]) {
      if (retag) {
        assert.equal((await run(TAGGER, [dir])).status, 0);
        assert.equal(readTags(dir).files['gallery-objects.md'].stale, true);
      }
      const edited = await run(INTEL, ['cửa hàng', '--refs', dir, '--json']);
      assert.equal(edited.status, 0, edited.stderr);
      const editedRefs = JSON.parse(edited.stdout).references;
      assert.equal(editedRefs.staleTags, 1);
      const staleRef = editedRefs.matches.find((match) => match.name === 'Gallery Objects');
      assert.ok(!staleRef?.industries.includes('retail'), 'stale Jev industries never rank as current');
      const text = await run(INTEL, ['cửa hàng', '--refs', dir]);
      assert.match(text.stdout, /1 file đổi mô tả sau lần gắn thẻ/);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('refs-tag: --jev strips code, HTML and CSS from the intro and Imagery before sending', async () => {
  const dir = copyFixtures();
  const leaks = ['FENCE_CSS', 'TILDE_CSS', 'INDENTED_CODE', 'HTML_ATTR', 'STYLE_BLOCK', 'COMMENT_TEXT', 'INLINE_CODE', 'CSS_DECL', 'TABLE_CELL',
    '--color-secret', '#ab12cd', 'url(secret.png)'];
  writeFileSync(path.join(dir, 'gallery-objects.md'), `# Gallery Objects — Style Reference
> Gallery wall of black-on-white objects

**Theme:** light

Intro prose PROSE_INTRO stays, accent #ab12cd and \`INLINE_CODE\` and var(--color-secret) go.

\`\`\`css
.hero { color: FENCE_CSS; }
\`\`\`

<div class="HTML_ATTR">Inline HTML PROSE_HTML_TEXT</div>
<style>
.x { content: "STYLE_BLOCK" }
</style>
<!-- COMMENT_TEXT -->
    INDENTED_CODE();

## Tokens — Colors

| Ink | \`#111111\` |

## Imagery

Imagery prose PROSE_IMAGERY stays, background url(secret.png).
~~~
TILDE_CSS
~~~
background-color: CSS_DECL;
| TABLE_CELL | x |
`);
  try {
    await withJevMock(() => 0.1, async (endpoint, requests) => {
      const result = await run(TAGGER, [dir, '--jev'], { TQD_JEV_ENDPOINT: endpoint, TYPESAFE_API_KEY: 'k' });
      assert.equal(result.status, 0, result.stderr);
      const sent = requests.find((request) => request.body.state.includes('PROSE_INTRO'))?.body.state;
      assert.ok(sent, 'gallery-objects.md must be sent');
      for (const prose of ['Gallery Objects', 'PROSE_INTRO', 'PROSE_HTML_TEXT', 'PROSE_IMAGERY']) assert.ok(sent.includes(prose), `missing ${prose}`);
      for (const leak of leaks) assert.ok(!sent.includes(leak), `leaked ${leak}: ${sent}`);
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('refs-tag: --jev ignores fake "## Imagery" headings inside Tokens code blocks', async () => {
  const dir = copyFixtures();
  const tokens = (body) => `## Tokens — Colors

${body}

## Tokens — Typography

### Soehne Mono — Labels
`;
  // Không có Imagery thật: heading giả trong fence không được biến phần sau thành đoạn trích.
  writeFileSync(path.join(dir, 'gallery-objects.md'), `# Gallery Objects — Style Reference
> Monochrome plinths PROSE_A

${tokens('```\n## Imagery\nSECRET_FENCE=1\n```\n~~~~\n## Imagery\nSECRET_TILDE=1\n~~~~')}`);
  // Có Imagery thật ở sau: heading giả trong <pre> và fence chưa đóng ở cuối không được gửi.
  writeFileSync(path.join(dir, 'fake-heading.md'), `# Fake Heading — Style Reference
> Quiet grid PROSE_B

${tokens('<pre>\n## Imagery\nSECRET_PRE=1\n</pre>')}
## Imagery

Plain renders PROSE_IMAGERY_B.

## Quick Start

\`\`\`
## Imagery
SECRET_UNCLOSED=1
`);
  try {
    await withJevMock(() => 0.1, async (endpoint, requests) => {
      const result = await run(TAGGER, [dir, '--jev'], { TQD_JEV_ENDPOINT: endpoint, TYPESAFE_API_KEY: 'k' });
      assert.equal(result.status, 0, result.stderr);
      const sent = requests.map((request) => request.body.state).join('\n');
      for (const prose of ['PROSE_A', 'PROSE_B', 'PROSE_IMAGERY_B']) assert.ok(sent.includes(prose), `missing ${prose}`);
      for (const leak of ['SECRET_FENCE', 'SECRET_TILDE', 'SECRET_PRE', 'SECRET_UNCLOSED', 'Soehne']) {
        assert.ok(!sent.includes(leak), `leaked ${leak}: ${sent}`);
      }
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('refs-tag: reruns keep paid Jev results, resend only changed or failed files', async () => {
  const dir = copyFixtures();
  const env = (endpoint) => ({ TQD_JEV_ENDPOINT: endpoint, TYPESAFE_API_KEY: 'k' });
  try {
    await withJevMock((id) => (id === 'retail' ? 0.9 : 0.1), async (endpoint, requests) => {
      assert.equal((await run(TAGGER, [dir, '--jev'], env(endpoint))).status, 0);
      assert.equal(requests.length, 1);

      const offline = await run(TAGGER, [dir], env(endpoint));
      assert.equal(offline.status, 0, offline.stderr);
      assert.match(offline.stdout, /giữ lại 1 kết quả Jev cũ/);
      assert.deepEqual(readTags(dir).files['gallery-objects.md'].industries, ['retail']);

      assert.equal((await run(TAGGER, [dir, '--jev'], env(endpoint))).status, 0);
      assert.equal(requests.length, 1, 'an unchanged Jev result is never re-sent');

      const file = path.join(dir, 'gallery-objects.md');
      writeFileSync(file, readFileSync(file, 'utf8').replace('No people', 'Still no people'));
      assert.equal((await run(TAGGER, [dir, '--jev'], env(endpoint))).status, 0);
      assert.equal(requests.length, 2, 'an edited description is re-classified');
    });

    const file = path.join(dir, 'gallery-objects.md');
    writeFileSync(file, readFileSync(file, 'utf8').replace('Still no people', 'No people at all'));
    const offlineAfterEdit = await run(TAGGER, [dir]);
    assert.equal(offlineAfterEdit.status, 0, offlineAfterEdit.stderr);
    const kept = readTags(dir).files['gallery-objects.md'];
    assert.equal(kept.source, 'jev', 'an offline rerun never drops a paid result');
    assert.equal(kept.stale, true);
    assert.deepEqual(kept.industries, ['retail']);

    assert.equal((await run(TAGGER, [dir, '--jev'], env('http://127.0.0.1:9/closed'))).status, 1);
    const failedEntry = readTags(dir).files['gallery-objects.md'];
    assert.ok(failedEntry.jevError);
    assert.equal(failedEntry.source, 'jev', 'a failed re-classification keeps the old paid result');
    await withJevMock(() => 0.9, async (endpoint, requests) => {
      assert.equal((await run(TAGGER, [dir, '--jev'], env(endpoint))).status, 0);
      assert.equal(requests.length, 1, 'a failed file is retried');
      assert.equal(readTags(dir).files['gallery-objects.md'].stale, undefined);
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// Định dạng do bản 5dded3d ghi: có kết quả Jev nhưng chưa có trường `hash`.
test('refs-tag: Jev entries written before hashes existed survive an offline rerun', async () => {
  const dir = copyFixtures();
  try {
    const jev = { fnb: 0.1, beauty: 0.1, wellness: 0.1, health: 0.1, fitness: 0.1, hospitality: 0.1, retail: 0.92,
      fashion: 0.1, education: 0.1, realestate: 0.1, finance: 0.1, software: 0.1, creative: 0.81 };
    writeFileSync(path.join(dir, 'local-tags.json'), JSON.stringify({
      version: 1,
      counts: { retail: 1, creative: 1 },
      files: { 'gallery-objects.md': { industries: ['retail', 'creative'], visual: ['minimal'], source: 'jev', jev } },
    }));
    await withJevMock(() => 0.9, async (endpoint, requests) => {
      const offline = await run(TAGGER, [dir], { TQD_JEV_ENDPOINT: endpoint, TYPESAFE_API_KEY: 'k' });
      assert.equal(offline.status, 0, offline.stderr);
      const entry = readTags(dir).files['gallery-objects.md'];
      assert.equal(entry.source, 'jev');
      assert.deepEqual(entry.industries, ['retail', 'creative']);
      assert.deepEqual(entry.jev, jev);
      assert.match(entry.hash, /^[0-9a-f]{16}$/);

      assert.equal((await run(TAGGER, [dir, '--jev'], { TQD_JEV_ENDPOINT: endpoint, TYPESAFE_API_KEY: 'k' })).status, 0);
      assert.equal(requests.length, 0, 'an adopted legacy result is not re-sent');
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('refs-tag: a corrupt local-tags.json is never overwritten', async () => {
  const dir = copyFixtures();
  try {
    const tagsFile = path.join(dir, 'local-tags.json');
    writeFileSync(tagsFile, '{ not json');
    const result = await run(TAGGER, [dir]);
    assert.equal(result.status, 1);
    assert.equal(readFileSync(tagsFile, 'utf8'), '{ not json');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('refs-tag: failed Jev answers keep offline tags and exit 1', async () => {
  const dir = copyFixtures();
  try {
    const result = await run(TAGGER, [dir, '--jev'], { TQD_JEV_ENDPOINT: 'http://127.0.0.1:9/closed', TYPESAFE_API_KEY: 'k' });
    assert.equal(result.status, 1);
    const gallery = readTags(dir).files['gallery-objects.md'];
    assert.deepEqual(gallery.industries, ['unknown']);
    assert.ok(gallery.jevError);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('refs-tag: a corrupt local-tags.json makes design-intel --refs exit 1', async () => {
  const dir = copyFixtures();
  try {
    writeFileSync(path.join(dir, 'local-tags.json'), '{ not json');
    const result = await run(INTEL, ['cafe', '--refs', dir]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /local-tags\.json lỗi/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
