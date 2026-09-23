import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import { Product } from '../../types';
import { normalizeSearchText } from '../../lib/searchUtils';
import HighlightText from '../common/HighlightText';
import { 
  X, 
  Layers, 
  ChevronRight, 
  Search, 
  Check, 
  Package, 
  Sparkles,
  SlidersHorizontal,
  FolderTree,
  Tag
} from 'lucide-react';

interface CategoryDrawerProps {
  products: Product[];
  selectedCategory: string;
  selectedSubCategory?: string;
  onSelectCategory: (category: string, subCategory?: string) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  triggerId?: string;
  buttonClassName?: string;
  customTrigger?: React.ReactNode;
}

export default function CategoryDrawer({
  products,
  selectedCategory,
  selectedSubCategory,
  onSelectCategory,
  isOpen,
  onOpenChange,
  triggerId = 'category-drawer-trigger',
  buttonClassName = '',
  customTrigger,
}: CategoryDrawerProps) {
  const [drawerSearch, setDrawerSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const drawerRef = useRef<HTMLElement | null>(null);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    // Return focus to trigger button
    setTimeout(() => {
      triggerRef.current?.focus();
    }, 50);
  }, [onOpenChange]);

  useModalBehavior(isOpen, handleClose);

  // Auto focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  // Compute category details & subcategories with product counts
  const categoryData = useMemo(() => {
    const map = new Map<string, { total: number; inStock: number; subCategories: Map<string, number> }>();

    products.forEach(p => {
      const cat = p.category || 'Diğer';
      if (!map.has(cat)) {
        map.set(cat, { total: 0, inStock: 0, subCategories: new Map() });
      }
      const data = map.get(cat)!;
      data.total += 1;
      if (p.stock > 0) {
        data.inStock += 1;
      }
      if (p.subCategory && p.subCategory.trim()) {
        const sub = p.subCategory.trim();
        data.subCategories.set(sub, (data.subCategories.get(sub) || 0) + 1);
      }
    });

    const list = Array.from(map.entries()).map(([name, data]) => ({
      name,
      total: data.total,
      inStock: data.inStock,
      subCategories: Array.from(data.subCategories.entries()).map(([sName, count]) => ({
        name: sName,
        count,
      })),
    }));

    // Sort by name or volume
    return list.sort((a, b) => b.total - a.total);
  }, [products]);

  // Filtered categories based on drawer search with Turkish normalization
  const filteredCategories = useMemo(() => {
    if (!drawerSearch.trim()) return categoryData;
    const q = normalizeSearchText(drawerSearch);
    return categoryData.filter(c => {
      const matchesCat = normalizeSearchText(c.name).includes(q);
      const matchesSub = c.subCategories.some(s => normalizeSearchText(s.name).includes(q));
      return matchesCat || matchesSub;
    });
  }, [categoryData, drawerSearch]);

  const handleToggleCategoryExpand = (catName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedCategories(prev => ({
      ...prev,
      [catName]: !prev[catName],
    }));
  };

  const handleSelect = (category: string, subCategory?: string) => {
    onSelectCategory(category, subCategory);
    handleClose();
  };

  return (
    <>
      {/* 1. Hamburger Toggle Button */}
      {customTrigger ? (
        <div onClick={() => onOpenChange(!isOpen)}>{customTrigger}</div>
      ) : (
        <button
          id={triggerId}
          ref={triggerRef}
          type="button"
          aria-expanded={isOpen}
          aria-controls="category-drawer-nav"
          aria-label={isOpen ? 'Kategori menüsünü kapat' : 'Kategori menüsünü aç (Hamburger Menü)'}
          onClick={() => onOpenChange(!isOpen)}
          className={`group flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${
            isOpen
              ? 'bg-success-fill text-base shadow-sm ring-2 ring-success-border/30'
              : selectedCategory !== 'all'
              ? 'bg-bg-success text-success-text border border-success-border hover:opacity-90'
              : 'bg-base-surface text-text-primary hover:text-text-primary hover:bg-base-surface-2 border border-border'
          } ${buttonClassName}`}
          title="Tüm Kategoriler ve Alt Seri Ağacını Aç"
        >
          {/* Stacked three-line hamburger icon */}
          <div className="flex flex-col justify-center items-center gap-[3.5px] w-4 h-3.5" aria-hidden="true">
            <span
              className={`h-[2px] w-3.5 bg-current rounded-full transition-transform duration-200 ${
                isOpen ? 'rotate-45 translate-y-[5.5px]' : ''
              }`}
            />
            <span
              className={`h-[2px] w-3.5 bg-current rounded-full transition-opacity duration-200 ${
                isOpen ? 'opacity-0' : ''
              }`}
            />
            <span
              className={`h-[2px] w-3.5 bg-current rounded-full transition-transform duration-200 ${
                isOpen ? '-rotate-45 -translate-y-[5.5px]' : ''
              }`}
            />
          </div>

          <span className="font-extrabold tracking-wide">Kategoriler</span>

          {selectedCategory !== 'all' && (
            <span className="px-1.5 py-0.5 rounded-md bg-success-fill text-base text-[10px] font-mono leading-none truncate max-w-[90px]">
              {selectedCategory}
            </span>
          )}

          <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-90' : 'text-text-muted group-hover:text-text-primary'}`} />
        </button>
      )}

      {/* 2. Scrim / Backdrop */}
      <div
        id="category-drawer-scrim"
        role="presentation"
        aria-hidden="true"
        onClick={handleClose}
        className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity duration-300 ease-in-out ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* 3. Off-Canvas <nav> Drawer Panel */}
      <nav
        id="category-drawer-nav"
        ref={drawerRef}
        aria-label="Ürün Kategorileri ve Alt Gruplar Gezintisi"
        aria-hidden={!isOpen}
        className={`fixed top-0 right-0 bottom-0 z-50 w-[min(420px,calc(100vw-20px))] bg-base-surface border-l border-border shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-border bg-base-surface-2 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-bg-success text-success-text border border-success-border flex items-center justify-center shadow-xs">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-text-primary tracking-tight flex items-center space-x-1.5">
                <span>Ürün Kategorileri</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-base-surface text-text-secondary border border-border font-mono font-bold">
                  {categoryData.length} Dal
                </span>
              </h2>
              <p className="text-[11px] text-text-muted">Katalog ve stok grupları</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Kategori menüsünü kapat"
            className="w-11 h-11 rounded-xl bg-base-surface hover:bg-base-surface-2 text-text-secondary hover:text-text-primary border border-border flex items-center justify-center transition-colors active:scale-[0.98] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Search Filter Input */}
        <div className="p-3.5 border-b border-border bg-base-surface">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Kategori veya seri ara..."
              value={drawerSearch}
              onChange={e => setDrawerSearch(e.target.value)}
              className="w-full pl-8.5 pr-8 py-2 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary placeholder:text-text-muted focus:border-border-strong shadow-inner transition-colors"
            />
            {drawerSearch && (
              <button
                type="button"
                onClick={() => setDrawerSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Drawer Categories Tree List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
          
          {/* Option: "Tüm Ürünler" / "Tüm Kategoriler" */}
          <button
            type="button"
            onClick={() => handleSelect('all')}
            className={`w-full min-h-11 flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.98] cursor-pointer text-left ${
              selectedCategory === 'all'
                ? 'bg-success-fill text-base shadow-xs'
                : 'bg-base-surface-2 hover:bg-base-surface text-text-primary border border-border'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs ${
                selectedCategory === 'all' ? 'bg-base/20 text-base' : 'bg-base-surface text-text-secondary'
              }`}>
                <Layers className="w-3.5 h-3.5" />
              </div>
              <span>Tüm Kategoriler (Tüm Ürünler)</span>
            </div>

            <div className="flex items-center space-x-1.5">
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-bold ${
                selectedCategory === 'all' ? 'bg-base/20 text-base' : 'bg-base-surface text-text-secondary border border-border'
              }`}>
                {products.length}
              </span>
              {selectedCategory === 'all' && <Check className="w-3.5 h-3.5 text-base ml-0.5" />}
            </div>
          </button>

          {/* Category Items List */}
          {filteredCategories.length === 0 ? (
            <div className="p-8 text-center text-text-muted text-xs">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>"{drawerSearch}" ile eşleşen kategori bulunamadı.</p>
            </div>
          ) : (
            filteredCategories.map(cat => {
              const isSelected = selectedCategory === cat.name;
              const hasSubs = cat.subCategories.length > 0;
              const isExpanded = expandedCategories[cat.name] ?? isSelected;

              return (
                <div key={cat.name} className="space-y-1">
                  
                  {/* Category Main Row */}
                  <div
                    onClick={() => handleSelect(cat.name)}
                    className={`w-full min-h-11 flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer ${
                      isSelected && !selectedSubCategory
                        ? 'bg-success-fill text-base shadow-xs'
                        : isSelected
                        ? 'bg-bg-success border border-success-border text-success-text'
                        : 'bg-base-surface-2 hover:bg-base-surface text-text-primary border border-border'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        isSelected ? 'bg-success-text' : 'bg-border-strong'
                      }`} />
                      <span className="truncate">{cat.name}</span>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-bold ${
                        isSelected && !selectedSubCategory ? 'bg-base/20 text-base' : 'bg-base-surface text-text-secondary border border-border'
                      }`}>
                        {cat.total}
                      </span>

                      {hasSubs && (
                        <button
                          type="button"
                          onClick={(e) => handleToggleCategoryExpand(cat.name, e)}
                          aria-label={`${cat.name} alt serilerini göster/gizle`}
                          className={`p-1 rounded-lg hover:bg-base-surface transition-transform ${
                            isExpanded ? 'rotate-90' : ''
                          }`}
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Subcategories (if any) */}
                  {hasSubs && isExpanded && (
                    <div className="pl-5 pr-1 py-1 space-y-1 border-l-2 border-success-border/60 ml-3.5">
                      {cat.subCategories.map(sub => {
                        const isSubSelected = selectedCategory === cat.name && selectedSubCategory === sub.name;
                        return (
                          <button
                            key={sub.name}
                            type="button"
                            onClick={() => handleSelect(cat.name, sub.name)}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] transition-colors cursor-pointer text-left ${
                              isSubSelected
                                ? 'bg-warning-fill text-base font-bold shadow-2xs'
                                : 'text-text-secondary hover:text-text-primary hover:bg-base-surface-2'
                            }`}
                          >
                            <span className="truncate">{sub.name}</span>
                            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                              isSubSelected ? 'bg-base/20 text-base' : 'bg-base-surface text-text-muted border border-border'
                            }`}>
                              {sub.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                </div>
              );
            })
          )}

        </div>

        {/* Drawer Footer */}
        <div className="p-3.5 bg-base-surface-2 border-t border-border flex items-center justify-between text-[11px] text-text-secondary">
          <div>
            Toplam <strong>{products.length}</strong> ürün
          </div>
          <div className="flex items-center space-x-1 text-text-muted">
            <span>Kapatmak için</span>
            <kbd className="px-1.5 py-0.5 bg-base-surface border border-border rounded text-[9px] font-mono font-bold text-text-primary">
              ESC
            </kbd>
          </div>
        </div>

      </nav>
    </>
  );
}
