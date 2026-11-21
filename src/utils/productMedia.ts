import type { ProductImage, ProductVariant } from '@/types';

export type ProductImageRow = {
  id: string;
  product_id: string;
  image_url: string;
  alt_text: string | null;
  display_order: number | null;
  variant_name: string | null;
  variant_price: number | null;
  variant_stock: number | null;
  is_archived: boolean;
};

export function mapProductImages(rows: ProductImageRow[]): {
  galleryImages: ProductImage[];
  variants: ProductVariant[];
} {
  const visibleRows = rows.filter((row) => !row.variant_name?.trim() || !row.is_archived);
  const galleryImages = visibleRows.map((row) => ({
    id: row.id,
    image_url: row.image_url,
    alt_text: row.alt_text ?? 'Product image',
    display_order: row.display_order ?? 0,
  }));
  const variants = visibleRows
    .filter((row) => typeof row.variant_name === 'string' && row.variant_name.trim().length > 0)
    .map((row) => ({
      id: row.id,
      product_id: row.product_id,
      image_url: row.image_url,
      alt_text: row.alt_text ?? row.variant_name!.trim(),
      display_order: row.display_order ?? 0,
      variant_name: row.variant_name!.trim(),
      variant_price: row.variant_price ?? null,
      variant_stock: row.variant_stock ?? 0,
    }));
  return { galleryImages, variants };
}

export function parseVariantPrice(value: string): number | null {
  if (value.trim() === '') return null;
  const price = Number(value);
  if (!Number.isFinite(price) || price < 0) {
    throw new Error('Enter a valid option price.');
  }
  return price;
}
