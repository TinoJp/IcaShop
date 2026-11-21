-- Archive removed variants that are referenced by historical order items.
-- Keep their rows and image objects so cancellation can still restore stock.
ALTER TABLE public.product_images
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS product_images_active_variants_idx
  ON public.product_images(product_id, display_order)
  WHERE variant_name IS NOT NULL AND is_archived = false;

CREATE OR REPLACE FUNCTION public.validate_ica_order_item_variant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_variant_product_id uuid;
  v_variant_name text;
  v_variant_archived boolean;
BEGIN
  IF NEW.variant_id IS NULL THEN
    IF NULLIF(btrim(COALESCE(NEW.variant_name, '')), '') IS NOT NULL THEN
      RAISE EXCEPTION 'A base product order item cannot have a variant name';
    END IF;
    RETURN NEW;
  END IF;

  SELECT pi.product_id, pi.variant_name, pi.is_archived
  INTO v_variant_product_id, v_variant_name, v_variant_archived
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
  IF v_variant_archived THEN
    RAISE EXCEPTION 'Selected variant is no longer available';
  END IF;

  NEW.variant_name := btrim(v_variant_name);
  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
