-- Add variant snapshots to order items and restore safe, variant-aware checkout/status handling.

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS variant_id uuid,
  ADD COLUMN IF NOT EXISTS variant_name text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'order_items_variant_id_fkey'
      AND conrelid = 'public.order_items'::regclass
  ) THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_variant_id_fkey
      FOREIGN KEY (variant_id) REFERENCES public.product_images(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS order_items_variant_id_idx ON public.order_items(variant_id);

CREATE OR REPLACE FUNCTION public.place_ica_order(
  p_items jsonb,
  p_customer_name text,
  p_customer_phone text,
  p_delivery_address text,
  p_notes text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
  v_total_amount integer := 0;
  v_delivery_fee integer := 5000;
  v_free_delivery_threshold integer := 100000;
  v_delivery_fee_setting text;
  v_free_delivery_threshold_setting text;
  v_grand_total integer;
  v_item record;
  v_product record;
  v_variant record;
  v_unit_price integer;
  v_line_total integer;
  v_quantity integer;
  v_variant_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Please sign in to place an order';
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
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

  SELECT setting_value INTO v_delivery_fee_setting FROM public.settings WHERE setting_key = 'delivery_fee';
  IF COALESCE(btrim(v_delivery_fee_setting), '') ~ '^[0-9]+$' THEN
    v_delivery_fee := btrim(v_delivery_fee_setting)::integer;
  END IF;
  SELECT setting_value INTO v_free_delivery_threshold_setting FROM public.settings WHERE setting_key = 'free_delivery_threshold';
  IF COALESCE(btrim(v_free_delivery_threshold_setting), '') ~ '^[0-9]+$' THEN
    v_free_delivery_threshold := btrim(v_free_delivery_threshold_setting)::integer;
  END IF;

  INSERT INTO public.orders (
    user_id, status, total_amount, delivery_fee, grand_total,
    customer_name, customer_phone, delivery_address, payment_method, notes
  ) VALUES (
    auth.uid(), 'pending', 0, 0, 0,
    btrim(p_customer_name), btrim(p_customer_phone), btrim(p_delivery_address), 'cod', COALESCE(p_notes, '')
  ) RETURNING id INTO v_order_id;

  FOR v_item IN
    WITH input_items AS (
      SELECT
        (value->>'product_id')::uuid AS product_id,
        NULLIF(value->>'variant_id', '')::uuid AS variant_id,
        (value->>'quantity')::integer AS quantity
      FROM jsonb_array_elements(p_items) AS value
    )
    SELECT product_id, variant_id, sum(quantity)::integer AS quantity
    FROM input_items
    GROUP BY product_id, variant_id
  LOOP
    v_quantity := v_item.quantity;
    IF v_quantity IS NULL OR v_quantity <= 0 THEN
      RAISE EXCEPTION 'Invalid quantity';
    END IF;

    SELECT id, name, price, sale_price, stock
    INTO v_product
    FROM public.products
    WHERE id = v_item.product_id
      AND is_active = true
      AND is_archived = false
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product not found or unavailable';
    END IF;

    v_variant_id := v_item.variant_id;
    IF v_variant_id IS NOT NULL THEN
      SELECT id, variant_name, variant_price, variant_stock
      INTO v_variant
      FROM public.product_images
      WHERE id = v_variant_id
        AND product_id = v_product.id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Selected variant not found or does not belong to this product';
      END IF;
      IF v_variant.variant_stock < v_quantity THEN
        RAISE EXCEPTION 'Not enough stock for % (%)', v_product.name, v_variant.variant_name;
      END IF;
      v_unit_price := COALESCE(v_variant.variant_price, v_product.sale_price, v_product.price);

      INSERT INTO public.order_items (
        order_id, product_id, variant_id, product_name, variant_name,
        unit_price, quantity, line_total
      ) VALUES (
        v_order_id, v_product.id, v_variant_id, v_product.name,
        v_variant.variant_name, v_unit_price, v_quantity,
        v_unit_price * v_quantity
      );

      UPDATE public.product_images
      SET variant_stock = variant_stock - v_quantity
      WHERE id = v_variant_id;
    ELSE
      IF v_product.stock < v_quantity THEN
        RAISE EXCEPTION 'Not enough stock for %', v_product.name;
      END IF;
      v_unit_price := COALESCE(v_product.sale_price, v_product.price);

      INSERT INTO public.order_items (
        order_id, product_id, variant_id, product_name, variant_name,
        unit_price, quantity, line_total
      ) VALUES (
        v_order_id, v_product.id, NULL, v_product.name, NULL,
        v_unit_price, v_quantity, v_unit_price * v_quantity
      );

      UPDATE public.products
      SET stock = stock - v_quantity, updated_at = now()
      WHERE id = v_product.id;
    END IF;

    v_line_total := v_unit_price * v_quantity;
    v_total_amount := v_total_amount + v_line_total;
  END LOOP;

  IF v_total_amount >= v_free_delivery_threshold THEN
    v_delivery_fee := 0;
  END IF;
  v_grand_total := v_total_amount + v_delivery_fee;

  UPDATE public.orders
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

REVOKE EXECUTE ON FUNCTION public.place_ica_order(jsonb, text, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.place_ica_order(jsonb, text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.place_ica_order(jsonb, text, text, text, text) TO authenticated;

-- Restore the complete workflow and enforce it in the database.
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled'));

CREATE OR REPLACE FUNCTION public.enforce_ica_order_status_flow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL OR NOT public.is_ica_admin() THEN
    RAISE EXCEPTION 'Administrator access is required to change order status';
  END IF;

  IF NOT (
    (OLD.status = 'pending' AND NEW.status IN ('confirmed', 'cancelled'))
    OR (OLD.status = 'confirmed' AND NEW.status IN ('shipped', 'cancelled'))
    OR (OLD.status = 'shipped' AND NEW.status = 'delivered')
  ) THEN
    RAISE EXCEPTION 'Invalid order status transition: % to %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_ica_order_status_flow ON public.orders;
CREATE TRIGGER enforce_ica_order_status_flow
BEFORE UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.enforce_ica_order_status_flow();

-- Restore each variant/product quantity once, aggregating duplicate order lines.
CREATE OR REPLACE FUNCTION public.restore_ica_stock_on_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM 'cancelled' AND NEW.status = 'cancelled' THEN
    WITH variant_totals AS (
      SELECT oi.variant_id, sum(oi.quantity)::integer AS quantity
      FROM public.order_items oi
      WHERE oi.order_id = NEW.id AND oi.variant_id IS NOT NULL
      GROUP BY oi.variant_id
    )
    UPDATE public.product_images pi
    SET variant_stock = pi.variant_stock + vt.quantity
    FROM variant_totals vt
    WHERE pi.id = vt.variant_id;

    WITH base_totals AS (
      SELECT oi.product_id, sum(oi.quantity)::integer AS quantity
      FROM public.order_items oi
      WHERE oi.order_id = NEW.id
        AND oi.variant_id IS NULL
        AND oi.product_id IS NOT NULL
      GROUP BY oi.product_id
    )
    UPDATE public.products p
    SET stock = p.stock + bt.quantity, updated_at = now()
    FROM base_totals bt
    WHERE p.id = bt.product_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS restore_ica_stock_on_cancel ON public.orders;
CREATE TRIGGER restore_ica_stock_on_cancel
AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.restore_ica_stock_on_cancel();

-- Notifications must accept the full order workflow.
ALTER TABLE public.customer_notifications DROP CONSTRAINT IF EXISTS customer_notifications_status_check;
ALTER TABLE public.customer_notifications
  ADD CONSTRAINT customer_notifications_status_check
  CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled'));

NOTIFY pgrst, 'reload schema';
