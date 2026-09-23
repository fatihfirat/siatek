import React, { useState, useEffect } from 'react';
import { saveProductToFirestore } from '../../lib/firestoreService';
import { Product } from '../../types';
import { Package, X, Check, Tag, DollarSign, Layers, Barcode, Shield } from 'lucide-react';
import { playNotificationSound } from '../../lib/audio';
import { useModalBehavior } from '../../hooks/useModalBehavior';

interface ProductManageModalProps {
  productToEdit?: Product | null;
  products?: Product[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function ProductManageModal({
  productToEdit,
  products = [],
  onClose,
  onSuccess,
}: ProductManageModalProps) {
  useModalBehavior(true, onClose);

  const [name, setName] = useState(productToEdit?.name || '');
  const [category, setCategory] = useState(productToEdit?.category || 'VANALAR & ÇEKVALFLER');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [subCategory, setSubCategory] = useState(productToEdit?.subCategory || '');
  const [description, setDescription] = useState(productToEdit?.description || '');
  const [price, setPrice] = useState(productToEdit?.price || 100);
  const [wholesalePrice, setWholesalePrice] = useState(productToEdit?.wholesalePrice || 80);
  const [stock, setStock] = useState(productToEdit?.stock || 50);
  const [unit, setUnit] = useState(productToEdit?.unit || 'ADET');
  const [minOrderQuantity, setMinOrderQuantity] = useState(productToEdit?.minOrderQuantity || 1);
  const [sku, setSku] = useState(productToEdit?.sku || `ST${Date.now().toString().slice(-5)}`);
  const [barcode, setBarcode] = useState(productToEdit?.barcode || '');
  const [vatRate, setVatRate] = useState(productToEdit?.vatRate || 20);
  const [imageUrl, setImageUrl] = useState(productToEdit?.imageUrl || '');
  const [loading, setLoading] = useState(false);

  const baseCategories = [
    'VANALAR & ÇEKVALFLER',
    'ISITMA & KOMBİ GRUBU',
    'DOĞALGAZ SİSTEMLERİ',
    'MUSLUKLAR & ARMATÜRLER',
    'PPRC & PVC BORU SİSTEMLERİ',
    'FİTTİNGS MALZEMELERİ',
    'REKORLAR & UZATMALAR',
    'RADYATÖRLER & ISITMA',
    'VİTRİFİYE & SERAMİK',
    'DUŞ SİSTEMLERİ',
    'KELEPÇELER & ASKI',
    'ŞAMANDRALAR & SİFONLAR',
    'SARF MALZEMELERİ',
  ];

  // Merge with existing products' categories
  const dynamicCategories = Array.from(
    new Set([...baseCategories, ...products.map(p => p.category).filter(Boolean)])
  );

  // Subcategories available in current selected category
  const availableSubcategories = Array.from(
    new Set(
      products
        .filter(p => p.category === (isCustomCategory ? customCategoryInput : category) && p.subCategory)
        .map(p => p.subCategory!)
    )
  );

  const handleCategoryChange = (val: string) => {
    if (val === '__custom__') {
      setIsCustomCategory(true);
    } else {
      setIsCustomCategory(false);
      setCategory(val);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const finalCategory = isCustomCategory ? customCategoryInput.trim() : category;
    if (!finalCategory) {
      alert('Lütfen geçerli bir ana kategori seçin veya yazın.');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        name,
        category: finalCategory,
        subCategory: subCategory.trim(),
        description,
        price: Number(price),
        wholesalePrice: Number(wholesalePrice),
        stock: Number(stock),
        unit,
        minOrderQuantity: Number(minOrderQuantity),
        sku,
        barcode,
        vatRate: Number(vatRate),
        imageUrl,
      };

      // Firestore'a yaz.
      //
      // Eskiden olu /api/products cagriliyordu. Sunucu olmadigi icin istek
      // HTTP 200 + index.html donuyor, res.ok TRUE oluyordu: basari sesi
      // caliyor, modal kapaniyor ama urun HICBIR YERE kaydedilmiyordu.
      // "Kaydedildi gibi oluyor ama olmuyor" sikayetinin kaynagi buydu.
      // (19.09.2026)
      const urunId = productToEdit
        ? productToEdit.id
        : `prod-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      await saveProductToFirestore({
        ...(productToEdit || {}),
        ...payload,
        id: urunId,
      } as any);

      playNotificationSound('success');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Ürün kaydedilemedi:', err);
      alert('Ürün kaydedilemedi: ' + (err?.message || 'bilinmeyen hata'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md p-3 sm:p-4 md:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div className="min-h-full flex items-center justify-center py-4 sm:py-6">
        <div 
          className="relative bg-base-surface border border-border rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl text-text-primary p-6 sm:p-7"
          onClick={(e) => e.stopPropagation()}
        >
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-text-muted hover:text-text-primary rounded-lg hover:bg-base-surface-2 transition-colors cursor-pointer border border-border"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-base-surface-2 border border-border flex items-center justify-center text-text-primary">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary">
              {productToEdit ? 'Ürünü Düzenle' : 'Kataloga Yeni Ürün Ekle'}
            </h2>
            <p className="text-xs text-text-muted">Doğalgaz ve mekanik tesisat ürün bilgilerini, liste ve toptan fiyatlarını yapılandırın.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-text-secondary font-semibold mb-1">Ürün Adı *</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Örn: 1'' KİLİTLİ VANA veya 20 LİK KOMPOZİT PPRC BORU"
                className="w-full px-3 py-2 bg-base-surface-2 border border-border rounded-xl text-text-primary focus:border-border-strong"
              />
            </div>

            {/* Main Category Selector */}
            <div className="sm:col-span-1">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-text-secondary font-semibold">Ana Kategori *</label>
                {isCustomCategory ? (
                  <button
                    type="button"
                    onClick={() => setIsCustomCategory(false)}
                    className="text-[11px] text-success-text hover:underline font-semibold cursor-pointer"
                  >
                    Listeden Seç
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomCategory(true);
                      setCustomCategoryInput('');
                    }}
                    className="text-[11px] text-warning-text hover:underline font-semibold cursor-pointer"
                  >
                    + Yeni Kategori
                  </button>
                )}
              </div>

              {isCustomCategory ? (
                <div className="space-y-1.5">
                  <input
                    type="text"
                    required
                    value={customCategoryInput}
                    onChange={e => setCustomCategoryInput(e.target.value.toUpperCase())}
                    placeholder="ÖRN: YENİ ÜRÜN GRUBU"
                    className="w-full px-3 py-2 bg-base-surface-2 border border-border rounded-xl text-text-primary uppercase font-semibold focus:border-border-strong"
                    autoFocus
                  />
                  <p className="text-[10px] text-text-muted">Büyük harflerle yazınız. Otomatik kataloga eklenecektir.</p>
                </div>
              ) : (
                <select
                  required
                  value={category}
                  onChange={e => handleCategoryChange(e.target.value)}
                  className="w-full px-3 py-2 bg-base-surface-2 border border-border rounded-xl text-text-primary font-medium focus:border-border-strong cursor-pointer"
                >
                  {dynamicCategories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="__custom__" className="text-warning-text font-bold">
                    ➕ + Yeni Özel Kategori Ekle...
                  </option>
                </select>
              )}
            </div>

            {/* Subcategory / Series */}
            <div className="sm:col-span-1">
              <label className="block text-text-secondary font-semibold mb-1">Alt Kategori / Seri</label>
              <input
                list="subcategory-suggestions"
                type="text"
                value={subCategory}
                onChange={e => setSubCategory(e.target.value)}
                placeholder="Örn: KALDE PPRC, İSRA BATARYALAR"
                className="w-full px-3 py-2 bg-base-surface-2 border border-border rounded-xl text-text-primary focus:border-border-strong"
              />
              <datalist id="subcategory-suggestions">
                {availableSubcategories.map(sub => (
                  <option key={sub} value={sub} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-text-secondary font-semibold mb-1">Stok Kodu (SKU)</label>
              <input
                type="text"
                value={sku}
                onChange={e => setSku(e.target.value)}
                placeholder="Örn: ST00567"
                className="w-full px-3 py-2 bg-base-surface-2 border border-border rounded-xl text-text-primary focus:border-border-strong font-mono font-bold"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-text-secondary font-semibold">Barkod (EAN-13 / Code-128)</label>
                <button
                  type="button"
                  onClick={() => {
                    const randomDigits = String(Math.floor(100000000 + Math.random() * 900000000));
                    const base12 = `869${randomDigits}`;
                    let sum = 0;
                    for (let i = 0; i < 12; i++) {
                      const d = parseInt(base12[i], 10);
                      sum += i % 2 === 0 ? d : d * 3;
                    }
                    const checkDigit = (10 - (sum % 10)) % 10;
                    setBarcode(`${base12}${checkDigit}`);
                  }}
                  className="text-[11px] text-text-primary hover:underline font-bold cursor-pointer flex items-center space-x-1"
                  title="Türkiye GS1 standartlarında 869 ile başlayan geçerli EAN-13 barkod üret"
                >
                  <Barcode className="w-3 h-3" />
                  <span>Otomatik Üret</span>
                </button>
              </div>
              <input
                type="text"
                value={barcode}
                onChange={e => setBarcode(e.target.value)}
                placeholder="Örn: 8690000005680"
                className="w-full px-3 py-2 bg-base-surface-2 border border-border rounded-xl text-text-primary focus:border-border-strong font-mono"
              />
            </div>

            <div>
              <label className="block text-text-secondary font-semibold mb-1">Perakende / Satış Fiyatı (₺) *</label>
              <input
                type="number"
                step="0.01"
                required
                min="0"
                value={price}
                onChange={e => setPrice(Number(e.target.value))}
                className="w-full px-3 py-2 bg-base-surface-2 border border-border rounded-xl text-success-text font-mono font-bold text-sm focus:border-border-strong"
              />
            </div>

            <div>
              <label className="block text-text-secondary font-semibold mb-1">Toptan / Bayi Fiyatı (₺)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={wholesalePrice}
                onChange={e => setWholesalePrice(Number(e.target.value))}
                className="w-full px-3 py-2 bg-base-surface-2 border border-border rounded-xl text-warning-text font-mono font-bold text-sm focus:border-border-strong"
              />
            </div>

            <div>
              <label className="block text-text-secondary font-semibold mb-1">Mevcut Stok Miktarı</label>
              <input
                type="number"
                min="0"
                value={stock}
                onChange={e => setStock(Number(e.target.value))}
                className="w-full px-3 py-2 bg-base-surface-2 border border-border rounded-xl text-text-primary font-mono font-semibold focus:border-border-strong"
              />
            </div>

            <div>
              <label className="block text-text-secondary font-semibold mb-1">Birim (ADET, METRE, Paket...)</label>
              <input
                type="text"
                value={unit}
                onChange={e => setUnit(e.target.value.toUpperCase())}
                placeholder="ADET / METRE"
                className="w-full px-3 py-2 bg-base-surface-2 border border-border rounded-xl text-text-primary uppercase font-semibold focus:border-border-strong"
              />
            </div>
          </div>

          <div>
            <label className="block text-text-secondary font-semibold mb-1">Ürün Açıklaması & Teknik Özellikler</label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Teknik detaylar, et kalınlığı, bağlantı çapı vb."
              className="w-full px-3 py-2 bg-base-surface-2 border border-border rounded-xl text-text-primary focus:border-border-strong resize-none"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-base-surface-2 hover:bg-base-surface text-text-primary border border-border rounded-xl font-semibold transition-colors cursor-pointer"
            >
              Vazgeç
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-success-fill hover:opacity-90 text-base font-bold rounded-xl flex items-center space-x-2 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{productToEdit ? 'Değişiklikleri Kaydet' : 'Ürünü Kataloga Ekle'}</span>
            </button>
          </div>

        </form>
        </div>
      </div>
    </div>
  );
}
