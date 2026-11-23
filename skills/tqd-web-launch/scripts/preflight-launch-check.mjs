#!/usr/bin/env node
/**
 * Pre-launch safety and readiness check for static or built website publish folders.
 * Uses only the Node.js standard library (Node.js >= 20).
 *
 * Exit codes:
 *   0 - Ready to deploy (zero blockers; warnings may still be present)
 *   1 - One or more launch blockers detected
 *   2 - Usage or target directory error
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const USAGE = `Usage: node preflight-launch-check.mjs [target-dir] [options]

Inspect a website publish folder (such as dist, out, or static root) before upload.

Options:
  --json                Print structured JSON report to stdout
  --allow-placeholders  Downgrade TODO/FIXME/lorem ipsum/[Cần bổ sung/starter demo content/reserved demo domains to warnings
  -h, --help            Show this help message and exit

Exit codes:
  0  Ready to deploy (zero blockers)
  1  Blockers found (missing index.html, exposed secrets/.git, or leftover placeholders)
  2  Invalid arguments or unreadable target directory
`;

const SENSITIVE_DIR_NAMES = new Set(['.git', '.svn', '.hg']);
const TEMPLATE_ENV_NAMES = new Set(['.env.example', '.env.sample', '.env.template']);
const SENSITIVE_EXTENSIONS = new Set(['.pem', '.key', '.p12', '.pfx', '.jks', '.keystore', '.kdbx']);
const SENSITIVE_FILENAMES = new Set([
  'id_rsa',
  'id_ed25519',
  'id_ecdsa',
  'id_dsa',
  '.npmrc',
  '.netrc',
  '.htpasswd',
  'credentials.json',
  'service-account.json',
  'ga_service_account.json',
  'secrets.json',
  'secrets.yaml',
  'secrets.yml',
]);

const PLACEHOLDER_RULES = [
  { label: 'reserved demo domain', pattern: /\b[a-z0-9-]+\.(?:example|test|invalid)(?![a-z0-9-]|\.[a-z0-9])/i },
  { label: 'starter demo content', pattern: /Tiệm Bánh An Lành|42 Nguyễn Văn Linh|tiembanh-anlanh|0900[ .]?000[ .]?000/u },
  { label: 'TODO', pattern: /\bTODO\b/ },
  { label: 'FIXME', pattern: /\bFIXME\b/ },
  { label: 'lorem ipsum', pattern: /\blorem\s+ipsum\b/i },
  { label: '[Cần bổ sung', pattern: /\[\s*cần\s+bổ\s+sung\b/iu },
];

const DEMO_RULE_LABELS = new Set(['reserved demo domain', 'starter demo content']);
const DEMO_TEXT_FILES = ['robots.txt', 'sitemap.xml', 'llms.txt', 'llms-full.txt'];

function parseArgs(argv) {
  let json = false;
  let allowPlaceholders = false;
  let help = false;
  const positional = [];

  for (const arg of argv) {
    if (arg === '--json') {
      json = true;
    } else if (arg === '--allow-placeholders') {
      allowPlaceholders = true;
    } else if (arg === '--help' || arg === '-h') {
      help = true;
    } else if (arg.startsWith('-')) {
      return { error: `Unknown option: ${arg}` };
    } else {
      positional.push(arg);
    }
  }

  if (help) {
    return { help: true };
  }
  if (positional.length > 1) {
    return { error: `Expected at most one target directory, got ${positional.length}` };
  }

  return {
    json,
    allowPlaceholders,
    targetInput: positional[0] || '.',
  };
}

function readRegularFile(filePath) {
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) {
      return { exists: false, nonEmpty: false, content: '' };
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return { exists: true, nonEmpty: content.trim().length > 0, content };
  } catch {
    return { exists: false, nonEmpty: false, content: '' };
  }
}

function classifySensitiveEntry(nameLower) {
  if (nameLower === '.env' || nameLower.startsWith('.env.')) {
    if (TEMPLATE_ENV_NAMES.has(nameLower)) {
      return { severity: 'warning', reason: 'Environment template file present in publish folder' };
    }
    return { severity: 'blocker', reason: 'Exposed environment file (.env)' };
  }
  if (SENSITIVE_FILENAMES.has(nameLower) || /^client_secret.*\.json$/i.test(nameLower)) {
    return { severity: 'blocker', reason: `Sensitive credential file (${nameLower})` };
  }
  const ext = path.extname(nameLower);
  if (SENSITIVE_EXTENSIONS.has(ext)) {
    return { severity: 'blocker', reason: `Private key or certificate file (*${ext})` };
  }
  return null;
}

function scanTree(rootDir) {
  const htmlFiles = [];
  const secretFindings = [];
  const treeWarnings = [];

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relPath = path.relative(rootDir, fullPath).split(path.sep).join('/');
      const nameLower = entry.name.toLowerCase();

      if (entry.isSymbolicLink()) {
        continue;
      }

      if (entry.isDirectory()) {
        if (SENSITIVE_DIR_NAMES.has(nameLower)) {
          secretFindings.push({
            severity: 'blocker',
            file: relPath,
            message: `Exposed repository metadata directory (${entry.name}/) in publish folder`,
          });
          continue;
        }
        if (nameLower === 'node_modules') {
          treeWarnings.push({
            check: 'publishHygiene',
            file: relPath,
            message: 'node_modules/ directory found inside publish root; deploy only build output when possible',
          });
          continue;
        }
        walk(fullPath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      if (nameLower === '.git') {
        secretFindings.push({
          severity: 'blocker',
          file: relPath,
          message: 'Exposed .git file in publish folder',
        });
        continue;
      }

      const sensitive = classifySensitiveEntry(nameLower);
      if (sensitive) {
        secretFindings.push({
          severity: sensitive.severity,
          file: relPath,
          message: `${sensitive.reason}: ${relPath}`,
        });
      }

      if (
        nameLower.endsWith('.html') ||
        nameLower.endsWith('.htm') ||
        ((relPath.startsWith('data/') || relPath.startsWith('content/')) &&
          (nameLower.endsWith('.js') || nameLower.endsWith('.json') || nameLower.endsWith('.md')))
      ) {
        htmlFiles.push({ fullPath, relPath });
      }
    }
  }

  walk(rootDir);
  return { htmlFiles, secretFindings, treeWarnings };
}

function scanPlaceholders(files, rules = PLACEHOLDER_RULES) {
  const matches = [];
  for (const { fullPath, relPath } of files) {
    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const lineText = lines[index];
      for (const rule of rules) {
        if (rule.pattern.test(lineText)) {
          matches.push({
            file: relPath,
            line: index + 1,
            marker: rule.label,
            excerpt: lineText.trim().slice(0, 120),
          });
          break;
        }
      }
    }
  }
  return matches;
}

/** Root text files (plus any *.html.md twin): scanned only for demo traces, never for TODO markers. */
function demoTextFiles(targetDir) {
  const names = new Set(DEMO_TEXT_FILES);
  let entries;
  try {
    entries = fs.readdirSync(targetDir, { withFileTypes: true });
  } catch {
    return [];
  }
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.html.md')) names.add(entry.name);
  }
  const files = [];
  for (const name of names) {
    const file = readRegularFile(path.join(targetDir, name));
    if (file.exists && file.nonEmpty) files.push({ fullPath: path.join(targetDir, name), relPath: name });
  }
  return files;
}

function robotsBlocksAllCrawlers(content) {
  const groups = [];
  let current = null;
  let lastWasAgent = false;
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, '').trim();
    if (!line) continue;
    const match = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!match) continue;
    const key = match[1].toLowerCase();
    const val = match[2].trim();
    if (key === 'user-agent') {
      if (!current || !lastWasAgent) {
        current = { agents: [], disallow: [], allow: [] };
        groups.push(current);
      }
      current.agents.push(val.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current) continue;
    if (key === 'disallow' && val) current.disallow.push(val);
    if (key === 'allow' && val) current.allow.push(val);
  }
  const wildcardGroups = groups.filter((g) => g.agents.includes('*'));
  if (!wildcardGroups.length) return false;
  const disallowsRoot = wildcardGroups.some((g) => g.disallow.some((r) => r === '/' || r === '/*'));
  const allowsRoot = wildcardGroups.some((g) => g.allow.some((r) => r === '/' || r === '/*'));
  return disallowsRoot && !allowsRoot;
}

function runChecks(targetDir, { allowPlaceholders }) {
  const blockers = [];
  const warnings = [];
  const checks = {
    indexHtml: 'pass',
    notFoundHtml: 'pass',
    robotsTxt: 'pass',
    sitemapXml: 'pass',
    exposedSecrets: 'pass',
    placeholders: 'pass',
  };

  const indexFile = readRegularFile(path.join(targetDir, 'index.html'));
  if (!indexFile.exists) {
    checks.indexHtml = 'fail';
    blockers.push({ check: 'indexHtml', file: 'index.html', message: 'Missing required index.html in publish root' });
  } else if (!indexFile.nonEmpty) {
    checks.indexHtml = 'fail';
    blockers.push({ check: 'indexHtml', file: 'index.html', message: 'index.html exists but is empty' });
  }

  const notFoundFile = readRegularFile(path.join(targetDir, '404.html'));
  if (!notFoundFile.exists || !notFoundFile.nonEmpty) {
    checks.notFoundHtml = 'warn';
    warnings.push({
      check: 'notFoundHtml',
      file: '404.html',
      message: notFoundFile.exists ? '404.html is empty' : 'Missing 404.html; visitors hitting bad links will see host default error',
    });
  }

  const robotsFile = readRegularFile(path.join(targetDir, 'robots.txt'));
  if (!robotsFile.exists || !robotsFile.nonEmpty) {
    checks.robotsTxt = 'warn';
    warnings.push({
      check: 'robotsTxt',
      file: 'robots.txt',
      message: robotsFile.exists ? 'robots.txt is empty' : 'Missing robots.txt in publish root',
    });
  } else if (robotsBlocksAllCrawlers(robotsFile.content)) {
    checks.robotsTxt = 'warn';
    warnings.push({
      check: 'robotsTxt',
      file: 'robots.txt',
      message: 'robots.txt blocks User-agent: * with "Disallow: /", which prevents search engines from indexing production',
    });
  }

  const sitemapFile = readRegularFile(path.join(targetDir, 'sitemap.xml'));
  if (!sitemapFile.exists || !sitemapFile.nonEmpty) {
    checks.sitemapXml = 'warn';
    warnings.push({
      check: 'sitemapXml',
      file: 'sitemap.xml',
      message: sitemapFile.exists ? 'sitemap.xml is empty' : 'Missing sitemap.xml in publish root',
    });
  }

  const { htmlFiles, secretFindings, treeWarnings } = scanTree(targetDir);
  warnings.push(...treeWarnings);

  for (const finding of secretFindings) {
    if (finding.severity === 'blocker') {
      checks.exposedSecrets = 'fail';
      blockers.push({ check: 'exposedSecrets', file: finding.file, message: finding.message });
    } else {
      warnings.push({ check: 'exposedSecrets', file: finding.file, message: finding.message });
    }
  }

  const demoRules = PLACEHOLDER_RULES.filter((rule) => DEMO_RULE_LABELS.has(rule.label));
  const placeholderMatches = [
    ...scanPlaceholders(htmlFiles),
    ...scanPlaceholders(demoTextFiles(targetDir), demoRules),
  ];
  if (placeholderMatches.length > 0) {
    checks.placeholders = allowPlaceholders ? 'warn' : 'fail';
    const targetList = allowPlaceholders ? warnings : blockers;
    for (const match of placeholderMatches) {
      targetList.push({
        check: 'placeholders',
        file: match.file,
        line: match.line,
        marker: match.marker,
        message: `Leftover "${match.marker}" placeholder in ${match.file}:${match.line}`,
      });
    }
  }

  return {
    ok: blockers.length === 0,
    targetDir,
    summary: {
      htmlFilesScanned: htmlFiles.length,
      blockers: blockers.length,
      warnings: warnings.length,
    },
    checks,
    blockers,
    warnings,
  };
}

function formatText(report) {
  const lines = [
    `Preflight Launch Check: ${report.targetDir}`,
    `HTML files scanned: ${report.summary.htmlFilesScanned}`,
    '',
    `[index.html]       ${report.checks.indexHtml.toUpperCase()}`,
    `[404.html]         ${report.checks.notFoundHtml.toUpperCase()}`,
    `[robots.txt]       ${report.checks.robotsTxt.toUpperCase()}`,
    `[sitemap.xml]      ${report.checks.sitemapXml.toUpperCase()}`,
    `[exposed secrets]  ${report.checks.exposedSecrets.toUpperCase()}`,
    `[placeholders]     ${report.checks.placeholders.toUpperCase()}`,
  ];

  if (report.blockers.length > 0) {
    lines.push('', 'Blockers (resolve before deploying):');
    for (const item of report.blockers) {
      lines.push(`  - [FAIL] ${item.message}`);
    }
  }

  if (report.warnings.length > 0) {
    lines.push('', 'Warnings:');
    for (const item of report.warnings) {
      lines.push(`  - [WARN] ${item.message}`);
    }
  }

  lines.push(
    '',
    report.ok
      ? `READY TO DEPLOY (${report.summary.warnings} warning(s))`
      : `BLOCKED: ${report.summary.blockers} blocker(s), ${report.summary.warnings} warning(s)`,
  );
  return lines.join('\n');
}

function main() {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.help) {
    process.stdout.write(USAGE);
    return 0;
  }
  if (parsed.error) {
    process.stderr.write(`Error: ${parsed.error}\n\n${USAGE}`);
    return 2;
  }

  const resolvedTarget = path.resolve(parsed.targetInput);
  let stat;
  try {
    stat = fs.statSync(resolvedTarget);
  } catch {
    process.stderr.write(`Error: Target directory does not exist: ${resolvedTarget}\n`);
    return 2;
  }
  if (!stat.isDirectory()) {
    process.stderr.write(`Error: Target path is not a directory: ${resolvedTarget}\n`);
    return 2;
  }

  const report = runChecks(resolvedTarget, { allowPlaceholders: parsed.allowPlaceholders });
  if (parsed.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    process.stdout.write(`${formatText(report)}\n`);
  }
  return report.ok ? 0 : 1;
}

process.exitCode = main();
