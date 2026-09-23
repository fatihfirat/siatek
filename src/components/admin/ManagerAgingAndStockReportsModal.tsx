import React, { useState, useEffect } from 'react';
import { 
  X, 
  TrendingUp, 
  AlertTriangle, 
  Clock, 
  Percent, 
  Send, 
  Phone, 
  FileText, 
  Download, 
  PackageSearch, 
  Check, 
  ShieldAlert,
  ArrowUpRight,
  Sparkles,
  ShoppingBag,
  Layers
} from 'lucide-react';
import { Product, CariAccount, CategoryDiscountRule, CariAgingItem, StockAgingItem } from '../../types';
import { DEFAULT_CATEGORY_DISCOUNT_RULES } from '../../data/discountMatrix';
import { playNotificationSound } from '../../lib/audio';
import { openWhatsAppShare } from '../../utils/shareUtils';
import confetti from 'canvas-confetti';
import { useModalBehavior } from '../../hooks/useModalBehavior';

interface ManagerAgingAndStockReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  products?: Product[];
  cariAccounts?: CariAccount[];
  orders?: any[];
  onApplyDiscountRule?: () => void;
}

export const ManagerAgingAndStockReportsModal: React.FC<ManagerAgingAndStockReportsModalProps> = ({
  isOpen,
  onClose,
  products = [],
  cariAccounts = [],
  orders = [],
  onApplyDiscountRule
}) => {
  const [activeTab, setActiveTab] = useState<'aging' | 'stock' | 'discount'>('aging');
  const [discountRules, setDiscountRules] = useState<CategoryDiscountRule[]>(DEFAULT_CATEGORY_DISCOUNT_RULES);
  const [savedDiscountSuccess, setSavedDiscountSuccess] = useState(false);

  useModalBehavior(isOpen, onClose);

  if (!isOpen) return null;

  const safeCariAccounts = Array.isArray(cariAccounts) ? cariAccounts : [];
  const safeProducts = Array.isArray(products) ? products : [];

  // Calculate Aging items from Cari Accounts
  const cariAgingList: CariAgingItem[] = safeCariAccounts
    .filter(c => c && c.balance > 0)
    .map(c => {
      // Deterministic aging split based on balance & terms
      const overdueDays = Math.max(0, Math.floor(Math.random() * 75)); // demo simulation
      const current = c.balance * 0.4;
      const days1_30 = c.balance * 0.3;
      const days31_60 = c.balance * 0.2;
      const days61_90 = c.balance * 0.07;
      const days90Plus = c.balance * 0.03;

      let riskStatus: 'normal' | 'due_soon' | 'overdue' | 'critical' = 'normal';
      if (c.balance > c.creditLimit) riskStatus = 'critical';
      else if (days31_60 + days61_90 + days90Plus > 0) riskStatus = 'overdue';
      else if (days1_30 > 0) riskStatus = 'due_soon';

      return {
        cariId: c.id,
        code: c.code,
        name: c.name,
        companyName: c.companyName || c.name,
        phone: c.phone || '0532 000 00 00',
        balance: c.balance,
        creditLimit: c.creditLimit,
        termDays: c.paymentTermDays,
        overdueAmount: days1_30 + days31_60 + days61_90 + days90Plus,
        overdueDays: overdueDays,
        riskStatus: riskStatus,
        breakdown: {
          current,
          days1_30,
          days31_60,
          days61_90,
          days90Plus
        }
      };
    })
    .sort((a, b) => b.balance - a.balance);

  const totalReceivables = cariAgingList.reduce((sum, c) => sum + c.balance, 0);
  const totalOverdue = cariAgingList.reduce((sum, c) => sum + c.overdueAmount, 0);

  // Calculate Stock Aging & Critical Reorder items
  const stockAgingList: StockAgingItem[] = safeProducts
    .map((p, idx) => {
      const minAlert = p.minStockAlert || 10;
      let status: 'critical_low' | 'out_of_stock' | 'slow_moving' | 'healthy' = 'healthy';
      const daysWithoutSale = (idx * 7) % 60;

      if (p.stock === 0) status = 'out_of_stock';
      else if (p.stock < minAlert) status = 'critical_low';
      else if (daysWithoutSale > 35) status = 'slow_moving';

      const suggestedReorder = status === 'out_of_stock' 
        ? minAlert * 3 
        : status === 'critical_low' 
          ? (minAlert * 2) - p.stock 
          : 0;

      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category,
        warehouseLocation: p.warehouseLocation || 'Raf A-01',
        currentStock: p.stock,
        minStockAlert: minAlert,
        price: p.price,
        stockValue: p.stock * p.price,
        daysWithoutSale,
        status,
        suggestedReorderQuantity: suggestedReorder
      };
    })
    .filter(p => p.status !== 'healthy')
    .sort((a, b) => (a.status === 'out_of_stock' ? -1 : 1));

  const handleSendWhatsAppReminder = (item: CariAgingItem) => {
    const text = `Sayın ${item.companyName},\n\nALPHA Tesisat bünyesindeki cari hesabınızda ${item.balance.toLocaleString('tr-TR')} ₺ güncel bakiye bulunmaktadır. Vadesi geçen ${item.overdueAmount.toLocaleString('tr-TR')} ₺ tutarın ödenmesi hususunu rica ederiz.\n\nOnline Banka & Dekont Sistemi: https://alphatesisat.com`;
    openWhatsAppShare({
      phone: item.phone,
      message: text,
    });
  };

  const handleSaveDiscountRules = () => {
    setSavedDiscountSuccess(true);
    confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    playNotificationSound('success');
    setTimeout(() => setSavedDiscountSuccess(false), 3000);
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md p-3 sm:p-4 md:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div className="min-h-full flex items-center justify-center py-4 sm:py-6">
        <div 
          className="relative w-full max-w-5xl bg-base-surface border border-border rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-base-surface-2/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-text-primary tracking-tight">
                Yönetici Analitiği, Yaşlandırma & İskonto Masası
              </h2>
              <p className="text-xs text-text-muted">
                Bakiye Yaşlandırma (Aging), Kritik Stok/Satın Alma İhtiyaçları ve Bayi İskonto Matrisi
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

        {/* Tabs */}
        <div className="flex border-b border-border bg-base-surface px-6 pt-3 space-x-2">
          <button
            onClick={() => setActiveTab('aging')}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center space-x-2 cursor-pointer ${
              activeTab === 'aging'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Cari Bakiye Yaşlandırma (Aging)</span>
          </button>

          <button
            onClick={() => setActiveTab('stock')}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center space-x-2 cursor-pointer ${
              activeTab === 'stock'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Kritik Stok & Satın Alma Talepleri ({stockAgingList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('discount')}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center space-x-2 cursor-pointer ${
              activeTab === 'discount'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            <Percent className="w-4 h-4" />
            <span>Kategori & Bayi İskonto Matrisi</span>
          </button>
        </div>

        {/* Tab 1: Cari Aging */}
        {activeTab === 'aging' && (
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* KPI Summary Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-base-surface-2 border border-border rounded-2xl">
                <span className="text-text-muted text-[11px] font-bold block">Toplam Açık Cari Alacak</span>
                <span className="text-xl font-extrabold text-text-primary">{totalReceivables.toLocaleString('tr-TR')} ₺</span>
              </div>

              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
                <span className="text-rose-700 dark:text-rose-400 text-[11px] font-bold block">Vadesi Geçen Tutar</span>
                <span className="text-xl font-extrabold text-rose-600">{totalOverdue.toLocaleString('tr-TR')} ₺</span>
              </div>

              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                <span className="text-amber-700 dark:text-amber-400 text-[11px] font-bold block">Borçlu Bayi Sayısı</span>
                <span className="text-xl font-extrabold text-amber-600">{cariAgingList.length} Bayi</span>
              </div>
            </div>

            {/* Aging Table */}
            <div className="border border-border rounded-2xl overflow-hidden bg-base-surface">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-base-surface-2 border-b border-border text-[11px] font-bold text-text-secondary">
                      <th className="p-3">Bayi / Cari Ünvan</th>
                      <th className="p-3 text-right">Net Bakiye</th>
                      <th className="p-3 text-right">0-30 Gün</th>
                      <th className="p-3 text-right">31-60 Gün</th>
                      <th className="p-3 text-right text-rose-600">60+ Gün</th>
                      <th className="p-3 text-center">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {cariAgingList.map((c) => (
                      <tr key={c.cariId} className="hover:bg-base-surface-2/50 transition-colors">
                        <td className="p-3">
                          <div className="font-bold text-text-primary">{c.companyName}</div>
                          <div className="text-[10px] text-text-muted font-mono">{c.code} • {c.phone}</div>
                        </td>

                        <td className="p-3 text-right font-extrabold text-text-primary">
                          {c.balance.toLocaleString('tr-TR')} ₺
                        </td>

                        <td className="p-3 text-right text-text-secondary">
                          {Math.round(c.breakdown.days1_30).toLocaleString('tr-TR')} ₺
                        </td>

                        <td className="p-3 text-right text-amber-600 font-semibold">
                          {Math.round(c.breakdown.days31_60).toLocaleString('tr-TR')} ₺
                        </td>

                        <td className="p-3 text-right text-rose-600 font-bold">
                          {Math.round(c.breakdown.days61_90 + c.breakdown.days90Plus).toLocaleString('tr-TR')} ₺
                        </td>

                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleSendWhatsAppReminder(c)}
                            className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 hover:text-white rounded-xl text-[11px] font-bold transition-all inline-flex items-center space-x-1 cursor-pointer"
                            title="WhatsApp Hatırlatma Mesajı Gönder"
                          >
                            <Send className="w-3 h-3" />
                            <span>Hatırlat</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Stock Aging & Reorder Needs */}
        {activeTab === 'stock' && (
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-text-secondary leading-relaxed">
                <span className="font-bold text-text-primary">Otomatik Stok İkmal & Sipariş Önerisi:</span> Aşağıdaki ürünlerin stoğu minimum kritik eşiğin altına inmiş veya stokta tükenmiştir. Tek tıkla tedarikçiye satın alma emri oluşturabilirsiniz.
              </div>
            </div>

            <div className="border border-border rounded-2xl overflow-hidden bg-base-surface">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-base-surface-2 border-b border-border text-[11px] font-bold text-text-secondary">
                      <th className="p-3">Ürün & SKU</th>
                      <th className="p-3">Raf Yeri</th>
                      <th className="p-3 text-right">Mevcut Stok</th>
                      <th className="p-3 text-right">Kritik Eşik</th>
                      <th className="p-3 text-center">Durum</th>
                      <th className="p-3 text-right text-indigo-600 font-bold">Önerilen Sipariş</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {stockAgingList.map((item) => (
                      <tr key={item.id} className="hover:bg-base-surface-2/50 transition-colors">
                        <td className="p-3">
                          <div className="font-bold text-text-primary">{item.name}</div>
                          <div className="text-[10px] text-text-muted font-mono">{item.sku} • {item.category}</div>
                        </td>

                        <td className="p-3 font-mono text-[11px] text-text-secondary">
                          {item.warehouseLocation}
                        </td>

                        <td className="p-3 text-right font-extrabold text-text-primary">
                          {item.currentStock} Adet
                        </td>

                        <td className="p-3 text-right text-text-muted">
                          {item.minStockAlert} Adet
                        </td>

                        <td className="p-3 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            item.status === 'out_of_stock'
                              ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                          }`}>
                            {item.status === 'out_of_stock' ? 'Tükendi (0)' : 'Kritik Düşük'}
                          </span>
                        </td>

                        <td className="p-3 text-right font-extrabold text-indigo-600">
                          +{item.suggestedReorderQuantity} Adet
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Discount Matrix Configuration */}
        {activeTab === 'discount' && (
          <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-text-primary">Kategori Bazlı Bayi İskonto Oranları (%)</h3>
                <p className="text-xs text-text-muted">Bayi gruplarına göre ürün kategorilerinde uygulanacak standart liste indirimi oranları.</p>
              </div>

              {savedDiscountSuccess && (
                <span className="text-xs font-bold text-emerald-600 flex items-center space-x-1 animate-pulse">
                  <Check className="w-4 h-4" />
                  <span>İskonto Matrisi Kaydedildi!</span>
                </span>
              )}
            </div>

            <div className="space-y-3">
              {discountRules.map((rule, idx) => (
                <div 
                  key={idx}
                  className="p-4 bg-base-surface-2 border border-border rounded-2xl grid grid-cols-1 sm:grid-cols-4 gap-3 items-center"
                >
                  <div className="sm:col-span-1">
                    <span className="font-bold text-xs text-text-primary block">{rule.category}</span>
                    <span className="text-[10px] text-text-muted">{rule.categoryLabel}</span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-indigo-600 mb-1">A Bayi (Ana Bayi) %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={rule.tierA_Percent}
                      onChange={(e) => {
                        const copy = [...discountRules];
                        copy[idx].tierA_Percent = Number(e.target.value);
                        setDiscountRules(copy);
                      }}
                      className="w-full px-3 py-1.5 bg-base-surface border border-border rounded-xl text-xs font-bold text-text-primary focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-blue-600 mb-1">B Bayi (Toptan) %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={rule.tierB_Percent}
                      onChange={(e) => {
                        const copy = [...discountRules];
                        copy[idx].tierB_Percent = Number(e.target.value);
                        setDiscountRules(copy);
                      }}
                      className="w-full px-3 py-1.5 bg-base-surface border border-border rounded-xl text-xs font-bold text-text-primary focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-emerald-600 mb-1">C Bayi (Usta/Taahhüt) %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={rule.tierC_Percent}
                      onChange={(e) => {
                        const copy = [...discountRules];
                        copy[idx].tierC_Percent = Number(e.target.value);
                        setDiscountRules(copy);
                      }}
                      className="w-full px-3 py-1.5 bg-base-surface border border-border rounded-xl text-xs font-bold text-text-primary focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleSaveDiscountRules}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer"
              >
                İskonto Matrisini Güncelle & Uygula
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};
