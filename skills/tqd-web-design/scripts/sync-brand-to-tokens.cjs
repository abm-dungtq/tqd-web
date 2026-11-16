#!/usr/bin/env node
/**
 * sync-brand-to-tokens.cjs
 *
 * Self-contained converter from brand.md to design-tokens.json and tokens.css.
 * Pure Node.js standard library only; no external skill dependencies.
 *
 * Usage:
 *   node sync-brand-to-tokens.cjs [--brand docs/website/brand.md] [--json-out design-tokens.json] [--css-out tokens.css] [--dry-run]
 *   node sync-brand-to-tokens.cjs --help
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_BRAND_CANDIDATES = [
  'docs/website/brand.md',
  'brand.md',
  'docs/brand-guidelines.md',
];

const DEFAULT_DISPLAY_FONT = '"Lora", "Be Vietnam Pro", Georgia, serif';
const DEFAULT_BODY_FONT = '"Be Vietnam Pro", "Plus Jakarta Sans", "Inter", system-ui, sans-serif';
const DEFAULT_MONO_FONT = '"JetBrains Mono", ui-monospace, monospace';

function printHelp() {
  console.log(`Usage: node sync-brand-to-tokens.cjs [options]

Options:
  -b, --brand <file>      Input brand markdown file (default: docs/website/brand.md)
      --json-out <file>   Output JSON token path (default: design-tokens.json)
      --css-out <file>    Output CSS token path (default: tokens.css)
      --vars-only         Emit :root custom properties and reduced-motion block only
      --dry-run           Print parsed colors and preview without writing files
  -h, --help              Show this help message

Examples:
  node sync-brand-to-tokens.cjs --brand docs/website/brand.md --dry-run
  node sync-brand-to-tokens.cjs --brand docs/website/brand.md --json-out docs/website/design-tokens.json --css-out styles/tokens.css`);
}

function resolveDefaultBrandPath(cwd = process.cwd()) {
  for (const rel of DEFAULT_BRAND_CANDIDATES) {
    const candidate = path.resolve(cwd, rel);
    if (fs.existsSync(candidate)) return rel;
  }
  return DEFAULT_BRAND_CANDIDATES[0];
}

function slugifyName(raw, fallback) {
  if (!raw) return fallback;
  const cleaned = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || fallback;
}

function parseHex(hex) {
  const m = /^#?([0-9A-Fa-f]{6})$/.exec((hex || '').trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function formatHex({ r, g, b }) {
  return (
    '#' +
    [r, g, b]
      .map((v) => Math.min(255, Math.max(0, Math.round(v))).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

function mixHex(hexA, hexB, weightB) {
  const a = parseHex(hexA);
  const b = parseHex(hexB);
  if (!a || !b) return hexA;
  const t = Math.min(1, Math.max(0, weightB));
  return formatHex({
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  });
}

function relativeLuminance(hex) {
  const rgb = parseHex(hex);
  if (!rgb) return 0;
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function pickOnColor(bgHex) {
  return relativeLuminance(bgHex) > 0.42 ? '#18181B' : '#FFFFFF';
}

function extractBrandName(content) {
  const tableMatch = content.match(/Brand Name\s*\|\s*([^\n|]+)/i);
  if (tableMatch) return tableMatch[1].trim();

  const headingMatch = content.match(/^#\s+(?:Brand Identity:\s*|Brand:\s*)?([^\n]+)/m);
  if (headingMatch) {
    const title = headingMatch[1].trim();
    if (!title.startsWith('[')) return title;
  }
  return 'Custom Brand';
}

function extractSectionHexes(content, headingPattern) {
  const match = content.match(headingPattern);
  if (!match) return {};
  const block = match[0];
  const result = {};

  for (const line of block.split('\n')) {
    const hexMatch = line.match(/(#[A-Fa-f0-9]{6})\b/);
    if (!hexMatch) continue;
    const hex = hexMatch[1].toUpperCase();
    const lower = line.toLowerCase();
    if (lower.includes('dark') || lower.includes('hover')) {
      result.dark = result.dark || hex;
    } else if (lower.includes('light') || lower.includes('soft')) {
      result.light = result.light || hex;
    } else if (lower.includes('base') || lower.includes('primary') || lower.includes('main')) {
      result.base = result.base || hex;
    } else if (!result.base) {
      result.base = hex;
    }
  }
  return result;
}

function extractNeutralColors(content) {
  const match = content.match(/###\s*Neutral(?:\s+Colors?)?[\s\S]*?(?=###|##|$)/i);
  const neutral = {
    paper: '#FAF8F5',
    paper2: '#F2EDE6',
    line: '#E2DDD5',
    ink: '#1C1917',
    ink2: '#57534E',
  };
  if (!match) return neutral;

  for (const line of match[0].split('\n')) {
    const hexMatch = line.match(/(#[A-Fa-f0-9]{6})\b/);
    if (!hexMatch) continue;
    const hex = hexMatch[1].toUpperCase();
    const lower = line.toLowerCase();
    if (lower.includes('paper-2') || lower.includes('surface') || lower.includes('secondary bg')) {
      neutral.paper2 = hex;
    } else if (lower.includes('paper') || lower.includes('canvas') || lower.includes('background')) {
      neutral.paper = hex;
    } else if (lower.includes('line') || lower.includes('border')) {
      neutral.line = hex;
    } else if (lower.includes('ink-2') || lower.includes('muted') || lower.includes('caption')) {
      neutral.ink2 = hex;
    } else if (lower.includes('ink') || lower.includes('text') || lower.includes('body')) {
      neutral.ink = hex;
    }
  }
  return neutral;
}

function extractTypography(content) {
  const displayMatch = content.match(/Display Font\s*\|\s*([^\n|]+)/i);
  const bodyMatch = content.match(/Body Font\s*\|\s*([^\n|]+)/i);

  const normalizeFont = (raw, fallback) => {
    if (!raw) return fallback;
    const clean = raw.replace(/[`*"]/g, '').split('(')[0].trim();
    if (!clean || clean.startsWith('[')) return fallback;
    return clean.includes(',') ? clean : `"${clean}", "Be Vietnam Pro", system-ui, sans-serif`;
  };

  return {
    display: normalizeFont(displayMatch && displayMatch[1], DEFAULT_DISPLAY_FONT),
    body: normalizeFont(bodyMatch && bodyMatch[1], DEFAULT_BODY_FONT),
    mono: DEFAULT_MONO_FONT,
  };
}

function extractColorsFromMarkdown(content) {
  const colors = {
    primary: { name: 'primary', base: null, dark: null, light: null },
    secondary: { name: 'secondary', base: null, dark: null, light: null },
    accent: { name: 'accent', base: null, dark: null, light: null },
  };

  const quickPatterns = [
    ['primary', /Primary(?:\s+Color)?\s*\|\s*(#[A-Fa-f0-9]{6})(?:\s*\(([^)]+)\))?/i],
    ['secondary', /Secondary(?:\s+Color)?\s*\|\s*(#[A-Fa-f0-9]{6})(?:\s*\(([^)]+)\))?/i],
    ['accent', /Accent(?:\s+Color)?\s*\|\s*(#[A-Fa-f0-9]{6})(?:\s*\(([^)]+)\))?/i],
  ];

  for (const [role, regex] of quickPatterns) {
    const match = content.match(regex);
    if (match) {
      colors[role].base = match[1].toUpperCase();
      if (match[2]) colors[role].name = slugifyName(match[2], role);
    }
  }

  const sectionPatterns = [
    ['primary', /###\s*Primary(?:\s+Colors?)?[\s\S]*?(?=###|##|$)/i],
    ['secondary', /###\s*Secondary(?:\s+Colors?)?[\s\S]*?(?=###|##|$)/i],
    ['accent', /###\s*Accent(?:\s+Colors?)?[\s\S]*?(?=###|##|$)/i],
  ];

  for (const [role, regex] of sectionPatterns) {
    const found = extractSectionHexes(content, regex);
    if (found.base) colors[role].base = found.base;
    if (found.dark) colors[role].dark = found.dark;
    if (found.light) colors[role].light = found.light;
  }

  if (!colors.primary.base) {
    return null;
  }

  if (!colors.secondary.base) {
    colors.secondary.base = mixHex(colors.primary.base, '#1F2937', 0.45);
  }
  if (!colors.accent.base) {
    colors.accent.base = colors.primary.base;
  }

  return colors;
}

function extractBrandData(content) {
  const colors = extractColorsFromMarkdown(content);
  if (!colors) {
    throw new Error('Could not find a Primary hex color (#RRGGBB) in brand markdown');
  }
  return {
    brand: extractBrandName(content),
    colors,
    neutral: extractNeutralColors(content),
    typography: extractTypography(content),
  };
}

function generateColorScale(baseHex, darkHex, lightHex) {
  const base = baseHex.toUpperCase();
  return {
    '50': { $value: lightHex || mixHex(base, '#FFFFFF', 0.92), $type: 'color' },
    '100': { $value: lightHex || mixHex(base, '#FFFFFF', 0.84), $type: 'color' },
    '200': { $value: mixHex(base, '#FFFFFF', 0.68), $type: 'color' },
    '300': { $value: mixHex(base, '#FFFFFF', 0.46), $type: 'color' },
    '400': { $value: mixHex(base, '#FFFFFF', 0.24), $type: 'color' },
    '500': { $value: base, $type: 'color' },
    '600': { $value: darkHex || mixHex(base, '#000000', 0.16), $type: 'color' },
    '700': { $value: mixHex(base, '#000000', 0.3), $type: 'color' },
    '800': { $value: mixHex(base, '#000000', 0.46), $type: 'color' },
    '900': { $value: mixHex(base, '#000000', 0.62), $type: 'color' },
  };
}

function buildDesignTokens(brandData) {
  const { brand, colors, neutral, typography } = brandData;
  const pName = colors.primary.name === colors.secondary.name ? 'primary' : colors.primary.name;
  const sName = colors.secondary.name === pName ? 'secondary' : colors.secondary.name;
  const aName =
    colors.accent.name === pName || colors.accent.name === sName ? 'accent' : colors.accent.name;

  const primitiveColor = {
    [pName]: generateColorScale(colors.primary.base, colors.primary.dark, colors.primary.light),
    [sName]: generateColorScale(colors.secondary.base, colors.secondary.dark, colors.secondary.light),
    [aName]: generateColorScale(colors.accent.base, colors.accent.dark, colors.accent.light),
  };

  return {
    brand,
    primitive: {
      color: primitiveColor,
      font: {
        display: { $value: typography.display, $type: 'fontFamily' },
        body: { $value: typography.body, $type: 'fontFamily' },
        mono: { $value: typography.mono, $type: 'fontFamily' },
      },
    },
    semantic: {
      color: {
        primary: { $value: `{primitive.color.${pName}.500}`, $type: 'color' },
        'primary-hover': { $value: `{primitive.color.${pName}.600}`, $type: 'color' },
        'primary-active': { $value: `{primitive.color.${pName}.700}`, $type: 'color' },
        'primary-soft': { $value: `{primitive.color.${pName}.100}`, $type: 'color' },
        secondary: { $value: `{primitive.color.${sName}.500}`, $type: 'color' },
        'secondary-hover': { $value: `{primitive.color.${sName}.600}`, $type: 'color' },
        'secondary-soft': { $value: `{primitive.color.${sName}.100}`, $type: 'color' },
        accent: { $value: `{primitive.color.${aName}.500}`, $type: 'color' },
        'accent-hover': { $value: `{primitive.color.${aName}.600}`, $type: 'color' },
        'accent-soft': { $value: `{primitive.color.${aName}.100}`, $type: 'color' },
        'accent-deep': { $value: `{primitive.color.${aName}.800}`, $type: 'color' },
        'accent-ink': { $value: pickOnColor(colors.accent.base), $type: 'color' },
        'on-primary': { $value: pickOnColor(colors.primary.base), $type: 'color' },
        paper: { $value: neutral.paper, $type: 'color' },
        'paper-2': { $value: neutral.paper2, $type: 'color' },
        line: { $value: neutral.line, $type: 'color' },
        ink: { $value: neutral.ink, $type: 'color' },
        'ink-2': { $value: neutral.ink2, $type: 'color' },
        'ink-3': { $value: mixHex(neutral.ink2, neutral.paper, 0.35), $type: 'color' },
      },
      typography: {
        'font-display': { $value: '{primitive.font.display}', $type: 'fontFamily' },
        'font-body': { $value: '{primitive.font.body}', $type: 'fontFamily' },
        'font-mono': { $value: '{primitive.font.mono}', $type: 'fontFamily' },
        'leading-display': { $value: '1.2', $type: 'number' },
        'leading-body': { $value: '1.6', $type: 'number' },
      },
    },
    component: {
      button: {
        primary: {
          bg: { $value: '{semantic.color.primary}', $type: 'color' },
          'bg-hover': { $value: '{semantic.color.primary-hover}', $type: 'color' },
          text: { $value: '{semantic.color.on-primary}', $type: 'color' },
        },
        secondary: {
          'bg-hover': { $value: `${colors.primary.base}1A`, $type: 'color' },
          border: { $value: '{semantic.color.line}', $type: 'color' },
          text: { $value: '{semantic.color.ink}', $type: 'color' },
        },
      },
    },
  };
}

function resolveTokenRef(value, tokens) {
  if (typeof value !== 'string' || !value.startsWith('{') || !value.endsWith('}')) {
    return value;
  }
  const parts = value.slice(1, -1).split('.');
  let current = tokens;
  for (const part of parts) {
    current = current?.[part];
  }
  if (current && typeof current === 'object' && '$value' in current) {
    return resolveTokenRef(current.$value, tokens);
  }
  return value;
}

function generateCssFromTokens(tokens, options = {}) {
  const varsOnly = Boolean(options.varsOnly);
  const lines = [
    `/* Generated from brand.md by sync-brand-to-tokens.cjs (${tokens.brand}) */`,
    ':root {',
    '  /* Primitive color scales */',
  ];

  for (const [colorName, scale] of Object.entries(tokens.primitive?.color || {})) {
    for (const [step, token] of Object.entries(scale)) {
      lines.push(`  --color-${colorName}-${step}: ${token.$value};`);
    }
  }

  lines.push('');
  lines.push('  /* Semantic surfaces, ink, and accents */');
  const bareAliases = new Set([
    'paper', 'paper-2', 'line', 'ink', 'ink-2', 'ink-3',
    'accent', 'accent-hover', 'accent-soft', 'accent-deep', 'accent-ink',
  ]);
  const colorMirrors = new Set(['accent', 'accent-hover', 'accent-soft']);
  for (const [key, token] of Object.entries(tokens.semantic?.color || {})) {
    const resolved = resolveTokenRef(token.$value, tokens);
    if (bareAliases.has(key)) {
      lines.push(`  --${key}: ${resolved};`);
      if (colorMirrors.has(key)) lines.push(`  --color-${key}: ${resolved};`);
    } else {
      lines.push(`  --color-${key}: ${resolved};`);
    }
  }

  lines.push('');
  lines.push('  /* Vietnamese-safe fluid typography & measure */');
  for (const [key, token] of Object.entries(tokens.semantic?.typography || {})) {
    lines.push(`  --${key}: ${resolveTokenRef(token.$value, tokens)};`);
  }
  lines.push('  --step--1: clamp(0.83rem, 0.8rem + 0.15vw, 0.9rem);');
  lines.push('  --step-0: clamp(1rem, 0.96rem + 0.2vw, 1.125rem);');
  lines.push('  --step-1: clamp(1.25rem, 1.15rem + 0.45vw, 1.5rem);');
  lines.push('  --step-2: clamp(1.56rem, 1.38rem + 0.9vw, 2rem);');
  lines.push('  --step-3: clamp(1.95rem, 1.6rem + 1.7vw, 2.75rem);');
  lines.push('  --step-4: clamp(2.44rem, 1.8rem + 3.2vw, 4rem);');
  lines.push('  --step-5: clamp(2.75rem, 1.6rem + 5.6vw, 4.75rem);');
  lines.push('  --tracking-display: -0.02em;');
  lines.push('  --tracking-caps: 0.08em;');
  lines.push('  --measure: 62ch;');

  lines.push('');
  lines.push('  /* 4pt spacing, layout rhythm & container */');
  lines.push('  --space-1: 4px;');
  lines.push('  --space-2: 8px;');
  lines.push('  --space-3: 12px;');
  lines.push('  --space-4: 16px;');
  lines.push('  --space-5: 24px;');
  lines.push('  --space-6: 32px;');
  lines.push('  --space-7: 48px;');
  lines.push('  --space-8: 64px;');
  lines.push('  --space-9: 96px;');
  lines.push('  --space-10: 128px;');
  lines.push('  --section-y: clamp(64px, 6vw + 32px, 128px);');
  lines.push('  --gutter: clamp(16px, 4vw, 48px);');
  lines.push('  --container: 1200px;');

  lines.push('');
  lines.push('  /* Shape, depth & motion */');
  lines.push('  --radius: 10px;');
  lines.push('  --radius-sm: 6px;');
  lines.push('  --shadow-1: 0 1px 2px rgba(24, 24, 27, 0.06), 0 4px 12px rgba(24, 24, 27, 0.07);');
  lines.push('  --shadow-2: 0 2px 4px rgba(24, 24, 27, 0.06), 0 16px 40px rgba(24, 24, 27, 0.1);');
  lines.push('  --dur-press: 120ms;');
  lines.push('  --dur-state: 240ms;');
  lines.push('  --dur-layout: 400ms;');
  lines.push('  --dur-enter: 700ms;');
  lines.push('  --ease-out: cubic-bezier(0.25, 1, 0.5, 1);');
  lines.push('  --ease-expo: cubic-bezier(0.16, 1, 0.3, 1);');

  lines.push('');
  lines.push('  /* Component tokens */');
  const btnPrimary = tokens.component?.button?.primary || {};
  const btnSecondary = tokens.component?.button?.secondary || {};
  if (btnPrimary.bg) lines.push(`  --btn-primary-bg: ${resolveTokenRef(btnPrimary.bg.$value, tokens)};`);
  if (btnPrimary['bg-hover']) lines.push(`  --btn-primary-bg-hover: ${resolveTokenRef(btnPrimary['bg-hover'].$value, tokens)};`);
  if (btnPrimary.text) lines.push(`  --btn-primary-text: ${resolveTokenRef(btnPrimary.text.$value, tokens)};`);
  if (btnSecondary['bg-hover']) lines.push(`  --btn-secondary-bg-hover: ${resolveTokenRef(btnSecondary['bg-hover'].$value, tokens)};`);

  lines.push('}');
  lines.push('');
  lines.push('@media (prefers-reduced-motion: reduce) {');
  lines.push('  :root { --dur-press: 0ms; --dur-state: 0ms; --dur-layout: 0ms; --dur-enter: 0ms; }');
  lines.push('}');

  if (!varsOnly) {
    lines.push('');
    lines.push('body {');
    lines.push('  font: 400 var(--step-0) / var(--leading-body) var(--font-body);');
    lines.push('  color: var(--ink);');
    lines.push('  background: var(--paper);');
    lines.push('  -webkit-font-smoothing: antialiased;');
    lines.push('}');
    lines.push('h1, h2, h3 {');
    lines.push('  font-family: var(--font-display);');
    lines.push('  font-weight: 600;');
    lines.push('  line-height: var(--leading-display);');
    lines.push('  letter-spacing: var(--tracking-display);');
    lines.push('  text-wrap: balance;');
    lines.push('}');
    lines.push('p { max-width: var(--measure); text-wrap: pretty; }');
    lines.push(':focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }');
  }
  lines.push('');

  return lines.join('\n');
}

function syncBrandToTokens(options) {
  const brandPath = path.resolve(process.cwd(), options.brand);
  if (!fs.existsSync(brandPath)) {
    throw new Error(`Brand file not found: ${brandPath}`);
  }

  const content = fs.readFileSync(brandPath, 'utf8');
  const brandData = extractBrandData(content);
  const tokens = buildDesignTokens(brandData);
  const css = generateCssFromTokens(tokens, { varsOnly: Boolean(options.varsOnly) });

  if (!options.dryRun) {
    const jsonOut = path.resolve(process.cwd(), options.jsonOut);
    const cssOut = path.resolve(process.cwd(), options.cssOut);
    fs.mkdirSync(path.dirname(jsonOut), { recursive: true });
    fs.mkdirSync(path.dirname(cssOut), { recursive: true });
    fs.writeFileSync(jsonOut, JSON.stringify(tokens, null, 2) + '\n', 'utf8');
    fs.writeFileSync(cssOut, css, 'utf8');
  }

  return { brandData, tokens, css };
}

function parseCliArgs(argv) {
  const opts = {
    help: false,
    dryRun: false,
    varsOnly: false,
    brand: null,
    jsonOut: 'design-tokens.json',
    cssOut: 'tokens.css',
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      opts.help = true;
    } else if (arg === '--dry-run') {
      opts.dryRun = true;
    } else if (arg === '--vars-only') {
      opts.varsOnly = true;
    } else if (arg === '--brand' || arg === '-b') {
      opts.brand = argv[++i] || null;
    } else if (arg === '--json-out') {
      opts.jsonOut = argv[++i] || opts.jsonOut;
    } else if (arg === '--css-out') {
      opts.cssOut = argv[++i] || opts.cssOut;
    }
  }

  return opts;
}

function main() {
  const opts = parseCliArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    return;
  }

  opts.brand = opts.brand || resolveDefaultBrandPath();

  try {
    const { brandData } = syncBrandToTokens(opts);
    console.log(`Brand: ${brandData.brand}`);
    console.log(`Primary: ${brandData.colors.primary.name} (${brandData.colors.primary.base})`);
    console.log(`Secondary: ${brandData.colors.secondary.name} (${brandData.colors.secondary.base})`);
    console.log(`Accent: ${brandData.colors.accent.name} (${brandData.colors.accent.base})`);
    if (opts.dryRun) {
      console.log('Dry run complete; no files written.');
    } else {
      console.log(`Wrote JSON tokens: ${opts.jsonOut}`);
      console.log(`Wrote CSS tokens: ${opts.cssOut}`);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

module.exports = {
  extractBrandName,
  extractColorsFromMarkdown,
  extractBrandData,
  generateColorScale,
  buildDesignTokens,
  generateCssFromTokens,
  syncBrandToTokens,
};

if (require.main === module) {
  main();
}
