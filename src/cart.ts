import { useEffect, useState } from 'react';
import type { CartItem, Product, ProductVariant } from '@/types';

const STORAGE_KEY = 'ica-cart';

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is CartItem =>
        item &&
        typeof item.product === 'object' &&
        typeof item.quantity === 'number' &&
        item.quantity > 0
    );
  } catch {
    return [];
  }
}

function getItemKey(product: Product, variant?: ProductVariant | null) {
  return `${product.id}:${variant?.id ?? 'base'}`;
}

function getItemPrice(product: Product, variant?: ProductVariant | null) {
  if (variant?.variant_price !== undefined && variant?.variant_price !== null) return variant.variant_price;
  return product.sale_price ?? product.price;
}

function getItemStock(product: Product, variant?: ProductVariant | null) {
  if (variant && typeof variant.variant_stock === 'number') return variant.variant_stock;
  return product.stock;
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>(loadCart);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore write errors (private mode, full storage, etc.)
    }
  }, [items]);

  const add = (product: Product, quantity = 1, variant?: ProductVariant | null) => {
    setItems((current) => {
      const key = getItemKey(product, variant);
      const existing = current.find((item) => getItemKey(item.product, item.variant) === key);
      const maxQty = getItemStock(product, variant);

      if (existing) {
        return current.map((item) =>
          getItemKey(item.product, item.variant) === key
            ? { ...item, quantity: Math.min(maxQty, item.quantity + quantity) }
            : item
        );
      }

      return [...current, { product, quantity: Math.min(maxQty, quantity), variant: variant ?? null }];
    });
  };

  const setQuantity = (productId: string, quantity: number, variant?: ProductVariant | null) => {
    const key = variant ? `${productId}:${variant.id}` : `${productId}:base`;

    setItems((current) =>
      current
        .map((item) => {
          const itemKey = getItemKey(item.product, item.variant);
          if (itemKey !== key) return item;
          const maxQty = getItemStock(item.product, item.variant);
          return { ...item, quantity: Math.min(maxQty, Math.max(0, quantity)) };
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const remove = (productId: string, variant?: ProductVariant | null) => {
    const key = variant ? `${productId}:${variant.id}` : `${productId}:base`;
    setItems((current) => current.filter((item) => getItemKey(item.product, item.variant) !== key));
  };

  const clear = () => setItems([]);

  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce(
    (sum, item) => sum + getItemPrice(item.product, item.variant) * item.quantity,
    0
  );

  return { items, add, setQuantity, remove, clear, count, subtotal };
}
