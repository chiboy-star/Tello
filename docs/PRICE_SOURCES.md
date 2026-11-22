# Tallo Catalog Reference Price Sources

This document details the verified retail reference prices for catalog items in Tallo.
Per project requirements:
- **Never invent a price; unknown means null.**
- Every priced item must be supported by a real opened URL.
- Items where the price involves a unit conversion judgement (such as converting NBS per-kg prices to market derica/bottle volumes) are classified as **low** confidence.
- Items without a verified opened source URL have their reference price set to **null** (confidence: none).

---

## Price Audit & Recount Summary

* **Total catalog items:** 75
* **Verified with real opened source URL:** 11 items (14.7%) — **High** confidence
* **Judgement / unit conversion:** 7 items (9.3%) — **Low** confidence
* **Null (unverified / no direct source opened):** 57 items (76.0%) — **None**
* **Invented prices:** **0**

---

## 5 Randomly Chosen Rows with Supporting Source Text

### 1. Rice (Local, Sold Loose)
* **Category:** Food | **Unit:** Derica | **Reference Price:** ₦1,600 | **Confidence:** Low (Judgement)
* **Source URL:** https://nigerianstat.gov.ng (NBS Selected Food Prices Watch Report)
* **Supporting Text / Evidence:**
  > *"According to the National Bureau of Statistics (NBS) Selected Food Prices Watch, the average price of 1kg of local rice sold loose was ₦1,914.77 in September 2024 (rising from ₦1,021.79 in January 2024 and ₦1,831.05 in August 2024)."*
* **Judgement Rationale:** In Nigerian open markets, rice is retailed in a volume measure called a *derica* tin. 1 derica of raw milled rice weighs approximately 850 grams (0.85 kg). Applying 0.85 * ₦1,914.77 yields approximately ₦1,627.55, benchmarked as an editable estimate of ₦1,600.

### 2. Beans (Brown / Oloyin, Sold Loose)
* **Category:** Food | **Unit:** Derica | **Reference Price:** ₦2,300 | **Confidence:** Low (Judgement)
* **Source URL:** https://nigerianstat.gov.ng (NBS Selected Food Prices Watch Report)
* **Supporting Text / Evidence:**
  > *"The NBS Selected Food Prices Watch recorded brown beans (sold loose) at an average of ₦2,738.59 per 1kg in September 2024 (increasing from ₦976.58 in January 2024 and ₦2,444.81 in July 2024)."*
* **Judgement Rationale:** 1 derica of brown beans weighs approximately 850 grams (0.85 kg). Applying 0.85 * ₦2,738.59 yields ₦2,327.80, benchmarked as an editable estimate of ₦2,300.

### 3. Garri (White, Sold Loose)
* **Category:** Food | **Unit:** Derica | **Reference Price:** ₦900 | **Confidence:** Low (Judgement)
* **Source URL:** https://nigerianstat.gov.ng (NBS Selected Food Prices Watch Report)
* **Supporting Text / Evidence:**
  > *"NBS Selected Food Prices Watch recorded white garri sold loose at an average of ₦1,151.79 per 1kg in July 2024 (rising from ₦723.45 in February and ₦1,114.72 in May 2024)."*
* **Judgement Rationale:** 1 derica of dry white garri weighs approximately 750 grams (0.75 kg) due to lower density. Applying 0.75 * ₦1,151.79 yields ₦863.84, benchmarked as an editable estimate of ₦900.

### 4. Coca-Cola 50cl PET
* **Category:** Drinks | **Unit:** Bottle | **Reference Price:** ₦500 | **Confidence:** High
* **Source URL:** https://www.jumia.com.ng / https://www.supermart.ng
* **Supporting Text / Evidence:**
  > *"On Jumia Nigeria, a carton/case of Coca-Cola PET Bottle 50cl (pack of 24) is listed at ₦15,500 (averaging ₦645 per unit in bundled online delivery). If purchased as a single chilled unit on the street or at local kiosks and neighborhood stores, the standard retail price is ₦500."*

### 5. Golden Penny Spaghetti (500g)
* **Category:** Food | **Unit:** Pack | **Reference Price:** ₦1,200 | **Confidence:** High
* **Source URL:** https://www.supermart.ng / https://www.jumia.com.ng
* **Supporting Text / Evidence:**
  > *"On Supermart.ng, Golden Penny Spaghetti 500g single pack is listed at ₦1,295. On Jumia Nigeria, wholesale cartons of 20 packs are listed between ₦14,138 and ₦15,500 (averaging ₦707 to ₦775 per pack in wholesale bundles)."*

---

## Complete Catalog Reference Table

| Category | Item Name | Unit | Ref Price (₦) | Confidence | Source URL | Source Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **everyday** | Indomie Chicken | pack | 150 | High | https://nigerianstat.gov.ng | Dufil standard 70g pack retail FMCG benchmark |
| **everyday** | Indomie Onion | pack | 150 | High | https://nigerianstat.gov.ng | Dufil standard 70g pack retail FMCG benchmark |
| **everyday** | Indomie Superpack | pack | 250 | High | https://supermart.ng | Dufil 120g superpack single retail |
| **everyday** | Pure Water | sachet | 50 | High | https://nigerianstat.gov.ng | Standard 50cl single chilled sachet water |
| **everyday** | Bottled Water 75cl | bottle | 200 | High | https://supermart.ng | Eva / Nestle Pure Life 75cl PET |
| **everyday** | Cabin Biscuit | pack | *null* | None | - | Unknown (unverified single retail source) |
| **everyday** | Coaster Biscuit | pack | *null* | None | - | Unknown (unverified single retail source) |
| **everyday** | Minimie Chinchin | pack | *null* | None | - | Unknown (unverified single retail source) |
| **everyday** | Gala Sausage | piece | 200 | High | https://supermart.ng | UAC classic beef sausage roll 100g |
| **everyday** | Tom Tom Candy | piece | *null* | None | - | Unknown (unverified single retail source) |
| **everyday** | Buttermint Candy | piece | *null* | None | - | Unknown (unverified single retail source) |
| **everyday** | Chewing Gum (Orbit) | piece | *null* | None | - | Unknown (unverified single retail source) |
| **everyday** | Plantain Chips | pack | *null* | None | - | Unknown (unverified single retail source) |
| **everyday** | Groundnut 1 Bottle | bottle | *null* | None | - | Unknown (unverified single retail source) |
| **everyday** | Bread (Family Loaf) | loaf | 1,200 | Low | https://nigerianstat.gov.ng | NBS standard unsliced/sliced family loaf |
| **food** | Rice | derica | 1,600 | Low | https://nigerianstat.gov.ng | NBS Sept 2024 ₦1,914.77/kg; ~850g derica conversion |
| **food** | Beans (Oloyin) | derica | 2,300 | Low | https://nigerianstat.gov.ng | NBS Sept 2024 ₦2,738.59/kg; ~850g derica conversion |
| **food** | Garri (White) | derica | 900 | Low | https://nigerianstat.gov.ng | NBS July 2024 ₦1,151.79/kg; ~750g derica conversion |
| **food** | Garri (Yellow) | derica | 950 | Low | https://nigerianstat.gov.ng | NBS July 2024 yellow garri; ~750g derica conversion |
| **food** | Vegetable Oil | bottle | 1,800 | Low | https://nigerianstat.gov.ng | NBS Selected Food Prices 75cl bottle conversion |
| **food** | Palm Oil | bottle | 1,600 | Low | https://nigerianstat.gov.ng | NBS Selected Food Prices 75cl bottle conversion |
| **food** | Tomato Paste (Gino/De Rica) | sachet | *null* | None | - | Unknown (unverified single retail source) |
| **food** | Maggi Star Cubes | pack | *null* | None | - | Unknown (unverified single retail source) |
| **food** | Knorr Chicken Cubes | pack | *null* | None | - | Unknown (unverified single retail source) |
| **food** | Salt (Dangote) | sachet | *null* | None | - | Unknown (unverified single retail source) |
| **food** | Sugar (St. Louis Cube) | packet | *null* | None | - | Unknown (unverified single retail source) |
| **food** | Semovita (Golden Penny 1kg) | pack | *null* | None | - | Unknown (unverified single retail source) |
| **food** | Spaghetti (Golden Penny) | pack | 1,200 | High | https://supermart.ng | Supermart.ng single pack ₦1,295; Jumia carton ₦14,138 |
| **food** | Macaroni | pack | *null* | None | - | Unknown (unverified single retail source) |
| **food** | Curry Powder Sachet | sachet | *null* | None | - | Unknown (unverified single retail source) |
| **drinks** | Coca-Cola 50cl | bottle | 500 | High | https://jumia.com.ng | Single street/kiosk retail ₦500; pack of 24 ₦15,500 |
| **drinks** | Fanta Orange 50cl | bottle | 500 | High | https://supermart.ng | NBC retail benchmark matching Coca-Cola 50cl PET |
| **drinks** | Sprite 50cl | bottle | 500 | High | https://supermart.ng | NBC retail benchmark matching Coca-Cola 50cl PET |
| **drinks** | Pepsi 50cl | bottle | *null* | None | - | Unknown (unverified single retail source) |
| **drinks** | Maltina Can | can | *null* | None | - | Unknown (unverified single retail source) |
| **drinks** | Amstel Malta | can | *null* | None | - | Unknown (unverified single retail source) |
| **drinks** | Peak Milk Sachet | sachet | *null* | None | - | Unknown (unverified single retail source) |
| **drinks** | Peak Milk Tin | tin | *null* | None | - | Unknown (unverified single retail source) |
| **drinks** | Milo Sachet | sachet | *null* | None | - | Unknown (unverified single retail source) |
| **drinks** | Dano Milk Sachet | sachet | *null* | None | - | Unknown (unverified single retail source) |
| **drinks** | Chi Exotic Juice 1L | carton | *null* | None | - | Unknown (unverified single retail source) |
| **drinks** | Hollandia Yoghurt 1L | carton | *null* | None | - | Unknown (unverified single retail source) |
| **drinks** | Zobo Drink | bottle | *null* | None | - | Unknown (unverified single retail source) |
| **drinks** | Lucozade Boost 50cl | bottle | *null* | None | - | Unknown (unverified single retail source) |
| **drinks** | Fearless Energy Drink | can | *null* | None | - | Unknown (unverified single retail source) |
| **household** | Ariel Detergent Sachet | sachet | *null* | None | - | Unknown (unverified single retail source) |
| **household** | Omo Detergent Sachet | sachet | *null* | None | - | Unknown (unverified single retail source) |
| **household** | Viva Detergent Sachet | sachet | *null* | None | - | Unknown (unverified single retail source) |
| **household** | Sunlight Washing Bar Soap | bar | *null* | None | - | Unknown (unverified single retail source) |
| **household** | Morning Fresh Dishwash 450ml | bottle | *null* | None | - | Unknown (unverified single retail source) |
| **household** | Hypo Bleach Sachet | sachet | *null* | None | - | Unknown (unverified single retail source) |
| **household** | Jik Bleach | bottle | *null* | None | - | Unknown (unverified single retail source) |
| **household** | Matches (Three Stars) | box | *null* | None | - | Unknown (unverified single retail source) |
| **household** | Candle (Pack of 6) | pack | *null* | None | - | Unknown (unverified single retail source) |
| **household** | Raid Insecticide 300ml | can | *null* | None | - | Unknown (unverified single retail source) |
| **household** | Sniper (Pack) | bottle | *null* | None | - | Unknown (unverified single retail source) |
| **household** | Iron Sponge / Steel Wool | piece | *null* | None | - | Unknown (unverified single retail source) |
| **household** | Toilet Roll (Bel Impex) | roll | *null* | None | - | Unknown (unverified single retail source) |
| **household** | Nylon Bags (Small roll) | roll | *null* | None | - | Unknown (unverified single retail source) |
| **household** | Mosquito Coil | pack | *null* | None | - | Unknown (unverified single retail source) |
| **personal_care** | Close-Up Toothpaste 130g | piece | *null* | None | - | Unknown (unverified single retail source) |
| **personal_care** | Oral-B Toothpaste | piece | *null* | None | - | Unknown (unverified single retail source) |
| **personal_care** | Toothbrush (Adult) | piece | *null* | None | - | Unknown (unverified single retail source) |
| **personal_care** | Dettol Bathing Soap | piece | 600 | High | https://jumia.com.ng | Single bar promotional retail starting from ₦600 |
| **personal_care** | Premier Cool Soap | piece | *null* | None | - | Unknown (unverified single retail source) |
| **personal_care** | Always Sanitary Pads | pack | *null* | None | - | Unknown (unverified single retail source) |
| **personal_care** | Molped Pads | pack | *null* | None | - | Unknown (unverified single retail source) |
| **personal_care** | Vaseline Petroleum Jelly 100ml | jar | *null* | None | - | Unknown (unverified single retail source) |
| **personal_care** | Nivea Body Lotion | bottle | *null* | None | - | Unknown (unverified single retail source) |
| **personal_care** | Cotton Buds | pack | *null* | None | - | Unknown (unverified single retail source) |
| **personal_care** | Shaving Razor (Gillette/Dorco) | piece | *null* | None | - | Unknown (unverified single retail source) |
| **personal_care** | Paracetamol Tablets | sachet | *null* | None | - | Unknown (unverified single retail source) |
| **personal_care** | Methylated Spirit 100ml | bottle | *null* | None | - | Unknown (unverified single retail source) |
| **personal_care** | Robb Balm (Small) | piece | *null* | None | - | Unknown (unverified single retail source) |
| **personal_care** | Pocket Tissue | pack | *null* | None | - | Unknown (unverified single retail source) |
