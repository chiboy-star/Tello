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
      expect(stmt).toMatch(/UPDATE catalog_items SET/i);
      expect(stmt).toMatch(/WHERE category = '[^']+' AND name = '[^']+';?/i);
    }
  });

  it('backfill_user_prices.sql is safe and idempotent', () => {
    const content = fs.readFileSync(backfillSqlPath, 'utf8');
    expect(content).toContain('UPDATE items');
    expect(content).toContain('FROM catalog_items');
    expect(content).toMatch(/WHERE items\.catalog_item_id = catalog_items\.id/);
    expect(content).toMatch(/AND \(items\.sell_price_minor IS NULL OR items\.sell_price_source = 'estimate'\)/);
  });
});
