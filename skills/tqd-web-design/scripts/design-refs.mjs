/**
 * Đọc thư mục DESIGN.md do người dùng tự cung cấp (ngoài repo) và xếp hạng theo
 * thẻ thị giác + thẻ ngành. Không gửi dữ liệu đi đâu, không ghi file.
 *
 * Một file có thể có nhiều ngành hoặc không ngành nào (`unknown`): mô tả thị giác
 * như "gallery wall of black-on-white objects" vẫn dùng được cho nhiều ngành.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const MAX_FILE_BYTES = 512 * 1024;

// Từ khoá đã bỏ dấu, viết thường. Cụm nhiều từ được so theo ranh giới từ.
export const INDUSTRIES = {
  fnb: ['ca phe', 'cafe', 'coffee', 'espresso', 'quan an', 'nha hang', 'restaurant', 'diner', 'bistro',
    'food', 'kitchen', 'bakery', 'banh', 'pastry', 'tra sua', 'tea', 'wine', 'cocktail',
    'beer', 'chef', 'dining', 'recipe', 'grocery', 'pizza', 'burger', 'thuc don', 'am thuc'],
  beauty: ['spa', 'salon', 'nail', 'lam dep', 'tham my', 'beauty', 'skincare', 'cosmetic', 'cosmetics',
    'makeup', 'hair', 'barber', 'fragrance', 'perfume'],
  wellness: ['wellness', 'yoga', 'meditation', 'supplement', 'thien', 'duong sinh'],
  health: ['phong kham', 'nha khoa', 'clinic', 'dental', 'medical', 'health', 'healthcare', 'pharmacy',
    'doctor', 'patient', 'hospital'],
  fitness: ['gym', 'fitness', 'the hinh', 'workout', 'training', 'athlete', 'sport', 'sports', 'running'],
  hospitality: ['khach san', 'homestay', 'hotel', 'resort', 'travel', 'du lich', 'villa'],
  retail: ['cua hang', 'shop', 'store', 'boutique', 'retail', 'ecommerce', 'e commerce', 'furniture',
    'homeware', 'ceramics', 'grocery'],
  fashion: ['thoi trang', 'fashion', 'apparel', 'clothing', 'couture', 'runway', 'streetwear', 'jewelry',
    'jewellery', 'eyewear', 'footwear'],
  education: ['giao duc', 'trung tam', 'education', 'school', 'course', 'courses', 'learning', 'academy',
    'university', 'tutor'],
  realestate: ['bat dong san', 'real estate', 'property', 'properties', 'kien truc', 'noi that', 'architect',
    'architects'],
  finance: ['tai chinh', 'finance', 'fintech', 'bank', 'banking', 'payments', 'invest', 'investing',
    'crypto', 'insurance', 'accounting'],
  software: ['saas', 'software', 'phan mem', 'developer', 'developers', 'api', 'analytics', 'startup', 'b2b'],
  // Không dùng "gallery", "museum", "magazine", "studio", "photography": Refero dùng chúng làm ẩn dụ
  // thị giác hoặc để mô tả ảnh, nên gần như file nào cũng có.
  creative: ['agency', 'portfolio', 'designer', 'photographer', 'music', 'artist', 'artists', 'exhibition',
    'record label'],
};

// Từ tiếng Việt một âm tiết dễ trùng nghĩa sau khi bỏ dấu (tối/tôi, sáng/sang, trắng/trang,
// ấm/âm, đen/đến) nên chỉ dùng dạng cụm.
export const VISUALS = {
  dark: ['nen toi', 'mau toi', 'tong toi', 'mau den', 'nen den', 'dark', 'black', 'midnight', 'night', 'noir', 'void'],
  light: ['nen sang', 'mau sang', 'tong sang', 'mau trang', 'nen trang', 'light', 'white', 'paper', 'daylight', 'bright'],
  warm: ['am ap', 'am cung', 'tong am', 'mau am', 'warm', 'cream', 'kem', 'parchment', 'bone', 'sand',
    'terracotta', 'amber', 'golden', 'ember', 'earth'],
  cool: ['lanh', 'cool', 'blue', 'xanh duong', 'ice', 'frost', 'steel'],
  minimal: ['toi gian', 'minimal', 'minimalist', 'clean', 'quiet', 'restrained', 'stark', 'silence',
    'monochrome', 'gallery'],
  luxury: ['sang trong', 'cao cap', 'luxury', 'premium', 'couture', 'elegant', 'refined'],
  playful: ['vui', 'tre trung', 'playful', 'fun', 'sticker', 'cartoon', 'candy', 'pastel', 'zine'],
  bold: ['dam', 'manh', 'bold', 'loud', 'poster', 'neon', 'electric', 'saturated', 'vivid'],
  editorial: ['bien tap', 'tap chi', 'editorial', 'magazine', 'broadsheet', 'newspaper', 'serif'],
  natural: ['tu nhien', 'organic', 'natural', 'botanical', 'plant', 'green', 'xanh la', 'handmade',
    'thu cong', 'craft'],
  technical: ['ky thuat', 'technical', 'terminal', 'grid', 'mono', 'monospace', 'console', 'instrument'],
  retro: ['hoai niem', 'co dien', 'retro', 'vintage', 'nostalgic', 'classic', 'heritage'],
};

function normalize(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase();
}

function wordText(value) {
  return ` ${normalize(value).split(/[^a-z0-9]+/).filter(Boolean).join(' ')} `;
}

function occurrences(text, terms) {
  let total = 0;
  for (const term of terms) total += text.split(` ${term} `).length - 1;
  return total;
}

function hits(text, dictionary, minimum = 1) {
  return Object.keys(dictionary).filter((tag) => occurrences(text, dictionary[tag]) >= minimum);
}

function section(markdown, heading) {
  const start = markdown.search(new RegExp(`^## ${heading}\\b.*$`, 'm'));
  if (start === -1) return '';
  const rest = markdown.slice(start).split('\n').slice(1).join('\n');
  const end = rest.search(/^## /m);
  return end === -1 ? rest : rest.slice(0, end);
}

export function parseDesignMd(markdown, file) {
  const name = (markdown.match(/^# (.+?)(?:\s+—\s+Style Reference)?\s*$/m) || [])[1]?.trim()
    || path.basename(file, '.md');
  const tagline = (markdown.match(/^> (.+)$/m) || [])[1]?.trim() || '';
  const theme = ((markdown.match(/^\*\*Theme:\*\*\s*(\w+)/m) || [])[1] || '').toLowerCase();
  const density = ((markdown.match(/^\*\*Density:\*\*\s*(\w+)/m) || [])[1] || '').toLowerCase();
  const colors = section(markdown, 'Tokens — Colors');
  const accents = [...new Set(colors.match(/#[0-9a-fA-F]{6}\b/g) || [])].slice(0, 6).map((hex) => hex.toLowerCase());
  const typography = section(markdown, 'Tokens — Typography');
  const fonts = [...typography.matchAll(/^### (?!Type Scale)(.+?)(?:\s+—.*)?$/gm)].map((match) => match[1].trim()).slice(0, 4);
  const intro = markdown.split(/^## /m)[0];
  // Thẻ ngành: từ khoá phải lặp ≥2 lần trong tóm tắt + phần mô tả + Imagery; nhắc một lần
  // thường là ẩn dụ ("coffee-black", "gallery wall"). Không đủ bằng chứng thì để `unknown`.
  const taglineText = wordText(tagline || intro.slice(0, 400));
  // `intro` đã chứa dòng tóm tắt `> …`; không cộng lại lần nữa.
  const describingText = wordText([intro, section(markdown, 'Imagery')].join('\n'));
  const industries = hits(describingText, INDUSTRIES, 2);
  // Thẻ thị giác: theme khai báo + câu tóm tắt; phần thân nhắc màu tối/sáng ở mọi file.
  const visual = hits(` ${theme} ${taglineText} `, VISUALS);
  return {
    file,
    name,
    tagline,
    theme,
    density,
    visual,
    industries: industries.length ? industries : ['unknown'],
    accents,
    fonts,
    text: describingText,
  };
}

export function loadRefs(dir) {
  let entries;
  try {
    if (!statSync(dir).isDirectory()) return { error: `--refs không phải thư mục: ${dir}`, code: 2 };
    entries = readdirSync(dir);
  } catch {
    return { error: `không tìm thấy thư mục --refs: ${dir}`, code: 2 };
  }
  const refs = [];
  for (const entry of entries.sort()) {
    if (!entry.endsWith('.md') || entry.startsWith('_') || entry.startsWith('.')) continue;
    const file = path.join(dir, entry);
    const stats = statSync(file);
    if (!stats.isFile() || stats.size > MAX_FILE_BYTES) continue;
    refs.push(parseDesignMd(readFileSync(file, 'utf8'), file));
  }
  if (!refs.length) return { error: `không có file DESIGN.md (*.md) trong ${dir}`, code: 1 };
  return { refs };
}

// Cụm tiếng Việt → từ tiếng Anh thường gặp trong DESIGN.md, để xếp hạng trong cùng một ngành.
const SYNONYMS = {
  'ca phe': ['coffee', 'cafe', 'espresso', 'roastery'],
  banh: ['bakery', 'pastry', 'bread', 'cake', 'patisserie'],
  'quan an': ['restaurant', 'dining', 'diner', 'food'],
  'nha hang': ['restaurant', 'dining', 'chef'],
  'tra sua': ['tea', 'boba'],
  'am thuc': ['food', 'cuisine'],
  'thuc don': ['menu', 'restaurant'],
  'lam dep': ['beauty', 'skincare', 'cosmetics'],
  'tham my': ['beauty', 'aesthetic', 'clinic'],
  'nha khoa': ['dental', 'dentist'],
  'phong kham': ['clinic', 'medical'],
  'khach san': ['hotel', 'hospitality'],
  'thoi trang': ['fashion', 'apparel', 'clothing'],
  'cua hang': ['shop', 'store'],
  'noi that': ['furniture', 'interior'],
  'giao duc': ['education', 'learning'],
  'tai chinh': ['finance', 'banking'],
  'the hinh': ['gym', 'fitness'],
};

export function queryTags(query) {
  const text = wordText(query);
  const terms = new Set();
  for (const [phrase, english] of Object.entries(SYNONYMS)) {
    if (text.includes(` ${phrase} `)) english.forEach((term) => terms.add(term));
  }
  for (const list of Object.values(INDUSTRIES)) {
    for (const term of list) if (text.includes(` ${term} `) && !SYNONYMS[term]) terms.add(term);
  }
  return { industries: hits(text, INDUSTRIES), visual: hits(text, VISUALS), terms: [...terms] };
}

export function rankRefs(refs, query, limit = 3) {
  const wanted = queryTags(query);
  const scored = refs.map((ref) => {
    let score = 0;
    for (const tag of wanted.industries) if (ref.industries.includes(tag)) score += 4;
    for (const tag of wanted.visual) if (ref.visual.includes(tag)) score += 2;
    // Mức độ cụ thể: file nhắc "coffee" 3 lần đứng trước file chỉ cùng nhóm F&B.
    for (const term of wanted.terms) score += Math.min(occurrences(ref.text, [term]), 3);
    return { ref, score };
  });
  const matches = scored
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.ref.file.localeCompare(b.ref.file))
    .slice(0, limit)
    .map(({ ref, score }) => {
      const { text, ...publicRef } = ref;
      return { ...publicRef, score };
    });
  const tagged = refs.filter((ref) => !ref.industries.includes('unknown')).length;
  return {
    total: refs.length,
    withIndustry: tagged,
    wanted: { industries: wanted.industries, visual: wanted.visual },
    matches,
  };
}
