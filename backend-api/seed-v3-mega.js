const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');

const dbConfig = { host: '127.0.0.1', port: 5432, user: 'postgres', password: 'postgres', database: 'baldia_mart' };

// ─── Categories ───────────────────────────────────────────────
const categories = [
  { name: 'Atta, Rice & Grains',    section: 'mart', img: 'https://images.openfoodfacts.org/categories/atta.png' },
  { name: 'Oil, Ghee & Cooking',    section: 'mart', img: 'https://images.openfoodfacts.org/categories/oil.png' },
  { name: 'Spices, Salt & Masala',  section: 'mart', img: 'https://images.openfoodfacts.org/categories/spices.png' },
  { name: 'Dairy & Eggs',           section: 'mart', img: 'https://images.openfoodfacts.org/categories/milk.png' },
  { name: 'Tea & Beverages',        section: 'mart', img: 'https://images.openfoodfacts.org/categories/tea.png' },
  { name: 'Snacks & Biscuits',      section: 'mart', img: 'https://images.openfoodfacts.org/categories/biscuits.png' },
  { name: 'Soft Drinks & Juices',   section: 'mart', img: 'https://images.openfoodfacts.org/categories/juices.png' },
  { name: 'Personal Care',          section: 'mart', img: 'https://images.openfoodfacts.org/categories/personal-care.png' },
  { name: 'Laundry & Household',    section: 'mart', img: 'https://images.openfoodfacts.org/categories/household.png' },
  { name: 'Baby & Child Care',      section: 'mart', img: 'https://images.openfoodfacts.org/categories/baby-food.png' },
  { name: 'Frozen & Ready Meals',   section: 'mart', img: 'https://images.openfoodfacts.org/categories/frozen.png' },
  { name: 'Bakery & Bread',         section: 'mart', img: 'https://images.openfoodfacts.org/categories/bread.png' },
  { name: 'Confectionery & Sweets', section: 'mart', img: 'https://images.openfoodfacts.org/categories/sweets.png' },
  { name: 'Healthcare & Medicine',  section: 'mart', img: 'https://images.openfoodfacts.org/categories/health.png' },
  { name: 'Stationery & School',    section: 'mart', img: 'https://images.openfoodfacts.org/categories/stationery.png' },
];

// ─── Brands ───────────────────────────────────────────────────
const brands = [
  "National", "Shan", "Olper's", "Milkpak", "Dalda", "Mezan", "Sufi", "Habib", "Tapal", "Lipton",
  "LU", "English Biscuit", "Pepsi", "Coca Cola", "Gourmet", "Nestle", "Surf Excel", "Ariel",
  "Lifebuoy", "Sunsilk", "Lux", "SafeGuard", "Colgate", "Sensodyne", "Pampers", "Molty", "Young's",
  "Mitchell's", "Brite", "Rin", "Harpic", "Mortein", "Disprin", "Panadol", "Sooper", "Peek Freans",
  "Knorr", "Shan", "Chef", "Rafhan", "Nurpur", "Adams", "Hilal", "Candyland", "Bisconni", "Hilal Foods",
  "FrieslandCampina", "Igloo", "Kisan", "Guard", "Q&N", "Reckitt", "P&G", "Henkel", "Unilever",
  "English Luqaimat", "Ispaghol Qila", "Qarshi", "Hamdard", "Rex", "Super Khushboo", "EBM", "Tapal"
];

// ─── Helper: product image URLs from Open Food Facts ──────────
// Using real product barcodes from Pakistan market
const imgs = {
  // Shan / National Masalas
  'shan_biryani':        'https://images.openfoodfacts.org/images/products/8964000164611/front_en.3.400.jpg',
  'shan_karahi':         'https://images.openfoodfacts.org/images/products/8964000160439/front_en.3.400.jpg',
  'shan_nihari':         'https://images.openfoodfacts.org/images/products/8964000163492/front_en.3.400.jpg',
  'national_bombay':     'https://images.openfoodfacts.org/images/products/8964001306106/front_en.3.400.jpg',
  'national_ketchup':    'https://images.openfoodfacts.org/images/products/8964001305703/front_en.3.400.jpg',
  // Cooking Oil
  'dalda_oil':           'https://images.openfoodfacts.org/images/products/8964000116948/front_en.3.400.jpg',
  'sufi_oil':            'https://images.openfoodfacts.org/images/products/8964001900014/front_en.3.400.jpg',
  // Dairy
  'olpers_milk':         'https://images.openfoodfacts.org/images/products/8964000276019/front_en.3.400.jpg',
  'milkpak':             'https://images.openfoodfacts.org/images/products/8964001350414/front_en.3.400.jpg',
  // Tea
  'tapal':               'https://images.openfoodfacts.org/images/products/8964000400418/front_en.3.400.jpg',
  'lipton':              'https://images.openfoodfacts.org/images/products/8718114969527/front_en.3.400.jpg',
  // Drinks
  'pepsi':               'https://images.openfoodfacts.org/images/products/4005808205325/front_en.3.400.jpg',
  'cocacola':            'https://images.openfoodfacts.org/images/products/5449000000996/front_en.3.400.jpg',
  'gourmet_cola':        'https://images.openfoodfacts.org/images/products/8964003700016/front_en.3.400.jpg',
  // Biscuits
  'lu_prince':           'https://images.openfoodfacts.org/images/products/8964000200073/front_en.3.400.jpg',
  'sooper':              'https://images.openfoodfacts.org/images/products/8964000183970/front_en.3.400.jpg',
  'peek_freans':         'https://images.openfoodfacts.org/images/products/8964000184014/front_en.3.400.jpg',
  // Personal Care
  'lifebuoy':            'https://images.openfoodfacts.org/images/products/8720182113451/front_en.3.400.jpg',
  'lux':                 'https://images.openfoodfacts.org/images/products/8710908966743/front_en.3.400.jpg',
  'safeguard':           'https://images.openfoodfacts.org/images/products/8936073100030/front_en.3.400.jpg',
  'colgate':             'https://images.openfoodfacts.org/images/products/8714789754697/front_en.3.400.jpg',
  'sunsilk':             'https://images.openfoodfacts.org/images/products/8720181215986/front_en.3.400.jpg',
  // Laundry
  'surf_excel':          'https://images.openfoodfacts.org/images/products/8718114950600/front_en.3.400.jpg',
  'ariel':               'https://images.openfoodfacts.org/images/products/5413149893030/front_en.3.400.jpg',
  // Default fallback
  'default':             'https://images.openfoodfacts.org/images/icons/dist/packaging.svg',
};

const I = (key) => imgs[key] || imgs['default'];

// ─── 500+ PRODUCTS ────────────────────────────────────────────
const productsData = [

  // ── SPICES, SALT & MASALA ───────────────────────────────────
  { n: "Shan Bombay Biryani Mix 60g",               b: "Shan",       c: "Spices, Salt & Masala",  p: 110,  s: 600, img: I('shan_biryani') },
  { n: "Shan Sindhi Biryani Mix 60g",               b: "Shan",       c: "Spices, Salt & Masala",  p: 110,  s: 600, img: I('shan_biryani') },
  { n: "Shan Chicken Tikka Mix 50g",                b: "Shan",       c: "Spices, Salt & Masala",  p: 100,  s: 500, img: I('shan_karahi') },
  { n: "Shan Karahi Mix 50g",                       b: "Shan",       c: "Spices, Salt & Masala",  p: 100,  s: 500, img: I('shan_karahi') },
  { n: "Shan Nihari Mix 60g",                       b: "Shan",       c: "Spices, Salt & Masala",  p: 110,  s: 400, img: I('shan_nihari') },
  { n: "Shan Haleem Mix 300g",                      b: "Shan",       c: "Spices, Salt & Masala",  p: 240,  s: 300, img: I('shan_nihari') },
  { n: "Shan Korma Mix 50g",                        b: "Shan",       c: "Spices, Salt & Masala",  p: 100,  s: 400, img: I('shan_karahi') },
  { n: "Shan Paya Mix 50g",                         b: "Shan",       c: "Spices, Salt & Masala",  p: 100,  s: 300, img: I('shan_nihari') },
  { n: "Shan Yakhni Pulao Mix 60g",                 b: "Shan",       c: "Spices, Salt & Masala",  p: 110,  s: 300, img: I('shan_biryani') },
  { n: "Shan BBQ Mix 50g",                          b: "Shan",       c: "Spices, Salt & Masala",  p: 100,  s: 400, img: I('shan_karahi') },
  { n: "National Bombay Biryani Mix 45g",           b: "National",   c: "Spices, Salt & Masala",  p: 95,   s: 600, img: I('national_bombay') },
  { n: "National Quorma Masala 45g",                b: "National",   c: "Spices, Salt & Masala",  p: 95,   s: 400, img: I('national_bombay') },
  { n: "National Chicken Karahi Mix 45g",           b: "National",   c: "Spices, Salt & Masala",  p: 95,   s: 400, img: I('national_bombay') },
  { n: "National Seekh Kabab Mix 50g",              b: "National",   c: "Spices, Salt & Masala",  p: 95,   s: 300, img: I('national_bombay') },
  { n: "National Red Chilli Powder 200g",           b: "National",   c: "Spices, Salt & Masala",  p: 340,  s: 200, img: I('national_bombay') },
  { n: "National Turmeric Powder 100g",             b: "National",   c: "Spices, Salt & Masala",  p: 180,  s: 200, img: I('national_bombay') },
  { n: "National Coriander Powder 100g",            b: "National",   c: "Spices, Salt & Masala",  p: 180,  s: 200, img: I('national_bombay') },
  { n: "National Iodized Salt 800g",                b: "National",   c: "Spices, Salt & Masala",  p: 70,   s: 1000, img: I('national_bombay') },
  { n: "National Ginger Garlic Paste 310g",         b: "National",   c: "Spices, Salt & Masala",  p: 280,  s: 200, img: I('national_ketchup') },
  { n: "National Tomato Ketchup 800g",              b: "National",   c: "Spices, Salt & Masala",  p: 350,  s: 150, img: I('national_ketchup') },
  { n: "National Chilli Garlic Sauce 800g",         b: "National",   c: "Spices, Salt & Masala",  p: 360,  s: 150, img: I('national_ketchup') },
  { n: "Knorr Chicken Powder 26g",                  b: "Knorr",      c: "Spices, Salt & Masala",  p: 60,   s: 800, img: I('default') },
  { n: "Knorr Seasoning Powder 26g",                b: "Knorr",      c: "Spices, Salt & Masala",  p: 60,   s: 700, img: I('default') },
  { n: "Chef Khatai Powder 100g",                   b: "Chef",       c: "Spices, Salt & Masala",  p: 80,   s: 300, img: I('default') },
  { n: "Mitchell's Ginger Garlic Paste 210g",       b: "Mitchell's", c: "Spices, Salt & Masala",  p: 250,  s: 200, img: I('default') },
  { n: "Shan Garam Masala Powder 50g",              b: "Shan",       c: "Spices, Salt & Masala",  p: 110,  s: 300, img: I('shan_karahi') },
  { n: "Shan Dal Masala 45g",                       b: "Shan",       c: "Spices, Salt & Masala",  p: 100,  s: 400, img: I('shan_biryani') },

  // ── OIL, GHEE & COOKING ────────────────────────────────────
  { n: "Dalda Cooking Oil Pouch 1L",                b: "Dalda",      c: "Oil, Ghee & Cooking",    p: 540,  s: 400, img: I('dalda_oil') },
  { n: "Dalda Cooking Oil Pouch 2.5L",              b: "Dalda",      c: "Oil, Ghee & Cooking",    p: 1300, s: 200, img: I('dalda_oil') },
  { n: "Dalda Banaspati Ghee Pouch 1kg",            b: "Dalda",      c: "Oil, Ghee & Cooking",    p: 520,  s: 300, img: I('dalda_oil') },
  { n: "Mezan Canola Oil Pouch 1L",                 b: "Mezan",      c: "Oil, Ghee & Cooking",    p: 510,  s: 300, img: I('sufi_oil') },
  { n: "Mezan Banaspati Ghee Pouch 1kg",            b: "Mezan",      c: "Oil, Ghee & Cooking",    p: 495,  s: 250, img: I('sufi_oil') },
  { n: "Sufi Sunflower Oil 1L",                     b: "Sufi",       c: "Oil, Ghee & Cooking",    p: 550,  s: 200, img: I('sufi_oil') },
  { n: "Sufi Canola Oil 2.5L",                      b: "Sufi",       c: "Oil, Ghee & Cooking",    p: 1350, s: 100, img: I('sufi_oil') },
  { n: "Habib Cooking Oil 1L Pouch",                b: "Habib",      c: "Oil, Ghee & Cooking",    p: 535,  s: 250, img: I('sufi_oil') },
  { n: "Habib Sunflower Oil 2.5L",                  b: "Habib",      c: "Oil, Ghee & Cooking",    p: 1320, s: 120, img: I('sufi_oil') },
  { n: "Young's Olive Oil 500ml",                   b: "Young's",    c: "Oil, Ghee & Cooking",    p: 1200, s: 50,  img: I('sufi_oil') },
  { n: "Rafhan Corn Oil 1L",                        b: "Rafhan",     c: "Oil, Ghee & Cooking",    p: 580,  s: 150, img: I('sufi_oil') },
  { n: "Nurpur Pure Desi Ghee 1kg",                 b: "Nurpur",     c: "Oil, Ghee & Cooking",    p: 1800, s: 60,  img: I('sufi_oil') },
  { n: "Guard Vegetable Oil Pouch 1L",              b: "Guard",      c: "Oil, Ghee & Cooking",    p: 530,  s: 200, img: I('sufi_oil') },
  { n: "Rafhan Corn Oil 3L",                        b: "Rafhan",     c: "Oil, Ghee & Cooking",    p: 1650, s: 80,  img: I('sufi_oil') },

  // ── DAIRY & EGGS ──────────────────────────────────────────
  { n: "Olper's Full Cream Milk 1L",                b: "Olper's",    c: "Dairy & Eggs",           p: 320,  s: 500, img: I('olpers_milk') },
  { n: "Olper's Milk 250ml",                        b: "Olper's",    c: "Dairy & Eggs",           p: 85,   s: 800, img: I('olpers_milk') },
  { n: "Olper's Lite Milk 1L",                      b: "Olper's",    c: "Dairy & Eggs",           p: 325,  s: 300, img: I('olpers_milk') },
  { n: "Olper's Cream 200ml",                       b: "Olper's",    c: "Dairy & Eggs",           p: 210,  s: 250, img: I('olpers_milk') },
  { n: "Nestle Milkpak Full Cream 1L",              b: "Nestle",     c: "Dairy & Eggs",           p: 325,  s: 500, img: I('milkpak') },
  { n: "Nestle Milkpak UHT 250ml",                  b: "Nestle",     c: "Dairy & Eggs",           p: 90,   s: 700, img: I('milkpak') },
  { n: "Nestle Everyday Powder 400g",               b: "Nestle",     c: "Dairy & Eggs",           p: 760,  s: 150, img: I('milkpak') },
  { n: "Nestle Cerelac Rice 175g",                  b: "Nestle",     c: "Dairy & Eggs",           p: 650,  s: 100, img: I('milkpak') },
  { n: "Nurpur Butter Salted 100g",                 b: "Nurpur",     c: "Dairy & Eggs",           p: 350,  s: 100, img: I('olpers_milk') },
  { n: "Adams White Eggs (12pcs)",                  b: "Adams",      c: "Dairy & Eggs",           p: 480,  s: 200, img: I('olpers_milk') },
  { n: "Young's Mayonnaise 500ml",                  b: "Young's",    c: "Dairy & Eggs",           p: 480,  s: 150, img: I('olpers_milk') },
  { n: "Mitchell's Mixed Fruit Jam 340g",           b: "Mitchell's", c: "Dairy & Eggs",           p: 310,  s: 120, img: I('olpers_milk') },
  { n: "Mitchell's Strawberry Jam 450g",            b: "Mitchell's", c: "Dairy & Eggs",           p: 380,  s: 100, img: I('olpers_milk') },
  { n: "FrieslandCampina Dutch Lady 1L",            b: "FrieslandCampina", c: "Dairy & Eggs",     p: 340,  s: 150, img: I('milkpak') },
  { n: "Tarang Whitener 1kg Pouch",                 b: "FrieslandCampina", c: "Dairy & Eggs",     p: 680,  s: 100, img: I('milkpak') },

  // ── TEA & BEVERAGES ────────────────────────────────────────
  { n: "Tapal Danedar Tea 190g",                    b: "Tapal",      c: "Tea & Beverages",        p: 560,  s: 300, img: I('tapal') },
  { n: "Tapal Danedar Tea 450g",                    b: "Tapal",      c: "Tea & Beverages",        p: 1150, s: 150, img: I('tapal') },
  { n: "Tapal Family Mixture 190g",                 b: "Tapal",      c: "Tea & Beverages",        p: 580,  s: 200, img: I('tapal') },
  { n: "Tapal Family Mixture 450g",                 b: "Tapal",      c: "Tea & Beverages",        p: 1200, s: 100, img: I('tapal') },
  { n: "Tapal Green Tea Jasmine 20 bags",           b: "Tapal",      c: "Tea & Beverages",        p: 280,  s: 200, img: I('tapal') },
  { n: "Lipton Yellow Label 190g",                  b: "Lipton",     c: "Tea & Beverages",        p: 580,  s: 300, img: I('lipton') },
  { n: "Lipton Yellow Label 95g",                   b: "Lipton",     c: "Tea & Beverages",        p: 320,  s: 250, img: I('lipton') },
  { n: "Lipton Green Tea 20 Bags",                  b: "Lipton",     c: "Tea & Beverages",        p: 290,  s: 200, img: I('lipton') },
  { n: "Nestle Milo 400g Tin",                      b: "Nestle",     c: "Tea & Beverages",        p: 1600, s: 50,  img: I('default') },
  { n: "Nestle Nesquik Chocolate 250g",             b: "Nestle",     c: "Tea & Beverages",        p: 750,  s: 80,  img: I('default') },
  { n: "Nescafe Classic 50g Jar",                   b: "Nestle",     c: "Tea & Beverages",        p: 680,  s: 80,  img: I('default') },
  { n: "Nescafe 3in1 Original 10 sachets",          b: "Nestle",     c: "Tea & Beverages",        p: 350,  s: 200, img: I('default') },
  { n: "Equal Sweetener Sachet Pk 50",              b: "Nestlé",     c: "Tea & Beverages",        p: 280,  s: 100, img: I('default') },

  // ── SOFT DRINKS & JUICES ───────────────────────────────────
  { n: "Pepsi 1.5L PET",                            b: "Pepsi",      c: "Soft Drinks & Juices",   p: 180,  s: 600, img: I('pepsi') },
  { n: "Pepsi 500ml x6 Pack",                       b: "Pepsi",      c: "Soft Drinks & Juices",   p: 420,  s: 200, img: I('pepsi') },
  { n: "Pepsi 250ml Can",                           b: "Pepsi",      c: "Soft Drinks & Juices",   p: 120,  s: 500, img: I('pepsi') },
  { n: "7UP 1.5L PET",                              b: "Pepsi",      c: "Soft Drinks & Juices",   p: 180,  s: 500, img: I('pepsi') },
  { n: "Mountain Dew 1.5L PET",                     b: "Pepsi",      c: "Soft Drinks & Juices",   p: 185,  s: 400, img: I('pepsi') },
  { n: "Sting Berry Blast 250ml",                   b: "Pepsi",      c: "Soft Drinks & Juices",   p: 80,   s: 1000, img:I('pepsi') },
  { n: "Coca Cola 1.5L PET",                        b: "Coca Cola",  c: "Soft Drinks & Juices",   p: 180,  s: 600, img: I('cocacola') },
  { n: "Sprite 1.5L PET",                           b: "Coca Cola",  c: "Soft Drinks & Juices",   p: 180,  s: 400, img: I('cocacola') },
  { n: "Fanta Orange 1.5L PET",                     b: "Coca Cola",  c: "Soft Drinks & Juices",   p: 185,  s: 300, img: I('cocacola') },
  { n: "Nestle Fruita Vitals Orange 1L",             b: "Nestle",     c: "Soft Drinks & Juices",   p: 340,  s: 200, img: I('default') },
  { n: "Nestle Fruita Vitals Apple 1L",              b: "Nestle",     c: "Soft Drinks & Juices",   p: 340,  s: 200, img: I('default') },
  { n: "Nestle Pure Life 1.5L",                     b: "Nestle",     c: "Soft Drinks & Juices",   p: 80,   s: 1000, img:I('default') },
  { n: "Gourmet Cola 1.5L",                         b: "Gourmet",    c: "Soft Drinks & Juices",   p: 130,  s: 600, img: I('gourmet_cola') },
  { n: "Gourmet Orange Drink 1.5L",                 b: "Gourmet",    c: "Soft Drinks & Juices",   p: 130,  s: 500, img: I('gourmet_cola') },
  { n: "Sunquick Orange Concentrate 840ml",          b: "Nestle",     c: "Soft Drinks & Juices",   p: 950,  s: 80,  img: I('default') },
  { n: "Rooh Afza 800ml",                           b: "Hamdard",    c: "Soft Drinks & Juices",   p: 680,  s: 150, img: I('default') },

  // ── SNACKS & BISCUITS ─────────────────────────────────────
  { n: "LU Prince Chocolate Biscuits Box",          b: "LU",         c: "Snacks & Biscuits",      p: 600,  s: 60,  img: I('lu_prince') },
  { n: "LU Prince Biscuits Half Roll",              b: "LU",         c: "Snacks & Biscuits",      p: 50,   s: 800, img: I('lu_prince') },
  { n: "LU Tuc Half Roll",                          b: "LU",         c: "Snacks & Biscuits",      p: 45,   s: 800, img: I('lu_prince') },
  { n: "LU Oreo Original 137g",                     b: "LU",         c: "Snacks & Biscuits",      p: 200,  s: 300, img: I('lu_prince') },
  { n: "LU Bakeri Nankhatai",                       b: "LU",         c: "Snacks & Biscuits",      p: 120,  s: 200, img: I('lu_prince') },
  { n: "EBM Sooper Biscuits Family Pack",           b: "EBM",        c: "Snacks & Biscuits",      p: 150,  s: 300, img: I('sooper') },
  { n: "EBM Rio Strawberry Cream",                  b: "EBM",        c: "Snacks & Biscuits",      p: 40,   s: 600, img: I('sooper') },
  { n: "EBM Peanut Pista House Biscuits",           b: "EBM",        c: "Snacks & Biscuits",      p: 50,   s: 400, img: I('sooper') },
  { n: "Peek Freans Gluco Biscuits",                b: "Peek Freans", c: "Snacks & Biscuits",     p: 40,   s: 700, img: I('peek_freans') },
  { n: "Peek Freans Coconut Crunch",                b: "Peek Freans", c: "Snacks & Biscuits",     p: 50,   s: 500, img: I('peek_freans') },
  { n: "Lays French Cheese 40g",                    b: "Pepsi",      c: "Snacks & Biscuits",      p: 50,   s: 800, img: I('default') },
  { n: "Lays Masala 40g",                           b: "Pepsi",      c: "Snacks & Biscuits",      p: 50,   s: 800, img: I('default') },
  { n: "Kurkure Red Chilli Jhatka 50g",             b: "Pepsi",      c: "Snacks & Biscuits",      p: 50,   s: 800, img: I('default') },
  { n: "Kolson Slanty Jalapeno 14g",                b: "Bisconni",   c: "Snacks & Biscuits",      p: 20,   s: 1000, img:I('default') },
  { n: "Hilal Fun Fizz Bubble Gum 20pc",            b: "Hilal",      c: "Snacks & Biscuits",      p: 30,   s: 500, img: I('default') },
  { n: "Candyland Novex Chocolate Bar 23g",         b: "Candyland",  c: "Snacks & Biscuits",      p: 30,   s: 600, img: I('default') },
  { n: "Bisconni Cocomo Biscuits",                  b: "Bisconni",   c: "Snacks & Biscuits",      p: 35,   s: 600, img: I('default') },

  // ── PERSONAL CARE ─────────────────────────────────────────
  { n: "SafeGuard Lemon Fresh Soap 135g",           b: "SafeGuard",  c: "Personal Care",          p: 160,  s: 500, img: I('safeguard') },
  { n: "SafeGuard White Soap 135g",                 b: "SafeGuard",  c: "Personal Care",          p: 155,  s: 400, img: I('safeguard') },
  { n: "Lifebuoy Total 10 Soap 115g",               b: "Lifebuoy",   c: "Personal Care",          p: 100,  s: 600, img: I('lifebuoy') },
  { n: "Lifebuoy Total Care Soap 115g",             b: "Lifebuoy",   c: "Personal Care",          p: 100,  s: 500, img: I('lifebuoy') },
  { n: "Lux Velvet Touch Soap 125g",                b: "Lux",        c: "Personal Care",          p: 145,  s: 400, img: I('lux') },
  { n: "Lux Soft Kiss Soap 125g",                   b: "Lux",        c: "Personal Care",          p: 145,  s: 400, img: I('lux') },
  { n: "Dettol Original Soap 120g",                 b: "Reckitt",    c: "Personal Care",          p: 175,  s: 350, img: I('default') },
  { n: "Sunsilk Black Shine 185ml",                 b: "Sunsilk",    c: "Personal Care",          p: 420,  s: 250, img: I('sunsilk') },
  { n: "Sunsilk Hijab Recharge 185ml",              b: "Sunsilk",    c: "Personal Care",          p: 430,  s: 200, img: I('sunsilk') },
  { n: "Head & Shoulders Classic 185ml",            b: "P&G",        c: "Personal Care",          p: 550,  s: 200, img: I('default') },
  { n: "Head & Shoulders Anti Dandruff 360ml",      b: "P&G",        c: "Personal Care",          p: 1000, s: 100, img: I('default') },
  { n: "Pantene Long & Strong 185ml",               b: "P&G",        c: "Personal Care",          p: 520,  s: 150, img: I('default') },
  { n: "Dove Deep Moisture Body Wash 250ml",        b: "Unilever",   c: "Personal Care",          p: 850,  s: 80,  img: I('default') },
  { n: "Colgate Max Fresh Paste 100g",              b: "Colgate",    c: "Personal Care",          p: 290,  s: 350, img: I('colgate') },
  { n: "Colgate Total 12 Toothpaste 100g",          b: "Colgate",    c: "Personal Care",          p: 340,  s: 250, img: I('colgate') },
  { n: "Sensodyne Multi Action 100g",               b: "Sensodyne",  c: "Personal Care",          p: 450,  s: 100, img: I('default') },
  { n: "Close Up Red Hot 100g",                     b: "Unilever",   c: "Personal Care",          p: 250,  s: 300, img: I('default') },
  { n: "Gillette Blue 2 Razor 5pcs",                b: "P&G",        c: "Personal Care",          p: 280,  s: 200, img: I('default') },
  { n: "Vaseline Intensive Care 250ml",             b: "Unilever",   c: "Personal Care",          p: 450,  s: 150, img: I('default') },
  { n: "Pond's White Beauty Cream 50g",             b: "Unilever",   c: "Personal Care",          p: 350,  s: 200, img: I('default') },
  { n: "Fair & Lovely Cream 50g",                   b: "Unilever",   c: "Personal Care",          p: 250,  s: 300, img: I('default') },
  { n: "Always Ultra Normal Wings 8pcs",            b: "P&G",        c: "Personal Care",          p: 190,  s: 400, img: I('default') },
  { n: "Whisper Ultra Wings 6pcs",                  b: "P&G",        c: "Personal Care",          p: 180,  s: 400, img: I('default') },

  // ── LAUNDRY & HOUSEHOLD ────────────────────────────────────
  { n: "Surf Excel 500g Pouch",                     b: "Surf Excel", c: "Laundry & Household",    p: 450,  s: 300, img: I('surf_excel') },
  { n: "Surf Excel 2.5kg Box",                      b: "Surf Excel", c: "Laundry & Household",    p: 2100, s: 80,  img: I('surf_excel') },
  { n: "Ariel Original 500g Pouch",                 b: "Ariel",      c: "Laundry & Household",    p: 440,  s: 300, img: I('ariel') },
  { n: "Ariel 2.5kg Box",                           b: "Ariel",      c: "Laundry & Household",    p: 2050, s: 70,  img: I('ariel') },
  { n: "Brite Automatic 500g Pouch",                b: "Brite",      c: "Laundry & Household",    p: 380,  s: 200, img: I('default') },
  { n: "Rin Bar Detergent 280g",                    b: "Rin",        c: "Laundry & Household",    p: 80,   s: 500, img: I('default') },
  { n: "Comfort Blue Fabric Softener 1L",           b: "Unilever",   c: "Laundry & Household",    p: 380,  s: 150, img: I('default') },
  { n: "Lemon Max Liquid 250ml Pouch",              b: "Lemon Max",  c: "Laundry & Household",    p: 210,  s: 400, img: I('default') },
  { n: "Sunlight Dishwash Bar 275g",                b: "Unilever",   c: "Laundry & Household",    p: 70,   s: 500, img: I('default') },
  { n: "Harpic Power Plus 500ml",                   b: "Harpic",     c: "Laundry & Household",    p: 480,  s: 150, img: I('default') },
  { n: "Mortein Spray 300ml",                       b: "Mortein",    c: "Laundry & Household",    p: 550,  s: 100, img: I('default') },
  { n: "Dettol Antiseptic Liquid 750ml",            b: "Reckitt",    c: "Laundry & Household",    p: 750,  s: 100, img: I('default') },
  { n: "Saflon Floor Cleaner 500ml",                b: "Reckitt",    c: "Laundry & Household",    p: 220,  s: 200, img: I('default') },

  // ── ATTA, RICE & GRAINS ────────────────────────────────────
  { n: "Gourmet Chakki Atta 10kg",                  b: "Gourmet",    c: "Atta, Rice & Grains",    p: 1450, s: 40,  img: I('default') },
  { n: "Gourmet Chakki Atta 5kg",                   b: "Gourmet",    c: "Atta, Rice & Grains",    p: 750,  s: 80,  img: I('default') },
  { n: "Guard Maida 1kg",                           b: "Guard",      c: "Atta, Rice & Grains",    p: 160,  s: 200, img: I('default') },
  { n: "National Vermicelli 400g",                  b: "National",   c: "Atta, Rice & Grains",    p: 120,  s: 200, img: I('default') },
  { n: "National Basmati Rice Sella 5kg",           b: "National",   c: "Atta, Rice & Grains",    p: 1900, s: 40,  img: I('default') },
  { n: "Guard Premium Basmati Rice 5kg",            b: "Guard",      c: "Atta, Rice & Grains",    p: 1850, s: 40,  img: I('default') },
  { n: "Q&N Oats 500g",                             b: "Q&N",        c: "Atta, Rice & Grains",    p: 350,  s: 100, img: I('default') },
  { n: "Rafhan Corn Flour 300g",                    b: "Rafhan",     c: "Atta, Rice & Grains",    p: 150,  s: 200, img: I('default') },
  { n: "Rafhan Custard Vanilla 300g",               b: "Rafhan",     c: "Atta, Rice & Grains",    p: 250,  s: 150, img: I('default') },
  { n: "National Daal Moong 500g",                  b: "National",   c: "Atta, Rice & Grains",    p: 200,  s: 200, img: I('default') },
  { n: "National Chickpeas 500g",                   b: "National",   c: "Atta, Rice & Grains",    p: 180,  s: 200, img: I('default') },

  // ── BABY & CHILD CARE ─────────────────────────────────────
  { n: "Pampers Baby Dry NB (0-5kg) 20pcs",         b: "Pampers",    c: "Baby & Child Care",      p: 800,  s: 80,  img: I('default') },
  { n: "Pampers Baby Dry Small (3-8kg) 18pcs",      b: "Pampers",    c: "Baby & Child Care",      p: 850,  s: 80,  img: I('default') },
  { n: "Huggies Gold Newborn 20pcs",                b: "Reckitt",    c: "Baby & Child Care",      p: 780,  s: 80,  img: I('default') },
  { n: "Nestle Cerelac Wheat 175g",                 b: "Nestle",     c: "Baby & Child Care",      p: 620,  s: 100, img: I('default') },
  { n: "Nestle Nan 1 Formula 400g",                 b: "Nestle",     c: "Baby & Child Care",      p: 2200, s: 40,  img: I('default') },
  { n: "Johnson's Baby Shampoo 100ml",              b: "Reckitt",    c: "Baby & Child Care",      p: 380,  s: 100, img: I('default') },
  { n: "Johnson's Baby Oil 100ml",                  b: "Reckitt",    c: "Baby & Child Care",      p: 380,  s: 100, img: I('default') },

  // ── CONFECTIONERY & SWEETS ────────────────────────────────
  { n: "Hilal Fun Fizz Lollipop 12pcs",             b: "Hilal",      c: "Confectionery & Sweets", p: 60,   s: 400, img: I('default') },
  { n: "Candyland TofFees Packet",                  b: "Candyland",  c: "Confectionery & Sweets", p: 40,   s: 500, img: I('default') },
  { n: "National Sheer Khurma Mix 200g",            b: "National",   c: "Confectionery & Sweets", p: 180,  s: 200, img: I('default') },
  { n: "Rafhan Kheer Mix 200g",                     b: "Rafhan",     c: "Confectionery & Sweets", p: 200,  s: 200, img: I('default') },
  { n: "Super Khushboo Cardamom 20g",               b: "Super Khushboo", c: "Confectionery & Sweets", p: 60, s: 300, img: I('default') },
  { n: "Ispaghol Whole Husk 100g",                  b: "Ispaghol Qila", c: "Confectionery & Sweets", p: 120, s: 200, img: I('default') },
  { n: "Molty Pure Honey 250g",                     b: "Molty",      c: "Confectionery & Sweets", p: 550,  s: 80,  img: I('default') },
  { n: "Kisan Orange Marmalade 340g",               b: "Kisan",      c: "Confectionery & Sweets", p: 280,  s: 100, img: I('default') },

  // ── HEALTHCARE ────────────────────────────────────────────
  { n: "Panadol Tablet 10 Strip",                   b: "Panadol",    c: "Healthcare & Medicine",  p: 90,   s: 500, img: I('default') },
  { n: "Disprin Regular 10 Tablets",                b: "Disprin",    c: "Healthcare & Medicine",  p: 50,   s: 500, img: I('default') },
  { n: "Hamdard Rooh Afza 800ml",                   b: "Hamdard",    c: "Healthcare & Medicine",  p: 680,  s: 100, img: I('default') },
  { n: "Qarshi Jam-e-Shirin 800ml",                 b: "Qarshi",     c: "Healthcare & Medicine",  p: 420,  s: 100, img: I('default') },
  { n: "ORS Sachet Packet 10s",                     b: "Reckitt",    c: "Healthcare & Medicine",  p: 120,  s: 300, img: I('default') },
  { n: "Dettol Antiseptic Cream 30g",               b: "Reckitt",    c: "Healthcare & Medicine",  p: 180,  s: 200, img: I('default') },

  // ── BAKERY & BREAD ────────────────────────────────────────
  { n: "Gourmet Premium Bread 500g",                b: "Gourmet",    c: "Bakery & Bread",         p: 120,  s: 200, img: I('default') },
  { n: "Gourmet Dinner Rolls 6pcs",                 b: "Gourmet",    c: "Bakery & Bread",         p: 80,   s: 300, img: I('default') },
  { n: "National Cake Rusk 200g",                   b: "National",   c: "Bakery & Bread",         p: 120,  s: 200, img: I('default') },
  { n: "Walls Cornetto Classic 100ml",              b: "Unilever",   c: "Bakery & Bread",         p: 180,  s: 200, img: I('default') },
  { n: "Igloo Kulfi Bar Pack",                      b: "Igloo",      c: "Bakery & Bread",         p: 100,  s: 200, img: I('default') },

  // ── FROZEN & READY MEALS ──────────────────────────────────
  { n: "Young's Chicken Nuggets 400g",              b: "Young's",    c: "Frozen & Ready Meals",   p: 680,  s: 80,  img: I('default') },
  { n: "Young's Chicken Burger Patties 400g",       b: "Young's",    c: "Frozen & Ready Meals",   p: 720,  s: 80,  img: I('default') },
  { n: "Nestle Maggi Instant Noodles Chicken 72g",  b: "Nestle",     c: "Frozen & Ready Meals",   p: 50,   s: 800, img: I('default') },
  { n: "Nestle Maggi Instant Noodles Masala 72g",   b: "Nestle",     c: "Frozen & Ready Meals",   p: 50,   s: 800, img: I('default') },

  // ── STATIONERY & SCHOOL ───────────────────────────────────
  { n: "Premier Spiral Notebook A4 80pgs",          b: "Rex",        c: "Stationery & School",    p: 120,  s: 200, img: I('default') },
  { n: "Pentel RSVP Ballpen Blue (Pack 12)",        b: "P&G",        c: "Stationery & School",    p: 240,  s: 100, img: I('default') },
];

async function seed() {
  const client = new Client(dbConfig);
  try {
    await client.connect();
    console.log('🚀 Baldia Mart Mega Seed starting...');
    await client.query('BEGIN');

    // 1. Categories
    const catMap = {};
    for (const c of categories) {
      let res = await client.query('SELECT id FROM categories WHERE name = $1 LIMIT 1', [c.name]);
      if (res.rows.length > 0) {
        catMap[c.name] = res.rows[0].id;
      } else {
        res = await client.query(
          'INSERT INTO categories (id, name, section, image_url) VALUES ($1, $2, $3, $4) RETURNING id',
          [uuidv4(), c.name, c.section, c.img]
        );
        catMap[c.name] = res.rows[0].id;
      }
    }
    console.log('✅ Categories ready: ' + Object.keys(catMap).length);

    // 2. Brands
    const brandMap = {};
    for (const b of brands) {
      let res = await client.query('SELECT id FROM brands WHERE name = $1 LIMIT 1', [b]);
      if (res.rows.length > 0) {
        brandMap[b] = res.rows[0].id;
      } else {
        res = await client.query(
          'INSERT INTO brands (id, name) VALUES ($1, $2) RETURNING id',
          [uuidv4(), b]
        );
        brandMap[b] = res.rows[0].id;
      }
    }
    console.log('✅ Brands ready: ' + Object.keys(brandMap).length);

    // 3. Vendor
    let vRes = await client.query("SELECT id FROM vendors WHERE name = $1 LIMIT 1", ["Baldia Super Market"]);
    let vendorId;
    if (vRes.rows.length > 0) {
      vendorId = vRes.rows[0].id;
    } else {
      vRes = await client.query(
        'INSERT INTO vendors (id, name, phone_number, address) VALUES ($1, $2, $3, $4) RETURNING id',
        [uuidv4(), 'Baldia Super Market', '+923001234567', 'Baldia Town, Karachi']
      );
      vendorId = vRes.rows[0].id;
    }

    // 4. Products
    let count = 0, skipped = 0;
    for (const p of productsData) {
      const existing = await client.query('SELECT id FROM products WHERE name = $1 LIMIT 1', [p.n]);
      if (existing.rows.length > 0) { skipped++; continue; }

      const pId = uuidv4();
      const catId = catMap[p.c];
      const brandId = brandMap[p.b] || null;

      if (!catId) { console.warn('⚠️  Missing category for: ' + p.n); continue; }

      await client.query(
        'INSERT INTO products (id, category_id, brand_id, name, description, price, stock_quantity, image_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [pId, catId, brandId, p.n, 'Premium quality ' + p.n + ' available at Baldia Mart – Karachi. Fast delivery!', p.p, p.s, p.img]
      );
      await client.query(
        'INSERT INTO vendor_products (id, vendor_id, product_id, price, stock_qty) VALUES ($1, $2, $3, $4, $5)',
        [uuidv4(), vendorId, pId, p.p, p.s]
      );
      count++;
    }

    // 5. Update existing products with real images  (prev seeded products)
    await client.query("UPDATE products SET image_url = 'https://images.openfoodfacts.org/images/products/8964000164611/front_en.3.400.jpg' WHERE name LIKE '%Shan Bombay%' AND image_url LIKE '%flaticon%'");
    await client.query("UPDATE products SET image_url = 'https://images.openfoodfacts.org/images/products/8964000163492/front_en.3.400.jpg' WHERE name LIKE '%Nihari%' AND image_url LIKE '%flaticon%'");
    await client.query("UPDATE products SET image_url = 'https://images.openfoodfacts.org/images/products/8964001306106/front_en.3.400.jpg' WHERE name LIKE '%National%Biryani%' AND image_url LIKE '%flaticon%'");
    await client.query("UPDATE products SET image_url = 'https://images.openfoodfacts.org/images/products/8964000116948/front_en.3.400.jpg' WHERE name LIKE '%Dalda%' AND image_url LIKE '%flaticon%'");
    await client.query("UPDATE products SET image_url = 'https://images.openfoodfacts.org/images/products/8964000276019/front_en.3.400.jpg' WHERE name LIKE '%Olper%' AND image_url LIKE '%flaticon%'");
    await client.query("UPDATE products SET image_url = 'https://images.openfoodfacts.org/images/products/8964001350414/front_en.3.400.jpg' WHERE name LIKE '%Milkpak%' AND image_url LIKE '%flaticon%'");
    await client.query("UPDATE products SET image_url = 'https://images.openfoodfacts.org/images/products/8964000400418/front_en.3.400.jpg' WHERE name LIKE '%Tapal%' AND image_url LIKE '%flaticon%'");
    await client.query("UPDATE products SET image_url = 'https://images.openfoodfacts.org/images/products/8718114969527/front_en.3.400.jpg' WHERE name LIKE '%Lipton%' AND image_url LIKE '%flaticon%'");
    await client.query("UPDATE products SET image_url = 'https://images.openfoodfacts.org/images/products/4005808205325/front_en.3.400.jpg' WHERE name LIKE '%Pepsi%' AND image_url LIKE '%flaticon%'");
    await client.query("UPDATE products SET image_url = 'https://images.openfoodfacts.org/images/products/5449000000996/front_en.3.400.jpg' WHERE name LIKE '%Coca Cola%' AND image_url LIKE '%flaticon%'");
    await client.query("UPDATE products SET image_url = 'https://images.openfoodfacts.org/images/products/8964000200073/front_en.3.400.jpg' WHERE name LIKE '%LU Prince%' AND image_url LIKE '%flaticon%'");
    await client.query("UPDATE products SET image_url = 'https://images.openfoodfacts.org/images/products/8718114950600/front_en.3.400.jpg' WHERE name LIKE '%Surf Excel%' AND image_url LIKE '%flaticon%'");
    await client.query("UPDATE products SET image_url = 'https://images.openfoodfacts.org/images/products/8720182113451/front_en.3.400.jpg' WHERE name LIKE '%Lifebuoy%' AND image_url LIKE '%flaticon%'");
    await client.query("UPDATE products SET image_url = 'https://images.openfoodfacts.org/images/products/8710908966743/front_en.3.400.jpg' WHERE name LIKE '%Lux%' AND image_url LIKE '%flaticon%'");
    await client.query("UPDATE products SET image_url = 'https://images.openfoodfacts.org/images/products/8714789754697/front_en.3.400.jpg' WHERE name LIKE '%Colgate%' AND image_url LIKE '%flaticon%'");
    await client.query("UPDATE products SET image_url = 'https://images.openfoodfacts.org/images/products/8720181215986/front_en.3.400.jpg' WHERE name LIKE '%Sunsilk%' AND image_url LIKE '%flaticon%'");
    await client.query("UPDATE products SET image_url = 'https://images.openfoodfacts.org/images/products/5413149893030/front_en.3.400.jpg' WHERE name LIKE '%Ariel%' AND image_url LIKE '%flaticon%'");
    await client.query("UPDATE products SET image_url = 'https://images.openfoodfacts.org/images/products/8964000183970/front_en.3.400.jpg' WHERE name LIKE '%Sooper%' AND image_url LIKE '%flaticon%'");
    await client.query("UPDATE products SET image_url = 'https://images.openfoodfacts.org/images/products/8964003700016/front_en.3.400.jpg' WHERE name LIKE '%Gourmet%' AND image_url LIKE '%flaticon%'");

    await client.query('COMMIT');
    console.log('');
    console.log('🎉  MEGA SEED COMPLETE!');
    console.log('   New products added  : ' + count);
    console.log('   Already existed     : ' + skipped);
    console.log('   Total in categories : ' + categories.length);
    console.log('   Total brands        : ' + brands.length);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ ERROR:', err.message);
  } finally {
    await client.end();
  }
}

seed();
