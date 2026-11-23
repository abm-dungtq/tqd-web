#!/usr/bin/env node
/**
 * sync-site-data.mjs
 *
 * Rebuilds every root file of a Tier 1 site from owner edits in
 * `data/site-data.js` (`window.SITE_DATA = { ...JSON... };`):
 *   - root `*.html`: data-edit* bindings, list regions, data-edit-template text,
 *     and (index.html only) <title>, meta/OG tags, canonical, JSON-LD
 *   - `robots.txt`, `sitemap.xml`: the site's own origin
 *   - every text file that has a template in `data/templates/<name>`
 * so double-click `file://` preview and Google/Zalo HTML crawlers stay aligned.
 * It also reports contact values typed outside a binding or template.
 *
 * The data file is read with JSON.parse and is never executed.
 * Pure Node.js standard library; zero npm deps.
 *
 * Usage:
 *   node sync-site-data.mjs <site-dir> [--dry-run] [--check] [--help]
 * Exit codes: 0 in sync / help, 1 drift, hard-coded value or data error,
 *             2 usage error or a file that cannot be read or written.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LINT_KEYS = ['phoneDisplay', 'phoneTel', 'zaloUrl', 'address', 'hours', 'siteUrl'];
const LINT_MIN_LENGTH = 6;
const PROBE_ORIGIN = 'https://tqd-probe.invalid';
// Owner-facing guide, not part of the published site surface.
const UNMANAGED_FILES = new Set(['HUONG-DAN-SUA-WEB.md']);
const ROOT_FILE_RE = /\.(?:html|txt|xml|md)$/;
const TEMPLATE_NAME_RE = /^[\w.-]+\.(?:txt|md)$/;

function printHelp() {
  console.log(`Usage: node sync-site-data.mjs <site-dir> [--dry-run] [--check] [--help]

Rebuild every root file of <site-dir> from window.SITE_DATA in
<site-dir>/data/site-data.js: root *.html (data-edit* bindings, lists,
data-edit-template; SEO meta, Open Graph and JSON-LD on index.html),
robots.txt, sitemap.xml, and each text file that has a template in
<site-dir>/data/templates/. Contact values typed outside a binding or
template are reported as hard-coded.

Options:
  --dry-run    Preview changes without modifying files
  --check      Report drift and hard-coded values; never writes
  -h, --help   Show this help message

Exit codes:
  0  In sync (or --help)
  1  Out of sync, hard-coded value, or invalid data/site-data.js
  2  Usage error or missing target files`);
}

export function parseArgs(argv) {
  const opts = { dir: null, dryRun: false, check: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '-h' || a === '--help') opts.help = true;
    else if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--check') opts.check = true;
    else if (a.startsWith('-')) throw new Error(`unknown option: ${a}`);
    else if (!opts.dir) opts.dir = a;
    else throw new Error(`unexpected argument: ${a}`);
  }
  if (!opts.help && !opts.dir) throw new Error('missing <site-dir>');
  return opts;
}

export function escapeHtmlText(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function escapeHtmlAttr(value) {
  return escapeHtmlText(value)
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function unescapeHtmlAttr(value) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function lookupPath(obj, dotPath) {
  const parts = String(dotPath).split('.');
  let cur = obj;
  for (const part of parts) {
    if (cur == null) return undefined;
    cur = cur[part];
  }
  return cur;
}

function dataError(message) {
  const err = new Error(message);
  err.code = 'EDATA';
  return err;
}

const DATA_SHAPE_MESSAGE = 'data/site-data.js phải bắt đầu bằng chú thích /* ... */ (nếu có) rồi tới dòng: window.SITE_DATA = { ... }; Không được có mã nào khác.';

/**
 * Read `window.SITE_DATA = { ...JSON... };` without executing anything.
 * Only whitespace and block comments may precede the assignment; only `;` may follow it.
 */
export function parseSiteData(code) {
  const m = /^\uFEFF?(?:\s|\/\*[\s\S]*?\*\/)*window\.SITE_DATA\s*=\s*/.exec(code);
  if (!m) throw dataError(DATA_SHAPE_MESSAGE);
  const start = m[0].length;
  if (code[start] !== '{') throw dataError(DATA_SHAPE_MESSAGE);
  const end = code.lastIndexOf('}');
  if (!/^\s*;?\s*$/.test(code.slice(end + 1))) {
    throw dataError('data/site-data.js chỉ được chứa dữ liệu. Phần sau dấu } cuối cùng phải trống (tệp kiểu cũ 2.1 cần chuyển sang định dạng mới, xem SKILL.md của tqd-web).');
  }

  let data;
  try {
    data = JSON.parse(code.slice(start, end + 1));
  } catch (err) {
    throw dataError(`data/site-data.js có lỗi gõ. Kiểm tra dấu ngoặc kép "..." và dấu phẩy ở dòng vừa sửa. (${err.message})`);
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw dataError(DATA_SHAPE_MESSAGE);

  if (typeof data.siteUrl === 'string') {
    const invalid = 'siteUrl phải có dạng https://ten-mien (không kèm đường dẫn).';
    let u;
    try {
      u = new URL(data.siteUrl.trim());
    } catch {
      throw dataError(invalid);
    }
    if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password || u.pathname !== '/' || u.search || u.hash) {
      throw dataError(invalid);
    }
    data.siteUrl = u.origin;
  }
  return data;
}

function replaceMetaContent(html, attrName, attrValue, newContent) {
  if (typeof newContent !== 'string' || !newContent.trim()) return html;
  const escaped = escapeHtmlAttr(newContent);
  const re = new RegExp(
    `(<meta\\b[^>]*\\b${attrName}\\s*=\\s*["']${escapeRegExp(attrValue)}["'][^>]*\\bcontent\\s*=\\s*)(["'])([^>]*?)\\2([^>]*>)`,
    'i'
  );
  if (re.test(html)) {
    return html.replace(re, (_, prefix, quote, _old, suffix) => `${prefix}${quote}${escaped}${quote}${suffix}`);
  }
  const revRe = new RegExp(
    `(<meta\\b[^>]*\\bcontent\\s*=\\s*)(["'])([^>]*?)\\2([^>]*\\b${attrName}\\s*=\\s*["']${escapeRegExp(attrValue)}["'][^>]*>)`,
    'i'
  );
  return html.replace(revRe, (_, prefix, quote, _old, suffix) => `${prefix}${quote}${escaped}${quote}${suffix}`);
}

function replaceCanonicalHref(html, newUrl) {
  if (typeof newUrl !== 'string' || !newUrl.trim()) return html;
  const normalized = newUrl.endsWith('/') ? newUrl : `${newUrl}/`;
  const escaped = escapeHtmlAttr(normalized);
  return html.replace(
    /(<link\b[^>]*\brel\s*=\s*["']canonical["'][^>]*\bhref\s*=\s*)(["'])([^"']*)\2([^>]*>)/i,
    (_, prefix, quote, _old, suffix) => `${prefix}${quote}${escaped}${quote}${suffix}`
  );
}

/** `ogImage` may be relative to the site root; crawlers need the absolute URL. */
function absoluteOgImage(data) {
  const image = typeof data.ogImage === 'string' ? data.ogImage.trim() : '';
  if (!image || /^https?:\/\//i.test(image)) return image;
  const origin = typeof data.siteUrl === 'string' ? data.siteUrl.trim().replace(/\/$/, '') : '';
  return origin ? `${origin}/${image.replace(/^\/+/, '')}` : image;
}

function updateJsonLdBlock(html, data) {
  return html.replace(
    /(<script\b[^>]*\bid\s*=\s*["']site-jsonld["'][^>]*>)([\s\S]*?)(<\/script>)/i,
    (full, open, rawBody, close) => {
      let parsed;
      try {
        parsed = JSON.parse(rawBody);
      } catch {
        return full;
      }
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw dataError('Khối JSON-LD #site-jsonld phải là một đối tượng JSON, không phải mảng hay giá trị rỗng.');
      }
      if (typeof data.brandName === 'string' && data.brandName.trim()) parsed.name = data.brandName;
      if (typeof data.metaDescription === 'string' && data.metaDescription.trim()) parsed.description = data.metaDescription;
      if (typeof data.siteUrl === 'string' && data.siteUrl.trim()) parsed.url = data.siteUrl.replace(/\/$/, '');
      const image = absoluteOgImage(data);
      if (image) parsed.image = image;
      if (typeof data.phoneTel === 'string' && data.phoneTel.trim()) {
        parsed.telephone = data.phoneTel.replace(/\s+/g, '');
      }
      if (parsed.address && typeof parsed.address === 'object' && typeof data.address === 'string' && data.address.trim()) {
        parsed.address.streetAddress = data.address;
      }
      // "<" is escaped so a value containing "</script>" cannot close the block early.
      const formatted = JSON.stringify(parsed, null, 2)
        .replace(/</g, '\\u003c')
        .split('\n')
        .map((line) => `  ${line}`)
        .join('\n');
      return `${open}\n${formatted}\n  ${close}`;
    }
  );
}

/**
 * Replace `{{key}}` placeholders in one pass (inserted text is never re-scanned).
 * Inside a list item, a plain name resolves against the item first, then the root data.
 */
function renderInline(template, data, item, label) {
  return template.replace(/\{\{\s*([\w.@]+)\s*\}\}/g, (_, name) => {
    let value;
    if (name === '@number') value = item ? item.__number : undefined;
    else if (item && !name.includes('.') && Object.hasOwn(item, name)) value = item[name];
    else value = lookupPath(data, name);
    if (typeof value !== 'string' && typeof value !== 'number') {
      throw dataError(`Khóa "{{${name}}}" dùng trong ${label} không có trong data/site-data.js.`);
    }
    return String(value);
  });
}

/**
 * Re-render every `<!-- list:KEY -->` … `<!-- /list:KEY -->` region from the array at KEY.
 * The first `data-edit-item` element is the template for all entries.
 */
const TAG_HEAD_RE = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)/y;

/** One tag or comment starting at `index`, with quote-aware end; `null` for anything else. */
function readTagAt(html, index) {
  if (html.startsWith('<!--', index)) {
    const end = html.indexOf('-->', index + 4);
    return end === -1 ? null : { start: index, end: end + 3, comment: true };
  }
  TAG_HEAD_RE.lastIndex = index;
  const head = TAG_HEAD_RE.exec(html);
  if (!head) return null;
  let i = TAG_HEAD_RE.lastIndex;
  let quote = null;
  for (; i < html.length; i += 1) {
    const ch = html[i];
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === '>') {
      break;
    }
  }
  if (i >= html.length) return null;
  const inner = html.slice(TAG_HEAD_RE.lastIndex, i);
  return {
    start: index,
    end: i + 1,
    name: head[2],
    closing: head[1] === '/',
    selfClosing: /\/\s*$/.test(inner),
    attrs: inner,
  };
}

function findElementEnd(html, startIndex, tagName) {
  let depth = 0;
  let i = startIndex;
  while (i < html.length) {
    const tag = readTagAt(html, i);
    if (!tag) {
      i += 1;
      continue;
    }
    if (!tag.comment && tag.name.toLowerCase() === tagName.toLowerCase()) {
      if (tag.closing) {
        depth -= 1;
        if (depth === 0) return tag.end;
      } else if (!tag.selfClosing) {
        depth += 1;
      } else if (depth === 0) {
        return tag.end;
      }
    }
    i = tag.end;
  }
  return -1;
}

function findItemTag(html, from) {
  let i = from;
  while (i < html.length) {
    const tag = readTagAt(html, i);
    if (!tag) {
      i += 1;
      continue;
    }
    if (!tag.comment && !tag.closing && /\bdata-edit-item\b/i.test(tag.attrs)) return tag;
    i = tag.end;
  }
  return null;
}

/** Every `data-edit-field` element in the item template, as a leaf with a text body. */
function findFieldElements(template) {
  const fields = [];
  let i = 0;
  while (i < template.length) {
    const tag = readTagAt(template, i);
    if (!tag) {
      i += 1;
      continue;
    }
    if (tag.comment) {
      i = tag.end;
      continue;
    }
    const attr = !tag.closing && /\bdata-edit-field\s*=\s*(["'])([^"']+)\1/i.exec(tag.attrs);
    if (!attr) {
      i = tag.end;
      continue;
    }
    let close = null;
    let j = tag.end;
    while (j < template.length) {
      const next = readTagAt(template, j);
      if (!next) {
        j += 1;
        continue;
      }
      if (next.comment) {
        j = next.end;
        continue;
      }
      if (next.closing) {
        if (next.name.toLowerCase() !== tag.name.toLowerCase()) {
          throw dataError(`Thẻ <${tag.name} data-edit-field="${attr[2]}"> mở trước khi đóng <${next.name}>.`);
        }
        close = next;
        break;
      }
      throw dataError(`Thẻ <${tag.name} data-edit-field="${attr[2]}"> có thẻ con; mỗi trường phải là một thẻ chứa chữ thuần.`);
    }
    if (!close) throw dataError(`Thẻ <${tag.name} data-edit-field="${attr[2]}"> thiếu thẻ đóng </${tag.name}>.`);
    fields.push({ contentStart: tag.end, contentEnd: close.start, field: attr[2] });
    i = close.end;
  }
  return fields;
}

function assertListMarkers(html) {
  const opened = [];
  for (const match of html.matchAll(/<!--\s*(\/?)list:([\w.]+)\s*-->/g)) {
    if (!match[1]) {
      opened.push(match[2]);
    } else if (opened.pop() !== match[2]) {
      throw dataError(`Chú thích <!-- /list:${match[2]} --> không khớp với danh sách đang mở.`);
    }
  }
  if (opened.length) {
    throw dataError(`Danh sách "${opened[0]}" thiếu chú thích đóng <!-- /list:${opened[0]} -->.`);
  }
  for (const match of html.matchAll(/\bdata-edit-list\s*=\s*(["'])([\w.]+)\1/g)) {
    if (!new RegExp(`<!--\\s*list:${escapeRegExp(match[2])}\\s*-->`).test(html)) {
      throw dataError(`Thẻ có data-edit-list="${match[2]}" nhưng thiếu chú thích <!-- list:${match[2]} -->.`);
    }
  }
}

function renderLists(html, data) {
  assertListMarkers(html);
  return html.replace(
    /(<!--\s*list:([\w.]+)\s*-->)([\s\S]*?)(<!--\s*\/list:\2\s*-->)/g,
    (full, open, key, body, close) => {
      const entries = lookupPath(data, key);
      if (!Array.isArray(entries)) return full;
      if (entries.length === 0) throw dataError(`Danh sách "${key}" phải còn ít nhất 1 mục.`);

      const itemTag = findItemTag(body, 0);
      if (!itemTag) {
        throw dataError(`Danh sách "${key}" thiếu mục mẫu: mục đầu tiên cần thuộc tính data-edit-item.`);
      }
      const itemEnd = findElementEnd(body, itemTag.start, itemTag.name);
      if (itemEnd === -1) {
        throw dataError(`Mục đầu của danh sách "${key}" thiếu thẻ đóng </${itemTag.name}>.`);
      }

      const lineStart = body.lastIndexOf('\n', itemTag.start - 1) + 1;
      const before = body.slice(lineStart, itemTag.start);
      const indent = /^[ \t]*$/.test(before) ? before : '';
      const itemTemplate = body.slice(itemTag.start, itemEnd);
      const lead = body.slice(0, itemTag.start - indent.length);
      const tail = /\s*$/.exec(body)[0];

      const fields = findFieldElements(itemTemplate);
      if (fields.length === 0) {
        throw dataError(`Mục mẫu của danh sách "${key}" thiếu data-edit-field, không có dòng nào để điền.`);
      }

      const items = entries.map((entry, i) => {
        let item = itemTemplate;
        for (const field of [...fields].reverse()) {
          const value = entry == null ? undefined : entry[field.field];
          if (typeof value !== 'string') {
            throw dataError(`Mục thứ ${i + 1} của "${key}" thiếu dòng "${field.field}". Mỗi mục cần đủ các dòng như mục đầu tiên.`);
          }
          item = item.slice(0, field.contentStart) + escapeHtmlText(value) + item.slice(field.contentEnd);
        }
        return item;
      });
      return `${open}${lead}${indent}${items.join(`\n${indent}`)}${tail}${close}`;
    }
  );
}

export function syncHtmlWithSiteData(html, data, { head = true } = {}) {
  let out = renderLists(html, data);

  if (head) {
    if (typeof data.metaTitle === 'string' && data.metaTitle.trim()) {
      out = out.replace(/<title>[\s\S]*?<\/title>/i, () => `<title>${escapeHtmlText(data.metaTitle)}</title>`);
      out = replaceMetaContent(out, 'property', 'og:title', data.metaTitle);
    }
    if (typeof data.metaDescription === 'string' && data.metaDescription.trim()) {
      out = replaceMetaContent(out, 'name', 'description', data.metaDescription);
      out = replaceMetaContent(out, 'property', 'og:description', data.metaDescription);
    }
    if (typeof data.siteUrl === 'string' && data.siteUrl.trim()) {
      const canon = data.siteUrl.endsWith('/') ? data.siteUrl : `${data.siteUrl}/`;
      out = replaceCanonicalHref(out, canon);
      out = replaceMetaContent(out, 'property', 'og:url', canon);
    }
    out = replaceMetaContent(out, 'property', 'og:image', absoluteOgImage(data));
  }

  // Update href on data-edit-tel and data-edit-href tags
  out = out.replace(
    /<([a-zA-Z0-9-]+)([^>]*\bdata-edit-(tel|href)\s*=\s*(["'])([^"']+)\4[^>]*)>/gi,
    (tagStr, tagName, attrs, kind, _q, dotPath) => {
      const val = lookupPath(data, dotPath);
      if (typeof val !== 'string' || !val.trim()) return tagStr;
      const targetHref = kind.toLowerCase() === 'tel' ? `tel:${val.replace(/\s+/g, '')}` : val.trim();
      const escapedHref = escapeHtmlAttr(targetHref);
      if (/\bhref\s*=/i.test(attrs)) {
        const updatedAttrs = attrs.replace(
          /(\bhref\s*=\s*)(["'])([^"']*)\2/i,
          (_, p, q) => `${p}${q}${escapedHref}${q}`
        );
        return `<${tagName}${updatedAttrs}>`;
      }
      return `<${tagName}${attrs} href="${escapedHref}">`;
    }
  );

  // Update inner text of leaf elements with data-edit="..."
  out = out.replace(
    /<([a-zA-Z0-9-]+)([^>]*\bdata-edit\s*=\s*(["'])([^"']+)\3[^>]*)>([^<]*)<\/\1>/gi,
    (full, tagName, attrs, _q, dotPath) => {
      const val = lookupPath(data, dotPath);
      if (typeof val !== 'string') return full;
      return `<${tagName}${attrs}>${escapeHtmlText(val)}</${tagName}>`;
    }
  );

  // Update inner text of leaf elements with data-edit-template="fixed text {{key}}"
  out = out.replace(
    /<([a-zA-Z0-9-]+)([^>]*\bdata-edit-template\s*=\s*(["'])([^>]*?)\3[^>]*)>([^<]*)<\/\1>/gi,
    (_, tagName, attrs, _q, template) => {
      const text = renderInline(unescapeHtmlAttr(template), data, null, 'data-edit-template');
      return `<${tagName}${attrs}>${escapeHtmlText(text)}</${tagName}>`;
    }
  );

  if (head) out = updateJsonLdBlock(out, data);
  return out;
}

/**
 * Each file declares its own current origin (canonical link, first sitemap <loc>,
 * first robots Sitemap line). Every occurrence of that origin moves to `newOrigin`.
 */
function rewriteOwnOrigin(text, kind, newOrigin) {
  if (typeof newOrigin !== 'string' || !newOrigin) return text;
  let found = null;
  if (kind === 'html') {
    const link = /<link\b[^>]*\brel\s*=\s*["']canonical["'][^>]*>/i.exec(text);
    if (link) found = /\bhref\s*=\s*["'](https?:\/\/[^\/"'\s]+)/i.exec(link[0]);
  } else if (kind === 'sitemap') {
    found = /<loc>\s*(https?:\/\/[^\/\s<]+)/i.exec(text);
  } else if (kind === 'robots') {
    found = /^Sitemap:\s*(https?:\/\/[^\/\s]+)/mi.exec(text);
  }
  if (!found || found[1] === newOrigin) return text;
  // The lookahead keeps a longer host name or a host with a port intact.
  const ownOrigin = new RegExp(`${escapeRegExp(found[1])}(?![A-Za-z0-9-]|\\.[A-Za-z0-9]|:\\d)`, 'g');
  return text.replace(ownOrigin, () => newOrigin);
}

/**
 * Render a text template: `{{key}}` plus `{{#each key}}` … `{{/each}}` blocks
 * (block tags on their own lines, no nesting).
 */
function renderTextTemplate(template, data, label) {
  const blockRe = /^[ \t]*\{\{#each ([\w.]+)\}\}[ \t]*\r?\n([\s\S]*?)^[ \t]*\{\{\/each\}\}[ \t]*\r?\n?/gm;
  let out = '';
  let cursor = 0;
  for (const block of template.matchAll(blockRe)) {
    out += renderInline(template.slice(cursor, block.index), data, null, label);
    const entries = lookupPath(data, block[1]);
    if (!Array.isArray(entries)) {
      throw dataError(`Khóa "{{${block[1]}}}" dùng trong ${label} không có trong data/site-data.js.`);
    }
    entries.forEach((entry, i) => {
      out += renderInline(block[2], data, { ...entry, __number: i + 1 }, label);
    });
    cursor = block.index + block[0].length;
  }
  return out + renderInline(template.slice(cursor), data, null, label);
}

/** Pure: the content `name` should have for `data`. */
function renderFile(name, text, data, templates) {
  if (Object.hasOwn(templates, name)) {
    return renderTextTemplate(templates[name], data, `data/templates/${name}`);
  }
  if (name.endsWith('.html')) {
    return syncHtmlWithSiteData(rewriteOwnOrigin(text, 'html', data.siteUrl), data, { head: name === 'index.html' });
  }
  if (name === 'sitemap.xml') return rewriteOwnOrigin(text, 'sitemap', data.siteUrl);
  if (name === 'robots.txt') return rewriteOwnOrigin(text, 'robots', data.siteUrl);
  return text;
}

function readTemplates(siteDir) {
  const dir = path.join(siteDir, 'data', 'templates');
  const templates = {};
  if (!fs.existsSync(dir)) return templates;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isFile() && TEMPLATE_NAME_RE.test(entry.name)) {
      templates[entry.name] = fs.readFileSync(path.join(dir, entry.name), 'utf8');
    }
  }
  return templates;
}

/** Root files the sync owns: root *.html/.txt/.xml/.md plus every template target. */
function listTargets(siteDir, templates) {
  const names = new Set(Object.keys(templates));
  for (const entry of fs.readdirSync(siteDir, { withFileTypes: true })) {
    if (entry.isFile() && ROOT_FILE_RE.test(entry.name)) names.add(entry.name);
  }
  return [...names].sort();
}

function readIfExists(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
}

function mapStrings(value, fn) {
  if (typeof value === 'string') return fn(value);
  if (Array.isArray(value)) return value.map((entry) => mapStrings(entry, fn));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, mapStrings(entry, fn)]));
  }
  return value;
}

/**
 * Copy of `data` whose contact values are swapped for marker strings. Rendering
 * with it leaves a real value only where that value is typed outside a binding.
 */
function buildProbeData(data) {
  const entries = LINT_KEYS
    .filter((key) => typeof data[key] === 'string' && data[key].length >= LINT_MIN_LENGTH)
    .map((key) => ({ key, value: data[key], mark: key === 'siteUrl' ? PROBE_ORIGIN : `@@tqd-${key}@@` }))
    .sort((a, b) => b.value.length - a.value.length);
  const probe = mapStrings(data, (text) => entries.reduce((acc, { value, mark }) => acc.split(value).join(mark), text));
  return { probe, entries };
}

function findHardcodedValues(siteDir, data, templates) {
  const { probe, entries } = buildProbeData(data);
  const findings = [];
  for (const name of listTargets(siteDir, templates)) {
    if (UNMANAGED_FILES.has(name)) continue;
    const lines = renderFile(name, readIfExists(path.join(siteDir, name)), probe, templates).split('\n');
    for (const { key, value } of entries) {
      const forms = name.endsWith('.html')
        ? [...new Set([value, escapeHtmlText(value), escapeHtmlAttr(value)])]
        : [value];
      lines.forEach((line, i) => {
        if (forms.some((form) => line.includes(form))) findings.push({ file: name, line: i + 1, key, value });
      });
    }
  }
  return findings;
}

function writeFileAtomic(filePath, content) {
  const suffix = `${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
  const tmpPath = path.join(path.dirname(filePath), `.${path.basename(filePath)}.${suffix}.tqd-tmp`);
  const fd = fs.openSync(tmpPath, 'wx');
  try {
    fs.writeFileSync(fd, content, 'utf8');
    fs.closeSync(fd);
  } catch (err) {
    try { fs.closeSync(fd); } catch { /* already closed */ }
    try { fs.unlinkSync(tmpPath); } catch { /* nothing to clean */ }
    throw err;
  }
  try {
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    try { fs.unlinkSync(tmpPath); } catch { /* nothing to clean */ }
    throw err;
  }
}

export function syncSiteDirectory(siteDir, { dryRun = false } = {}) {
  const resolvedDir = path.resolve(siteDir);
  const dataPath = path.join(resolvedDir, 'data', 'site-data.js');

  if (!fs.existsSync(dataPath)) {
    const err = new Error(`missing data/site-data.js in ${resolvedDir}`);
    err.code = 'ENOENT';
    throw err;
  }
  if (!fs.existsSync(path.join(resolvedDir, 'index.html'))) {
    const err = new Error(`missing index.html in ${resolvedDir}`);
    err.code = 'ENOENT';
    throw err;
  }

  const data = parseSiteData(fs.readFileSync(dataPath, 'utf8'));
  const templates = readTemplates(resolvedDir);

  // Render everything before writing anything, so a data error leaves the site untouched.
  const pending = [];
  for (const name of listTargets(resolvedDir, templates)) {
    const filePath = path.join(resolvedDir, name);
    const current = readIfExists(filePath);
    const next = renderFile(name, current, data, templates);
    if (next !== current || !fs.existsSync(filePath)) pending.push({ name, filePath, next });
  }
  if (!dryRun) {
    for (const { filePath, next } of pending) writeFileAtomic(filePath, next);
  }

  // Rendering with probe data does not depend on what was just written, so this also runs in dry-run.
  const hardcoded = findHardcodedValues(resolvedDir, data, templates);

  return { brandName: data.brandName || '', updatedFiles: pending.map((p) => p.name), dryRun, hardcoded };
}

function printHardcoded(hardcoded) {
  console.error(`Hard-coded values (${hardcoded.length}): các chỗ dưới đây gõ cứng một giá trị của data/site-data.js nên sẽ không tự cập nhật.`);
  for (const { file, line, key, value } of hardcoded) {
    console.error(`  ${file}:${line}  ${key} = "${value}"`);
  }
  console.error('Gắn data-edit / data-edit-template cho HTML, hoặc tạo khuôn trong data/templates/ cho tệp văn bản.');
}

function invokedDirectly() {
  try {
    return fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (process.argv[1] && invokedDirectly()) {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(2);
  }
  if (opts.help) {
    printHelp();
    process.exit(0);
  }
  try {
    const result = syncSiteDirectory(opts.dir, { dryRun: opts.dryRun || opts.check });
    if (opts.check) {
      if (result.updatedFiles.length === 0 && result.hardcoded.length === 0) {
        console.log(`In sync: ${opts.dir}`);
      } else {
        for (const name of result.updatedFiles) console.log(`Out of sync: ${name}`);
        if (result.hardcoded.length) printHardcoded(result.hardcoded);
        process.exit(1);
      }
    } else {
      const mode = opts.dryRun ? '[dry-run] ' : '';
      console.log(`${mode}Synced "${result.brandName}" (${result.updatedFiles.length ? result.updatedFiles.join(', ') : 'no changes'})`);
      if (result.hardcoded.length) {
        printHardcoded(result.hardcoded);
        process.exit(1);
      }
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(err.code === 'EDATA' ? 1 : 2);
  }
}
