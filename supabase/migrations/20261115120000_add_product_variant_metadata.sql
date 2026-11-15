ALTER TABLE public.product_images
  ADD COLUMN IF NOT EXISTS variant_name text,
  ADD COLUMN IF NOT EXISTS variant_price integer,
  ADD COLUMN IF NOT EXISTS variant_stock integer NOT NULL DEFAULT 0;

ALTER TABLE public.product_images
  ADD CONSTRAINT product_images_variant_price_check
  CHECK (variant_price IS NULL OR variant_price >= 0);

ALTER TABLE public.product_images
  ADD CONSTRAINT product_images_variant_stock_check
  CHECK (variant_stock >= 0);

CREATE INDEX IF NOT EXISTS product_images_variant_name_idx
  ON public.product_images (product_id, variant_name);
