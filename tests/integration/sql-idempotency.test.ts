import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('SQL Idempotency Check', () => {
  const seedSqlPath = path.resolve(process.cwd(), 'supabase/seed_prices.sql');
  const backfillSqlPath = path.resolve(process.cwd(), 'supabase/backfill_user_prices.sql');

  it('seed_prices.sql has idempotent UPDATE ... WHERE category AND name syntax', () => {
    const content = fs.readFileSync(seedSqlPath, 'utf8');
    const statements = content
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.startsWith('UPDATE'));

    expect(statements.length).toBeGreaterThan(50);

    for (const stmt of statements) {
      expect(stmt).toMatch(/UPDATE\s+catalog_items\s+SET/i);
      expect(stmt).toMatch(/WHERE\s+category\s*=\s*'[^']+'\s+AND\s+name\s*=\s*'[^']+';?/i);
    }
  });

  it('backfill_user_prices.sql is safe and idempotent', () => {
    const content = fs.readFileSync(backfillSqlPath, 'utf8');
    expect(content).toContain('UPDATE items');
    expect(content).toContain('FROM catalog_items');
    expect(content).toMatch(/WHERE\s+(?:items|i)\.catalog_item_id\s*=\s*(?:catalog_items|ci)\.id/i);
    expect(content).toMatch(/AND\s+\((?:items|i)\.sell_price_source\s+is\s+null\s+OR\s+(?:items|i)\.sell_price_source\s*!=\s*'user'\)/i);
  });
});
