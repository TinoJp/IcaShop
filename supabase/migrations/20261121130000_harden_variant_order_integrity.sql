-- Preserve variant references on historical order items and validate variant snapshots.

-- A referenced variant must not be deleted: cancellation still needs its row
-- to restore the exact variant stock instead of incorrectly restoring base stock.
ALTER TABLE public.order_items
  DROP CONSTRAINT IF EXISTS order_items_variant_id_fkey;

ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_variant_id_fkey
  FOREIGN KEY (variant_id)
  REFERENCES public.product_images(id)
  ON DELETE RESTRICT;

-- Product images and purchasable variants share the product_images table.
-- Require a real variant row (non-empty variant_name) whenever an order item
-- references one, and snapshot its name from the database rather than trusting
-- a client-provided value.
CREATE OR REPLACE FUNCTION public.validate_ica_order_item_variant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_variant_product_id uuid;
  v_variant_name text;
BEGIN
  IF NEW.variant_id IS NULL THEN
    IF NULLIF(btrim(COALESCE(NEW.variant_name, '')), '') IS NOT NULL THEN
      RAISE EXCEPTION 'A base product order item cannot have a variant name';
    END IF;
    RETURN NEW;
  END IF;

  SELECT pi.product_id, pi.variant_name
  INTO v_variant_product_id, v_variant_name
  FROM public.product_images pi
  WHERE pi.id = NEW.variant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Selected variant does not exist';
  END IF;

  IF v_variant_product_id IS DISTINCT FROM NEW.product_id THEN
    RAISE EXCEPTION 'Selected variant does not belong to this product';
  END IF;

  IF NULLIF(btrim(COALESCE(v_variant_name, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Selected image is not a purchasable product variant';
  END IF;

  NEW.variant_name := btrim(v_variant_name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_ica_order_item_variant ON public.order_items;
CREATE TRIGGER validate_ica_order_item_variant
BEFORE INSERT OR UPDATE OF variant_id, product_id, variant_name
ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.validate_ica_order_item_variant();

NOTIFY pgrst, 'reload schema';
