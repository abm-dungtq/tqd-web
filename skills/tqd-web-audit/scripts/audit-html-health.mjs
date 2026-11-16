#!/usr/bin/env node
// Offline HTML health audit for static builds and single HTML files.
// Checks <html lang>, viewport meta, unique <title> and <meta name="description">,
// single <h1> and heading order, <img> alt/src, leftover placeholders, and local
// relative href/src links inside the target directory.
// Standard library only: requires Node >= 20, zero external packages.
//
// Usage: node audit-html-health.mjs <file.html|dir> [--json] [--strict-placeholders]
// Exit codes: 0 clean (no errors), 1 errors found, 2 usage or I/O error.

import { readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SKIP_DIRS = new Set(['node_modules', '.git', '.hg', '.svn']);
const HTML_EXT = /\.(?:html?|HTML?)$/;
const RAW_TEXT_TAGS = new Set(['script', 'style', 'textarea']);
const SKIP_LINK_RELS = new Set(['canonical', 'preconnect', 'dns-prefetch']);

export function parseArgs(argv) {
  const opts = { target: null, json: false, strictPlaceholders: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') opts.json = true;
    else if (a === '--strict-placeholders') opts.strictPlaceholders = true;
    else if (a === '-h' || a === '--help') opts.help = true;
    else if (a.startsWith('-')) throw new Error(`unknown option: ${a}`);
    else if (!opts.target) opts.target = a;
    else throw new Error(`unexpected argument: ${a}`);
  }
  if (!opts.help && !opts.target) throw new Error('missing <file.html|dir>');
  return opts;
}

function buildLineIndex(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) starts.push(i + 1);
  }
  return starts;
}

function lineAt(starts, offset) {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (starts[mid] <= offset) lo = mid + 1;
    else hi = mid - 1;
  }
  return hi + 1;
}

function parseAttributes(src, start, len) {
  const attrs = Object.create(null);
  let i = start;
  let selfClosing = false;
  while (i < len) {
    while (i < len && /\s/.test(src[i])) i++;
    if (i >= len) break;
    if (src[i] === '>') { i++; break; }
    if (src[i] === '/' && src[i + 1] === '>') { selfClosing = true; i += 2; break; }
    if (src[i] === '/') { i++; continue; }

    const nameStart = i;
    while (i < len && !/[\s=/>"']/.test(src[i])) i++;
    const name = src.slice(nameStart, i).toLowerCase();
    if (!name) { i++; continue; }

    while (i < len && /\s/.test(src[i])) i++;
    let value = '';
    if (src[i] === '=') {
      i++;
      while (i < len && /\s/.test(src[i])) i++;
      const q = src[i];
      if (q === '"' || q === "'") {
        i++;
        const valStart = i;
        const closeQuote = src.indexOf(q, valStart);
        if (closeQuote === -1) {
          value = src.slice(valStart);
          i = len;
        } else {
          value = src.slice(valStart, closeQuote);
          i = closeQuote + 1;
        }
      } else {
        const valStart = i;
        while (i < len && !/[\s>]/.test(src[i])) i++;
        value = src.slice(valStart, i);
      }
    }
    if (!(name in attrs)) attrs[name] = value;
  }
  return { attrs, end: i, selfClosing };
}

function findClosingTag(html, from, tag) {
  const re = new RegExp(`</${tag}\\s*>`, 'ig');
  re.lastIndex = from;
  const m = re.exec(html);
  if (!m) return { contentEnd: html.length, afterEnd: html.length };
  return { contentEnd: m.index, afterEnd: re.lastIndex };
}

// State-machine HTML tokenizer: handles '>' inside quoted attributes, comments,
// raw-text blocks (<script>, <style>, <textarea>), and tracks <svg>/<template> nesting.
export function tokenizeHtml(html) {
  const lineStarts = buildLineIndex(html);
  const tokens = [];
  const len = html.length;
  let pos = 0;

  while (pos < len) {
    const lt = html.indexOf('<', pos);
    if (lt === -1) {
      const tail = html.slice(pos);
      if (tail) tokens.push({ type: 'text', text: tail, line: lineAt(lineStarts, pos) });
      break;
    }
    if (lt > pos) {
      tokens.push({ type: 'text', text: html.slice(pos, lt), line: lineAt(lineStarts, pos) });
    }
    const line = lineAt(lineStarts, lt);

    if (html.startsWith('<!--', lt)) {
      const end = html.indexOf('-->', lt + 4);
      const commentEnd = end === -1 ? len : end;
      tokens.push({ type: 'comment', text: html.slice(lt + 4, commentEnd), line });
      pos = end === -1 ? len : end + 3;
      continue;
    }

    if (html.startsWith('<![CDATA[', lt)) {
      const end = html.indexOf(']]>', lt + 9);
      pos = end === -1 ? len : end + 3;
      continue;
    }

    if (html[lt + 1] === '!' || html[lt + 1] === '?') {
      const end = html.indexOf('>', lt + 2);
      pos = end === -1 ? len : end + 1;
      continue;
    }

    if (html[lt + 1] === '/') {
      const m = html.slice(lt + 2, lt + 64).match(/^([a-zA-Z][a-zA-Z0-9:-]*)/);
      const end = html.indexOf('>', lt + 2);
      if (m) tokens.push({ type: 'close', tag: m[1].toLowerCase(), line });
      pos = end === -1 ? len : end + 1;
      continue;
    }

    const nameMatch = html.slice(lt + 1, lt + 64).match(/^([a-zA-Z][a-zA-Z0-9:-]*)/);
    if (!nameMatch) {
      tokens.push({ type: 'text', text: '<', line });
      pos = lt + 1;
      continue;
    }

    const tag = nameMatch[1].toLowerCase();
    const { attrs, end, selfClosing } = parseAttributes(html, lt + 1 + tag.length, len);
    tokens.push({ type: 'open', tag, attrs, selfClosing, line });
    pos = end;

    if (!selfClosing && RAW_TEXT_TAGS.has(tag)) {
      const close = findClosingTag(html, pos, tag);
      const raw = html.slice(pos, close.contentEnd);
      if (raw) tokens.push({ type: 'raw', tag, attrs, text: raw, line: lineAt(lineStarts, pos) });
      tokens.push({ type: 'close', tag, line: lineAt(lineStarts, close.contentEnd) });
      pos = close.afterEnd;
    }
  }

  return tokens;
}

function normalizeText(value) {
  return value.replace(/\s+/g, ' ').trim();
}

const DUMMY_PHONE_RE = /^(?:0?9x+|0?90{7,9}|0?123456789|0?912345678|0?901234567|1234567890|0{7,}|9{7,}|.*xxx.*)$/i;

function checkContactLink(rawHref, line, add) {
  if (/^tel:/i.test(rawHref)) {
    const number = rawHref.slice(4).trim();
    if (!number) {
      add('error', 'contact-link', line, 'tel: link has empty phone number');
      return;
    }
    if (/\s/.test(number)) {
      add('error', 'contact-link', line, `tel: link "${rawHref}" contains spaces; strip spaces inside href while keeping readable display text`);
    }
    const digits = number.replace(/[^\da-zA-Z]/g, '');
    if (DUMMY_PHONE_RE.test(digits) || /[<>{}\[\]]/.test(number)) {
      add('error', 'contact-link', line, `tel: link "${rawHref}" looks like an unreplaced placeholder number`);
    }
  } else if (/^https?:\/\/(?:www\.)?zalo\.me\//i.test(rawHref)) {
    const slug = rawHref.replace(/^https?:\/\/(?:www\.)?zalo\.me\//i, '').split(/[?#]/)[0].trim();
    const digits = slug.replace(/[^\da-zA-Z]/g, '');
    if (!slug || DUMMY_PHONE_RE.test(digits) || /[<>{}\[\]]/.test(slug)) {
      add('error', 'contact-link', line, `Zalo link "${rawHref}" looks like an unreplaced placeholder target`);
    }
  }
}

function validateJsonLdText(rawText, line, add) {
  const trimmed = rawText.trim();
  if (!trimmed) {
    add('error', 'json-ld', line, 'JSON-LD <script> block is empty');
    return;
  }
  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch (err) {
    add('error', 'json-ld', line, `invalid JSON-LD syntax: ${err.message}`);
    return;
  }
  const nodes = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.['@graph'])
      ? parsed['@graph']
      : [parsed];
  const hasRootContext = Boolean(parsed && typeof parsed === 'object' && parsed['@context']);
  for (const node of nodes) {
    if (!node || typeof node !== 'object' || !node['@type'] || (!hasRootContext && !node['@context'])) {
      add('error', 'json-ld', line, 'JSON-LD object must include both @context and @type');
      break;
    }
  }
}

function scanPlaceholders(text, line, strictPlaceholders, findings, fileLabel, seen) {
  if (!text) return;
  const nfc = text.normalize('NFC');
  const checks = [
    { re: /\blorem\s+ipsum\b/i, sev: 'error', check: 'placeholder', msg: 'leftover placeholder text: "lorem ipsum"' },
    { re: /\bTODO\b|\btodo\s*:/, sev: 'error', check: 'placeholder', msg: 'leftover placeholder marker: "TODO"' },
    { re: /(?:^|[^a-z0-9-])example\.com\b/i, sev: 'error', check: 'placeholder', msg: 'leftover placeholder domain: "example.com"' },
    {
      re: /\[cần bổ sung\b/iu,
      sev: strictPlaceholders ? 'error' : 'warn',
      check: strictPlaceholders ? 'placeholder' : 'placeholder-pending',
      msg: strictPlaceholders
        ? 'unfinished owner placeholder "[Cần bổ sung..."'
        : 'unfinished owner placeholder "[Cần bổ sung..." (run with --strict-placeholders before launch)',
    },
  ];
  for (const item of checks) {
    if (item.re.test(nfc)) {
      const key = `${item.check}:${line}:${item.msg}`;
      if (!seen.has(key)) {
        seen.add(key);
        findings.push({ severity: item.sev, check: item.check, file: fileLabel, line, message: item.msg });
      }
    }
  }
}

export function analyzeHtml(html, fileLabel = 'index.html', options = {}) {
  const { strictPlaceholders = false } = options;
  const tokens = tokenizeHtml(html);
  const findings = [];
  const add = (severity, check, line, message) => findings.push({ severity, check, file: fileLabel, line, message });

  let svgDepth = 0;
  let templateDepth = 0;
  let inTitle = false;
  let titleBuf = '';
  let titleLine = 1;
  const titles = [];

  let hasHtml = false;
  let htmlLine = 1;
  let htmlLang = null;

  let viewport = null;
  let viewportLine = 1;
  const descriptions = [];
  let hasMetaRefresh = false;

  const headings = [];
  const links = [];
  let visibleChars = 0;
  const seenPlaceholders = new Set();

  for (const tok of tokens) {
    if (tok.type === 'comment') {
      scanPlaceholders(tok.text, tok.line, strictPlaceholders, findings, fileLabel, seenPlaceholders);
      continue;
    }

    if (tok.type === 'raw') {
      if (tok.tag === 'script' && (tok.attrs.type || '').toLowerCase().includes('ld+json')) {
        scanPlaceholders(tok.text, tok.line, strictPlaceholders, findings, fileLabel, seenPlaceholders);
        validateJsonLdText(tok.text, tok.line, add);
      }
      continue;
    }

    if (tok.type === 'text') {
      if (svgDepth === 0 && templateDepth === 0) {
        if (inTitle) titleBuf += tok.text;
        else {
          visibleChars += normalizeText(tok.text).length;
          scanPlaceholders(tok.text, tok.line, strictPlaceholders, findings, fileLabel, seenPlaceholders);
        }
      }
      continue;
    }

    if (tok.type === 'close') {
      if (tok.tag === 'svg' && svgDepth > 0) svgDepth--;
      else if (tok.tag === 'template' && templateDepth > 0) templateDepth--;
      else if (tok.tag === 'title' && inTitle) {
        titles.push({ text: normalizeText(titleBuf), line: titleLine });
        inTitle = false;
        titleBuf = '';
      }
      continue;
    }

    // tok.type === 'open'
    if (tok.tag === 'svg') {
      if (!tok.selfClosing) svgDepth++;
      continue;
    }
    if (tok.tag === 'template') {
      if (!tok.selfClosing) templateDepth++;
      continue;
    }
    if (svgDepth > 0 || templateDepth > 0) continue;

    const { tag, attrs, line, selfClosing } = tok;

    for (const attrKey of ['alt', 'title', 'placeholder', 'content', 'href', 'src', 'aria-label']) {
      if (attrs[attrKey]) {
        scanPlaceholders(attrs[attrKey], line, strictPlaceholders, findings, fileLabel, seenPlaceholders);
      }
    }

    if (tag === 'html' && !hasHtml) {
      hasHtml = true;
      htmlLine = line;
      htmlLang = attrs.lang !== undefined ? attrs.lang.trim() : null;
    } else if (tag === 'title' && !inTitle) {
      if (selfClosing) titles.push({ text: '', line });
      else { inTitle = true; titleBuf = ''; titleLine = line; }
    } else if (tag === 'meta') {
      const name = (attrs.name ?? '').trim().toLowerCase();
      const httpEquiv = (attrs['http-equiv'] ?? '').trim().toLowerCase();
      const content = (attrs.content ?? '').trim();
      if (name === 'viewport' && viewport === null) {
        viewport = content;
        viewportLine = line;
      } else if (name === 'description') {
        descriptions.push({ text: normalizeText(content), line });
      } else if (httpEquiv === 'refresh') {
        hasMetaRefresh = true;
      }
    } else {
      const hm = tag.match(/^h([1-6])$/);
      if (hm) headings.push({ level: Number(hm[1]), line });
    }

    if (tag === 'img') {
      if (attrs.alt === undefined) add('error', 'img-alt', line, '<img> is missing alt attribute');
      if (attrs.src === undefined || attrs.src.trim() === '') add('error', 'img-src', line, '<img> has missing or empty src attribute');
      else links.push({ kind: 'asset', raw: attrs.src.trim(), line });
      if (attrs.srcset) {
        for (const entry of attrs.srcset.split(',')) {
          const url = entry.trim().split(/\s+/)[0];
          if (url) links.push({ kind: 'asset', raw: url, line });
        }
      }
    } else if (tag === 'a' || tag === 'area') {
      if (attrs.href !== undefined) {
        const rawHref = attrs.href.trim();
        links.push({ kind: 'page', raw: rawHref, line });
        checkContactLink(rawHref, line, add);
      }
    } else if (tag === 'link') {
      const rels = (attrs.rel ?? '').toLowerCase().split(/\s+/).filter(Boolean);
      const skip = rels.some((r) => SKIP_LINK_RELS.has(r));
      if (!skip && attrs.href !== undefined) {
        const kind = rels.includes('alternate') ? 'page' : 'asset';
        links.push({ kind, raw: attrs.href.trim(), line });
      }
    } else if (tag === 'source') {
      if (attrs.src) links.push({ kind: 'asset', raw: attrs.src.trim(), line });
      if (attrs.srcset) {
        for (const entry of attrs.srcset.split(',')) {
          const url = entry.trim().split(/\s+/)[0];
          if (url) links.push({ kind: 'asset', raw: url, line });
        }
      }
    } else if (tag === 'script' || tag === 'video' || tag === 'audio' || tag === 'track' || tag === 'iframe' || tag === 'embed') {
      if (attrs.src) links.push({ kind: 'asset', raw: attrs.src.trim(), line });
      if (tag === 'video' && attrs.poster) links.push({ kind: 'asset', raw: attrs.poster.trim(), line });
    }
  }

  if (inTitle) titles.push({ text: normalizeText(titleBuf), line: titleLine });

  const isRedirectStub = hasMetaRefresh && visibleChars < 80;
  let primaryTitle = '';
  let primaryDescription = '';

  if (!isRedirectStub) {
    if (!hasHtml || !htmlLang) {
      add('error', 'html-lang', htmlLine, 'missing or empty <html lang="..."> attribute');
    }
    if (viewport === null || viewport === '') {
      add('error', 'viewport', viewportLine, 'missing or empty <meta name="viewport">');
    } else if (/user-scalable\s*=\s*no|maximum-scale\s*=\s*1(?:\.0+)?(?:\s|,|$)/i.test(viewport)) {
      add('warn', 'viewport-zoom', viewportLine, 'viewport meta restricts user zoom (user-scalable=no or maximum-scale=1)');
    }

    const nonEmptyTitles = titles.filter((t) => t.text.length > 0);
    if (nonEmptyTitles.length === 0) {
      add('error', 'title', titles[0]?.line || 1, 'missing or empty <title>');
    } else {
      primaryTitle = nonEmptyTitles[0].text;
      if (titles.length > 1) add('warn', 'title', titles[1].line, 'multiple <title> elements found');
    }

    const nonEmptyDescriptions = descriptions.filter((d) => d.text.length > 0);
    if (nonEmptyDescriptions.length === 0) {
      add('error', 'meta-description', descriptions[0]?.line || 1, 'missing or empty <meta name="description">');
    } else {
      primaryDescription = nonEmptyDescriptions[0].text;
      if (descriptions.length > 1) add('warn', 'meta-description', descriptions[1].line, 'multiple <meta name="description"> elements found');
    }

    const h1s = headings.filter((h) => h.level === 1);
    if (h1s.length === 0) add('error', 'h1', 1, 'missing <h1> heading');
    else if (h1s.length > 1) add('error', 'h1', h1s[1].line, `multiple <h1> headings found (${h1s.length}); expected one`);

    let prevLevel = 0;
    for (const h of headings) {
      if (prevLevel === 0 && h.level > 1) {
        add('error', 'heading-order', h.line, `heading <h${h.level}> appears before <h1>`);
      } else if (prevLevel > 0 && h.level > prevLevel + 1) {
        add('error', 'heading-order', h.line, `heading <h${h.level}> skips a level after <h${prevLevel}>`);
      }
      prevLevel = h.level;
    }
  }

  return {
    file: fileLabel,
    isRedirectStub,
    title: primaryTitle,
    description: primaryDescription,
    links,
    findings,
  };
}

function isFile(p) {
  try { return statSync(p).isFile(); } catch { return false; }
}

function isDir(p) {
  try { return statSync(p).isDirectory(); } catch { return false; }
}

function resolveLocalLink(rawUrl, htmlFilePath, rootDir, kind) {
  if (!rawUrl || rawUrl.startsWith('#')) return { skip: true };
  if (/^(?:[a-zA-Z][a-zA-Z0-9+.-]*:|\/\/)/.test(rawUrl)) return { skip: true };
  if (/^\s*(?:\{\{|\$\{)/.test(rawUrl)) return { skip: true };

  const clean = rawUrl.split('#')[0].split('?')[0];
  if (!clean) return { skip: true };

  let decoded;
  try { decoded = decodeURIComponent(clean); } catch { decoded = clean; }

  const candidate = decoded.startsWith('/')
    ? resolve(rootDir, decoded.replace(/^\/+/, ''))
    : resolve(dirname(htmlFilePath), decoded);

  const rel = relative(rootDir, candidate);
  if (rel === '..' || rel.startsWith('..' + sep) || isAbsolute(rel)) {
    return { ok: false, reason: `local path "${rawUrl}" resolves outside target root` };
  }

  if (decoded === '/' || decoded.endsWith('/')) {
    if (kind === 'page' && (isFile(join(candidate, 'index.html')) || isFile(join(candidate, 'index.htm')))) {
      return { ok: true };
    }
    return { ok: false, reason: `broken local ${kind === 'page' ? 'link' : 'asset'}: "${rawUrl}"` };
  }

  if (isFile(candidate)) return { ok: true };
  if (kind === 'page') {
    if (isDir(candidate) && (isFile(join(candidate, 'index.html')) || isFile(join(candidate, 'index.htm')))) {
      return { ok: true };
    }
    if (isFile(candidate + '.html') || isFile(candidate + '.htm')) {
      return { ok: true };
    }
  }
  return { ok: false, reason: `broken local ${kind === 'page' ? 'link' : 'asset'}: "${rawUrl}"` };
}

function collectHtmlFiles(dir, current = dir, out = []) {
  const entries = readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
    const full = join(current, entry.name);
    if (entry.isDirectory()) collectHtmlFiles(dir, full, out);
    else if (entry.isFile() && HTML_EXT.test(entry.name)) out.push(full);
  }
  return out;
}

export function auditTarget({ target, strictPlaceholders = false }) {
  const resolved = resolve(target);
  let st;
  try { st = statSync(resolved); } catch (err) {
    throw new Error(`cannot access "${target}": ${err.message}`);
  }

  let mode;
  let rootDir;
  let files;
  if (st.isFile()) {
    if (!HTML_EXT.test(resolved)) throw new Error(`target file must be .html or .htm: ${target}`);
    mode = 'file';
    rootDir = dirname(resolved);
    files = [resolved];
  } else if (st.isDirectory()) {
    mode = 'directory';
    rootDir = resolved;
    files = collectHtmlFiles(resolved);
    if (files.length === 0) throw new Error(`no HTML files found in ${target}`);
  } else {
    throw new Error(`target is neither a file nor a directory: ${target}`);
  }

  const findings = [];
  const seenTitles = new Map();
  const seenDescriptions = new Map();

  for (const filePath of files) {
    const label = relative(rootDir, filePath).split(sep).join('/');
    const html = readFileSync(filePath, 'utf8');
    const page = analyzeHtml(html, label, { strictPlaceholders });
    findings.push(...page.findings);

    for (const link of page.links) {
      const check = resolveLocalLink(link.raw, filePath, rootDir, link.kind);
      if (!check.skip && !check.ok) {
        findings.push({ severity: 'error', check: 'broken-link', file: label, line: link.line, message: check.reason });
      }
    }

    if (!page.isRedirectStub) {
      if (page.title) {
        const key = page.title.toLowerCase();
        if (seenTitles.has(key)) {
          findings.push({
            severity: 'error',
            check: 'duplicate-title',
            file: label,
            line: 1,
            message: `duplicate <title> "${page.title}" (also used in ${seenTitles.get(key)})`,
          });
        } else seenTitles.set(key, label);
      }
      if (page.description) {
        const key = page.description.toLowerCase();
        if (seenDescriptions.has(key)) {
          findings.push({
            severity: 'error',
            check: 'duplicate-description',
            file: label,
            line: 1,
            message: `duplicate <meta name="description"> (also used in ${seenDescriptions.get(key)})`,
          });
        } else seenDescriptions.set(key, label);
      }
    }
  }

  const summary = {
    errors: findings.filter((f) => f.severity === 'error').length,
    warnings: findings.filter((f) => f.severity === 'warn').length,
    info: findings.filter((f) => f.severity === 'info').length,
  };

  return { target: resolved, mode, filesScanned: files.length, summary, findings };
}

export function formatText(result) {
  const lines = [
    `HTML health audit for ${result.target} (${result.mode}, ${result.filesScanned} file(s)): `
    + `${result.summary.errors} error(s), ${result.summary.warnings} warning(s)`,
  ];
  for (const sev of ['error', 'warn', 'info']) {
    const items = result.findings.filter((f) => f.severity === sev);
    if (!items.length) continue;
    lines.push('', `${sev.toUpperCase()} (${items.length})`);
    for (const f of items) {
      lines.push(`- [${f.check}] ${f.file}:${f.line}: ${f.message}`);
    }
  }
  return lines.join('\n');
}

function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`${err.message}\nUsage: node audit-html-health.mjs <file.html|dir> [--json] [--strict-placeholders]`);
    process.exitCode = 2;
    return;
  }

  if (opts.help) {
    console.log('Usage: node audit-html-health.mjs <file.html|dir> [--json] [--strict-placeholders]');
    process.exitCode = 0;
    return;
  }

  try {
    const result = auditTarget(opts);
    console.log(opts.json ? JSON.stringify(result, null, 2) : formatText(result));
    process.exitCode = result.summary.errors > 0 ? 1 : 0;
  } catch (err) {
    console.error(err.message);
    process.exitCode = 2;
  }
}

function invokedDirectly() {
  try { return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; }
}

if (process.argv[1] && invokedDirectly()) main();
