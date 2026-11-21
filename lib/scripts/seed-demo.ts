import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Helper to load .env.local if not already in process.env
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

async function seedDemoData() {
  loadEnv();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey || supabaseUrl.includes('placeholder')) {
    console.error('[seed:demo] Supabase URL or Service key is missing or placeholder.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log('--- Tallo Demo Account Seeder ---');
  const demoEmail = process.env.DEMO_EMAIL || 'demo@tallo.app';
  const demoPassword = process.env.DEMO_PASSWORD;

  if (!demoPassword) {
    console.error('[seed:demo] DEMO_PASSWORD environment variable is required.');
    process.exit(1);
  }

  // 1. Get or create demo user
  let userId: string;
  const { data: userList } = await supabase.auth.admin.listUsers();
  const existingUser = userList?.users?.find((u) => u.email === demoEmail);

  if (existingUser) {
    userId = existingUser.id;
    console.log(`Found existing demo user: ${demoEmail} (${userId})`);
  } else {
    const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
      email: demoEmail,
      password: demoPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Mama Tallo' },
    });
    if (createErr || !newUser?.user) {
      throw new Error(`Failed to create demo user: ${createErr?.message}`);
    }
    userId = newUser.user.id;
    console.log(`Created new demo user: ${demoEmail} (${userId})`);
  }

  // 2. Upsert Profile
  const { error: profErr } = await supabase.from('profiles').upsert({
    id: userId,
    full_name: 'Mama Tallo',
    shop_name: 'Mama Tallo Provisions Store',
    business_type: 'retail',
    currency: 'NGN',
    timezone: 'Africa/Lagos',
    onboarded_at: new Date().toISOString(),
  });
  if (profErr) console.warn('Profile upsert notice:', profErr.message);

  // 3. Clear existing user data to ensure clean seed
  await supabase.from('entries').delete().eq('user_id', userId);
  await supabase.from('items').delete().eq('user_id', userId);
  await supabase.from('customers').delete().eq('user_id', userId);

  // 4. Seed Items
  const initialItems = [
    { name: 'Indomie Chicken 70g', unit: 'pack', sell_price_minor: 35000, cost_price_minor: 28000, current_qty: 48, reorder_lead_days: 2, category: 'food' },
    { name: 'Dangote Sugar 500g', unit: 'packet', sell_price_minor: 90000, cost_price_minor: 75000, current_qty: 25, reorder_lead_days: 3, category: 'food' },
    { name: 'Golden Penny Spaghetti', unit: 'pack', sell_price_minor: 75000, cost_price_minor: 60000, current_qty: 30, reorder_lead_days: 2, category: 'food' },
    { name: 'Peak Milk Evaporated 160g', unit: 'tin', sell_price_minor: 65000, cost_price_minor: 52000, current_qty: 36, reorder_lead_days: 2, category: 'everyday' },
    { name: 'Milo Refill 500g', unit: 'pack', sell_price_minor: 280000, cost_price_minor: 230000, current_qty: 14, reorder_lead_days: 4, category: 'drinks' },
    { name: 'Coca-Cola 50cl PET', unit: 'bottle', sell_price_minor: 30000, cost_price_minor: 22000, current_qty: 60, reorder_lead_days: 1, category: 'drinks' },
    { name: 'Pure Water (Bag)', unit: 'bag', sell_price_minor: 35000, cost_price_minor: 25000, current_qty: 40, reorder_lead_days: 1, category: 'everyday' },
  ];

  const { data: insertedItems, error: itemErr } = await supabase
    .from('items')
    .insert(initialItems.map((item) => ({ ...item, user_id: userId })))
    .select();

  if (itemErr || !insertedItems) {
    throw new Error(`Failed to insert items: ${itemErr?.message}`);
  }
  console.log(`Inserted ${insertedItems.length} inventory items.`);

  // 5. Seed Customers
  const initialCustomers = [
    { name: 'Ibrahim Suleiman', phone: '08012345678' },
    { name: 'Chioma Okafor', phone: '08087654321' },
    { name: 'Baba Aisha', phone: '08055554433' },
  ];

  const { data: insertedCustomers, error: custErr } = await supabase
    .from('customers')
    .insert(initialCustomers.map((cust) => ({ ...cust, user_id: userId })))
    .select();

  if (custErr || !insertedCustomers) {
    throw new Error(`Failed to insert customers: ${custErr?.message}`);
  }
  console.log(`Inserted ${insertedCustomers.length} customers.`);

  // 6. Generate 30 days of realistic transactions
  const now = new Date();
  const entriesToInsert: any[] = [];

  for (let dayOffset = 30; dayOffset >= 0; dayOffset--) {
    const txDate = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
    // 2-5 transactions per day
    const txCount = 2 + (dayOffset % 4);

    for (let t = 0; t < txCount; t++) {
      const batchId = crypto.randomUUID();
      const item = insertedItems[t % insertedItems.length];
      const isCredit = t === 0 && dayOffset % 5 === 0;
      const customer = isCredit ? insertedCustomers[dayOffset % insertedCustomers.length] : null;
      const qty = 1 + (t % 3);
      const totalMinor = (item.sell_price_minor || 35000) * qty;

      entriesToInsert.push({
        user_id: userId,
        batch_id: batchId,
        line_no: 0,
        type: 'sale',
        item_id: item.id,
        customer_id: customer?.id || null,
        quantity: qty,
        unit_amount_minor: item.sell_price_minor,
        total_minor: totalMinor,
        payment_type: isCredit ? 'credit' : 'cash',
        source: 'tap',
        occurred_at: txDate.toISOString(),
        created_at: txDate.toISOString(),
      });
    }

    // Occasional restock
    if (dayOffset % 10 === 0) {
      const batchId = crypto.randomUUID();
      const item = insertedItems[dayOffset % insertedItems.length];
      const costMinor = item.cost_price_minor || 25000;
      entriesToInsert.push({
        user_id: userId,
        batch_id: batchId,
        line_no: 0,
        type: 'restock',
        item_id: item.id,
        customer_id: null,
        quantity: 20,
        unit_amount_minor: costMinor,
        total_minor: costMinor * 20,
        payment_type: 'cash',
        source: 'text',
        occurred_at: txDate.toISOString(),
        created_at: txDate.toISOString(),
      });
    }

    // Occasional debt payment
    if (dayOffset % 7 === 0) {
      const batchId = crypto.randomUUID();
      const customer = insertedCustomers[dayOffset % insertedCustomers.length];
      entriesToInsert.push({
        user_id: userId,
        batch_id: batchId,
        line_no: 0,
        type: 'debt_payment',
        item_id: null,
        customer_id: customer.id,
        quantity: null,
        unit_amount_minor: null,
        total_minor: 50000,
        payment_type: 'cash',
        source: 'tap',
        occurred_at: txDate.toISOString(),
        created_at: txDate.toISOString(),
      });
    }
  }

  const chunkSize = 50;
  for (let i = 0; i < entriesToInsert.length; i += chunkSize) {
    const chunk = entriesToInsert.slice(i, i + chunkSize);
    const { error: eErr } = await supabase.from('entries').insert(chunk);
    if (eErr) throw new Error(`Failed to insert entries chunk: ${eErr.message}`);
  }

  // 7. Report Row Counts
  const { count: itemCount } = await supabase.from('items').select('*', { count: 'exact', head: true }).eq('user_id', userId);
  const { count: custCount } = await supabase.from('customers').select('*', { count: 'exact', head: true }).eq('user_id', userId);
  const { count: entryCount } = await supabase.from('entries').select('*', { count: 'exact', head: true }).eq('user_id', userId);

  console.log('\n=== Demo Seeding Summary ===');
  console.log(`Demo User ID:    ${userId}`);
  console.log(`Items count:     ${itemCount}`);
  console.log(`Customers count: ${custCount}`);
  console.log(`Entries count:   ${entryCount}`);
  console.log('Demo seed completed successfully.');
}

seedDemoData().catch((err) => {
  console.error('Seed demo failed:', err);
  process.exit(1);
});
