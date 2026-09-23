import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db, collection, getDocs } from '../../lib/firebase';
import type { Product, CariAccount, Order } from '../../types';
import { 
  ShoppingBag, 
  CreditCard, 
  Banknote, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  Pause, 
  Play, 
  CheckCircle2, 
  Printer, 
  X, 
  RefreshCw, 
  User as UserIcon, 
  Building2, 
  Phone, 
  Percent, 
  Receipt, 
  RotateCcw, 
  Camera, 
  Package, 
  AlertCircle,
  Sparkles,
  ArrowRight,
  Layers,
  Barcode
} from 'lucide-react';
import { printThermalReceipt80mm } from '../../utils/printUtils';
import { playNotificationSound } from '../../lib/audio';
import confetti from 'canvas-confetti';
import { posTotals, posStockIssue, type PosCartItem } from './posModel';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import { Haptics } from '../../utils/haptics';
import './operations.css';

export interface PosSaleData {
  customerName: string;
  customerPhone?: string;
  cariId?: string;
  paymentMethod: 'Nakit' | 'Kredi Kartı' | 'Cari Hesap' | 'Havale/EFT';
  items: Array<{
    productId: string;
    productName?: string;
    unit?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  totalAmount: number;
  discountAmount: number;
  paidAmount: number;
  changeAmount: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onCompleteSale: (data: PosSaleData) => Promise<Order>;
  loadAccounts?: () => Promise<CariAccount[]>;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  onOpenBarcodeScanner?: () => void;
  scannedBarcode?: { code: string; sequence: number } | null;
}

const money = (n: number) => n.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });

async function loadAccountsDefault(): Promise<CariAccount[]> {
  // Firestore'dan tek seferlik okuma. Eskiden olu /api/cariler cagriliyor ve
  // catch bos dizi donduruyordu; kasada cari hesaba satis yapilamiyordu.
  try {
    const snap = await getDocs(collection(db, 'cari_accounts'));
    const list: CariAccount[] = [];
    snap.forEach(d => list.push({ id: d.id, ...(d.data() as Omit<CariAccount, 'id'>) }));
    return list;
  } catch (err: any) {
    console.warn('Cari hesaplar yüklenirken hata:', err);
    return [];
  }
}

interface Draft {
  cart: PosCartItem[];
  customerName: string;
  customerPhone: string;
  customerId: string;
  discount: number;
  method: PosSaleData['paymentMethod'];
  cash: string;
}

export default function FastPosCheckoutModal({
  isOpen,
  onClose,
  products = [],
  onCompleteSale,
  loadAccounts = loadAccountsDefault,
  loading = false,
  error,
  onRetry,
  onOpenBarcodeScanner,
  scannedBarcode,
}: Props) {
  const [mobileStep, setMobileStep] = useState<'products' | 'cart' | 'payment'>('products');

  // Search & Catalog State
  const [search, setSearch] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeFeedback, setBarcodeFeedback] = useState<string | null>(null);

  // Cart & Customer State
  const [cart, setCart] = useState<PosCartItem[]>([]);
  const [customerType, setCustomerType] = useState<'retail' | 'cari'>('retail');
  const [customerId, setCustomerId] = useState('retail');
  const [customerName, setCustomerName] = useState('Perakende Müşteri');
  const [customerPhone, setCustomerPhone] = useState('');

  // Payment State
  const [method, setMethod] = useState<PosSaleData['paymentMethod']>('Nakit');
  const [cash, setCash] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);

  // Accounts State
  const [accounts, setAccounts] = useState<CariAccount[]>([]);
  const [accountState, setAccountState] = useState<'loading' | 'ready' | 'error'>('loading');

  // Operational State
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [parked, setParked] = useState<Array<{ id: number; timestamp: string; draft: Draft }>>([]);
  const [result, setResult] = useState<{
    order: Order;
    expected: number;
    change: number;
  } | null>(null);

  // Custom Item Modal/Bar State
  const [showCustomItemModal, setShowCustomItemModal] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');
  const [customItemQty, setCustomItemQty] = useState('1');
  const [customItemUnit, setCustomItemUnit] = useState('ADET');
  const [customItemError, setCustomItemError] = useState<string | null>(null);
  const [cariSearch, setCariSearch] = useState('');

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const lock = useRef(false);

  const safeProducts = useMemo(() => Array.isArray(products) ? products : [], [products]);

  // Load Accounts
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setAccountState('loading');
    loadAccounts()
      .then(data => {
        if (!cancelled) {
          setAccounts(Array.isArray(data) ? data : []);
          setAccountState('ready');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAccounts([]);
          setAccountState('error');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, loadAccounts]);

  // Focus barcode input on open
  useEffect(() => {
    if (isOpen && !result && window.matchMedia('(min-width: 1024px)').matches) {
      setTimeout(() => barcodeInputRef.current?.focus(), 150);
    }
  }, [isOpen, result]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showCustomItemModal) {
          setShowCustomItemModal(false);
          setCustomItemError(null);
          return;
        }
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, showCustomItemModal]);

  // Calculations
  const totals = posTotals(cart, discountPercent, cash);
  const stockIssue = posStockIssue(cart, safeProducts);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr-TR');
    return safeProducts.filter(p => {
      if (!p) return false;
      if (!q) return true;
      return (
        p.name?.toLocaleLowerCase('tr-TR').includes(q) ||
        p.sku?.toLocaleLowerCase('tr-TR').includes(q) ||
        (p.barcode && p.barcode.includes(q)) ||
        (p.category && p.category.toLocaleLowerCase('tr-TR').includes(q))
      );
    });
  }, [safeProducts, search]);

  const resetForm = () => {
    setMobileStep('products');
    setCart([]);
    setCash('');
    setDiscountPercent(0);
    setCustomerId('retail');
    setCustomerType('retail');
    setCustomerName('Perakende Müşteri');
    setCustomerPhone('');
    setMethod('Nakit');
    setErrorMessage(null);
    setBarcodeFeedback(null);
  };

  const handleClose = () => {
    if (processing) {
      setErrorMessage('Satış işlemi kaydediliyor, lütfen bekleyin.');
      return;
    }
    setErrorMessage(null);
    onClose();
  };

  // Add Product to Cart
  const addToCart = (product: Product, quantityToAdd = 1) => {
    if (loading || !!error || processing) return;

    if (!Number.isFinite(product.stock) || product.stock < 1) {
      Haptics.error();
      setBarcodeFeedback(`${product.name}: Stokta bulunmamaktadır.`);
      playNotificationSound('alert');
      return;
    }

    const currentInCart = cart.find(i => i.productId === product.id)?.quantity || 0;
    const newQuantity = currentInCart + quantityToAdd;

    if (newQuantity > product.stock) {
      Haptics.error();
      setBarcodeFeedback(`${product.name}: Yetersiz stok! Mevcut: ${product.stock} ${product.unit || 'ADET'}`);
      playNotificationSound('alert');
      return;
    }

    Haptics.tap();
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id);
      if (existing) {
        return prev.map(i =>
          i.productId === product.id
            ? {
                ...i,
                quantity: i.quantity + quantityToAdd,
                totalPrice: i.unitPrice * (i.quantity + quantityToAdd) * (1 - i.discountRate / 100),
              }
            : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          sku: product.sku || 'SKU',
          name: product.name,
          unit: product.unit || 'ADET',
          unitPrice: product.price,
          quantity: quantityToAdd,
          discountRate: 0,
          totalPrice: product.price * quantityToAdd,
        },
      ];
    });

    setBarcodeFeedback(null);
    setBarcodeInput('');
    playNotificationSound('success');
  };

  // Add Custom Item
  const handleAddCustomItem = () => {
    const rawPrice = String(customItemPrice || '').replace(',', '.').trim();
    const rawQty = String(customItemQty || '').replace(',', '.').trim();
    const price = parseFloat(rawPrice);
    const qty = parseFloat(rawQty);

    if (!customItemName.trim()) {
      setCustomItemError('Lütfen kalem veya hizmet adını yazın.');
      playNotificationSound('alert');
      return;
    }
    if (isNaN(price) || price < 0) {
      setCustomItemError('Lütfen geçerli bir birim fiyat girin (örn: 150 veya 150,50).');
      playNotificationSound('alert');
      return;
    }
    if (isNaN(qty) || qty <= 0) {
      setCustomItemError('Lütfen 0\'dan büyük geçerli bir miktar girin.');
      playNotificationSound('alert');
      return;
    }

    const customId = `custom-${Date.now()}`;
    setCart(prev => [
      ...prev,
      {
        productId: customId,
        sku: 'OZEL-KALEM',
        name: customItemName.trim(),
        unit: customItemUnit || 'ADET',
        unitPrice: price,
        quantity: qty,
        discountRate: 0,
        totalPrice: price * qty,
      },
    ]);

    setCustomItemName('');
    setCustomItemPrice('');
    setCustomItemQty('1');
    setCustomItemUnit('ADET');
    setCustomItemError(null);
    setShowCustomItemModal(false);
    playNotificationSound('success');
  };

  // Barcode Submit
  const handleBarcodeSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = barcodeInput.trim();
    if (!code) return;

    const matched = safeProducts.find(
      p =>
        (p.barcode && p.barcode.trim() === code) ||
        (p.sku && p.sku.trim().toLocaleLowerCase('tr-TR') === code.toLocaleLowerCase('tr-TR'))
    );

    if (matched) {
      addToCart(matched, 1);
      setBarcodeInput('');
      setBarcodeFeedback(null);
    } else {
      setBarcodeFeedback(`"${code}" barkodlu ürün katalogda bulunamadı.`);
      playNotificationSound('alert');
    }
  };

  const consumedScan = useRef<number | null>(null);
  useEffect(() => {
    if (!isOpen || !scannedBarcode || consumedScan.current === scannedBarcode.sequence) return;
    consumedScan.current = scannedBarcode.sequence;
    const code = scannedBarcode.code.trim();
    const product = safeProducts.find(p => p.barcode?.trim() === code || p.sku?.trim().toLocaleLowerCase('tr-TR') === code.toLocaleLowerCase('tr-TR'));
    setMobileStep('products');
    if (product) addToCart(product);
    else setBarcodeFeedback(`"${code}" barkodlu ürün katalogda bulunamadı.`);
  }, [isOpen, scannedBarcode]);

  // Stepper update
  const updateQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      // Remove item
      setCart(prev => prev.filter((_, idx) => idx !== index));
      return;
    }
    const item = cart[index];
    const product = safeProducts.find(p => p.id === item.productId);
    if (product && newQty > product.stock) {
      setErrorMessage(`${item.name} için maksimum stok ${product.stock} ${product.unit}.`);
      playNotificationSound('alert');
      return;
    }

    setCart(prev =>
      prev.map((i, idx) =>
        idx === index
          ? {
              ...i,
              quantity: newQty,
              totalPrice: i.unitPrice * newQty * (1 - i.discountRate / 100),
            }
          : i
      )
    );
    setErrorMessage(null);
  };

  // Park Cart
  const handleParkCart = () => {
    if (!cart.length) return;
    const newParked = {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      draft: { cart, customerName, customerPhone, customerId, discount: discountPercent, method, cash },
    };
    setParked(prev => [newParked, ...prev]);
    resetForm();
    playNotificationSound('success');
  };

  // Restore Parked
  const handleRestoreParked = (id: number) => {
    const found = parked.find(p => p.id === id);
    if (!found) return;
    if (cart.length > 0) {
      if (!window.confirm('Mevcut sepet temizlenecektir. Askıdaki sepeti geri yüklemek istiyor musunuz?')) {
        return;
      }
    }
    const d = found.draft;
    setCart(d.cart);
    setCustomerName(d.customerName);
    setCustomerPhone(d.customerPhone);
    setCustomerId(d.customerId);
    setCustomerType(d.customerId === 'retail' ? 'retail' : 'cari');
    setDiscountPercent(d.discount);
    setMethod(d.method);
    setCash(d.cash);
    setParked(prev => prev.filter(p => p.id !== id));
    playNotificationSound('success');
  };

  // Checkout Execution
  const handleCheckout = async () => {
    if (lock.current || !cart.length || loading || !!error || processing) return;

    if (stockIssue) {
      setErrorMessage(`${stockIssue.name}: Stok yetersiz. Lütfen miktarı kontrol edin.`);
      playNotificationSound('alert');
      return;
    }

    if (method === 'Nakit' && cash.trim()) {
      const numCash = Number(cash);
      if (isNaN(numCash) || numCash < totals.grandTotal) {
        setErrorMessage('Alınan nakit tutarı genel toplamdan az olamaz.');
        playNotificationSound('alert');
        return;
      }
    }

    if (method === 'Cari Hesap') {
      if (customerId === 'retail' || !accounts.some(a => a.id === customerId)) {
        setCustomerType('cari');
        setErrorMessage('Cari hesap ile satış için lütfen kayıtlı bir cari hesap seçin.');
        playNotificationSound('alert');
        return;
      }
    }

    lock.current = true;
    setProcessing(true);
    setErrorMessage(null);

    try {
      const order = await onCompleteSale({
        customerName: customerName || 'Perakende Müşteri',
        customerPhone: customerPhone || undefined,
        cariId: customerId === 'retail' ? undefined : customerId,
        paymentMethod: method,
        items: cart.map(({ productId, name, unit, quantity, unitPrice, totalPrice }) => ({
          productId,
          productName: name,
          unit: unit || 'ADET',
          quantity,
          unitPrice,
          totalPrice,
        })),
        totalAmount: totals.grandTotal,
        discountAmount: totals.totalDiscount,
        paidAmount: method === 'Nakit' ? (totals.numericReceived || totals.grandTotal) : totals.grandTotal,
        changeAmount: method === 'Nakit' ? totals.changeAmount : 0,
      });

      if (!order?.id || !order?.orderNumber) {
        throw new Error('Sipariş yanıtı geçerli bir kayıt içermiyor.');
      }

      Haptics.success();
      playNotificationSound('success');
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });

      setResult({
        order,
        expected: totals.grandTotal,
        change: method === 'Nakit' && cash.trim() ? totals.changeAmount : 0,
      });
      resetForm();
    } catch (err: any) {
      console.error('POS Checkout error:', err);
      Haptics.error();
      playNotificationSound('alert');
      setErrorMessage(
        err?.message || 'Kasa siparişi oluşturulurken bir hata oluştu. Lütfen bağlantınızı ve verileri kontrol edin.'
      );
    } finally {
      lock.current = false;
      setProcessing(false);
    }
  };

  // Thermal Print
  const handlePrintReceipt = () => {
    if (!result?.order) return;
    try {
      const o = result.order;
      const printed = printThermalReceipt80mm({
        title: 'ALPHA TEKNİK',
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        date: new Date(o.createdAt || Date.now()).toLocaleString('tr-TR'),
        items: o.items.map(i => ({
          name: i.productName,
          qty: i.quantity,
          unit: i.unit || 'ADET',
          price: i.unitPrice,
          total: i.totalPrice,
        })),
        totalAmount: o.total,
        taxAmount: o.tax,
        notes: `Ödeme: ${o.paymentMethod || 'Nakit'} | Hızlı Kasa Satışı`,
        documentType: 'SIPARIS_FISI',
      });
      if (!printed) throw new Error('Yazdırma başlatılamadı.');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Fiş yazdırılamadı. Yazıcı bağlantısını kontrol edin.');
    }
  };

  useModalBehavior(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div 
        className="pos-checkout bg-base-surface text-text-primary w-full max-w-7xl h-[94dvh] max-h-[920px] rounded-3xl border border-border shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pos-modal-title"
      >
        {/* MODAL HEADER */}
        <header className="px-5 py-3.5 border-b border-border bg-base-surface-2 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-blue/15 text-brand-blue border border-brand-blue/30 flex items-center justify-center shadow-sm">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 id="pos-modal-title" className="text-base sm:text-lg font-black tracking-tight text-text-primary">
                  Hızlı Kasa & POS Satış Terminali
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-category-sales-bg text-category-sales-text border border-category-sales-border">
                  Canlı Tezgah
                </span>
              </div>
              <p className="text-xs text-text-secondary">
                Barkod okutarak veya ürün seçerek anında satış ve fiş kaydı oluşturun.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {parked.length > 0 && (
              <div className="relative">
                <span className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-brand-amber/15 text-brand-amber border border-brand-amber/30 text-xs font-bold">
                  <Pause className="w-3.5 h-3.5" />
                  <span>{parked.length} Askıda</span>
                </span>
              </div>
            )}

            {onOpenBarcodeScanner && (
              <button
                type="button"
                onClick={onOpenBarcodeScanner}
                className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-base-surface hover:bg-base-surface-2 border border-border text-xs font-semibold text-text-primary transition-all cursor-pointer shadow-sm"
                title="Kamera ile Barkod Tara"
              >
                <Camera className="w-4 h-4 text-brand-blue" />
                <span>Kamera Tara</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleClose}
              className="p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-base-surface border border-transparent hover:border-border transition-all cursor-pointer"
              aria-label="Pencereyi kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {!result && (
          <nav aria-label="Satış adımları" className="lg:hidden grid grid-cols-3 gap-2 p-2 border-b border-border shrink-0">
            {([
              ['products', '1. Ürünler'], ['cart', `2. Sepet (${cart.length})`], ['payment', '3. Ödeme'],
            ] as const).map(([step, label]) => (
              <button key={step} type="button" aria-current={mobileStep === step ? 'step' : undefined}
                disabled={processing || (step === 'payment' && !cart.length)}
                onClick={() => setMobileStep(step)}
                className={`min-h-11 rounded-xl text-sm font-bold active:scale-[0.98] transition-transform disabled:opacity-40 ${mobileStep === step ? 'bg-emerald-600 text-white' : 'bg-base-surface-2 text-text-secondary'}`}>
                {label}
              </button>
            ))}
          </nav>
        )}
        {/* MODAL BODY */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-base">
          {result ? (
            /* SUCCESS & RECEIPT SCREEN */
            <div className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
              <div className="max-w-xl w-full bg-base-surface p-6 sm:p-8 rounded-3xl border border-border shadow-xl text-center space-y-5 animate-in zoom-in-95 duration-200">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <div>
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    SATIŞ BAŞARIYLA TAMAMLANDI
                  </span>
                  <h3 className="text-2xl font-black text-text-primary mt-2">
                    {result.order.orderNumber}
                  </h3>
                  <p className="text-xs text-text-secondary mt-1">
                    Müşteri: <strong className="text-text-primary">{result.order.customerName}</strong> · Ödeme: <strong className="text-text-primary">{result.order.paymentMethod || method}</strong>
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-base-surface-2 border border-border/80 text-left space-y-2.5">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-text-secondary">Toplam Tutar:</span>
                    <span className="text-base font-black text-text-primary">{money(result.order.total)}</span>
                  </div>
                  {result.change > 0 && (
                    <div className="flex justify-between items-center text-sm pt-2 border-t border-border">
                      <span className="text-emerald-500 font-bold">Verilen Para Üstü:</span>
                      <span className="text-base font-black text-emerald-500">{money(result.change)}</span>
                    </div>
                  )}
                  <div className="text-[11px] text-text-muted pt-1">
                    Kalem Adedi: {result.order.items?.length || 0} ürün · Kasa kaydı ve stok düşümü yapıldı.
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handlePrintReceipt}
                    className="w-full py-3.5 px-4 bg-brand-blue hover:opacity-90 text-white rounded-xl text-sm font-bold shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>80mm Termal Fiş Yazdır</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setResult(null);
                      setErrorMessage(null);
                    }}
                    className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Yeni Satışa Başla</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full py-2.5 text-xs text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                >
                  Pencereyi Kapat
                </button>
              </div>
            </div>
          ) : (
            /* MAIN POS WORKSPACE (2 COLUMNS) */
            <div data-mobile-step={mobileStep} className="pos-workspace flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden min-h-0">
              {/* LEFT PANEL: PRODUCT CATALOG & BARCODE (~60%) */}
              <div className="pos-catalog lg:col-span-7 min-h-0 flex flex-col border-b lg:border-b-0 lg:border-r border-border overflow-hidden bg-base-surface">
                {/* TOP BAR: BARCODE & SEARCH */}
                <div className="p-3.5 border-b border-border bg-base-surface-2 space-y-2.5 shrink-0">
                  <form onSubmit={handleBarcodeSubmit} className="space-y-2">
                    <div className="flex items-stretch gap-2">
                      <div className="relative flex-1 min-w-0">
                        <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
                        <input ref={barcodeInputRef} type="text" value={barcodeInput}
                          onChange={e => { setBarcodeInput(e.target.value); setBarcodeFeedback(null); }}
                          aria-label="Barkod veya stok kodu" placeholder="Barkod / stok kodu"
                          className="w-full h-12 pl-9 pr-3 rounded-xl bg-base border border-border text-base text-text-primary outline-none focus:border-emerald-600" />
                      </div>
                      <button type="submit" disabled={!barcodeInput.trim() || processing}
                        className="h-12 shrink-0 px-4 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-40 active:scale-[0.98] transition-transform">Ekle</button>
                    </div>
                    <div className="flex gap-2">
                      {onOpenBarcodeScanner && <button type="button" onClick={onOpenBarcodeScanner} disabled={processing}
                        className="flex-1 min-h-11 flex items-center justify-center gap-2 rounded-xl border border-border bg-base text-text-primary text-sm font-semibold active:scale-[0.98] transition-transform">
                        <Camera className="w-4 h-4" /> Kamera
                      </button>}
                      <button type="button" onClick={() => setShowCustomItemModal(true)} disabled={processing}
                        className="flex-1 min-h-11 flex items-center justify-center gap-2 rounded-xl border border-border bg-base text-text-primary text-sm font-semibold active:scale-[0.98] transition-transform">
                        <Plus className="w-4 h-4" /> Özel Kalem
                      </button>
                    </div>
                  </form>

                  {barcodeFeedback && (
                    <div className="text-xs text-rose-500 font-medium flex items-center space-x-1.5 px-2 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{barcodeFeedback}</span>
                    </div>
                  )}

                  {/* SEARCH & CATEGORY CHIPS */}
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                      <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Ürün adı, SKU veya kategori ile hızlı filtrele..."
                        className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-base border border-border text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-brand-blue"
                      />
                      {search && (
                        <button
                          type="button"
                          onClick={() => setSearch('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>


                  </div>
                </div>

                {/* PRODUCT GRID */}
                <div className="flex-1 overflow-y-auto p-3.5">
                  {loading ? (
                    <div className="flex items-center justify-center h-48 text-text-secondary text-xs space-x-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-brand-blue" />
                      <span>Ürün kataloğu yükleniyor...</span>
                    </div>
                  ) : error ? (
                    <div className="p-6 text-center text-rose-500 space-y-2">
                      <AlertCircle className="w-6 h-6 mx-auto" />
                      <p className="text-xs font-semibold">{error}</p>
                      {onRetry && (
                        <button
                          type="button"
                          onClick={onRetry}
                          className="px-3 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-lg text-xs font-bold"
                        >
                          Tekrar Dene
                        </button>
                      )}
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="p-8 text-center text-text-muted space-y-2">
                      <Package className="w-8 h-8 mx-auto opacity-40" />
                      <p className="text-xs font-medium">Aramanıza uygun ürün bulunamadı.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setSearch('');
                        }}
                        className="text-xs text-brand-blue hover:underline"
                      >
                        Filtreleri Sıfırla
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {filteredProducts.slice(0, 48).map(product => {
                        const inStock = Number.isFinite(product.stock) && product.stock > 0;
                        const cartQty = cart.find(i => i.productId === product.id)?.quantity || 0;

                        return (
                          <div
                            key={product.id}
                            onClick={() => inStock && addToCart(product, 1)}
                            className={`group relative p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                              inStock
                                ? 'bg-base-surface hover:bg-base-surface-2 border-border hover:border-brand-blue/50 hover:shadow-md'
                                : 'bg-base-surface/40 border-border/40 opacity-60 cursor-not-allowed'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="text-[10px] font-mono font-bold text-text-muted truncate">
                                  {product.sku || 'SKU'}
                                </span>
                                <span
                                  className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                                    !inStock
                                      ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                                      : product.stock <= 5
                                      ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                  }`}
                                >
                                  {inStock ? `${product.stock} ${product.unit || 'Adet'}` : 'Tükendi'}
                                </span>
                              </div>
                              <h4 className="text-xs font-bold text-text-primary line-clamp-2 leading-snug group-hover:text-brand-blue transition-colors">
                                {product.name}
                              </h4>
                            </div>

                            <div className="mt-3 flex items-center justify-between pt-2 border-t border-border/60">
                              <span className="text-xs sm:text-sm font-black text-text-primary">
                                {money(product.price)}
                              </span>
                              <button
                                type="button"
                                disabled={!inStock}
                                onClick={e => {
                                  e.stopPropagation();
                                  addToCart(product, 1);
                                }}
                                className="w-7 h-7 rounded-xl bg-brand-blue/10 hover:bg-brand-blue text-brand-blue hover:text-white disabled:opacity-30 flex items-center justify-center transition-all cursor-pointer"
                                aria-label={`${product.name} ekle`}
                              >
                                {cartQty > 0 ? (
                                  <span className="text-xs font-black">{cartQty}</span>
                                ) : (
                                  <Plus className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT PANEL: CART, CUSTOMER & CHECKOUT (~40%) */}
              <div className="pos-checkout-panel lg:col-span-5 min-h-0 flex flex-col overflow-hidden bg-base-surface-2">
                {/* CUSTOMER SELECTION BAR */}
                <div className="pos-customer p-3 border-b border-border bg-base-surface space-y-2 shrink-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-text-secondary tracking-wider uppercase">
                      Müşteri / Cari Bilgisi
                    </span>
                    <div className="flex rounded-lg p-0.5 bg-base border border-border text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerType('retail');
                          setCustomerId('retail');
                          setCustomerName('Perakende Müşteri');
                          setErrorMessage(null);
                          if (method === 'Cari Hesap') {
                            setMethod('Nakit');
                          }
                        }}
                        className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                          customerType === 'retail'
                            ? 'bg-brand-blue text-white shadow-xs'
                            : 'text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        Perakende
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerType('cari');
                          setErrorMessage(null);
                        }}
                        className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                          customerType === 'cari'
                            ? 'bg-brand-blue text-white shadow-xs'
                            : 'text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        Cari Hesap
                      </button>
                    </div>
                  </div>

                  {customerType === 'retail' ? (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        placeholder="Müşteri Adı"
                        className="px-2.5 py-1.5 rounded-lg bg-base border border-border text-xs text-text-primary outline-none focus:border-brand-blue"
                      />
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={e => setCustomerPhone(e.target.value)}
                        placeholder="Telefon (İsteğe bağlı)"
                        className="px-2.5 py-1.5 rounded-lg bg-base border border-border text-xs text-text-primary outline-none focus:border-brand-blue font-mono"
                      />
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        value={cariSearch}
                        onChange={e => setCariSearch(e.target.value)}
                        placeholder="Cari firma adı veya kod ile filtrele..."
                        className="w-full px-2.5 py-1 rounded-lg bg-base border border-border text-[11px] text-text-primary placeholder:text-text-muted outline-none focus:border-brand-blue"
                      />
                      <select
                        value={customerId}
                        disabled={accountState !== 'ready'}
                        onChange={e => {
                          const id = e.target.value;
                          const found = accounts.find(a => a.id === id);
                          setCustomerId(id);
                          setCustomerName(found ? found.companyName || found.name : 'Perakende Müşteri');
                          setCustomerPhone(found?.phone || '');
                          setErrorMessage(null);
                        }}
                        className={`w-full px-2.5 py-1.5 rounded-lg bg-base border text-xs text-text-primary outline-none transition-all ${
                          method === 'Cari Hesap' && customerId === 'retail'
                            ? 'border-brand-amber ring-2 ring-brand-amber/20 font-semibold'
                            : 'border-border focus:border-brand-blue'
                        }`}
                      >
                        <option value="retail">-- Cari Hesap Seçin --</option>
                        {accounts
                          .filter(acc => {
                            if (!cariSearch.trim()) return true;
                            const q = cariSearch.trim().toLocaleLowerCase('tr-TR');
                            return (
                              (acc.name && acc.name.toLocaleLowerCase('tr-TR').includes(q)) ||
                              (acc.companyName && acc.companyName.toLocaleLowerCase('tr-TR').includes(q)) ||
                              (acc.code && acc.code.toLocaleLowerCase('tr-TR').includes(q)) ||
                              (acc.phone && acc.phone.includes(q))
                            );
                          })
                          .map(acc => (
                            <option key={acc.id} value={acc.id}>
                              {acc.code ? `[${acc.code}] ` : ''}{acc.companyName || acc.name}
                            </option>
                          ))}
                      </select>

                      {customerId !== 'retail' && (
                        <div className="text-[11px] text-text-secondary flex justify-between items-center px-1">
                          <span>Kayıtlı Telefon: <strong>{customerPhone || 'Yok'}</strong></span>
                          <span>Bakiye: <strong>{money(accounts.find(a => a.id === customerId)?.balance || 0)}</strong></span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* LIVE CART ITEMS LIST */}
                <div className="pos-cart flex-1 overflow-y-auto p-3 space-y-2">
                  <div className="flex items-center justify-between pb-1 border-b border-border/50">
                    <span className="text-xs font-bold text-text-secondary">
                      Sepet Kalemleri ({cart.length})
                    </span>
                    {cart.length > 0 && (
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={handleParkCart}
                          className="text-[11px] font-bold text-brand-amber hover:underline flex items-center space-x-1 cursor-pointer"
                          title="Sepeti daha sonra tamamlamak üzere beklemeye al"
                        >
                          <Pause className="w-3 h-3" />
                          <span>Askıya Al</span>
                        </button>
                        <span className="text-border">|</span>
                        <button
                          type="button"
                          onClick={() => setCart([])}
                          className="text-[11px] font-bold text-rose-500 hover:underline flex items-center space-x-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Temizle</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {cart.length === 0 ? (
                    <div className="py-12 text-center text-text-muted space-y-2">
                      <ShoppingBag className="w-8 h-8 mx-auto opacity-30" />
                      <p className="text-xs font-medium">Sepet boş. Barkod okutun veya ürün seçin.</p>
                    </div>
                  ) : (
                    cart.map((item, index) => {
                      const prod = safeProducts.find(p => p.id === item.productId);
                      const maxStock = prod ? prod.stock : 9999;
                      const hasStockWarning = prod && item.quantity > prod.stock;

                      return (
                        <div
                          key={`${item.productId}-${index}`}
                          className={`p-2.5 rounded-2xl border transition-all ${
                            hasStockWarning
                              ? 'bg-rose-500/10 border-rose-500/30'
                              : 'bg-base-surface border-border/80'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h5 className="text-xs font-bold text-text-primary truncate">
                                {item.name}
                              </h5>
                              <div className="text-[11px] text-text-muted font-mono">
                                {item.sku} · {money(item.unitPrice)} / {item.unit}
                              </div>
                            </div>
                            <span className="text-xs font-black text-text-primary shrink-0">
                              {money(item.totalPrice)}
                            </span>
                          </div>

                          {hasStockWarning && (
                            <div className="text-[10px] text-rose-500 font-bold mt-1">
                              Maksimum stok: {maxStock} {item.unit}
                            </div>
                          )}

                          <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-border/40">
                            {/* Quantity Stepper */}
                            <div className="flex items-center space-x-1 bg-base rounded-xl p-0.5 border border-border">
                              <button
                                type="button"
                                onClick={() => updateQuantity(index, item.quantity - 1)}
                                className="w-6 h-6 rounded-lg bg-base-surface hover:bg-base-surface-2 flex items-center justify-center text-text-secondary hover:text-text-primary transition-all cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <input
                                type="number"
                                min={1}
                                max={maxStock}
                                step="any"
                                value={item.quantity}
                                onChange={e => {
                                  const val = parseFloat(e.target.value);
                                  if (!isNaN(val)) updateQuantity(index, val);
                                }}
                                className="w-10 text-center text-xs font-black text-text-primary bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              <button
                                type="button"
                                onClick={() => updateQuantity(index, item.quantity + 1)}
                                className="w-6 h-6 rounded-lg bg-base-surface hover:bg-base-surface-2 flex items-center justify-center text-text-secondary hover:text-text-primary transition-all cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => setCart(prev => prev.filter((_, i) => i !== index))}
                              className="p-1 text-text-muted hover:text-rose-500 transition-colors cursor-pointer"
                              aria-label={`${item.name} sil`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* PARKED BASKETS DRAWER */}
                  {parked.length > 0 && (
                    <div className="mt-3 p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400">
                        <span className="flex items-center space-x-1">
                          <Pause className="w-3.5 h-3.5" />
                          <span>Beklemeye Alınan Sepetler ({parked.length})</span>
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {parked.map(p => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between p-2 rounded-xl bg-base-surface border border-border text-xs"
                          >
                            <div>
                              <div className="font-bold text-text-primary truncate max-w-[140px]">
                                {p.draft.customerName}
                              </div>
                              <div className="text-[10px] text-text-muted">
                                {p.timestamp} · {p.draft.cart.length} kalem
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="font-black text-text-primary">
                                {money(posTotals(p.draft.cart, p.draft.discount, p.draft.cash).grandTotal)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRestoreParked(p.id)}
                                className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-all"
                              >
                                Geri Al
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* FINANCIAL SUMMARY & PAYMENT SECTION */}
                <div className="pos-payment p-3.5 border-t border-border bg-base-surface space-y-3 shrink-0">
                  {/* Summary Rows */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-text-secondary">
                      <span>Ara Toplam</span>
                      <span className="font-mono">{money(totals.subtotal)}</span>
                    </div>

                    <div className="flex flex-wrap gap-y-2 justify-between items-center text-text-secondary">
                      <div className="flex items-center space-x-1">
                        <span>İskonto</span>
                        <div className="flex space-x-0.5">
                          {[0, 5, 10, 15, 20].map(pct => (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => setDiscountPercent(pct)}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                                discountPercent === pct
                                  ? 'bg-brand-blue text-white'
                                  : 'bg-base-surface-2 text-text-muted hover:text-text-primary border border-border/60'
                              }`}
                            >
                              %{pct}
                            </button>
                          ))}
                        </div>
                      </div>
                      <span className="font-mono text-emerald-500">
                        −{money(totals.totalDiscount)}
                      </span>
                    </div>

                    <div className="flex justify-between text-text-secondary">
                      <span>KDV (%20)</span>
                      <span className="font-mono">{money(totals.tax)}</span>
                    </div>

                    <div className="flex justify-between items-center pt-1.5 border-t border-border">
                      <span className="text-sm font-black text-text-primary">GENEL TOPLAM</span>
                      <span className="text-lg sm:text-xl font-black text-brand-blue font-mono">
                        {money(totals.grandTotal)}
                      </span>
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-4 gap-1.5">
                      {(['Nakit', 'Kredi Kartı', 'Cari Hesap', 'Havale/EFT'] as const).map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            setMethod(m);
                            setErrorMessage(null);
                            if (m === 'Cari Hesap') {
                              setCustomerType('cari');
                            }
                            if (m === 'Nakit' && !cash) {
                              setCash(String(totals.grandTotal));
                            }
                          }}
                          className={`py-2 px-1 rounded-xl text-[11px] font-bold border transition-all flex flex-col items-center justify-center space-y-0.5 cursor-pointer ${
                            method === m
                              ? 'bg-brand-blue text-white border-brand-blue shadow-sm'
                              : 'bg-base-surface-2 text-text-secondary hover:text-text-primary border-border/80'
                          }`}
                        >
                          {m === 'Nakit' && <Banknote className="w-4 h-4" />}
                          {m === 'Kredi Kartı' && <CreditCard className="w-4 h-4" />}
                          {m === 'Cari Hesap' && <Building2 className="w-4 h-4" />}
                          {m === 'Havale/EFT' && <Receipt className="w-4 h-4" />}
                          <span className="truncate w-full text-center">{m}</span>
                        </button>
                      ))}
                    </div>

                    {/* Cari Guidance if Cari Hesap is selected without account */}
                    {method === 'Cari Hesap' && customerId === 'retail' && (
                      <div className="p-2 rounded-xl bg-brand-amber/10 border border-brand-amber/30 text-brand-amber text-xs flex items-center space-x-2 animate-in fade-in">
                        <Building2 className="w-4 h-4 shrink-0 text-brand-amber" />
                        <span className="text-[11px] font-medium leading-tight">
                          Satışın kaydedileceği cari hesabı lütfen yukarıdaki <strong>Cari Hesap</strong> listesinden seçin.
                        </span>
                      </div>
                    )}

                    {/* Cash Details if Nakit */}
                    {method === 'Nakit' && (
                      <div className="p-2.5 rounded-2xl bg-base-surface-2 border border-border space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-text-secondary shrink-0">Alınan Nakit:</span>
                          <input
                            type="number"
                            step="any"
                            value={cash}
                            onChange={e => setCash(e.target.value)}
                            placeholder={String(totals.grandTotal)}
                            className="flex-1 px-2 py-1 rounded-lg bg-base border border-border text-xs font-mono font-bold text-text-primary outline-none focus:border-brand-blue"
                          />
                        </div>

                        {/* Quick Banknotes */}
                        <div className="flex items-center space-x-1 overflow-x-auto pb-0.5 scrollbar-none">
                          <button
                            type="button"
                            onClick={() => setCash(String(totals.grandTotal))}
                            className="px-2 py-1 rounded-lg bg-base text-brand-blue border border-brand-blue/30 text-[10px] font-bold whitespace-nowrap hover:bg-brand-blue hover:text-white transition-all cursor-pointer"
                          >
                            Tam Tutar
                          </button>
                          {[100, 200, 500, 1000, 2000].map(val => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setCash(String(val))}
                              className="px-2 py-1 rounded-lg bg-base text-text-secondary hover:text-text-primary border border-border text-[10px] font-bold whitespace-nowrap transition-all cursor-pointer"
                            >
                              ₺{val}
                            </button>
                          ))}
                        </div>

                        {/* Change Due Display */}
                        {cash && Number(cash) >= totals.grandTotal && (
                          <div className="flex justify-between items-center pt-1 border-t border-border/60 text-xs">
                            <span className="font-bold text-emerald-500">Para Üstü:</span>
                            <span className="font-mono font-black text-emerald-500 text-sm">
                              {money(totals.changeAmount)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ERROR BANNER */}
                  {errorMessage && (
                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-start space-x-2 animate-in fade-in">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-bold">İşlem Gerçekleştirilemedi</p>
                        <p className="text-[11px] opacity-90">{errorMessage}</p>
                      </div>
                    </div>
                  )}

                  {stockIssue && <p role="alert" className="text-sm text-rose-500">{stockIssue.name}: Stok yetersiz. Sepette miktarı azaltın.</p>}
                  {/* SUBMIT BUTTON */}
                  <button
                    type="button"
                    disabled={!cart.length || !!stockIssue || processing || loading || !!error}
                    onClick={handleCheckout}
                    className="hidden lg:flex w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl text-sm font-black shadow-lg shadow-emerald-600/20 transition-all items-center justify-center space-x-2 cursor-pointer active:scale-[0.98]"
                  >
                    {processing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Kaydediliyor...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>SATIŞI TAMAMLA · {money(totals.grandTotal)}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        {!result && (
          <footer className="pos-mobile-footer lg:hidden shrink-0 border-t border-border bg-base-surface p-3 space-y-2">
            <div className="flex justify-between gap-2 text-sm font-bold tabular-nums">
              <span>{cart.length} kalem · Toplam</span><span>{money(totals.grandTotal)}</span>
            </div>
            {mobileStep === 'payment' && stockIssue && <p role="alert" className="text-sm text-rose-500">{stockIssue.name}: Stok yetersiz. Sepette miktarı azaltın.</p>}
            {mobileStep === 'payment' && error && <p role="alert" className="text-sm text-rose-500">{error}</p>}
            <div className="flex gap-2">
              {mobileStep !== 'products' && <button type="button" disabled={processing}
                onClick={() => setMobileStep(mobileStep === 'payment' ? 'cart' : 'products')}
                className="min-h-12 px-4 rounded-xl border border-border font-bold active:scale-[0.98] transition-transform">Geri</button>}
              <button type="button"
                disabled={processing || (mobileStep !== 'products' && (!cart.length || loading || !!error || (mobileStep === 'payment' && !!stockIssue)))}
                onClick={() => mobileStep === 'payment' ? handleCheckout() : setMobileStep(mobileStep === 'products' ? 'cart' : 'payment')}
                className="flex-1 min-h-12 rounded-xl bg-emerald-600 text-white font-bold disabled:opacity-40 active:scale-[0.98] transition-transform">
                {processing ? 'Kaydediliyor…' : mobileStep === 'products' ? 'Sepeti Gör' : mobileStep === 'cart' ? 'Ödemeye Geç' : 'Satışı Tamamla'}
              </button>
            </div>
          </footer>
        )}
      </div>

      {/* MODAL: CUSTOM ITEM ADD */}
      {showCustomItemModal && (
        <div 
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={(e) => {
            e.stopPropagation();
            setShowCustomItemModal(false);
            setCustomItemError(null);
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleAddCustomItem();
            }}
            onClick={(e) => e.stopPropagation()}
            className="bg-base-surface text-text-primary w-full max-w-md p-5 rounded-3xl border border-border shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center border-b border-border pb-2">
              <h3 className="text-sm font-bold text-text-primary flex items-center space-x-1.5">
                <Plus className="w-4 h-4 text-brand-amber" />
                <span>Özel Kalem / Hizmet Ekle</span>
              </h3>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCustomItemModal(false);
                  setCustomItemError(null);
                }}
                className="text-text-secondary hover:text-text-primary cursor-pointer p-1 rounded-lg hover:bg-base-surface-2 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {customItemError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center space-x-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{customItemError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-text-secondary mb-1 font-semibold">Kalem / Hizmet Adı</label>
                <input
                  type="text"
                  value={customItemName}
                  onChange={e => {
                    setCustomItemName(e.target.value);
                    if (customItemError) setCustomItemError(null);
                  }}
                  placeholder="Örn: Montaj İşçiliği, Özel Dirsek"
                  className="w-full px-3 py-2 rounded-xl bg-base border border-border text-xs text-text-primary outline-none focus:border-brand-blue"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-text-secondary mb-1 font-semibold">Birim Fiyat (₺)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={customItemPrice}
                    onChange={e => {
                      setCustomItemPrice(e.target.value);
                      if (customItemError) setCustomItemError(null);
                    }}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-xl bg-base border border-border text-xs font-mono text-text-primary outline-none focus:border-brand-blue"
                  />
                </div>

                <div>
                  <label className="block text-text-secondary mb-1 font-semibold">Miktar & Birim</label>
                  <div className="flex space-x-1">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={customItemQty}
                      onChange={e => {
                        setCustomItemQty(e.target.value);
                        if (customItemError) setCustomItemError(null);
                      }}
                      className="w-16 px-2 py-2 rounded-xl bg-base border border-border text-xs font-mono text-text-primary outline-none focus:border-brand-blue text-center"
                    />
                    <select
                      value={customItemUnit}
                      onChange={e => setCustomItemUnit(e.target.value)}
                      className="flex-1 px-2 py-2 rounded-xl bg-base border border-border text-xs text-text-primary outline-none focus:border-brand-blue"
                    >
                      <option value="ADET">ADET</option>
                      <option value="METRE">METRE</option>
                      <option value="KG">KG</option>
                      <option value="PAKET">PAKET</option>
                      <option value="HİZMET">HİZMET</option>
                      <option value="BOY">BOY</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCustomItemModal(false);
                  setCustomItemError(null);
                }}
                className="px-4 py-2 rounded-xl bg-base hover:bg-base-surface-2 text-xs font-bold text-text-secondary cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-brand-blue hover:opacity-90 text-xs font-bold text-white shadow-sm cursor-pointer active:scale-95 transition-all"
              >
                Sepete Ekle
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

