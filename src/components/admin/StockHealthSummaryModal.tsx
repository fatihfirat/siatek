import React from 'react';
import { Product } from '../../types';
import { 
  Sparkles, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  Package, 
  BarChart3, 
  TrendingUp,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { useModalBehavior } from '../../hooks/useModalBehavior';

interface StockHealthSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onSelectFilter: (mode: 'all' | 'in_stock' | 'critical' | 'health') => void;
}

export default function StockHealthSummaryModal({
  isOpen,
  onClose,
  products = [],
  onSelectFilter,
}: StockHealthSummaryModalProps) {
  useModalBehavior(isOpen, onClose);

  if (!isOpen) return null;

  const totalCount = products.length;
  const criticalCount = products.filter(p => p.stock > 0 && p.stock <= 5).length;
  const outOfStockCount = products.filter(p => !p.stock || p.stock <= 0).length;
  const healthyCount = products.filter(p => p.stock > 5).length;
  
  const stockValue = products.reduce((sum, p) => sum + (p.stock || 0) * (p.price || 0), 0);
  const wholesaleValue = products.reduce((sum, p) => sum + (p.stock || 0) * (p.wholesalePrice || p.price || 0), 0);

  const healthScore = totalCount > 0 
    ? Math.round(((totalCount - (criticalCount + outOfStockCount)) / totalCount) * 100) 
    : 100;

  const healthyPercent = totalCount > 0 ? Math.round((healthyCount / totalCount) * 100) : 100;
  const criticalPercent = totalCount > 0 ? Math.round((criticalCount / totalCount) * 100) : 0;
  const outOfStockPercent = totalCount > 0 ? Math.max(0, 100 - healthyPercent - criticalPercent) : 0;

  const formatMoney = (val: number) => 
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val);

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md p-3 sm:p-4 md:p-6 animate-in fade-in flex items-center justify-center"
      onClick={onClose}
    >
      <div 
        className="relative bg-base-surface border border-border rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-base-surface-2 border-b border-border flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary">Stok Sağlığı & Envanter Raporu</h3>
              <p className="text-xs text-text-muted">Kritik seviyeler, tükenen kalemler ve portföy sağlık analizi</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text-primary rounded-xl hover:bg-base-surface transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Main Health Metric Card */}
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                %{healthScore}
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Genel Stok Sağlığı
                </div>
                <div className="text-sm font-semibold text-text-primary mt-0.5">
                  {healthScore >= 90 ? 'Mükemmel Seviyede' : healthScore >= 75 ? 'İyi Seviyede' : 'İkmal Aksiyonu Gerekli'}
                </div>
                <div className="text-xs text-text-muted">
                  {criticalCount + outOfStockCount === 0 
                    ? 'Tüm kalemler emniyet stoğu üzerinde bulunuyor.' 
                    : `${criticalCount + outOfStockCount} kalemde tedarik aksiyonu öneriliyor.`}
                </div>
              </div>
            </div>

            <div className="text-left sm:text-right shrink-0">
              <div className="text-xs text-text-muted">Toplam Canlı Değer</div>
              <div className="text-base sm:text-lg font-black text-text-primary tabular-nums">
                {formatMoney(stockValue)}
              </div>
              <div className="text-[11px] text-text-muted tabular-nums">
                Toptan: {formatMoney(wholesaleValue)}
              </div>
            </div>
          </div>

          {/* Breakdown Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-text-secondary">
              <span>Envanter Dağılımı</span>
              <span className="tabular-nums font-mono">{totalCount} Toplam Kalem</span>
            </div>
            <div className="h-3.5 w-full bg-base-surface-2 rounded-full overflow-hidden flex border border-border">
              <div 
                style={{ width: `${healthyPercent}%` }} 
                className="bg-emerald-500 transition-all" 
                title={`Yeterli Stok: ${healthyCount} ürün (%${healthyPercent})`}
              />
              <div 
                style={{ width: `${criticalPercent}%` }} 
                className="bg-amber-500 transition-all" 
                title={`Kritik Stok: ${criticalCount} ürün (%${criticalPercent})`}
              />
              <div 
                style={{ width: `${outOfStockPercent}%` }} 
                className="bg-rose-500 transition-all" 
                title={`Tükenen Stok: ${outOfStockCount} ürün (%${outOfStockPercent})`}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between text-xs pt-1 text-text-muted">
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                <span>Yeterli: <strong className="text-text-primary tabular-nums">{healthyCount}</strong> (%{healthyPercent})</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                <span>Kritik: <strong className="text-text-primary tabular-nums">{criticalCount}</strong> (%{criticalPercent})</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                <span>Tükenen: <strong className="text-text-primary tabular-nums">{outOfStockCount}</strong> (%{outOfStockPercent})</span>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => {
                onSelectFilter('critical');
                onClose();
              }}
              className="p-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-bold flex flex-col items-center justify-center text-center transition-all cursor-pointer active:scale-[0.98]"
            >
              <AlertTriangle className="w-4 h-4 mb-1" />
              <span>Kritikleri Filtrele ({criticalCount + outOfStockCount})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onSelectFilter('in_stock');
                onClose();
              }}
              className="p-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex flex-col items-center justify-center text-center transition-all cursor-pointer active:scale-[0.98]"
            >
              <Package className="w-4 h-4 mb-1" />
              <span>Stoktakileri Filtrele ({healthyCount + criticalCount})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onSelectFilter('all');
                onClose();
              }}
              className="p-3 rounded-xl bg-base-surface-2 hover:bg-base-surface border border-border text-text-primary text-xs font-bold flex flex-col items-center justify-center text-center transition-all cursor-pointer active:scale-[0.98]"
            >
              <CheckCircle2 className="w-4 h-4 mb-1 text-text-secondary" />
              <span>Tüm Kataloğu Göster ({totalCount})</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-base-surface-2 border-t border-border flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-base-surface hover:bg-base-surface-2 border border-border text-text-primary rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
