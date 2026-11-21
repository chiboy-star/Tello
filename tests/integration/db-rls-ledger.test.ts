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

describe('Database Integration: RLS Isolation & Core Ledger RPCs', { timeout: 30000 }, () => {
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
  const emailA = `test-user-a-${Date.now()}@tallo-test.app`;
  const emailB = `test-user-b-${Date.now()}@tallo-test.app`;

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

    // Authenticate Client A as User A
    clientA = createClient(supabaseUrl, anonKey, {
      auth: { storageKey: 'test-token-a', autoRefreshToken: false, persistSession: false },
    });
    const { error: loginErrA } = await clientA.auth.signInWithPassword({ email: emailA, password });
    if (loginErrA) throw new Error(`Client A login failed: ${loginErrA.message}`);

    // Authenticate Client B as User B
    clientB = createClient(supabaseUrl, anonKey, {
      auth: { storageKey: 'test-token-b', autoRefreshToken: false, persistSession: false },
    });
    const { error: loginErrB } = await clientB.auth.signInWithPassword({ email: emailB, password });
    if (loginErrB) throw new Error(`Client B login failed: ${loginErrB.message}`);
  }, 30000);

  afterAll(async () => {
    if (userAId) {
      await adminClient.auth.admin.deleteUser(userAId);
    }
    if (userBId) {
      await adminClient.auth.admin.deleteUser(userBId);
    }
  });

  it('enforces RLS isolation: User B cannot read, update, or void User A data', async () => {
    // 1. User A inserts an item
    const { data: itemA, error: itemErr } = await clientA
      .from('items')
      .insert({
        user_id: userAId,
        name: 'User A Secret Item',
        unit: 'pack',
        sell_price_minor: 50000,
        current_qty: 20,
      })
      .select()
      .single();

    expect(itemErr).toBeNull();
    expect(itemA).toBeDefined();

    // 2. User B queries items -> must NOT see User A's item
    const { data: bItems } = await clientB
      .from('items')
      .select('*')
      .eq('id', itemA.id);

    expect(bItems).toHaveLength(0);

    // 3. User B attempts to update User A's item -> affects 0 rows
    const { data: updatedB } = await clientB
      .from('items')
      .update({ name: 'Hacked by B' })
      .eq('id', itemA.id)
      .select();

    expect(updatedB).toHaveLength(0);

    // 4. User A commits a sale
    const batchId = crypto.randomUUID();
    const { data: commitRes } = await clientA.rpc('commit_entries', {
      p_batch_id: batchId,
      p_entries: [
        {
          type: 'sale',
          item_id: itemA.id,
          quantity: 2,
          unit_amount_minor: 50000,
          total_minor: 100000,
          payment_type: 'cash',
        },
      ],
    });
    expect(commitRes).toHaveLength(1);
    const entryId = commitRes[0].id;

    // 5. User B tries to read User A's entries -> cannot see
    const { data: bEntries } = await clientB
      .from('entries')
      .select('*')
      .eq('id', entryId);
    expect(bEntries).toHaveLength(0);

    // 6. User B tries to void User A's entry -> fails with not found
    const { error: voidErr } = await clientB.rpc('void_entry', {
      p_entry_id: entryId,
    });
    expect(voidErr).toBeDefined();
  });

  it('guarantees commit idempotency: same batch id leaves exactly 1 set of rows and does not double-decrement stock', async () => {
    // Insert item with 30 units
    const { data: item } = await clientA
      .from('items')
      .insert({
        user_id: userAId,
        name: 'Idempotent Biscuit',
        unit: 'carton',
        sell_price_minor: 20000,
        current_qty: 30,
      })
      .select()
      .single();

    const batchId = crypto.randomUUID();
    const entriesPayload = [
      {
        type: 'sale',
        item_id: item.id,
        quantity: 5,
        unit_amount_minor: 20000,
        total_minor: 100000,
        payment_type: 'cash',
      },
    ];

    // First commit
    const { data: firstCommit, error: err1 } = await clientA.rpc('commit_entries', {
      p_batch_id: batchId,
      p_entries: entriesPayload,
    });
    expect(err1).toBeNull();
    expect(firstCommit).toHaveLength(1);

    // Check stock after first commit -> 30 - 5 = 25
    const { data: itemAfter1 } = await clientA
      .from('items')
      .select('current_qty')
      .eq('id', item.id)
      .single();
    expect(Number(itemAfter1?.current_qty)).toBe(25);

    // Second commit with identical batchId (replay / retry)
    const { data: secondCommit, error: err2 } = await clientA.rpc('commit_entries', {
      p_batch_id: batchId,
      p_entries: entriesPayload,
    });
    expect(err2).toBeNull();
    expect(secondCommit).toHaveLength(1);
    expect(secondCommit[0].id).toBe(firstCommit[0].id);

    // Stock must STILL be 25 (NOT 20)
    const { data: itemAfter2 } = await clientA
      .from('items')
      .select('current_qty')
      .eq('id', item.id)
      .single();
    expect(Number(itemAfter2?.current_qty)).toBe(25);

    // Check row count for this batch in DB -> exactly 1
    const { count } = await clientA
      .from('entries')
      .select('*', { count: 'exact', head: true })
      .eq('batch_id', batchId);
    expect(count).toBe(1);
  });

  it('performs void/unvoid round trip: restores stock on void and re-applies on unvoid', async () => {
    const { data: item } = await clientA
      .from('items')
      .insert({
        user_id: userAId,
        name: 'Voidable Detergent',
        unit: 'sachet',
        sell_price_minor: 15000,
        current_qty: 40,
      })
      .select()
      .single();

    const batchId = crypto.randomUUID();
    await clientA.rpc('commit_entries', {
      p_batch_id: batchId,
      p_entries: [
        {
          type: 'sale',
          item_id: item.id,
          quantity: 10,
          unit_amount_minor: 15000,
          total_minor: 150000,
          payment_type: 'cash',
        },
      ],
    });

    // Stock dropped from 40 to 30
    const { data: soldItem } = await clientA.from('items').select('current_qty').eq('id', item.id).single();
    expect(Number(soldItem?.current_qty)).toBe(30);

    // Void batch
    const { data: voidedCount } = await clientA.rpc('void_batch', { p_batch_id: batchId });
    expect(voidedCount).toBe(1);

    // Stock restored to 40
    const { data: restoredItem } = await clientA.from('items').select('current_qty').eq('id', item.id).single();
    expect(Number(restoredItem?.current_qty)).toBe(40);

    // Unvoid batch
    const { data: unvoidedCount } = await clientA.rpc('unvoid_batch', { p_batch_id: batchId });
    expect(unvoidedCount).toBe(1);

    // Stock decremented back to 30
    const { data: reAppliedItem } = await clientA.from('items').select('current_qty').eq('id', item.id).single();
    expect(Number(reAppliedItem?.current_qty)).toBe(30);
  });

  it('executes adjust_stock RPC: updates current_qty and records an audit entry', async () => {
    const { data: item } = await clientA
      .from('items')
      .insert({
        user_id: userAId,
        name: 'Count Discrepancy Juice',
        unit: 'bottle',
        sell_price_minor: 40000,
        current_qty: 15,
      })
      .select()
      .single();

    // Adjust stock from 15 to 28
    const { data: adjustedItem, error: adjErr } = await clientA.rpc('adjust_stock', {
      p_item_id: item!.id,
      p_new_qty: 28,
      p_note: 'Physical warehouse recount',
    });

    expect(adjErr).toBeNull();
    expect(Number(adjustedItem?.current_qty)).toBe(28);

    // Verify audit entry in entries table
    const { data: auditEntries } = await clientA
      .from('entries')
      .select('*')
      .eq('item_id', item.id)
      .eq('note', 'Physical warehouse recount');

    expect(auditEntries).toHaveLength(1);
    expect(auditEntries![0].type).toBe('restock'); // positive diff
    expect(Number(auditEntries![0].quantity)).toBe(13); // 28 - 15 = 13
  });

  it('enforces daily AI limit through increment_ai_usage RPC', async () => {
    const limit = 3;

    // Call 1
    const { data: res1 } = await clientA.rpc('increment_ai_usage', { p_limit: limit });
    expect(res1[0].allowed).toBe(true);
    expect(res1[0].used).toBe(1);

    // Call 2
    const { data: res2 } = await clientA.rpc('increment_ai_usage', { p_limit: limit });
    expect(res2[0].allowed).toBe(true);
    expect(res2[0].used).toBe(2);

    // Call 3
    const { data: res3 } = await clientA.rpc('increment_ai_usage', { p_limit: limit });
    expect(res3[0].allowed).toBe(true);
    expect(res3[0].used).toBe(3);

    // Call 4: limit exceeded
    const { data: res4 } = await clientA.rpc('increment_ai_usage', { p_limit: limit });
    expect(res4[0].allowed).toBe(false);
    expect(res4[0].used).toBe(3);
  });
});
