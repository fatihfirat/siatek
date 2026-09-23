import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, 
  Barcode, 
  Search, 
  Trash2, 
  Plus, 
  Minus, 
  CreditCard, 
  Wallet, 
  Building2, 
  Printer, 
  CheckCircle2, 
  RotateCcw, 
  PauseCircle, 
  PlayCircle, 
  Sparkles, 
  Percent,
  Receipt,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import { Product, CariAccount } from '../../types';
import { printThermalReceipt80mm } from '../../utils/printUtils';
import confetti from 'canvas-confetti';

interface PosCartItem {
  productId: string;
  sku: string;
  barcode?: string;
  name: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  discountRate: number; // 0 - 100%
  totalPrice: number;
}

interface ParkedCart {
  id: string;
  customerName: string;
  items: PosCartItem[];
  parkedAt: string;
  totalAmount: number;
}

interface FastPosCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onCompleteSale: (saleData: {
    customerName: string;
    customerPhone?: string;
    cariId?: string;
    paymentMethod: 'Nakit' | 'Kredi Kartı' | 'Cari Hesap' | 'Havale/EFT';
    items: Array<{ productId: string; quantity: number; unitPrice: number; totalPrice: number }>;
    totalAmount: number;
    discountAmount: number;
    paidAmount: number;
    changeAmount: number;
  }) => Promise<void>;
}

export default function FastPosCheckoutModal({
  isOpen,
  onClose,
  products,
  onCompleteSale,
}: FastPosCheckoutModalProps) {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [cart, setCart] = useState<PosCartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('retail');
  const [customerName, setCustomerName] = useState('Perakende Müşteri');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Nakit' | 'Kredi Kartı' | 'Cari Hesap' | 'Havale/EFT'>('Nakit');
  
  // Numpad & Quick Tender
  const [receivedCash, setReceivedCash] = useState<string>('');
  const [globalDiscountPercent, setGlobalDiscountPercent] = useState<number>(0);
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);
  
  // Parked Carts
  const [parkedCarts, setParkedCarts] = useState<ParkedCart[]>([]);
  const [cariler, setCariler] = useState<CariAccount[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Load Cariler from API
  useEffect(() => {
    if (isOpen) {
      fetch('/api/cariler')
        .then(res => res.json())
        .then(data => {
          if (data.cariler) setCariler(data.cariler);
        })
        .catch(() => {});
      
      // Auto-focus barcode scanner input
      setTimeout(() => barcodeInputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  }, [cart]);

  const itemDiscounts = useMemo(() => {
    return cart.reduce((sum, item) => {
      const lineGross = item.unitPrice * item.quantity;
      return sum + (lineGross * (item.discountRate / 100));
    }, 0);
  }, [cart]);

  const globalDiscountAmount = useMemo(() => {
    const afterItemDiscounts = subtotal - itemDiscounts;
    return (afterItemDiscounts * (globalDiscountPercent / 100));
  }, [subtotal, itemDiscounts, globalDiscountPercent]);

  const totalDiscount = itemDiscounts + globalDiscountAmount;
  const grandTotal = Math.max(0, subtotal - totalDiscount);

  const numericReceived = parseFloat(receivedCash) || 0;
  const changeAmount = Math.max(0, numericReceived - grandTotal);

  // Search filter
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return [];
    const q = productSearch.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.sku.toLowerCase().includes(q) || 
      (p.barcode && p.barcode.includes(q))
    ).slice(0, 8);
  }, [products, productSearch]);

  const handleAddProductToCart = (prod: Product, qty = 1) => {
    setCart(prev => {
      const idx = prev.findIndex(item => item.productId === prod.id);
      if (idx >= 0) {
        const updated = [...prev];
        const newQty = updated[idx].quantity + qty;
        const lineGross = updated[idx].unitPrice * newQty;
        const lineTotal = lineGross - (lineGross * (updated[idx].discountRate / 100));
        updated[idx] = {
          ...updated[idx],
          quantity: newQty,
          totalPrice: lineTotal
        };
        setActiveItemIndex(idx);
        return updated;
      } else {
        const lineGross = prod.price * qty;
        const lineTotal = lineGross;
        const newItem: PosCartItem = {
          productId: prod.id,
          sku: prod.sku,
          barcode: prod.barcode,
          name: prod.name,
          unit: prod.unit || 'ADET',
          unitPrice: prod.price,
          quantity: qty,
          discountRate: 0,
          totalPrice: lineTotal
        };
        setActiveItemIndex(prev.length);
        return [newItem, ...prev];
      }
    });

    setBarcodeInput('');
    setProductSearch('');
    setTimeout(() => barcodeInputRef.current?.focus(), 50);
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const query = barcodeInput.trim();
    const found = products.find(p => p.barcode === query || p.sku.toLowerCase() === query.toLowerCase());
    if (found) {
      handleAddProductToCart(found, 1);
    } else {
      setFeedback(`Barkod bulunamadı: ${query}`);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleUpdateQuantity = (idx: number, delta: number) => {
    setCart(prev => {
      const item = prev[idx];
      if (!item) return prev;
      const newQty = Math.max(1, item.quantity + delta);
      const lineGross = item.unitPrice * newQty;
      const lineTotal = lineGross - (lineGross * (item.discountRate / 100));
      
      const updated = [...prev];
      updated[idx] = { ...item, quantity: newQty, totalPrice: lineTotal };
      return updated;
    });
  };

  const handleRemoveItem = (idx: number) => {
    setCart(prev => prev.filter((_, i) => i !== idx));
    if (activeItemIndex === idx) setActiveItemIndex(null);
  };

  // Park current cart
  const handleParkCart = () => {
    if (cart.length === 0) return;
    const newParked: ParkedCart = {
      id: `PARK-${Date.now().toString().slice(-4)}`,
      customerName: customerName || 'Perakende Müşteri',
      items: [...cart],
      parkedAt: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      totalAmount: grandTotal
    };
    setParkedCarts(prev => [newParked, ...prev]);
    setCart([]);
    setCustomerName('Perakende Müşteri');
    setReceivedCash('');
    setFeedback(`Sepet bekleme listesine alındı: #${newParked.id}`);
    setTimeout(() => setFeedback(null), 3000);
  };

  // Resume parked cart
  const handleResumeCart = (parked: ParkedCart) => {
    setCart(parked.items);
    setCustomerName(parked.customerName);
    setParkedCarts(prev => prev.filter(p => p.id !== parked.id));
    setFeedback(`Bekleyen sepet geri yüklendi: #${parked.id}`);
    setTimeout(() => setFeedback(null), 3000);
  };

  // Finalize Sale
  const handleCheckout = async (printReceipt = true) => {
    if (cart.length === 0) return;
    if (paymentMethod === 'Nakit' && numericReceived > 0 && numericReceived < grandTotal) {
      setFeedback('Alınan nakit tutarı genel toplamdan az olamaz!');
      return;
    }

    setIsProcessing(true);
    try {
      await onCompleteSale({
        customerName: customerName || 'Perakende Müşteri',
        customerPhone,
        cariId: selectedCustomerId !== 'retail' ? selectedCustomerId : undefined,
        paymentMethod,
        items: cart.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice
        })),
        totalAmount: grandTotal,
        discountAmount: totalDiscount,
        paidAmount: paymentMethod === 'Nakit' ? (numericReceived || grandTotal) : grandTotal,
        changeAmount: paymentMethod === 'Nakit' ? changeAmount : 0
      });

      confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });

      if (printReceipt) {
        printThermalReceipt80mm({
          title: 'ALPHA TEKNİK',
          orderNumber: `POS-${Date.now().toString().slice(-6)}`,
          customerName: customerName || 'Perakende Müşteri',
          customerPhone: customerPhone || undefined,
          items: cart.map(i => ({
            name: i.name,
            qty: i.quantity,
            unit: i.unit,
            price: i.unitPrice,
            total: i.totalPrice
          })),
          totalAmount: grandTotal,
          taxAmount: Math.round(grandTotal * (20 / 120)),
          notes: `Ödeme Şekli: ${paymentMethod} ${paymentMethod === 'Nakit' && numericReceived ? `(Alınan: ${numericReceived} ₺, Para Üstü: ${changeAmount} ₺)` : ''}`,
          documentType: 'SIPARIS_FISI'
        });
      }

      setCart([]);
      setReceivedCash('');
      setGlobalDiscountPercent(0);
      setCustomerName('Perakende Müşteri');
      setCustomerPhone('');
      setSelectedCustomerId('retail');
      setFeedback('Satış başarıyla tamamlandı ve stoktan düşüldü!');
      setTimeout(() => setFeedback(null), 3500);
    } catch (err) {
      console.error(err);
      setFeedback('Satış kaydedilirken hata oluştu!');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-6xl shadow-2xl flex flex-col h-[92vh] text-slate-100 overflow-hidden">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-slate-800 border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
              <Barcode className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-sm sm:text-lg font-bold text-white flex items-center gap-1.5 sm:gap-2">
                <span>HIZLI KASA POS TERMİNALİ</span>
                <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                  Canlı Satış
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 hidden xs:block">Barkod okutun, anında fiş kesin ve depodan düşün</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Parked Carts Button */}
            {parkedCarts.length > 0 && (
              <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-700/60 px-2.5 py-1 sm:py-1.5 rounded-lg border border-slate-600">
                <PauseCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs text-slate-300 hidden md:inline">{parkedCarts.length} Bekleyen Sepet:</span>
                <div className="flex gap-1 overflow-x-auto max-w-[150px] sm:max-w-xs">
                  {parkedCarts.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleResumeCart(p)}
                      className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] rounded border border-amber-500/40 transition-colors flex items-center gap-1 shrink-0"
                    >
                      <PlayCircle className="w-3 h-3" />
                      {p.customerName.slice(0, 8)} ({p.totalAmount.toLocaleString('tr-TR')} ₺)
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className="bg-emerald-500/20 border-b border-emerald-500/40 px-4 sm:px-6 py-2 text-xs sm:text-sm text-emerald-300 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{feedback}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-emerald-400 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Main Work Area */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-y-auto lg:overflow-hidden">
          
          {/* Left: Product Search & Cart Items (7 cols) */}
          <div className="col-span-1 lg:col-span-7 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-900/50 p-3 sm:p-4 overflow-hidden min-h-[360px] lg:min-h-0">
            
            {/* Search and Barcode Input Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-3 shrink-0">
              <form onSubmit={handleBarcodeSubmit} className="relative">
                <Barcode className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-amber-400" />
                <input
                  ref={barcodeInputRef}
                  type="text"
                  value={barcodeInput}
                  onChange={e => setBarcodeInput(e.target.value)}
                  placeholder="Barkod Okutun veya Enter..."
                  className="w-full pl-10 pr-3 py-2 sm:py-2.5 bg-slate-800 border-2 border-amber-500/40 focus:border-amber-400 rounded-xl text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                />
              </form>

              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  placeholder="Ürün adı, SKU veya ara..."
                  className="w-full pl-10 pr-3 py-2 sm:py-2.5 bg-slate-800 border border-slate-700 focus:border-blue-500 rounded-xl text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none"
                />
                
                {/* Search Dropdown Results */}
                {filteredProducts.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-30 overflow-hidden max-h-60 overflow-y-auto divide-y divide-slate-700">
                    {filteredProducts.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleAddProductToCart(p, 1)}
                        className="w-full px-4 py-2.5 text-left hover:bg-slate-700/80 flex items-center justify-between text-xs transition-colors cursor-pointer"
                      >
                        <div>
                          <div className="font-semibold text-white">{p.name}</div>
                          <div className="text-slate-400 font-mono text-[11px]">{p.sku} • Stok: {p.stock} {p.unit}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-amber-400 text-sm">{p.price.toLocaleString('tr-TR')} ₺</div>
                          <div className="text-[10px] text-emerald-400 font-medium">+ Ekle</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Cart Table Container */}
            <div className="flex-1 bg-slate-800/60 rounded-xl border border-slate-700/80 overflow-hidden flex flex-col">
              {/* DESKTOP TABLE HEADER */}
              <div className="hidden sm:grid px-4 py-2.5 bg-slate-800 border-b border-slate-700 grid-cols-12 text-xs font-semibold text-slate-300 uppercase tracking-wider shrink-0">
                <span className="col-span-5">Ürün Adı & Barkod</span>
                <span className="col-span-2 text-right">Fiyat</span>
                <span className="col-span-2 text-center">Miktar</span>
                <span className="col-span-2 text-right">Tutar</span>
                <span className="col-span-1 text-center">Sil</span>
              </div>

              {/* Cart List */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-700/50 p-2 sm:p-0">
                {cart.length === 0 ? (
                  <div className="h-full min-h-[160px] flex flex-col items-center justify-center p-6 text-slate-500">
                    <Receipt className="w-10 h-10 sm:w-12 sm:h-12 mb-2 text-slate-600" />
                    <p className="text-xs sm:text-sm font-medium">Sepette henüz ürün yok</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Barkod okutun veya yukarıdan ürün arayın</p>
                  </div>
                ) : (
                  cart.map((item, idx) => (
                    <div
                      key={item.productId + idx}
                      onClick={() => setActiveItemIndex(idx)}
                      className={`cursor-pointer transition-colors ${
                        activeItemIndex === idx ? 'bg-blue-600/15 border-l-4 border-blue-500' : 'hover:bg-slate-700/40'
                      }`}
                    >
                      {/* DESKTOP ROW */}
                      <div className="hidden sm:grid px-4 py-2.5 grid-cols-12 items-center text-xs">
                        <div className="col-span-5 pr-2">
                          <div className="font-semibold text-white line-clamp-1">{item.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                            <span>{item.sku}</span>
                            {item.discountRate > 0 && (
                              <span className="text-rose-400 font-bold">-%{item.discountRate}</span>
                            )}
                          </div>
                        </div>

                        <div className="col-span-2 text-right font-medium text-slate-200">
                          {item.unitPrice.toLocaleString('tr-TR')} ₺
                        </div>

                        <div className="col-span-2 flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleUpdateQuantity(idx, -1); }}
                            className="w-7 h-7 rounded bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center transition-colors cursor-pointer active:scale-95"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-8 text-center font-bold text-sm text-white font-mono">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleUpdateQuantity(idx, 1); }}
                            className="w-7 h-7 rounded bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center transition-colors cursor-pointer active:scale-95"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="col-span-2 text-right font-bold text-amber-400 text-sm font-mono">
                          {item.totalPrice.toLocaleString('tr-TR')} ₺
                        </div>

                        <div className="col-span-1 text-center">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleRemoveItem(idx); }}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* MOBILE TOUCH CARD */}
                      <div className="block sm:hidden p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-xs text-white line-clamp-1">{item.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1.5">
                              <span>{item.sku}</span>
                              <span>• {item.unitPrice.toLocaleString('tr-TR')} ₺ / {item.unit}</span>
                              {item.discountRate > 0 && (
                                <span className="text-rose-400 font-bold">-%{item.discountRate}</span>
                              )}
                            </div>
                          </div>
                          <div className="font-bold text-sm text-amber-400 font-mono shrink-0">
                            {item.totalPrice.toLocaleString('tr-TR')} ₺
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-center gap-1 bg-slate-700/50 p-0.5 rounded-lg border border-slate-600/60">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleUpdateQuantity(idx, -1); }}
                              className="w-8 h-8 rounded bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center cursor-pointer active:scale-95"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-9 text-center font-bold text-xs text-white font-mono">
                              {item.quantity} {item.unit}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleUpdateQuantity(idx, 1); }}
                              className="w-8 h-8 rounded bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center cursor-pointer active:scale-95"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleRemoveItem(idx); }}
                            className="px-2.5 py-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Sil</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Bottom Quick Action Bar for Cart */}
              <div className="p-3 bg-slate-800/90 border-t border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleParkCart}
                    disabled={cart.length === 0}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-amber-300 rounded-lg font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <PauseCircle className="w-4 h-4" />
                    <span>Beklemeye Al</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCart([])}
                    disabled={cart.length === 0}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-rose-900/40 text-slate-300 hover:text-rose-300 disabled:opacity-40 rounded-lg font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Temizle</span>
                  </button>
                </div>

                <div className="text-slate-400 text-xs">
                  Toplam <strong className="text-white">{cart.reduce((s, i) => s + i.quantity, 0)}</strong> Kalem
                </div>
              </div>
            </div>
          </div>

          {/* Right: Customer Info, Payment Modes, Numpad & Checkout (5 cols) */}
          <div className="col-span-1 lg:col-span-5 flex flex-col bg-slate-900 p-3 sm:p-4 overflow-y-auto space-y-3 sm:space-y-4">
            
            {/* Customer Selector */}
            <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 space-y-2.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-blue-400" />
                Müşteri / Cari Hesap Seçimi
              </label>

              <div className="grid grid-cols-1 gap-2">
                <select
                  value={selectedCustomerId}
                  onChange={e => {
                    const cid = e.target.value;
                    setSelectedCustomerId(cid);
                    if (cid === 'retail') {
                      setCustomerName('Perakende Müşteri');
                      setCustomerPhone('');
                    } else {
                      const foundCari = cariler.find(c => c.id === cid);
                      if (foundCari) {
                        setCustomerName(foundCari.companyName || foundCari.name);
                        setCustomerPhone(foundCari.phone || '');
                      }
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="retail">👤 Perakende Müşteri (Tezgah Satış)</option>
                  {cariler.map(c => (
                    <option key={c.id} value={c.id}>
                      🏢 {c.companyName || c.name} (Bakiye: {c.balance.toLocaleString('tr-TR')} ₺)
                    </option>
                  ))}
                </select>

                {selectedCustomerId === 'retail' && (
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      placeholder="Müşteri Adı"
                      className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                    />
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      placeholder="Telefon (İsteğe bağlı)"
                      className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="bg-slate-800/80 p-3 sm:p-3.5 rounded-xl border border-slate-700 space-y-2">
              <label className="text-xs font-semibold text-slate-300">Ödeme Şekli</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {[
                  { id: 'Nakit', label: 'Nakit', icon: Wallet, color: 'text-emerald-400' },
                  { id: 'Kredi Kartı', label: 'POS / Kart', icon: CreditCard, color: 'text-blue-400' },
                  { id: 'Cari Hesap', label: 'Cari Hesap', icon: Building2, color: 'text-amber-400' },
                  { id: 'Havale/EFT', label: 'Havale', icon: Receipt, color: 'text-purple-400' },
                ].map(mode => {
                  const Icon = mode.icon;
                  const active = paymentMethod === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setPaymentMethod(mode.id as any)}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 text-xs font-medium transition-all cursor-pointer active:scale-95 ${
                        active
                          ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/20'
                          : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${active ? 'text-white' : mode.color}`} />
                      <span>{mode.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Cash Tender & Numpad (for Nakit payments) */}
            {paymentMethod === 'Nakit' && (
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-2">
                <div className="flex flex-wrap justify-between items-center gap-1 text-xs">
                  <span className="text-slate-300 font-semibold">Alınan Nakit:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[50, 100, 200, 500, 1000].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setReceivedCash(val.toString())}
                        className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 active:scale-95 text-xs rounded-lg text-emerald-400 font-mono font-bold transition-colors cursor-pointer"
                      >
                        +{val}₺
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setReceivedCash(grandTotal.toString())}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 active:scale-95 text-xs rounded-lg text-white font-bold transition-colors cursor-pointer"
                    >
                      Tam
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={receivedCash}
                    onChange={e => setReceivedCash(e.target.value)}
                    placeholder={`Alınan ₺ (Örn: ${grandTotal})`}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                  />
                  <div className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-right">
                    <span className="text-[10px] text-slate-400 block">Para Üstü:</span>
                    <span className="text-sm font-black text-rose-400 font-mono">
                      {changeAmount > 0 ? `${changeAmount.toLocaleString('tr-TR')} ₺` : '0 ₺'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Discount Adjustment */}
            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
                <Percent className="w-4 h-4 text-amber-400" />
                Genel İskonto:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {[0, 5, 10, 15, 20].map(pct => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setGlobalDiscountPercent(pct)}
                    className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-colors cursor-pointer active:scale-95 ${
                      globalDiscountPercent === pct
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                    }`}
                  >
                    %{pct}
                  </button>
                ))}
              </div>
            </div>

            {/* Calculation Totals */}
            <div className="bg-slate-800/90 p-4 rounded-xl border border-slate-700 space-y-2 mt-auto">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Ara Toplam:</span>
                <span className="font-mono">{subtotal.toLocaleString('tr-TR')} ₺</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-xs text-rose-400">
                  <span>Toplam İndirim / İskonto:</span>
                  <span className="font-mono">-{totalDiscount.toLocaleString('tr-TR')} ₺</span>
                </div>
              )}
              <div className="flex justify-between text-xs text-slate-400">
                <span>Hesaplanan KDV (%20 Dahil):</span>
                <span className="font-mono">{Math.round(grandTotal * (20 / 120)).toLocaleString('tr-TR')} ₺</span>
              </div>
              <div className="border-t border-slate-700 pt-2 flex justify-between items-baseline">
                <span className="text-sm font-bold text-white">GENEL TOPLAM:</span>
                <span className="text-2xl font-black text-amber-400 font-mono">
                  {grandTotal.toLocaleString('tr-TR')} ₺
                </span>
              </div>
            </div>

            {/* Checkout Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleCheckout(true)}
                disabled={cart.length === 0 || isProcessing}
                className="py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all"
              >
                <Printer className="w-5 h-5" />
                <span>Sat & Fiş Yazdır</span>
              </button>

              <button
                type="button"
                onClick={() => handleCheckout(false)}
                disabled={cart.length === 0 || isProcessing}
                className="py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Fişsiz Tamamla</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
