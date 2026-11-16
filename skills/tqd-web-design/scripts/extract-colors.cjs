#!/usr/bin/env node
/**
 * extract-colors.cjs
 *
 * Parse brand color palettes from brand.md and provide ImageMagick extraction
 * and RGB-distance brand compliance helpers using pure Node.js.
 *
 * Usage:
 *   node extract-colors.cjs --palette [--brand-file docs/website/brand.md] [--json]
 *   node extract-colors.cjs <image-path> [--brand-file docs/website/brand.md] [--json]
 *   node extract-colors.cjs --help
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_BRAND_CANDIDATES = [
  'docs/website/brand.md',
  'brand.md',
  'docs/brand-guidelines.md',
];

function printHelp() {
  console.log(`Usage: node extract-colors.cjs [options] [<image-path>]

Options:
  --palette             Display the parsed brand color palette
  --brand-file <path>   Path to brand markdown file (default: docs/website/brand.md)
  --json                Print machine-readable JSON output
  -h, --help            Show this help message

Examples:
  node extract-colors.cjs --palette --brand-file docs/website/brand.md
  node extract-colors.cjs hero.jpg --brand-file docs/website/brand.md --json
  magick hero.jpg -colors 10 -depth 8 -format "%c" histogram:info:`);
}

function resolveDefaultBrandPath(cwd = process.cwd()) {
  for (const rel of DEFAULT_BRAND_CANDIDATES) {
    const candidate = path.resolve(cwd, rel);
    if (fs.existsSync(candidate)) return rel;
  }
  return DEFAULT_BRAND_CANDIDATES[0];
}

function extractHexColors(text) {
  const matches = text.match(/#[0-9A-Fa-f]{6}\b/g) || [];
  return [...new Set(matches.map((hex) => hex.toUpperCase()))];
}

function parseBrandColors(guidelinesPath) {
  const resolvedPath = path.isAbsolute(guidelinesPath)
    ? guidelinesPath
    : path.join(process.cwd(), guidelinesPath);

  if (!fs.existsSync(resolvedPath)) {
    return null;
  }

  const content = fs.readFileSync(resolvedPath, 'utf8');

  const palette = {
    primary: [],
    secondary: [],
    accent: [],
    neutral: [],
    semantic: [],
    all: [],
  };

  const sections = [
    { name: 'primary', regex: /###\s*Primary(?:\s+Colors?)?[\s\S]*?(?=###|##|$)/i },
    { name: 'secondary', regex: /###\s*Secondary(?:\s+Colors?)?[\s\S]*?(?=###|##|$)/i },
    { name: 'accent', regex: /###\s*Accent(?:\s+Colors?)?[\s\S]*?(?=###|##|$)/i },
    { name: 'neutral', regex: /###\s*Neutral(?:\s+Colors?)?[\s\S]*?(?=###|##|$)/i },
    { name: 'semantic', regex: /###\s*Semantic(?:\s+Colors?)?[\s\S]*?(?=###|##|$)/i },
  ];

  for (const { name, regex } of sections) {
    const match = content.match(regex);
    if (match) {
      const colors = extractHexColors(match[0]);
      palette[name].push(...colors);
    }
  }

  // Fallback to Quick Reference table rows if any core bucket is empty.
  const quickRows = [
    { name: 'primary', regex: /Primary(?:\s+Color)?\s*\|\s*(#[A-Fa-f0-9]{6})\b/i },
    { name: 'secondary', regex: /Secondary(?:\s+Color)?\s*\|\s*(#[A-Fa-f0-9]{6})\b/i },
    { name: 'accent', regex: /Accent(?:\s+Color)?\s*\|\s*(#[A-Fa-f0-9]{6})\b/i },
  ];

  for (const { name, regex } of quickRows) {
    const match = content.match(regex);
    if (match) {
      const hex = match[1].toUpperCase();
      if (!palette[name].includes(hex)) {
        palette[name].push(hex);
      }
    }
  }

  palette.all = [
    ...new Set([
      ...palette.primary,
      ...palette.secondary,
      ...palette.accent,
      ...palette.neutral,
      ...palette.semantic,
    ]),
  ];

  return palette;
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function rgbToHex(r, g, b) {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const clamped = Math.min(255, Math.max(0, Math.round(x)));
        return clamped.toString(16).padStart(2, '0');
      })
      .join('')
      .toUpperCase()
  );
}

function colorDistance(color1, color2) {
  const rgb1 = typeof color1 === 'string' ? hexToRgb(color1) : color1;
  const rgb2 = typeof color2 === 'string' ? hexToRgb(color2) : color2;

  if (!rgb1 || !rgb2) return Infinity;

  return Math.sqrt(
    (rgb1.r - rgb2.r) ** 2 +
      (rgb1.g - rgb2.g) ** 2 +
      (rgb1.b - rgb2.b) ** 2
  );
}

function findNearestBrandColor(color, brandColors) {
  let nearest = null;
  let minDistance = Infinity;

  for (const brandColor of brandColors) {
    const distance = colorDistance(color, brandColor);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = brandColor;
    }
  }

  return { color: nearest, distance: minDistance };
}

function calculateCompliance(extractedColors, brandColors, threshold = 50) {
  if (!extractedColors || extractedColors.length === 0) return 100;
  if (!brandColors || brandColors.length === 0) return 0;

  let matchCount = 0;
  for (const color of extractedColors) {
    const nearest = findNearestBrandColor(color, brandColors);
    if (nearest.distance <= threshold) {
      matchCount++;
    }
  }

  return Math.round((matchCount / extractedColors.length) * 100);
}

function generateImageMagickCommand(imagePath, numColors = 10) {
  return `magick "${imagePath}" -colors ${numColors} -depth 8 -format "%c" histogram:info:`;
}

function parseImageMagickOutput(output) {
  const colors = [];
  const lines = output.trim().split('\n');

  for (const line of lines) {
    const hexMatch = line.match(/#([0-9A-Fa-f]{6})/);
    const countMatch = line.match(/^\s*(\d+):/);
    if (hexMatch) {
      colors.push({
        hex: '#' + hexMatch[1].toUpperCase(),
        count: countMatch ? parseInt(countMatch[1], 10) : 0,
      });
    }
  }

  colors.sort((a, b) => b.count - a.count);
  return colors;
}

function displayPalette(palette) {
  console.log('\n' + '='.repeat(50));
  console.log('BRAND COLOR PALETTE');
  console.log('='.repeat(50));

  for (const [label, list] of [
    ['Primary Colors', palette.primary],
    ['Secondary Colors', palette.secondary],
    ['Accent Colors', palette.accent],
    ['Neutral Colors', palette.neutral],
    ['Semantic Colors', palette.semantic],
  ]) {
    if (list.length > 0) {
      console.log(`\n${label}:`);
      for (const c of list) console.log(`  ${c}`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`Total: ${palette.all.length} colors in brand palette`);
  console.log('='.repeat(50) + '\n');
}

function parseCliArgs(argv) {
  const opts = {
    help: false,
    json: false,
    palette: false,
    brandFile: null,
    imagePath: null,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      opts.help = true;
    } else if (arg === '--json') {
      opts.json = true;
    } else if (arg === '--palette') {
      opts.palette = true;
    } else if (arg === '--brand-file' || arg === '--brand') {
      opts.brandFile = argv[++i] || null;
    } else if (!arg.startsWith('-') && !opts.imagePath) {
      opts.imagePath = arg;
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

  const brandFile = opts.brandFile || resolveDefaultBrandPath();
  const brandPalette = parseBrandColors(brandFile);

  if (!brandPalette) {
    console.error(`Brand file not found at: ${brandFile}`);
    console.error('Create docs/website/brand.md or pass --brand-file <path>');
    process.exit(1);
  }

  if (opts.palette || !opts.imagePath) {
    if (opts.json) {
      console.log(JSON.stringify(brandPalette, null, 2));
    } else {
      displayPalette(brandPalette);
      if (!opts.imagePath) {
        console.log('To extract colors from an image with ImageMagick:');
        console.log('  magick image.png -colors 10 -depth 8 -format "%c" histogram:info:');
      }
    }
    return;
  }

  const resolvedPath = path.isAbsolute(opts.imagePath)
    ? opts.imagePath
    : path.join(process.cwd(), opts.imagePath);

  if (!fs.existsSync(resolvedPath)) {
    console.error(`Image not found: ${resolvedPath}`);
    process.exit(1);
  }

  const extractionCommand = generateImageMagickCommand(resolvedPath);
  const result = {
    image: resolvedPath,
    brandPalette,
    extractionCommand,
    instructions: [
      '1. Run ImageMagick to extract the dominant colors:',
      `   ${extractionCommand}`,
      '2. Parse the histogram lines with parseImageMagickOutput() or compare hex values against brandPalette.all.',
    ],
    complianceCheck: {
      threshold: 50,
      description: 'Colors within Euclidean distance 50 in RGB space align with the brand palette',
      brandColors: brandPalette.all,
    },
  };

  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('\n' + '='.repeat(60));
    console.log('COLOR EXTRACTION HELPER');
    console.log('='.repeat(60));
    console.log(`\nImage: ${result.image}`);
    console.log(`Brand Colors loaded: ${brandPalette.all.length}`);
    console.log('\nNext step:\n');
    for (const line of result.instructions) console.log(line);
    console.log('\n' + '='.repeat(60) + '\n');
  }
}

module.exports = {
  resolveDefaultBrandPath,
  extractHexColors,
  parseBrandColors,
  hexToRgb,
  rgbToHex,
  colorDistance,
  findNearestBrandColor,
  calculateCompliance,
  generateImageMagickCommand,
  parseImageMagickOutput,
};

if (require.main === module) {
  main();
}
