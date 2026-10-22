import { useEffect, useState } from 'react';
import type { CartItem, Product } from '@/types';

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

export function useCart() {
  const [items, setItems] = useState<CartItem[]>(loadCart);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore write errors (private mode, full storage, etc.)
    }
  }, [items]);

  const add = (product: Product, quantity = 1) => {
    setItems((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      if (existing) {
        const maxQty = product.stock;
        return current.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: Math.min(maxQty, item.quantity + quantity) }
            : item
        );
      }
      return [...current, { product, quantity: Math.min(product.stock, quantity) }];
    });
  };

  const setQuantity = (productId: string, quantity: number) => {
    setItems((current) =>
      current
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: Math.min(item.product.stock, Math.max(0, quantity)) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const remove = (productId: string) => {
    setItems((current) => current.filter((item) => item.product.id !== productId));
  };

  const clear = () => setItems([]);

  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce(
    (sum, item) => sum + (item.product.sale_price ?? item.product.price) * item.quantity,
    0
  );

  return { items, add, setQuantity, remove, clear, count, subtotal };
}
