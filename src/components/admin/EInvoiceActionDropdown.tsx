import React, { useState, useRef, useEffect } from 'react';
import { 
  MoreHorizontal, 
  Eye, 
  Printer, 
  Download, 
  FileCode, 
  Send, 
  XCircle, 
  Trash2,
  ChevronDown
} from 'lucide-react';
import { EInvoice } from '../../types';

interface EInvoiceActionDropdownProps {
  invoice: EInvoice;
  onView: () => void;
  onSendGib?: () => void;
  onExportPdf: () => void;
  onPrintDirect: () => void;
  onDownloadXml: () => void;
  onCancelInvoice?: () => void;
  onDeleteInvoice: () => void;
}

export const EInvoiceActionDropdown: React.FC<EInvoiceActionDropdownProps> = ({
  invoice,
  onView,
  onSendGib,
  onExportPdf,
  onPrintDirect,
  onDownloadXml,
  onCancelInvoice,
  onDeleteInvoice
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = () => {
    if (!isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const estimatedHeight = 280;
      setOpenUpward(spaceBelow < estimatedHeight && spaceAbove > spaceBelow);
    }
    setIsOpen(prev => !prev);
  };

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

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
    <div className={`relative inline-block text-left ${isOpen ? 'z-50' : 'z-10'}`} ref={dropdownRef}>
      <button
        type="button"
        id={`invoice-actions-btn-${invoice.id}`}
        onClick={toggleDropdown}
        aria-expanded={isOpen}
        className="px-2.5 py-1.5 bg-base-surface-2 hover:bg-base-surface text-text-primary border border-border hover:border-border-strong rounded-xl text-xs font-semibold flex items-center space-x-1 transition-all cursor-pointer shadow-2xs"
        title="Tüm Fatura İşlemleri"
      >
        <MoreHorizontal className="w-3.5 h-3.5 text-text-muted" />
        <span className="hidden sm:inline">Diğer</span>
        <ChevronDown className={`w-3 h-3 text-text-muted transition-transform duration-150 ${isOpen ? (openUpward ? 'rotate-0' : 'rotate-180') : ''}`} />
      </button>

      {isOpen && (
        <div 
          className={`absolute right-0 ${
            openUpward ? 'bottom-full mb-1.5 origin-bottom-right' : 'top-full mt-1.5 origin-top-right'
          } w-56 bg-base-surface border border-border rounded-xl shadow-2xl z-[100] py-1 text-xs animate-in fade-in zoom-in-95 duration-100 divide-y divide-border/60 max-h-[calc(100vh-100px)] overflow-y-auto`}
          role="menu"
        >
          {/* Main Inspection & Output Section */}
          <div className="py-1">
            <div className="px-3 py-1 text-[10px] font-bold text-text-muted uppercase tracking-wider">
              Görüntüleme & Çıktı
            </div>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                onView();
              }}
              className="w-full text-left px-3 py-2 text-text-primary hover:bg-base-surface-2 flex items-center space-x-2.5 transition-colors cursor-pointer"
            >
              <div className="p-1 rounded-md bg-info-fill/15 text-info-text">
                <Eye className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold truncate">Detaylı İncele</div>
                <div className="text-[10px] text-text-muted truncate">Önizleme & kalemler</div>
              </div>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                onPrintDirect();
              }}
              className="w-full text-left px-3 py-2 text-text-primary hover:bg-base-surface-2 flex items-center space-x-2.5 transition-colors cursor-pointer"
            >
              <div className="p-1 rounded-md bg-teal-500/15 text-teal-600 dark:text-teal-400">
                <Printer className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold truncate">Doğrudan Yazdır</div>
                <div className="text-[10px] text-text-muted truncate">A4 fatura çıktısı al</div>
              </div>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                onExportPdf();
              }}
              className="w-full text-left px-3 py-2 text-text-primary hover:bg-base-surface-2 flex items-center space-x-2.5 transition-colors cursor-pointer"
            >
              <div className="p-1 rounded-md bg-purple-500/15 text-purple-600 dark:text-purple-400">
                <Download className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold truncate">A4 Resmi PDF İndir</div>
                <div className="text-[10px] text-text-muted truncate">Müşteri onaylı PDF</div>
              </div>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                onDownloadXml();
              }}
              className="w-full text-left px-3 py-2 text-text-primary hover:bg-base-surface-2 flex items-center space-x-2.5 transition-colors cursor-pointer"
            >
              <div className="p-1 rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400">
                <FileCode className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold truncate">UBL-TR 2.1 XML İndir</div>
                <div className="text-[10px] text-text-muted truncate">GİB elektronik XML</div>
              </div>
            </button>
          </div>

          {/* GİB Operations Section */}
          {invoice.status === 'draft' && onSendGib && (
            <div className="py-1">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsOpen(false);
                  onSendGib();
                }}
                className="w-full text-left px-3 py-2 text-success-text hover:bg-bg-success flex items-center space-x-2.5 transition-colors cursor-pointer"
              >
                <div className="p-1 rounded-md bg-success-fill/15 text-success-text">
                  <Send className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold truncate">GİB'e Gönder ve Onayla</div>
                  <div className="text-[10px] text-text-muted truncate">Kod 1300 ile ilet</div>
                </div>
              </button>
            </div>
          )}

          {/* Destructive Section */}
          <div className="py-1">
            {invoice.status !== 'cancelled' && onCancelInvoice && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsOpen(false);
                  onCancelInvoice();
                }}
                className="w-full text-left px-3 py-2 text-warning-text hover:bg-bg-warning flex items-center space-x-2.5 transition-colors cursor-pointer"
              >
                <div className="p-1 rounded-md bg-warning-fill/15 text-warning-text">
                  <XCircle className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold truncate">Faturayı İptal Et</div>
                  <div className="text-[10px] text-text-muted truncate">Gerekçeli resmi iptal</div>
                </div>
              </button>
            )}

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                onDeleteInvoice();
              }}
              className="w-full text-left px-3 py-2 text-danger-text hover:bg-bg-danger flex items-center space-x-2.5 transition-colors cursor-pointer"
            >
              <div className="p-1 rounded-md bg-danger-fill/15 text-danger-text">
                <Trash2 className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold truncate">Fatura Kaydını Sil</div>
                <div className="text-[10px] text-text-muted truncate">Veritabanından kaldır</div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EInvoiceActionDropdown;
