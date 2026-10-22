-- Read delivery settings as text first so blank/missing values do not fail
-- while PostgreSQL assigns them to integer variables.
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
  v_delivery_fee integer := 5000;
  v_free_delivery_threshold integer := 100000;
  v_delivery_fee_setting text;
  v_free_delivery_threshold_setting text;
  v_grand_total integer;
  v_item jsonb;
  v_product RECORD;
  v_unit_price integer;
  v_line_total integer;
  v_quantity integer;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'Cart is empty';
  END IF;

  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Cart is empty';
  END IF;

  IF NULLIF(btrim(COALESCE(p_customer_name, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Customer name is required';
  END IF;

  IF NULLIF(btrim(COALESCE(p_customer_phone, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Phone number is required';
  END IF;

  IF NULLIF(btrim(COALESCE(p_delivery_address, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Delivery address is required';
  END IF;

  SELECT setting_value INTO v_delivery_fee_setting
  FROM settings WHERE setting_key = 'delivery_fee';

  IF COALESCE(btrim(v_delivery_fee_setting), '') ~ '^[0-9]+$' THEN
    v_delivery_fee := btrim(v_delivery_fee_setting)::integer;
  END IF;

  SELECT setting_value INTO v_free_delivery_threshold_setting
  FROM settings WHERE setting_key = 'free_delivery_threshold';

  IF COALESCE(btrim(v_free_delivery_threshold_setting), '') ~ '^[0-9]+$' THEN
    v_free_delivery_threshold := btrim(v_free_delivery_threshold_setting)::integer;
  END IF;

  INSERT INTO orders (user_id, status, total_amount, delivery_fee, grand_total, customer_name, customer_phone, delivery_address, payment_method, notes)
  VALUES (auth.uid(), 'pending', 0, 0, 0, btrim(p_customer_name), btrim(p_customer_phone), btrim(p_delivery_address), 'cod', COALESCE(p_notes, ''))
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    IF COALESCE(v_item->>'quantity', '') !~ '^[1-9][0-9]*$' THEN
      RAISE EXCEPTION 'Invalid quantity';
    END IF;
    v_quantity := (v_item->>'quantity')::integer;

    SELECT id, name, price, sale_price, stock INTO v_product
    FROM products
    WHERE id = (v_item->>'product_id')::uuid
      AND is_active = true
      AND is_archived = false
    FOR UPDATE;

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
