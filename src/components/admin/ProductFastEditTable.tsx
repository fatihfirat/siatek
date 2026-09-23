import React, { useState, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';
import { bulkUpdateProductsInFirestore, resetProductsToCatalogInFirestore } from '../../lib/firestoreService';
import { Product } from '../../types';
import { 
  Search, 
  Filter, 
  Save, 
  RotateCcw, 
  Percent, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  AlertTriangle, 
  DollarSign, 
  Package, 
  Barcode, 
  Layers, 
  TrendingUp, 
  TrendingDown,
  Sparkles,
  CheckCircle2,
  X,
  Printer,
  Tag,
  QrCode,
  Camera
} from 'lucide-react';
import { playNotificationSound } from '../../lib/audio';
import { searchProductsWithFuzzy } from '../../lib/searchUtils';
import HighlightText from '../common/HighlightText';
import BarcodeGeneratorModal from './BarcodeGeneratorModal';
import CameraBarcodeScannerModal from './CameraBarcodeScannerModal';
import { useModalBehavior } from '../../hooks/useModalBehavior';

interface ProductFastEditTableProps {
  products: Product[];
  onRefresh: () => void;
  onOpenAddModal: () => void;
  onEditProduct: (product: Product) => void;
  initialFilterLowStock?: boolean;
}

export default function ProductFastEditTable({
  products = [],
  onRefresh,
  onOpenAddModal,
  onEditProduct,
  initialFilterLowStock = false,
}: ProductFastEditTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(5);
  const [filterLowStockOnly, setFilterLowStockOnly] = useState<boolean>(initialFilterLowStock);
  
  // Local pending changes: { [productId]: { price?: number, wholesalePrice?: number, stock?: number } }
  const [pendingChanges, setPendingChanges] = useState<Record<string, Partial<Product>>>({});

  // Row selection for batch actions like barcode generation
  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({});

  // Barcode Generator Modal State
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [barcodeSelectedProductIds, setBarcodeSelectedProductIds] = useState<string[]>([]);
  
  // Camera Barcode Scanner Modal State
  const [showCameraScannerModal, setShowCameraScannerModal] = useState(false);

  // QR Popover state
  const [openQrId, setOpenQrId] = useState<string | null>(null);
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});

  const generateQr = useCallback(async (id: string, code: string) => {
    if (qrDataUrls[id]) return;
    try {
      const url = await QRCode.toDataURL(code, { width: 140, margin: 1, color: { dark: '#0b0b0b', light: '#ffffff' } });
      setQrDataUrls(prev => ({ ...prev, [id]: url }));
    } catch {}
  }, [qrDataUrls]);

  useEffect(() => {
    if (!openQrId) return;
    const handleOutside = (e: MouseEvent) => {
      const el = document.getElementById(`qr-pop-${openQrId}`);
      if (el && !el.contains(e.target as Node)) setOpenQrId(null);
    };
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenQrId(null); };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [openQrId]);
  
  // Confirmation Modal State ("Önce Sor" popup)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    impactSummary?: string[];
    onConfirm: () => Promise<void>;
    actionType: 'batch-save' | 'percent-adjust' | 'reset-catalog' | 'delete-product' | 'batch-restock';
  } | null>(null);

  // Bulk percentage adjust tool state
  const [showPercentModal, setShowPercentModal] = useState(false);
  const [percentCategory, setPercentCategory] = useState('ALL');
  const [percentValue, setPercentValue] = useState<number>(10);
  const [applyToWholesale, setApplyToWholesale] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  useModalBehavior(showPercentModal, () => setShowPercentModal(false));
  useModalBehavior(!!confirmModal?.isOpen, () => setConfirmModal(null));

  const safeProducts = Array.isArray(products) ? products : [];

  const categories = ['ALL', ...Array.from(new Set(safeProducts.map(p => p.category)))];

  const totalLowStockCount = safeProducts.filter(p => p && p.stock <= lowStockThreshold).length;

  const filteredProducts = React.useMemo(() => {
    let result = safeProducts;
    if (filterLowStockOnly) {
      result = result.filter(p => p && p.stock <= lowStockThreshold);
    }
    const searchRes = searchProductsWithFuzzy(result, searchTerm.trim(), {
      category: selectedCategory === 'ALL' ? undefined : selectedCategory,
    });
    return searchRes.map(r => r.product);
  }, [safeProducts, searchTerm, selectedCategory, filterLowStockOnly, lowStockThreshold]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedProducts = filteredProducts.slice((safePage - 1) * pageSize, safePage * pageSize);

  const pendingCount = Object.keys(pendingChanges).length;

  const handleFieldChange = (productId: string, field: 'price' | 'wholesalePrice' | 'stock', value: number) => {
    setPendingChanges(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value,
      }
    }));
  };

  const handleQuickRestockRow = (productId: string, currentStock: number, addQty: number) => {
    const newStock = Math.max(0, currentStock + addQty);
    handleFieldChange(productId, 'stock', newStock);
  };

  const promptBatchRestock = (addQty: number) => {
    const targets = filteredProducts.filter(p => p.stock <= lowStockThreshold);
    if (targets.length === 0) return;

    setConfirmModal({
      isOpen: true,
      title: `Kritik Stoklu Ürünlere Toplu İkmal (+${addQty} Adet)`,
      description: `Eşik değeri (≤ ${lowStockThreshold}) altındaki toplam ${targets.length} adet ürüne +${addQty} adet stok eklenecektir. Değişiklikleri listeye uygulamak istiyor musunuz?`,
      impactSummary: targets.slice(0, 6).map(p => `${p.name} (Mevcut: ${p.stock} ➔ ${p.stock + addQty} ${p.unit})`).concat(targets.length > 6 ? [`...ve ${targets.length - 6} ürün daha`] : []),
      actionType: 'batch-restock',
      onConfirm: async () => {
        targets.forEach(p => {
          handleFieldChange(p.id, 'stock', p.stock + addQty);
        });
        setFeedbackMsg(`${targets.length} adet ürüne +${addQty} adet stok eklendi. Değişiklikleri kalıcı yapmak için 'Kaydet' butonuna basınız.`);
        setConfirmModal(null);
      }
    });
  };

  // Prompt before saving pending row edits
  const promptBatchSave = () => {
    const changesCount = Object.keys(pendingChanges).length;
    if (changesCount === 0) return;

    const changedNames = Object.keys(pendingChanges).map(id => {
      const prod = products.find(p => p.id === id);
      return prod ? `${prod.name} (${prod.sku})` : id;
    });

    setConfirmModal({
      isOpen: true,
      title: 'Fiyat ve Stok Değişikliklerini Onaylayın',
      description: `Toplam ${changesCount} adet ürünün yeni fiyat ve stok bilgisi güncellenecektir. Devam etmek istiyor musunuz?`,
      impactSummary: changedNames.slice(0, 5).concat(changesCount > 5 ? [`...ve ${changesCount - 5} ürün daha`] : []),
      actionType: 'batch-save',
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          const updates = Object.keys(pendingChanges).map((id) => {
            const data = pendingChanges[id];
            return {
              id,
              price: data?.price,
              wholesalePrice: data?.wholesalePrice,
              stock: data?.stock,
            };
          });

          // Firestore'a yaz. Eskiden olu /api/products/bulk-update cagriliyordu;
          // res.ok true donuyordu, bu yuzden setPendingChanges({}) ile kullanicinin
          // girdigi degisiklikler EKRANDAN SILINIYOR ve "basariyla guncellendi"
          // yaziliyordu. Veri hem kaydedilmemis hem kaybolmus oluyordu. (19.09.2026)
          await bulkUpdateProductsInFirestore(updates as any);

          setPendingChanges({});
          playNotificationSound('success');
          setFeedbackMsg(`${updates.length} ürün başarıyla güncellendi.`);
          onRefresh();
        } catch (e) {
          console.error('Toplu ürün güncelleme hatası:', e);
          setFeedbackMsg('Güncelleme kaydedilemedi. Değişiklikleriniz korundu.');
        } finally {
          setIsProcessing(false);
          setConfirmModal(null);
        }
      }
    });
  };

  // Prompt before applying percentage price adjustment
  const promptPercentageAdjust = () => {
    const affected = products.filter(p => percentCategory === 'ALL' || p.category === percentCategory);
    
    setConfirmModal({
      isOpen: true,
      title: `Toplu Fiyat Güncellemesi (%${percentValue > 0 ? '+' : ''}${percentValue})`,
      description: `${percentCategory === 'ALL' ? 'Tüm katalogdaki' : `"${percentCategory}" kategorisindeki`} ${affected.length} adet ürünün fiyatı %${percentValue} oranında ${percentValue > 0 ? 'artırılacaktır' : 'düşürülecektir'}.`,
      impactSummary: [
        `Etkilenecek Ürün Sayısı: ${affected.length} adet`,
        `Kategori: ${percentCategory === 'ALL' ? 'Tüm Kategoriler' : percentCategory}`,
        `Bayi/Toptan Fiyatı da Güncellensin: ${applyToWholesale ? 'Evet' : 'Hayır'}`
      ],
      actionType: 'percent-adjust',
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          // Yuzdeyi istemcide hesaplayip Firestore'a toplu yaz.
          const oran = 1 + (Number(percentValue) || 0) / 100;
          const guncellemeler = affected.map(p => {
            const satir: any = {
              id: p.id,
              price: Math.round((Number(p.price) || 0) * oran * 100) / 100,
            };
            if (applyToWholesale && p.wholesalePrice != null) {
              satir.wholesalePrice = Math.round((Number(p.wholesalePrice) || 0) * oran * 100) / 100;
            }
            return satir;
          });
          await bulkUpdateProductsInFirestore(guncellemeler);

          playNotificationSound('success');
          setShowPercentModal(false);
          setFeedbackMsg(`${guncellemeler.length} ürünün fiyatı %${percentValue} güncellendi.`);
          onRefresh();
        } catch (e) {
          console.error('Toplu fiyat güncelleme hatası:', e);
          setFeedbackMsg('Fiyat güncellemesi kaydedilemedi.');
        } finally {
          setIsProcessing(false);
          setConfirmModal(null);
        }
      }
    });
  };

  // Prompt before resetting to original stok.pdf catalog
  const promptResetCatalog = () => {
    setConfirmModal({
      isOpen: true,
      title: 'stok.pdf Fabrika Listesine Sıfırla',
      description: 'Mevcut tüm ürün fiyatları, stokları ve tanımları stok.pdf belgesindeki orijinal değerlere döndürülecektir. Yapılan özelleştirmeler silinecektir.',
      impactSummary: [
        'Tüm ürün fiyatları stok.pdf listesine geri dönecek',
        'Stok miktarları ve birimler fabrika ayarlarına sıfırlanacak'
      ],
      actionType: 'reset-catalog',
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          // 'products' koleksiyonundaki tum override dokumanlarini sil;
          // statik stok.pdf katalogu zaten kaynak oldugu icin bu sifirlamadir.
          await resetProductsToCatalogInFirestore();

          setPendingChanges({});
          playNotificationSound('success');
          setFeedbackMsg('Katalog stok.pdf fabrika ayarlarına sıfırlandı.');
          onRefresh();
        } catch (e) {
          console.error('Katalog sıfırlama hatası:', e);
          setFeedbackMsg('Katalog sıfırlanamadı.');
        } finally {
          setIsProcessing(false);
          setConfirmModal(null);
        }
      }
    });
  };

  return (
    <div className="space-y-4">
      
      {/* 1. TOP CONTROL & SEARCH TOOLBAR */}
      <div className="bg-base-surface p-3.5 sm:p-4 rounded-2xl border border-border shadow-xs space-y-3">
        
        {/* Row 1: Search, Scan Trigger & Category Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          
          {/* Integrated Search with Quick Camera Scan Button */}
          <div className="sm:col-span-8 relative flex items-center">
            <Search className="w-4 h-4 absolute left-3 text-text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Ürün adı, ST kodu, barkod veya kategori ara..."
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-20 py-2.5 bg-base-surface-2 border border-border rounded-xl text-xs sm:text-sm text-text-primary placeholder:text-text-muted focus:border-border-strong transition-colors"
            />
            <div className="absolute right-1.5 flex items-center space-x-1">
              {searchTerm && (
                <button 
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setCurrentPage(1);
                  }}
                  className="p-1 text-text-muted hover:text-text-primary rounded-lg"
                  title="Aramayı Temizle"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowCameraScannerModal(true)}
                className="p-1.5 bg-info-fill/15 hover:bg-info-fill/25 text-info-text border border-info-border rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                title="Kamera ile canlı barkod tara"
              >
                <Camera className="w-3.5 h-3.5" />
                <span className="text-[11px] hidden xs:inline font-semibold">Tara</span>
              </button>
            </div>
          </div>

          {/* Category Selector */}
          <div className="sm:col-span-4 relative">
            <select
              value={selectedCategory}
              onChange={e => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2.5 bg-base-surface-2 border border-border rounded-xl text-xs font-semibold text-text-primary focus:border-border-strong cursor-pointer"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'ALL' ? 'Tüm Kategoriler' : cat}
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* Row 2: Responsive Action Strip & Low Stock Filter */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/60">
          
          {/* Left: Primary & Filter Controls */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            
            {/* Add Product Button */}
            <button
              type="button"
              onClick={onOpenAddModal}
              className="flex items-center space-x-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-success-fill hover:opacity-90 text-base rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Yeni Ürün</span>
            </button>

            {/* Low Stock Alarm Pill & Threshold */}
            <div className="flex items-center rounded-xl border border-border bg-base-surface-2 overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => {
                  setFilterLowStockOnly(prev => !prev);
                  setCurrentPage(1);
                }}
                className={`flex items-center space-x-1.5 px-2.5 py-1.5 sm:py-2 font-bold transition-all cursor-pointer ${
                  filterLowStockOnly
                    ? 'bg-danger-fill text-base'
                    : totalLowStockCount > 0
                    ? 'bg-bg-danger text-danger-text'
                    : 'text-text-secondary hover:bg-base-surface'
                }`}
                title="Kritik stok eşiği altındaki ürünleri filtrele"
              >
                <AlertTriangle className={`w-3.5 h-3.5 ${totalLowStockCount > 0 ? 'text-danger-text animate-pulse' : ''}`} />
                <span>Kritik Stok ({totalLowStockCount})</span>
              </button>
              
              <div className="h-4 w-px bg-border"></div>

              <select
                value={lowStockThreshold}
                onChange={e => {
                  setLowStockThreshold(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-transparent px-2 py-1 font-bold text-text-primary text-[11px] cursor-pointer"
                title="Kritik Stok Eşik Adedi"
              >
                <option value={3}>≤ 3 Adet</option>
                <option value={5}>≤ 5 Adet</option>
                <option value={10}>≤ 10 Adet</option>
                <option value={15}>≤ 15 Adet</option>
                <option value={20}>≤ 20 Adet</option>
                <option value={50}>≤ 50 Adet</option>
              </select>
            </div>

            {/* Quick Batch Restock if low stock exists */}
            {totalLowStockCount > 0 && (
              <button
                type="button"
                onClick={() => promptBatchRestock(50)}
                className="hidden sm:flex items-center space-x-1 px-2.5 py-1.5 bg-base-surface-2 hover:bg-bg-warning/20 text-warning-text border border-warning-border rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                title="Kritik eşik altındaki tüm ürünlere +50 adet stok ekle"
              >
                <Sparkles className="w-3 h-3 text-warning-text" />
                <span>+50 İkmal</span>
              </button>
            )}

          </div>

          {/* Right: Secondary Tools Ribbon */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
            
            {/* Barcode & Shelf Label Generator Tool */}
            <button
              type="button"
              onClick={() => {
                const checkedIds = Object.keys(selectedRowIds).filter(id => selectedRowIds[id]);
                setBarcodeSelectedProductIds(checkedIds);
                setShowBarcodeModal(true);
              }}
              className="flex items-center space-x-1 px-2.5 py-1.5 bg-base-surface-2 hover:bg-base-surface text-text-primary rounded-xl text-xs font-semibold border border-border transition-colors cursor-pointer shrink-0 shadow-2xs"
              title="Stoklar için Code-128 / QR Barkod ve Raf Etiketi Masası"
            >
              <Barcode className="w-3.5 h-3.5 text-text-secondary" />
              <span>
                {Object.values(selectedRowIds).filter(Boolean).length > 0
                  ? `Barkod Bas (${Object.values(selectedRowIds).filter(Boolean).length})`
                  : 'Barkod Bas'}
              </span>
            </button>

            {/* Percent Adjustment Tool */}
            <button
              type="button"
              onClick={() => setShowPercentModal(true)}
              className="flex items-center space-x-1 px-2.5 py-1.5 bg-base-surface-2 hover:bg-base-surface text-text-primary rounded-xl text-xs font-semibold border border-border transition-colors cursor-pointer shrink-0 shadow-2xs"
              title="Kategori bazında veya tüm listede toplu % artış / indirim uygula"
            >
              <Percent className="w-3.5 h-3.5 text-warning-text" />
              <span>Toplu Fiyat (%)</span>
            </button>

            {/* Reset to stok.pdf */}
            <button
              type="button"
              onClick={promptResetCatalog}
              className="flex items-center space-x-1 px-2.5 py-1.5 bg-base-surface-2 hover:bg-base-surface text-text-muted hover:text-text-primary rounded-xl text-xs font-medium border border-border transition-colors cursor-pointer shrink-0"
              title="stok.pdf orijinal fabrika değerlerine sıfırla"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Fabrika Sıfırla</span>
            </button>

          </div>

        </div>

      </div>

      {/* 2. FEEDBACK & FLOATING SAVE BANNER */}
      {feedbackMsg && (
        <div className="p-3 bg-bg-success border border-success-border text-success-text rounded-xl text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-success-text shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
          <button onClick={() => setFeedbackMsg('')} className="text-success-text font-bold hover:underline cursor-pointer">
            Kapat
          </button>
        </div>
      )}

      {/* Floating / Sticky Pending Save Bar */}
      {pendingCount > 0 && (
        <div className="sticky top-2 z-30 p-3 bg-warning-fill text-base rounded-2xl shadow-lg border border-warning-border flex flex-col sm:flex-row items-center justify-between gap-2.5 animate-in slide-in-from-top-2">
          <div className="flex items-center space-x-2 text-xs font-black">
            <Save className="w-4 h-4 shrink-0 animate-bounce" />
            <span>{pendingCount} adet üründe kaydedilmeyi bekleyen düzenleme var!</span>
          </div>
          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => setPendingChanges({})}
              className="px-3 py-1.5 rounded-xl bg-black/20 hover:bg-black/30 text-base text-xs font-semibold transition-colors cursor-pointer"
            >
              İptal Et
            </button>
            <button
              type="button"
              onClick={promptBatchSave}
              className="px-4 py-1.5 rounded-xl bg-base-surface text-text-primary hover:opacity-95 text-xs font-black shadow-md transition-transform active:scale-95 cursor-pointer flex items-center space-x-1.5"
            >
              <Check className="w-4 h-4 text-success-text" />
              <span>Değişiklikleri Kaydet & Onayla</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. INFORMATIVE COUNT BAR */}
      <div className="flex items-center justify-between text-xs text-text-muted px-1">
        <div className="flex items-center space-x-2">
          <span>Listelenen: <strong>{filteredProducts.length}</strong> / Toplam: <strong>{products.length}</strong></span>
          {filterLowStockOnly && (
            <span className="text-[11px] font-bold text-danger-text bg-bg-danger px-2 py-0.5 rounded-full border border-danger-border">
              Kritik Stok Filtresi Aktif
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2 text-[11px]">
          <span className="hidden sm:inline text-text-muted">Sayfa Başına:</span>
          <select
            value={pageSize}
            onChange={e => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2 py-1 bg-base-surface border border-border rounded-lg font-medium text-text-primary cursor-pointer"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={250}>250</option>
          </select>
        </div>
      </div>

      {/* 4. MOBILE CARD VIEW (Phone / Small screens) */}
      <div className="block md:hidden space-y-2.5">
        {filteredProducts.length === 0 ? (
          <div className="p-8 bg-base-surface rounded-2xl border border-border text-center text-text-muted text-xs space-y-3">
            <Package className="w-10 h-10 mx-auto text-text-muted opacity-40" />
            <div>
              <p className="font-semibold text-text-primary text-sm">Aranan kriterlere uygun ürün bulunamadı.</p>
              <p className="text-text-muted text-xs mt-1">Arama terimini kontrol edin, filtreleri sıfırlayın veya yeni ürün ekleyin.</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              {(searchTerm || filterLowStockOnly || selectedCategory !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('ALL');
                    setFilterLowStockOnly(false);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1.5 bg-base-surface-2 hover:bg-base-surface text-text-primary rounded-xl border border-border text-xs font-semibold transition-colors cursor-pointer"
                >
                  Filtreleri Temizle
                </button>
              )}
              <button
                type="button"
                onClick={onOpenAddModal}
                className="px-3 py-1.5 bg-success-fill hover:opacity-90 text-base rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Yeni Ürün Ekle
              </button>
            </div>
          </div>
        ) : (
          paginatedProducts.map(product => {
            const hasPending = pendingChanges[product.id];
            const currentPrice = hasPending?.price !== undefined ? hasPending.price : product.price;
            const currentWholesale = hasPending?.wholesalePrice !== undefined ? hasPending.wholesalePrice : (product.wholesalePrice || 0);
            const currentStock = hasPending?.stock !== undefined ? hasPending.stock : product.stock;
            const isLow = currentStock <= lowStockThreshold;
            const isRowChecked = Boolean(selectedRowIds[product.id]);

            return (
              <div
                key={product.id}
                className={`p-3.5 rounded-2xl border transition-all ${
                  isRowChecked
                    ? 'bg-base-surface-2 border-border-strong shadow-xs'
                    : hasPending
                    ? 'bg-bg-warning/30 border-warning-border'
                    : isLow
                    ? 'bg-bg-danger/20 border-danger-border'
                    : 'bg-base-surface border-border'
                }`}
              >
                {/* Header: Checkbox + Title + Low Stock */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start space-x-1 flex-1 min-w-0">
                    <label className="min-w-[44px] min-h-[44px] -ml-2 -mt-2 flex items-center justify-center cursor-pointer select-none touch-manipulation">
                      <input
                        type="checkbox"
                        checked={isRowChecked}
                        onChange={e => {
                          const isCheck = e.target.checked;
                          setSelectedRowIds(prev => {
                            const copy = { ...prev };
                            if (isCheck) copy[product.id] = true;
                            else delete copy[product.id];
                            return copy;
                          });
                        }}
                        className="w-5 h-5 rounded cursor-pointer text-success-fill"
                      />
                    </label>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <h4 className="font-bold text-text-primary text-xs leading-snug break-words">
                        {product.name}
                      </h4>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px]">
                        <span className="font-mono bg-base-surface-2 px-1.5 py-0.5 rounded border border-border text-text-secondary font-bold">
                          {product.sku}
                        </span>
                        {product.barcode && (
                          <div id={`qr-pop-mob-${product.id}`} className="relative inline-flex">
                            <button
                              type="button"
                              onClick={() => {
                                generateQr(product.id, product.barcode!);
                                setOpenQrId(openQrId === `mob-${product.id}` ? null : `mob-${product.id}`);
                              }}
                              title="QR Kodu Görüntüle"
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-mono transition-colors cursor-pointer ${
                                openQrId === `mob-${product.id}`
                                  ? 'bg-base-surface border-info-border text-info-text'
                                  : 'bg-base-surface-2 border-border text-text-muted hover:border-info-border hover:text-info-text'
                              }`}
                            >
                              <QrCode className="w-2.5 h-2.5 shrink-0" />
                              <span className="max-w-[72px] truncate">{product.barcode}</span>
                            </button>
                            {openQrId === `mob-${product.id}` && (
                              <div className="absolute left-0 top-full mt-1.5 z-[9999] bg-white dark:bg-[#1a1a19] border border-border rounded-xl shadow-2xl p-3 w-[168px] animate-in fade-in zoom-in-95 duration-100">
                                {qrDataUrls[product.id] ? (
                                  <>
                                    <img src={qrDataUrls[product.id]} alt="QR Kod" className="w-full rounded-lg" style={{imageRendering:'pixelated'}} />
                                    <div className="mt-2 text-center font-mono text-[9px] text-gray-500 break-all leading-tight">{product.barcode}</div>
                                    <div className="mt-1 text-center font-bold text-[9px] text-gray-400">{product.name.slice(0, 28)}</div>
                                  </>
                                ) : (
                                  <div className="w-full h-[140px] flex items-center justify-center">
                                    <div className="w-5 h-5 border-2 border-info-border border-t-info-fill rounded-full animate-spin" />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        <span className="px-1.5 py-0.5 rounded bg-base-surface-2 text-text-muted border border-border">
                          {product.category}
                        </span>
                      </div>
                    </div>
                  </div>

                  {isLow && (
                    <span className="shrink-0 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-bg-danger text-danger-text border border-danger-border flex items-center space-x-1 animate-pulse">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Kritik</span>
                    </span>
                  )}
                </div>

                {/* Mobile Quick Inputs: Fiyat & Stok Stepper */}
                <div className="grid grid-cols-2 gap-2.5 mt-3 pt-2.5 border-t border-border/60">
                  
                  {/* Price input */}
                  <div className="min-w-0">
                    <label className="block text-[10px] font-bold text-text-muted mb-1">
                      Satış Fiyatı (₺)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        value={currentPrice}
                        onChange={e => handleFieldChange(product.id, 'price', parseFloat(e.target.value) || 0)}
                        className={`w-full min-w-0 min-h-[44px] px-3 py-2.5 rounded-xl border font-mono font-bold text-sm text-right [appearance:textfield] transition-colors ${
                          hasPending?.price !== undefined
                            ? 'bg-base-surface border-warning-border text-warning-text'
                            : 'bg-base-surface-2 border-border text-text-primary'
                        }`}
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-xs font-bold">₺</span>
                    </div>
                  </div>

                  {/* Stock input & Stepper */}
                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-1 min-w-0 text-[10px] font-bold text-text-muted mb-1">
                      <span className="truncate">Stok ({product.unit})</span>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleQuickRestockRow(product.id, currentStock, 10)}
                          className="min-h-[28px] px-2 py-0.5 bg-base-surface-2 hover:bg-bg-success text-[10px] font-bold rounded-lg border border-border text-text-secondary cursor-pointer touch-manipulation"
                        >
                          +10
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickRestockRow(product.id, currentStock, 50)}
                          className="min-h-[28px] px-2 py-0.5 bg-base-surface-2 hover:bg-bg-success text-[10px] font-bold rounded-lg border border-border text-text-secondary cursor-pointer touch-manipulation"
                        >
                          +50
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => handleFieldChange(product.id, 'stock', Math.max(0, currentStock - 1))}
                        aria-label="Stok adedini 1 azalt"
                        className="w-11 h-11 shrink-0 min-w-[44px] min-h-[44px] rounded-xl bg-base-surface-2 border border-border flex items-center justify-center font-black text-text-primary text-base active:scale-95 transition-transform cursor-pointer touch-manipulation"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={currentStock}
                        onChange={e => handleFieldChange(product.id, 'stock', parseInt(e.target.value) || 0)}
                        aria-label="Stok adedi"
                        className={`flex-1 min-w-0 w-full min-h-[44px] text-center py-2 rounded-xl border font-mono font-bold text-sm [appearance:textfield] transition-colors ${
                          hasPending?.stock !== undefined
                            ? 'bg-base-surface border-warning-border text-warning-text'
                            : isLow
                            ? 'bg-bg-danger border-danger-border text-danger-text'
                            : 'bg-base-surface-2 border-border text-text-primary'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => handleFieldChange(product.id, 'stock', currentStock + 1)}
                        aria-label="Stok adedini 1 artır"
                        className="w-11 h-11 shrink-0 min-w-[44px] min-h-[44px] rounded-xl bg-base-surface-2 border border-border flex items-center justify-center font-black text-text-primary text-base active:scale-95 transition-transform cursor-pointer touch-manipulation"
                      >
                        +
                      </button>
                    </div>
                  </div>

                </div>

                {/* Mobile Card Action Footer */}
                <div className="flex flex-wrap items-center justify-between gap-2 min-w-0 pt-3 mt-2.5 border-t border-border/40 text-xs">
                  <div className="min-w-0 truncate text-[10px] text-text-muted">
                    Bayi/Toptan: <strong className="font-mono text-text-secondary">{currentWholesale} ₺</strong>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setBarcodeSelectedProductIds([product.id]);
                        setShowBarcodeModal(true);
                      }}
                      className="min-h-[44px] px-3.5 py-2 bg-base-surface-2 hover:bg-base-surface text-text-primary rounded-xl border border-border text-xs font-semibold flex items-center space-x-1.5 cursor-pointer touch-manipulation"
                    >
                      <Barcode className="w-4 h-4 text-text-secondary" />
                      <span>Barkod</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditProduct(product)}
                      className="min-h-[44px] px-3.5 py-2 bg-base-surface-2 hover:bg-base-surface text-text-primary rounded-xl border border-border text-xs font-semibold flex items-center space-x-1.5 cursor-pointer touch-manipulation"
                    >
                      <Edit3 className="w-4 h-4 text-text-secondary" />
                      <span>Düzenle</span>
                    </button>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* 5. DESKTOP TABLE VIEW (Tablets & Desktop screens) */}
      <div className="hidden md:block bg-base-surface rounded-2xl border border-border/80 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-base-surface-2/80 text-text-secondary uppercase font-bold text-[10px] tracking-[0.08em] border-b border-border">
              <tr>
                <th className="py-1 px-2 w-10 text-center">
                  <label className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center cursor-pointer touch-manipulation">
                    <input
                      type="checkbox"
                      checked={
                        paginatedProducts.length > 0 &&
                        paginatedProducts.every(p => selectedRowIds[p.id])
                      }
                      onChange={(e) => {
                        const isCheck = e.target.checked;
                        setSelectedRowIds(prev => {
                          const copy = { ...prev };
                          paginatedProducts.forEach(p => {
                            if (isCheck) copy[p.id] = true;
                            else delete copy[p.id];
                          });
                          return copy;
                        });
                      }}
                      className="w-4 h-4 rounded cursor-pointer text-success-fill"
                      title="Bu sayfadaki tümünü seç"
                    />
                  </label>
                </th>
                <th className="py-3 px-3 min-w-[200px]">Ürün Tanımı & Kodları</th>
                <th className="py-3 px-3 min-w-[140px]">Kategori & Grup</th>
                <th className="py-3 px-3 text-right min-w-[120px]">
                  <span>Satış Fiyatı (₺)</span>
                  <span className="block text-[9px] text-text-muted font-normal">Perakende</span>
                </th>
                <th className="py-3 px-3 text-right min-w-[120px]">
                  <span>Toptan / Bayi (₺)</span>
                  <span className="block text-[9px] text-text-muted font-normal">İskontolu</span>
                </th>
                <th className="py-3 px-3 text-center min-w-[110px]">Mevcut Stok</th>
                <th className="py-3 px-2 text-center w-16">Birim</th>
                <th className="py-3 px-3 text-center w-20">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-text-primary">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-text-muted">
                    <div className="max-w-md mx-auto space-y-3">
                      <Package className="w-12 h-12 mx-auto text-text-muted opacity-40" />
                      <div>
                        <p className="font-bold text-text-primary text-sm">Aranan kriterlere uygun ürün bulunamadı</p>
                        <p className="text-text-muted text-xs mt-1">
                          Arama teriminizi kontrol edin veya filtreleri sıfırlayarak tüm kataloğu listeleyin.
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-2 pt-2">
                        {(searchTerm || filterLowStockOnly || selectedCategory !== 'ALL') && (
                          <button
                            type="button"
                            onClick={() => {
                              setSearchTerm('');
                              setSelectedCategory('ALL');
                              setFilterLowStockOnly(false);
                              setCurrentPage(1);
                            }}
                            className="px-3 py-1.5 bg-base-surface-2 hover:bg-base-surface text-text-primary rounded-xl border border-border text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Filtreleri Temizle
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={onOpenAddModal}
                          className="px-3.5 py-1.5 bg-success-fill hover:opacity-90 text-base rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                        >
                          Yeni Ürün Ekle
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((product) => {
                  const hasPending = pendingChanges[product.id];
                  const currentPrice = hasPending?.price !== undefined ? hasPending.price : product.price;
                  const currentWholesale = hasPending?.wholesalePrice !== undefined ? hasPending.wholesalePrice : (product.wholesalePrice || 0);
                  const currentStock = hasPending?.stock !== undefined ? hasPending.stock : product.stock;
                  const isLow = currentStock <= lowStockThreshold;
                  const isRowChecked = Boolean(selectedRowIds[product.id]);

                  return (
                    <tr 
                      key={product.id} 
                      className={`group hover:bg-bg-success/20 transition-colors ${
                        isRowChecked
                          ? 'bg-bg-success/30 shadow-[inset_3px_0_0_var(--color-success-fill)]'
                          : hasPending
                          ? 'bg-bg-warning/30 shadow-[inset_3px_0_0_var(--color-warning-border)]'
                          : isLow
                          ? 'bg-bg-danger/20 hover:bg-bg-danger/30 shadow-[inset_3px_0_0_var(--color-danger-border)]'
                          : ''
                      }`}
                    >
                      {/* Row Checkbox */}
                      <td className="py-1 px-2 text-center">
                        <label className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center cursor-pointer touch-manipulation">
                          <input
                            type="checkbox"
                            checked={isRowChecked}
                            onChange={(e) => {
                              const isCheck = e.target.checked;
                              setSelectedRowIds(prev => {
                                const copy = { ...prev };
                                if (isCheck) copy[product.id] = true;
                                else delete copy[product.id];
                                return copy;
                              });
                            }}
                            className="w-4 h-4 rounded cursor-pointer text-success-fill"
                          />
                        </label>
                      </td>

                      {/* Product Name, SKU, Barcode */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center space-x-1.5">
                          {isLow && (
                            <span className="shrink-0 p-0.5 rounded bg-bg-danger text-danger-text" title={`Kritik Düşük Stok (≤ ${lowStockThreshold})`}>
                              <AlertTriangle className="w-3.5 h-3.5 text-danger-text animate-pulse" />
                            </span>
                          )}
                          <span className="font-extrabold text-[13px] leading-snug text-text-primary tracking-[-0.01em]">{product.name}</span>
                        </div>
                        <div className="flex items-center space-x-2 mt-0.5 text-[11px] text-text-muted">
                          <span className="font-mono tabular-nums text-[10px] font-semibold text-text-secondary">
                            {product.sku}
                          </span>
                          {product.barcode && (
                            <div id={`qr-pop-${product.id}`} className="relative inline-flex">
                              <button
                                type="button"
                                onClick={() => {
                                  const code = product.barcode!;
                                  generateQr(product.id, code);
                                  setOpenQrId(openQrId === product.id ? null : product.id);
                                }}
                                title="QR Kodu Görüntüle"
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono tabular-nums transition-colors cursor-pointer ${
                                  openQrId === product.id
                                    ? 'bg-base-surface text-info-text ring-1 ring-info-border'
                                    : 'text-text-muted hover:bg-base-surface-2 hover:text-info-text'
                                }`}
                              >
                                <QrCode className="w-2.5 h-2.5 shrink-0" />
                                <span className="max-w-[80px] truncate">{product.barcode}</span>
                              </button>
                              {openQrId === product.id && (
                                <div className="absolute left-0 bottom-full mb-1.5 z-[9999] bg-white dark:bg-[#1a1a19] border border-border rounded-xl shadow-2xl p-3 w-[168px] animate-in fade-in zoom-in-95 duration-100">
                                  {qrDataUrls[product.id] ? (
                                    <>
                                      <img src={qrDataUrls[product.id]} alt="QR Kod" className="w-full rounded-lg" style={{imageRendering:'pixelated'}} />
                                      <div className="mt-2 text-center font-mono text-[9px] text-gray-500 break-all leading-tight">{product.barcode}</div>
                                      <div className="mt-1 text-center font-bold text-[9px] text-gray-400">{product.name.slice(0, 28)}</div>
                                    </>
                                  ) : (
                                    <div className="w-full h-[140px] flex items-center justify-center">
                                      <div className="w-5 h-5 border-2 border-info-border border-t-info-fill rounded-full animate-spin" />
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                          {isLow && (
                            <span className="text-[9px] font-extrabold uppercase tracking-wide text-danger-text">
                              Kritik stok
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Category / SubCategory */}
                      <td className="py-2.5 px-3">
                        <span className="inline-block text-text-secondary font-bold text-[10px] uppercase tracking-wide">
                          {product.category}
                        </span>
                        {product.subCategory && (
                          <div className="text-[10px] text-text-muted mt-0.5">
                            {product.subCategory}
                          </div>
                        )}
                      </td>

                      {/* Price 1 (Perakende) Quick Edit */}
                      <td className="py-2.5 px-3 text-right">
                          <div className="relative inline-block w-28">
                          <input
                            type="number"
                            step="0.01"
                            value={currentPrice}
                            onChange={e => handleFieldChange(product.id, 'price', parseFloat(e.target.value) || 0)}
                            className={`w-full text-right px-2.5 py-2 rounded-lg border tabular-nums font-bold text-xs transition-all ${
                              hasPending?.price !== undefined
                                ? 'bg-base-surface border-warning-border text-warning-text shadow-xs'
                                : 'bg-transparent border-transparent text-text-primary hover:bg-base-surface-2 hover:border-border focus:bg-base-surface focus:border-success-border'
                            }`}
                          />
                        </div>
                      </td>

                      {/* Price 2 (Toptan) Quick Edit */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="relative inline-block w-28">
                          <input
                            type="number"
                            step="0.01"
                            value={currentWholesale}
                            onChange={e => handleFieldChange(product.id, 'wholesalePrice', parseFloat(e.target.value) || 0)}
                            className={`w-full text-right px-2.5 py-2 rounded-lg border tabular-nums font-semibold text-xs transition-all ${
                              hasPending?.wholesalePrice !== undefined
                                ? 'bg-base-surface border-warning-border text-warning-text shadow-xs'
                                : 'bg-transparent border-transparent text-text-secondary hover:bg-base-surface-2 hover:border-border focus:bg-base-surface focus:border-success-border'
                            }`}
                          />
                        </div>
                      </td>

                      {/* Stock Quick Edit & Quick Restock Tools */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <div className="relative inline-block w-18">
                            <input
                              type="number"
                              value={currentStock}
                              onChange={e => handleFieldChange(product.id, 'stock', parseInt(e.target.value) || 0)}
                              className={`w-full text-center px-1.5 py-2 rounded-lg border tabular-nums font-extrabold text-xs transition-all ${
                                hasPending?.stock !== undefined
                                  ? 'bg-base-surface border-warning-border text-warning-text shadow-xs ring-1 ring-warning-border'
                                  : isLow
                                  ? 'bg-bg-danger border-danger-border text-danger-text font-extrabold ring-1 ring-danger-border'
                                  : 'bg-transparent border-transparent text-text-primary hover:bg-base-surface-2 hover:border-border focus:bg-base-surface focus:border-success-border'
                              }`}
                            />
                          </div>

                          {/* Quick +10, +50 Restock Buttons */}
                          <div className="flex flex-col space-y-0.5">
                            <button
                              type="button"
                              onClick={() => handleQuickRestockRow(product.id, currentStock, 10)}
                              className="min-w-[34px] min-h-[24px] px-1.5 bg-transparent hover:bg-bg-success text-text-muted hover:text-success-text rounded-md text-[9px] font-bold border border-transparent hover:border-success-border transition-all active:scale-[0.98] cursor-pointer"
                              title="+10 Adet Ekle"
                            >
                              +10
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickRestockRow(product.id, currentStock, 50)}
                              className="min-w-[34px] min-h-[24px] px-1.5 bg-transparent hover:bg-bg-success text-text-muted hover:text-success-text rounded-md text-[9px] font-bold border border-transparent hover:border-success-border transition-all active:scale-[0.98] cursor-pointer"
                              title="+50 Adet Ekle"
                            >
                              +50
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Unit */}
                      <td className="py-2.5 px-2 text-center font-bold text-text-muted text-[10px] uppercase tracking-wide">
                        {product.unit}
                      </td>

                      {/* Action buttons */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => onEditProduct(product)}
                            className="w-11 h-11 min-w-[44px] min-h-[44px] text-text-muted hover:text-success-text rounded-xl hover:bg-bg-success flex items-center justify-center transition-all active:scale-[0.98] cursor-pointer touch-manipulation"
                            title="Tüm detayları düzenle"
                            aria-label="Ürünü düzenle"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. RESPONSIVE PAGINATION FOOTER */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-base-surface rounded-2xl border border-border text-xs">
          <div className="text-text-muted text-center sm:text-left">
            Sayfa <strong>{safePage}</strong> / <strong>{totalPages}</strong> (Toplam <strong>{filteredProducts.length}</strong> ürün)
          </div>

          <div className="flex items-center justify-center space-x-1">
            <button
              disabled={safePage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="px-3 py-1.5 rounded-lg font-semibold bg-base-surface-2 border border-border text-text-primary hover:bg-base-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              &larr; Önceki
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
              let pNum = safePage;
              if (totalPages <= 5) {
                pNum = idx + 1;
              } else if (safePage <= 3) {
                pNum = idx + 1;
              } else if (safePage >= totalPages - 2) {
                pNum = totalPages - 4 + idx;
              } else {
                pNum = safePage - 2 + idx;
              }

              return (
                <button
                  key={pNum}
                  onClick={() => setCurrentPage(pNum)}
                  className={`w-7 h-7 rounded-lg font-bold transition-colors cursor-pointer ${
                    safePage === pNum
                      ? 'bg-success-fill text-base shadow-xs'
                      : 'bg-base-surface-2 border border-border text-text-primary hover:bg-base-surface'
                  }`}
                >
                  {pNum}
                </button>
              );
            })}

            <button
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="px-3 py-1.5 rounded-lg font-semibold bg-base-surface-2 border border-border text-text-primary hover:bg-base-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Sonraki &rarr;
            </button>
          </div>
        </div>
      )}

      {/* MODAL 1: Bulk Percentage Markup/Discount Tool */}
      {showPercentModal && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md p-3 sm:p-4 md:p-6 animate-in fade-in"
          onClick={() => setShowPercentModal(false)}
        >
          <div className="min-h-full flex items-center justify-center py-4 sm:py-6">
            <div 
              className="bg-base-surface border border-border rounded-2xl w-full max-w-md p-6 text-text-primary shadow-2xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-xl bg-bg-warning text-warning-text border border-warning-border">
                    <Percent className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-text-primary">Toplu Fiyat Oranı Değiştir</h3>
                    <p className="text-xs text-text-muted">Seçilen kategoriye yüzdelik zam veya indirim uygulayın.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowPercentModal(false)}
                  className="p-1 text-text-muted hover:text-text-primary rounded-lg border border-border"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-text-secondary font-semibold mb-1">Hedef Kategori</label>
                  <select
                    value={percentCategory}
                    onChange={e => setPercentCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-base-surface-2 border border-border rounded-xl text-text-primary focus:border-border-strong cursor-pointer"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>
                        {cat === 'ALL' ? 'Tüm Kategoriler (Tüm Liste)' : cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-text-secondary font-semibold mb-1">
                    Yüzdelik Değişim Oranı (%) <span className="text-text-muted font-normal">(Pozitif: Zam, Negatif: İndirim)</span>
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      step="1"
                      value={percentValue}
                      onChange={e => setPercentValue(parseFloat(e.target.value) || 0)}
                      placeholder="Örn: 10 (+%10) veya -5 (-%5)"
                      className="w-full px-3 py-2 bg-base-surface-2 border border-border rounded-xl text-text-primary font-mono font-bold text-sm focus:border-border-strong"
                    />
                    <span className="text-sm font-black text-text-muted">%</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    {[-10, -5, 5, 10, 15, 20].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setPercentValue(val)}
                        className={`px-2 py-1 rounded-md text-[11px] font-bold border transition-colors cursor-pointer ${
                          percentValue === val
                            ? 'bg-warning-fill text-base border-warning-border'
                            : 'bg-base-surface-2 text-text-secondary border-border hover:bg-base-surface'
                        }`}
                      >
                        {val > 0 ? `+${val}%` : `${val}%`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center space-x-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={applyToWholesale}
                      onChange={e => setApplyToWholesale(e.target.checked)}
                      className="w-4 h-4 rounded text-warning-text focus:ring-warning-border"
                    />
                    <span className="text-text-secondary font-medium">Toptan / Bayi Fiyatlarına da Aynı Oranda Uygula</span>
                  </label>
                </div>

                <div className="p-3 bg-bg-warning rounded-xl border border-warning-border text-warning-text text-[11px] flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-warning-text shrink-0 mt-0.5" />
                  <span>
                    İşlemden önce onay ekranı ("Önce Sor") gösterilecek ve onayınız olmadan hiçbir fiyat güncellenmeyecektir.
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowPercentModal(false)}
                  className="px-4 py-2 bg-base-surface-2 hover:bg-base-surface text-text-primary rounded-xl text-xs font-semibold cursor-pointer border border-border"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={promptPercentageAdjust}
                  className="px-4 py-2 bg-warning-fill hover:opacity-90 text-base rounded-xl text-xs font-bold shadow-sm cursor-pointer flex items-center space-x-1.5"
                >
                  <span>Fiyat Değişimini İncele & Onayla</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Strict "Önce Sor" Confirmation Dialog */}
      {confirmModal && confirmModal.isOpen && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md p-3 sm:p-4 md:p-6 animate-in fade-in"
          onClick={() => setConfirmModal(null)}
        >
          <div className="min-h-full flex items-center justify-center py-4 sm:py-6">
            <div 
              className="bg-base-surface rounded-2xl w-full max-w-lg p-6 text-text-primary shadow-2xl space-y-4 border border-border"
              onClick={(e) => e.stopPropagation()}
            >
              
              <div className="flex items-start space-x-3 pb-3 border-b border-border">
                <div className="p-2.5 rounded-xl bg-bg-warning text-warning-text border border-warning-border">
                  <AlertTriangle className="w-6 h-6 text-warning-text" />
                </div>
                <div className="flex-1">
                  <h3 className="font-black text-lg text-text-primary">{confirmModal.title}</h3>
                  <p className="text-xs text-text-secondary mt-1 leading-relaxed">{confirmModal.description}</p>
                </div>
              </div>

              {confirmModal.impactSummary && confirmModal.impactSummary.length > 0 && (
                <div className="bg-base-surface-2 p-3.5 rounded-xl border border-border space-y-1.5 text-xs">
                  <div className="font-bold text-text-muted uppercase tracking-wider text-[10px]">Özet Bilgiler:</div>
                  <ul className="list-disc list-inside text-text-secondary space-y-0.5">
                    {confirmModal.impactSummary.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-xs font-semibold text-text-primary">
                Bu işlemi onaylamak istediğinizden emin misiniz?
              </p>

              <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-border">
                <button
                  disabled={isProcessing}
                  onClick={() => setConfirmModal(null)}
                  className="px-4 py-2 bg-base-surface-2 hover:bg-base-surface text-text-primary rounded-xl text-xs font-bold cursor-pointer border border-border"
                >
                  İptal Et
                </button>
                <button
                  disabled={isProcessing}
                  onClick={confirmModal.onConfirm}
                  className="px-5 py-2 bg-success-fill hover:opacity-90 text-base rounded-xl text-xs font-black shadow-md cursor-pointer flex items-center space-x-1.5"
                >
                  {isProcessing ? (
                    <span>Güncelleniyor...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Evet, Değişiklikleri Uygula</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Bulk Barcode & Shelf Label Generator */}
      <BarcodeGeneratorModal
        isOpen={showBarcodeModal}
        onClose={() => setShowBarcodeModal(false)}
        products={products}
        initialSelectedProductIds={barcodeSelectedProductIds}
      />

      {/* MODAL 4: Camera Barcode & QR Scanner Modal */}
      <CameraBarcodeScannerModal
        isOpen={showCameraScannerModal}
        onClose={() => setShowCameraScannerModal(false)}
        products={products}
        onProductUpdated={onRefresh}
        onOpenProductEdit={(product) => {
          setShowCameraScannerModal(false);
          onEditProduct(product);
        }}
        onOpenCreateWithBarcode={(_barcode) => {
          setShowCameraScannerModal(false);
          onOpenAddModal();
        }}
        onOpenBarcodeGenerator={(ids) => {
          setShowCameraScannerModal(false);
          setBarcodeSelectedProductIds(ids);
          setShowBarcodeModal(true);
        }}
      />

    </div>
  );
}
