import fs from 'fs';

const seedSql = fs.readFileSync('supabase/seed_prices.sql', 'utf8');
const catalogDataContent = fs.readFileSync('lib/catalog/catalog.data.ts', 'utf8');

const updates = seedSql.split(';').map(s => s.trim()).filter(s => s.startsWith('UPDATE'));

const missing = [];
for (const update of updates) {
  const match = /WHERE category = '([^']+)' AND name = '([^']+)';?/.exec(update);
  if (match) {
    const [_, category, name] = match;
    const searchStr = `name: '${name}'`;
    if (!catalogDataContent.includes(searchStr)) {
      missing.push(`${category} | ${name}`);
    }
  }
}

console.log(`Checked ${updates.length} seed updates.`);
if (missing.length === 0) {
  console.log('ALL rows in seed_prices.sql exist in CATALOG_ITEMS.');
} else {
  console.log('Missing items:', missing);
}
