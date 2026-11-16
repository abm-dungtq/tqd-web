#!/usr/bin/env node
/**
 * sync-site-data.mjs
 *
 * Syncs owner edits in Tier 1 `data/site-data.js` (`window.SITE_DATA`) back into
 * static `index.html` tags, `<title>`, meta/OG tags, JSON-LD, and `llms.txt`
 * so both double-click `file://` preview and Google/Zalo HTML crawlers stay aligned.
 *
 * Pure Node.js standard library (`node:vm` sandbox with 500ms timeout; zero npm deps).
 *
 * Usage:
 *   node sync-site-data.mjs <site-dir> [--dry-run] [--help]
 * Exit codes: 0 success / help, 1 validation/sync error, 2 usage or missing file.
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

function printHelp() {
  console.log(`Usage: node sync-site-data.mjs <site-dir> [--dry-run] [--help]

Sync window.SITE_DATA from <site-dir>/data/site-data.js back into static
<site-dir>/index.html (SEO meta, Open Graph, data-edit* attributes, JSON-LD)
and <site-dir>/llms.txt.

Options:
  --dry-run    Preview changes without modifying files
  -h, --help   Show this help message

Exit codes:
  0  Synced cleanly (or --help)
  1  Validation or sandbox error in site-data.js / HTML
  2  Usage error or missing target files`);
}

export function parseArgs(argv) {
  const opts = { dir: null, dryRun: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '-h' || a === '--help') opts.help = true;
    else if (a === '--dry-run') opts.dryRun = true;
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

export function lookupPath(obj, dotPath) {
  const parts = String(dotPath).split('.');
  let cur = obj;
  for (const part of parts) {
    if (cur == null) return undefined;
    cur = cur[part];
  }
  return cur;
}

export function loadSiteDataSandboxed(code) {
  const sandbox = {
    window: {},
    document: { addEventListener() {} },
  };
  const context = vm.createContext(sandbox);
  vm.runInContext(code, context, { timeout: 500 });
  const data = sandbox.window?.SITE_DATA;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('data/site-data.js must define a window.SITE_DATA object');
  }
  return data;
}

function replaceMetaContent(html, attrName, attrValue, newContent) {
  if (typeof newContent !== 'string' || !newContent.trim()) return html;
  const escaped = escapeHtmlAttr(newContent);
  const re = new RegExp(
    `(<meta\\b[^>]*\\b${attrName}\\s*=\\s*["']${attrValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*\\bcontent\\s*=\\s*)(["'])([^"']*)\\2([^>]*>)`,
    'i'
  );
  if (re.test(html)) {
    return html.replace(re, (_, prefix, quote, _old, suffix) => `${prefix}${quote}${escaped}${quote}${suffix}`);
  }
  const revRe = new RegExp(
    `(<meta\\b[^>]*\\bcontent\\s*=\\s*)(["'])([^"']*)\\2([^>]*\\b${attrName}\\s*=\\s*["']${attrValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>)`,
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
      if (typeof data.ogImage === 'string' && data.ogImage.trim()) parsed.image = data.ogImage;
      if (typeof data.phoneTel === 'string' && data.phoneTel.trim()) {
        parsed.telephone = data.phoneTel.replace(/\s+/g, '');
      }
      if (parsed.address && typeof parsed.address === 'object' && typeof data.address === 'string' && data.address.trim()) {
        parsed.address.streetAddress = data.address;
      }
      const formatted = JSON.stringify(parsed, null, 2)
        .split('\n')
        .map((line) => `  ${line}`)
        .join('\n');
      return `${open}\n${formatted}\n  ${close}`;
    }
  );
}

export function syncHtmlWithSiteData(html, data) {
  let out = html;

  if (typeof data.metaTitle === 'string' && data.metaTitle.trim()) {
    out = out.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtmlText(data.metaTitle)}</title>`);
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
  if (typeof data.ogImage === 'string' && data.ogImage.trim()) {
    out = replaceMetaContent(out, 'property', 'og:image', data.ogImage);
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

  out = updateJsonLdBlock(out, data);
  return out;
}

export function syncLlmsTxt(llmsText, data) {
  let out = llmsText;
  if (typeof data.brandName === 'string' && data.brandName.trim()) {
    out = out.replace(/^#\s+.+$/m, `# ${data.brandName.trim()}`);
  }
  if (typeof data.metaDescription === 'string' && data.metaDescription.trim()) {
    out = out.replace(/^>\s+.+$/m, `> ${data.metaDescription.trim()}`);
  }
  if (typeof data.phoneDisplay === 'string' && typeof data.zaloUrl === 'string') {
    out = out.replace(/^- Liên hệ:.*$/m, `- Liên hệ: ${data.phoneDisplay.trim()} · ${data.zaloUrl.trim()}`);
  }
  if (typeof data.address === 'string' && typeof data.hours === 'string') {
    out = out.replace(/^- Địa chỉ:.*$/m, `- Địa chỉ: ${data.address.trim()} (${data.hours.trim()})`);
  }
  if (typeof data.siteUrl === 'string' && data.siteUrl.trim()) {
    const rootUrl = data.siteUrl.endsWith('/') ? data.siteUrl : `${data.siteUrl}/`;
    out = out.replace(/^(- \[Trang chủ\]\()https?:\/\/[^)]+(\):)/m, `$1${rootUrl}$2`);
  }
  return out;
}

export function syncSiteDirectory(siteDir, { dryRun = false } = {}) {
  const resolvedDir = path.resolve(siteDir);
  const dataPath = path.join(resolvedDir, 'data', 'site-data.js');
  const htmlPath = path.join(resolvedDir, 'index.html');
  const llmsPath = path.join(resolvedDir, 'llms.txt');

  if (!fs.existsSync(dataPath)) {
    const err = new Error(`missing data/site-data.js in ${resolvedDir}`);
    err.code = 'ENOENT';
    throw err;
  }
  if (!fs.existsSync(htmlPath)) {
    const err = new Error(`missing index.html in ${resolvedDir}`);
    err.code = 'ENOENT';
    throw err;
  }

  const data = loadSiteDataSandboxed(fs.readFileSync(dataPath, 'utf8'));
  const oldHtml = fs.readFileSync(htmlPath, 'utf8');
  const newHtml = syncHtmlWithSiteData(oldHtml, data);

  const updatedFiles = [];
  if (newHtml !== oldHtml) {
    updatedFiles.push('index.html');
    if (!dryRun) fs.writeFileSync(htmlPath, newHtml, 'utf8');
  }

  if (fs.existsSync(llmsPath)) {
    const oldLlms = fs.readFileSync(llmsPath, 'utf8');
    const newLlms = syncLlmsTxt(oldLlms, data);
    if (newLlms !== oldLlms) {
      updatedFiles.push('llms.txt');
      if (!dryRun) fs.writeFileSync(llmsPath, newLlms, 'utf8');
    }
  }

  return { brandName: data.brandName || '', updatedFiles, dryRun };
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
    const result = syncSiteDirectory(opts.dir, { dryRun: opts.dryRun });
    const mode = opts.dryRun ? '[dry-run] ' : '';
    console.log(`${mode}Synced "${result.brandName}" (${result.updatedFiles.length ? result.updatedFiles.join(', ') : 'no changes'})`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(err.code === 'ENOENT' ? 2 : 1);
  }
}
