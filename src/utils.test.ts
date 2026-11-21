import { describe, expect, it } from 'vitest';
import { canTransitionOrderStatus } from './utils';

describe('order status transitions', () => {
  it('allows the complete forward workflow', () => {
    expect(canTransitionOrderStatus('pending', 'confirmed')).toBe(true);
    expect(canTransitionOrderStatus('confirmed', 'shipped')).toBe(true);
    expect(canTransitionOrderStatus('shipped', 'delivered')).toBe(true);
  });

  it('allows cancellation only from pending or confirmed', () => {
    expect(canTransitionOrderStatus('pending', 'cancelled')).toBe(true);
    expect(canTransitionOrderStatus('confirmed', 'cancelled')).toBe(true);
    expect(canTransitionOrderStatus('shipped', 'cancelled')).toBe(false);
  });

  it('rejects backward and skipped transitions', () => {
    expect(canTransitionOrderStatus('confirmed', 'pending')).toBe(false);
    expect(canTransitionOrderStatus('pending', 'delivered')).toBe(false);
    expect(canTransitionOrderStatus('pending', 'shipped')).toBe(false);
  });
});
