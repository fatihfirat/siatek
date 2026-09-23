import React, { useState, useEffect } from 'react';
import { updateQuoteInFirestore } from '../../lib/firestoreService';
import { Quote, Product, QuoteOfferedItem } from '../../types';
import { 
  Send, 
  X, 
  CheckCircle2, 
  ShieldCheck, 
  Percent, 
  Truck, 
  CreditCard, 
  Calendar, 
  Loader2, 
  AlertCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { playNotificationSound } from '../../lib/audio';
import { useModalBehavior } from '../../hooks/useModalBehavior';

interface AdminQuoteModalProps {
  quote: Quote;
  products: Product[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdminQuoteModal({
  quote,
  products = [],
  onClose,
  onSuccess,
}: AdminQuoteModalProps) {
  const safeProducts = Array.isArray(products) ? products : [];
  const [offeredItems, setOfferedItems] = useState<QuoteOfferedItem[]>(
    quote?.offeredItems && quote.offeredItems.length > 0
      ? quote.offeredItems
      : (quote?.requestedItems || []).map(req => {
          const matchedProd = req.productId ? safeProducts.find(p => p && p.id === req.productId) : null;
          const listPrice = matchedProd ? matchedProd.price : (req.targetUnitPrice ? Math.round(req.targetUnitPrice * 1.15) : 350);
          const initialOfferedPrice = req.targetUnitPrice || (matchedProd ? matchedProd.wholesalePrice || Math.round(listPrice * 0.9) : listPrice);
          const discountRate = listPrice > 0 ? Math.round(((listPrice - initialOfferedPrice) / listPrice) * 100) : 0;

          return {
            productId: req.productId,
            productName: req.productName,
            quantity: req.requestedQuantity,
            unit: req.unit,
            listPrice,
            offeredUnitPrice: initialOfferedPrice,
            discountRate: Math.max(0, discountRate),
            totalPrice: req.requestedQuantity * initialOfferedPrice,
            adminNote: 'Müşteri talebine istinaden özel fiyat uygulandı.',
          };
        })
  );

  const [paymentTerms, setPaymentTerms] = useState(quote.paymentTerms || '');
  const [validUntil, setValidUntil] = useState(
    quote.validUntil || new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0]
  );
  const [shippingFee, setShippingFee] = useState<number>(quote.shippingFee !== undefined ? quote.shippingFee : 0);
  const [discountAmount, setDiscountAmount] = useState<number>(quote.discountAmount || 0);
  const [adminResponseNote, setAdminResponseNote] = useState(
    quote.adminResponseNote || 'Talebiniz doğrultusunda en avantajlı kurumsal bayi iskonto oranlarımız yansıtılmıştır. Ücretsiz nakliye sunulmuştur.'
  );
  const [customerName, setCustomerName] = useState(quote.customerName || '');
  const [customerCompany, setCustomerCompany] = useState(quote.customerCompany || '');
  const [customerPhone, setCustomerPhone] = useState(quote.customerPhone || '');
  const [customerEmail, setCustomerEmail] = useState(quote.customerEmail || '');
  const [deliveryCity, setDeliveryCity] = useState(quote.deliveryCity || '');
  const [selectedProductId, setSelectedProductId] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const handlePriceChange = (index: number, newUnitPrice: number) => {
    const updated = [...offeredItems];
    const item = updated[index];
    const qty = item.quantity;
    const listPrice = item.listPrice;
    const discountRate = listPrice > 0 ? Math.round(((listPrice - newUnitPrice) / listPrice) * 100) : 0;

    updated[index] = {
      ...item,
      offeredUnitPrice: newUnitPrice,
      discountRate: Math.max(0, discountRate),
      totalPrice: qty * newUnitPrice,
    };
    setOfferedItems(updated);
  };

  const handleDiscountPercentChange = (index: number, newDiscountPercent: number) => {
    const updated = [...offeredItems];
    const item = updated[index];
    const listPrice = item.listPrice;
    const newUnitPrice = Math.round(listPrice * (1 - newDiscountPercent / 100));

    updated[index] = {
      ...item,
      discountRate: newDiscountPercent,
      offeredUnitPrice: newUnitPrice,
      totalPrice: item.quantity * newUnitPrice,
    };
    setOfferedItems(updated);
  };

  const handleItemNoteChange = (index: number, note: string) => {
    const updated = [...offeredItems];
    updated[index] = { ...updated[index], adminNote: note };
    setOfferedItems(updated);
  };

  const addCustomItem = (itemType: QuoteOfferedItem['itemType'] = 'custom') => {
    setOfferedItems(prev => [...prev, { itemType, productName: itemType === 'labor' ? 'İşçilik' : itemType === 'service' ? 'Hizmet' : 'Özel kalem', quantity: 1, unit: itemType === 'labor' ? 'SAAT' : 'ADET', listPrice: 0, offeredUnitPrice: 0, discountRate: 0, totalPrice: 0, adminNote: '' }]);
  };
  const updateItem = (index: number, patch: Partial<QuoteOfferedItem>) => setOfferedItems(prev => prev.map((item, i) => i !== index ? item : { ...item, ...patch, totalPrice: Math.max(0, Number(patch.quantity ?? item.quantity)) * Math.max(0, Number(patch.offeredUnitPrice ?? item.offeredUnitPrice)) }));
  const removeItem = (index: number) => setOfferedItems(prev => prev.filter((_, i) => i !== index));
  const addCatalogProduct = () => {
    const product = safeProducts.find(p => p.id === selectedProductId);
    if (!product) return;
    const price = product.wholesalePrice || product.price || 0;
    setOfferedItems(prev => [...prev, { itemType: 'product', productId: product.id, productName: product.name, quantity: 1, unit: product.unit || 'ADET', listPrice: product.price || price, offeredUnitPrice: price, discountRate: 0, totalPrice: price, adminNote: '' }]);
    setSelectedProductId('');
  };

  const subtotal = offeredItems.reduce((acc, it) => acc + it.totalPrice, 0);
  const taxableBase = Math.max(0, subtotal - discountAmount);
  const taxAmount = Math.round(taxableBase * 0.2 * 100) / 100;
  const grandTotal = Math.round((taxableBase + taxAmount + shippingFee) * 100) / 100;

  const handleSubmitOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Firestore'a yaz. Eskiden olu /api/quotes/:id/respond cagriliyordu;
      // teklif yanitlama TAMAMEN calismiyordu. (19.09.2026)
      await updateQuoteInFirestore(quote.id, {
        customerName, customerCompany, customerPhone, customerEmail, deliveryCity,
        offeredItems,
        subtotal, taxRate: 20, taxAmount, grandTotal, total: grandTotal,
        adminResponseNote,
        paymentTerms,
        validUntil,
        shippingFee,
        discountAmount,
        status: 'offer_sent',
      } as any);

      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      playNotificationSound('quote');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Teklif yanıtlama hatası:', err);
      alert('Teklif yanıtlanamadı: ' + (err?.message || 'bilinmeyen hata'));
    } finally {
      setSubmitting(false);
    }
  };

  useModalBehavior(true, onClose);

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md p-3 sm:p-4 md:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div className="min-h-full flex items-center justify-center py-4 sm:py-6">
        <div 
          className="relative bg-base-surface border border-border rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl text-text-primary p-6 sm:p-7"
          onClick={(e) => e.stopPropagation()}
        >
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-text-muted hover:text-text-primary rounded-lg hover:bg-base-surface-2 transition-colors cursor-pointer border border-border"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-border">
          <div className="flex items-center space-x-3">
            <img src="/branding/siatek-logo-horizontal.png" alt="Siatek" className="h-9 w-auto object-contain" />
            <div className="w-12 h-12 rounded-xl bg-bg-warning border border-warning-border flex items-center justify-center text-warning-text font-black text-lg">
              TKL
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-text-primary">Teklif Hazırlama & Fiyatlandırma Masası</h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-bg-warning text-warning-text border border-warning-border font-semibold">
                  {quote.quoteNumber}
                </span>
              </div>
              <p className="text-xs text-text-muted">
                Müşteri: <strong className="text-text-primary">{quote.customerName}</strong> ({quote.customerCompany || 'Bireysel'}) | Teslimat: {quote.deliveryCity}
              </p>
            </div>
          </div>

        </div>


        {/* Customer Original Note */}
        {quote.customerNote && (
          <div className="p-3 bg-base-surface-2 rounded-xl border border-border text-xs mb-6 shadow-xs">
            <span className="font-semibold text-text-muted block mb-0.5 text-[10px] uppercase tracking-wider">Müşteri Notu & Talebi:</span>
            <p className="text-text-secondary">{quote.customerNote}</p>
          </div>
        )}

        {/* Pricing Form */}
        <form onSubmit={handleSubmitOffer} className="space-y-6">
          <section className="p-4 rounded-2xl border border-success-border bg-bg-success/40 space-y-3">
            <div><h3 className="text-xs font-bold uppercase tracking-wider text-success-text">Teklif Kime Hazırlanıyor?</h3><p className="text-[11px] text-text-muted mt-1">Cari seçmeden yeni müşteri için de teklif hazırlayabilirsiniz.</p></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 text-xs">
              <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Yetkili adı *" className="min-h-[40px] px-3 rounded-lg border border-border bg-base-surface text-text-primary" required />
              <input value={customerCompany} onChange={e => setCustomerCompany(e.target.value)} placeholder="Firma / Cari adı" className="min-h-[40px] px-3 rounded-lg border border-border bg-base-surface text-text-primary" />
              <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="Telefon" className="min-h-[40px] px-3 rounded-lg border border-border bg-base-surface text-text-primary" />
              <input value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="E-posta" type="email" className="min-h-[40px] px-3 rounded-lg border border-border bg-base-surface text-text-primary" />
              <input value={deliveryCity} onChange={e => setDeliveryCity(e.target.value)} placeholder="Teslimat şehri" className="min-h-[40px] px-3 rounded-lg border border-border bg-base-surface text-text-primary" />
            </div>
          </section>
          
          {/* Offered Items Table */}
          <div className="p-4 bg-base-surface-2 rounded-xl border border-border space-y-3 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              1. Ürün Birim Fiyatları & İskonto Belirleme
            </h3><div className="flex flex-wrap gap-1.5"><button type="button" onClick={() => addCustomItem('labor')} className="min-h-[36px] px-2.5 rounded-lg border border-success-border bg-bg-success text-success-text text-[11px] font-bold active:scale-[0.98] transition-transform">+ İşçilik</button><button type="button" onClick={() => addCustomItem('service')} className="min-h-[36px] px-2.5 rounded-lg border border-info-border bg-bg-info text-info-text text-[11px] font-bold active:scale-[0.98] transition-transform">+ Hizmet</button><button type="button" onClick={() => addCustomItem()} className="min-h-[36px] px-2.5 rounded-lg border border-border bg-base-surface text-text-primary text-[11px] font-bold active:scale-[0.98] transition-transform">+ Özel Kalem</button></div></div>
            <div className="flex flex-col sm:flex-row gap-2 p-3 rounded-xl border border-border bg-base-surface"><select value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)} className="flex-1 min-h-[40px] px-3 rounded-lg border border-border bg-base-surface-2 text-xs text-text-primary"><option value="">Katalogdan ürün seçin</option>{safeProducts.map(product => <option key={product.id} value={product.id}>{product.name} · {(product.price || 0).toLocaleString('tr-TR')} ₺</option>)}</select><button type="button" onClick={addCatalogProduct} disabled={!selectedProductId} className="min-h-[40px] px-4 rounded-lg bg-success-fill text-base text-xs font-bold disabled:opacity-40 active:scale-[0.98] transition-transform">+ Ürünü Teklife Ekle</button></div>

            <div className="space-y-3">
              {offeredItems.map((item, idx) => (
                <div key={idx} className="p-3 bg-base-surface rounded-xl border border-border space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <input value={item.productName} onChange={e => updateItem(idx, { productName: e.target.value })} className="min-w-0 flex-1 px-2 py-1 bg-base-surface-2 border border-border rounded-lg text-xs font-bold text-text-primary" />
                    <span className="text-xs font-mono font-bold text-success-text">
                      Kalem Toplamı: {item.totalPrice.toLocaleString('tr-TR')} ₺
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] text-text-muted mb-0.5">Miktar & Birim</label>
                      <div className="px-2.5 py-1.5 bg-base-surface-2 rounded-lg border border-border text-text-primary font-semibold">
                        <div className="flex gap-1"><input type="number" min="0" value={item.quantity} onChange={e => updateItem(idx, { quantity: Number(e.target.value) })} className="w-16 bg-transparent font-semibold" /><input value={item.unit} onChange={e => updateItem(idx, { unit: e.target.value })} className="w-16 bg-transparent" /></div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-text-muted mb-0.5">Liste Fiyatı (₺)</label>
                      <div className="px-2.5 py-1.5 bg-base-surface-2 rounded-lg border border-border text-text-muted font-mono">
                        <input type="number" min="0" value={item.listPrice} onChange={e => updateItem(idx, { listPrice: Number(e.target.value) })} className="w-full bg-transparent font-mono" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-text-muted mb-0.5">İskonto Oranı (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="90"
                        value={item.discountRate}
                        onChange={e => handleDiscountPercentChange(idx, Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-base-surface-2 border border-border rounded-lg text-success-text font-bold focus:border-border-strong"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-text-muted mb-0.5">Teklif Birim Fiyatı (₺) *</label>
                      <input
                        type="number"
                        min="1"
                        value={item.offeredUnitPrice}
                        onChange={e => handlePriceChange(idx, Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-base-surface-2 border border-border-strong rounded-lg text-text-primary font-extrabold focus:outline-none focus:ring-1 focus:ring-border-strong"
                      />
                    </div>
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="Bu kalem için müşteriye özel not (örn: 2 yıl garanti, orijinal ambalaj vb.)"
                      value={item.adminNote || ''}
                      onChange={e => handleItemNoteChange(idx, e.target.value)}
                      className="w-full px-2.5 py-1 bg-base-surface-2 border border-border rounded-lg text-[11px] text-text-secondary focus:border-border-strong"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment terms & Valid until */}
          <div className="p-4 bg-base-surface-2 rounded-xl border border-border space-y-3 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              2. Ticari Şartlar, Vade & Geçerlilik
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-text-muted mb-1">Ödeme Koşulu / Vade</label>
                <select
                  value={paymentTerms}
                  onChange={e => setPaymentTerms(e.target.value)}
                  className="w-full px-3 py-2 bg-base-surface border border-border rounded-lg text-text-primary focus:border-border-strong"
                >
                  <option value="Peşin (Havale/EFT / %2 Erken Ödeme İndirimi)">Peşin (Havale/EFT)</option>
                  <option value="Kredi Kartı (Tek Çekim)">Kredi Kartı (Tek Çekim)</option>
                  <option value="30 Gün Vade / Cari Hesap">30 Gün Vade / Cari Hesap</option>
                  <option value="60 Gün Vade (DBS / Teminatlı)">60 Gün Vade (DBS)</option>
                </select>
              </div>

              <div>
                <label className="block text-text-muted mb-1">Geçerlilik Tarihi</label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={e => setValidUntil(e.target.value)}
                  className="w-full px-3 py-2 bg-base-surface border border-border rounded-lg text-text-primary focus:border-border-strong"
                />
              </div>

              <div>
                <label className="block text-text-muted mb-1">Teslimat / Nakliye Ücreti (₺)</label>
                <input
                  type="number"
                  value={shippingFee}
                  onChange={e => setShippingFee(Number(e.target.value))}
                  placeholder="0 = Ücretsiz"
                  className="w-full px-3 py-2 bg-base-surface border border-border rounded-lg text-text-primary focus:border-border-strong"
                />
              </div>
            </div>

            <div>
              <label className="block text-text-muted mb-1">Müşteriye İletilecek Teklif Mesajı</label>
              <textarea
                rows={2}
                value={adminResponseNote}
                onChange={e => setAdminResponseNote(e.target.value)}
                className="w-full px-3 py-2 bg-base-surface border border-border rounded-lg text-xs text-text-primary focus:border-border-strong resize-none"
              />
            </div>
          </div>

          {/* Pricing Totals Summary Box */}
          <div className="p-4 bg-base-surface-2 rounded-2xl border border-border shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
            <div className="space-y-1">
              <div className="text-text-muted">Ara Toplam: <strong className="text-text-primary font-mono">{subtotal.toLocaleString('tr-TR')} ₺</strong></div>
              <div className="text-text-muted">KDV (%20): <strong className="text-text-primary font-mono">{taxAmount.toLocaleString('tr-TR')} ₺</strong></div>
              <div className="text-text-muted">Teslimat: <strong className="text-text-primary">{shippingFee > 0 ? `${shippingFee} ₺` : 'Ücretsiz'}</strong></div>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-xs text-text-muted font-semibold block">Müşteriye Sunulacak Nihai Teklif Tutarı</span>
              <span className="text-2xl font-black text-success-text font-mono">
                {grandTotal.toLocaleString('tr-TR')} ₺
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-base-surface hover:bg-base-surface-2 text-text-primary border border-border rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              İptal
            </button>

            <button
              type="submit"
              disabled={submitting || offeredItems.length === 0}
              className="px-6 py-2.5 bg-warning-fill hover:opacity-90 text-base font-bold rounded-xl text-xs flex items-center space-x-2 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>{submitting ? 'Gönderiliyor...' : 'Teklifi Müşteriye İlet & Canlı Yayınla'}</span>
            </button>
          </div>

        </form>
        </div>
      </div>
    </div>
  );
}
