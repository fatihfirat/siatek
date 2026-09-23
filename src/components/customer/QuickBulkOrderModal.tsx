import React, { useState, useEffect } from 'react';
import { 
  X, 
  Layers, 
  FileSpreadsheet, 
  ShoppingCart, 
  Sparkles, 
  ArrowRight, 
  RotateCcw, 
  Trash2 
} from 'lucide-react';
import { Product, CartItem } from '../../types';
import { searchProductsWithFuzzy } from '../../lib/searchUtils';
import { playNotificationSound } from '../../lib/audio';
import confetti from 'canvas-confetti';
import { useModalBehavior } from '../../hooks/useModalBehavior';

interface QuickBulkOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onAddItemsToCart: (items: Array<{ product: Product; quantity: number }>) => void;
}

interface ParsedBulkItem {
  rawLine: string;
  matchedProduct?: Product;
  requestedQty: number;
  status: 'matched' | 'not_found' | 'invalid_qty' | 'out_of_stock';
  message?: string;
}

const SAMPLE_BULK_INPUT = `ST00001, 25
ST00002, 10
PPRC 90 Dirsek 20mm, 50
Küresel Vana 3/4, 8
869000000005, 12
Teflon Bant, 5`;

export const QuickBulkOrderModal: React.FC<QuickBulkOrderModalProps> = ({
  isOpen,
  onClose,
  products = [],
  onAddItemsToCart
}) => {
  useModalBehavior(isOpen, onClose);
  const [inputText, setInputText] = useState('');
  const [parsedItems, setParsedItems] = useState<ParsedBulkItem[]>([]);
  const [hasProcessed, setHasProcessed] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setInputText('');
      setParsedItems([]);
      setHasProcessed(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleParseText = () => {
    const lines = inputText.split('\n').map(l => l.trim()).filter(Boolean);
    const results: ParsedBulkItem[] = [];
    const safeProducts = products || [];

    for (const line of lines) {
      // Split by comma, tab, semicolon or pipe
      const parts = line.split(/[,;\t|]+/).map(p => p.trim());
      if (parts.length === 0) continue;

      let identifier = parts[0];
      let qtyStr = parts[1];

      // If quantity not separated by delimiter, check if ends with a number
      if (!qtyStr) {
        const lastSpaceIdx = identifier.lastIndexOf(' ');
        if (lastSpaceIdx !== -1) {
          const potentialQty = identifier.substring(lastSpaceIdx + 1).trim();
          if (!isNaN(Number(potentialQty))) {
            qtyStr = potentialQty;
            identifier = identifier.substring(0, lastSpaceIdx).trim();
          }
        }
      }

      const qty = parseInt(qtyStr, 10) || 1;

      // Find matching product by SKU, Barcode or Fuzzy Name
      let matched = safeProducts.find(p => 
        p.sku.toLowerCase() === identifier.toLowerCase() ||
        (p.barcode && p.barcode === identifier)
      );

      if (!matched) {
        // Try fuzzy name search
        const searchResults = searchProductsWithFuzzy(safeProducts, identifier);
        if (searchResults.length > 0 && searchResults[0].product) {
          matched = searchResults[0].product;
        }
      }

      if (!matched) {
        results.push({
          rawLine: line,
          requestedQty: qty,
          status: 'not_found',
          message: 'Ürün bulunamadı (Stok Kodu veya isim eşleşmedi)'
        });
      } else if (qty <= 0) {
        results.push({
          rawLine: line,
          matchedProduct: matched,
          requestedQty: qty,
          status: 'invalid_qty',
          message: 'Geçersiz miktar'
        });
      } else if (matched.stock <= 0) {
        results.push({
          rawLine: line,
          matchedProduct: matched,
          requestedQty: qty,
          status: 'out_of_stock',
          message: 'Stokta kalmadı (Stok: 0)'
        });
      } else {
        results.push({
          rawLine: line,
          matchedProduct: matched,
          requestedQty: qty,
          status: 'matched',
          message: `Eşleşti: ${matched.name}`
        });
      }
    }

    setParsedItems(results);
    setHasProcessed(true);
    playNotificationSound('status');
  };

  const matchedCount = parsedItems.filter(i => i.status === 'matched').length;
  const totalAmount = parsedItems
    .filter(i => i.status === 'matched' && i.matchedProduct)
    .reduce((sum, i) => sum + (i.matchedProduct!.price * i.requestedQty), 0);

  const handleAddToCart = () => {
    const validItems = parsedItems
      .filter(i => i.status === 'matched' && i.matchedProduct)
      .map(i => ({
        product: i.matchedProduct!,
        quantity: i.requestedQty
      }));

    if (validItems.length === 0) {
      alert('Sepete eklenecek geçerli ürün bulunamadı.');
      return;
    }

    onAddItemsToCart(validItems);
    confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    playNotificationSound('success');
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md p-3 sm:p-4 md:p-6"
      onClick={onClose}
    >
      <div className="min-h-full flex items-center justify-center py-4 sm:py-6">
        <div 
          className="relative w-full max-w-3xl bg-base-surface border border-border rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-5 border-b border-border bg-base-surface-2/60">
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-lg font-bold text-text-primary tracking-tight">
                Hızlı & Toplu Sipariş Yükleme
              </h2>
              <p className="text-[11px] sm:text-xs text-text-muted hidden xs:block">
                Malzeme listesini, SKU kodlarını veya Excel satırlarını yapıştırıp sepete dönüştürün.
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

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 max-h-[75vh] sm:max-h-[70vh] overflow-y-auto">
          
          {!hasProcessed ? (
            <div className="space-y-4">
              <div className="p-3.5 sm:p-4 bg-primary/5 border border-primary/15 rounded-2xl flex items-start space-x-3">
                <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="text-xs text-text-secondary leading-relaxed space-y-1">
                  <span className="font-bold text-text-primary">Nasıl Kullanılır?</span>
                  <p>
                    Her satıra bir ürün yazınız. Format: <code className="bg-base-surface px-1.5 py-0.5 rounded text-primary font-bold font-mono">STOK_KODU, ADET</code> veya <code className="bg-base-surface px-1.5 py-0.5 rounded text-primary font-bold font-mono">ÜRÜN_ADI, ADET</code>.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1.5">
                  Malzeme Listesini Buraya Yapıştırın:
                </label>
                <textarea
                  rows={7}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Örnek:&#10;ST00001, 20&#10;PPRC Boru 25mm, 15&#10;Küresel Vana 3/4, 4"
                  className="w-full px-3.5 py-2.5 sm:px-4 sm:py-3 bg-base-surface-2 border border-border rounded-2xl text-xs font-mono text-text-primary placeholder:text-text-muted/60 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setInputText(SAMPLE_BULK_INPUT)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-base-surface hover:bg-base-surface-2 text-xs font-semibold text-primary transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-primary" />
                    <span>Örnek Şablonu Doldur</span>
                  </button>

                  {inputText.trim().length > 0 && (
                    <button
                      type="button"
                      onClick={() => setInputText('')}
                      className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-medium text-text-muted hover:text-danger-text hover:bg-danger-fill/10 transition-colors cursor-pointer"
                      title="Listeyi Temizle"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Temizle</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  disabled={!inputText.trim()}
                  onClick={handleParseText}
                  className="px-6 py-3 sm:py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                  <span>Listeyi Tara ve Eşleştir</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Summary Bar */}
              <div className="p-3.5 sm:p-4 bg-base-surface-2 border border-border rounded-2xl flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-sm">
                    {matchedCount}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-text-primary">
                      {matchedCount} / {parsedItems.length} Kalem Eşleşti
                    </div>
                    <div className="text-[11px] text-text-muted">
                      Tahmini Tutar: <span className="font-extrabold text-primary font-mono">{totalAmount.toLocaleString('tr-TR')} ₺</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setHasProcessed(false)}
                  className="px-3 py-1.5 bg-base-surface border border-border hover:bg-base-surface-2 rounded-xl text-xs font-medium text-text-muted hover:text-text-primary flex items-center space-x-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Listeyi Düzenle</span>
                </button>
              </div>

              {/* Parsed Items List */}
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {parsedItems.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-3 border rounded-xl flex items-center justify-between gap-2.5 text-xs ${
                      item.status === 'matched'
                        ? 'bg-emerald-500/5 border-emerald-500/20'
                        : 'bg-rose-500/5 border-rose-500/20'
                    }`}
                  >
                    <div className="space-y-0.5 min-w-0 flex-1">
                      {item.matchedProduct ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-bold text-text-primary line-clamp-1">
                            {item.matchedProduct.name}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 bg-base-surface border border-border rounded text-text-muted">
                            {item.matchedProduct.sku}
                          </span>
                        </div>
                      ) : (
                        <div className="font-mono text-rose-600 font-semibold truncate">
                          "{item.rawLine}"
                        </div>
                      )}
                      <div className="text-[11px] text-text-muted">
                        {item.message}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-bold text-text-primary font-mono">
                        {item.requestedQty} {item.matchedProduct?.unit || 'Adet'}
                      </div>
                      {item.matchedProduct && (
                        <div className="text-[11px] font-semibold text-primary font-mono">
                          {(item.matchedProduct.price * item.requestedQty).toLocaleString('tr-TR')} ₺
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col-reverse sm:flex-row sm:items-center justify-between border-t border-border gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-text-muted hover:text-text-primary cursor-pointer text-center"
                >
                  Vazgeç
                </button>

                <button
                  type="button"
                  disabled={matchedCount === 0}
                  onClick={handleAddToCart}
                  className="px-6 py-3 sm:py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>{matchedCount} Kalemi Sepetime Ekle ({totalAmount.toLocaleString('tr-TR')} ₺)</span>
                </button>
              </div>

            </div>
          )}

        </div>

      </div>
      </div>
    </div>
  );
};
