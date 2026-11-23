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
 *             2 usage error or missing file.
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
    `(<meta\\b[^>]*\\b${attrName}\\s*=\\s*["']${escapeRegExp(attrValue)}["'][^>]*\\bcontent\\s*=\\s*)(["'])([^"']*)\\2([^>]*>)`,
    'i'
  );
  if (re.test(html)) {
    return html.replace(re, (_, prefix, quote, _old, suffix) => `${prefix}${quote}${escaped}${quote}${suffix}`);
  }
  const revRe = new RegExp(
    `(<meta\\b[^>]*\\bcontent\\s*=\\s*)(["'])([^"']*)\\2([^>]*\\b${attrName}\\s*=\\s*["']${escapeRegExp(attrValue)}["'][^>]*>)`,
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
function renderLists(html, data) {
  return html.replace(
    /(<!--\s*list:([\w.]+)\s*-->)([\s\S]*?)(<!--\s*\/list:\2\s*-->)/g,
    (full, open, key, body, close) => {
      const entries = lookupPath(data, key);
      if (!Array.isArray(entries)) return full;
      if (entries.length === 0) throw dataError(`Danh sách "${key}" phải còn ít nhất 1 mục.`);

      const first = /([ \t]*)<([a-zA-Z0-9-]+)\b[^>]*\bdata-edit-item\b[^>]*>/.exec(body);
      if (!first) return full;
      const [, indent, tagName] = first;
      const closeTag = `</${tagName}>`;
      const itemEnd = body.indexOf(closeTag, first.index);
      if (itemEnd === -1) return full;

      const itemTemplate = body.slice(first.index + indent.length, itemEnd + closeTag.length);
      const lead = body.slice(0, first.index);
      const tail = /\s*$/.exec(body)[0];

      const items = entries.map((entry, i) => itemTemplate.replace(
        /<([a-zA-Z0-9-]+)([^>]*\bdata-edit-field\s*=\s*"([^"]+)"[^>]*)>[^<]*<\/\1>/g,
        (_, tag, attrs, field) => {
          const value = entry == null ? undefined : entry[field];
          if (typeof value !== 'string') {
            throw dataError(`Mục thứ ${i + 1} của "${key}" thiếu dòng "${field}". Mỗi mục cần đủ các dòng như mục đầu tiên.`);
          }
          return `<${tag}${attrs}>${escapeHtmlText(value)}</${tag}>`;
        }
      ));
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
    /<([a-zA-Z0-9-]+)([^>]*\bdata-edit-template\s*=\s*"([^"]*)"[^>]*)>([^<]*)<\/\1>/gi,
    (_, tagName, attrs, template) => {
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
  const tmpPath = `${filePath}.tqd-tmp`;
  fs.writeFileSync(tmpPath, content, 'utf8');
  fs.renameSync(tmpPath, filePath);
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
    process.exit(err.code === 'ENOENT' ? 2 : 1);
  }
}
