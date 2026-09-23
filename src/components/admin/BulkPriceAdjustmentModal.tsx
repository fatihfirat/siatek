import React, { useState, useMemo, useEffect } from 'react';
import { X, Percent, TrendingUp, TrendingDown, CheckCircle2, AlertCircle, ArrowRight, RotateCcw, Filter, Sparkles, RefreshCw } from 'lucide-react';
import { Product } from '../../types';
import { useModalBehavior } from '../../hooks/useModalBehavior';

interface BulkPriceAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onApplyAdjustment: (updatedProducts: Product[], message: string) => Promise<void>;
}

export type RoundingMode = 'exact' | 'round_whole' | 'round_90' | 'round_50';

export default function BulkPriceAdjustmentModal({
  isOpen,
  onClose,
  products = [],
  onApplyAdjustment,
}: BulkPriceAdjustmentModalProps) {
  useModalBehavior(isOpen, onClose);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('ALL');
  const [keywordFilter, setKeywordFilter] = useState<string>('');
  
  // Adjustment controls
  const [adjustmentType, setAdjustmentType] = useState<'percent_increase' | 'percent_decrease' | 'fixed_increase' | 'fixed_decrease'>('percent_increase');
  const [adjustmentValue, setAdjustmentValue] = useState<number>(10); // e.g. 10%
  const [targetPrices, setTargetPrices] = useState<'retail' | 'wholesale' | 'both'>('both');
  const [roundingMode, setRoundingMode] = useState<RoundingMode>('round_whole');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const safeProducts = Array.isArray(products) ? products : [];

  // Extract categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    safeProducts.forEach(p => {
      if (p && p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [safeProducts]);

  // Extract subcategories
  const subCategories = useMemo(() => {
    const set = new Set<string>();
    safeProducts.forEach(p => {
      if (p && (selectedCategory === 'ALL' || p.category === selectedCategory)) {
        if (p.subCategory) set.add(p.subCategory);
      }
    });
    return Array.from(set);
  }, [safeProducts, selectedCategory]);

  // Filtered target products
  const matchingProducts = useMemo(() => {
    return safeProducts.filter(p => {
      if (!p) return false;
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) return false;
      if (selectedSubCategory !== 'ALL' && p.subCategory !== selectedSubCategory) return false;
      if (keywordFilter.trim()) {
        const q = keywordFilter.toLowerCase();
        const matchName = (p.name || '').toLowerCase().includes(q);
        const matchSku = (p.sku || '').toLowerCase().includes(q);
        if (!matchName && !matchSku) return false;
      }
      return true;
    });
  }, [safeProducts, selectedCategory, selectedSubCategory, keywordFilter]);

  // Calculate new price helper
  const calculateNewPrice = (currentPrice: number, mode: RoundingMode): number => {
    if (!currentPrice || currentPrice <= 0) return 0;
    let rawPrice = currentPrice;

    if (adjustmentType === 'percent_increase') {
      rawPrice = currentPrice * (1 + (adjustmentValue / 100));
    } else if (adjustmentType === 'percent_decrease') {
      rawPrice = currentPrice * (1 - (adjustmentValue / 100));
    } else if (adjustmentType === 'fixed_increase') {
      rawPrice = currentPrice + adjustmentValue;
    } else if (adjustmentType === 'fixed_decrease') {
      rawPrice = Math.max(0.1, currentPrice - adjustmentValue);
    }

    if (mode === 'round_whole') {
      return Math.round(rawPrice);
    } else if (mode === 'round_90') {
      const floor = Math.floor(rawPrice);
      return floor + 0.90;
    } else if (mode === 'round_50') {
      return Math.round(rawPrice * 2) / 2;
    } else {
      return Math.round(rawPrice * 100) / 100;
    }
  };

  // Previews
  const previewData = useMemo(() => {
    let currentTotalInventoryVal = 0;
    let newTotalInventoryVal = 0;

    const modifiedList: Array<{
      product: Product;
      oldRetail: number;
      newRetail: number;
      oldWholesale: number;
      newWholesale: number;
      diffRetail: number;
    }> = matchingProducts.map(p => {
      const oldRetail = p.price;
      const oldWholesale = p.wholesalePrice || Math.round(p.price * 0.85);

      let newRetail = oldRetail;
      let newWholesale = oldWholesale;

      if (targetPrices === 'retail' || targetPrices === 'both') {
        newRetail = calculateNewPrice(oldRetail, roundingMode);
      }
      if (targetPrices === 'wholesale' || targetPrices === 'both') {
        newWholesale = calculateNewPrice(oldWholesale, roundingMode);
      }

      currentTotalInventoryVal += oldRetail * (p.stock || 0);
      newTotalInventoryVal += newRetail * (p.stock || 0);

      return {
        product: p,
        oldRetail,
        newRetail,
        oldWholesale,
        newWholesale,
        diffRetail: newRetail - oldRetail,
      };
    });

    return {
      modifiedList,
      currentTotalInventoryVal,
      newTotalInventoryVal,
      diffTotalInventoryVal: newTotalInventoryVal - currentTotalInventoryVal,
    };
  }, [matchingProducts, adjustmentType, adjustmentValue, targetPrices, roundingMode]);

  if (!isOpen) return null;

  const handleApply = async () => {
    if (matchingProducts.length === 0) {
      setFeedback({ type: 'error', text: 'Seçili kriterlere uyan ürün bulunamadı.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      // Build updated list
      const productMap = new Map<string, { price: number; wholesalePrice: number }>();
      previewData.modifiedList.forEach(item => {
        productMap.set(item.product.id, {
          price: item.newRetail,
          wholesalePrice: item.newWholesale,
        });
      });

      const updatedAllProducts = products.map(p => {
        if (productMap.has(p.id)) {
          const mod = productMap.get(p.id)!;
          return {
            ...p,
            price: mod.price,
            wholesalePrice: mod.wholesalePrice,
          };
        }
        return p;
      });

      const directionText = adjustmentType.includes('increase') ? 'zam' : 'iskonto';
      const summaryMsg = `${matchingProducts.length} adet ürüne ${adjustmentValue}${adjustmentType.includes('percent') ? '%' : '₺'} ${directionText} uygulandı.`;

      await onApplyAdjustment(updatedAllProducts, summaryMsg);
      setFeedback({ type: 'success', text: summaryMsg });
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Fiyatlar güncellenirken bir hata oluştu.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md p-3 sm:p-4 md:p-6 animate-in fade-in"
      onClick={onClose}
    >
      <div className="min-h-full flex items-center justify-center py-4 sm:py-6">
        <div 
          className="bg-base-surface border border-border w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
          onClick={(e) => e.stopPropagation()}
        >
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-base-surface-2">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-amber-500 text-white shadow-md">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-text-primary flex items-center space-x-2">
                <span>Toplu İskonto ve Zam Motoru</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-mono font-bold">
                  Gelişmiş Fiyatlandırma
                </span>
              </h3>
              <p className="text-xs text-text-muted">
                Kategori, marka ve ürün gruplarına tek tıkla oransal zam veya bayi iskontosu tanımlayın.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text-primary hover:bg-base-surface rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5 text-xs">
          
          {/* 1. Filtreleme & Hedef Kitle */}
          <div className="p-4 bg-base-surface-2 rounded-2xl border border-border space-y-3">
            <div className="font-bold text-text-primary flex items-center space-x-2 text-[11px] uppercase tracking-wider">
              <Filter className="w-3.5 h-3.5 text-amber-500" />
              <span>1. Hedef Ürün Grubu ve Filtreler</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Category Select */}
              <div>
                <label className="text-text-muted block text-[11px] mb-1 font-semibold">Ana Kategori:</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setSelectedSubCategory('ALL');
                  }}
                  className="w-full px-3 py-2 bg-base-surface border border-border rounded-xl text-text-primary font-semibold focus:border-amber-500"
                >
                  <option value="ALL">🌟 TÜM KATEGORİLER ({products.length} Ürün)</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat} ({products.filter(p => p.category === cat).length} Ürün)
                    </option>
                  ))}
                </select>
              </div>

              {/* SubCategory Select */}
              <div>
                <label className="text-text-muted block text-[11px] mb-1 font-semibold">Alt Grup / Seri:</label>
                <select
                  value={selectedSubCategory}
                  onChange={(e) => setSelectedSubCategory(e.target.value)}
                  disabled={subCategories.length === 0}
                  className="w-full px-3 py-2 bg-base-surface border border-border rounded-xl text-text-primary font-semibold focus:border-amber-500 disabled:opacity-50"
                >
                  <option value="ALL">Tüm Alt Gruplar</option>
                  {subCategories.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>

              {/* Keyword Filter */}
              <div>
                <label className="text-text-muted block text-[11px] mb-1 font-semibold">İsim / Kod Filtresi:</label>
                <input
                  type="text"
                  placeholder="örn: PN25, PPRC, 1/2, Vana..."
                  value={keywordFilter}
                  onChange={(e) => setKeywordFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-base-surface border border-border rounded-xl text-text-primary focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 text-[11px] text-text-secondary">
              <span>Etkilenecek Ürün Sayısı: <strong className="text-amber-600 dark:text-amber-400 font-mono text-xs">{matchingProducts.length}</strong> / {products.length}</span>
              {matchingProducts.length === 0 && (
                <span className="text-red-500 font-semibold">Kriterlere uyan ürün bulunamadı.</span>
              )}
            </div>
          </div>

          {/* 2. Değişim Tipi ve Oran */}
          <div className="p-4 bg-base-surface-2 rounded-2xl border border-border space-y-3">
            <div className="font-bold text-text-primary flex items-center space-x-2 text-[11px] uppercase tracking-wider">
              <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
              <span>2. Fiyat Güncelleme Parametreleri</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Type */}
              <div>
                <label className="text-text-muted block text-[11px] mb-1 font-semibold">İşlem Türü:</label>
                <select
                  value={adjustmentType}
                  onChange={(e) => setAdjustmentType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-base-surface border border-border rounded-xl text-text-primary font-bold focus:border-amber-500"
                >
                  <option value="percent_increase">📈 Yüzdesel Zam (+ %)</option>
                  <option value="percent_decrease">🏷️ Yüzdesel İskonto (- %)</option>
                  <option value="fixed_increase">➕ Sabit Tutar Artışı (+ ₺)</option>
                  <option value="fixed_decrease">➖ Sabit Tutar İndirimi (- ₺)</option>
                </select>
              </div>

              {/* Value */}
              <div>
                <label className="text-text-muted block text-[11px] mb-1 font-semibold">
                  {adjustmentType.includes('percent') ? 'Oran (%)' : 'Tutar (₺)'}:
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0.1"
                    step={adjustmentType.includes('percent') ? '1' : '0.5'}
                    value={adjustmentValue}
                    onChange={(e) => setAdjustmentValue(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-base-surface border border-border rounded-xl text-text-primary font-mono font-bold text-sm focus:border-amber-500"
                  />
                  <span className="absolute right-3 top-2.5 font-bold text-text-muted">
                    {adjustmentType.includes('percent') ? '%' : '₺'}
                  </span>
                </div>
              </div>

              {/* Target Price Type */}
              <div>
                <label className="text-text-muted block text-[11px] mb-1 font-semibold">Uygulanacak Fiyat:</label>
                <select
                  value={targetPrices}
                  onChange={(e) => setTargetPrices(e.target.value as any)}
                  className="w-full px-3 py-2 bg-base-surface border border-border rounded-xl text-text-primary font-bold focus:border-amber-500"
                >
                  <option value="both">⚡ Liste ve Bayi Fiyatı (Her İkisi)</option>
                  <option value="retail">🛒 Yalnızca Perakende / Liste</option>
                  <option value="wholesale">🏭 Yalnızca Toptan / Bayi</option>
                </select>
              </div>

              {/* Rounding Mode */}
              <div>
                <label className="text-text-muted block text-[11px] mb-1 font-semibold">Yuvarlama Kuralı:</label>
                <select
                  value={roundingMode}
                  onChange={(e) => setRoundingMode(e.target.value as any)}
                  className="w-full px-3 py-2 bg-base-surface border border-border rounded-xl text-text-primary font-bold focus:border-amber-500"
                >
                  <option value="round_whole">Tam Sayıya Yuvarla (örn: 145 ₺)</option>
                  <option value="round_90">.90 Kuruşa Yuvarla (örn: 145.90 ₺)</option>
                  <option value="round_50">.50 Kuruşa Yuvarla (örn: 145.50 ₺)</option>
                  <option value="exact">Hassas Kuruşlu (örn: 145.32 ₺)</option>
                </select>
              </div>
            </div>

            {/* Quick Percentage Presets */}
            {adjustmentType.includes('percent') && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-text-muted font-bold mr-1">Hızlı Seçim:</span>
                {[3, 5, 8, 10, 15, 20, 25, 30].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAdjustmentValue(val)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-colors cursor-pointer border ${
                      adjustmentValue === val
                        ? 'bg-amber-500 text-white border-amber-600'
                        : 'bg-base-surface text-text-secondary border-border hover:bg-base-surface-2'
                    }`}
                  >
                    %{val}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 3. Etki Özeti ve Canlı Karşılaştırma Kartları */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 bg-base-surface-2 rounded-2xl border border-border">
              <span className="text-text-muted text-[10px] block uppercase font-bold">Mevcut Stok Değeri</span>
              <div className="text-base sm:text-lg font-black font-mono text-text-primary mt-1">
                {previewData.currentTotalInventoryVal.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
              </div>
              <span className="text-[10px] text-text-muted">{matchingProducts.length} kalem ürün</span>
            </div>

            <div className="p-3.5 bg-base-surface-2 rounded-2xl border border-border">
              <span className="text-text-muted text-[10px] block uppercase font-bold">Güncelleme Sonrası Değer</span>
              <div className="text-base sm:text-lg font-black font-mono text-amber-600 dark:text-amber-400 mt-1">
                {previewData.newTotalInventoryVal.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
              </div>
              <span className="text-[10px] text-text-muted">Yeni tahmini envanter</span>
            </div>

            <div className="p-3.5 bg-base-surface-2 rounded-2xl border border-border">
              <span className="text-text-muted text-[10px] block uppercase font-bold">Net Değer Farkı</span>
              <div className={`text-base sm:text-lg font-black font-mono mt-1 ${
                previewData.diffTotalInventoryVal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {previewData.diffTotalInventoryVal >= 0 ? '+' : ''}
                {previewData.diffTotalInventoryVal.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
              </div>
              <span className="text-[10px] text-text-muted">Envanter kazanç/fark</span>
            </div>
          </div>

          {/* 4. Canlı Örnek Ürün Önizleme Tablosu */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-text-primary text-[11px] uppercase tracking-wider">
                3. Canlı Değişim Önizlemesi (İlk 8 Ürün)
              </span>
              <span className="text-[10px] text-text-muted">
                Toplam {previewData.modifiedList.length} ürün değişecek
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-border bg-base-surface">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-base-surface-2 text-text-muted uppercase text-[10px] border-b border-border">
                  <tr>
                    <th className="p-2.5">Ürün Adı & SKU</th>
                    <th className="p-2.5 text-right">Mevcut Liste</th>
                    <th className="p-2.5 text-center">➔</th>
                    <th className="p-2.5 text-right font-bold text-amber-600 dark:text-amber-400">Yeni Liste</th>
                    <th className="p-2.5 text-right">Mevcut Bayi</th>
                    <th className="p-2.5 text-center">➔</th>
                    <th className="p-2.5 text-right font-bold text-amber-600 dark:text-amber-400">Yeni Bayi</th>
                    <th className="p-2.5 text-right">Fark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {previewData.modifiedList.slice(0, 8).map(item => (
                    <tr key={item.product.id} className="hover:bg-base-surface-2 transition-colors">
                      <td className="p-2.5 max-w-[200px] truncate">
                        <div className="font-bold text-text-primary truncate">{item.product.name}</div>
                        <div className="text-[10px] text-text-muted font-mono">{item.product.sku}</div>
                      </td>
                      <td className="p-2.5 text-right font-mono text-text-secondary">
                        {item.oldRetail.toLocaleString('tr-TR')} ₺
                      </td>
                      <td className="p-2.5 text-center text-text-muted">➔</td>
                      <td className="p-2.5 text-right font-mono font-bold text-text-primary bg-amber-500/10">
                        {item.newRetail.toLocaleString('tr-TR')} ₺
                      </td>
                      <td className="p-2.5 text-right font-mono text-text-secondary">
                        {item.oldWholesale.toLocaleString('tr-TR')} ₺
                      </td>
                      <td className="p-2.5 text-center text-text-muted">➔</td>
                      <td className="p-2.5 text-right font-mono font-bold text-text-primary bg-amber-500/10">
                        {item.newWholesale.toLocaleString('tr-TR')} ₺
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold">
                        <span className={item.diffRetail >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                          {item.diffRetail >= 0 ? '+' : ''}{item.diffRetail.toFixed(2)} ₺
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {previewData.modifiedList.length > 8 && (
              <p className="text-[10px] text-text-muted text-center italic">
                ... ve geriye kalan {previewData.modifiedList.length - 8} ürün de aynı kurala göre güncellenecektir.
              </p>
            )}
          </div>

          {/* Feedback banner */}
          {feedback && (
            <div className={`p-3 rounded-2xl text-xs flex items-center space-x-2 border ${
              feedback.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300'
            }`}>
              {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span className="font-semibold">{feedback.text}</span>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-base-surface-2 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            İptal
          </button>

          <div className="flex items-center space-x-3">
            <span className="text-[11px] text-text-muted hidden sm:inline-block">
              {matchingProducts.length} Ürün Etkilenecek
            </span>
            <button
              type="button"
              onClick={handleApply}
              disabled={isSubmitting || matchingProducts.length === 0}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-xs flex items-center space-x-2 shadow-md transition-all cursor-pointer disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Güncelleniyor...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Yeni Fiyatları Uygula & Yayınla</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
      </div>
    </div>
  );
}
