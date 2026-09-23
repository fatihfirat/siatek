import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { OfflineBanner } from './OfflineBanner';

describe('OfflineBanner Component', () => {
  it('renders nothing when navigator is online and no reconnect event happened', () => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    const html = renderToString(<OfflineBanner />);
    expect(html).toBe('');
  });

  it('renders offline warning when network is offline', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    const html = renderToString(<OfflineBanner />);
    expect(html).toContain('Saha Çevrimdışı Modu:');
    expect(html).toContain('Offline-First');
  });
});
