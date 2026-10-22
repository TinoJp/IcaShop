-- Product image upload and public catalog display.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('ica-product-images', 'ica-product-images', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/avif'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

GRANT SELECT ON public.product_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_images TO authenticated;

DROP POLICY IF EXISTS "Admins can view all product images" ON public.product_images;
CREATE POLICY "Admins can view all product images" ON public.product_images
  FOR SELECT TO authenticated USING (public.is_ica_admin());
DROP POLICY IF EXISTS "Admins can add product images" ON public.product_images;
CREATE POLICY "Admins can add product images" ON public.product_images
  FOR INSERT TO authenticated WITH CHECK (public.is_ica_admin());
DROP POLICY IF EXISTS "Admins can update product images" ON public.product_images;
CREATE POLICY "Admins can update product images" ON public.product_images
  FOR UPDATE TO authenticated USING (public.is_ica_admin()) WITH CHECK (public.is_ica_admin());
DROP POLICY IF EXISTS "Admins can delete product images" ON public.product_images;
CREATE POLICY "Admins can delete product images" ON public.product_images
  FOR DELETE TO authenticated USING (public.is_ica_admin());

DROP POLICY IF EXISTS "Public can view iCa product image files" ON storage.objects;
CREATE POLICY "Public can view iCa product image files" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'ica-product-images');
DROP POLICY IF EXISTS "Admins can upload iCa product image files" ON storage.objects;
CREATE POLICY "Admins can upload iCa product image files" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'ica-product-images' AND public.is_ica_admin());
DROP POLICY IF EXISTS "Admins can update iCa product image files" ON storage.objects;
CREATE POLICY "Admins can update iCa product image files" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'ica-product-images' AND public.is_ica_admin())
  WITH CHECK (bucket_id = 'ica-product-images' AND public.is_ica_admin());
DROP POLICY IF EXISTS "Admins can delete iCa product image files" ON storage.objects;
CREATE POLICY "Admins can delete iCa product image files" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'ica-product-images' AND public.is_ica_admin());
