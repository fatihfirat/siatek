import React, { useState, useEffect } from 'react';
import { 
  X, 
  Package, 
  Flame, 
  Home, 
  Cpu, 
  Shield, 
  ShoppingCart, 
  Check, 
  Layers, 
  FileText, 
  Plus,
  ArrowRight,
  Info
} from 'lucide-react';
import { ProjectPackage, Product } from '../../types';
import { DEFAULT_PROJECT_PACKAGES } from '../../data/projectPackages';
import { playNotificationSound } from '../../lib/audio';
import confetti from 'canvas-confetti';
import { useModalBehavior } from '../../hooks/useModalBehavior';

interface ProjectPackagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  products?: Product[];
  onAddPackageToCart: (items: Array<{ product: Product; quantity: number }>) => void;
  onTransferToQuote?: (items: Array<{ productName: string; requestedQuantity: number; unit: string; targetUnitPrice?: number }>) => void;
}

export const ProjectPackagesModal: React.FC<ProjectPackagesModalProps> = ({
  isOpen,
  onClose,
  products = [],
  onAddPackageToCart,
  onTransferToQuote
}) => {
  useModalBehavior(isOpen, onClose);
  const [packages, setPackages] = useState<ProjectPackage[]>(DEFAULT_PROJECT_PACKAGES);
  const [selectedPackage, setSelectedPackage] = useState<ProjectPackage>(DEFAULT_PROJECT_PACKAGES[0]);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  if (!isOpen) return null;

  const safeProducts = Array.isArray(products) ? products : [];
  const safePackages = Array.isArray(packages) ? packages : [];

  const filteredPackages = activeCategory === 'all'
    ? safePackages
    : safePackages.filter(p => p && p.category === activeCategory);

  const getPackageIcon = (cat: string) => {
    switch (cat) {
      case 'daire_tesisat':
        return <Home className="w-5 h-5 text-blue-600" />;
      case 'yerden_isitma':
        return <Flame className="w-5 h-5 text-orange-600" />;
      case 'kombi_montaj':
        return <Cpu className="w-5 h-5 text-emerald-600" />;
      case 'kazan_yangin':
        return <Shield className="w-5 h-5 text-rose-600" />;
      default:
        return <Package className="w-5 h-5 text-primary" />;
    }
  };

  const handleAddToCart = (pkg: ProjectPackage) => {
    const itemsToAdd: Array<{ product: Product; quantity: number }> = [];

    for (const item of pkg.items) {
      const prod = safeProducts.find(p => p && (p.id === item.productId || p.sku === item.sku || p.name === item.productName)) 
        || {
          id: item.productId || 'pkg-prod-' + Math.random(),
          name: item.productName,
          sku: item.sku || 'ST-PKG',
          category: pkg.categoryLabel,
          price: item.unitPrice,
          stock: 999,
          unit: item.unit,
          minOrderQuantity: 1,
          description: pkg.title + ' malzeme kalemi',
          imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop&q=60',
        };
      
      itemsToAdd.push({
        product: prod,
        quantity: item.quantity
      });
    }

    onAddPackageToCart(itemsToAdd);
    confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
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
          className="relative w-full max-w-4xl bg-base-surface border border-border rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-base-surface-2/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-text-primary tracking-tight">
                Şablon Sepetler & Hazır Tesisat Paketleri
              </h2>
              <p className="text-xs text-text-muted">
                Sık kullanılan proje paketlerini (Daire Tesisatı, Yerden Isıtma, Kombi Seti) tek tıkla sepete aktarın.
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

        {/* Category Tabs */}
        <div className="flex items-center space-x-2 px-6 py-3 border-b border-border bg-base-surface overflow-x-auto">
          {[
            { id: 'all', label: 'Tüm Paketler' },
            { id: 'daire_tesisat', label: 'Daire İçi Tesisat' },
            { id: 'yerden_isitma', label: 'Yerden Isıtma & Kollektör' },
            { id: 'kombi_montaj', label: 'Kombi & Kalorifer' },
            { id: 'kazan_yangin', label: 'Kazan & Yangın Grubu' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-base-surface-2 text-text-muted hover:text-text-primary'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-h-[70vh] overflow-y-auto">
          
          {/* Package Selection Cards */}
          <div className="lg:col-span-5 space-y-3">
            {filteredPackages.map((pkg) => (
              <div
                key={pkg.id}
                onClick={() => setSelectedPackage(pkg)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2.5 ${
                  selectedPackage.id === pkg.id
                    ? 'border-primary bg-primary/5 shadow-xs'
                    : 'border-border bg-base-surface-2/60 hover:bg-base-surface-2'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 rounded-xl bg-base-surface border border-border shrink-0">
                      {getPackageIcon(pkg.category)}
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-text-primary leading-tight">
                        {pkg.title}
                      </h4>
                      <span className="text-[11px] text-text-muted">
                        {pkg.categoryLabel} • {pkg.items.length} Kalem Malzeme
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-text-secondary line-clamp-2 leading-relaxed">
                  {pkg.description}
                </p>

                <div className="flex items-center justify-between pt-1 border-t border-border/50 text-xs">
                  <span className="text-[11px] text-text-muted">Tahmini Paket Tutarı:</span>
                  <span className="font-extrabold text-primary">
                    {pkg.estimatedTotal.toLocaleString('tr-TR')} ₺
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Package Detailed Breakdown */}
          <div className="lg:col-span-7 bg-base-surface-2/60 border border-border rounded-2xl p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-start justify-between border-b border-border pb-3">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-text-primary">
                    {selectedPackage.title}
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    {selectedPackage.description}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-base sm:text-lg font-black text-primary">
                    {selectedPackage.estimatedTotal.toLocaleString('tr-TR')} ₺
                  </div>
                  <span className="text-[10px] text-text-muted">+ KDV Dahil Liste Fiyatı</span>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-text-secondary block">
                  Paket İçeriğindeki Malzemeler ({selectedPackage.items.length} Kalem):
                </span>
                
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {selectedPackage.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-base-surface border border-border rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="font-semibold text-text-primary truncate">
                          {item.productName}
                        </div>
                        {item.sku && (
                          <div className="text-[10px] text-text-muted font-mono">
                            {item.sku}
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-bold text-text-primary">
                          {item.quantity} {item.unit}
                        </span>
                        <div className="text-[11px] text-text-muted">
                          {(item.unitPrice * item.quantity).toLocaleString('tr-TR')} ₺
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-[11px] text-text-muted">
                Bayi iskontonuz sepette otomatik uygulanır.
              </span>

              <button
                type="button"
                onClick={() => handleAddToCart(selectedPackage)}
                className="w-full sm:w-auto px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Paketi Sepetime Ekle</span>
              </button>
            </div>

          </div>

        </div>

      </div>
      </div>
    </div>
  );
};
