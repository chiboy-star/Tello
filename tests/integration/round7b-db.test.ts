import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

describe('Round 7b Database, RLS, and Schema Security Tests', { timeout: 45000 }, () => {
  loadEnv();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  let adminClient: SupabaseClient;
  let clientA: SupabaseClient;
  let clientB: SupabaseClient;

  let userAId: string;
  let userBId: string;
  const password = 'TestPassword123!';
  const emailA = `r7b-user-a-${Date.now()}@tallo-test.app`;
  const emailB = `r7b-user-b-${Date.now()}@tallo-test.app`;

  beforeAll(async () => {
    adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Create User A
    const { data: resA, error: errA } = await adminClient.auth.admin.createUser({
      email: emailA,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'Owner A' },
    });
    if (errA || !resA.user) throw new Error(`Failed to create User A: ${errA?.message}`);
    userAId = resA.user.id;

    // Create User B
    const { data: resB, error: errB } = await adminClient.auth.admin.createUser({
      email: emailB,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'Owner B' },
    });
    if (errB || !resB.user) throw new Error(`Failed to create User B: ${errB?.message}`);
    userBId = resB.user.id;

    // Authenticate Client A
    clientA = createClient(supabaseUrl, anonKey, {
      auth: { storageKey: `r7b-tok-a-${Date.now()}`, autoRefreshToken: false, persistSession: false },
    });
    const { error: loginErrA } = await clientA.auth.signInWithPassword({ email: emailA, password });
    if (loginErrA) throw new Error(`Client A login failed: ${loginErrA.message}`);

    // Authenticate Client B
    clientB = createClient(supabaseUrl, anonKey, {
      auth: { storageKey: `r7b-tok-b-${Date.now()}`, autoRefreshToken: false, persistSession: false },
    });
    const { error: loginErrB } = await clientB.auth.signInWithPassword({ email: emailB, password });
    if (loginErrB) throw new Error(`Client B login failed: ${loginErrB.message}`);
  }, 45000);

  afterAll(async () => {
    if (userAId) await adminClient.auth.admin.deleteUser(userAId);
    if (userBId) await adminClient.auth.admin.deleteUser(userBId);
  });

  it('Part 8 & Section 8: enforces RLS isolation and prevents User B from modifying User A stock', async () => {
    // 1. User A creates an item
    const { data: itemA, error: itemErr } = await clientA
      .from('items')
      .insert({
        user_id: userAId,
        name: 'Secret Indomie Carton',
        unit: 'carton',
        sell_price_minor: 1047000,
        current_qty: 10,
      })
      .select()
      .single();

    expect(itemErr).toBeNull();
    expect(itemA).toBeDefined();

    // 2. User B cannot see User A's item
    const { data: itemsB } = await clientB
      .from('items')
      .select('*')
      .eq('id', itemA.id);
    expect(itemsB).toHaveLength(0);

    // 3. User B cannot adjust User A's stock via adjust_stock RPC
    const { error: adjErrB } = await clientB.rpc('adjust_stock', {
      p_item_id: itemA.id,
      p_new_qty: 999,
      p_note: 'Malicious recount attempt by User B',
    });
    expect(adjErrB).toBeDefined();

    // 4. User A stock remains 10
    const { data: itemCheck } = await clientA
      .from('items')
      .select('current_qty')
      .eq('id', itemA.id)
      .single();
    expect(Number(itemCheck?.current_qty)).toBe(10);
  });

  it('Part 8: adjust_stock RPC updates current_qty and records audit ledger entry with reason and note', async () => {
    const { data: item } = await clientA
      .from('items')
      .insert({
        user_id: userAId,
        name: 'Eva Water 75cl',
        unit: 'bottle',
        sell_price_minor: 35000,
        current_qty: 12,
      })
      .select()
      .single();

    // Recount: physical recount finds 8 bottles (diff = -4)
    const { data: adjusted, error: adjErr } = await clientA.rpc('adjust_stock', {
      p_item_id: item!.id,
      p_new_qty: 8,
      p_note: 'Recount: 4 bottles damaged/expired',
    });

    expect(adjErr).toBeNull();
    expect(Number(adjusted?.current_qty)).toBe(8);

    // Verify audit entry in ledger
    const { data: auditEntries } = await clientA
      .from('entries')
      .select('*')
      .eq('item_id', item.id)
      .eq('note', 'Recount: 4 bottles damaged/expired');

    expect(auditEntries).toHaveLength(1);
    expect(Number(auditEntries![0].quantity)).toBe(4);
    expect(auditEntries![0].user_id).toBe(userAId);
  });

  it('Section 8 & Migration: validates schema migration idempotency, security definer/invoker, and constraints', () => {
    const migrationPath = path.resolve(
      process.cwd(),
      'supabase/migrations/20261123000000_stock_rules_and_purchases.sql'
    );
    const content = fs.readFileSync(migrationPath, 'utf8');

    // 1. Idempotency checks
    expect(content).toContain('CREATE TABLE IF NOT EXISTS purchases');
    expect(content).toContain('CREATE TABLE IF NOT EXISTS stock_activity');
    expect(content).toMatch(/ALTER\s+TABLE\s+entries[\s\S]*?ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+reason\s+TEXT/i);
    expect(content).toContain('DROP POLICY IF EXISTS "Users own purchases" ON purchases');
    expect(content).toContain('CREATE POLICY "Users own purchases"');
    expect(content).toContain('DROP POLICY IF EXISTS "Users own stock activity" ON stock_activity');
    expect(content).toContain('CREATE POLICY "Users own stock activity"');
    expect(content).toContain('CREATE INDEX IF NOT EXISTS');

    // 2. Non-negative stock constraint check
    expect(content).toContain('CHECK (current_qty >= 0)');

    // 3. Security Definer/Invoker audit:
    // Both commit_entries and adjust_stock must use SECURITY INVOKER so auth.uid() resolves to caller
    expect(content).toMatch(/FUNCTION\s+commit_entries[\s\S]*?SECURITY\s+INVOKER/i);
    expect(content).toMatch(/FUNCTION\s+adjust_stock[\s\S]*?SECURITY\s+INVOKER/i);

    // 4. Atomic row locking to prevent race conditions
    expect(content).toContain('FOR UPDATE');

    // 5. User isolation check in policies:
    expect(content).toContain('USING (auth.uid() = user_id)');
    expect(content).toContain('WITH CHECK (auth.uid() = user_id)');

    // 6. Integer minor units check
    expect(content).toContain('cost_per_pack_minor BIGINT NOT NULL CHECK (cost_per_pack_minor >= 0)');
    expect(content).toContain('total_cost_minor BIGINT NOT NULL CHECK (total_cost_minor >= 0)');
  });
});
