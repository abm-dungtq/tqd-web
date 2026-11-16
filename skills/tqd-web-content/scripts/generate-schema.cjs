#!/usr/bin/env node
/**
 * JSON-LD Schema Generator
 * Usage: node generate-schema.cjs <type> [--data data.json] [--output schema.json]
 */

const fs = require('fs');

function buildPostalAddress(data) {
  if (data.address && typeof data.address === 'object') {
    return {
      '@type': 'PostalAddress',
      ...data.address,
    };
  }
  const address = {
    '@type': 'PostalAddress',
    streetAddress: data.streetAddress || (typeof data.address === 'string' ? data.address : ''),
    addressLocality: data.city || '',
    addressCountry: data.country || 'VN',
  };
  if (data.region) address.addressRegion = data.region;
  if (data.postalCode) address.postalCode = data.postalCode;
  return address;
}

const schemas = {
  article: (data) => {
    const publisher = {
      '@type': 'Organization',
      name: data.org || 'Organization',
    };
    if (data.logo) {
      publisher.logo = { '@type': 'ImageObject', url: data.logo };
    }
    return {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: data.title,
      author: { '@type': 'Person', name: data.author || 'Author' },
      datePublished: data.date || new Date().toISOString(),
      image: data.image || '',
      publisher,
    };
  },

  faq: (data) => ({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: (data.questions || []).map((q) => ({
      '@type': 'Question',
      name: q.question,
      acceptedAnswer: { '@type': 'Answer', text: q.answer },
    })),
  }),

  product: (data) => ({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: data.name,
    description: data.description || '',
    image: data.image || '',
    offers: {
      '@type': 'Offer',
      price: data.price !== undefined && data.price !== null ? String(data.price) : '0',
      priceCurrency: data.currency || 'USD',
      availability: data.availability || 'https://schema.org/InStock',
    },
  }),

  howto: (data) => ({
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: data.title,
    description: data.description || '',
    step: (data.steps || []).map((step, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: step.name || `Step ${i + 1}`,
      text: step.text,
    })),
  }),

  organization: (data) => {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: data.name,
      url: data.url || '',
      sameAs: data.social || [],
    };
    if (data.logo) schema.logo = data.logo;
    return schema;
  },

  localbusiness: (data) => {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: data.name,
      telephone: data.telephone || '',
      address: buildPostalAddress(data),
    };
    if (data.description) schema.description = data.description;
    if (data.url) schema.url = data.url;
    if (data.image) schema.image = data.image;
    if (data.priceRange) schema.priceRange = data.priceRange;
    if (data.openingHoursSpecification) {
      schema.openingHoursSpecification = data.openingHoursSpecification;
    }
    return schema;
  },

  breadcrumb: (data) => ({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: (data.items || []).map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  }),
};

function generateSchema(type, data = {}) {
  const generator = schemas[String(type).toLowerCase()];
  if (!generator) {
    throw new Error(`Unknown schema type: ${type}. Available: ${Object.keys(schemas).join(', ')}`);
  }
  return generator(data);
}

function printHelp() {
  console.log('Usage: node generate-schema.cjs <type> [--data data.json] [--output schema.json]');
  console.log('Types: article, faq, product, howto, organization, localbusiness, breadcrumb');
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes('-h') || args.includes('--help')) {
    printHelp();
    process.exit(0);
  }
  if (args.length < 1) {
    printHelp();
    process.exit(2);
  }

  const type = args[0];
  const dataIndex = args.indexOf('--data');
  let data = {};

  if (dataIndex !== -1) {
    const dataFile = args[dataIndex + 1];
    if (!dataFile || dataFile.startsWith('-')) {
      console.error('Error: --data requires a JSON file path');
      process.exit(2);
    }
    if (!fs.existsSync(dataFile)) {
      console.error(`Error: data file not found: ${dataFile}`);
      process.exit(2);
    }
    try {
      data = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
    } catch (err) {
      console.error(`Error: failed to parse JSON from ${dataFile}: ${err.message}`);
      process.exit(2);
    }
  }

  const schema = generateSchema(type, data);
  if (type.toLowerCase() === 'faq') {
    console.error(
      'Note: Google stopped showing FAQ rich results on 2026-05-07, so FAQPage markup does not earn a Google rich result. ' +
        'Keep it only for a visible FAQ that other consumers parse.'
    );
  }
  const output = JSON.stringify(schema, null, 2);

  const outputIndex = args.indexOf('--output');
  if (outputIndex !== -1 && args[outputIndex + 1]) {
    fs.writeFileSync(args[outputIndex + 1], output, 'utf8');
    console.log(`Schema saved: ${args[outputIndex + 1]}`);
  } else {
    console.log(output);
  }
}

module.exports = { generateSchema, schemas };
