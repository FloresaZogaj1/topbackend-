#!/usr/bin/env node
/*
  scripts/import_products.js
  - Scans frontend product modules in ../clientt/src/data/
  - Attempts to evaluate their exported arrays safely (stubbing imported image vars)
  - Shows a dry-run of creations/updates and can insert new products into the `products` table

  Usage:
    node scripts/import_products.js --dry-run    # show what would be inserted
    node scripts/import_products.js --apply      # actually insert into DB

  Notes:
  - The backend `products` table expected columns: name, price, description, image
  - Matching for existing products is done by exact name match (safe fallback). Modify if you prefer sku matching.
  - Run from project root (topmobile-backend). Ensure DB env vars are set (DB_HOST, DB_USER, DB_PASS, DB_NAME) or present in env.
*/

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const pool = require('../db'); // uses same DB config as the server

const DATA_DIR = path.resolve(__dirname, '..', '..', 'clientt', 'src', 'data');

function listDataFiles() {
  if (!fs.existsSync(DATA_DIR)) throw new Error('Frontend data directory not found: ' + DATA_DIR);
  return fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.js'));
}

function readAndEvalFile(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');

  // collect imported identifiers to stub them (so evaluation won't fail)
  const importIdents = [];
  const importRegex = /import\s+([A-Za-z0-9_$]+)\s+from\s+['"].*?['"];?/g;
  let m;
  while ((m = importRegex.exec(src)) !== null) {
    importIdents.push(m[1]);
  }

  // collect const string map (const NAME = '...') to preserve actual string values
  const constMap = {};
  const constRegex = /const\s+([A-Za-z0-9_$]+)\s*=\s*(['"])(.*?)\2\s*;/g;
  while ((m = constRegex.exec(src)) !== null) {
    constMap[m[1]] = m[3];
  }

  // create a safe evaluation source
  //  - remove import lines
  //  - replace `export default` with `module.exports =`
  let safeSrc = src.replace(/import\s+[\s\S]*?from\s+['\"][^'\"]+['\"];?/g, '');
  safeSrc = safeSrc.replace(/export\s+default/, 'module.exports =');

  // preface with stubs for imported idents and re-declare consts found as-is
  const prefaceLines = [];
  for (const k of Object.keys(constMap)) {
    // re-declare the const so it's available in the VM (use JSON string escaping)
    prefaceLines.push(`const ${k} = ${JSON.stringify(constMap[k])};`);
  }
  for (const id of importIdents) {
    if (!constMap[id]) prefaceLines.push(`const ${id} = "";`); // empty string stub for imported images
  }

  const finalSrc = prefaceLines.join('\n') + '\n' + safeSrc;

  // Create a sandboxed VM and execute
  const sandbox = { module: {}, exports: {} };
  try {
    vm.runInNewContext(finalSrc, sandbox, { timeout: 1000 });
  } catch (err) {
    console.error('VM eval error for', filePath, err.message);
    return null;
  }

  return sandbox.module && sandbox.module.exports ? sandbox.module.exports : null;
}

function normalizeProduct(p) {
  // backend expects: name, price, description, image
  const name = p.name || p.title || p.slug || null;
  const price = Number(p.price || p.price || 0) || 0;
  const description = p.description || p.desc || '';
  let image = null;
  if (Array.isArray(p.images) && p.images.length) image = p.images[0] || null;
  if (!image && p.image) image = p.image;
  // if image is an object with url property
  if (image && typeof image === 'object' && image.url) image = image.url;
  if (image === '') image = null;

  return { name, price, description, image };
}

async function importProducts({ dryRun = true } = {}) {
  const files = listDataFiles();
  const all = [];

  for (const f of files) {
    const fp = path.join(DATA_DIR, f);
    const exported = readAndEvalFile(fp);
    if (!exported) continue;
    if (Array.isArray(exported)) {
      all.push(...exported);
    } else if (Array.isArray(exported.default)) {
      all.push(...exported.default);
    } else {
      // maybe the file exports an object of categories
      if (typeof exported === 'object' && exported !== null) {
        Object.values(exported).forEach(v => { if (Array.isArray(v)) all.push(...v); });
      }
    }
  }

  // map to backend shape and dedupe by name
  const mapped = all.map(normalizeProduct).filter(p => p.name);

  // dedupe by exact (lowercased) name to avoid duplicate inserts
  const seen = new Map();
  for (const p of mapped) {
    const key = String(p.name).trim().toLowerCase();
    if (!seen.has(key)) seen.set(key, p);
  }

  const unique = Array.from(seen.values());
  console.log(`Found ${mapped.length} product entries in frontend data, ${unique.length} unique by name.`);

  if (dryRun) {
    console.log('\nDRY RUN - products to be created/updated:');
    unique.forEach((p, i) => {
      console.log(`${i + 1}. ${p.name} — price: ${p.price} — image: ${p.image || '<none>'}`);
    });
    return { count: unique.length, products: unique };
  }

  // apply: for each product, insert if not exists (by exact name), else skip
  const conn = pool; // mysql2 pool
  const inserted = [];
  for (const p of unique) {
    try {
      const [[existing]] = await conn.query('SELECT id FROM products WHERE LOWER(name) = ? LIMIT 1', [p.name.trim().toLowerCase()]);
      if (existing && existing.id) {
        console.log(`Skipping existing product: ${p.name} (id=${existing.id})`);
        continue;
      }
      const [r] = await conn.execute('INSERT INTO products (name, price, description, image) VALUES (?,?,?,?)', [p.name, p.price || 0, p.description || null, p.image || null]);
      inserted.push({ id: r.insertId, name: p.name });
      console.log(`Inserted id=${r.insertId} ${p.name}`);
    } catch (err) {
      console.error('Error inserting product', p.name, err.message);
    }
  }

  console.log(`\nImport completed: inserted ${inserted.length} products.`);
  return { inserted };
}

// CLI
(async () => {
  const args = process.argv.slice(2);
  const dry = args.includes('--dry-run') || !args.includes('--apply');
  try {
    await importProducts({ dryRun: dry });
    if (dry) console.log('\nDry run finished. To apply changes run: node scripts/import_products.js --apply');
  } catch (err) {
    console.error('Import failed:', err.message || err);
    process.exit(1);
  } finally {
    // close pool gracefully
    try { await pool.end(); } catch (e) {}
  }
})();
