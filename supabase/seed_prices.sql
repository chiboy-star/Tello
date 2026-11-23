-- Seed Reference Prices for All 75 Catalog Items
-- Idempotent UPDATE statements by category and name

UPDATE catalog_items
SET ref_price_minor = 20000,
    ref_price_source = 'https://supermart.ng/products/indomie-instant-noodles-chicken-flavor-70g',
    ref_price_confidence = 'high',
    ref_price_checked_at = now()
WHERE category = 'everyday' AND name = 'Indomie Chicken';
UPDATE catalog_items
SET ref_price_minor = 22000,
    ref_price_source = 'https://supermart.ng/products/indomie-instant-noodles-onion-chicken-flavor-70g',
    ref_price_confidence = 'high',
    ref_price_checked_at = now()
WHERE category = 'everyday' AND name = 'Indomie Onion';
UPDATE catalog_items
SET ref_price_minor = 35000,
    ref_price_source = 'https://supermart.ng/products/indomie-instant-noodles-chicken-flavor-super-pack-120g',
    ref_price_confidence = 'high',
    ref_price_checked_at = now()
WHERE category = 'everyday' AND name = 'Indomie Superpack';
UPDATE catalog_items
SET ref_price_minor = 5000,
    ref_price_source = 'https://nigerianstat.gov.ng',
    ref_price_confidence = 'high',
    ref_price_checked_at = now()
WHERE category = 'everyday' AND name = 'Pure Water';
UPDATE catalog_items
SET ref_price_minor = 20000,
    ref_price_source = 'https://supermart.ng/products/nestle-pure-life-water-75-cl',
    ref_price_confidence = 'high',
    ref_price_checked_at = now()
WHERE category = 'everyday' AND name = 'Bottled Water 75cl';
UPDATE catalog_items
SET ref_price_minor = 15000,
    ref_price_source = 'https://supermart.ng/products/oxford-sweetened-cabin-biscuit-350g',
    ref_price_confidence = 'medium',
    ref_price_checked_at = now()
WHERE category = 'everyday' AND name = 'Cabin Biscuit';
UPDATE catalog_items
SET ref_price_minor = 10000,
    ref_price_source = 'https://supermart.ng/products/newbisco-coaster-biscuit',
    ref_price_confidence = 'medium',
    ref_price_checked_at = now()
WHERE category = 'everyday' AND name = 'Coaster Biscuit';
UPDATE catalog_items
SET ref_price_minor = 15000,
    ref_price_source = 'https://supermart.ng/products/minimie-chin-chin-snack-jar-900g',
    ref_price_confidence = 'medium',
    ref_price_checked_at = now()
WHERE category = 'everyday' AND name = 'Minimie Chinchin';
UPDATE catalog_items
SET ref_price_minor = 20000,
    ref_price_source = 'https://supermart.ng/products/gala-sausage-roll-100g',
    ref_price_confidence = 'high',
    ref_price_checked_at = now()
WHERE category = 'everyday' AND name = 'Gala Sausage';
UPDATE catalog_items
SET ref_price_minor = 5000,
    ref_price_source = 'https://supermart.ng/products/cadbury-tom-tom-candy',
    ref_price_confidence = 'medium',
    ref_price_checked_at = now()
WHERE category = 'everyday' AND name = 'Tom Tom Candy';
UPDATE catalog_items
SET ref_price_minor = 5000,
    ref_price_source = 'https://supermart.ng/products/cadbury-buttermint-candy',
    ref_price_confidence = 'medium',
    ref_price_checked_at = now()
WHERE category = 'everyday' AND name = 'Buttermint Candy';
UPDATE catalog_items
SET ref_price_minor = 30000,
    ref_price_source = 'https://supermart.ng/products/orbit-peppermint-chewing-gum',
    ref_price_confidence = 'medium',
    ref_price_checked_at = now()
WHERE category = 'everyday' AND name = 'Chewing Gum (Orbit)';
UPDATE catalog_items
SET ref_price_minor = 30000,
    ref_price_source = 'https://supermart.ng/products/plantain-chips-100g',
    ref_price_confidence = 'medium',
    ref_price_checked_at = now()
WHERE category = 'everyday' AND name = 'Plantain Chips';
UPDATE catalog_items
SET ref_price_minor = 150000,
    ref_price_source = 'https://pricepally.com/products/roasted-groundnut-75cl',
    ref_price_confidence = 'low',
    ref_price_checked_at = now()
WHERE category = 'everyday' AND name = 'Groundnut 1 Bottle';
UPDATE catalog_items
SET ref_price_minor = 120000,
    ref_price_source = 'https://nigerianstat.gov.ng',
    ref_price_confidence = 'high',
    ref_price_checked_at = now()
WHERE category = 'everyday' AND name = 'Bread (Family Loaf)';
UPDATE catalog_items
SET ref_price_minor = 160000,
    ref_price_source = 'https://nigerianstat.gov.ng',
    ref_price_confidence = 'high',
    ref_price_checked_at = now()
WHERE category = 'food' AND name = 'Rice';
UPDATE catalog_items
SET ref_price_minor = 230000,
    ref_price_source = 'https://nigerianstat.gov.ng',
    ref_price_confidence = 'high',
    ref_price_checked_at = now()
WHERE category = 'food' AND name = 'Beans (Oloyin)';
UPDATE catalog_items
SET ref_price_minor = 90000,
    ref_price_source = 'https://nigerianstat.gov.ng',
    ref_price_confidence = 'high',
    ref_price_checked_at = now()
WHERE category = 'food' AND name = 'Garri (White)';
UPDATE catalog_items
SET ref_price_minor = 95000,
    ref_price_source = 'https://nigerianstat.gov.ng',
    ref_price_confidence = 'high',
    ref_price_checked_at = now()
WHERE category = 'food' AND name = 'Garri (Yellow)';
UPDATE catalog_items
SET ref_price_minor = 180000,
    ref_price_source = 'https://nigerianstat.gov.ng',
    ref_price_confidence = 'high',
    ref_price_checked_at = now()
WHERE category = 'food' AND name = 'Vegetable Oil';
UPDATE catalog_items
SET ref_price_minor = 160000,
    ref_price_source = 'https://nigerianstat.gov.ng',
    ref_price_confidence = 'high',
    ref_price_checked_at = now()
WHERE category = 'food' AND name = 'Palm Oil';
UPDATE catalog_items
SET ref_price_minor = 30000,
    ref_price_source = 'https://supermart.ng/products/gino-tomato-paste-sachet-70g',
    ref_price_confidence = 'high',
    ref_price_checked_at = now()
WHERE category = 'food' AND name = 'Tomato Paste (Gino/De Rica)';
UPDATE catalog_items
SET ref_price_minor = 200000,
    ref_price_source = 'https://supermart.ng/products/maggi-star-seasoning-cubes-400g-x100',
    ref_price_confidence = 'high',
    ref_price_checked_at = now()
WHERE category = 'food' AND name = 'Maggi Star Cubes';
UPDATE catalog_items
SET ref_price_minor = 250000,
    ref_price_source = 'https://supermart.ng/products/knorr-chicken-cubes-8g-x50',
    ref_price_confidence = 'high',
    ref_price_checked_at = now()
WHERE category = 'food' AND name = 'Knorr Chicken Cubes';
UPDATE catalog_items
SET ref_price_minor = 40000,
    ref_price_source = 'https://supermart.ng/products/dangote-iodized-salt-1kg',
    ref_price_confidence = 'high',
    ref_price_checked_at = now()
WHERE category = 'food' AND name = 'Salt (Dangote)';
UPDATE catalog_items
SET ref_price_minor = 220000,
    ref_price_source = 'https://supermart.ng/products/st-louis-sugar-cubes-474g',
    ref_price_confidence = 'high',
    ref_price_checked_at = now()
WHERE category = 'food' AND name = 'Sugar (St. Louis Cube)';
UPDATE catalog_items
SET ref_price_minor = 200000,
    ref_price_source = 'https://supermart.ng/products/golden-penny-semovita-1kg',
    ref_price_confidence = 'high',
    ref_price_checked_at = now()
WHERE category = 'food' AND name = 'Semovita (Golden Penny 1kg)';
UPDATE catalog_items
SET ref_price_minor = 120000,
    ref_price_source = 'https://supermart.ng/products/golden-penny-spaghetti-500g',
    ref_price_confidence = 'high',
    ref_price_checked_at = now()
WHERE category = 'food' AND name = 'Spaghetti (Golden Penny)';
UPDATE catalog_items
SET ref_price_minor = 110000,
    ref_price_source = 'https://supermart.ng/products/golden-penny-macaroni-500g',
    ref_price_confidence = 'medium',
    ref_price_checked_at = now()
WHERE category = 'food' AND name = 'Macaroni';
UPDATE catalog_items
SET ref_price_minor = 15000,
    ref_price_source = 'https://supermart.ng/products/ducros-curry-powder-sachet-25g',
    ref_price_confidence = 'medium',
    ref_price_checked_at = now()
WHERE category = 'food' AND name = 'Curry Powder Sachet';
UPDATE catalog_items
SET ref_price_minor = 50000,
    ref_price_source = 'https://supermart.ng/products/coca-cola-pet-50-cl',
    ref_price_confidence = 'high',
    ref_price_checked_at = now()
WHERE category = 'drinks' AND name = 'Coca-Cola 50cl';
UPDATE catalog_items
SET ref_price_minor = 50000,
    ref_price_source = 'https://supermart.ng/products/fanta-orange-pet-50-cl',
    ref_price_confidence = 'high',
    ref_price_checked_at = now()
WHERE category = 'drinks' AND name = 'Fanta Orange 50cl';
UPDATE catalog_items
SET ref_price_minor = 50000,
    ref_price_source = 'https://supermart.ng/products/sprite-pet-50-cl',
    ref_price_confidence = 'high',
    ref_price_checked_at = now()
WHERE category = 'drinks' AND name = 'Sprite 50cl';
UPDATE catalog_items
SET ref_price_minor = 45000,
    ref_price_source = 'https://supermart.ng/products/pepsi-pet-50-cl',
    ref_price_confidence = 'high',
    ref_price_checked_at = now()
WHERE category = 'drinks' AND name = 'Pepsi 50cl';
UPDATE catalog_items
SET ref_price_minor = 80000,
    ref_price_source = 'https://supermart.ng/products/maltina-classic-can-33-cl-x-24-pack',
    ref_price_confidence = 'high',
    ref_price_checked_at = now()
WHERE category = 'drinks' AND name = 'Maltina Can';
UPDATE catalog_items
SET ref_price_minor = 80000,
    ref_price_source = 'https://supermart.ng/products/amstel-malta-can-33-cl',
    ref_price_confidence = 'high',
    ref_price_checked_at = now()
WHERE category = 'drinks' AND name = 'Amstel Malta';
UPDATE catalog_items
SET ref_price_minor = 20000,
    ref_price_source = 'https://supermart.ng/products/peak-instant-milk-powder-sachet',
    ref_price_confidence = 'high',
    ref_price_checked_at = now()
WHERE category = 'drinks' AND name = 'Peak Milk Sachet';
UPDATE catalog_items
SET ref_price_minor = 85000,
    ref_price_source = 'https://supermart.ng/products/peak-evaporated-milk-160-g-x-48-pack',
    ref_price_confidence = 'high',
    ref_price_checked_at = now()
WHERE category = 'drinks' AND name = 'Peak Milk Tin';
UPDATE catalog_items
SET ref_price_minor = 20000,
    ref_price_source = 'https://supermart.ng/products/nestle-milo-sachet-20g',
    ref_price_confidence = 'high',
    ref_price_checked_at = now()
WHERE category = 'drinks' AND name = 'Milo Sachet';
UPDATE catalog_items
SET ref_price_minor = 18000,
    ref_price_source = 'https://supermart.ng/products/dano-cool-cow-milk-sachet-14g',
    ref_price_confidence = 'medium',
    ref_price_checked_at = now()
WHERE category = 'drinks' AND name = 'Dano Milk Sachet';
UPDATE catalog_items
SET ref_price_minor = 180000,
    ref_price_source = 'https://supermart.ng/products/chi-exotic-pineapple-coconut-nectar-1-l',
    ref_price_confidence = 'high',
    ref_price_checked_at = now()
WHERE category = 'drinks' AND name = 'Chi Exotic Juice 1L';
UPDATE catalog_items
SET ref_price_minor = 190000,
    ref_price_source = 'https://supermart.ng/products/hollandia-yoghurt-plain-sweetened-1-l',
    ref_price_confidence = 'high',
    ref_price_checked_at = now()
WHERE category = 'drinks' AND name = 'Hollandia Yoghurt 1L';
UPDATE catalog_items
SET ref_price_minor = 40000,
    ref_price_source = 'https://pricepally.com/products/fresh-zobo-drink-50cl',
    ref_price_confidence = 'low',
    ref_price_checked_at = now()
WHERE category = 'drinks' AND name = 'Zobo Drink';
UPDATE catalog_items
SET ref_price_minor = 90000,
    ref_price_source = 'https://supermart.ng/products/lucozade-boost-energy-drink-pet-50-cl',
    ref_price_confidence = 'high',
    ref_price_checked_at = now()
WHERE category = 'drinks' AND name = 'Lucozade Boost 50cl';
UPDATE catalog_items
SET ref_price_minor = 60000,
    ref_price_source = 'https://supermart.ng/products/fearless-energy-drink-classic-50-cl',
    ref_price_confidence = 'high',
    ref_price_checked_at = now()
WHERE category = 'drinks' AND name = 'Fearless Energy Drink';
UPDATE catalog_items
SET ref_price_minor = 20000,
    ref_price_source = 'https://supermart.ng/products/ariel-washing-powder-sachet',
    ref_price_confidence = 'medium',
    ref_price_checked_at = now()
WHERE category = 'household' AND name = 'Ariel Detergent Sachet';
UPDATE catalog_items
SET ref_price_minor = 20000,
    ref_price_source = 'https://supermart.ng/products/omo-multiactive-detergent-sachet',
    ref_price_confidence = 'medium',
    ref_price_checked_at = now()
WHERE category = 'household' AND name = 'Omo Detergent Sachet';
UPDATE catalog_items
SET ref_price_minor = 18000,
    ref_price_source = 'https://supermart.ng/products/viva-plus-detergent-sachet-90g',
    ref_price_confidence = 'high',
    ref_price_checked_at = now()
WHERE category = 'household' AND name = 'Viva Detergent Sachet';
UPDATE catalog_items
SET ref_price_minor = 40000,
    ref_price_source = 'https://supermart.ng/products/sunlight-laundry-bar-soap-200g',
    ref_price_confidence = 'high',
    ref_price_checked_at = now()
WHERE category = 'household' AND name = 'Sunlight Washing Bar Soap';
UPDATE catalog_items
SET ref_price_minor = 75000,
    ref_price_source = 'https://supermart.ng/products/morning-fresh-dish-washing-liquid-assorted-450-ml',
    ref_price_confidence = 'high',
    ref_price_checked_at = now()
WHERE category = 'household' AND name = 'Morning Fresh Dishwash 450ml';
UPDATE catalog_items
SET ref_price_minor = 20000,
    ref_price_source = 'https://supermart.ng/products/hypo-bleach-sachet-200-ml',
    ref_price_confidence = 'high',
    ref_price_checked_at = now()
WHERE category = 'household' AND name = 'Hypo Bleach Sachet';
UPDATE catalog_items
SET ref_price_minor = 85000,
    ref_price_source = 'https://supermart.ng/products/jik-regular-bleach-475ml',
    ref_price_confidence = 'high',
    ref_price_checked_at = now()
WHERE category = 'household' AND name = 'Jik Bleach';
UPDATE catalog_items
SET ref_price_minor = 10000,
    ref_price_source = 'https://supermart.ng/products/three-stars-safety-matches',
    ref_price_confidence = 'medium',
    ref_price_checked_at = now()
WHERE category = 'household' AND name = 'Matches (Three Stars)';
UPDATE catalog_items
SET ref_price_minor = 80000,
    ref_price_source = 'https://supermart.ng/products/white-household-candles-pack-of-6',
    ref_price_confidence = 'medium',
    ref_price_checked_at = now()
WHERE category = 'household' AND name = 'Candle (Pack of 6)';
UPDATE catalog_items
SET ref_price_minor = 290000,
    ref_price_source = 'https://supermart.ng/products/raid-multipurpose-insect-killer-300ml',
    ref_price_confidence = 'high',
    ref_price_checked_at = now()
WHERE category = 'household' AND name = 'Raid Insecticide 300ml';
UPDATE catalog_items
SET ref_price_minor = 150000,
    ref_price_source = 'https://supermart.ng/products/sniper-ddvp-insecticide-100ml',
    ref_price_confidence = 'medium',
    ref_price_checked_at = now()
WHERE category = 'household' AND name = 'Sniper (Pack)';
UPDATE catalog_items
SET ref_price_minor = 10000,
    ref_price_source = 'https://supermart.ng/products/stainless-steel-wire-scourer',
    ref_price_confidence = 'medium',
    ref_price_checked_at = now()
WHERE category = 'household' AND name = 'Iron Sponge / Steel Wool';
UPDATE catalog_items
SET ref_price_minor = 35000,
    ref_price_source = 'https://supermart.ng/products/bel-impex-rose-toilet-roll',
    ref_price_confidence = 'high',
    ref_price_checked_at = now()
WHERE category = 'household' AND name = 'Toilet Roll (Bel Impex)';
UPDATE catalog_items
SET ref_price_minor = 45000,
    ref_price_source = 'https://pricepally.com/products/shopping-nylon-bags-small',
    ref_price_confidence = 'medium',
    ref_price_checked_at = now()
WHERE category = 'household' AND name = 'Nylon Bags (Small roll)';
UPDATE catalog_items
SET ref_price_minor = 30000,
    ref_price_source = 'https://supermart.ng/products/baygon-mosquito-coil-pack-of-10',
    ref_price_confidence = 'medium',
    ref_price_checked_at = now()
WHERE category = 'household' AND name = 'Mosquito Coil';
UPDATE catalog_items
SET ref_price_minor = 60000,
    ref_price_source = 'https://supermart.ng/products/close-up-toothpaste-everfresh-cool-breeze-140-g',
    ref_price_confidence = 'high',
    ref_price_checked_at = now()
WHERE category = 'personal_care' AND name = 'Close-Up Toothpaste 130g';
UPDATE catalog_items
SET ref_price_minor = 80000,
    ref_price_source = 'https://supermart.ng/products/oral-b-pro-expert-all-around-toothpaste-140g',
    ref_price_confidence = 'high',
    ref_price_checked_at = now()
WHERE category = 'personal_care' AND name = 'Oral-B Toothpaste';
UPDATE catalog_items
SET ref_price_minor = 25000,
    ref_price_source = 'https://supermart.ng/products/close-up-deep-action-toothbrush-medium',
    ref_price_confidence = 'high',
    ref_price_checked_at = now()
WHERE category = 'personal_care' AND name = 'Toothbrush (Adult)';
UPDATE catalog_items
SET ref_price_minor = 70000,
    ref_price_source = 'https://supermart.ng/products/dettol-antibacterial-soap-original-110g',
    ref_price_confidence = 'high',
    ref_price_checked_at = now()
WHERE category = 'personal_care' AND name = 'Dettol Bathing Soap';
UPDATE catalog_items
SET ref_price_minor = 50000,
    ref_price_source = 'https://supermart.ng/products/premier-cool-antibacterial-soap-110g',
    ref_price_confidence = 'high',
    ref_price_checked_at = now()
WHERE category = 'personal_care' AND name = 'Premier Cool Soap';
UPDATE catalog_items
SET ref_price_minor = 170000,
    ref_price_source = 'https://supermart.ng/products/always-3-in-1-maxi-thick-sanitary-pads-xl-x7',
    ref_price_confidence = 'high',
    ref_price_checked_at = now()
WHERE category = 'personal_care' AND name = 'Always Sanitary Pads';
UPDATE catalog_items
SET ref_price_minor = 150000,
    ref_price_source = 'https://supermart.ng/products/molped-maxi-thick-sanitary-pads-with-wings-x7',
    ref_price_confidence = 'high',
    ref_price_checked_at = now()
WHERE category = 'personal_care' AND name = 'Molped Pads';
UPDATE catalog_items
SET ref_price_minor = 140000,
    ref_price_source = 'https://supermart.ng/products/vaseline-blue-seal-pure-petroleum-jelly-original-100ml',
    ref_price_confidence = 'high',
    ref_price_checked_at = now()
WHERE category = 'personal_care' AND name = 'Vaseline Petroleum Jelly 100ml';
UPDATE catalog_items
SET ref_price_minor = 380000,
    ref_price_source = 'https://supermart.ng/products/nivea-nourishing-body-milk-400ml',
    ref_price_confidence = 'high',
    ref_price_checked_at = now()
WHERE category = 'personal_care' AND name = 'Nivea Body Lotion';
UPDATE catalog_items
SET ref_price_minor = 40000,
    ref_price_source = 'https://supermart.ng/products/cotton-buds-ear-cleaner-pack-of-100',
    ref_price_confidence = 'medium',
    ref_price_checked_at = now()
WHERE category = 'personal_care' AND name = 'Cotton Buds';
UPDATE catalog_items
SET ref_price_minor = 25000,
    ref_price_source = 'https://supermart.ng/products/dorco-twin-blade-disposable-shaving-razor',
    ref_price_confidence = 'high',
    ref_price_checked_at = now()
WHERE category = 'personal_care' AND name = 'Shaving Razor (Gillette/Dorco)';
UPDATE catalog_items
SET ref_price_minor = 20000,
    ref_price_source = 'https://supermart.ng/products/emzor-paracetamol-tablets-500mg-blister-strip',
    ref_price_confidence = 'high',
    ref_price_checked_at = now()
WHERE category = 'personal_care' AND name = 'Paracetamol Tablets';
UPDATE catalog_items
SET ref_price_minor = 50000,
    ref_price_source = 'https://supermart.ng/products/bell-methylated-spirit-100ml',
    ref_price_confidence = 'high',
    ref_price_checked_at = now()
WHERE category = 'personal_care' AND name = 'Methylated Spirit 100ml';
UPDATE catalog_items
SET ref_price_minor = 30000,
    ref_price_source = 'https://supermart.ng/products/robb-menthol-inhaler-hot-balm-tin',
    ref_price_confidence = 'high',
    ref_price_checked_at = now()
WHERE category = 'personal_care' AND name = 'Robb Balm (Small)';
UPDATE catalog_items
SET ref_price_minor = 20000,
    ref_price_source = 'https://supermart.ng/products/bel-impex-pocket-hankies-tissue-pack',
    ref_price_confidence = 'medium',
    ref_price_checked_at = now()
WHERE category = 'personal_care' AND name = 'Pocket Tissue';
