import { useState } from 'react';
import ProductFastEditTable from '../admin/ProductFastEditTable';
import type { Product } from '../../types';

const mockProducts: Product[] = [
  {
    id: 'prod-1',
    name: '1/2" PPRC Küresel Vana - Pirinç Gövdeli Ağır Tip',
    category: 'PPRC Boru & Ek Parçaları',
    sku: 'PPRC-KV-001',
    barcode: '869741234501',
    price: 185.50,
    wholesalePrice: 145.00,
    stock: 250,
    unit: 'ADET',
    description: 'Kaliteli pirinç küre',
    minOrderQuantity: 1,
    imageUrl: '',
  },
  {
    id: 'prod-2',
    name: '3/4" Fleks Gaz Hortumu - Paslanmaz Çelik 50cm',
    category: 'Doğalgaz Tesisat Malzemeleri',
    sku: 'GAZ-FLX-002',
    barcode: '869741234502',
    price: 320.00,
    wholesalePrice: 260.00,
    stock: 12,
    unit: 'ADET',
    description: 'TS-EN 14800 belgeli',
    minOrderQuantity: 1,
    imageUrl: '',
  }
];

export default function ProductTablePreview() {
  const [products] = useState<Product[]>(mockProducts);

  return (
    <div className="p-8 bg-base text-text-primary min-h-screen">
      <div className="max-w-6xl mx-auto">
        <ProductFastEditTable 
          products={products} 
          onRefresh={() => {}}
          onOpenAddModal={() => {}}
          onEditProduct={() => {}}
        />
      </div>
    </div>
  );
}
