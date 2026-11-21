import { CATALOG_ITEMS } from '../../lib/catalog/catalog.data';
import * as fs from 'fs';
import * as path from 'path';

function escapeSql(str: string): string {
  return str.replace(/'/g, "''");
}

function generateSeedSql(): string {
  let sql = `-- Seed catalog_items generated from catalog.data.ts\n`;
  sql += `truncate table catalog_items cascade;\n\n`;
  sql += `insert into catalog_items (category, name, unit, aliases, business_types, is_default, sort_order) values\n`;

  const values = CATALOG_ITEMS.map((item) => {
    const aliasesArray = `'{${item.aliases.map((a) => `"${escapeSql(a)}"`).join(',')}}'`;
    const bTypesArray = `'{${item.businessTypes.join(',')}}'`;
    return `  ('${escapeSql(item.category)}', '${escapeSql(item.name)}', '${escapeSql(item.unit)}', ${aliasesArray}, ${bTypesArray}, ${item.isDefault ? 'true' : 'false'}, ${item.sortOrder || 0})`;
  });

  sql += values.join(',\n') + ';\n';
  return sql;
}

const outputPath = path.resolve(__dirname, '../../supabase/seed.sql');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, generateSeedSql(), 'utf-8');
console.log(`Successfully generated seed.sql with ${CATALOG_ITEMS.length} items at ${outputPath}`);
