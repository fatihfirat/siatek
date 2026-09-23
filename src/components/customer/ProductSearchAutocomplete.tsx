import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Product } from '../../types';
import { searchProductsWithFuzzy, ProductSearchResult } from '../../lib/searchUtils';
import { useCompanySettings } from '../../lib/companySettings';
import { auth } from '../../lib/firebase';
import HighlightText from '../common/HighlightText';
import {
  Search,
  X,
  Package,
  Plus,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Barcode,
  Layers,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Tag
} from 'lucide-react';

interface ProductSearchAutocompleteProps {
  products: Product[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: (query: string) => void;
  onSelectProduct?: (product: Product) => void;
  onAddToCart?: (product: Product, quantity?: number) => void;
  onClearSearch: () => void;
  selectedCategory?: string;
  selectedSubCategory?: string;
  placeholder?: string;
  className?: string;
}

const POPULAR_SEARCH_TAGS = [
  'Kombi',
  'Radyatör Vanası',
  'PPRC Dirsek',
  'Kollektör',
  'Sirkülasyon Pompası',
  'Doğalgaz Fleks',
  'Kalde',
  'E.C.A.',
  'Termostatik Vana',
  'Su Sayacı',
];

export const ProductSearchAutocomplete: React.FC<ProductSearchAutocompleteProps> = ({
  products = [],
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  onSelectProduct,
  onAddToCart,
  onClearSearch,
  selectedCategory = 'all',
  selectedSubCategory,
  placeholder = 'Ürün adı, ST kodu, barkod veya alt seri ara (Örn: Musluk, Kalde, ST00567)...',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [addedProductId, setAddedProductId] = useState<string | null>(null);

  const companySettings = useCompanySettings();
  const shouldHidePrice = Boolean(companySettings.hidePricesForGuests && !auth.currentUser);

  const safeProducts = Array.isArray(products) ? products : [];

  // Compute fuzzy & tokenized live suggestions
  const searchResults = useMemo<ProductSearchResult[]>(() => {
    if (!searchQuery || !searchQuery.trim()) {
      return [];
    }
    return searchProductsWithFuzzy(safeProducts, searchQuery, {
      category: selectedCategory,
      subCategory: selectedSubCategory,
      limit: 7,
    });
  }, [safeProducts, searchQuery, selectedCategory, selectedSubCategory]);

  // Compute total match count across entire catalog without limit
  const totalMatchCount = useMemo<number>(() => {
    if (!searchQuery || !searchQuery.trim()) {
      return safeProducts.length;
    }
    const all = searchProductsWithFuzzy(safeProducts, searchQuery, {
      category: selectedCategory,
      subCategory: selectedSubCategory,
    });
    return all.length;
  }, [safeProducts, searchQuery, selectedCategory, selectedSubCategory]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset selected index when query or results change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [searchQuery]);

  // Auto-scroll highlighted suggestion into view
  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement | null;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  // Keyboard navigation handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      }
      setSelectedIndex(prev => (prev < searchResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      }
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : searchResults.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && searchResults[selectedIndex]) {
        handleItemClick(searchResults[selectedIndex].product);
      } else {
        onSearchSubmit(searchQuery);
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleItemClick = (product: Product) => {
    if (onSelectProduct) {
      onSelectProduct(product);
    }
    onSearchSubmit(product.name);
    setIsOpen(false);
  };

  const handleQuickAdd = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    if (onAddToCart && product.stock > 0) {
      onAddToCart(product, product.minOrderQuantity || 1);
      setAddedProductId(product.id);
      setTimeout(() => setAddedProductId(null), 1200);
    }
  };

  const handleTagClick = (tag: string) => {
    onSearchChange(tag);
    onSearchSubmit(tag);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleClear = () => {
    onClearSearch();
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
    }).format(price);
  };

  return (
    <div ref={containerRef} className={`relative flex-1 ${className}`}>
      {/* Search Input Bar */}
      <div className="relative flex items-center">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none transition-colors group-focus-within:text-warning-text" />
        
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={e => {
            onSearchChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-10 pr-9 py-2.5 bg-base-surface-2 border border-border rounded-xl text-xs sm:text-sm text-text-primary placeholder:text-text-muted focus:bg-base-surface focus:border-warning-border transition-all shadow-inner"
        />

        {searchQuery ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-1 rounded-md hover:bg-base-surface transition-colors cursor-pointer"
            title="Aramayı Temizle"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      {/* AUTOCOMPLETE DROPDOWN RESULTS MENU */}
      {isOpen && (
        <div
          ref={listRef}
          className="absolute left-0 right-0 top-full mt-1.5 bg-base-surface border border-border rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-98 duration-150 max-h-[460px] flex flex-col"
        >
          {/* Header Status Bar inside Dropdown */}
          <div className="px-3.5 py-2 bg-base-surface-2 border-b border-border flex items-center justify-between text-xs text-text-muted">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-3.5 h-3.5 text-warning-text" />
              <span className="font-semibold text-text-primary">
                {searchQuery.trim() ? (
                  <>
                    "<strong>{searchQuery}</strong>" ile eşleşen {totalMatchCount} ürün
                  </>
                ) : (
                  'Hızlı Ürün Arama & Öneriler'
                )}
              </span>
            </div>

            <div className="hidden sm:flex items-center space-x-1.5 text-[10px] text-text-muted">
              <span className="px-1.5 py-0.5 rounded bg-base-surface border border-border font-mono">↑↓</span>
              <span>Gezin</span>
              <span className="px-1.5 py-0.5 rounded bg-base-surface border border-border font-mono ml-1">Enter</span>
              <span>Seç</span>
              <span className="px-1.5 py-0.5 rounded bg-base-surface border border-border font-mono ml-1">Esc</span>
              <span>Kapat</span>
            </div>
          </div>

          {/* Results List */}
          <div className="overflow-y-auto overflow-x-hidden flex-1 p-1.5 space-y-1">
            {searchQuery.trim() ? (
              searchResults.length > 0 ? (
                searchResults.map((res, index) => {
                  const product = res.product;
                  const isHighlighted = selectedIndex === index;
                  const isJustAdded = addedProductId === product.id;
                  const inStock = product.stock > 0;
                  const isCriticalStock = product.stock > 0 && product.stock <= 5;

                  return (
                    <div
                      key={product.id}
                      data-index={index}
                      onClick={() => handleItemClick(product)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`w-full p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 text-left group ${
                        isHighlighted
                          ? 'bg-warning-fill/10 border-warning-border shadow-xs'
                          : 'bg-base-surface hover:bg-base-surface-2 border-transparent hover:border-border'
                      }`}
                    >
                      {/* Left: Thumbnail & Details */}
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        {/* Image / Thumbnail */}
                        <div className="w-10 h-10 rounded-lg bg-base-surface-2 border border-border flex items-center justify-center shrink-0 overflow-hidden relative">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              onError={e => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <Package className="w-5 h-5 text-text-muted opacity-60" />
                          )}
                        </div>

                        {/* Title & Meta */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2 mb-0.5 flex-wrap gap-1">
                            <span className="font-mono text-[10px] font-bold bg-base-surface-2 text-text-secondary px-1.5 py-0.5 rounded border border-border">
                              <HighlightText text={product.sku} query={searchQuery} />
                            </span>

                            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-base-surface-2 text-text-muted border border-border">
                              {product.category}
                            </span>

                            {product.subCategory && (
                              <span className="text-[10px] text-text-muted font-medium hidden md:inline">
                                {product.subCategory}
                              </span>
                            )}
                          </div>

                          <div className="text-xs sm:text-sm font-bold text-text-primary leading-tight truncate">
                            <HighlightText text={product.name} query={searchQuery} />
                          </div>

                          {product.barcode && (
                            <div className="text-[10px] text-text-muted font-mono flex items-center space-x-1 mt-0.5">
                              <Barcode className="w-3 h-3 text-text-muted/70" />
                              <span>
                                <HighlightText text={product.barcode} query={searchQuery} />
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Price & Quick Action */}
                      <div className="flex items-center space-x-3 shrink-0">
                        {/* Price & Stock status */}
                        <div className="text-right">
                          <div className="text-xs sm:text-sm font-black text-text-primary">
                            {shouldHidePrice ? (
                              <span className="text-[11px] font-bold text-amber-500/90 dark:text-amber-400">Bayi Girişi</span>
                            ) : (
                              formatPrice(product.price)
                            )}
                          </div>
                          
                          <div className="mt-0.5">
                            {inStock ? (
                              <span
                                className={`text-[10px] font-semibold flex items-center justify-end space-x-1 ${
                                  isCriticalStock ? 'text-amber-500' : 'text-emerald-500'
                                }`}
                              >
                                <span>
                                  {product.stock} {product.unit || 'ADET'}
                                </span>
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-rose-500 flex items-center justify-end space-x-0.5">
                                <XCircle className="w-2.5 h-2.5" />
                                <span>Tükendi</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Quick Add to Cart Button */}
                        {onAddToCart && (
                          <button
                            type="button"
                            onClick={e => handleQuickAdd(e, product)}
                            disabled={!inStock}
                            className={`p-2 rounded-xl transition-all font-bold text-xs flex items-center space-x-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                              isJustAdded
                                ? 'bg-success-fill text-base scale-105 shadow-sm'
                                : 'bg-base-surface-2 hover:bg-warning-fill hover:text-base text-text-primary border border-border hover:border-transparent'
                            }`}
                            title={inStock ? 'Hızlıca Sepete Ekle' : 'Stokta Yok'}
                          >
                            {isJustAdded ? (
                              <CheckCircle2 className="w-4 h-4 animate-in zoom-in" />
                            ) : (
                              <Plus className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                /* No Results Box */
                <div className="py-8 px-4 text-center space-y-2 text-text-muted">
                  <Package className="w-8 h-8 mx-auto opacity-30 text-text-muted" />
                  <p className="text-xs font-semibold text-text-primary">
                    "<strong>{searchQuery}</strong>" ile eşleşen ürün bulunamadı.
                  </p>
                  <p className="text-[11px] text-text-muted max-w-xs mx-auto">
                    Kelimeyi kısaltarak veya genel terimlerle (örn: 'Vana', 'Kombi', 'Dirsek') aramayı deneyin.
                  </p>
                </div>
              )
            ) : (
              /* When query is empty -> Show Popular Search Quick Tags */
              <div className="p-3 space-y-3">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-text-primary">
                  <TrendingUp className="w-3.5 h-3.5 text-warning-text" />
                  <span>Popüler & Sık Aranan Ürünler:</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_SEARCH_TAGS.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleTagClick(tag)}
                      className="px-2.5 py-1 rounded-lg bg-base-surface-2 hover:bg-warning-fill/15 hover:text-warning-text text-text-secondary text-xs font-semibold border border-border hover:border-warning-border transition-colors cursor-pointer flex items-center space-x-1"
                    >
                      <Tag className="w-3 h-3 opacity-60" />
                      <span>{tag}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer View All Results / Total Count Bar */}
          {searchQuery.trim() && searchResults.length > 0 && (
            <div className="p-2 bg-base-surface-2 border-t border-border flex items-center justify-between text-xs">
              <span className="text-[11px] text-text-muted">
                Toplam <strong>{totalMatchCount}</strong> sonuç bulundu
              </span>

              <button
                type="button"
                onClick={() => {
                  onSearchSubmit(searchQuery);
                  setIsOpen(false);
                }}
                className="px-3 py-1 bg-warning-fill hover:opacity-90 text-base rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer shadow-2xs"
              >
                <span>Tüm Sonuçları Listele</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductSearchAutocomplete;
