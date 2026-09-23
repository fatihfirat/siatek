import React, { useState, useEffect } from 'react';
import { 
  Order, 
  Quote, 
  Product, 
  EInvoice, 
  EInvoiceProfile, 
  EInvoiceType, 
  CariAccount 
} from '../../types';
import { 
  X, 
  Plus, 
  Trash2, 
  FileText, 
  ShoppingBag, 
  Building2, 
  User, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Send, 
  Save,
  Layers,
  Search,
  Calculator
} from 'lucide-react';
import { formatTRY } from '../../utils/exportUtils';
import { numberToTurkishWords } from '../../utils/eInvoiceUtils';
import { useModalBehavior } from '../../hooks/useModalBehavior';

interface ItemRow {
  id: string;
  name: string;
  sku?: string;
  quantity: number;
  unit: string;
  unitPrice: number; // KDV Hariç
  discountPercent: number;
  vatRate: number;
  tevkifatCode?: string;
  tevkifatRate?: string;
}

interface EInvoiceCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  quotes: Quote[];
  products: Product[];
  initialOrder?: Order | null;
  initialQuote?: Quote | null;
  onSuccess: (invoice: EInvoice) => void;
}

const TEVKIFAT_CODES = [
  { code: '601', name: 'Yapım İşleri ve Mühendislik-Mimarlık Hizmetleri', rate: '5/10' },
  { code: '602', name: 'Temizlik, Çevre ve Bahçe Bakım Hizmetleri', rate: '7/10' },
  { code: '603', name: 'Özel Güvenlik Hizmeti', rate: '9/10' },
  { code: '604', name: 'Makine, Teçhizat, Demirbaş Bakım ve Onarım', rate: '7/10' },
  { code: '608', name: 'İşgücü Temin Hizmetleri', rate: '9/10' },
  { code: '609', name: 'Yapı Denetim Hizmetleri', rate: '9/10' },
  { code: '610', name: 'Diğer Hizmetler (KDV Genel Uygulama Tebliği)', rate: '5/10' },
];

export default function EInvoiceCreateModal({
  isOpen,
  onClose,
  orders = [],
  quotes = [],
  products = [],
  initialOrder,
  initialQuote,
  onSuccess,
}: EInvoiceCreateModalProps) {
  const [sourceType, setSourceType] = useState<'manual' | 'order' | 'quote'>('manual');
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>('');

  // Customer / Buyer Info
  const [customerTitle, setCustomerTitle] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerVknTckn, setCustomerVknTckn] = useState('');
  const [customerTaxOffice, setCustomerTaxOffice] = useState('');
  const [customerAddress, setCustomerAddress] = useState('Batıkent Mah. Karaköprü / Şanlıurfa');
  const [customerCity, setCustomerCity] = useState('Şanlıurfa');
  const [customerDistrict, setCustomerDistrict] = useState('Karaköprü');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [isEInvoicePayer, setIsEInvoicePayer] = useState(true);

  // Invoice Profile & Type
  const [profile, setProfile] = useState<EInvoiceProfile>('TICARIFATURA');
  const [type, setType] = useState<EInvoiceType>('SATIS');
  const [invoiceDate, setInvoiceDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [despatchNumber, setDespatchNumber] = useState('');
  const [despatchDate, setDespatchDate] = useState('');
  const [orderNumber, setOrderNumber] = useState('');

  // Cariler for auto-complete
  const [cariler, setCariler] = useState<CariAccount[]>([]);
  const [selectedCariId, setSelectedCariId] = useState<string>('');
  const [autoProcessCari, setAutoProcessCari] = useState(true);

  // Items
  const [items, setItems] = useState<ItemRow[]>([
    {
      id: 'row-1',
      name: 'E.C.A. Proteus Premix 24 kW Tam Yoğuşmalı Kombi',
      sku: 'ST00101',
      quantity: 1,
      unit: 'ADET',
      unitPrice: 24500,
      discountPercent: 0,
      vatRate: 20,
    }
  ]);

  // Notes & Bank
  const [notes, setNotes] = useState<string>('Mallar eksiksiz ve hasarsız teslim edilmiştir.\nÖdeme Kuveyt Türk hesabımıza yapılacaktır.');
  const [paymentMethod, setPaymentMethod] = useState<'Havale/EFT' | 'Kredi Kartı' | 'Nakit' | 'Cari Hesap'>('Cari Hesap');
  const [bankIban, setBankIban] = useState('TR84 0020 5000 0987 6543 2100 01');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch Cariler for lookup
  useEffect(() => {
    fetch('/api/cariler')
      .then(res => res.json())
      .then(data => {
        if (data && data.cariler) {
          setCariler(data.cariler);
        }
      })
      .catch(() => {});
  }, []);

  // Pre-fill if initialOrder or initialQuote passed
  useEffect(() => {
    if (initialOrder) {
      loadFromOrder(initialOrder);
    } else if (initialQuote) {
      loadFromQuote(initialQuote);
    }
  }, [initialOrder, initialQuote]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Auto-detect E-Fatura payer based on VKN length (10 digits = Kurumsal VKN / E-Fatura, 11 digits = Şahıs TCKN / E-Arşiv)
  const handleVknChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 11);
    setCustomerVknTckn(clean);

    // Auto-match Cari if available
    const matchedCari = cariler.find(c => c.taxNumber === clean);
    if (matchedCari) {
      setCustomerTitle(matchedCari.companyName);
      setCustomerName(matchedCari.name);
      setCustomerTaxOffice(matchedCari.taxOffice || '');
      setCustomerCity(matchedCari.city || 'Şanlıurfa');
      setCustomerAddress(matchedCari.address || '');
      setCustomerPhone(matchedCari.phone || '');
      setCustomerEmail(matchedCari.email || '');
      setSelectedCariId(matchedCari.id);
    }

    if (clean.length === 10) {
      setIsEInvoicePayer(true);
      if (profile === 'EARSIVFATURA') setProfile('TICARIFATURA');
    } else if (clean.length === 11) {
      setIsEInvoicePayer(false);
      setProfile('EARSIVFATURA');
    }
  };

  const handleCariSelect = (cariId: string) => {
    setSelectedCariId(cariId);
    const c = cariler.find(item => item.id === cariId);
    if (c) {
      setCustomerTitle(c.companyName);
      setCustomerName(c.name);
      setCustomerVknTckn(c.taxNumber || '');
      setCustomerTaxOffice(c.taxOffice || '');
      setCustomerCity(c.city || 'Şanlıurfa');
      setCustomerAddress(c.address || '');
      setCustomerPhone(c.phone || '');
      setCustomerEmail(c.email || '');

      const is10 = (c.taxNumber || '').length === 10;
      setIsEInvoicePayer(is10);
      setProfile(is10 ? 'TICARIFATURA' : 'EARSIVFATURA');
    }
  };

  const loadFromOrder = (ord: Order) => {
    setSourceType('order');
    setSelectedOrderId(ord.id);
    setCustomerTitle(ord.customerName);
    setCustomerName(ord.customerName);
    setCustomerPhone(ord.customerPhone);
    setCustomerEmail(ord.customerEmail);
    setCustomerAddress(ord.customerAddress || 'Şanlıurfa');
    setOrderNumber(ord.orderNumber);
    if (ord.trackingNumber) {
      setDespatchNumber(`IRS-${ord.trackingNumber}`);
      setDespatchDate(new Date().toISOString().split('T')[0]);
    }

    // Try match cari
    const matchedCari = cariler.find(c => 
      c.companyName.toLowerCase().includes(ord.customerName.toLowerCase()) ||
      c.email.toLowerCase() === ord.customerEmail.toLowerCase()
    );
    if (matchedCari) {
      setSelectedCariId(matchedCari.id);
      setCustomerVknTckn(matchedCari.taxNumber || '11111111111');
      setCustomerTaxOffice(matchedCari.taxOffice || '');
      setIsEInvoicePayer(matchedCari.taxNumber?.length === 10);
      setProfile(matchedCari.taxNumber?.length === 10 ? 'TICARIFATURA' : 'EARSIVFATURA');
    } else {
      setCustomerVknTckn('11111111111');
      setIsEInvoicePayer(false);
      setProfile('EARSIVFATURA');
    }

    // Convert items
    const newItems: ItemRow[] = ord.items.map((it, idx) => {
      const priceExVat = (it.unitPrice || (it.totalPrice / (it.quantity || 1))) / 1.20;
      return {
        id: `row-ord-${idx}`,
        name: it.productName,
        quantity: it.quantity,
        unit: it.unit || 'ADET',
        unitPrice: Math.round(priceExVat * 100) / 100,
        discountPercent: 0,
        vatRate: 20,
      };
    });
    setItems(newItems.length > 0 ? newItems : items);
    setNotes(`${ord.orderNumber} numaralı siparişe istinaden düzenlenmiştir.`);
  };

  const loadFromQuote = (qt: Quote) => {
    setSourceType('quote');
    setSelectedQuoteId(qt.id);
    setCustomerTitle(qt.customerCompany || qt.customerName);
    setCustomerName(qt.customerName);
    setCustomerPhone(qt.customerPhone);
    setCustomerEmail(qt.customerEmail);
    setCustomerCity(qt.deliveryCity || 'Şanlıurfa');
    setOrderNumber(qt.quoteNumber);

    const matchedCari = cariler.find(c => 
      (qt.customerCompany && c.companyName.toLowerCase().includes(qt.customerCompany.toLowerCase())) ||
      c.name.toLowerCase().includes(qt.customerName.toLowerCase())
    );
    if (matchedCari) {
      setSelectedCariId(matchedCari.id);
      setCustomerVknTckn(matchedCari.taxNumber || '11111111111');
      setCustomerTaxOffice(matchedCari.taxOffice || '');
      setIsEInvoicePayer(matchedCari.taxNumber?.length === 10);
      setProfile(matchedCari.taxNumber?.length === 10 ? 'TICARIFATURA' : 'EARSIVFATURA');
    } else {
      setCustomerVknTckn('11111111111');
      setIsEInvoicePayer(false);
      setProfile('EARSIVFATURA');
    }

    if (qt.offeredItems && qt.offeredItems.length > 0) {
      const newItems: ItemRow[] = qt.offeredItems.map((it, idx) => ({
        id: `row-qt-${idx}`,
        name: it.productName,
        quantity: it.quantity,
        unit: it.unit || 'ADET',
        unitPrice: it.offeredUnitPrice || (it.listPrice * 0.85),
        discountPercent: it.discountRate || 0,
        vatRate: 20,
      }));
      setItems(newItems);
    }
    setNotes(`${qt.quoteNumber} numaralı onaylı teklife istinaden faturalandırılmıştır.`);
  };

  // Add Item Row
  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      {
        id: `row-${Date.now()}`,
        name: '',
        quantity: 1,
        unit: 'ADET',
        unitPrice: 0,
        discountPercent: 0,
        vatRate: 20,
      }
    ]);
  };

  // Remove Item Row
  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter(i => i.id !== id));
  };

  // Update Item Row
  const handleUpdateItem = (id: string, updates: Partial<ItemRow>) => {
    setItems(prev => prev.map(i => {
      if (i.id === id) {
        const updated = { ...i, ...updates };
        // If tevkifat selected and tevkifatCode changed
        if (updates.tevkifatCode !== undefined) {
          const tev = TEVKIFAT_CODES.find(t => t.code === updates.tevkifatCode);
          if (tev) {
            updated.tevkifatRate = tev.rate;
          } else {
            updated.tevkifatRate = undefined;
          }
        }
        return updated;
      }
      return i;
    }));
  };

  // Quick Select Product for a Row
  const handleSelectProduct = (rowId: string, productId: string) => {
    const p = products.find(prod => prod.id === productId);
    if (!p) return;
    const priceExVat = p.price / 1.20;
    handleUpdateItem(rowId, {
      name: p.name,
      sku: p.sku,
      unit: p.unit || 'ADET',
      unitPrice: Math.round(priceExVat * 100) / 100,
      vatRate: p.vatRate || 20,
    });
  };

  // Real-time calculation of totals
  let subtotal = 0;
  let totalDiscount = 0;
  let totalVat = 0;
  let totalTevkifat = 0;

  items.forEach(it => {
    const raw = (it.quantity || 1) * (it.unitPrice || 0);
    const disc = (raw * (it.discountPercent || 0)) / 100;
    const net = raw - disc;
    const vat = (net * (it.vatRate || 0)) / 100;

    let tevk = 0;
    if (type === 'TEVKIFAT' && it.tevkifatRate) {
      const parts = it.tevkifatRate.split('/');
      if (parts.length === 2) {
        const n = Number(parts[0]);
        const d = Number(parts[1]);
        if (d > 0) tevk = (vat * n) / d;
      }
    }

    subtotal += raw;
    totalDiscount += disc;
    totalVat += vat;
    totalTevkifat += tevk;
  });

  const taxExclusiveAmount = subtotal - totalDiscount;
  const payableAmount = taxExclusiveAmount + totalVat - totalTevkifat;
  const wordsAmount = numberToTurkishWords(payableAmount);

  // Submit invoice to server
  const handleSubmit = async (andSendToGib: boolean) => {
    setError(null);
    if (!customerTitle.trim()) {
      setError('Lütfen Müşteri Ünvanı giriniz.');
      return;
    }
    if (!customerVknTckn.trim()) {
      setError('Lütfen Müşteri VKN veya TCKN giriniz.');
      return;
    }
    if (items.some(it => !it.name.trim() || it.unitPrice <= 0)) {
      setError('Lütfen tüm fatura satırlarında ürün adı ve birim fiyat belirtiniz.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        sourceType,
        sourceId: sourceType === 'order' ? selectedOrderId : sourceType === 'quote' ? selectedQuoteId : undefined,
        sourceNumber: orderNumber || undefined,
        profile,
        type,
        customerCariId: selectedCariId || undefined,
        customerTitle: customerTitle.trim(),
        customerName: customerName.trim() || customerTitle.trim(),
        customerVknTckn: customerVknTckn.trim(),
        customerTaxOffice: customerTaxOffice.trim() || undefined,
        customerAddress: customerAddress.trim() || 'Şanlıurfa',
        customerCity: customerCity.trim() || 'Şanlıurfa',
        customerDistrict: customerDistrict.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        customerEmail: customerEmail.trim() || undefined,
        isEInvoicePayer,
        invoiceDate,
        despatchNumber: despatchNumber || undefined,
        despatchDate: despatchDate || undefined,
        orderNumber: orderNumber || undefined,
        items: items.map(it => ({
          name: it.name,
          sku: it.sku,
          quantity: Number(it.quantity) || 1,
          unit: it.unit || 'ADET',
          unitPrice: Number(it.unitPrice) || 0,
          discountPercent: Number(it.discountPercent) || 0,
          vatRate: Number(it.vatRate) || 20,
          tevkifatCode: type === 'TEVKIFAT' ? it.tevkifatCode : undefined,
          tevkifatRate: type === 'TEVKIFAT' ? it.tevkifatRate : undefined,
        })),
        notes: notes.split('\n').filter(n => n.trim().length > 0),
        paymentMethod,
        bankIban,
        autoProcessCari,
      };

      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Fatura oluşturulamadı.');
      }

      let finalInvoice: EInvoice = data.invoice;

      // If andSendToGib was clicked, transmit immediately
      if (andSendToGib && finalInvoice.id) {
        const sendRes = await fetch(`/api/invoices/${finalInvoice.id}/send-gib`, {
          method: 'POST',
        });
        const sendData = await sendRes.json();
        if (!sendRes.ok || !sendData.success) {
          throw new Error(sendData.error || 'GİB gönderimi başarısız oldu.');
        }
        if (sendData.invoice) {
          finalInvoice = sendData.invoice;
        }
      }

      onSuccess(finalInvoice);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Fatura kaydedilirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useModalBehavior(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-4xl bg-base-surface text-text-primary rounded-3xl shadow-2xl border border-border flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="p-4 sm:px-6 border-b border-border flex items-center justify-between bg-base-surface-2/60 rounded-t-3xl">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-success-fill/15 border border-success-border flex items-center justify-center text-success-text font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-text-primary">
                Yeni GİB E-Fatura / E-Arşiv Taslağı
              </h2>
              <p className="text-xs text-text-muted">
                UBL-TR 2.1 standardında resmi e-fatura & e-arşiv belgesi oluşturma sihirbazı
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-text-muted hover:text-text-primary hover:bg-base-surface transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

          {error && (
            <div className="p-3.5 rounded-2xl bg-danger-fill/15 border border-danger-border text-danger-text text-xs flex items-center space-x-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. SOURCE SELECTION WIZARD TABS */}
          <div className="p-3.5 rounded-2xl bg-base-surface-2 border border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-info-text" />
                <span>Kaynak Belge Seçimi</span>
              </span>
              <span className="text-[11px] text-text-muted">
                Sipariş veya tekliften tüm kalemler otomatik aktarılır
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSourceType('manual')}
                className={`p-2.5 rounded-xl text-xs font-bold border text-left transition-all cursor-pointer flex items-center space-x-2 ${
                  sourceType === 'manual'
                    ? 'bg-base-surface text-text-primary border-border-strong ring-1 ring-border-strong shadow-xs'
                    : 'bg-base-surface/40 text-text-secondary border-border/50 hover:bg-base-surface/70'
                }`}
              >
                <FileText className="w-4 h-4 text-warning-text shrink-0" />
                <div>
                  <div>Sıfırdan Manuel Fatura</div>
                  <div className="text-[10px] text-text-muted font-normal">Serbest kalem girişi</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSourceType('order')}
                className={`p-2.5 rounded-xl text-xs font-bold border text-left transition-all cursor-pointer flex items-center space-x-2 ${
                  sourceType === 'order'
                    ? 'bg-bg-success text-success-text border-success-border ring-1 ring-success-border shadow-xs'
                    : 'bg-base-surface/40 text-text-secondary border-border/50 hover:bg-base-surface/70'
                }`}
              >
                <ShoppingBag className="w-4 h-4 text-success-text shrink-0" />
                <div>
                  <div>Siparişten Dönüştür</div>
                  <div className="text-[10px] text-text-muted font-normal">Gelen siparişi faturalandır</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSourceType('quote')}
                className={`p-2.5 rounded-xl text-xs font-bold border text-left transition-all cursor-pointer flex items-center space-x-2 ${
                  sourceType === 'quote'
                    ? 'bg-bg-warning text-warning-text border-warning-border ring-1 ring-warning-border shadow-xs'
                    : 'bg-base-surface/40 text-text-secondary border-border/50 hover:bg-base-surface/70'
                }`}
              >
                <Sparkles className="w-4 h-4 text-warning-text shrink-0" />
                <div>
                  <div>Tekliften Dönüştür</div>
                  <div className="text-[10px] text-text-muted font-normal">Onaylanan teklifi aktar</div>
                </div>
              </button>
            </div>

            {/* If Order selected */}
            {sourceType === 'order' && (
              <div className="pt-2 border-t border-border flex flex-col sm:flex-row items-center gap-2">
                <span className="text-xs font-medium text-text-secondary shrink-0">Faturalandırılacak Sipariş:</span>
                <select
                  value={selectedOrderId}
                  onChange={(e) => {
                    const ord = orders.find(o => o.id === e.target.value);
                    if (ord) loadFromOrder(ord);
                  }}
                  className="flex-1 w-full bg-base-surface border border-border rounded-xl px-3 py-1.5 text-xs text-text-primary focus:outline-hidden focus:ring-1 focus:ring-success-border"
                >
                  <option value="">-- Sipariş Seçiniz ({orders.length} Adet) --</option>
                  {orders.map(ord => (
                    <option key={ord.id} value={ord.id}>
                      {ord.orderNumber} • {ord.customerName} ({formatTRY(ord.total)}) - {new Date(ord.createdAt).toLocaleDateString('tr-TR')}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* If Quote selected */}
            {sourceType === 'quote' && (
              <div className="pt-2 border-t border-border flex flex-col sm:flex-row items-center gap-2">
                <span className="text-xs font-medium text-text-secondary shrink-0">Faturalandırılacak Teklif:</span>
                <select
                  value={selectedQuoteId}
                  onChange={(e) => {
                    const qt = quotes.find(q => q.id === e.target.value);
                    if (qt) loadFromQuote(qt);
                  }}
                  className="flex-1 w-full bg-base-surface border border-border rounded-xl px-3 py-1.5 text-xs text-text-primary focus:outline-hidden focus:ring-1 focus:ring-warning-border"
                >
                  <option value="">-- Teklif Seçiniz ({quotes.length} Adet) --</option>
                  {quotes.map(qt => (
                    <option key={qt.id} value={qt.id}>
                      {qt.quoteNumber} • {qt.customerCompany || qt.customerName} ({formatTRY(qt.grandTotal || 0)}) - {qt.status}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 2. GİB PROFILE & TYPE CONFIGURATION */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">
                Fatura Senaryosu
              </label>
              <select
                value={profile}
                onChange={(e) => setProfile(e.target.value as EInvoiceProfile)}
                className="w-full bg-base-surface border border-border rounded-xl px-3 py-2 text-xs font-semibold text-text-primary"
              >
                <option value="TICARIFATURA">TICARIFATURA (Ticari Onaylı)</option>
                <option value="TEMELFATURA">TEMELFATURA (Temel Fatura)</option>
                <option value="EARSIVFATURA">EARSIVFATURA (E-Arşiv Portal)</option>
                <option value="KAMU">KAMU (Kamu Kurumu Faturası)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">
                Fatura Tipi
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as EInvoiceType)}
                className="w-full bg-base-surface border border-border rounded-xl px-3 py-2 text-xs font-semibold text-text-primary"
              >
                <option value="SATIS">SATIS (Mal / Hizmet Satışı)</option>
                <option value="TEVKIFAT">TEVKIFAT (KDV Tevkifatlı)</option>
                <option value="IADE">IADE (Satış İade Faturası)</option>
                <option value="ISTISNA">ISTISNA (KDV İstisnası)</option>
                <option value="IHRACAT">IHRACAT (İhracat Faturası)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">
                Düzenleme Tarihi
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full bg-base-surface border border-border rounded-xl px-3 py-2 text-xs text-text-primary font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">
                Ödeme Yöntemi
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full bg-base-surface border border-border rounded-xl px-3 py-2 text-xs text-text-primary"
              >
                <option value="Cari Hesap">Cari Hesap (Açık Hesap)</option>
                <option value="Havale/EFT">Banka Havalesi / EFT</option>
                <option value="Kredi Kartı">Kredi Kartı / Sanal POS</option>
                <option value="Nakit">Nakit / Kasadan Tahsilat</option>
              </select>
            </div>
          </div>

          {/* 3. BUYER / CUSTOMER SECTION */}
          <div className="p-4 rounded-2xl bg-base-surface-2 border border-border space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-2">
              <span className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center space-x-1.5">
                <Building2 className="w-3.5 h-3.5 text-success-text" />
                <span>Alıcı (Müşteri) Vergi & İletişim Bilgileri</span>
              </span>

              {/* Quick Cari Selector */}
              {cariler.length > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] text-text-muted shrink-0">Kayıtlı Cari:</span>
                  <select
                    value={selectedCariId}
                    onChange={(e) => handleCariSelect(e.target.value)}
                    className="bg-base-surface border border-border rounded-lg px-2 py-1 text-[11px] text-text-primary"
                  >
                    <option value="">-- Cari Seçiniz --</option>
                    {cariler.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.code} • {c.companyName} ({c.type})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                  Şirket Ünvanı / Müşteri Adı <span className="text-danger-text">*</span>
                </label>
                <input
                  type="text"
                  value={customerTitle}
                  onChange={(e) => setCustomerTitle(e.target.value)}
                  placeholder="Örn: Fırat Isı Sistemleri Ltd. Şti."
                  className="w-full bg-base-surface border border-border rounded-xl px-3 py-2 text-xs text-text-primary font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-text-secondary mb-1 flex items-center justify-between">
                  <span>VKN / TCKN <span className="text-danger-text">*</span></span>
                  <span className="text-[10px] text-text-muted font-normal">
                    {customerVknTckn.length === 10 ? '10 Hane (Kurumsal)' : customerVknTckn.length === 11 ? '11 Hane (Bireysel)' : ''}
                  </span>
                </label>
                <input
                  type="text"
                  value={customerVknTckn}
                  onChange={(e) => handleVknChange(e.target.value)}
                  placeholder="10 Hane VKN veya 11 Hane TCKN"
                  className="w-full bg-base-surface border border-border rounded-xl px-3 py-2 text-xs text-text-primary font-mono font-bold"
                  maxLength={11}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                  Vergi Dairesi
                </label>
                <input
                  type="text"
                  value={customerTaxOffice}
                  onChange={(e) => setCustomerTaxOffice(e.target.value)}
                  placeholder="Örn: Şehitkamil V.D."
                  className="w-full bg-base-surface border border-border rounded-xl px-3 py-2 text-xs text-text-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                  Şehir / İlçe
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={customerCity}
                    onChange={(e) => setCustomerCity(e.target.value)}
                    placeholder="Şehir"
                    className="w-1/2 bg-base-surface border border-border rounded-xl px-3 py-2 text-xs text-text-primary"
                  />
                  <input
                    type="text"
                    value={customerDistrict}
                    onChange={(e) => setCustomerDistrict(e.target.value)}
                    placeholder="İlçe"
                    className="w-1/2 bg-base-surface border border-border rounded-xl px-3 py-2 text-xs text-text-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                  Telefon & E-Posta
                </label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="05xx xxx xx xx"
                  className="w-full bg-base-surface border border-border rounded-xl px-3 py-2 text-xs text-text-primary font-mono"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                  Açık Adres
                </label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="Mahalle, Cadde/Sokak, Bina No, Şanlıurfa"
                  className="w-full bg-base-surface border border-border rounded-xl px-3 py-2 text-xs text-text-primary"
                />
              </div>
            </div>

            {/* E-Invoice / E-Archive Badge Detector */}
            <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isEInvoicePayer ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                <span className="font-semibold text-text-primary">
                  {isEInvoicePayer ? 'E-Fatura Mükellefi (GİB Posta Kutusu)' : 'E-Arşiv Fatura Alıcısı (GİB Portal / Bireysel)'}
                </span>
              </div>
              <label className="flex items-center space-x-2 text-text-secondary text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={isEInvoicePayer}
                  onChange={(e) => {
                    setIsEInvoicePayer(e.target.checked);
                    if (e.target.checked && profile === 'EARSIVFATURA') setProfile('TICARIFATURA');
                    if (!e.target.checked) setProfile('EARSIVFATURA');
                  }}
                  className="rounded border-border text-success-fill focus:ring-0"
                />
                <span>E-Fatura Mükellefiyeti Manuel Zorla</span>
              </label>
            </div>
          </div>

          {/* 4. ITEMS TABLE EDITOR */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center space-x-1.5">
                <Calculator className="w-3.5 h-3.5 text-warning-text" />
                <span>Mal / Hizmet Satırları ({items.length} Kalem)</span>
              </span>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-3 py-1.5 rounded-xl bg-base-surface-2 hover:bg-base-surface border border-border text-xs font-bold text-text-primary flex items-center space-x-1 cursor-pointer transition-all"
              >
                <Plus className="w-3.5 h-3.5 text-success-text" />
                <span>Satır Ekle</span>
              </button>
            </div>

            <div className="border border-border rounded-2xl overflow-hidden bg-base-surface">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs min-w-[700px]">
                  <thead>
                    <tr className="bg-base-surface-2 border-b border-border text-text-secondary text-[11px] font-bold">
                      <th className="py-2.5 px-3 w-8">#</th>
                      <th className="py-2.5 px-3">Mal / Hizmet Açıklaması</th>
                      <th className="py-2.5 px-2 w-16 text-center">Miktar</th>
                      <th className="py-2.5 px-2 w-20 text-center">Birim</th>
                      <th className="py-2.5 px-2 w-28 text-right">Birim Fiyat (₺)</th>
                      <th className="py-2.5 px-2 w-16 text-center">İsk.%</th>
                      <th className="py-2.5 px-2 w-16 text-center">KDV%</th>
                      {type === 'TEVKIFAT' && <th className="py-2.5 px-2 w-32">Tevkifat Kodu</th>}
                      <th className="py-2.5 px-3 w-28 text-right">Satır Tutarı</th>
                      <th className="py-2.5 px-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.map((item, idx) => {
                      const raw = (item.quantity || 1) * (item.unitPrice || 0);
                      const disc = (raw * (item.discountPercent || 0)) / 100;
                      const net = raw - disc;
                      const vat = (net * (item.vatRate || 0)) / 100;
                      const lineTotal = net + vat;

                      return (
                        <tr key={item.id} className="hover:bg-base-surface-2/40">
                          <td className="py-2 px-3 text-center text-text-muted font-mono">{idx + 1}</td>
                          <td className="py-2 px-3 space-y-1">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => handleUpdateItem(item.id, { name: e.target.value })}
                              placeholder="Ürün veya Hizmet Tanımı"
                              className="w-full bg-base-surface-2 border border-border/70 rounded-lg px-2 py-1 text-xs text-text-primary"
                            />
                            {/* Fast catalog selector */}
                            <select
                              onChange={(e) => handleSelectProduct(item.id, e.target.value)}
                              className="w-full bg-base-surface border border-border/50 rounded text-[10px] text-text-muted py-0.5 px-1"
                              defaultValue=""
                            >
                              <option value="" disabled>-- Stok Kataloğundan Hızlı Doldur --</option>
                              {products.slice(0, 30).map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({formatTRY(p.price)})</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleUpdateItem(item.id, { quantity: Math.max(1, Number(e.target.value)) })}
                              className="w-full text-center bg-base-surface-2 border border-border/70 rounded-lg px-1.5 py-1 font-mono font-bold text-xs text-text-primary"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <select
                              value={item.unit}
                              onChange={(e) => handleUpdateItem(item.id, { unit: e.target.value })}
                              className="w-full bg-base-surface-2 border border-border/70 rounded-lg px-1 py-1 text-xs text-text-primary"
                            >
                              <option value="ADET">ADET</option>
                              <option value="METRE">METRE</option>
                              <option value="SET">SET</option>
                              <option value="PAKET">PAKET</option>
                              <option value="KOLİ">KOLİ</option>
                              <option value="KG">KG</option>
                            </select>
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.unitPrice}
                              onChange={(e) => handleUpdateItem(item.id, { unitPrice: Math.max(0, Number(e.target.value)) })}
                              className="w-full text-right bg-base-surface-2 border border-border/70 rounded-lg px-2 py-1 font-mono text-xs text-text-primary"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={item.discountPercent}
                              onChange={(e) => handleUpdateItem(item.id, { discountPercent: Number(e.target.value) })}
                              className="w-full text-center bg-base-surface-2 border border-border/70 rounded-lg px-1 py-1 font-mono text-xs text-text-primary"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <select
                              value={item.vatRate}
                              onChange={(e) => handleUpdateItem(item.id, { vatRate: Number(e.target.value) })}
                              className="w-full bg-base-surface-2 border border-border/70 rounded-lg px-1 py-1 text-xs text-text-primary"
                            >
                              <option value="20">%20</option>
                              <option value="10">%10</option>
                              <option value="1">%1</option>
                              <option value="0">%0</option>
                            </select>
                          </td>
                          {type === 'TEVKIFAT' && (
                            <td className="py-2 px-2">
                              <select
                                value={item.tevkifatCode || ''}
                                onChange={(e) => handleUpdateItem(item.id, { tevkifatCode: e.target.value })}
                                className="w-full bg-base-surface-2 border border-border/70 rounded-lg px-1 py-1 text-[11px] text-text-primary"
                              >
                                <option value="">Tevkifat Yok</option>
                                {TEVKIFAT_CODES.map(t => (
                                  <option key={t.code} value={t.code}>
                                    {t.code} - {t.rate} ({t.name.slice(0, 16)}...)
                                  </option>
                                ))}
                              </select>
                            </td>
                          )}
                          <td className="py-2 px-3 text-right font-mono font-bold text-text-primary">
                            {formatTRY(lineTotal)}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              disabled={items.length <= 1}
                              className="p-1 rounded-lg text-text-muted hover:text-danger-text hover:bg-danger-fill/15 disabled:opacity-30 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 5. NOTES & SUMMARY CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            {/* Notes and Cari Process (7 cols) */}
            <div className="sm:col-span-7 space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">
                  Fatura Notları & Banka IBAN
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-base-surface border border-border rounded-xl p-2.5 text-xs text-text-primary leading-relaxed"
                />
              </div>

              {/* Cari Auto Sync Toggle */}
              <div className="p-3 rounded-xl bg-info-fill/10 border border-info-border text-xs flex items-center justify-between">
                <label className="flex items-center space-x-2 text-text-primary font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoProcessCari}
                    onChange={(e) => setAutoProcessCari(e.target.checked)}
                    className="rounded border-border text-info-fill focus:ring-0"
                  />
                  <span>Faturayı Müşteri Cari Hesabına Borç (Satış Faturası) Olarak Otomatik İşle</span>
                </label>
              </div>

              {/* Turkish Words Box */}
              <div className="p-3 rounded-xl bg-base-surface-2 border border-border text-xs">
                <span className="text-[10px] font-bold text-text-muted uppercase block">
                  Yazıyla Toplam:
                </span>
                <span className="font-semibold text-text-primary italic">
                  {wordsAmount}
                </span>
              </div>
            </div>

            {/* Financial Totals Summary (5 cols) */}
            <div className="sm:col-span-5 bg-base-surface-2 border border-border rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex justify-between text-text-secondary">
                <span>Mal / Hizmet Toplamı:</span>
                <span className="font-mono font-medium text-text-primary">{formatTRY(subtotal)}</span>
              </div>

              {totalDiscount > 0 && (
                <div className="flex justify-between text-danger-text">
                  <span>Toplam İskonto:</span>
                  <span className="font-mono font-medium">-{formatTRY(totalDiscount)}</span>
                </div>
              )}

              <div className="flex justify-between text-text-secondary pt-1 border-t border-border">
                <span>KDV Matrahı:</span>
                <span className="font-mono font-semibold text-text-primary">{formatTRY(taxExclusiveAmount)}</span>
              </div>

              <div className="flex justify-between text-text-secondary">
                <span>Hesaplanan KDV:</span>
                <span className="font-mono font-semibold text-text-primary">{formatTRY(totalVat)}</span>
              </div>

              {totalTevkifat > 0 && (
                <div className="flex justify-between text-warning-text">
                  <span>Tevkif Edilen KDV:</span>
                  <span className="font-mono font-semibold">-{formatTRY(totalTevkifat)}</span>
                </div>
              )}

              {/* Grand Payable */}
              <div className="mt-3 p-3 rounded-xl bg-bg-success border border-success-border flex justify-between items-center text-success-text">
                <span className="font-extrabold text-xs uppercase tracking-tight">ÖDENECEK TUTAR:</span>
                <span className="font-mono font-black text-base sm:text-lg">
                  {formatTRY(payableAmount)}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:px-6 border-t border-border flex flex-wrap items-center justify-between gap-3 bg-base-surface-2/60 rounded-b-3xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-base-surface font-semibold text-xs transition-all cursor-pointer"
          >
            Vazgeç
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSubmit(false)}
              className="px-4 py-2 rounded-xl bg-base-surface hover:bg-base-surface-2 border border-border text-text-primary text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5 text-warning-text" />
              <span>Taslak Olarak Kaydet</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleSubmit(true)}
              className="px-5 py-2 rounded-xl bg-success-fill hover:bg-success-fill/90 text-white text-xs font-bold transition-all shadow-md flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{loading ? 'İşleniyor...' : "Kaydet ve GİB'e İlet (1300)"}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
