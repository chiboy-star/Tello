import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { CATALOG_ITEMS } from '@/lib/catalog/catalog.data';

export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const businessType = searchParams.get('businessType') as 'retail' | 'wholesale' | null;
  const categoriesParam = searchParams.get('categories');

  let items = [...CATALOG_ITEMS];

  if (businessType) {
    items = items.filter((item) => item.businessTypes.includes(businessType));
  }

  if (categoriesParam) {
    const selectedCats = categoriesParam.split(',').map((c) => c.trim().toLowerCase());
    items = items.filter((item) => selectedCats.includes(item.category.toLowerCase()));
  }

  const responseItems = items.map((item, idx) => ({
    id: `cat-${idx + 1}`,
    category: item.category,
    name: item.name,
    unit: item.unit,
    aliases: item.aliases,
    isDefault: !!item.isDefault,
  }));

  return NextResponse.json({ items: responseItems });
});
