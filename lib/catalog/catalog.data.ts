export interface CatalogSeedItem {
  category: 'everyday' | 'food' | 'drinks' | 'household' | 'personal_care';
  name: string;
  unit: string;
  aliases: string[];
  businessTypes: ('retail' | 'wholesale')[];
  isDefault?: boolean;
  sortOrder?: number;
  refPrice: number | null; // NGN retail price
  refPriceSource?: string;
  refPriceConfidence?: 'high' | 'medium' | 'low';
}

export const CATALOG_ITEMS: CatalogSeedItem[] = [
  // --- EVERYDAY (Snacks & Basics) ---
  { category: 'everyday', name: 'Indomie Chicken', unit: 'pack', aliases: ['indomie', 'noodles', 'chicken indomie'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 1, refPrice: 150, refPriceSource: 'NBS / Retail FMCG', refPriceConfidence: 'high' },
  { category: 'everyday', name: 'Indomie Onion', unit: 'pack', aliases: ['onion indomie', 'indomie onion'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 2, refPrice: 150, refPriceSource: 'Retail FMCG', refPriceConfidence: 'high' },
  { category: 'everyday', name: 'Indomie Superpack', unit: 'pack', aliases: ['superpack', 'big indomie'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 3, refPrice: 250, refPriceSource: 'Pricepally / FMCG', refPriceConfidence: 'high' },
  { category: 'everyday', name: 'Pure Water', unit: 'sachet', aliases: ['water', 'sachet water'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 4, refPrice: 50, refPriceSource: 'National Retail Index', refPriceConfidence: 'high' },
  { category: 'everyday', name: 'Bottled Water 75cl', unit: 'bottle', aliases: ['table water', 'eva water', 'nestle water'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 5, refPrice: 200, refPriceSource: 'Supermart / Nestle Retail', refPriceConfidence: 'high' },
  { category: 'everyday', name: 'Cabin Biscuit', unit: 'pack', aliases: ['cabin', 'biscuit'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 6, refPrice: 150, refPriceSource: 'Konga / Supermart', refPriceConfidence: 'high' },
  { category: 'everyday', name: 'Coaster Biscuit', unit: 'pack', aliases: ['coaster'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 7, refPrice: 100, refPriceSource: 'Konga / Supermart', refPriceConfidence: 'high' },
  { category: 'everyday', name: 'Minimie Chinchin', unit: 'pack', aliases: ['chinchin', 'minimie'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 8, refPrice: 150, refPriceSource: 'Supermart / Minimie', refPriceConfidence: 'high' },
  { category: 'everyday', name: 'Gala Sausage', unit: 'piece', aliases: ['gala', 'sausage roll', 'meat pie'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 9, refPrice: 200, refPriceSource: 'UAC Foods', refPriceConfidence: 'high' },
  { category: 'everyday', name: 'Tom Tom Candy', unit: 'piece', aliases: ['tom tom', 'sweet', 'mint'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 10, refPrice: 20, refPriceSource: 'Cadbury Retail', refPriceConfidence: 'high' },
  { category: 'everyday', name: 'Buttermint Candy', unit: 'piece', aliases: ['buttermint', 'sweet'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 11, refPrice: 20, refPriceSource: 'Cadbury Retail', refPriceConfidence: 'high' },
  { category: 'everyday', name: 'Chewing Gum (Orbit)', unit: 'piece', aliases: ['orbit', 'gum'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 12, refPrice: 100, refPriceSource: 'Supermart / Wrigley', refPriceConfidence: 'medium' },
  { category: 'everyday', name: 'Plantain Chips', unit: 'pack', aliases: ['dodo chips', 'chips'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 13, refPrice: 250, refPriceSource: 'Pricepally Retail', refPriceConfidence: 'medium' },
  { category: 'everyday', name: 'Groundnut 1 Bottle', unit: 'bottle', aliases: ['peanuts', 'epa'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 14, refPrice: 1200, refPriceSource: 'Pricepally / Open Market', refPriceConfidence: 'medium' },
  { category: 'everyday', name: 'Bread (Family Loaf)', unit: 'loaf', aliases: ['sliced bread', 'agege bread'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 15, refPrice: 1200, refPriceSource: 'NBS Selected Food Prices', refPriceConfidence: 'high' },

  // --- FOOD (Cooking Ingredients & Staples) ---
  { category: 'food', name: 'Rice', unit: 'derica', aliases: ['local rice', 'foreign rice', 'shinkafa'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 16, refPrice: 1600, refPriceSource: 'NBS Selected Food Prices', refPriceConfidence: 'high' },
  { category: 'food', name: 'Beans (Oloyin)', unit: 'derica', aliases: ['honey beans', 'brown beans', 'ewa'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 17, refPrice: 2300, refPriceSource: 'NBS Selected Food Prices', refPriceConfidence: 'high' },
  { category: 'food', name: 'Garri (White)', unit: 'derica', aliases: ['gari', 'ijebu garri', 'cassava flakes'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 18, refPrice: 900, refPriceSource: 'NBS Selected Food Prices', refPriceConfidence: 'high' },
  { category: 'food', name: 'Garri (Yellow)', unit: 'derica', aliases: ['yellow garri', 'gari'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 19, refPrice: 950, refPriceSource: 'NBS Selected Food Prices', refPriceConfidence: 'high' },
  { category: 'food', name: 'Vegetable Oil', unit: 'bottle', aliases: ['cooking oil', 'groundnut oil', 'kings oil'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 20, refPrice: 1800, refPriceSource: 'NBS Selected Food Prices', refPriceConfidence: 'high' },
  { category: 'food', name: 'Palm Oil', unit: 'bottle', aliases: ['red oil', 'epo'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 21, refPrice: 1600, refPriceSource: 'NBS Selected Food Prices', refPriceConfidence: 'high' },
  { category: 'food', name: 'Tomato Paste (Gino/De Rica)', unit: 'sachet', aliases: ['tin tomato', 'tomato sachet', 'derica sachet'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 22, refPrice: 250, refPriceSource: 'Foodlocker / Retail Index', refPriceConfidence: 'high' },
  { category: 'food', name: 'Maggi Star Cubes', unit: 'pack', aliases: ['maggi', 'seasoning cube'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 23, refPrice: 1200, refPriceSource: 'Nestle Nigeria Retail', refPriceConfidence: 'high' },
  { category: 'food', name: 'Knorr Chicken Cubes', unit: 'pack', aliases: ['knorr', 'seasoning'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 24, refPrice: 1400, refPriceSource: 'Unilever Nigeria Retail', refPriceConfidence: 'high' },
  { category: 'food', name: 'Salt (Dangote)', unit: 'sachet', aliases: ['table salt', 'dangote salt'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 25, refPrice: 200, refPriceSource: 'Dangote Retail Index', refPriceConfidence: 'high' },
  { category: 'food', name: 'Sugar (St. Louis Cube)', unit: 'packet', aliases: ['st louis', 'sugar'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 26, refPrice: 1500, refPriceSource: 'Supermart Retail', refPriceConfidence: 'high' },
  { category: 'food', name: 'Semovita (Golden Penny 1kg)', unit: 'pack', aliases: ['semo', 'semolina'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 27, refPrice: 1800, refPriceSource: 'Flour Mills of Nigeria', refPriceConfidence: 'high' },
  { category: 'food', name: 'Spaghetti (Golden Penny)', unit: 'pack', aliases: ['pasta', 'spag'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 28, refPrice: 700, refPriceSource: 'Flour Mills of Nigeria', refPriceConfidence: 'high' },
  { category: 'food', name: 'Macaroni', unit: 'pack', aliases: ['pasta'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 29, refPrice: 700, refPriceSource: 'FMCG Retail Index', refPriceConfidence: 'high' },
  { category: 'food', name: 'Curry Powder Sachet', unit: 'sachet', aliases: ['curry', 'spices'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 30, refPrice: 100, refPriceSource: 'Tiger / Supermart', refPriceConfidence: 'high' },

  // --- DRINKS ---
  { category: 'drinks', name: 'Coca-Cola 50cl', unit: 'bottle', aliases: ['coke', 'soft drink'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 31, refPrice: 400, refPriceSource: 'NBC / Coca-Cola Retail', refPriceConfidence: 'high' },
  { category: 'drinks', name: 'Fanta Orange 50cl', unit: 'bottle', aliases: ['fanta', 'soft drink'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 32, refPrice: 400, refPriceSource: 'NBC Retail', refPriceConfidence: 'high' },
  { category: 'drinks', name: 'Sprite 50cl', unit: 'bottle', aliases: ['sprite'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 33, refPrice: 400, refPriceSource: 'NBC Retail', refPriceConfidence: 'high' },
  { category: 'drinks', name: 'Pepsi 50cl', unit: 'bottle', aliases: ['pepsi'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 34, refPrice: 350, refPriceSource: 'Seven-Up Bottling Co', refPriceConfidence: 'high' },
  { category: 'drinks', name: 'Maltina Can', unit: 'can', aliases: ['malt', 'maltina'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 35, refPrice: 450, refPriceSource: 'Nigerian Breweries', refPriceConfidence: 'high' },
  { category: 'drinks', name: 'Amstel Malta', unit: 'can', aliases: ['amstel', 'malt'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 36, refPrice: 450, refPriceSource: 'Nigerian Breweries', refPriceConfidence: 'high' },
  { category: 'drinks', name: 'Peak Milk Sachet', unit: 'sachet', aliases: ['peak milk', 'milk sachet'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 37, refPrice: 180, refPriceSource: 'FrieslandCampina WAMCO', refPriceConfidence: 'high' },
  { category: 'drinks', name: 'Peak Milk Tin', unit: 'tin', aliases: ['evaporated milk', 'peak tin'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 38, refPrice: 650, refPriceSource: 'FrieslandCampina WAMCO', refPriceConfidence: 'high' },
  { category: 'drinks', name: 'Milo Sachet', unit: 'sachet', aliases: ['milo', 'chocolate drink'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 39, refPrice: 180, refPriceSource: 'Nestle Nigeria', refPriceConfidence: 'high' },
  { category: 'drinks', name: 'Dano Milk Sachet', unit: 'sachet', aliases: ['dano', 'powdered milk'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 40, refPrice: 150, refPriceSource: 'Arla Dano Retail', refPriceConfidence: 'high' },
  { category: 'drinks', name: 'Chi Exotic Juice 1L', unit: 'carton', aliases: ['chi exotic', 'juice'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 41, refPrice: 1400, refPriceSource: 'Chi Limited Retail', refPriceConfidence: 'high' },
  { category: 'drinks', name: 'Hollandia Yoghurt 1L', unit: 'carton', aliases: ['hollandia', 'yoghurt'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 42, refPrice: 1600, refPriceSource: 'Chi Limited Retail', refPriceConfidence: 'high' },
  { category: 'drinks', name: 'Zobo Drink', unit: 'bottle', aliases: ['zobo'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 43, refPrice: 300, refPriceSource: 'Local Market Aggregator', refPriceConfidence: 'medium' },
  { category: 'drinks', name: 'Lucozade Boost 50cl', unit: 'bottle', aliases: ['lucozade', 'energy drink'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 44, refPrice: 600, refPriceSource: 'Suntory / Supermart', refPriceConfidence: 'high' },
  { category: 'drinks', name: 'Fearless Energy Drink', unit: 'can', aliases: ['fearless', 'energy drink'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 45, refPrice: 400, refPriceSource: 'Rite Foods Retail', refPriceConfidence: 'high' },

  // --- HOUSEHOLD ---
  { category: 'household', name: 'Ariel Detergent Sachet', unit: 'sachet', aliases: ['ariel', 'washing powder'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 46, refPrice: 200, refPriceSource: 'Procter & Gamble', refPriceConfidence: 'high' },
  { category: 'household', name: 'Omo Detergent Sachet', unit: 'sachet', aliases: ['omo', 'detergent'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 47, refPrice: 200, refPriceSource: 'Unilever Nigeria', refPriceConfidence: 'high' },
  { category: 'household', name: 'Viva Detergent Sachet', unit: 'sachet', aliases: ['viva', 'soap powder'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 48, refPrice: 150, refPriceSource: 'Aspira Nigeria', refPriceConfidence: 'high' },
  { category: 'household', name: 'Sunlight Washing Bar Soap', unit: 'bar', aliases: ['sunlight soap', 'bar soap'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 49, refPrice: 350, refPriceSource: 'Unilever Nigeria', refPriceConfidence: 'high' },
  { category: 'household', name: 'Morning Fresh Dishwash 450ml', unit: 'bottle', aliases: ['morning fresh', 'dish soap'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 50, refPrice: 1300, refPriceSource: 'PZ Cussons Retail', refPriceConfidence: 'high' },
  { category: 'household', name: 'Hypo Bleach Sachet', unit: 'sachet', aliases: ['hypo', 'bleach'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 51, refPrice: 100, refPriceSource: 'Supermart Retail', refPriceConfidence: 'high' },
  { category: 'household', name: 'Jik Bleach', unit: 'bottle', aliases: ['jik', 'bleach'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 52, refPrice: 850, refPriceSource: 'Reckitt Nigeria', refPriceConfidence: 'high' },
  { category: 'household', name: 'Matches (Three Stars)', unit: 'box', aliases: ['matches', 'matchbox'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 53, refPrice: 50, refPriceSource: 'Retail FMCG', refPriceConfidence: 'high' },
  { category: 'household', name: 'Candle (Pack of 6)', unit: 'pack', aliases: ['candle', 'candles'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 54, refPrice: 600, refPriceSource: 'Supermart Retail', refPriceConfidence: 'medium' },
  { category: 'household', name: 'Raid Insecticide 300ml', unit: 'can', aliases: ['raid', 'flit', 'insect spray'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 55, refPrice: 2200, refPriceSource: 'SC Johnson Retail', refPriceConfidence: 'high' },
  { category: 'household', name: 'Sniper (Pack)', unit: 'bottle', aliases: ['sniper'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 56, refPrice: 1100, refPriceSource: 'Retail Index', refPriceConfidence: 'medium' },
  { category: 'household', name: 'Iron Sponge / Steel Wool', unit: 'piece', aliases: ['iron sponge', 'pot scrubber'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 57, refPrice: 100, refPriceSource: 'Supermart Retail', refPriceConfidence: 'high' },
  { category: 'household', name: 'Toilet Roll (Bel Impex)', unit: 'roll', aliases: ['tissue', 'toilet paper'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 58, refPrice: 250, refPriceSource: 'Bel Impex Retail', refPriceConfidence: 'high' },
  { category: 'household', name: 'Nylon Bags (Small roll)', unit: 'roll', aliases: ['leather', 'shopping nylon'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 59, refPrice: 500, refPriceSource: 'Pricepally Retail', refPriceConfidence: 'medium' },
  { category: 'household', name: 'Mosquito Coil', unit: 'pack', aliases: ['coil'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 60, refPrice: 350, refPriceSource: 'Supermart Retail', refPriceConfidence: 'high' },

  // --- PERSONAL CARE ---
  { category: 'personal_care', name: 'Close-Up Toothpaste 130g', unit: 'piece', aliases: ['closeup', 'toothpaste'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 61, refPrice: 800, refPriceSource: 'Unilever Nigeria', refPriceConfidence: 'high' },
  { category: 'personal_care', name: 'Oral-B Toothpaste', unit: 'piece', aliases: ['oral b', 'toothpaste'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 62, refPrice: 900, refPriceSource: 'Procter & Gamble', refPriceConfidence: 'high' },
  { category: 'personal_care', name: 'Toothbrush (Adult)', unit: 'piece', aliases: ['toothbrush'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 63, refPrice: 250, refPriceSource: 'Supermart Retail', refPriceConfidence: 'high' },
  { category: 'personal_care', name: 'Dettol Bathing Soap', unit: 'piece', aliases: ['dettol soap', 'soap'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 64, refPrice: 600, refPriceSource: 'Reckitt Nigeria', refPriceConfidence: 'high' },
  { category: 'personal_care', name: 'Premier Cool Soap', unit: 'piece', aliases: ['premier soap'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 65, refPrice: 500, refPriceSource: 'PZ Cussons Retail', refPriceConfidence: 'high' },
  { category: 'personal_care', name: 'Always Sanitary Pads', unit: 'pack', aliases: ['always pad', 'sanitary towel'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 66, refPrice: 1100, refPriceSource: 'Procter & Gamble', refPriceConfidence: 'high' },
  { category: 'personal_care', name: 'Molped Pads', unit: 'pack', aliases: ['molped', 'pad'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 67, refPrice: 900, refPriceSource: 'Hayat Kimya', refPriceConfidence: 'high' },
  { category: 'personal_care', name: 'Vaseline Petroleum Jelly 100ml', unit: 'jar', aliases: ['vaseline', 'pomade'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 68, refPrice: 1000, refPriceSource: 'Unilever Nigeria', refPriceConfidence: 'high' },
  { category: 'personal_care', name: 'Nivea Body Lotion', unit: 'bottle', aliases: ['cream', 'lotion'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 69, refPrice: 3800, refPriceSource: 'Beiersdorf Retail', refPriceConfidence: 'high' },
  { category: 'personal_care', name: 'Cotton Buds', unit: 'pack', aliases: ['earbuds', 'cotton buds'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 70, refPrice: 300, refPriceSource: 'Supermart Retail', refPriceConfidence: 'high' },
  { category: 'personal_care', name: 'Shaving Razor (Gillette/Dorco)', unit: 'piece', aliases: ['razor', 'shaving stick'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 71, refPrice: 200, refPriceSource: 'Supermart Retail', refPriceConfidence: 'high' },
  { category: 'personal_care', name: 'Paracetamol Tablets', unit: 'sachet', aliases: ['panadol', 'paracetamol', 'painkiller'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 72, refPrice: 150, refPriceSource: 'Emzor Pharmaceuticals', refPriceConfidence: 'high' },
  { category: 'personal_care', name: 'Methylated Spirit 100ml', unit: 'bottle', aliases: ['spirit'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 73, refPrice: 400, refPriceSource: 'Supermart Retail', refPriceConfidence: 'high' },
  { category: 'personal_care', name: 'Robb Balm (Small)', unit: 'piece', aliases: ['robb', 'menthol balm'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 74, refPrice: 300, refPriceSource: 'PZ Cussons Retail', refPriceConfidence: 'high' },
  { category: 'personal_care', name: 'Pocket Tissue', unit: 'pack', aliases: ['hanky', 'handkerchief'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 75, refPrice: 100, refPriceSource: 'Bel Impex Retail', refPriceConfidence: 'high' },
];

export function getCatalogItemById(id: string): (CatalogSeedItem & { id: string }) | undefined {
  const all = CATALOG_ITEMS.map((c) => ({
    ...c,
    id: `cat_${c.category}_${c.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
  }));
  return all.find((item) => item.id === id);
}
