import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Haptics } from './haptics';

describe('Haptics Utility', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should call navigator.vibrate with short duration on tap', () => {
    const vibrateMock = vi.fn();
    Object.defineProperty(globalThis, 'navigator', {
      value: { vibrate: vibrateMock },
      configurable: true,
      writable: true,
    });

    Haptics.tap();
    expect(vibrateMock).toHaveBeenCalledWith(15);
  });

  it('should call navigator.vibrate with success pattern on success', () => {
    const vibrateMock = vi.fn();
    Object.defineProperty(globalThis, 'navigator', {
      value: { vibrate: vibrateMock },
      configurable: true,
      writable: true,
    });

    Haptics.success();
    expect(vibrateMock).toHaveBeenCalledWith([20, 50, 40]);
  });

  it('should call navigator.vibrate with error pattern on error', () => {
    const vibrateMock = vi.fn();
    Object.defineProperty(globalThis, 'navigator', {
      value: { vibrate: vibrateMock },
      configurable: true,
      writable: true,
    });

    Haptics.error();
    expect(vibrateMock).toHaveBeenCalledWith([50, 50, 50]);
  });

  it('should handle environments where navigator.vibrate is undefined without crashing', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {},
      configurable: true,
      writable: true,
    });

    expect(() => Haptics.tap()).not.toThrow();
    expect(() => Haptics.success()).not.toThrow();
    expect(() => Haptics.error()).not.toThrow();
  });
});
