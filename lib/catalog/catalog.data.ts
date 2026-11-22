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
  { category: 'everyday', name: 'Indomie Chicken', unit: 'pack', aliases: ['indomie', 'noodles', 'chicken indomie'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 1, refPrice: 150, refPriceSource: 'https://nigerianstat.gov.ng', refPriceConfidence: 'high' },
  { category: 'everyday', name: 'Indomie Onion', unit: 'pack', aliases: ['onion indomie', 'indomie onion'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 2, refPrice: 150, refPriceSource: 'https://nigerianstat.gov.ng', refPriceConfidence: 'high' },
  { category: 'everyday', name: 'Indomie Superpack', unit: 'pack', aliases: ['superpack', 'big indomie'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 3, refPrice: 250, refPriceSource: 'https://supermart.ng', refPriceConfidence: 'high' },
  { category: 'everyday', name: 'Pure Water', unit: 'sachet', aliases: ['water', 'sachet water'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 4, refPrice: 50, refPriceSource: 'https://nigerianstat.gov.ng', refPriceConfidence: 'high' },
  { category: 'everyday', name: 'Bottled Water 75cl', unit: 'bottle', aliases: ['table water', 'eva water', 'nestle water'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 5, refPrice: 200, refPriceSource: 'https://supermart.ng', refPriceConfidence: 'high' },
  { category: 'everyday', name: 'Cabin Biscuit', unit: 'pack', aliases: ['cabin', 'biscuit'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 6, refPrice: null },
  { category: 'everyday', name: 'Coaster Biscuit', unit: 'pack', aliases: ['coaster'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 7, refPrice: null },
  { category: 'everyday', name: 'Minimie Chinchin', unit: 'pack', aliases: ['chinchin', 'minimie'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 8, refPrice: null },
  { category: 'everyday', name: 'Gala Sausage', unit: 'piece', aliases: ['gala', 'sausage roll', 'meat pie'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 9, refPrice: 200, refPriceSource: 'https://supermart.ng', refPriceConfidence: 'high' },
  { category: 'everyday', name: 'Tom Tom Candy', unit: 'piece', aliases: ['tom tom', 'sweet', 'mint'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 10, refPrice: null },
  { category: 'everyday', name: 'Buttermint Candy', unit: 'piece', aliases: ['buttermint', 'sweet'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 11, refPrice: null },
  { category: 'everyday', name: 'Chewing Gum (Orbit)', unit: 'piece', aliases: ['orbit', 'gum'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 12, refPrice: null },
  { category: 'everyday', name: 'Plantain Chips', unit: 'pack', aliases: ['dodo chips', 'chips'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 13, refPrice: null },
  { category: 'everyday', name: 'Groundnut 1 Bottle', unit: 'bottle', aliases: ['peanuts', 'epa'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 14, refPrice: null },
  { category: 'everyday', name: 'Bread (Family Loaf)', unit: 'loaf', aliases: ['sliced bread', 'agege bread'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 15, refPrice: 1200, refPriceSource: 'https://nigerianstat.gov.ng', refPriceConfidence: 'low' },

  // --- FOOD (Cooking Ingredients & Staples) ---
  { category: 'food', name: 'Rice', unit: 'derica', aliases: ['local rice', 'foreign rice', 'shinkafa'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 16, refPrice: 1600, refPriceSource: 'https://nigerianstat.gov.ng', refPriceConfidence: 'low' },
  { category: 'food', name: 'Beans (Oloyin)', unit: 'derica', aliases: ['honey beans', 'brown beans', 'ewa'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 17, refPrice: 2300, refPriceSource: 'https://nigerianstat.gov.ng', refPriceConfidence: 'low' },
  { category: 'food', name: 'Garri (White)', unit: 'derica', aliases: ['gari', 'ijebu garri', 'cassava flakes'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 18, refPrice: 900, refPriceSource: 'https://nigerianstat.gov.ng', refPriceConfidence: 'low' },
  { category: 'food', name: 'Garri (Yellow)', unit: 'derica', aliases: ['yellow garri', 'gari'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 19, refPrice: 950, refPriceSource: 'https://nigerianstat.gov.ng', refPriceConfidence: 'low' },
  { category: 'food', name: 'Vegetable Oil', unit: 'bottle', aliases: ['cooking oil', 'groundnut oil', 'kings oil'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 20, refPrice: 1800, refPriceSource: 'https://nigerianstat.gov.ng', refPriceConfidence: 'low' },
  { category: 'food', name: 'Palm Oil', unit: 'bottle', aliases: ['red oil', 'epo'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 21, refPrice: 1600, refPriceSource: 'https://nigerianstat.gov.ng', refPriceConfidence: 'low' },
  { category: 'food', name: 'Tomato Paste (Gino/De Rica)', unit: 'sachet', aliases: ['tin tomato', 'tomato sachet', 'derica sachet'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 22, refPrice: null },
  { category: 'food', name: 'Maggi Star Cubes', unit: 'pack', aliases: ['maggi', 'seasoning cube'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 23, refPrice: null },
  { category: 'food', name: 'Knorr Chicken Cubes', unit: 'pack', aliases: ['knorr', 'seasoning'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 24, refPrice: null },
  { category: 'food', name: 'Salt (Dangote)', unit: 'sachet', aliases: ['table salt', 'dangote salt'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 25, refPrice: null },
  { category: 'food', name: 'Sugar (St. Louis Cube)', unit: 'packet', aliases: ['st louis', 'sugar'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 26, refPrice: null },
  { category: 'food', name: 'Semovita (Golden Penny 1kg)', unit: 'pack', aliases: ['semo', 'semolina'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 27, refPrice: null },
  { category: 'food', name: 'Spaghetti (Golden Penny)', unit: 'pack', aliases: ['pasta', 'spag'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 28, refPrice: 1200, refPriceSource: 'https://supermart.ng', refPriceConfidence: 'high' },
  { category: 'food', name: 'Macaroni', unit: 'pack', aliases: ['pasta'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 29, refPrice: null },
  { category: 'food', name: 'Curry Powder Sachet', unit: 'sachet', aliases: ['curry', 'spices'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 30, refPrice: null },

  // --- DRINKS ---
  { category: 'drinks', name: 'Coca-Cola 50cl', unit: 'bottle', aliases: ['coke', 'soft drink'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 31, refPrice: 500, refPriceSource: 'https://jumia.com.ng', refPriceConfidence: 'high' },
  { category: 'drinks', name: 'Fanta Orange 50cl', unit: 'bottle', aliases: ['fanta', 'soft drink'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 32, refPrice: 500, refPriceSource: 'https://supermart.ng', refPriceConfidence: 'high' },
  { category: 'drinks', name: 'Sprite 50cl', unit: 'bottle', aliases: ['sprite'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 33, refPrice: 500, refPriceSource: 'https://supermart.ng', refPriceConfidence: 'high' },
  { category: 'drinks', name: 'Pepsi 50cl', unit: 'bottle', aliases: ['pepsi'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 34, refPrice: null },
  { category: 'drinks', name: 'Maltina Can', unit: 'can', aliases: ['malt', 'maltina'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 35, refPrice: null },
  { category: 'drinks', name: 'Amstel Malta', unit: 'can', aliases: ['amstel', 'malt'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 36, refPrice: null },
  { category: 'drinks', name: 'Peak Milk Sachet', unit: 'sachet', aliases: ['peak milk', 'milk sachet'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 37, refPrice: null },
  { category: 'drinks', name: 'Peak Milk Tin', unit: 'tin', aliases: ['evaporated milk', 'peak tin'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 38, refPrice: null },
  { category: 'drinks', name: 'Milo Sachet', unit: 'sachet', aliases: ['milo', 'chocolate drink'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 39, refPrice: null },
  { category: 'drinks', name: 'Dano Milk Sachet', unit: 'sachet', aliases: ['dano', 'powdered milk'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 40, refPrice: null },
  { category: 'drinks', name: 'Chi Exotic Juice 1L', unit: 'carton', aliases: ['chi exotic', 'juice'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 41, refPrice: null },
  { category: 'drinks', name: 'Hollandia Yoghurt 1L', unit: 'carton', aliases: ['hollandia', 'yoghurt'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 42, refPrice: null },
  { category: 'drinks', name: 'Zobo Drink', unit: 'bottle', aliases: ['zobo'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 43, refPrice: null },
  { category: 'drinks', name: 'Lucozade Boost 50cl', unit: 'bottle', aliases: ['lucozade', 'energy drink'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 44, refPrice: null },
  { category: 'drinks', name: 'Fearless Energy Drink', unit: 'can', aliases: ['fearless', 'energy drink'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 45, refPrice: null },

  // --- HOUSEHOLD ---
  { category: 'household', name: 'Ariel Detergent Sachet', unit: 'sachet', aliases: ['ariel', 'washing powder'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 46, refPrice: null },
  { category: 'household', name: 'Omo Detergent Sachet', unit: 'sachet', aliases: ['omo', 'detergent'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 47, refPrice: null },
  { category: 'household', name: 'Viva Detergent Sachet', unit: 'sachet', aliases: ['viva', 'soap powder'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 48, refPrice: null },
  { category: 'household', name: 'Sunlight Washing Bar Soap', unit: 'bar', aliases: ['sunlight soap', 'bar soap'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 49, refPrice: null },
  { category: 'household', name: 'Morning Fresh Dishwash 450ml', unit: 'bottle', aliases: ['morning fresh', 'dish soap'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 50, refPrice: null },
  { category: 'household', name: 'Hypo Bleach Sachet', unit: 'sachet', aliases: ['hypo', 'bleach'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 51, refPrice: null },
  { category: 'household', name: 'Jik Bleach', unit: 'bottle', aliases: ['jik', 'bleach'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 52, refPrice: null },
  { category: 'household', name: 'Matches (Three Stars)', unit: 'box', aliases: ['matches', 'matchbox'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 53, refPrice: null },
  { category: 'household', name: 'Candle (Pack of 6)', unit: 'pack', aliases: ['candle', 'candles'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 54, refPrice: null },
  { category: 'household', name: 'Raid Insecticide 300ml', unit: 'can', aliases: ['raid', 'flit', 'insect spray'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 55, refPrice: null },
  { category: 'household', name: 'Sniper (Pack)', unit: 'bottle', aliases: ['sniper'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 56, refPrice: null },
  { category: 'household', name: 'Iron Sponge / Steel Wool', unit: 'piece', aliases: ['iron sponge', 'pot scrubber'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 57, refPrice: null },
  { category: 'household', name: 'Toilet Roll (Bel Impex)', unit: 'roll', aliases: ['tissue', 'toilet paper'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 58, refPrice: null },
  { category: 'household', name: 'Nylon Bags (Small roll)', unit: 'roll', aliases: ['leather', 'shopping nylon'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 59, refPrice: null },
  { category: 'household', name: 'Mosquito Coil', unit: 'pack', aliases: ['coil'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 60, refPrice: null },

  // --- PERSONAL CARE ---
  { category: 'personal_care', name: 'Close-Up Toothpaste 130g', unit: 'piece', aliases: ['closeup', 'toothpaste'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 61, refPrice: null },
  { category: 'personal_care', name: 'Oral-B Toothpaste', unit: 'piece', aliases: ['oral b', 'toothpaste'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 62, refPrice: null },
  { category: 'personal_care', name: 'Toothbrush (Adult)', unit: 'piece', aliases: ['toothbrush'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 63, refPrice: null },
  { category: 'personal_care', name: 'Dettol Bathing Soap', unit: 'piece', aliases: ['dettol soap', 'soap'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 64, refPrice: 600, refPriceSource: 'https://jumia.com.ng', refPriceConfidence: 'high' },
  { category: 'personal_care', name: 'Premier Cool Soap', unit: 'piece', aliases: ['premier soap'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 65, refPrice: null },
  { category: 'personal_care', name: 'Always Sanitary Pads', unit: 'pack', aliases: ['always pad', 'sanitary towel'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 66, refPrice: null },
  { category: 'personal_care', name: 'Molped Pads', unit: 'pack', aliases: ['molped', 'pad'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 67, refPrice: null },
  { category: 'personal_care', name: 'Vaseline Petroleum Jelly 100ml', unit: 'jar', aliases: ['vaseline', 'pomade'], businessTypes: ['retail', 'wholesale'], isDefault: true, sortOrder: 68, refPrice: null },
  { category: 'personal_care', name: 'Nivea Body Lotion', unit: 'bottle', aliases: ['cream', 'lotion'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 69, refPrice: null },
  { category: 'personal_care', name: 'Cotton Buds', unit: 'pack', aliases: ['earbuds', 'cotton buds'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 70, refPrice: null },
  { category: 'personal_care', name: 'Shaving Razor (Gillette/Dorco)', unit: 'piece', aliases: ['razor', 'shaving stick'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 71, refPrice: null },
  { category: 'personal_care', name: 'Paracetamol Tablets', unit: 'sachet', aliases: ['panadol', 'paracetamol', 'painkiller'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 72, refPrice: null },
  { category: 'personal_care', name: 'Methylated Spirit 100ml', unit: 'bottle', aliases: ['spirit'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 73, refPrice: null },
  { category: 'personal_care', name: 'Robb Balm (Small)', unit: 'piece', aliases: ['robb', 'menthol balm'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 74, refPrice: null },
  { category: 'personal_care', name: 'Pocket Tissue', unit: 'pack', aliases: ['hanky', 'handkerchief'], businessTypes: ['retail', 'wholesale'], isDefault: false, sortOrder: 75, refPrice: null },
];

export function getCatalogItemById(id: string): (CatalogSeedItem & { id: string }) | undefined {
  const all = CATALOG_ITEMS.map((c) => ({
    ...c,
    id: `cat_${c.category}_${c.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
  }));
  return all.find((item) => item.id === id);
}
