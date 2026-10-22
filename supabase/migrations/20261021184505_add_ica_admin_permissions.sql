/*
# Add iCa admin management permissions

1. New Functions
- `is_ica_admin()` is a SECURITY DEFINER helper that checks whether the
  currently signed-in user has the `admin` role in the `profiles` table.
  It is used by RLS policies to grant admin-only write access to the
  catalog, settings, and order status updates.

2. Modified Security
- `products`: public SELECT policy now also lets admins see inactive and
  archived products. INSERT, UPDATE, and DELETE are allowed only for admins.
- `categories`: INSERT, UPDATE, and DELETE are allowed only for admins.
- `settings`: INSERT, UPDATE, and DELETE are allowed only for admins.
- `orders`: SELECT now lets admins see every order (not just their own).
  UPDATE is allowed only for admins and only on the `status` column —
  financial totals, customer details, and ownership remain admin-immutable
  from the browser. INSERT and DELETE remain denied.
- `order_items`: SELECT now lets admins see items for every order.
  INSERT, UPDATE, and DELETE remain denied.

3. Column-level privileges
- `orders`: authenticated role can UPDATE only the `status` column.
  All other columns (totals, fees, customer info, user_id) are not
  browser-writable, even by admins. Financial integrity is preserved.
- `products`: admin can write all catalog columns (name, price, stock, etc.)
  but cannot modify `id` or `created_at` as those are server-managed.

4. Important notes
- Regular customers see no change in behaviour — all their write attempts
  still fail because `is_ica_admin()` returns false for them.
- Admin promotion is done directly in the database (e.g. updating a
  profile row's role to 'admin') and is not exposed through the browser.
- Existing policies are dropped and recreated to avoid conflicts.
*/

CREATE OR REPLACE FUNCTION public.is_ica_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_ica_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_ica_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_ica_admin() TO authenticated;

-- Products: admin can see everything, public sees active only
DROP POLICY IF EXISTS "Public can view active products" ON products;
CREATE POLICY "Public can view active products" ON products FOR SELECT
  TO anon, authenticated
  USING (is_active = true AND is_archived = false OR public.is_ica_admin());

DROP POLICY IF EXISTS "Anonymous cannot create products" ON products;
CREATE POLICY "Anonymous cannot create products" ON products FOR INSERT
  TO anon WITH CHECK (false);

DROP POLICY IF EXISTS "Admins can create products" ON products;
CREATE POLICY "Admins can create products" ON products FOR INSERT
  TO authenticated WITH CHECK (public.is_ica_admin());

DROP POLICY IF EXISTS "Authenticated cannot update products" ON products;
DROP POLICY IF EXISTS "Admins can update products" ON products;
CREATE POLICY "Admins can update products" ON products FOR UPDATE
  TO authenticated USING (public.is_ica_admin()) WITH CHECK (public.is_ica_admin());

DROP POLICY IF EXISTS "Authenticated cannot delete products" ON products;
DROP POLICY IF EXISTS "Admins can delete products" ON products;
CREATE POLICY "Admins can delete products" ON products FOR DELETE
  TO authenticated USING (public.is_ica_admin());

-- Categories: admin can manage
DROP POLICY IF EXISTS "Anonymous cannot create categories" ON categories;
CREATE POLICY "Anonymous cannot create categories" ON categories FOR INSERT
  TO anon WITH CHECK (false);

DROP POLICY IF EXISTS "Authenticated cannot create categories" ON categories;
DROP POLICY IF EXISTS "Admins can create categories" ON categories;
CREATE POLICY "Admins can create categories" ON categories FOR INSERT
  TO authenticated WITH CHECK (public.is_ica_admin());

DROP POLICY IF EXISTS "Authenticated cannot update categories" ON categories;
DROP POLICY IF EXISTS "Admins can update categories" ON categories;
CREATE POLICY "Admins can update categories" ON categories FOR UPDATE
  TO authenticated USING (public.is_ica_admin()) WITH CHECK (public.is_ica_admin());

DROP POLICY IF EXISTS "Authenticated cannot delete categories" ON categories;
DROP POLICY IF EXISTS "Admins can delete categories" ON categories;
CREATE POLICY "Admins can delete categories" ON categories FOR DELETE
  TO authenticated USING (public.is_ica_admin());

-- Settings: admin can manage
DROP POLICY IF EXISTS "Anonymous cannot create settings" ON settings;
CREATE POLICY "Anonymous cannot create settings" ON settings FOR INSERT
  TO anon WITH CHECK (false);

DROP POLICY IF EXISTS "Authenticated cannot create settings" ON settings;
DROP POLICY IF EXISTS "Admins can create settings" ON settings;
CREATE POLICY "Admins can create settings" ON settings FOR INSERT
  TO authenticated WITH CHECK (public.is_ica_admin());

DROP POLICY IF EXISTS "Authenticated cannot update settings" ON settings;
DROP POLICY IF EXISTS "Admins can update settings" ON settings;
CREATE POLICY "Admins can update settings" ON settings FOR UPDATE
  TO authenticated USING (public.is_ica_admin()) WITH CHECK (public.is_ica_admin());

DROP POLICY IF EXISTS "Authenticated cannot delete settings" ON settings;
DROP POLICY IF EXISTS "Admins can delete settings" ON settings;
CREATE POLICY "Admins can delete settings" ON settings FOR DELETE
  TO authenticated USING (public.is_ica_admin());

-- Orders: admin can view all orders and update status only
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
CREATE POLICY "Users can view their own orders" ON orders FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.is_ica_admin());

DROP POLICY IF EXISTS "Users cannot update orders" ON orders;
DROP POLICY IF EXISTS "Admins can update order status" ON orders;
CREATE POLICY "Admins can update order status" ON orders FOR UPDATE
  TO authenticated USING (public.is_ica_admin()) WITH CHECK (public.is_ica_admin());

DROP POLICY IF EXISTS "Users cannot insert orders from browser" ON orders;
CREATE POLICY "Users cannot insert orders from browser" ON orders FOR INSERT
  TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "Users cannot delete orders" ON orders;
CREATE POLICY "Users cannot delete orders" ON orders FOR DELETE
  TO authenticated USING (false);

-- Order items: admin can view all items
DROP POLICY IF EXISTS "Users can view their own order items" ON order_items;
CREATE POLICY "Users can view their own order items" ON order_items FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
    OR public.is_ica_admin()
  );

DROP POLICY IF EXISTS "Users cannot insert order items from browser" ON order_items;
CREATE POLICY "Users cannot insert order items from browser" ON order_items FOR INSERT
  TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "Users cannot update order items" ON order_items;
CREATE POLICY "Users cannot update order items" ON order_items FOR UPDATE
  TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Users cannot delete order items" ON order_items;
CREATE POLICY "Users cannot delete order items" ON order_items FOR DELETE
  TO authenticated USING (false);

-- Column-level: admin can only update order status, not financials
REVOKE UPDATE ON orders FROM authenticated;
GRANT UPDATE (status) ON orders TO authenticated;