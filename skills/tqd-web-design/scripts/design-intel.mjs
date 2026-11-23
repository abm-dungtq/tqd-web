#!/usr/bin/env node
/**
 * Tra cứu tri thức thiết kế offline cho tqd-web-design.
 *
 * Chỉ đọc dữ liệu JSON trong ../data; không gọi mạng, không cần Python,
 * không phụ thuộc gói ngoài. Kết quả là gợi ý, không phải quyết định thay
 * người thiết kế.
 *
 * Cách dùng:
 *   node design-intel.mjs "<ngành + mood>" --surface landing [--json] [--limit 3]
 *   node design-intel.mjs "<ngành + mood>" --refs <thư mục DESIGN.md ngoài repo>
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { loadRefs, rankRefs } from './design-refs.mjs';

const DATA_DIR = new URL('../data/', import.meta.url);
const SURFACES = ['landing', 'menu', 'booking', 'dashboard', 'auth', 'settings'];
const SAFE_FONTS = new Set([
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
const SEVERITY_WEIGHT = { critical: 3, high: 2, medium: 1 };
const CATEGORY_BY_SURFACE = {
  landing: ['content', 'motion', 'performance', 'accessibility'],
  menu: ['touch', 'content', 'performance', 'accessibility'],
  booking: ['forms', 'touch', 'navigation', 'accessibility'],
  dashboard: ['permissions', 'charts', 'performance', 'accessibility'],
  auth: ['forms', 'accessibility', 'navigation'],
  settings: ['forms', 'permissions', 'accessibility'],
};

function fail(message, code) {
  console.error(`design-intel: ${message}`);
  process.exit(code);
}

function usage(code) {
  const text = [
    'Tra cứu tri thức thiết kế cho website nhỏ.',
    '',
    'Cách dùng:',
    '  node design-intel.mjs "<ngành + mood>" [--surface <bề mặt>] [--json] [--limit N] [--plan] [--refs <thư mục>]',
    '  node design-intel.mjs --check',
    '',
    `Bề mặt: ${SURFACES.join(', ')} (mặc định: landing)`,
    '--refs (hoặc biến môi trường TQD_DESIGN_REFS): thư mục DESIGN.md bạn tự có quyền dùng, để ngoài repo.',
    'Ví dụ:',
    '  node design-intel.mjs "quán cà phê thủ công" --surface landing',
    '  node design-intel.mjs "dashboard tài chính" --surface dashboard --json',
    '  node design-intel.mjs "quán ăn gia đình" --surface landing --plan',
    '  node design-intel.mjs --check',
  ].join('\n');
  (code === 0 ? console.log : console.error)(text);
  process.exit(code);
}

function readJson(name) {
  try {
    return JSON.parse(readFileSync(new URL(name, DATA_DIR), 'utf8'));
  } catch (error) {
    fail(`không đọc được ${name}: ${error.message}`, 1);
  }
}

function normalize(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .toLowerCase();
}

function words(value) {
  return normalize(value)
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 2);
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

function requireText(condition, message) {
  if (!condition) fail(`dữ liệu lỗi: ${message}`, 1);
}

function validate(styles, palettes, fonts, rules, surfaces) {
  const surfaceIds = new Set(surfaces.map((item) => item.id));
  requireText(surfaceIds.size === SURFACES.length, 'phải có đúng 6 bề mặt');

  for (const [label, records] of [
    ['styles', styles],
    ['palettes', palettes],
    ['font pairs', fonts],
    ['rules', rules],
    ['surfaces', surfaces],
  ]) {
    const ids = records.map((record) => record.id);
    requireText(new Set(ids).size === ids.length, `${label}: id bị trùng`);
    for (const id of ids) requireText(typeof id === 'string' && id.length > 0, `${label}: thiếu id`);
  }

  for (const style of styles) {
    requireText(typeof style.label === 'string' && style.label, `style ${style.id}: thiếu label`);
    requireText(Array.isArray(style.surfaces) && style.surfaces.length, `style ${style.id}: thiếu surfaces`);
    for (const surface of style.surfaces) {
      requireText(surfaceIds.has(surface), `style ${style.id}: bề mặt lạ "${surface}"`);
    }
  }

  for (const palette of palettes) {
    for (const key of ['paper', 'surface', 'ink', 'muted', 'mutedInk', 'line', 'accent', 'onAccent']) {
      requireText(/^#[0-9a-fA-F]{6}$/.test(palette[key] || ''), `palette ${palette.id}: ${key} không phải hex`);
    }
    const checks = [
      ['chữ/nền', contrast(palette.ink, palette.paper)],
      ['chữ/thẻ', contrast(palette.ink, palette.surface)],
      ['chữ phụ/nền', contrast(palette.mutedInk, palette.paper)],
      ['chữ trên nút/nút', contrast(palette.onAccent, palette.accent)],
    ];
    for (const [name, ratio] of checks) {
      requireText(ratio >= 4.5, `palette ${palette.id}: ${name} chỉ ${ratio.toFixed(2)}:1`);
    }
  }

  for (const pair of fonts) {
    requireText(SAFE_FONTS.has(pair.display), `font ${pair.id}: "${pair.display}" chưa xác minh tiếng Việt`);
    requireText(SAFE_FONTS.has(pair.body), `font ${pair.id}: "${pair.body}" chưa xác minh tiếng Việt`);
  }

  for (const rule of rules) {
    requireText(SEVERITY_WEIGHT[rule.severity], `rule ${rule.id}: severity lạ`);
    requireText(Array.isArray(rule.surfaces) && rule.surfaces.length, `rule ${rule.id}: thiếu surfaces`);
    for (const surface of rule.surfaces) {
      requireText(surfaceIds.has(surface), `rule ${rule.id}: bề mặt lạ "${surface}"`);
    }
  }

  for (const surface of surfaces) {
    requireText(Array.isArray(surface.sections) && surface.sections.length, `surface ${surface.id}: thiếu sections`);
    requireText(Array.isArray(surface.states) && surface.states.length, `surface ${surface.id}: thiếu states`);
    requireText(Array.isArray(surface.mustHave) && surface.mustHave.length, `surface ${surface.id}: thiếu mustHave`);
  }
}

function keywordScore(record, queryText, queryWords) {
  let score = 0;
  for (const keyword of record.keywords || []) {
    const normalized = normalize(keyword);
    if (!normalized) continue;
    if (queryText.includes(normalized)) score += 3;
    else if (normalized.split(' ').some((word) => queryWords.includes(word))) score += 1;
  }
  for (const phrase of record.bestFor || []) {
    const normalized = normalize(phrase);
    if (queryText.includes(normalized)) score += 2;
    else if (normalized.split(' ').some((word) => queryWords.includes(word))) score += 1;
  }
  return score;
}

function ranked(records, scorer) {
  return records
    .map((record) => ({ record, score: scorer(record) }))
    .sort((a, b) => b.score - a.score || a.record.id.localeCompare(b.record.id));
}

function parseArgs(argv) {
  const options = { queryParts: [], surface: null, json: false, limit: 3, plan: false, check: false, refs: null };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help' || argument === '-h') usage(0);
    else if (argument === '--surface') options.surface = argv[(index += 1)];
    else if (argument === '--json') options.json = true;
    else if (argument === '--limit') options.limit = Number(argv[(index += 1)]);
    else if (argument === '--plan') options.plan = true;
    else if (argument === '--check') options.check = true;
    else if (argument === '--refs') options.refs = argv[(index += 1)] || '';
    else if (argument.startsWith('--')) fail(`tham số lạ: ${argument}`, 2);
    else options.queryParts.push(argument);
  }
  return options;
}

function dataBytes() {
  return readdirSync(DATA_DIR)
    .filter((name) => name.endsWith('.json'))
    .reduce((total, name) => total + statSync(new URL(name, DATA_DIR)).size, 0);
}

function checkData() {
  const styles = readJson('styles.json').styles;
  const palettes = readJson('palettes.json').palettes;
  const fonts = readJson('font-pairs.json').pairs;
  const rules = readJson('ux-rules.json').rules;
  const surfaces = readJson('surfaces.json').surfaces;
  validate(styles, palettes, fonts, rules, surfaces);
  const bytes = dataBytes();
  if (bytes > 150 * 1024) fail(`dữ liệu ${bytes} bytes vượt ngân sách 150 KB`, 1);
  console.log(
    [
      'design-intel check: OK',
      `- ${styles.length} hướng phong cách, ${palettes.length} bảng màu, ${fonts.length} cặp font`,
      `- ${rules.length} luật UX, ${surfaces.length} bề mặt`,
      `- ${bytes} bytes dữ liệu (ngân sách 150 KB)`,
    ].join('\n'),
  );
}

function planSteps(result, surface, query) {
  const style = result.styles[0];
  const palette = result.palettes[0];
  const pair = result.fonts[0];
  if (!query || !result.matched) {
    return [
      `Hỏi chủ web ngành hàng và mood bằng lời thường, rồi chạy lại với từ khoá (gợi ý: ${result.styles.map((item) => item.label).join('; ')}).`,
      `Chốt một bảng màu sau khi kiểm tương phản (gợi ý: ${result.palettes.map((item) => item.label).join('; ')}).`,
      `Dựng đúng thứ tự: ${surface.sections.join(' → ')}.`,
      `Bổ sung trạng thái bắt buộc: ${surface.states.join('; ')}.`,
      'Kiểm 375/768/1440, focus-visible, tương phản 4.5:1, ảnh thật hoặc [Cần bổ sung].',
      'Chạy render-check.mjs trước khi báo hoàn thành.',
    ];
  }
  return [
    `Chốt hướng "${style.label}" với chủ web bằng một câu mô tả, ghi vào docs/website/brand.md.`,
    `Tạo tokens.css từ bảng màu "${palette.label}" (nền ${palette.paper}, chữ ${palette.ink}, nút ${palette.accent}) và cặp font ${pair.display} + ${pair.body}.`,
    `Dựng đúng thứ tự: ${surface.sections.join(' → ')}.`,
    `Bổ sung trạng thái bắt buộc: ${surface.states.join('; ')}.`,
    'Kiểm 375/768/1440, focus-visible, tương phản 4.5:1, ảnh thật hoặc [Cần bổ sung].',
    'Chạy render-check.mjs trước khi báo hoàn thành.',
  ];
}

function printPlan(result, surface, query) {
  const style = result.styles[0];
  const palette = result.palettes[0];
  const pair = result.fonts[0];
  const lines = [`KẾ HOẠCH THIẾT KẾ · ${surface.label} (Tier ${surface.tier})`];
  if (query && result.matched) {
    lines.push(
      `Yêu cầu: "${query}"`,
      '',
      `Hướng: ${style.label}`,
      `Bảng màu: ${palette.label} · Cặp font: ${pair.display} + ${pair.body}`,
    );
  } else {
    lines.push(
      query ? `Yêu cầu: "${query}" (không khớp từ khoá; dùng gợi ý chung theo bề mặt)` : 'Yêu cầu: chưa mô tả; dùng gợi ý chung theo bề mặt',
      '',
      `Hướng tham khảo: ${result.styles.map((item) => item.label).join('; ')}`,
      `Bảng màu tham khảo: ${result.palettes.map((item) => item.label).join('; ')}`,
      `Cặp font tham khảo: ${result.fonts.map((item) => `${item.display} + ${item.body}`).join('; ')}`,
    );
  }
  if (result.references?.matches.length) {
    lines.push(`Tham khảo DESIGN.md: ${result.references.matches.map((ref) => ref.name).join('; ')}`);
  }
  lines.push(
    `Mục: ${surface.sections.join(' → ')}`,
    `Trạng thái: ${surface.states.join('; ')}`,
    '',
    'Việc cần làm:',
    ...planSteps(result, surface, query).map((step, index) => `${index + 1}. ${step}`),
    '',
    result.note,
  );
  console.log(lines.join('\n'));
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.check) {
    checkData();
    return;
  }
  const query = options.queryParts.join(' ').trim();
  if (!query && !options.plan) usage(2);
  if (!options.surface) options.surface = 'landing';
  if (!SURFACES.includes(options.surface)) {
    fail(`--surface phải là một trong: ${SURFACES.join(', ')}`, 2);
  }
  if (!Number.isInteger(options.limit) || options.limit < 1 || options.limit > 5) {
    fail('--limit phải là số nguyên từ 1 đến 5', 2);
  }
  if (options.refs === '') fail('--refs cần đường dẫn thư mục', 2);
  const refsDir = options.refs ?? process.env.TQD_DESIGN_REFS ?? '';
  const loadedRefs = refsDir ? loadRefs(refsDir) : null;
  if (loadedRefs?.error) fail(loadedRefs.error, loadedRefs.code);

  const styles = readJson('styles.json').styles;
  const palettes = readJson('palettes.json').palettes;
  const fonts = readJson('font-pairs.json').pairs;
  const rules = readJson('ux-rules.json').rules;
  const surfaces = readJson('surfaces.json').surfaces;
  validate(styles, palettes, fonts, rules, surfaces);

  const surface = surfaces.find((item) => item.id === options.surface);
  const queryText = normalize(query);
  const queryWords = words(query);
  const matched = Boolean(query) && [styles, palettes, fonts].some((records) =>
    records.some((record) => keywordScore(record, queryText, queryWords) > 0),
  );

  const styleRanking = ranked(styles, (style) =>
    keywordScore(style, queryText, queryWords) + (style.surfaces.includes(surface.id) ? 4 : 0),
  );
  const paletteRanking = ranked(palettes, (palette) => keywordScore(palette, queryText, queryWords));
  const fontRanking = ranked(fonts, (pair) => keywordScore(pair, queryText, queryWords));
  const surfaceCategories = CATEGORY_BY_SURFACE[surface.id] || [];
  const ruleRanking = ranked(
    rules.filter((rule) => rule.surfaces.includes(surface.id)),
    (rule) =>
      (SEVERITY_WEIGHT[rule.severity] || 0) * 2 +
      (surfaceCategories.includes(rule.category) ? 2 : 0) +
      keywordScore(rule, queryText, queryWords),
  );

  const result = {
    query,
    matched,
    surface: {
      id: surface.id,
      label: surface.label,
      tier: surface.tier,
      purpose: surface.purpose,
      sections: surface.sections,
      states: surface.states,
      mustHave: surface.mustHave,
      avoid: surface.avoid,
      permission: surface.permission || '',
    },
    styles: styleRanking.slice(0, options.limit).map(({ record }) => record),
    palettes: paletteRanking.slice(0, 2).map(({ record }) => record),
    fonts: fontRanking.slice(0, 2).map(({ record }) => record),
    rules: ruleRanking.slice(0, 6).map(({ record }) => record),
    note: matched
      ? 'Kết quả là gợi ý; màu và font vẫn phải qua kiểm tra tương phản và mắt người.'
      : 'Không khớp từ khoá rõ; đây là gợi ý chung theo bề mặt, cần xác nhận với khách.',
  };
  if (loadedRefs) {
    result.references = {
      dir: refsDir,
      ...rankRefs(loadedRefs.refs, query, options.limit),
      note: 'Chỉ lấy cảm hứng cấu trúc (thang chữ, nhịp khoảng cách, kỷ luật màu); thay font bằng cặp có subset tiếng Việt, không chép tên, logo, ảnh, copy hay CSS nguyên văn. Xem references/external-design-md.md.',
    };
  }

  if (options.json) {
    const payload = options.plan ? { ...result, plan: planSteps(result, surface, query) } : result;
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  if (options.plan) {
    printPlan(result, surface, query);
    return;
  }

  const lines = [
    `Tra cứu: "${query}" · bề mặt: ${surface.label} (Tier ${surface.tier})`,
    '',
    'HƯỚNG PHONG CÁCH',
    ...result.styles.map((style, index) => `${index + 1}. ${style.label} — ${style.mood}`),
    '',
    'BẢNG MÀU',
    ...result.palettes.map((palette) => {
      const ratio = contrast(palette.onAccent, palette.accent).toFixed(2);
      return `${palette.label} (${palette.scheme}) — nền ${palette.paper}, nút ${palette.accent}, chữ trên nút ${ratio}:1`;
    }),
    '',
    'CẶP FONT',
    ...result.fonts.map((pair) => `${pair.display} + ${pair.body} — ${pair.mood}`),
    '',
    `LUẬT UX (${result.rules.length})`,
    ...result.rules.map((rule) => `- [${rule.severity}] ${rule.rule}`),
    '',
    `BỀ MẶT: ${surface.label}`,
    `Mục: ${surface.sections.join(' → ')}`,
    `Trạng thái bắt buộc: ${surface.states.join('; ')}`,
    `Phải có: ${surface.mustHave.join('; ')}`,
  ];
  if (surface.permission) lines.push(`Quyền: ${surface.permission}`);
  lines.push(`Tránh: ${surface.avoid.join('; ')}`);
  if (result.references) {
    const refs = result.references;
    lines.push('', `THAM KHẢO DESIGN.md NGOÀI (${refs.matches.length}/${refs.total} file; ${refs.withIndustry} file có thẻ ngành)`);
    if (!refs.matches.length) lines.push('- Không file nào khớp; mô tả thêm ngành hoặc mood (ví dụ: "ấm áp", "tối giản", "nền tối").');
    for (const ref of refs.matches) {
      lines.push(
        `- ${ref.name}: ${ref.tagline || '(không có mô tả)'}`,
        `  ${ref.theme || '?'} · ${ref.density || '?'} · thị giác: ${ref.visual.join(', ') || '—'} · ngành: ${ref.industries.join(', ')}`,
        `  màu: ${ref.accents.join(' ') || '—'} · font gốc: ${ref.fonts.join(', ') || '—'}`,
        `  file: ${ref.file}`,
      );
    }
    lines.push(refs.note);
  }
  lines.push('', result.note);
  console.log(lines.join('\n'));
}

main();
