import React, { useState, useEffect } from 'react';
import { Product, QuoteRequestedItem, User } from '../../types';
import { FileText, Plus, Trash2, ShieldCheck, Send, X, Lock, CheckCircle2, Loader2, Building2 } from 'lucide-react';
import { encryptPayload } from '../../lib/crypto';

interface QuickQuoteModalProps {
  products: Product[];
  initialItems?: QuoteRequestedItem[];
  currentUser?: User | null;
  onClose: () => void;
  onSubmit: (quoteData: any) => Promise<void>;
}

export default function QuickQuoteModal({
  products,
  initialItems = [],
  currentUser,
  onClose,
  onSubmit,
}: QuickQuoteModalProps) {
  const [customerName, setCustomerName] = useState(currentUser?.name || '');
  const [customerCompany, setCustomerCompany] = useState(currentUser?.companyName || '');
  const [customerEmail, setCustomerEmail] = useState(currentUser?.email || '');
  const [customerPhone, setCustomerPhone] = useState(currentUser?.phone || '');
  const [deliveryCity, setDeliveryCity] = useState(currentUser?.city || '');
  const [customerNote, setCustomerNote] = useState('');
  const [confidentialNote, setConfidentialNote] = useState('');

  useEffect(() => {
    if (currentUser) {
      setCustomerName(currentUser.name);
      setCustomerCompany(currentUser.companyName || '');
      setCustomerEmail(currentUser.email);
      setCustomerPhone(currentUser.phone || '');
      setDeliveryCity(currentUser.city || '');
    }
  }, [currentUser]);
  
  const [items, setItems] = useState<QuoteRequestedItem[]>(
    initialItems.length > 0
      ? initialItems
      : [
          {
            productId: products[0]?.id,
            productName: products[0]?.name || 'Endüstriyel Streç Film',
            requestedQuantity: 20,
            unit: products[0]?.unit || 'Rulo',
            targetUnitPrice: products[0] ? Math.round(products[0].price * 0.85) : 300,
            note: 'Birinci sınıf kalite olmalı',
          },
        ]
  );

  const [loading, setLoading] = useState(false);
  const [isEncrypted, setIsEncrypted] = useState(true);

  const handleAddItem = () => {
    const defaultProd = products[0];
    setItems([
      ...items,
      {
        productId: defaultProd?.id,
        productName: defaultProd?.name || 'Yeni Ürün Talebi',
        requestedQuantity: 5,
        unit: defaultProd?.unit || 'Adet',
        targetUnitPrice: defaultProd?.price || 0,
        note: '',
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleProductSelect = (index: number, prodId: string) => {
    const selected = products.find(p => p.id === prodId);
    if (selected) {
      const updated = [...items];
      updated[index] = {
        ...updated[index],
        productId: selected.id,
        productName: selected.name,
        unit: selected.unit,
        requestedQuantity: Math.max(selected.minOrderQuantity || 1, updated[index]?.requestedQuantity || 1),
        targetUnitPrice: Math.round(selected.price * 0.9),
      };
      setItems(updated);
    }
  };

  const handleUpdateItem = (index: number, field: keyof QuoteRequestedItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    setLoading(true);
    try {
      let encryptedPayloadStr = '';
      if (isEncrypted && confidentialNote.trim()) {
        encryptedPayloadStr = await encryptPayload({
          confidentialNote,
          budgetTarget: 'Private Commercial Data',
          clientTimestamp: new Date().toISOString(),
        });
      }

      await onSubmit({
        customerName,
        customerCompany,
        customerEmail,
        customerPhone,
        deliveryCity,
        requestedItems: items,
        customerNote,
        encryptedConfidentialNote: encryptedPayloadStr,
      });

      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="bg-base-surface border border-border rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl text-text-primary p-6 sm:p-7 relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-text-muted hover:text-text-primary rounded-lg hover:bg-base-surface-2 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-bg-warning border border-warning-border flex items-center justify-center text-warning-text shadow-xs">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary flex items-center space-x-2">
              <span>Hızlı & Pratik Fiyat Teklifi İsteme</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-bg-warning text-warning-text border border-warning-border">
                Canlı Tedarikçi Masası
              </span>
            </h2>
            <p className="text-xs text-text-muted">Ürünlerinizi ve hedef birim fiyatınızı belirleyin; yönetici anında onaylayıp fiyatlandırsın.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Customer & Company Details */}
          <div className="p-4 bg-base-surface-2 rounded-xl border border-border shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-3">
              1. Müşteri & İletişim Bilgileri
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-text-secondary mb-1">Yetkili Adı Soyadı *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 bg-base-surface border border-border rounded-lg text-text-primary focus:outline-none focus:border-border-strong"
                />
              </div>

              <div>
                <label className="block text-text-secondary mb-1">Firma / Kurum Adı</label>
                <input
                  type="text"
                  value={customerCompany}
                  onChange={e => setCustomerCompany(e.target.value)}
                  className="w-full px-3 py-2 bg-base-surface border border-border rounded-lg text-text-primary focus:outline-none focus:border-border-strong"
                />
              </div>

              <div>
                <label className="block text-text-secondary mb-1">E-Posta Adresi *</label>
                <input
                  type="email"
                  required
                  value={customerEmail}
                  onChange={e => setCustomerEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-base-surface border border-border rounded-lg text-text-primary focus:outline-none focus:border-border-strong"
                />
              </div>

              <div>
                <label className="block text-text-secondary mb-1">Telefon Numarası *</label>
                <input
                  type="text"
                  required
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-base-surface border border-border rounded-lg text-text-primary focus:outline-none focus:border-border-strong"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-text-secondary mb-1">Teslimat İli / Adres Bölgesi</label>
                <input
                  type="text"
                  value={deliveryCity}
                  onChange={e => setDeliveryCity(e.target.value)}
                  placeholder="Örn: Kocaeli / Gebze OSB"
                  className="w-full px-3 py-2 bg-base-surface border border-border rounded-lg text-text-primary focus:outline-none focus:border-border-strong"
                />
              </div>
            </div>
          </div>

          {/* Requested Items */}
          <div className="p-4 bg-base-surface-2 rounded-xl border border-border shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                2. Teklif İstenecek Ürünler & Hedef Fiyatlar
              </h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-3 py-1 bg-warning-fill text-base rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Kalem Ekle</span>
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="p-3 bg-base-surface rounded-xl border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-warning-text">Kalem #{idx + 1}</span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-text-muted hover:text-danger-text transition-colors p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
                    <div className="sm:col-span-5">
                      <label className="block text-[11px] text-text-secondary mb-1">Katalogdan Seç veya Yaz</label>
                      <select
                        value={item.productId || ''}
                        onChange={e => handleProductSelect(idx, e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-base-surface-2 border border-border rounded-lg text-text-primary focus:outline-none focus:border-border-strong mb-1"
                      >
                        <option value="">-- Katalogdan Seçin --</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.price} ₺ / {p.unit})
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={item.productName}
                        onChange={e => handleUpdateItem(idx, 'productName', e.target.value)}
                        placeholder="Ürün adı"
                        className="w-full px-2.5 py-1.5 bg-base-surface-2 border border-border rounded-lg text-text-primary focus:outline-none focus:border-border-strong text-xs"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] text-text-secondary mb-1">Miktar</label>
                      <input
                        type="number"
                        min="1"
                        value={item.requestedQuantity}
                        onChange={e => handleUpdateItem(idx, 'requestedQuantity', Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-base-surface-2 border border-border rounded-lg text-text-primary focus:outline-none focus:border-border-strong text-xs"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] text-text-secondary mb-1">Birim</label>
                      <input
                        type="text"
                        value={item.unit}
                        onChange={e => handleUpdateItem(idx, 'unit', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-base-surface-2 border border-border rounded-lg text-text-primary focus:outline-none focus:border-border-strong text-xs"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-[11px] text-text-secondary mb-1">Hedef Fiyat (₺ / Opsiyonel)</label>
                      <input
                        type="number"
                        value={item.targetUnitPrice || ''}
                        placeholder="Örn: 280"
                        onChange={e => handleUpdateItem(idx, 'targetUnitPrice', Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-base-surface-2 border border-border rounded-lg text-success-text font-semibold focus:outline-none focus:border-border-strong text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={item.note || ''}
                      placeholder="Bu kalem için özel not (örn: Acil numune gönderilsin, 17 mikron şeffaf seri vb.)"
                      onChange={e => handleUpdateItem(idx, 'note', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-base-surface-2 border border-border rounded-lg text-text-secondary text-[11px] focus:outline-none focus:border-border-strong"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes & E2EE Confidential Remarks */}
          <div className="p-4 bg-base-surface-2 rounded-xl border border-border shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              3. Teklif Notları & E2EE Gizlilik Şifrelemesi
            </h3>

            <div>
              <label className="block text-xs text-text-secondary mb-1">Genel Teklif Açıklaması</label>
              <textarea
                rows={2}
                value={customerNote}
                onChange={e => setCustomerNote(e.target.value)}
                placeholder="Ödeme vadesi, sevkiyat tarihi veya genel talep notlarınız..."
                className="w-full px-3 py-2 bg-base-surface border border-border rounded-lg text-xs text-text-primary focus:outline-none focus:border-border-strong resize-none"
              />
            </div>

            <div className="p-3 bg-bg-success rounded-xl border border-success-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-1.5 text-xs text-success-text font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Uçtan Uca Şifreli Gizli Not (AES-256-GCM)</span>
                </div>
                <label className="flex items-center space-x-1.5 text-[11px] text-text-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isEncrypted}
                    onChange={e => setIsEncrypted(e.target.checked)}
                    className="rounded text-success-fill focus:ring-0"
                  />
                  <span>Şifrele</span>
                </label>
              </div>
              <input
                type="text"
                value={confidentialNote}
                onChange={e => setConfidentialNote(e.target.value)}
                placeholder="Sadece yönetici ve sizin görebileceği ticari gizli not (bütçe, özel anlaşma detayları)..."
                className="w-full px-3 py-1.5 bg-base-surface border border-success-border rounded-lg text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-success-border"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-base-surface-2 hover:bg-base-surface text-text-primary border border-border rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Vazgeç
            </button>

            <button
              type="submit"
              disabled={loading || items.length === 0}
              className="px-6 py-2.5 bg-warning-fill hover:opacity-90 text-base font-bold rounded-xl text-xs flex items-center space-x-2 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>{loading ? 'Gönderiliyor...' : 'Teklif Talebini Gönder (Canlı)'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
