import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, ShoppingCart, Download, Send, Printer, Plus, Trash2, CheckCircle2, AlertTriangle, Building2, Package, RefreshCw, FileSpreadsheet, ExternalLink, PackageCheck, Search, ChevronDown, Hash, StickyNote, TrendingUp, Boxes } from 'lucide-react';
import { Product } from '../../types';
import { openWhatsAppShare } from '../../utils/shareUtils';
import { printElementById } from '../../utils/printUtils';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import { useCompanySettings } from '../../lib/companySettings';

interface SupplierPurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onApplyRestock?: (restockItems: Array<{ id: string; quantity: number }>) => Promise<void>;
  onApplyStockRestock?: (restockItems: Array<{ id: string; quantity: number }>) => Promise<void>;
}

interface PurchaseOrderItem {
  productId: string;
  name: string;
  sku: string;
  category: string;
  currentStock: number;
  minOrderQuantity: number;
  orderQuantity: number;
  unit: string;
  estimatedUnitPrice: number;
  supplierName: string;
  notes?: string;
}

const DEFAULT_SUPPLIERS = [
  'Fırat Boru A.Ş. (PPRC & PVC)',
  'Dizayn Grup (Boru & Fittings)',
  'E.C.A. / Valfsel (Armatür & Vana)',
  'Kalde Tesisat Sistemleri',
  'Norm Bağlantı & Kelepçe',
  'Baymak / BDR Thermea',
  'DemirDöküm & Vaillant',
  'Genel Toptancı / İmes Depo'
];

// ── Mal Kabul ──────────────────────────────────────────────────────────────
interface MalKabulItem {
  id: string; // uuid-ish
  productId: string;
  name: string;
  sku: string;
  category: string;
  receivedQty: number;
  unit: string;
  actualUnitCost: number;
  supplierName: string;
  lotNo: string;
  notes: string;
}

// ── Ana bileşen ─────────────────────────────────────────────────────────────
export default function SupplierPurchaseOrderModal({
  isOpen,
  onClose,
  products = [],
  onApplyRestock,
  onApplyStockRestock,
}: SupplierPurchaseOrderModalProps) {
  useModalBehavior(isOpen, onClose);
  const company = useCompanySettings();
  const [activeTab, setActiveTab] = useState<'po' | 'malKabul'>('po');
  const [criticalThreshold, setCriticalThreshold] = useState<number>(10);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('TÜMÜ');
  const [orderNumber] = useState<string>(`SAT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [orderDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<string>('');
  
  // Custom items in PO
  const [purchaseItems, setPurchaseItems] = useState<PurchaseOrderItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // ── Mal Kabul state ────────────────────────────────────────────────────────
  const [mkItems, setMkItems] = useState<MalKabulItem[]>([]);
  const [mkSearch, setMkSearch] = useState('');
  const [mkDropdownOpen, setMkDropdownOpen] = useState(false);
  const [mkSubmitting, setMkSubmitting] = useState(false);
  const [mkFeedback, setMkFeedback] = useState<string | null>(null);
  const mkSearchRef = useRef<HTMLDivElement>(null);

  const safeProducts = Array.isArray(products) ? products : [];

  // Auto-suggest supplier based on category/name
  const detectSupplier = (p: Product): string => {
    if (!p) return 'Genel Toptancı / İmes Depo';
    const name = (p.name || '').toLowerCase();
    const cat = (p.category || '').toLowerCase();
    if (name.includes('fırat') || cat.includes('pprc') || cat.includes('pvc') || cat.includes('koruge')) {
      return 'Fırat Boru A.Ş. (PPRC & PVC)';
    }
    if (name.includes('dizayn') || cat.includes('damlama')) {
      return 'Dizayn Grup (Boru & Fittings)';
    }
    if (name.includes('eca') || name.includes('vana') || name.includes('musluk') || cat.includes('armatür') || cat.includes('vana')) {
      return 'E.C.A. / Valfsel (Armatür & Vana)';
    }
    if (name.includes('kalde') || cat.includes('kollektör')) {
      return 'Kalde Tesisat Sistemleri';
    }
    if (name.includes('kelepçe') || name.includes('dübel') || cat.includes('tespit')) {
      return 'Norm Bağlantı & Kelepçe';
    }
    if (name.includes('kombi') || name.includes('baymak') || cat.includes('ısıtma')) {
      return 'Baymak / BDR Thermea';
    }
    return 'Genel Toptancı / İmes Depo';
  };

  // Initialize critical stock items
  useEffect(() => {
    if (!isInitialized && safeProducts.length > 0) {
      const criticals = safeProducts
        .filter(p => p && p.stock <= criticalThreshold)
        .map(p => {
          const suggestedQty = Math.max(p.minOrderQuantity || 1, (criticalThreshold * 3) - p.stock);
          const estimatedCost = p.wholesalePrice ? Math.round(p.wholesalePrice * 0.8) : Math.round(p.price * 0.65);
          return {
            productId: p.id,
            name: p.name,
            sku: p.sku,
            category: p.category,
            currentStock: p.stock,
            minOrderQuantity: p.minOrderQuantity || 1,
            orderQuantity: suggestedQty,
            unit: p.unit || 'ADET',
            estimatedUnitPrice: estimatedCost,
            supplierName: detectSupplier(p),
          };
        });
      setPurchaseItems(criticals);
      setIsInitialized(true);
    }
  }, [safeProducts, criticalThreshold, isInitialized]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Recalculate if threshold changes manually
  const handleRefreshThreshold = (newThreshold: number) => {
    setCriticalThreshold(newThreshold);
    const criticals = safeProducts
      .filter(p => p && p.stock <= newThreshold)
      .map(p => {
        const suggestedQty = Math.max(p.minOrderQuantity || 1, (newThreshold * 3) - p.stock);
        const estimatedCost = p.wholesalePrice ? Math.round(p.wholesalePrice * 0.8) : Math.round(p.price * 0.65);
        return {
          productId: p.id,
          name: p.name,
          sku: p.sku,
          category: p.category,
          currentStock: p.stock,
          minOrderQuantity: p.minOrderQuantity || 1,
          orderQuantity: suggestedQty,
          unit: p.unit || 'ADET',
          estimatedUnitPrice: estimatedCost,
          supplierName: detectSupplier(p),
        };
      });
    setPurchaseItems(criticals);
  };

  const handleUpdateItemQty = (productId: string, newQty: number) => {
    setPurchaseItems(prev => prev.map(item => {
      if (item.productId === productId) {
        return { ...item, orderQuantity: Math.max(1, newQty) };
      }
      return item;
    }));
  };

  const handleUpdateItemSupplier = (productId: string, supplier: string) => {
    setPurchaseItems(prev => prev.map(item => {
      if (item.productId === productId) {
        return { ...item, supplierName: supplier };
      }
      return item;
    }));
  };

  const handleRemoveItem = (productId: string) => {
    setPurchaseItems(prev => prev.filter(i => i.productId !== productId));
  };

  // Filtered by selected supplier
  const displayedItems = useMemo(() => {
    if (selectedSupplier === 'TÜMÜ') return purchaseItems;
    return purchaseItems.filter(i => i.supplierName === selectedSupplier);
  }, [purchaseItems, selectedSupplier]);

  const totalEstimatedCost = displayedItems.reduce((acc, i) => acc + (i.orderQuantity * i.estimatedUnitPrice), 0);
  const totalItemCount = displayedItems.reduce((acc, i) => acc + i.orderQuantity, 0);

  if (!isOpen) return null;

  // Print PDF
  const handlePrint = () => {
    printElementById('purchase-order-printable-doc', `Satın Alma Sipariş Formu - ${orderNumber}`);
  };

  // Export CSV / Excel
  const handleExportCSV = () => {
    const headers = ['Sıra', 'Stok Kodu', 'Ürün Adı', 'Kategori', 'Mevcut Stok', 'Sipariş Adedi', 'Birim', 'Tahmini Birim Fiyat (₺)', 'Tutar (₺)', 'Tedarikçi'];
    const rows = displayedItems.map((item, idx) => [
      idx + 1,
      `"${item.sku}"`,
      `"${item.name.replace(/"/g, '""')}"`,
      `"${item.category}"`,
      item.currentStock,
      item.orderQuantity,
      item.unit,
      item.estimatedUnitPrice,
      item.orderQuantity * item.estimatedUnitPrice,
      `"${item.supplierName}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ALPHA_TEKNIK_SATIN_ALMA_${orderNumber}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // WhatsApp Share
  const handleWhatsAppSend = () => {
    const itemsText = displayedItems
      .slice(0, 10)
      .map((item, idx) => `${idx + 1}. [${item.sku}] ${item.name} -> *${item.orderQuantity} ${item.unit}*`)
      .join('\n');
    const more = displayedItems.length > 10 ? `\n... ve ${displayedItems.length - 10} kalem ürün daha` : '';

    const message = `*ALPHA TEKNİK DOĞALGAZ & SIHHİ TESİSAT*\n` +
      `📦 *FABRİKA SATIN ALMA / SİPARİŞ TALEBİ*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `*Talep No:* #${orderNumber}\n` +
      `*Tarih:* ${orderDate}\n` +
      `*Tedarikçi:* ${selectedSupplier === 'TÜMÜ' ? 'Genel Sipariş Listesi' : selectedSupplier}\n\n` +
      `*Sipariş Kalemleri (${displayedItems.length} Kalem - Toplam ${totalItemCount} Adet):*\n` +
      `${itemsText}${more}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🚚 *Teslimat Deposu:* İMES Sanayi Sitesi, B Blok No: 42, Ümraniye / İSTANBUL\n` +
      `📞 İletişim: +90 216 456 78 90 / muslimfirat@yahoo.com`;

    openWhatsAppShare({ message });
  };

  // ── Mal Kabul handlers ────────────────────────────────────────────────────

  const mkFilteredProducts = useMemo(() => {
    if (!mkSearch.trim()) return safeProducts.slice(0, 40);
    const q = mkSearch.toLowerCase();
    return safeProducts.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.sku || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q)
    ).slice(0, 40);
  }, [safeProducts, mkSearch]);

  const addMkItem = (p: typeof safeProducts[0]) => {
    setMkItems(prev => {
      const exists = prev.find(i => i.productId === p.id);
      if (exists) return prev;
      return [...prev, {
        id: `mk-${Date.now()}-${Math.random()}`,
        productId: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category,
        receivedQty: p.minOrderQuantity || 1,
        unit: p.unit || 'ADET',
        actualUnitCost: p.wholesalePrice ? Math.round(p.wholesalePrice * 0.8) : Math.round(p.price * 0.65),
        supplierName: detectSupplier(p),
        lotNo: '',
        notes: '',
      }];
    });
    setMkSearch('');
    setMkDropdownOpen(false);
  };

  const updateMkItem = (id: string, patch: Partial<MalKabulItem>) => {
    setMkItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));
  };

  const removeMkItem = (id: string) => {
    setMkItems(prev => prev.filter(i => i.id !== id));
  };

  const handleMalKabulApply = async () => {
    if (mkItems.length === 0) return;
    setMkSubmitting(true);
    setMkFeedback(null);
    try {
      const payload = mkItems.map(i => ({
        id: i.productId,
        quantity: i.receivedQty,
      }));
      if (onApplyRestock) {
        await onApplyRestock(payload);
      } else if (onApplyStockRestock) {
        await onApplyStockRestock(payload);
      }
      setMkFeedback(`${mkItems.length} kalem ürün stoka işlendi.`);
      setMkItems([]);
      setTimeout(() => { setMkFeedback(null); }, 3000);
    } catch (err: any) {
      setMkFeedback(`Hata: ${err.message}`);
    } finally {
      setMkSubmitting(false);
    }
  };

  const mkTotalValue = mkItems.reduce((s, i) => s + i.receivedQty * i.actualUnitCost, 0);
  const mkTotalQty = mkItems.reduce((s, i) => s + i.receivedQty, 0);

  // ── PO Apply ──────────────────────────────────────────────────────────────

  // Apply Restock (Mal Kabul)
  const handleApplyRestockToInventory = async () => {
    if (displayedItems.length === 0) return;
    setIsSubmitting(true);
    try {
      const restockPayload = displayedItems.map(item => ({
        id: item.productId,
        quantity: item.orderQuantity,
      }));
      if (onApplyRestock) {
        await onApplyRestock(restockPayload);
      } else if (onApplyStockRestock) {
        await onApplyStockRestock(restockPayload);
      }
      setFeedback(`${displayedItems.length} kalem ürünün stok ikmali başarıyla tamamlandı ve depoya kaydedildi!`);
      setTimeout(() => {
        setFeedback(null);
        onClose();
      }, 1500);
    } catch (err: any) {
      setFeedback(`Hata: ${err.message}`);
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
          className="bg-base-surface border border-border w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]"
          onClick={(e) => e.stopPropagation()}
        >
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-border bg-base-surface-2/60">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center space-x-3 min-w-0">
              <div className={`p-2.5 rounded-2xl text-white shadow-md shrink-0 ${activeTab === 'po' ? 'bg-blue-600' : 'bg-emerald-600'}`}>
                {activeTab === 'po' ? <ShoppingCart className="w-5 h-5" /> : <PackageCheck className="w-5 h-5" />}
              </div>
              <div className="min-w-0">
                <h3 className="font-extrabold text-sm sm:text-base text-text-primary truncate">
                  {activeTab === 'po' ? 'Satın Alma Sipariş Masası' : 'Mal Kabul & Depo Girişi'}
                </h3>
                <p className="text-xs text-text-muted">
                  {activeTab === 'po' ? 'Kritik stok ürünlerini fabrikadan sipariş listesine dönüştürün' : 'Tedarikçiden gelen malları kayıt altına alın ve stoka işleyin'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-text-muted hover:text-text-primary hover:bg-base-surface rounded-xl transition-colors cursor-pointer shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* Tab bar */}
          <div className="flex items-center gap-1 p-1 bg-base-surface rounded-xl border border-border w-fit">
            <button
              onClick={() => setActiveTab('po')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === 'po' ? 'bg-blue-600 text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              Satın Alma Siparişi
            </button>
            <button
              onClick={() => setActiveTab('malKabul')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === 'malKabul' ? 'bg-emerald-600 text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
            >
              <PackageCheck className="w-3.5 h-3.5" />
              Mal Kabul
              {mkItems.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] font-black">{mkItems.length}</span>
              )}
            </button>
          </div>
        </div>

        {/* ── MAL KABUL BODY ── */}
        {activeTab === 'malKabul' && (
          <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5 text-xs">

            {/* Ürün Arama */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-text-muted uppercase tracking-wide">Gelen Ürünü Ekle</label>
              <div className="relative" ref={mkSearchRef}>
                <div className="flex items-center gap-2 px-3 py-2.5 bg-base-surface border border-border rounded-xl focus-within:border-emerald-500/50 transition-colors">
                  <Search className="w-4 h-4 text-text-muted shrink-0" />
                  <input
                    type="text"
                    value={mkSearch}
                    onChange={e => { setMkSearch(e.target.value); setMkDropdownOpen(true); }}
                    onFocus={() => setMkDropdownOpen(true)}
                    placeholder="Ürün adı, stok kodu veya kategori ile ara..."
                    className="flex-1 bg-transparent text-sm text-text-primary focus:outline-none placeholder:text-text-muted"
                  />
                  {mkSearch && (
                    <button onClick={() => { setMkSearch(''); setMkDropdownOpen(false); }} className="text-text-muted hover:text-text-primary cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {mkDropdownOpen && mkFilteredProducts.length > 0 && (
                  <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-base-surface border border-border rounded-xl shadow-xl overflow-y-auto max-h-64">
                    {mkFilteredProducts.map(p => {
                      const already = mkItems.some(i => i.productId === p.id);
                      return (
                        <button
                          key={p.id}
                          onClick={() => addMkItem(p)}
                          disabled={already}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-base-surface-2 transition-colors cursor-pointer ${already ? 'opacity-40 cursor-not-allowed' : ''}`}
                        >
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                            <Package className="w-3.5 h-3.5 text-emerald-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-text-primary truncate text-[12px]">{p.name}</p>
                            <p className="text-[10px] text-text-muted font-mono">{p.sku} · {p.category} · Mevcut: {p.stock} {p.unit}</p>
                          </div>
                          {already && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Mal Kabul Listesi */}
            {mkItems.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                  <Boxes className="w-7 h-7 text-emerald-500 opacity-60" />
                </div>
                <p className="text-sm font-semibold text-text-secondary">Henüz ürün eklenmedi</p>
                <p className="text-xs text-text-muted">Yukarıdan gelen ürünleri arayıp listeye ekleyin.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {mkItems.map(item => (
                  <div key={item.id} className="rounded-2xl border border-border bg-base-surface overflow-hidden">
                    {/* Ürün başlık satırı */}
                    <div className="flex items-center gap-3 px-4 py-3 bg-base-surface-2/50 border-b border-border">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                        <PackageCheck className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-text-primary truncate text-[12px]">{item.name}</p>
                        <p className="text-[10px] text-text-muted font-mono">{item.sku} · {item.category}</p>
                      </div>
                      <button onClick={() => removeMkItem(item.id)} className="p-1.5 rounded-lg text-text-muted hover:text-danger-text hover:bg-danger-fill transition-colors cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {/* Alanlar */}
                    <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="text-[10px] text-text-muted font-bold uppercase tracking-wide block mb-1">Gelen Miktar</label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number" min="1"
                            value={item.receivedQty}
                            onChange={e => updateMkItem(item.id, { receivedQty: Math.max(1, parseInt(e.target.value) || 1) })}
                            className="w-20 px-2 py-1.5 rounded-lg bg-base-surface-2 border border-emerald-500/30 font-black font-mono text-center text-text-primary focus:outline-none focus:border-emerald-500"
                          />
                          <span className="text-[10px] text-text-muted">{item.unit}</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-text-muted font-bold uppercase tracking-wide block mb-1">Birim Maliyet (₺)</label>
                        <input
                          type="number" min="0" step="0.01"
                          value={item.actualUnitCost}
                          onChange={e => updateMkItem(item.id, { actualUnitCost: parseFloat(e.target.value) || 0 })}
                          className="w-full px-2 py-1.5 rounded-lg bg-base-surface-2 border border-border font-mono text-text-primary focus:outline-none focus:border-emerald-500/50"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-text-muted font-bold uppercase tracking-wide block mb-1">Lot / Seri No</label>
                        <input
                          type="text"
                          value={item.lotNo}
                          onChange={e => updateMkItem(item.id, { lotNo: e.target.value })}
                          placeholder="LOT-..."
                          className="w-full px-2 py-1.5 rounded-lg bg-base-surface-2 border border-border font-mono text-text-primary focus:outline-none focus:border-emerald-500/50 placeholder:text-text-muted"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-text-muted font-bold uppercase tracking-wide block mb-1">Tedarikçi</label>
                        <select
                          value={item.supplierName}
                          onChange={e => updateMkItem(item.id, { supplierName: e.target.value })}
                          className="w-full px-2 py-1.5 rounded-lg bg-base-surface-2 border border-border text-text-primary focus:outline-none focus:border-emerald-500/50 text-[11px]"
                        >
                          {DEFAULT_SUPPLIERS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="sm:col-span-4">
                        <label className="text-[10px] text-text-muted font-bold uppercase tracking-wide block mb-1">Notlar</label>
                        <input
                          type="text"
                          value={item.notes}
                          onChange={e => updateMkItem(item.id, { notes: e.target.value })}
                          placeholder="Paket hasarı, eksik, vb."
                          className="w-full px-2 py-1.5 rounded-lg bg-base-surface-2 border border-border text-text-primary focus:outline-none focus:border-emerald-500/50 placeholder:text-text-muted"
                        />
                      </div>
                    </div>
                    {/* Satır özet */}
                    <div className="px-4 py-2 bg-emerald-500/5 border-t border-emerald-500/10 flex items-center justify-between">
                      <span className="text-[10px] text-text-muted">{item.receivedQty} {item.unit} × {item.actualUnitCost.toLocaleString('tr-TR')} ₺</span>
                      <span className="font-black font-mono text-emerald-600 dark:text-emerald-400 text-[12px]">
                        {(item.receivedQty * item.actualUnitCost).toLocaleString('tr-TR')} ₺
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Özet & Feedback */}
            {mkItems.length > 0 && (
              <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-[10px] text-text-muted uppercase tracking-wide font-bold">Toplam Kalem</p>
                    <p className="font-black text-text-primary">{mkItems.length} ürün · {mkTotalQty} adet</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-text-muted uppercase tracking-wide font-bold">Tahmini Maliyet</p>
                    <p className="font-black font-mono text-emerald-600 dark:text-emerald-400 text-sm">{mkTotalValue.toLocaleString('tr-TR')} ₺</p>
                  </div>
                </div>
              </div>
            )}

            {mkFeedback && (
              <div className={`p-3 rounded-2xl flex items-center gap-2 text-xs ${mkFeedback.startsWith('Hata') ? 'bg-danger-fill text-danger-text border border-danger-border' : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300'}`}>
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{mkFeedback}</span>
              </div>
            )}

          </div>
        )}

        {/* Modal Body */}
        {activeTab === 'po' && (
        <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5 text-xs">
          
          {/* Top Controls Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-4 bg-base-surface-2 rounded-2xl border border-border">
            
            {/* Threshold Selector */}
            <div>
              <label className="text-text-muted block text-[11px] mb-1 font-semibold">Kritik Stok Eşiği:</label>
              <div className="flex items-center space-x-1.5">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={criticalThreshold}
                  onChange={(e) => handleRefreshThreshold(parseInt(e.target.value) || 5)}
                  className="w-20 px-2.5 py-1.5 bg-base-surface border border-border rounded-xl font-bold font-mono text-center text-text-primary"
                />
                <span className="text-text-muted text-[11px]">adet altı</span>
              </div>
            </div>

            {/* Supplier Filter */}
            <div>
              <label className="text-text-muted block text-[11px] mb-1 font-semibold">Tedarikçi / Fabrika:</label>
              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-base-surface border border-border rounded-xl text-text-primary font-bold focus:border-blue-500"
              >
                <option value="TÜMÜ">🌟 TÜM TEDARİKÇİLER ({purchaseItems.length} Kalem)</option>
                {DEFAULT_SUPPLIERS.map(s => {
                  const count = purchaseItems.filter(i => i.supplierName === s).length;
                  return (
                    <option key={s} value={s}>
                      {s} ({count} Kalem)
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Order No & Date */}
            <div>
              <label className="text-text-muted block text-[11px] mb-1 font-semibold">Talep No / Tarih:</label>
              <div className="font-mono font-bold text-text-primary bg-base-surface px-2.5 py-1.5 rounded-xl border border-border">
                #{orderNumber} ({orderDate})
              </div>
            </div>

            {/* Summary metrics */}
            <div>
              <label className="text-text-muted block text-[11px] mb-1 font-semibold">Toplam Sipariş / Tutar:</label>
              <div className="font-mono font-black text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2.5 py-1.5 rounded-xl border border-blue-500/20 text-sm">
                {displayedItems.length} Kalem / ~{totalEstimatedCost.toLocaleString('tr-TR')} ₺
              </div>
            </div>

          </div>

          {/* Printable Document Container */}
          <div id="purchase-order-printable-doc" className="bg-base-surface rounded-2xl border border-border p-5 shadow-xs space-y-4">
            
            {/* Header in Document */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border gap-3">
              <div>
                <div className="text-base sm:text-lg font-black text-text-primary tracking-tight">
                  {company.companyName}
                </div>
                <div className="text-[11px] text-text-muted">
                  {company.address} {company.district} / {company.city} | Tel: {company.phone}
                </div>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-sm font-extrabold text-blue-600 dark:text-blue-400 font-mono">
                  SATIN ALMA SİPARİŞ FORMU
                </div>
                <div className="text-[11px] text-text-muted font-mono">
                  Belge No: #{orderNumber} | Tarih: {orderDate}
                </div>
              </div>
            </div>

            {/* Target Supplier Information */}
            <div className="p-3 bg-base-surface-2 rounded-xl border border-border flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-blue-500 shrink-0" />
                <span>
                  <strong className="text-text-primary">Tedarikçi Firma:</strong>{' '}
                  <span className="text-blue-600 dark:text-blue-400 font-bold">{selectedSupplier}</span>
                </span>
              </div>
              <span className="text-text-muted text-[11px]">
                Teslimat Deposu: Merkez Depo (İmes)
              </span>
            </div>

            {/* Items Table */}
            {displayedItems.length === 0 ? (
              <div className="p-8 text-center text-text-muted space-y-2">
                <Package className="w-8 h-8 mx-auto opacity-30" />
                <p>Seçili kriterde kritik seviyede ürün bulunamadı. Stoklarınız güvende!</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-base-surface-2 text-text-muted uppercase text-[10px] border-b border-border">
                    <tr>
                      <th className="p-2.5 w-10 text-center">#</th>
                      <th className="p-2.5">Stok Kodu & Ürün</th>
                      <th className="p-2.5">Kategori</th>
                      <th className="p-2.5 text-center">Mevcut Stok</th>
                      <th className="p-2.5 text-center font-bold text-blue-600 dark:text-blue-400">Sipariş Miktarı</th>
                      <th className="p-2.5 text-right">Tahmini Birim</th>
                      <th className="p-2.5 text-right">Toplam Tutar</th>
                      <th className="p-2.5 print:hidden text-center">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {displayedItems.map((item, idx) => (
                      <tr key={item.productId} className="hover:bg-base-surface-2 transition-colors">
                        <td className="p-2.5 text-center font-mono text-text-muted">{idx + 1}</td>
                        <td className="p-2.5">
                          <div className="font-bold text-text-primary">{item.name}</div>
                          <div className="text-[10px] text-text-muted font-mono">{item.sku}</div>
                        </td>
                        <td className="p-2.5 text-text-secondary truncate max-w-[120px]">{item.category}</td>
                        <td className="p-2.5 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 font-mono font-bold text-[10px] border border-red-500/20">
                            {item.currentStock} {item.unit}
                          </span>
                        </td>
                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <input
                              type="number"
                              min="1"
                              value={item.orderQuantity}
                              onChange={(e) => handleUpdateItemQty(item.productId, parseInt(e.target.value) || 1)}
                              className="w-16 text-center font-black font-mono px-1 py-1 bg-base-surface border border-blue-500/40 rounded-lg text-xs text-text-primary"
                            />
                            <span className="text-[10px] text-text-muted font-medium">{item.unit}</span>
                          </div>
                        </td>
                        <td className="p-2.5 text-right font-mono text-text-secondary">
                          {item.estimatedUnitPrice.toLocaleString('tr-TR')} ₺
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                          {(item.orderQuantity * item.estimatedUnitPrice).toLocaleString('tr-TR')} ₺
                        </td>
                        <td className="p-2.5 print:hidden text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.productId)}
                            className="p-1 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Listeden çıkar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-base-surface-2 font-bold text-xs border-t border-border">
                    <tr>
                      <td colSpan={4} className="p-2.5 text-right">Genel Toplam:</td>
                      <td className="p-2.5 text-center font-mono text-blue-600 dark:text-blue-400">
                        {totalItemCount} Adet
                      </td>
                      <td className="p-2.5"></td>
                      <td className="p-2.5 text-right font-mono font-black text-blue-600 dark:text-blue-400 text-sm">
                        {totalEstimatedCost.toLocaleString('tr-TR')} ₺
                      </td>
                      <td className="print:hidden"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Document Signature Footers */}
            <div className="pt-4 border-t border-border grid grid-cols-2 text-center text-[10px] text-text-muted">
              <div>
                <strong>Siparişi Veren (ALPHA TEKNİK)</strong>
                <div className="h-10 mt-1 flex items-center justify-center">Kaşe & İmza</div>
              </div>
              <div>
                <strong>Tedarikçi Onayı & Sevk Tarihi</strong>
                <div className="h-10 mt-1 flex items-center justify-center">Teslim Onayı</div>
              </div>
            </div>

          </div>

          {/* Feedback */}
          {feedback && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded-2xl flex items-center space-x-2 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{feedback}</span>
            </div>
          )}

        </div>
        )} {/* end activeTab === 'po' */}

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-border bg-base-surface-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          {activeTab === 'po' ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={handlePrint} className="px-3.5 py-2 rounded-xl bg-base-surface hover:bg-base-surface-2 text-text-primary border border-border font-bold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer">
                  <Printer className="w-3.5 h-3.5" /><span>Resmi PDF Yazdır</span>
                </button>
                <button type="button" onClick={handleExportCSV} className="px-3.5 py-2 rounded-xl bg-base-surface hover:bg-base-surface-2 text-text-primary border border-border font-bold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" /><span>Excel / CSV İndir</span>
                </button>
                <button type="button" onClick={handleWhatsAppSend} className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer">
                  <Send className="w-3.5 h-3.5" /><span>WhatsApp ile Gönder</span>
                </button>
              </div>
              <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-text-secondary hover:text-text-primary transition-colors cursor-pointer">Kapat</button>
                <button type="button" onClick={handleApplyRestockToInventory} disabled={isSubmitting || displayedItems.length === 0} className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs flex items-center space-x-2 shadow-md transition-all cursor-pointer disabled:opacity-50">
                  {isSubmitting ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /><span>İşleniyor...</span></> : <><CheckCircle2 className="w-3.5 h-3.5" /><span>Depo Stoğuna Ekle</span></>}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                {mkItems.length > 0
                  ? <span><strong className="text-text-primary">{mkItems.length} kalem</strong> · {mkTotalQty} adet · <strong className="text-emerald-600">{mkTotalValue.toLocaleString('tr-TR')} ₺</strong></span>
                  : <span>Listeden ürün seçin ve stoka işleyin</span>
                }
              </div>
              <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-text-secondary hover:text-text-primary transition-colors cursor-pointer">Kapat</button>
                <button
                  type="button"
                  onClick={handleMalKabulApply}
                  disabled={mkSubmitting || mkItems.length === 0}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center space-x-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {mkSubmitting
                    ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /><span>Stoka İşleniyor...</span></>
                    : <><PackageCheck className="w-3.5 h-3.5" /><span>Malları Stoka İşle ({mkItems.length})</span></>
                  }
                </button>
              </div>
            </>
          )}
        </div>

      </div>
      </div>
    </div>
  );
}
