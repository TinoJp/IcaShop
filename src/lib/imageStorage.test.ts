import { describe, expect, it } from 'vitest';
import { validateDeleteResponse } from './imageStorage';

describe('validateDeleteResponse', () => {
  it('accepts only a confirmed deletion', () => {
    expect(() => validateDeleteResponse({ deleted: true })).not.toThrow();
  });

  it('rejects deleted false', () => {
    expect(() => validateDeleteResponse({ deleted: false }))
      .toThrow('The image could not be found or deleted.');
  });

  it('preserves a meaningful worker error', () => {
    expect(() => validateDeleteResponse({ deleted: false, error: 'The image no longer exists in storage.' }))
      .toThrow('The image no longer exists in storage.');
  });
});
