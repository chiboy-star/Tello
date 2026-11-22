import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { CATALOG_ITEMS } from '@/lib/catalog/catalog.data';

export const GET = withAuth(async (req: NextRequest, { user, supabase }) => {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim().toLowerCase();
  const category = searchParams.get('category');
  const categoriesParam = searchParams.get('categories') || category;
  const excludeOwned = searchParams.get('excludeOwned') === '1' || searchParams.get('excludeOwned') === 'true';
  const all = searchParams.get('all') === '1' || searchParams.get('all') === 'true';
  const businessType = all ? null : (searchParams.get('businessType') as 'retail' | 'wholesale' | null);

  // Fetch owned items by current user to flag/filter owned items
  let ownedNames = new Set<string>();
  if (user && supabase && typeof supabase.from === 'function') {
    const { data: userItems } = await supabase
      .from('items')
      .select('name')
      .eq('user_id', user.id)
      .is('archived_at', null);
    if (userItems) {
      ownedNames = new Set(userItems.map((i: { name: string }) => i.name.toLowerCase()));
    }
  }

  let items = [...CATALOG_ITEMS];

  if (businessType && !all) {
    items = items.filter((item) => item.businessTypes.includes(businessType));
  }

  if (categoriesParam) {
    const selectedCats = categoriesParam.split(',').map((c) => c.trim().toLowerCase());
    items = items.filter((item) => selectedCats.includes(item.category.toLowerCase()));
  }

  if (q) {
    items = items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.aliases.some((alias) => alias.toLowerCase().includes(q))
    );
  }

  let responseItems = items.map((item, idx) => ({
    id: `cat-${idx + 1}`,
    category: item.category,
    name: item.name,
    unit: item.unit,
    aliases: item.aliases,
    isDefault: !!item.isDefault,
    refPrice: item.refPrice,
    refPriceSource: item.refPriceSource,
    refPriceConfidence: item.refPriceConfidence,
    owned: ownedNames.has(item.name.toLowerCase()),
  }));

  if (excludeOwned) {
    responseItems = responseItems.filter((item) => !item.owned);
  }

  return NextResponse.json({ items: responseItems });
});
