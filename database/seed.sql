-- Clear existing seeds for a fresh start
TRUNCATE products, categories, delivery_zones CASCADE;

-- Baldia Town / Karachi Delivery Zone
INSERT INTO delivery_zones (name, center_lat, center_lng, radius_km)
VALUES ('Baldia Town & Surroundings', 24.9144, 66.9748, 50.00);

-- Categories
INSERT INTO categories (name, description, image_url) VALUES 
('Vegetables', 'Farm fresh local produce', 'https://images.unsplash.com/photo-1597362868479-dfec3ac22784?w=400&h=400&fit=crop'),
('Fruits', 'Seasonal and exotic fruits', 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400&h=400&fit=crop'),
('Meat & Poultry', 'Fresh halal mutton, beef, and chicken', 'https://images.unsplash.com/photo-1607623273465-83f886f6f04b?w=400&h=400&fit=crop'),
('Dairy & Breakfast', 'Milk, eggs, butter, and bread', 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=400&fit=crop'),
('Beverages', 'Soft drinks, juices, and water', 'https://images.unsplash.com/photo-1563206767-5b18f218e8de?w=400&h=400&fit=crop'),
('Snacks', 'Chips, biscuits, and namkeen', 'https://images.unsplash.com/photo-1566478989037-e923e528d4fa?w=400&h=400&fit=crop'),
('Frozen Foods', 'Ready to cook items', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=400&fit=crop'),
('Personal Care', 'Soap, shampoo, and hygiene', 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&h=400&fit=crop');

-- Bulk Products Seed
DO $$ 
DECLARE
  v_cat UUID;
  f_cat UUID;
  m_cat UUID;
  d_cat UUID;
  b_cat UUID;
  s_cat UUID;
  fz_cat UUID;
  p_cat UUID;
BEGIN
  SELECT id INTO v_cat FROM categories WHERE name = 'Vegetables';
  SELECT id INTO f_cat FROM categories WHERE name = 'Fruits';
  SELECT id INTO m_cat FROM categories WHERE name = 'Meat & Poultry';
  SELECT id INTO d_cat FROM categories WHERE name = 'Dairy & Breakfast';
  SELECT id INTO b_cat FROM categories WHERE name = 'Beverages';
  SELECT id INTO s_cat FROM categories WHERE name = 'Snacks';
  SELECT id INTO fz_cat FROM categories WHERE name = 'Frozen Foods';
  SELECT id INTO p_cat FROM categories WHERE name = 'Personal Care';

  -- Vegetables (10 items)
  INSERT INTO products (category_id, name, price, discount_price, stock_quantity, image_url) VALUES 
  (v_cat, 'Potatoes (Alu) 1kg', 1.00, 0.90, 500, 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400'),
  (v_cat, 'Onions (Piyaz) 1kg', 1.50, 1.40, 400, 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=400'),
  (v_cat, 'Tomatoes (Tamatar) 1kg', 2.00, 1.80, 200, 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400'),
  (v_cat, 'Garlic (Lehsun) 250g', 0.80, 0.80, 100, 'https://images.unsplash.com/photo-1596715694762-b91c01e6a640?w=400'),
  (v_cat, 'Ginger (Adrak) 250g', 1.20, 1.10, 100, 'https://images.unsplash.com/photo-1582515073490-39981397c445?w=400'),
  (v_cat, 'Green Chillies 250g', 0.50, 0.50, 150, 'https://images.unsplash.com/photo-1588253584674-279fd902a632?w=400'),
  (v_cat, 'Lemon (Nimbu) 250g', 1.00, 0.90, 100, 'https://images.unsplash.com/photo-1590505680514-41617415442e?w=400'),
  (v_cat, 'Okra (Bhindi) 500g', 1.50, 1.50, 80, 'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?w=400'),
  (v_cat, 'Coriander (Dhanya) Bunch', 0.30, 0.30, 300, 'https://images.unsplash.com/photo-1593510912163-90326194ec89?w=400'),
  (v_cat, 'Mint (Podina) Bunch', 0.20, 0.20, 300, 'https://images.unsplash.com/photo-1615484477778-ca3b77918451?w=400');

  -- Fruits (8 items)
  INSERT INTO products (category_id, name, price, discount_price, stock_quantity, image_url) VALUES 
  (f_cat, 'Bananas (Dozen)', 2.00, 1.50, 200, 'https://images.unsplash.com/photo-1571771894821-ad99621139c4?w=400'),
  (f_cat, 'Red Apples (Local) 1kg', 3.00, 2.50, 150, 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=400'),
  (f_cat, 'Oranges (Kino) Dozen', 4.00, 3.80, 100, 'https://images.unsplash.com/photo-1557800636-894a64c1696f?w=400'),
  (f_cat, 'Pomegranate (Anar) 1kg', 5.00, 4.50, 50, 'https://images.unsplash.com/photo-1620127814421-392da26369f6?w=400'),
  (f_cat, 'Guava (Amrud) 1kg', 2.00, 1.80, 80, 'https://images.unsplash.com/photo-1534073828943-f801091bb18c?w=400'),
  (f_cat, 'Papaya (Papeeta) kg', 2.50, 2.00, 40, 'https://images.unsplash.com/photo-1517282009859-f000ec2b2693?w=400'),
  (f_cat, 'Grapes (Angoor) 500g', 3.00, 2.80, 60, 'https://images.unsplash.com/photo-1537640538966-79f369b41e8f?w=400'),
  (f_cat, 'Dates (Khajoor) 500g', 4.00, 3.50, 100, 'https://images.unsplash.com/photo-1596716039572-c2e0b5b144fa?w=400');

  -- Meat (6 items)
  INSERT INTO products (category_id, name, price, discount_price, stock_quantity, image_url) VALUES 
  (m_cat, 'Fresh Chicken (Whole) kg', 5.00, 4.80, 100, 'https://images.unsplash.com/photo-1587593817645-425017df7fdb?w=400'),
  (m_cat, 'Beef (Boneless) kg', 8.00, 8.00, 50, 'https://images.unsplash.com/photo-1588168333986-50d8184b3c58?w=400'),
  (m_cat, 'Mutton (Mixed) kg', 15.00, 14.50, 30, 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=400'),
  (m_cat, 'Chicken Breast (500g)', 3.50, 3.50, 40, 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400'),
  (m_cat, 'Minced Beef (Qeema) 1kg', 9.00, 8.50, 40, 'https://images.unsplash.com/photo-1588168333986-50d8184b3c58?w=400'),
  (m_cat, 'Chicken Wings (500g)', 2.50, 2.20, 60, 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=400');

  -- Dairy (8 items)
  INSERT INTO products (category_id, name, price, discount_price, stock_quantity, image_url) VALUES 
  (d_cat, 'Fresh Milk (1L)', 1.50, 1.40, 200, 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400'),
  (d_cat, 'Farm Eggs (1 Dozen)', 2.50, 2.20, 100, 'https://images.unsplash.com/photo-1587486913049-53fc88980cfc?w=400'),
  (d_cat, 'Yogurt (Dahi) 500g', 1.00, 1.00, 80, 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400'),
  (d_cat, 'Salted Butter (200g)', 3.00, 2.80, 60, 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400'),
  (d_cat, 'White Bread Large', 1.20, 1.10, 50, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400'),
  (d_cat, 'Cheddar Cheese Slice (10pk)', 4.00, 3.50, 40, 'https://images.unsplash.com/photo-1618164435735-413d3b066c9a?w=400'),
  (d_cat, 'Brown Eggs (1 Dozen)', 3.50, 3.20, 50, 'https://images.unsplash.com/photo-1582721232127-9641f39714a4?w=400'),
  (d_cat, 'Fruit Yogurt (Strawberry)', 0.80, 0.70, 100, 'https://images.unsplash.com/photo-1571212515416-fef01fc43637?w=400');

  -- Snacks & Beverages (10 items)
  INSERT INTO products (category_id, name, price, discount_price, stock_quantity, image_url) VALUES 
  (b_cat, 'Coca Cola 1.5L', 1.20, 1.10, 300, 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400'),
  (b_cat, 'Mineral Water 1.5L', 0.50, 0.40, 500, 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400'),
  (b_cat, 'Orange Juice (Tetra Pak) 1L', 2.00, 1.80, 150, 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400'),
  (b_cat, 'Pepsi 1.5L', 1.20, 1.10, 300, 'https://images.unsplash.com/photo-1629203851022-3cd263900870?w=400'),
  (s_cat, 'Lays Classic Family Pack', 1.50, 1.40, 200, 'https://images.unsplash.com/photo-1566478989037-e923e528d4fa?w=400'),
  (s_cat, 'Kurkure Red Chilli', 0.80, 0.80, 250, 'https://images.unsplash.com/photo-1600952841320-db92ec4047ca?w=400'),
  (s_cat, 'Digestive Biscuits', 1.00, 0.90, 180, 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400'),
  (s_cat, 'Roasted Peanuts 200g', 1.20, 1.20, 100, 'https://images.unsplash.com/photo-1567894340315-735d7c361db0?w=400'),
  (s_cat, 'Chocolate Bar (Large)', 2.50, 2.20, 120, 'https://images.unsplash.com/photo-1511381939415-e4401546383d?w=400'),
  (s_cat, 'Mixed Dry Fruit 250g', 5.00, 4.50, 60, 'https://images.unsplash.com/photo-1596716039572-c2e0b5b144fa?w=400');

  -- Frozen & Care (8 items)
  INSERT INTO products (category_id, name, price, discount_price, stock_quantity, image_url) VALUES 
  (fz_cat, 'Frozen Shami Kababs (12pk)', 6.00, 5.50, 40, 'https://images.unsplash.com/photo-1541529086526-db283c563270?w=400'),
  (fz_cat, 'Chicken Nuggets (500g)', 5.00, 4.50, 50, 'https://images.unsplash.com/photo-1562967914-608f82629710?w=400'),
  (fz_cat, 'Plain Paratha (5pk)', 3.00, 2.80, 100, 'https://images.unsplash.com/photo-1589113103503-494d39358ef5?w=400'),
  (fz_cat, 'Frozen French Fries 1kg', 4.00, 3.80, 80, 'https://images.unsplash.com/photo-1573084336225-410f812dd035?w=400'),
  (p_cat, 'Hand Wash Pump 250ml', 2.50, 2.50, 100, 'https://images.unsplash.com/photo-1603513492128-ba9bc9b35842?w=400'),
  (p_cat, 'Bathing Soap (3pk)', 3.00, 2.70, 150, 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=400'),
  (p_cat, 'Shampoo Anti-Dandruff', 4.50, 4.00, 80, 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=400'),
  (p_cat, 'Toothpaste (Large)', 2.00, 1.80, 120, 'https://images.unsplash.com/photo-1559594861-16383c8990ca?w=400');

END $$;
