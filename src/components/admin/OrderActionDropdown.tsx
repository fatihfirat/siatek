import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  MoreHorizontal, 
  Barcode, 
  Truck, 
  Receipt, 
  Printer, 
  FileText, 
  XCircle,
  ChevronDown
} from 'lucide-react';
import { Order } from '../../types';

interface OrderActionDropdownProps {
  order: Order;
  onOpenPicking: () => void;
  onOpenPacking: () => void;
  onOpenReceipts: () => void;
  onPrintThermalReceipt: () => void;
  onOpenInvoices: () => void;
  onCancelOrder?: () => void;
}

export const OrderActionDropdown: React.FC<OrderActionDropdownProps> = ({
  order,
  onOpenPicking,
  onOpenPacking,
  onOpenReceipts,
  onPrintThermalReceipt,
  onOpenInvoices,
  onCancelOrder
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<React.CSSProperties>({});
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const MENU_W = 240; // w-60
  const GAP = 6;

  // Menu artik document.body'ye portal ile basiliyor. Sebep: her siparis karti
  // kendi yiginlama baglamini (stacking context) olusturuyordu; menunun
  // z-[100]'u o baglamin ICINDE kaliyor ve alttaki kartlar menunun uzerine
  // biniyordu. Portal + position:fixed bunu tamamen asar; overflow kirpmasindan
  // da kurtarir. (19.09.2026)
  const hesaplaKonum = useCallback(() => {
    const el = dropdownRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const altBosluk = window.innerHeight - r.bottom;
    const ustBosluk = r.top;
    const tahminiYukseklik = 320;
    const yukariAc = altBosluk < tahminiYukseklik && ustBosluk > altBosluk;

    const left = Math.max(8, Math.min(r.right - MENU_W, window.innerWidth - MENU_W - 8));
    setCoords(
      yukariAc
        ? { position: 'fixed', left, bottom: window.innerHeight - r.top + GAP, maxHeight: ustBosluk - 16 }
        : { position: 'fixed', left, top: r.bottom + GAP, maxHeight: altBosluk - 16 }
    );
  }, []);

  const toggleDropdown = () => {
    if (!isOpen) hesaplaKonum();
    setIsOpen(prev => !prev);
  };

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const t = event.target as Node;
      const butonda = dropdownRef.current?.contains(t);
      const menude = menuRef.current?.contains(t);
      if (!butonda && !menude) setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Sabit konumlu menu sayfayla birlikte kaymaz; kaydirma/boyut degisiminde
  // konumu yeniden hesapla ki butona yapisik kalsin.
  useEffect(() => {
    if (!isOpen) return;
    const yenile = () => hesaplaKonum();
    window.addEventListener('scroll', yenile, true);
    window.addEventListener('resize', yenile);
    return () => {
      window.removeEventListener('scroll', yenile, true);
      window.removeEventListener('resize', yenile);
    };
  }, [isOpen, hesaplaKonum]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        id={`order-actions-btn-${order.id}`}
        onClick={toggleDropdown}
        aria-expanded={isOpen}
        className="px-2.5 py-1.5 bg-base-surface-2 hover:bg-base-surface text-text-primary border border-border hover:border-border-strong rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer shadow-2xs"
        title="Tüm Operasyonel İşlemler"
      >
        <MoreHorizontal className="w-3.5 h-3.5 text-text-muted" />
        <span className="hidden sm:inline">Diğer İşlemler</span>
        <ChevronDown className={`w-3 h-3 text-text-muted transition-transform duration-150 ${isOpen ? (coords.bottom !== undefined ? 'rotate-0' : 'rotate-180') : ''}`} />
      </button>

      {isOpen && createPortal(
        <div
          ref={menuRef}
          style={{ ...coords, width: MENU_W, zIndex: 2147483000 }}
          className="bg-base-surface border border-border rounded-xl shadow-2xl py-1 text-xs animate-in fade-in zoom-in-95 duration-100 divide-y divide-border/60 overflow-y-auto"
          role="menu"
        >
          {/* Warehouse Section */}
          <div className="py-1">
            <div className="px-3 py-1 text-[10px] font-bold text-text-muted uppercase tracking-wider">
              Depo & Sevkiyat
            </div>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                onOpenPicking();
              }}
              className="w-full text-left px-3 py-2 text-text-primary hover:bg-base-surface-2 flex items-center space-x-2.5 transition-colors cursor-pointer"
            >
              <div className="p-1 rounded-md bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                <Barcode className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold truncate">WMS Depo Toplama</div>
                <div className="text-[10px] text-text-muted truncate">Raf sırası ve barkod okutma</div>
              </div>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                onOpenPacking();
              }}
              className="w-full text-left px-3 py-2 text-text-primary hover:bg-base-surface-2 flex items-center space-x-2.5 transition-colors cursor-pointer"
            >
              <div className="p-1 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <Truck className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold truncate">Depo Sevkiyat & Çeki</div>
                <div className="text-[10px] text-text-muted truncate">Koli ve sevkiyat doğrulama</div>
              </div>
            </button>
          </div>

          {/* Financial & Invoicing Section */}
          <div className="py-1">
            <div className="px-3 py-1 text-[10px] font-bold text-text-muted uppercase tracking-wider">
              Muhasebe & Belge
            </div>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                onOpenReceipts();
              }}
              className="w-full text-left px-3 py-2 text-text-primary hover:bg-base-surface-2 flex items-center space-x-2.5 transition-colors cursor-pointer"
            >
              <div className="p-1 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <Receipt className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold truncate">Banka Dekontları</div>
                <div className="text-[10px] text-text-muted truncate">Havale/EFT doğrulama masası</div>
              </div>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                onPrintThermalReceipt();
              }}
              className="w-full text-left px-3 py-2 text-text-primary hover:bg-base-surface-2 flex items-center space-x-2.5 transition-colors cursor-pointer"
            >
              <div className="p-1 rounded-md bg-teal-500/15 text-teal-600 dark:text-teal-400">
                <Printer className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold truncate">80mm Termal Fiş</div>
                <div className="text-[10px] text-text-muted truncate">POS fiş çıktısı al</div>
              </div>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                onOpenInvoices();
              }}
              className="w-full text-left px-3 py-2 text-text-primary hover:bg-base-surface-2 flex items-center space-x-2.5 transition-colors cursor-pointer"
            >
              <div className="p-1 rounded-md bg-purple-500/15 text-purple-600 dark:text-purple-400">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold truncate">GİB E-Fatura / E-Arşiv</div>
                <div className="text-[10px] text-text-muted truncate">Resmi UBL fatura üret</div>
              </div>
            </button>
          </div>

          {/* Destructive / Cancel Action */}
          {onCancelOrder && (
            <div className="py-1">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsOpen(false);
                  onCancelOrder();
                }}
                className="w-full text-left px-3 py-2 text-danger-text hover:bg-bg-danger flex items-center space-x-2.5 transition-colors cursor-pointer"
              >
                <div className="p-1 rounded-md bg-danger-fill/15 text-danger-text">
                  <XCircle className="w-3.5 h-3.5" />
                </div>
                <div className="font-semibold">Siparişi İptal Et</div>
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};
