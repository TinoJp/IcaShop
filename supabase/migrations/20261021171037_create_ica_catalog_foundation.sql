/*
# Create iCa catalog foundation

1. New Tables
- `categories` stores the public product categories and their display order.
- `products` stores the single-shop inventory, pricing, stock, and active/archive state.
- `product_images` stores up to five ordered image URLs for each product.
- `settings` stores shop-wide delivery and contact settings as editable values.

2. Data rules
- Prices, delivery values, and thresholds are whole Tanzanian shilling integers.
- Product slugs and SKUs are unique.
- Product images are removed when their product is removed.
- Starter categories and products make the storefront reviewable immediately.

3. Security
- Row Level Security is enabled on every table.
- Anonymous and authenticated visitors can read active categories, active products, their ordered images, and public shop settings.
- Anonymous writes are denied. Authenticated writes are also denied until the protected admin workflow is implemented.

4. Important notes
- The initial catalog rows are intentionally sample content for phase one.
- Product image URLs are nullable so the admin image workflow can be added later without changing this schema.
*/

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  sku text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  price integer NOT NULL CHECK (price >= 0),
  sale_price integer CHECK (sale_price IS NULL OR (sale_price >= 0 AND sale_price < price)),
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  is_active boolean NOT NULL DEFAULT true,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  alt_text text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS products_category_id_idx ON products(category_id);
CREATE INDEX IF NOT EXISTS products_active_idx ON products(is_active, is_archived);
CREATE INDEX IF NOT EXISTS products_price_idx ON products(price);
CREATE INDEX IF NOT EXISTS product_images_product_id_idx ON product_images(product_id, display_order);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view categories" ON categories;
CREATE POLICY "Public can view categories" ON categories FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Anonymous cannot create categories" ON categories;
CREATE POLICY "Anonymous cannot create categories" ON categories FOR INSERT TO anon WITH CHECK (false);
DROP POLICY IF EXISTS "Authenticated cannot create categories" ON categories;
CREATE POLICY "Authenticated cannot create categories" ON categories FOR INSERT TO authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "Authenticated cannot update categories" ON categories;
CREATE POLICY "Authenticated cannot update categories" ON categories FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS "Authenticated cannot delete categories" ON categories;
CREATE POLICY "Authenticated cannot delete categories" ON categories FOR DELETE TO authenticated USING (false);

DROP POLICY IF EXISTS "Public can view active products" ON products;
CREATE POLICY "Public can view active products" ON products FOR SELECT TO anon, authenticated USING (is_active = true AND is_archived = false);
DROP POLICY IF EXISTS "Anonymous cannot create products" ON products;
CREATE POLICY "Anonymous cannot create products" ON products FOR INSERT TO anon WITH CHECK (false);
DROP POLICY IF EXISTS "Authenticated cannot create products" ON products;
CREATE POLICY "Authenticated cannot create products" ON products FOR INSERT TO authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "Authenticated cannot update products" ON products;
CREATE POLICY "Authenticated cannot update products" ON products FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS "Authenticated cannot delete products" ON products;
CREATE POLICY "Authenticated cannot delete products" ON products FOR DELETE TO authenticated USING (false);

DROP POLICY IF EXISTS "Public can view product images" ON product_images;
CREATE POLICY "Public can view product images" ON product_images FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM products WHERE products.id = product_images.product_id AND products.is_active = true AND products.is_archived = false));
DROP POLICY IF EXISTS "Anonymous cannot create product images" ON product_images;
CREATE POLICY "Anonymous cannot create product images" ON product_images FOR INSERT TO anon WITH CHECK (false);
DROP POLICY IF EXISTS "Authenticated cannot create product images" ON product_images;
CREATE POLICY "Authenticated cannot create product images" ON product_images FOR INSERT TO authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "Authenticated cannot update product images" ON product_images;
CREATE POLICY "Authenticated cannot update product images" ON product_images FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS "Authenticated cannot delete product images" ON product_images;
CREATE POLICY "Authenticated cannot delete product images" ON product_images FOR DELETE TO authenticated USING (false);

DROP POLICY IF EXISTS "Public can view shop settings" ON settings;
CREATE POLICY "Public can view shop settings" ON settings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Anonymous cannot create settings" ON settings;
CREATE POLICY "Anonymous cannot create settings" ON settings FOR INSERT TO anon WITH CHECK (false);
DROP POLICY IF EXISTS "Authenticated cannot create settings" ON settings;
CREATE POLICY "Authenticated cannot create settings" ON settings FOR INSERT TO authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "Authenticated cannot update settings" ON settings;
CREATE POLICY "Authenticated cannot update settings" ON settings FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS "Authenticated cannot delete settings" ON settings;
CREATE POLICY "Authenticated cannot delete settings" ON settings FOR DELETE TO authenticated USING (false);

INSERT INTO categories (name, slug, description, display_order)
VALUES
  ('Electronics', 'electronics', 'Smart tech for everyday life.', 1),
  ('Fashion', 'fashion', 'Easy pieces for your everyday style.', 2),
  ('Home & Garden', 'home-garden', 'Small upgrades for a better home.', 3),
  ('Beauty', 'beauty', 'Simple self-care essentials.', 4),
  ('Sports', 'sports', 'Gear to keep you moving.', 5),
  ('Toys & Games', 'toys-games', 'Fun finds for every age.', 6)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (category_id, name, slug, sku, description, price, sale_price, stock)
SELECT id, 'Wireless Headphones', 'wireless-headphones', 'ICA-ELEC-001', 'Comfortable everyday listening with rich sound and a long-lasting battery.', 65000, 52000, 24 FROM categories WHERE slug = 'electronics'
ON CONFLICT (slug) DO NOTHING;
INSERT INTO products (category_id, name, slug, sku, description, price, sale_price, stock)
SELECT id, 'Classic Canvas Sneakers', 'classic-canvas-sneakers', 'ICA-FASH-001', 'A clean, versatile pair built for everyday movement.', 85000, NULL, 18 FROM categories WHERE slug = 'fashion'
ON CONFLICT (slug) DO NOTHING;
INSERT INTO products (category_id, name, slug, sku, description, price, sale_price, stock)
SELECT id, 'Minimal Table Lamp', 'minimal-table-lamp', 'ICA-HOME-001', 'Warm, soft light for desks, bedside tables, and reading corners.', 48000, 39000, 12 FROM categories WHERE slug = 'home-garden'
ON CONFLICT (slug) DO NOTHING;
INSERT INTO products (category_id, name, slug, sku, description, price, sale_price, stock)
SELECT id, 'Everyday Fragrance', 'everyday-fragrance', 'ICA-BEAU-001', 'A smooth, modern fragrance for daily wear.', 45000, NULL, 30 FROM categories WHERE slug = 'beauty'
ON CONFLICT (slug) DO NOTHING;
INSERT INTO products (category_id, name, slug, sku, description, price, sale_price, stock)
SELECT id, 'Smart Fitness Watch', 'smart-fitness-watch', 'ICA-SPORT-001', 'Track your day, movement, and routines with a lightweight smart watch.', 120000, 99000, 9 FROM categories WHERE slug = 'sports'
ON CONFLICT (slug) DO NOTHING;
INSERT INTO products (category_id, name, slug, sku, description, price, sale_price, stock)
SELECT id, 'Build & Play Blocks', 'build-play-blocks', 'ICA-TOYS-001', 'A colorful building set for creative play and family time.', 35000, NULL, 20 FROM categories WHERE slug = 'toys-games'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO settings (setting_key, setting_value)
VALUES
  ('delivery_fee', '5000'),
  ('free_delivery_threshold', '100000'),
  ('shop_phone', '+255 700 000 000'),
  ('shop_address', 'Dar es Salaam, Tanzania')
ON CONFLICT (setting_key) DO NOTHING;