import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import ErrorBoundary from './ErrorBoundary';

describe('ErrorBoundary Component', () => {
  it('renders children normally when there is no error', () => {
    const html = renderToString(
      <ErrorBoundary>
        <div id="test-child">Normal Uygulama İçeriği</div>
      </ErrorBoundary>
    );
    expect(html).toContain('Normal Uygulama İçeriği');
  });

  it('renders fallback error message when state hasError is simulated or fallback provided', () => {
    const boundary = new ErrorBoundary({ children: <div>Child</div>, moduleName: 'Ödeme Masası' });
    boundary.state = {
      hasError: true,
      error: new Error('Bileşen Yükleme Hatası'),
      errorInfo: null,
    };

    const rendered = boundary.render();
    const html = renderToString(rendered as React.ReactElement);

    expect(html).toContain('Hata Koruma Kalkanı');
    expect(html).toContain('Ödeme Masası');
    expect(html).toContain('Görünüm Yüklenirken Beklenmeyen Bir Durum Oluştu');
    expect(html).toContain('Bileşen Yükleme Hatası');
  });
});
