import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { QuickBulkOrderModal } from './QuickBulkOrderModal';
import { Product } from '../../types';

const mockProducts: Product[] = [
  {
    id: 'p1',
    name: 'PPRC 90 Dirsek 20mm',
    description: 'PPRC 90 Dirsek',
    imageUrl: '/placeholder.jpg',
    price: 45,
    category: 'BORULAR',
    stock: 100,
    unit: 'Adet',
    minOrderQuantity: 1,
    sku: 'ST00001',
    barcode: '869000000001'
  }
];

describe('QuickBulkOrderModal', () => {
  it('renders modal when isOpen is true with empty textarea value by default', () => {
    const html = renderToString(
      <QuickBulkOrderModal
        isOpen={true}
        onClose={() => {}}
        products={mockProducts}
        onAddItemsToCart={() => {}}
      />
    );

    expect(html).toContain('Hızlı &amp; Toplu Sipariş Yükleme');
    expect(html).toContain('Malzeme Listesini Buraya Yapıştırın:');
    // Ensure the textarea is empty (no text inside <textarea ...></textarea>)
    expect(html).toMatch(/<textarea[^>]*><\/textarea>/);
    // Ensure placeholder text is present
    expect(html).toContain('placeholder="Örnek:\nST00001, 20\nPPRC Boru 25mm, 15\nKüresel Vana 3/4, 4"');
  });

  it('renders Örnek Şablonu Doldur button with icon and text', () => {
    const html = renderToString(
      <QuickBulkOrderModal
        isOpen={true}
        onClose={() => {}}
        products={mockProducts}
        onAddItemsToCart={() => {}}
      />
    );

    expect(html).toContain('Örnek Şablonu Doldur');
    // Check for lucide-file-spreadsheet icon class / svg
    expect(html).toContain('lucide-file-spreadsheet');
  });

  it('renders Listeyi Tara ve Eşleştir button as disabled when textarea is empty', () => {
    const html = renderToString(
      <QuickBulkOrderModal
        isOpen={true}
        onClose={() => {}}
        products={mockProducts}
        onAddItemsToCart={() => {}}
      />
    );

    expect(html).toContain('Listeyi Tara ve Eşleştir');
    expect(html).toContain('disabled=""');
  });

  it('returns null when isOpen is false', () => {
    const html = renderToString(
      <QuickBulkOrderModal
        isOpen={false}
        onClose={() => {}}
        products={mockProducts}
        onAddItemsToCart={() => {}}
      />
    );

    expect(html).toBe('');
  });
});
