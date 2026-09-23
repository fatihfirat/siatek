import { useState, useEffect } from 'react';
import { subscribeToProducts } from '../../lib/firestoreService';
import { db, collection, getDocs, query } from '../../lib/firebase';
import { Product, Order } from '../../types';
import { TrendingUp, AlertCircle, ArrowUpDown, Award } from 'lucide-react';

function formatTL(n: number): string {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ₺';
}

type SortField = 'margin' | 'name' | 'price' | 'sold';
type SortDir = 'asc' | 'desc';

interface EnrichedProduct extends Product {
  purchasePrice: number;
  sold: number;
  margin: number | null;
}

function getPurchasePrice(product: Product): number {
  return Number((product as any).purchasePrice || 0);
}

function calcMargin(product: Product): number | null {
  const pp = getPurchasePrice(product);
  if (!pp || pp <= 0 || !product.price || product.price <= 0) return null;
  return ((product.price - pp) / product.price) * 100;
}

function getMarginBadgeClass(margin: number | null): string {
  if (margin === null) return 'bg-base-surface-2 text-text-muted border border-border/50';
  if (margin < 0) return 'bg-danger-fill/15 text-danger-text border border-danger-border';
  if (margin < 20) return 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30';
  if (margin < 40) return 'bg-warning-fill/15 text-warning-text border border-warning-border';
  return 'bg-success-fill/15 text-success-text border border-success-border';
}

export default function UrunKarMarjiRaporu() {
  const [products, setProducts] = useState<Product[]>([]);
  const [soldMap, setSoldMap] = useState<Map<string, number>>(new Map());
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('margin');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Subscribe to merged product catalog (static + Firestore overrides)
  useEffect(() => {
    const unsub = subscribeToProducts(setProducts);
    return unsub;
  }, []);

  // Fetch order items to count sold quantities
  useEffect(() => {
    setOrdersLoading(true);
    getDocs(query(collection(db, 'orders')))
      .then(snap => {
        const map = new Map<string, number>();
        snap.forEach(d => {
          const order = d.data() as Order;
          if (Array.isArray(order.items)) {
            order.items.forEach(item => {
              if (item.productId) {
                map.set(
                  item.productId,
                  (map.get(item.productId) || 0) + Number(item.quantity || 0)
                );
              }
            });
          }
        });
        setSoldMap(map);
        setOrdersLoading(false);
      })
      .catch(e => {
        setError('Sipariş verileri yüklenemedi: ' + (e?.message || 'Bilinmeyen hata'));
        setOrdersLoading(false);
      });
  }, []);

  const enriched: EnrichedProduct[] = products.map(p => ({
    ...p,
    purchasePrice: getPurchasePrice(p),
    sold: soldMap.get(p.id) || 0,
    margin: calcMargin(p),
  }));

  const sorted = [...enriched].sort((a, b) => {
    let va: string | number;
    let vb: string | number;
    switch (sortField) {
      case 'margin':
        va = a.margin ?? -Infinity;
        vb = b.margin ?? -Infinity;
        break;
      case 'name':
        va = a.name.toLowerCase();
        vb = b.name.toLowerCase();
        break;
      case 'price':
        va = a.price;
        vb = b.price;
        break;
      case 'sold':
        va = a.sold;
        vb = b.sold;
        break;
      default:
        va = 0;
        vb = 0;
    }
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  }

  const withMargin = enriched.filter(p => p.margin !== null);
  const avgMargin =
    withMargin.length > 0
      ? withMargin.reduce((s, p) => s + (p.margin || 0), 0) / withMargin.length
      : null;
  const top3 = [...withMargin]
    .sort((a, b) => (b.margin || 0) - (a.margin || 0))
    .slice(0, 3);
  const noPurchasePrice = enriched.filter(p => !(p.purchasePrice > 0)).length;

  if (ordersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-info-border border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-danger-text">
        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-success-text" />
          Ürün Bazlı Kâr Marjı
        </h2>
        <p className="text-xs text-text-secondary mt-0.5">
          Alış / satış fiyat farkına göre hesaplanan marjlar
        </p>
      </div>

      {/* No purchase price warning */}
      {noPurchasePrice > 0 && (
        <div className="flex items-start gap-3 bg-warning-fill/10 border border-warning-border rounded-xl p-4">
          <AlertCircle className="w-4 h-4 text-warning-text shrink-0 mt-0.5" />
          <p className="text-xs text-warning-text">
            <strong>{noPurchasePrice}</strong> ürünün alış fiyatı girilmemiş. Bu ürünler için kâr
            marjı hesaplanamıyor.
          </p>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="bg-base-surface border border-border rounded-xl p-4 space-y-1">
          <p className="text-xs text-text-secondary font-medium">Ortalama Kâr Marjı</p>
          <p
            className={`text-base font-bold ${
              avgMargin === null
                ? 'text-text-muted'
                : avgMargin >= 20
                ? 'text-success-text'
                : 'text-warning-text'
            }`}
          >
            {avgMargin !== null ? `%${avgMargin.toFixed(1)}` : '—'}
          </p>
          <p className="text-xs text-text-muted">
            {withMargin.length} ürün / {enriched.length} toplam
          </p>
        </div>

        <div className="bg-base-surface border border-border rounded-xl p-4 space-y-2 sm:col-span-2">
          <p className="text-xs text-text-secondary font-medium flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-warning-text" />
            En Kârlı 3 Ürün
          </p>
          {top3.length === 0 ? (
            <p className="text-xs text-text-muted">Alış fiyatı girilmiş ürün bulunamadı.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {top3.map((p, i) => (
                <span
                  key={p.id}
                  className={`text-xs px-2 py-1 rounded-lg font-medium ${
                    i === 0
                      ? 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 border border-yellow-500/30'
                      : i === 1
                      ? 'bg-base-surface-2 text-text-secondary border border-border/50'
                      : 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20'
                  }`}
                >
                  {i + 1}. {p.name.length > 25 ? p.name.slice(0, 25) + '…' : p.name} —{' '}
                  <strong>%{(p.margin || 0).toFixed(1)}</strong>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Product Table */}
      <div className="bg-base-surface border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-bold text-text-primary">
            Tüm Ürünler ({enriched.length})
          </h3>
          <span className="text-xs text-text-muted">
            Sıralama: {sortField === 'margin' ? 'Kâr Marjı' : sortField === 'name' ? 'İsim' : sortField === 'price' ? 'Fiyat' : 'Satılan'}{' '}
            {sortDir === 'desc' ? '↓' : '↑'}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-base-surface-2/50">
                <th className="text-left px-4 py-2">
                  <button
                    onClick={() => toggleSort('name')}
                    className="flex items-center gap-1 font-semibold text-text-secondary hover:text-text-primary"
                  >
                    Ürün <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-right px-4 py-2">
                  <button
                    onClick={() => toggleSort('price')}
                    className="flex items-center gap-1 font-semibold text-text-secondary hover:text-text-primary ml-auto"
                  >
                    Alış <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-right px-4 py-2 font-semibold text-text-secondary">Satış</th>
                <th className="text-right px-4 py-2">
                  <button
                    onClick={() => toggleSort('margin')}
                    className="flex items-center gap-1 font-semibold text-text-secondary hover:text-text-primary ml-auto"
                  >
                    Marj % <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-right px-4 py-2 hidden sm:table-cell">
                  <button
                    onClick={() => toggleSort('sold')}
                    className="flex items-center gap-1 font-semibold text-text-secondary hover:text-text-primary ml-auto"
                  >
                    Satılan <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(p => (
                <tr
                  key={p.id}
                  className="border-b border-border/50 hover:bg-base-surface-2/30 transition-colors"
                >
                  <td className="px-4 py-2.5">
                    <div className="text-text-primary font-medium max-w-[220px] truncate">
                      {p.name}
                    </div>
                    <div className="text-text-muted text-[10px] mt-0.5">{p.sku}</div>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {p.purchasePrice > 0 ? (
                      <span className="text-text-secondary">{formatTL(p.purchasePrice)}</span>
                    ) : (
                      <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-warning-fill/15 text-warning-text border border-warning-border">
                        Girilmemiş
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right text-text-primary">
                    {formatTL(p.price)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {p.margin !== null ? (
                      <span
                        className={`inline-flex px-1.5 py-0.5 rounded text-[11px] font-semibold ${getMarginBadgeClass(p.margin)}`}
                      >
                        %{p.margin.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-text-muted text-[10px]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right text-text-primary hidden sm:table-cell">
                    {p.sold > 0 ? p.sold.toLocaleString('tr-TR') : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Margin Legend */}
      <div className="flex flex-wrap gap-2 text-xs text-text-secondary">
        <span className="font-medium">Renk kodu:</span>
        {[
          { label: '%40+ Yeşil', cls: 'bg-success-fill/15 text-success-text border border-success-border' },
          { label: '%20–40 Sarı', cls: 'bg-warning-fill/15 text-warning-text border border-warning-border' },
          { label: '%0–20 Turuncu', cls: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30' },
          { label: 'Negatif Kırmızı', cls: 'bg-danger-fill/15 text-danger-text border border-danger-border' },
        ].map(({ label, cls }) => (
          <span key={label} className={`px-2 py-0.5 rounded text-[11px] font-medium ${cls}`}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
