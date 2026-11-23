import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { importPricesFromCsv } from '../../scripts/import-catalog-prices';

describe('Catalog Prices CSV Importer (Round 7c)', () => {
  const tempCsvPath = path.join(process.cwd(), 'docs', 'price-evidence', 'temp-test.csv');

  afterEach(() => {
    if (fs.existsSync(tempCsvPath)) {
      fs.unlinkSync(tempCsvPath);
    }
  });

  it('accepts valid CSV, rejects missing URL or invalid tier, and generates SQL & markdown', () => {
    const csvContent = `category,name,unit,price_ngn,source_url,source_text,accessed,tier
everyday,Test Item 1,pack,250,https://example.com/item1,"Direct quote text",2026-11-23,medium
everyday,Invalid URL Item,pack,150,not-a-url,"Some quote",2026-11-23,low
everyday,Invalid Tier Item,pack,300,https://example.com/item3,"Some quote",2026-11-23,invalid_tier
everyday,Test Item 2,bottle,400,https://example.com/item2,"Second quote",2026-11-23,high
`;
    fs.writeFileSync(tempCsvPath, csvContent, 'utf8');

    const result = importPricesFromCsv(tempCsvPath);

    // Should have accepted 2 valid items (Test Item 1 and Test Item 2)
    expect(result.importedCount).toBe(2);

    // Should have reported 2 rejection errors (invalid URL and invalid tier)
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0]).toContain("Row rejected for \"Invalid URL Item\" - 'source_url' is missing or not a valid HTTP(S) URL");
    expect(result.errors[1]).toContain("Row rejected for \"Invalid Tier Item\" - 'tier' must be 'high', 'medium', or 'low'");

    // Check evidence file created for valid item
    const evidencePath = path.join(process.cwd(), 'docs', 'price-evidence', 'test-item-1.md');
    expect(fs.existsSync(evidencePath)).toBe(true);
    const evidenceContent = fs.readFileSync(evidencePath, 'utf8');
    expect(evidenceContent).toContain('₦250');
    expect(evidenceContent).toContain('`medium`');
    expect(evidenceContent).toContain('https://example.com/item1');

    // Clean up test evidence
    fs.unlinkSync(evidencePath);
    const item2Evidence = path.join(process.cwd(), 'docs', 'price-evidence', 'test-item-2.md');
    if (fs.existsSync(item2Evidence)) fs.unlinkSync(item2Evidence);
  });
});
