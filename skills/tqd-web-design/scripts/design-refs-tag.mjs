#!/usr/bin/env node
/**
 * Gắn thẻ ngành cho một thư mục DESIGN.md (ngoài repo) và ghi `local-tags.json` vào
 * chính thư mục đó; `design-intel.mjs --refs` sẽ dùng file này nếu có.
 *
 * Mặc định chạy offline bằng heuristic từ khoá. `--jev` (tắt mặc định) gửi thêm phần
 * mô tả của các file còn `unknown` cho TypeSafe Jev. Chỉ bật khi người giữ file đã xác
 * nhận được phép gửi nội dung đó cho bên thứ ba.
 */

import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { INDUSTRIES, TAGS_FILE, describingExcerpt, excerptHash, loadRefs } from './design-refs.mjs';

const JEV_ENDPOINT = process.env.TQD_JEV_ENDPOINT || 'https://api.typesafe.ai/v1/systemone';
const JEV_MODEL = 'jev-latest';
const CONCURRENCY = 4;

// Mỗi ngành là một câu hỏi noul độc lập, nên một style có thể thuộc nhiều ngành.
const JEV_QUESTIONS = {
  fnb: 'The brand behind this design sells food or drink (café, restaurant, bakery, bar, grocery).',
  beauty: 'The brand behind this design is a beauty, cosmetics, skincare or hair business.',
  wellness: 'The brand behind this design offers spa, massage, meditation or wellness services.',
  health: 'The brand behind this design is a medical, dental, pharmacy or health-care provider.',
  fitness: 'The brand behind this design is a gym, sports or fitness business.',
  hospitality: 'The brand behind this design is a hotel, resort, homestay or travel business.',
  retail: 'The brand behind this design sells physical products through a shop or online store.',
  fashion: 'The brand behind this design is a fashion, apparel, footwear or jewellery label.',
  education: 'The brand behind this design teaches: school, course platform or training.',
  realestate: 'The brand behind this design sells or rents property or architecture services.',
  finance: 'The brand behind this design is a bank, payments, investing or insurance company.',
  software: 'The brand behind this design is a software, SaaS or developer-tools product.',
  creative: 'The brand behind this design is a design studio, agency, artist, photographer or media publication.',
};

const USAGE = `Cách dùng:
  node design-refs-tag.mjs <thư mục DESIGN.md> [--jev] [--threshold 0.7]

Ghi ${TAGS_FILE} vào thư mục đó (thẻ ngành 0..n mỗi file; thiếu bằng chứng = unknown).
  --jev          gửi tên + mô tả + Imagery (≤2.000 ký tự, không gửi token/CSS) của các file
                 còn unknown cho TypeSafe Jev; cần TYPESAFE_API_KEY. Chỉ bật khi đã được phép
                 chia sẻ nội dung thư mục cho bên thứ ba.
  --threshold    ngưỡng xác suất noul để nhận một ngành (mặc định 0.7)`;

function fail(message, code) {
  console.error(`Lỗi: ${message}`);
  process.exit(code);
}

function parseArgs(argv) {
  const options = { dir: '', jev: false, threshold: 0.7 };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      console.log(USAGE);
      process.exit(0);
    } else if (arg === '--jev') {
      options.jev = true;
    } else if (arg === '--threshold') {
      const value = Number(argv[++index]);
      if (!(value > 0 && value < 1)) fail('--threshold phải nằm trong (0, 1)', 2);
      options.threshold = value;
    } else if (arg.startsWith('--')) {
      fail(`tuỳ chọn không hỗ trợ: ${arg}`, 2);
    } else if (!options.dir) {
      options.dir = arg;
    } else {
      fail(`thừa đối số: ${arg}`, 2);
    }
  }
  if (!options.dir) fail(`thiếu thư mục.\n${USAGE}`, 2);
  return options;
}

async function askJev(apiKey, state) {
  const questions = Object.fromEntries(Object.entries(JEV_QUESTIONS)
    .map(([id, instructions]) => [id, { type: 'noul', instructions }]));
  const response = await fetch(JEV_ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: JEV_MODEL, state, questions }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const body = await response.json();
  const scores = {};
  for (const id of Object.keys(JEV_QUESTIONS)) {
    const value = body?.answers?.[id]?.noul;
    if (typeof value !== 'number') throw new Error(`thiếu câu trả lời "${id}"`);
    scores[id] = Math.round(value * 100) / 100;
  }
  return scores;
}

function jevIndustries(scores, threshold) {
  const industries = Object.keys(JEV_QUESTIONS).filter((id) => scores[id] >= threshold);
  return industries.length ? industries : ['unknown'];
}

async function tagWithJev(pending, files, options) {
  const apiKey = process.env.TYPESAFE_API_KEY;
  console.error(`Jev: gửi ${pending.length} file (unknown hoặc đã đổi mô tả) tới ${JEV_ENDPOINT}`);
  let failed = 0;
  let next = 0;
  async function worker() {
    while (next < pending.length) {
      const { name, excerpt, hash } = pending[next++];
      const entry = files[name];
      try {
        const scores = await askJev(apiKey, excerpt);
        Object.assign(entry, { industries: jevIndustries(scores, options.threshold), source: 'jev', hash, jev: scores });
        delete entry.stale;
        delete entry.jevError;
      } catch (error) {
        failed += 1;
        entry.jevError = error.message;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, pending.length) }, worker));
  return { sent: pending.length, failed };
}

function readPrevious(output) {
  if (!existsSync(output)) return {};
  try {
    const parsed = JSON.parse(readFileSync(output, 'utf8'));
    if (!parsed || typeof parsed.files !== 'object') throw new Error('thiếu khoá "files"');
    return parsed.files;
  } catch (error) {
    // Không ghi đè: file có thể chứa kết quả Jev đã trả phí.
    fail(`${output} lỗi (${error.message}); sửa hoặc xoá file rồi chạy lại`, 1);
  }
}

const options = parseArgs(process.argv.slice(2));
if (options.jev && !process.env.TYPESAFE_API_KEY) fail('--jev cần biến môi trường TYPESAFE_API_KEY', 2);
const loaded = loadRefs(options.dir, { useLocalTags: false });
if (loaded.error) fail(loaded.error, loaded.code);
const output = path.join(options.dir, TAGS_FILE);
const previous = readPrevious(output);

const files = {};
const pending = [];
let reused = 0;
let stale = 0;
for (const ref of loaded.refs) {
  const name = path.basename(ref.file);
  const markdown = readFileSync(ref.file, 'utf8');
  const excerpt = describingExcerpt(markdown);
  // Băm đúng phần sẽ gửi Jev: file sửa phần mô tả thì kết quả cũ cần phân loại lại.
  const hash = excerptHash(markdown);
  const old = previous[name];
  if (old?.source === 'jev' && old.jev && typeof old.jev === 'object') {
    // Kết quả Jev đã trả phí không bao giờ bị xoá ở đây. Bản ghi cũ chưa có `hash`
    // (bản 5dded3d) được coi là khớp nội dung hiện tại và gắn hash từ lần này.
    const oldHash = old.hash || hash;
    files[name] = { industries: jevIndustries(old.jev, options.threshold), visual: ref.visual, source: 'jev', hash: oldHash, jev: old.jev };
    if (oldHash === hash) {
      reused += 1;
    } else {
      // Mô tả đã đổi: giữ kết quả cũ, đánh dấu `stale`; chỉ `--jev` thay nó khi gọi thành công.
      files[name].stale = true;
      stale += 1;
      pending.push({ name, excerpt, hash });
    }
    continue;
  }
  files[name] = { industries: ref.industries, visual: ref.visual, source: 'offline', hash };
  if (ref.industries[0] === 'unknown') pending.push({ name, excerpt, hash });
}
const jev = options.jev ? await tagWithJev(pending, files, options) : null;
const counts = {};
for (const entry of Object.values(files)) for (const tag of entry.industries) counts[tag] = (counts[tag] || 0) + 1;
// Ghi tạm rồi rename: ngắt giữa chừng không làm hỏng file cũ.
const temp = `${output}.${process.pid}.tmp`;
writeFileSync(temp, `${JSON.stringify({
  version: 1,
  industries: Object.keys(INDUSTRIES),
  threshold: options.threshold,
  counts,
  files,
}, null, 2)}\n`);
renameSync(temp, output);

const total = loaded.refs.length;
console.log(`Đã ghi ${output}: ${total} file, unknown ${counts.unknown || 0} (${Math.round(((counts.unknown || 0) / total) * 100)}%); giữ lại ${reused} kết quả Jev cũ${stale ? `, ${stale} kết quả Jev cũ đã đổi mô tả (stale, chạy --jev để phân loại lại)` : ''}`);
if (jev) console.log(`Jev: đã gửi ${jev.sent}, lỗi ${jev.failed}`);
process.exit(jev?.failed ? 1 : 0);
