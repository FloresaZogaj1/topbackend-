#!/usr/bin/env node
/*
  normalize_product_data.js
  - Targets frontend data files and applies these changes safely:
    * Increase numeric prices by +50 EUR
    * Ensure a non-empty, more descriptive `description` for each product (generated from name)
    * If image is missing or equals the placeholder, replace with external link https://mobifita.com/
  - Creates a .bak copy before modifying each file.

  Usage:
    node scripts/normalize_product_data.js --apply   # modify files
    node scripts/normalize_product_data.js --dry    # show summary only

  Note: This script uses heuristics and regex to update JS files in place. Review backups (*.bak) if needed.
*/

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', 'clientt', 'src', 'data');
const TARGETS = [
  'productsiphone.js',
  'products.fujifilm.js',
  'samsungproducts.js',
  'accesoriesproducts.js',
];

const MOBIFITA = 'https://mobifita.com/';

const args = process.argv.slice(2);
const apply = args.includes('--apply');

function backup(filePath) {
  const bak = filePath + '.' + Date.now() + '.bak';
  fs.copyFileSync(filePath, bak);
  return bak;
}

function genDescription(name) {
  // Basic generated description in Albanian, generic but informative
  return `${name} — Pajisje me performancë të lartë, ekran i qartë, kamera e avancuar dhe bateri të qëndrueshme. Produkti ofrohet me garanci dhe shërbim teknik në Top Mobile.`;
}

function replacePrice(match, p1, priceStr) {
  const price = Number(priceStr);
  if (!Number.isFinite(price)) return match;
  const newPrice = (price + 50).toFixed(2).replace(/\.00$/, '');
  return p1 + newPrice;
}

function processFile(fileName) {
  const fp = path.join(ROOT, fileName);
  if (!fs.existsSync(fp)) {
    console.warn('File not found:', fp);
    return { file: fileName, skipped: true };
  }
  const src = fs.readFileSync(fp, 'utf8');
  let out = src;

  // 1) Increase numeric prices defined as price: 123 or price: 123.45
  // We try to avoid changing other numbers by restricting to occurrences inside product objects
  // We'll do a global replace of `price: <num>` -> price: <num+50>
  out = out.replace(/(price\s*:\s*)([0-9]+(?:\.[0-9]+)?)/g, replacePrice);

  // 2) Ensure description: "..." exists and is populated. For product blocks we search for name and description nearby.
  // We'll match object blocks that contain name: "..." and optionally description. If description missing or short, inject/update it.
  const productBlockRegex = /\{([\s\S]*?)\n\s*\}/g; // loose per-object block
  out = out.replace(productBlockRegex, (blockMatch) => {
    // If block contains name: "..."
    const nameMatch = blockMatch.match(/name\s*:\s*['\"]([^'\"]+)['\"]/);
    if (!nameMatch) return blockMatch;
    const name = nameMatch[1];

    // find description
    const descMatch = blockMatch.match(/description\s*:\s*['\"]([\s\S]*?)['\"]/);
    if (!descMatch) {
      // insert description before the last closing of object properties (heuristic: before a trailing \n\s*}\s*$)
      const insertion = `\n    description: "${genDescription(name)}",`;
      // place insertion after the name property if possible
      const namePos = blockMatch.indexOf(nameMatch[0]);
      if (namePos >= 0) {
        // find next line end after name property
        const afterName = blockMatch.indexOf('\n', namePos);
        if (afterName >= 0) {
          return blockMatch.slice(0, afterName + 1) + insertion + blockMatch.slice(afterName + 1);
        }
      }
      // fallback: prepend
      return blockMatch.replace(/\n\s*$/, insertion + '\n  }');
    } else {
      const desc = descMatch[1].trim();
      if (desc.length < 20 || /iPhone 15|iPhone 16|Apple iPhone 15|Produkt/i.test(desc)) {
        // replace with generated
        return blockMatch.replace(/description\s*:\s*['\"][\s\S]*?['\"]/m, `description: "${genDescription(name)}"`);
      }
    }
    return blockMatch;
  });

  // 3) Replace obvious placeholder image links with MOBIFITA URL
  // common placeholder seen: PFP-01__3_-removebg-preview.png or empty string vars
  out = out.replace(/(https?:\/\/[^'"\)\s]+PFP-[^'"\)\s]+)/g, MOBIFITA);
  out = out.replace(/(images:\s*\[\s*\]|images:\s*\[\s*\])/g, `images: ["${MOBIFITA}"]`);

  // Also if there is image: '' or image: null set to MOBIFITA
  out = out.replace(/(image\s*:\s*)['\"]['\"]/g, `$1"${MOBIFITA}"`);

  // If not applying, just show diff counts
  if (!apply) {
    const changed = out !== src;
    console.log(`${fileName}: would ${changed ? 'update' : 'no changes'}`);
    return { file: fileName, changed };
  }

  // backup then write
  const bak = backup(fp);
  fs.writeFileSync(fp, out, 'utf8');
  console.log(`${fileName}: updated (backup: ${path.basename(bak)})`);
  return { file: fileName, changed: true, backup: bak };
}

function main() {
  console.log('normalize_product_data: target folder:', ROOT);
  const results = [];
  for (const t of TARGETS) {
    try {
      results.push(processFile(t));
    } catch (err) {
      console.error('Error processing', t, err.message);
      results.push({ file: t, error: err.message });
    }
  }
  console.log('\nSummary:');
  results.forEach(r => console.log(r.file, r.skipped ? 'skipped' : (r.changed ? (r.backup ? 'updated' : 'would update') : 'no-change')));
}

main();
