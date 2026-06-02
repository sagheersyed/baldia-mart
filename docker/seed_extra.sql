-- Seed Brands
INSERT INTO brands (id, name, logo_url, description, is_active) VALUES 
(gen_random_uuid(), 'Shan Foods', 'https://www.shanfoods.com/wp-content/uploads/2016/05/Logo.png', 'Premium spices and recipe mixes', true),
(gen_random_uuid(), 'National Foods', 'https://nfoods.com/wp-content/uploads/2021/04/national-logo.png', 'Leading food brand in Pakistan', true),
(gen_random_uuid(), 'Sunsilk', 'https://upload.wikimedia.org/wikipedia/en/thumb/b/b2/Sunsilk_logo.svg/1200px-Sunsilk_logo.svg.png', 'Hair care products', true);

-- Seed Restaurant Categories
INSERT INTO categories (id, name, image_url, section, is_active) VALUES 
(gen_random_uuid(), 'Fast Food', 'https://img.freepik.com/free-vector/fast-food-logo-design_23-2148476718.jpg', 'restaurant', true),
(gen_random_uuid(), 'Pakistani Food', 'https://img.freepik.com/free-vector/pakistan-map-flag_23-2148174526.jpg', 'restaurant', true);

-- Update existing categories to 'mart' section
UPDATE categories SET section = 'mart' WHERE section IS NULL OR section = '';

-- Enable feature toggles
INSERT INTO settings (key, value) VALUES 
('feature_show_restaurants', 'true'),
('feature_show_brands', 'true')
ON CONFLICT (key) DO UPDATE SET value = 'true';
