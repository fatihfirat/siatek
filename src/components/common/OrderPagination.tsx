import React from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight 
} from 'lucide-react';

export interface OrderPaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
}

export const OrderPagination: React.FC<OrderPaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  itemLabel = 'sipariş'
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  if (totalItems === 0) return null;

  const startItem = (safeCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(safeCurrentPage * pageSize, totalItems);

  // Generate page numbers with smart ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (safeCurrentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (safeCurrentPage >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-base-surface p-3 sm:p-4 rounded-2xl border border-border text-xs text-text-secondary shadow-xs">
      
      {/* Left: Range and total information */}
      <div className="flex items-center gap-2">
        <span className="font-medium text-text-primary">
          Toplam <strong className="font-bold text-brand-600 dark:text-brand-400">{totalItems}</strong> {itemLabel}
        </span>
        <span className="text-text-muted">•</span>
        <span>
          Gösterilen: <strong className="font-semibold text-text-primary">{startItem} - {endItem}</strong>
        </span>
      </div>

      {/* Right: Controls & Page Buttons */}
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
        
        {/* Page Size Selector */}
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-text-muted hidden sm:inline">Sayfa Başına:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              aria-label="Sayfa başına kayıt sayısı"
              className="bg-base-surface-2 border border-border rounded-lg px-2 py-1 text-xs text-text-primary font-medium focus:outline-hidden focus:ring-1 focus:ring-brand-500 cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} Adet
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Page Nav Buttons */}
        {totalPages > 1 && (
          <div className="flex items-center space-x-1" role="navigation" aria-label="Sayfalama Navigasyonu">
            
            {/* First Page */}
            <button
              type="button"
              onClick={() => onPageChange(1)}
              disabled={safeCurrentPage === 1}
              aria-label="İlk Sayfa"
              className="p-1.5 rounded-lg border border-border hover:bg-base-surface-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-text-primary cursor-pointer"
              title="İlk Sayfa"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>

            {/* Prev Page */}
            <button
              type="button"
              onClick={() => onPageChange(safeCurrentPage - 1)}
              disabled={safeCurrentPage === 1}
              aria-label="Önceki Sayfa"
              className="p-1.5 rounded-lg border border-border hover:bg-base-surface-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-text-primary cursor-pointer"
              title="Önceki Sayfa"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {/* Numeric Page Buttons */}
            {getPageNumbers().map((p, idx) => {
              if (p === '...') {
                return (
                  <span key={`ellipsis-${idx}`} className="px-2 py-1 text-text-muted select-none">
                    ...
                  </span>
                );
              }

              const pageNum = Number(p);
              const isActive = pageNum === safeCurrentPage;

              return (
                <button
                  key={`page-${pageNum}`}
                  type="button"
                  onClick={() => onPageChange(pageNum)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'border border-border bg-base-surface hover:bg-base-surface-2 text-text-primary'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            {/* Next Page */}
            <button
              type="button"
              onClick={() => onPageChange(safeCurrentPage + 1)}
              disabled={safeCurrentPage === totalPages}
              aria-label="Sonraki Sayfa"
              className="p-1.5 rounded-lg border border-border hover:bg-base-surface-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-text-primary cursor-pointer"
              title="Sonraki Sayfa"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {/* Last Page */}
            <button
              type="button"
              onClick={() => onPageChange(totalPages)}
              disabled={safeCurrentPage === totalPages}
              aria-label="Son Sayfa"
              className="p-1.5 rounded-lg border border-border hover:bg-base-surface-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-text-primary cursor-pointer"
              title="Son Sayfa"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>

          </div>
        )}

      </div>
    </div>
  );
};

export default OrderPagination;
