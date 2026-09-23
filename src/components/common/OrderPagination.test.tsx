import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { OrderPagination } from './OrderPagination';

describe('OrderPagination Component', () => {
  it('returns null when totalItems is 0', () => {
    const html = renderToString(
      <OrderPagination
        currentPage={1}
        totalItems={0}
        pageSize={10}
        onPageChange={vi.fn()}
      />
    );
    expect(html).toBe('');
  });

  it('renders total items count and page ranges correctly', () => {
    const html = renderToString(
      <OrderPagination
        currentPage={2}
        totalItems={45}
        pageSize={10}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
        itemLabel="sipariş"
      />
    );

    expect(html).toContain('Toplam');
    expect(html).toContain('45');
    expect(html).toContain('sipariş');
    expect(html).toContain('11');
    expect(html).toContain('20');
    expect(html).toContain('Sayfa Başına');
  });

  it('renders numeric page buttons', () => {
    const html = renderToString(
      <OrderPagination
        currentPage={1}
        totalItems={30}
        pageSize={10}
        onPageChange={vi.fn()}
      />
    );

    expect(html).toContain('1');
    expect(html).toContain('2');
    expect(html).toContain('3');
  });
});
