/*
# Create iCa orders, order items, and checkout function

1. New Tables
- `orders` stores each placed order: the customer's identity, delivery details,
  payment method, item subtotal, delivery fee, grand total, and order status.
  The `user_id` column defaults to `auth.uid()` so the signed-in customer owns
  every order they place.
- `order_items` stores the individual product lines for each order, capturing
  the product name and unit price at the moment of purchase so historical
  orders stay accurate even if the catalog changes later.

2. Checkout function
- `place_ica_order` is a SECURITY DEFINER function that creates an order and
  all its line items in one atomic operation.
- The function receives the cart items (product id + quantity) and delivery
  details from the browser, then looks up the real current price of each
  product from the `products` table. The customer cannot set their own price.
- Delivery fee is read from the `settings` table and waived when the item
  subtotal meets the free-delivery threshold.
- Product stock is decremented by the ordered quantity. If a product has
  insufficient stock the entire order is rejected.
- The function returns the new order id and a pricing summary so the browser
  can show the confirmation screen.

3. Security
- Row Level Security is enabled on both `orders` and `order_items`.
- Customers can SELECT only their own orders and the items within those orders.
- INSERT, UPDATE, and DELETE are denied from the browser on both tables.
  Order creation goes exclusively through `place_ica_order`, which runs with
  elevated privileges and validates everything server-side.
- The function is callable only by `authenticated` (not `anon`).

4. Important notes
- Order status starts as `pending`. Status changes (confirming, shipping,
  delivering, cancelling) are reserved for a future admin workflow.
- Existing catalog data and profiles are not modified.
- The function rejects empty carts and unavailable products.
*/

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  total_amount integer NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  delivery_fee integer NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
  grand_total integer NOT NULL DEFAULT 0 CHECK (grand_total >= 0),
  customer_name text NOT NULL DEFAULT '',
  customer_phone text NOT NULL DEFAULT '',
  delivery_address text NOT NULL DEFAULT '',
  payment_method text NOT NULL DEFAULT 'cod' CHECK (payment_method IN ('cod')),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  unit_price integer NOT NULL CHECK (unit_price >= 0),
  quantity integer NOT NULL CHECK (quantity > 0),
  line_total integer NOT NULL CHECK (line_total >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_user_id_idx ON orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items(order_id);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
CREATE POLICY "Users can view their own orders" ON orders FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users cannot insert orders from browser" ON orders;
CREATE POLICY "Users cannot insert orders from browser" ON orders FOR INSERT
  TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "Users cannot update orders" ON orders;
CREATE POLICY "Users cannot update orders" ON orders FOR UPDATE
  TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Users cannot delete orders" ON orders;
CREATE POLICY "Users cannot delete orders" ON orders FOR DELETE
  TO authenticated USING (false);

DROP POLICY IF EXISTS "Users can view their own order items" ON order_items;
CREATE POLICY "Users can view their own order items" ON order_items FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users cannot insert order items from browser" ON order_items;
CREATE POLICY "Users cannot insert order items from browser" ON order_items FOR INSERT
  TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "Users cannot update order items" ON order_items;
CREATE POLICY "Users cannot update order items" ON order_items FOR UPDATE
  TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Users cannot delete order items" ON order_items;
CREATE POLICY "Users cannot delete order items" ON order_items FOR DELETE
  TO authenticated USING (false);

REVOKE INSERT, UPDATE, DELETE ON orders FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON order_items FROM authenticated;

CREATE OR REPLACE FUNCTION public.place_ica_order(
  p_items jsonb,
  p_customer_name text,
  p_customer_phone text,
  p_delivery_address text,
  p_notes text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
  v_total_amount integer := 0;
  v_delivery_fee integer := 0;
  v_free_delivery_threshold integer := 100000;
  v_grand_total integer;
  v_item jsonb;
  v_product RECORD;
  v_unit_price integer;
  v_line_total integer;
  v_quantity integer;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Cart is empty';
  END IF;

  IF COALESCE(p_customer_name, '') = '' THEN
    RAISE EXCEPTION 'Customer name is required';
  END IF;

  IF COALESCE(p_customer_phone, '') = '' THEN
    RAISE EXCEPTION 'Phone number is required';
  END IF;

  IF COALESCE(p_delivery_address, '') = '' THEN
    RAISE EXCEPTION 'Delivery address is required';
  END IF;

  SELECT setting_value INTO v_delivery_fee FROM settings WHERE setting_key = 'delivery_fee';
  v_delivery_fee := COALESCE(NULLIF(v_delivery_fee, '')::integer, 0);

  SELECT setting_value INTO v_free_delivery_threshold FROM settings WHERE setting_key = 'free_delivery_threshold';
  v_free_delivery_threshold := COALESCE(NULLIF(v_free_delivery_threshold, '')::integer, 100000);

  INSERT INTO orders (user_id, status, total_amount, delivery_fee, grand_total, customer_name, customer_phone, delivery_address, payment_method, notes)
  VALUES (auth.uid(), 'pending', 0, 0, 0, p_customer_name, p_customer_phone, p_delivery_address, 'cod', COALESCE(p_notes, ''))
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_quantity := (v_item->>'quantity')::integer;
    IF v_quantity <= 0 THEN
      RAISE EXCEPTION 'Invalid quantity';
    END IF;

    SELECT id, name, price, sale_price, stock INTO v_product
    FROM products
    WHERE id = (v_item->>'product_id')::uuid
      AND is_active = true
      AND is_archived = false;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product not found or unavailable';
    END IF;

    IF v_product.stock < v_quantity THEN
      RAISE EXCEPTION 'Not enough stock for %', v_product.name;
    END IF;

    v_unit_price := COALESCE(v_product.sale_price, v_product.price);
    v_line_total := v_unit_price * v_quantity;
    v_total_amount := v_total_amount + v_line_total;

    INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, line_total)
    VALUES (v_order_id, v_product.id, v_product.name, v_unit_price, v_quantity, v_line_total);

    UPDATE products SET stock = stock - v_quantity, updated_at = now() WHERE id = v_product.id;
  END LOOP;

  IF v_total_amount >= v_free_delivery_threshold THEN
    v_delivery_fee := 0;
  END IF;

  v_grand_total := v_total_amount + v_delivery_fee;

  UPDATE orders
  SET total_amount = v_total_amount,
      delivery_fee = v_delivery_fee,
      grand_total = v_grand_total,
      updated_at = now()
  WHERE id = v_order_id;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'total_amount', v_total_amount,
    'delivery_fee', v_delivery_fee,
    'grand_total', v_grand_total
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.place_ica_order FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.place_ica_order FROM anon;
GRANT EXECUTE ON FUNCTION public.place_ica_order TO authenticated;