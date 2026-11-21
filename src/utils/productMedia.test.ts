import { describe, expect, it } from 'vitest';
import { mapProductImages, parseVariantPrice, type ProductImageRow } from './productMedia';

const row = (overrides: Partial<ProductImageRow> = {}): ProductImageRow => ({
  id: 'image-1',
  product_id: 'product-1',
  image_url: 'https://example.com/image.jpg',
  alt_text: null,
  display_order: 0,
  variant_name: null,
  variant_price: null,
  variant_stock: null,
  is_archived: false,
  ...overrides,
});

describe('product image and variant mapping', () => {
  it('keeps legacy rows without variant metadata in the gallery only', () => {
    const media = mapProductImages([row()]);
    expect(media.galleryImages).toHaveLength(1);
    expect(media.variants).toHaveLength(0);
  });

  it('maps only named, active rows as purchasable variants', () => {
    const media = mapProductImages([
      row({ id: 'gallery' }),
      row({ id: 'active', variant_name: 'Red', variant_stock: 4 }),
      row({ id: 'archived', variant_name: 'Blue', is_archived: true }),
      row({ id: 'blank', variant_name: '   ' }),
    ]);
    expect(media.galleryImages.map((image) => image.id)).toEqual(['gallery', 'active', 'blank']);
    expect(media.variants.map((variant) => variant.id)).toEqual(['active']);
  });
});

describe('variant price parsing', () => {
  it('preserves zero as a valid price', () => {
    expect(parseVariantPrice('0')).toBe(0);
  });

  it('uses null only when the option price is blank', () => {
    expect(parseVariantPrice('')).toBeNull();
  });

  it('rejects invalid and negative prices', () => {
    expect(() => parseVariantPrice('-1')).toThrow();
    expect(() => parseVariantPrice('not-a-price')).toThrow();
  });
});
