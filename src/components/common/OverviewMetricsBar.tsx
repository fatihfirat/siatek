import React from 'react';
import { TrendingUp, Package, AlertTriangle } from 'lucide-react';
import { Product, Order } from '../../types';

interface OverviewMetricsBarProps {
  products: Product[];
  orders: Order[];
  activeTab?: string;
  clickedCardId?: string | null;
  onNavigateOrders?: () => void;
  onNavigateProducts?: () => void;
}

export default function OverviewMetricsBar({
  products = [],
  orders = [],
  activeTab,
  clickedCardId,
  onNavigateOrders,
  onNavigateProducts,
}: OverviewMetricsBarProps) {
  const safeOrders = Array.isArray(orders) ? orders : [];
  const totalRevenue = safeOrders
    .filter(o => o && o.status !== 'cancelled')
    .reduce((acc, o) => acc + o.total, 0);

  const deliveredRevenue = safeOrders
    .filter(o => o && o.status === 'delivered')
    .reduce((acc, o) => acc + o.total, 0);

  const collectedRevenue = safeOrders
    .filter(o => o && o.status !== 'cancelled' && (o.paymentStatus === 'paid' || o.receiptStatus === 'verified' || o.collectionStatus === 'collected'))
    .reduce((acc, o) => acc + (o.collectionAmount || o.total), 0);

  const uncollectedOrders = safeOrders
    .filter(o => o && o.status === 'delivered' && o.paymentStatus === 'pending_collection');
  const uncollectedAmount = uncollectedOrders.reduce((acc, o) => acc + o.total, 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {/* Toplam Sipariş & Ciro Kartı */}
      <div
        id="card-total-orders-island"
        role="button"
        tabIndex={0}
        onClick={onNavigateOrders}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            onNavigateOrders?.();
          }
        }}
        className={`p-4 rounded-2xl border shadow-xs transition-all duration-200 cursor-pointer select-none active:scale-[0.98] flex items-center justify-between ${
          clickedCardId === 'total-orders-island'
            ? 'ring-4 ring-success-border scale-[0.98] bg-bg-success shadow-lg'
            : activeTab === 'orders'
            ? 'bg-bg-success/80 border-success-border ring-2 ring-success-border'
            : 'bg-base-surface border-border hover:border-success-border hover:bg-bg-success/20'
        }`}
        title="Tüm sipariş yönetimi listesine git"
      >
        <div className="flex items-center space-x-3.5">
          <div
            className={`p-3 rounded-2xl border transition-transform ${
              clickedCardId === 'total-orders-island' ? 'scale-110' : ''
            } bg-bg-success text-success-text border-success-border shadow-2xs`}
          >
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-text-secondary">
                Toplam Sipariş & Ciro
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-success text-success-text border border-success-border font-mono font-bold">
                Canlı Siparişler
              </span>
            </div>
            <div className="text-xl font-black text-success-text font-mono mt-0.5">
              {totalRevenue.toLocaleString('tr-TR')} ₺
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap text-[11px]">
              <span className="text-text-muted font-medium">
                Teslim: <strong className="text-text-primary font-mono">{deliveredRevenue.toLocaleString('tr-TR')} ₺</strong>
              </span>
              <span className="text-text-muted">•</span>
              <span className="text-text-muted font-medium">
                Tahsilat: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{collectedRevenue.toLocaleString('tr-TR')} ₺</strong>
              </span>
            </div>
            {uncollectedOrders.length > 0 && (
              <div className="mt-1 inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-bg-danger text-danger-text border border-danger-border text-[10px] font-bold animate-pulse">
                <AlertTriangle className="w-2.5 h-2.5" />
                <span>{uncollectedOrders.length} Teslimatta Para Alınmadı ({uncollectedAmount.toLocaleString('tr-TR')} ₺)</span>
              </div>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="text-xs font-bold text-success-text block">
            Siparişleri İncele
          </span>
          <span className="block text-[10px] text-text-muted mt-0.5">
            {orders.length} Adet Kayıtlı
          </span>
        </div>
      </div>

      {/* Aktif Ürün Kataloğu & Fiyatlar Kartı */}
      <div
        id="card-active-products-island"
        role="button"
        tabIndex={0}
        onClick={onNavigateProducts}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            onNavigateProducts?.();
          }
        }}
        className={`p-4 rounded-2xl border shadow-xs transition-all duration-200 cursor-pointer select-none active:scale-[0.98] flex items-center justify-between ${
          clickedCardId === 'active-products-island'
            ? 'ring-4 ring-border-strong scale-[0.98] bg-base-surface-2 shadow-lg'
            : activeTab === 'products'
            ? 'bg-base-surface-2 border-border-strong ring-2 ring-border-strong'
            : 'bg-base-surface border-border hover:border-border-strong hover:bg-base-surface-2/60'
        }`}
        title="Aktif ürün kataloğu ve fiyat tablosuna git"
      >
        <div className="flex items-center space-x-3.5">
          <div
            className={`p-3 rounded-2xl border transition-transform ${
              clickedCardId === 'active-products-island' ? 'scale-110' : ''
            } bg-base-surface-2 text-text-primary border-border shadow-2xs`}
          >
            <Package className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-text-secondary">
              Aktif Ürün Kataloğu & Fiyatlar
            </span>
            <div className="text-xl font-black text-text-primary font-mono mt-0.5">
              {products.length}{' '}
              <span className="text-xs font-sans font-bold text-text-muted">
                Ürün Tanımlı
              </span>
            </div>
            <p className="text-[11px] text-text-muted mt-0.5 font-medium">
              Kategori, stok ve KDV yönetimi
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="text-xs font-bold text-text-primary block">
            Kataloğu Yönet
          </span>
          <span className="block text-[10px] text-text-muted mt-0.5">
            Fiyat & Stok
          </span>
        </div>
      </div>
    </div>
  );
}
