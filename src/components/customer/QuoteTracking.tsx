import React, { useState, useMemo } from 'react';
import type { Quote, User } from '../../types';
import { Button, FeedbackState, Select, Skeleton, StatusBadge, TextInput } from '../ui';
import OrderPagination from '../common/OrderPagination';
import { 
  Search, 
  Clock, 
  FileText, 
  Printer, 
  CheckCircle2, 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Copy, 
  Check, 
  X, 
  MessageCircle, 
  Share2, 
  MapPin, 
  Calendar, 
  CreditCard, 
  AlertTriangle,
  ArrowUpDown,
  Lock,
  Layers,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { copyToClipboard, openWhatsAppShare } from '../../utils/shareUtils';

interface QuoteTrackingProps {
  quotes: Quote[];
  user: User | null;
  loading?: boolean;
  error?: string;
  actionError?: string;
  isAccepting?: boolean;
  onRetry?: () => void;
  onLogin: () => void;
  onNewQuote: () => void;
  onAcceptQuote: (quoteId: string) => Promise<void> | void;
  onViewPdf: (quote: Quote) => void;
  onShareWhatsApp?: (quote: Quote) => void;
  onGoToCatalog?: () => void;
}

export default function QuoteTracking({
  quotes = [],
  user,
  loading = false,
  error,
  actionError,
  isAccepting = false,
  onRetry,
  onLogin,
  onNewQuote,
  onAcceptQuote,
  onViewPdf,
  onShareWhatsApp,
  onGoToCatalog,
}: QuoteTrackingProps) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'price_desc' | 'price_asc'>('newest');
  const [expandedQuotes, setExpandedQuotes] = useState<Record<string, boolean>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Status counts for KPI chips
  const counts = useMemo(() => {
    return {
      all: quotes.length,
      offer_sent: quotes.filter(q => q.status === 'offer_sent').length,
      pending_review: quotes.filter(q => q.status === 'pending_review' || q.status === 'pending').length,
      accepted: quotes.filter(q => q.status === 'accepted').length,
      rejected: quotes.filter(q => q.status === 'rejected' || q.status === 'expired').length,
    };
  }, [quotes]);

  // Toggle individual quote expansion
  const toggleExpand = (quoteId: string) => {
    setExpandedQuotes(prev => ({
      ...prev,
      [quoteId]: !prev[quoteId]
    }));
  };

  // Expand / Collapse all visible quotes
  const isAllExpanded = useMemo(() => {
    if (quotes.length === 0) return false;
    return quotes.every(q => expandedQuotes[q.id]);
  }, [quotes, expandedQuotes]);

  const handleToggleAll = () => {
    if (isAllExpanded) {
      setExpandedQuotes({});
    } else {
      const allOpen: Record<string, boolean> = {};
      quotes.forEach(q => { allOpen[q.id] = true; });
      setExpandedQuotes(allOpen);
    }
  };

  // Copy quote number handler
  const handleCopyQuoteNumber = async (e: React.MouseEvent, quoteNumber: string, id: string) => {
    e.stopPropagation();
    const success = await copyToClipboard(quoteNumber);
    if (success) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Filter and sort quotes
  const visibleQuotes = useMemo(() => {
    let result = [...quotes];

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'pending_review') {
        result = result.filter(q => q.status === 'pending_review' || q.status === 'pending');
      } else if (statusFilter === 'rejected') {
        result = result.filter(q => q.status === 'rejected' || q.status === 'expired');
      } else {
        result = result.filter(q => q.status === statusFilter);
      }
    }

    // Search query (multi-field matching)
    if (query.trim()) {
      const q = query.trim().toLocaleLowerCase('tr-TR');
      result = result.filter(quote => {
        const matchNumber = (quote.quoteNumber || '').toLocaleLowerCase('tr-TR').includes(q);
        const matchCity = (quote.deliveryCity || '').toLocaleLowerCase('tr-TR').includes(q);
        const matchNote = (quote.adminResponseNote || quote.customerNote || '').toLocaleLowerCase('tr-TR').includes(q);
        const matchPayment = (quote.paymentTerms || '').toLocaleLowerCase('tr-TR').includes(q);
        const matchOffered = (quote.offeredItems || []).some(item => 
          (item.productName || '').toLocaleLowerCase('tr-TR').includes(q)
        );
        const matchRequested = (quote.requestedItems || []).some(item => 
          (item.productName || '').toLocaleLowerCase('tr-TR').includes(q)
        );
        return matchNumber || matchCity || matchNote || matchPayment || matchOffered || matchRequested;
      });
    }

    // Sort order
    result.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === 'price_desc') {
        return (b.grandTotal || 0) - (a.grandTotal || 0);
      }
      if (sortBy === 'price_asc') {
        return (a.grandTotal || 0) - (b.grandTotal || 0);
      }
      return 0;
    });

    return result;
  }, [quotes, statusFilter, query, sortBy]);

  // Pagination slice
  const totalItems = visibleQuotes.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedQuotes = visibleQuotes.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize
  );

  // Status badge generator
  const renderStatusBadge = (status: Quote['status']) => {
    switch (status) {
      case 'offer_sent':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-bg-success text-success-text border border-success-border text-xs font-bold shadow-2xs animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-success-text" />
            <span>Teklif Geldi (Onay Bekliyor)</span>
          </span>
        );
      case 'pending':
      case 'pending_review':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-bg-warning text-warning-text border border-warning-border text-xs font-semibold">
            <Clock className="w-3.5 h-3.5 text-warning-text" />
            <span>İnceleniyor</span>
          </span>
        );
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-bg-info text-info-text border border-info-border text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-info-text" />
            <span>Siparişe Dönüştü</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-bg-danger text-danger-text border border-danger-border text-xs font-semibold">
            <X className="w-3.5 h-3.5" />
            <span>Reddedildi</span>
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-base-surface-2 text-text-muted border border-border text-xs font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Süresi Doldu</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-base-surface-2 text-text-secondary border border-border text-xs">
            {status}
          </span>
        );
    }
  };

  // 1. Unauthenticated State
  if (!user) {
    return (
      <div className="p-10 sm:p-12 text-center bg-base-surface rounded-3xl border border-border shadow-xs ui-tab-fade">
        <div className="w-14 h-14 rounded-2xl bg-bg-warning text-warning-text border border-warning-border flex items-center justify-center mx-auto mb-4">
          <Lock className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-text-primary mb-1.5">
          Teklif Taleplerinizi Görmek İçin Bayi Girişi Yapın
        </h3>
        <p className="text-xs text-text-secondary max-w-md mx-auto mb-5">
          Firmamıza ilettiğiniz proforma teklif taleplerini, tedarikçi özel iskontolarını ve PDF teklif mektuplarını incelemek için oturum açınız.
        </p>
        <button
          type="button"
          onClick={onLogin}
          className="px-6 py-2.5 bg-warning-fill text-slate-950 rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center space-x-2 cursor-pointer active:scale-[0.98]"
        >
          <Lock className="w-4 h-4" />
          <span>Bayi Girişi Yap</span>
        </button>
      </div>
    );
  }

  // 2. Loading State
  if (loading) {
    return (
      <div aria-label="Teklifler yükleniyor" className="space-y-3 ui-tab-fade">
        <div className="ui-skeleton h-28 rounded-2xl" />
        <div className="ui-skeleton h-24 rounded-2xl" />
        <div className="ui-skeleton h-24 rounded-2xl" />
      </div>
    );
  }

  // 3. Error State
  if (error) {
    return (
      <FeedbackState
        kind="error"
        title="Teklifler yüklenemedi"
        description={error}
        action={onRetry ? <Button onClick={onRetry}>Tekrar dene</Button> : undefined}
      />
    );
  }

  // 4. Empty Quotes State (No Quotes Created Yet)
  if (quotes.length === 0) {
    return (
      <div className="p-10 sm:p-12 text-center bg-base-surface rounded-2xl border border-border text-text-muted text-xs shadow-xs space-y-3 ui-tab-fade">
        <FileText className="w-10 h-10 mx-auto opacity-30 text-warning-text" />
        <h3 className="font-semibold text-text-primary text-sm">Henüz kayıtlı teklif talebiniz bulunmuyor</h3>
        <p className="max-w-md mx-auto text-text-secondary">
          Özel iskonto ve toplu proje alımları için hızlıca fiyat teklifi isteyebilirsiniz.
        </p>
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            type="button"
            onClick={onNewQuote}
            className="px-4 py-2 bg-warning-fill text-slate-950 rounded-xl text-xs font-bold cursor-pointer hover:opacity-90 active:scale-[0.98]"
          >
            İlk Teklifinizi İsteyin
          </button>
          {onGoToCatalog && (
            <button
              type="button"
              onClick={onGoToCatalog}
              className="px-4 py-2 bg-base-surface-2 hover:bg-base-surface text-text-primary border border-border rounded-xl text-xs font-semibold cursor-pointer"
            >
              Kataloğa Dön
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="ui-scope quote-tracking-premium space-y-4 ui-tab-fade">
      {/* Top Header & New Quote Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-text-primary flex items-center space-x-2">
            <FileText className="w-5 h-5 text-warning-text" />
            <span>Teklif Taleplerim & Gelen Özel Fiyatlar</span>
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            Özel iskonto oranlarınızı, tedarikçi notlarını ve proforma teklif belgelerinizi inceleyin.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onNewQuote}
            className="px-3.5 py-2 bg-warning-fill hover:opacity-90 text-slate-950 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Yeni Teklif İste</span>
          </button>
        </div>
      </div>

      <div className="quote-tracking-premium__summary" aria-label="Teklif özeti">
        <div className="quote-tracking-premium__summary-card quote-tracking-premium__summary-card--primary">
          <span>Toplam teklif</span>
          <strong className="tabular-nums">{counts.all}</strong>
          <small>kayıtlı talep</small>
        </div>
        <div className="quote-tracking-premium__summary-card">
          <span>Onay bekleyen</span>
          <strong className="tabular-nums">{counts.offer_sent}</strong>
          <small>gözden geçirilmeye hazır</small>
        </div>
        <div className="quote-tracking-premium__summary-card">
          <span>Siparişe dönüşen</span>
          <strong className="tabular-nums">{counts.accepted}</strong>
          <small>tamamlanan teklif akışı</small>
        </div>
        <div className="quote-tracking-premium__summary-card">
          <span>İnceleniyor</span>
          <strong className="tabular-nums">{counts.pending_review}</strong>
          <small>Alpha Teknik yanıtı bekleniyor</small>
        </div>
      </div>

      {actionError && (
        <div role="alert" className="p-3 rounded-xl bg-bg-danger text-danger-text border border-danger-border text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Search, Filter Toolbar & KPI Chips */}
      <div className="space-y-3 bg-base-surface p-3 sm:p-4 rounded-2xl border border-border shadow-xs">
        
        {/* Search Input & Select Row */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <div className="sm:col-span-6 relative">
            <TextInput
              label="Teklif veya ürün ara"
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Teklif No (TKL-...), ürün adı, şehir veya şantiye ara..."
            />
          </div>

          <div className="sm:col-span-3">
            <Select
              label="Teklif durumu"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">Tüm Durumlar ({counts.all})</option>
              <option value="offer_sent">Onay Bekleyenler ({counts.offer_sent})</option>
              <option value="pending_review">İnceleniyor ({counts.pending_review})</option>
              <option value="accepted">Siparişe Dönüştü ({counts.accepted})</option>
              <option value="rejected">Reddedildi / Süresi Doldu ({counts.rejected})</option>
            </Select>
          </div>

          <div className="sm:col-span-3">
            <Select
              label="Sıralama"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="newest">En Yeni Teklif</option>
              <option value="oldest">En Eski Teklif</option>
              <option value="price_desc">Tutar: Yüksekten Düşüğe</option>
              <option value="price_asc">Tutar: Düşükten Yükseğe</option>
            </Select>
          </div>
        </div>

        {/* Quick KPI Status Filter Chips & Expand All Toggle */}
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 pt-1 border-t border-border/50">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
            {[
              {
                key: 'all',
                label: 'Tümü',
                count: counts.all,
                activeClass: 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 border-slate-900 dark:border-slate-100 shadow-sm font-extrabold',
                inactiveClass: 'bg-base-surface-2 hover:bg-base-surface-3 text-text-secondary hover:text-text-primary border-border'
              },
              {
                key: 'offer_sent',
                label: 'Onay Bekleyen',
                count: counts.offer_sent,
                activeClass: 'bg-emerald-600 text-white border-emerald-700 shadow-sm font-extrabold ring-2 ring-emerald-500/40',
                inactiveClass: 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
              },
              {
                key: 'pending_review',
                label: 'İnceleniyor',
                count: counts.pending_review,
                activeClass: 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm font-extrabold',
                inactiveClass: 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/30'
              },
              {
                key: 'accepted',
                label: 'Siparişe Dönüştü',
                count: counts.accepted,
                activeClass: 'bg-blue-600 text-white border-blue-700 shadow-sm font-extrabold',
                inactiveClass: 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-800 dark:text-blue-300 border-blue-500/30'
              },
              {
                key: 'rejected',
                label: 'Red / Süresi Dolan',
                count: counts.rejected,
                activeClass: 'bg-rose-600 text-white border-rose-700 shadow-sm font-extrabold',
                inactiveClass: 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-500/30'
              },
            ].map((chip) => {
              const isSelected = statusFilter === chip.key;
              return (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => {
                    setStatusFilter(chip.key);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all flex items-center space-x-1.5 cursor-pointer shrink-0 border ${
                    isSelected ? chip.activeClass : chip.inactiveClass
                  }`}
                >
                  <span>{chip.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      isSelected
                        ? chip.key === 'pending_review'
                          ? 'bg-slate-950/20 text-slate-950'
                          : chip.key === 'all'
                          ? 'bg-white/20 dark:bg-slate-950/20 text-white dark:text-slate-950'
                          : 'bg-white/20 text-white'
                        : 'bg-base-surface text-text-muted border border-border/50'
                    }`}
                  >
                    {chip.count}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleToggleAll}
            className="px-2.5 py-1 text-[11px] font-medium text-text-secondary hover:text-text-primary bg-base-surface-2 hover:bg-base-surface rounded-lg border border-border flex items-center gap-1 cursor-pointer transition-colors shrink-0"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{isAllExpanded ? 'Tümünü Daralt' : 'Tümünü Genişlet'}</span>
          </button>
        </div>

      </div>

      {/* Filtered Empty State */}
      {visibleQuotes.length === 0 ? (
        <FeedbackState
          kind="empty"
          title="Arama kriterlerinize uygun teklif bulunamadı"
          description="Arama teriminizi veya durum filtresini değiştirerek tekrar deneyebilirsiniz."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setQuery('');
                setStatusFilter('all');
                setCurrentPage(1);
              }}
            >
              Filtreleri Temizle
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {/* Quotes Accordion List */}
          <div className="space-y-3">
            {paginatedQuotes.map((quote) => {
              const isExpanded = !!expandedQuotes[quote.id];
              const isReadyOffer = quote.status === 'offer_sent';
              const offeredItems = quote.offeredItems || [];
              const requestedItems = quote.requestedItems || [];
              const itemsCount = offeredItems.length > 0 ? offeredItems.length : requestedItems.length;
              const hasDiscount = offeredItems.some(i => i.discountRate > 0);
              const maxDiscount = offeredItems.reduce((max, i) => Math.max(max, i.discountRate || 0), 0);

              return (
                <div
                  key={quote.id}
                  id={`quote-card-${quote.id}`}
                  className={`rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs ${
                    isReadyOffer
                      ? 'bg-base-surface border-success-border/60 ring-1 ring-success-border/30 hover:border-success-border'
                      : isExpanded
                      ? 'bg-base-surface border-border-strong ring-1 ring-border-strong/20'
                      : 'bg-base-surface border-border hover:border-border-strong'
                  }`}
                >
                  {/* Compact Header Bar (Always Visible) */}
                  <div
                    onClick={() => toggleExpand(quote.id)}
                    className="p-3.5 sm:p-4.5 cursor-pointer select-none flex flex-col lg:flex-row lg:items-center justify-between gap-3 hover:bg-base-surface-2/40 transition-colors"
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleExpand(quote.id);
                      }
                    }}
                  >
                    {/* Left: ID, Badge, Meta Info */}
                    <div className="flex items-start sm:items-center space-x-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-transform ${
                          isReadyOffer
                            ? 'bg-bg-success text-success-text border border-success-border'
                            : 'bg-bg-warning text-warning-text border border-warning-border'
                        }`}
                      >
                        TKL
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <div className="flex items-center gap-1">
                            <span className="font-extrabold text-sm text-text-primary tracking-tight font-mono">
                              {quote.quoteNumber}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleCopyQuoteNumber(e, quote.quoteNumber, quote.id)}
                              className="p-1 rounded hover:bg-base-surface-2 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                              title="Teklif numarasını kopyala"
                            >
                              {copiedId === quote.id ? (
                                <Check className="w-3 h-3 text-success-text" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>

                          {renderStatusBadge(quote.status)}

                          {hasDiscount && maxDiscount > 0 && (
                            <span className="px-2 py-0.5 rounded-md bg-bg-success text-success-text border border-success-border font-extrabold text-[10px] whitespace-nowrap">
                              %{maxDiscount.toFixed(1)} İskonto
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-text-muted" />
                            {new Date(quote.createdAt).toLocaleDateString('tr-TR')}
                          </span>
                          {quote.deliveryCity && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-text-muted" />
                              {quote.deliveryCity}
                            </span>
                          )}
                          <span className="px-1.5 py-0.5 rounded bg-base-surface-2 text-text-secondary border border-border/50 text-[11px] font-medium">
                            {itemsCount} Kalem Malzeme
                          </span>
                          {quote.paymentTerms && (
                            <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-text-secondary">
                              <CreditCard className="w-3 h-3 text-text-muted" />
                              {quote.paymentTerms}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Grand Total & Action Buttons */}
                    <div 
                      className="flex items-center justify-between lg:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-border/50 shrink-0 lg:shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Price Tag - Premium High-Contrast Redesign */}
                      <div className="shrink-0 text-left sm:text-right px-3.5 py-1.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/30 hover:border-emerald-500/60 shadow-2xs transition-all duration-200 min-w-[120px] sm:min-w-[132px]">
                        <span className="text-[9.5px] sm:text-[10px] font-extrabold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block whitespace-nowrap mb-0.5">
                          Teklif Tutarı {quote.grandTotal ? '(KDV Dahil)' : ''}
                        </span>
                        {quote.grandTotal ? (
                          <div className="text-sm sm:text-base font-black font-mono tracking-tight whitespace-nowrap tabular-nums flex items-baseline sm:justify-end leading-tight">
                            <span className="text-slate-950 dark:text-emerald-100 drop-shadow-2xs">
                              {quote.grandTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className="ml-1 text-xs sm:text-sm font-black text-emerald-700 dark:text-emerald-400">₺</span>
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-warning-text flex items-center gap-1 whitespace-nowrap sm:justify-end">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Fiyat Bekleniyor</span>
                          </span>
                        )}
                      </div>

                      {/* Primary / Secondary Action Buttons */}
                      <div className="flex items-center gap-1.5">
                        {/* Quick PDF button */}
                        <button
                          type="button"
                          onClick={() => onViewPdf(quote)}
                          className="px-3 py-1.5 bg-base-surface-2 hover:bg-base-surface text-text-primary border border-border rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs shrink-0"
                          title="Resmi Antetli Teklif PDF İncele / Yazdır"
                        >
                          <Printer className="w-3.5 h-3.5 text-success-text" />
                          <span className="hidden sm:inline">PDF</span>
                        </button>

                        {/* Direct Accept Button for Ready Offers */}
                        {isReadyOffer && (
                          <button
                            type="button"
                            disabled={isAccepting}
                            onClick={() => onAcceptQuote(quote.id)}
                            className="px-3.5 py-1.5 bg-success-fill hover:opacity-95 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer active:scale-[0.98] shrink-0"
                            title="Bu teklifi kabul et ve anında siparişe dönüştür"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Onayla</span>
                          </button>
                        )}

                        {/* Accordion Expand / Collapse Toggle Chevron */}
                        <button
                          type="button"
                          onClick={() => toggleExpand(quote.id)}
                          className="p-1.5 rounded-xl border border-border bg-base-surface hover:bg-base-surface-2 text-text-secondary hover:text-text-primary transition-colors cursor-pointer ml-1"
                          aria-label={isExpanded ? 'Detayları gizle' : 'Detayları göster'}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-text-primary" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-text-secondary" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expandable Accordion Body */}
                  {isExpanded && (
                    <div className="border-t border-border bg-base-surface-2/30 p-4 sm:p-5 space-y-4 animate-in fade-in-50 duration-150">
                      
                      {/* 1. Itemized Product Table */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-text-secondary uppercase tracking-wider">
                          <span>{offeredItems.length > 0 ? 'Tedarikçi Tarafından Sunulan Fiyatlar' : 'Talep Edilen Malzeme Listesi'}</span>
                          <span className="text-[11px] font-normal lowercase text-text-muted">
                            {itemsCount} kalem malzeme
                          </span>
                        </div>

                        {offeredItems.length > 0 ? (
                          <div className="overflow-x-auto rounded-xl border border-border bg-base-surface">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-base-surface-2 text-[11px] font-bold text-text-muted border-b border-border">
                                <tr>
                                  <th className="p-3">Ürün / Kalem</th>
                                  <th className="p-3 text-center">Miktar</th>
                                  <th className="p-3 text-right">Liste Fiyatı</th>
                                  <th className="p-3 text-center">İskonto</th>
                                  <th className="p-3 text-right">Teklif Birim Fiyatı</th>
                                  <th className="p-3 text-right">Satır Toplamı</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {offeredItems.map((item, idx) => (
                                  <tr key={idx} className="hover:bg-base-surface-2/50 transition-colors">
                                    <td className="p-3 font-semibold text-text-primary">
                                      {item.productName}
                                      {item.adminNote && (
                                        <span className="block text-[11px] font-normal text-text-muted mt-0.5">
                                          Not: {item.adminNote}
                                        </span>
                                      )}
                                    </td>
                                    <td className="p-3 text-center font-mono text-text-secondary">
                                      {item.quantity} {item.unit}
                                    </td>
                                    <td className="p-3 text-right text-text-muted line-through font-mono">
                                      {item.listPrice ? `${item.listPrice.toLocaleString('tr-TR')} ₺` : '-'}
                                    </td>
                                    <td className="p-3 text-center">
                                      {item.discountRate > 0 ? (
                                        <span className="inline-block px-1.5 py-0.5 rounded bg-bg-success text-success-text border border-success-border font-bold text-[10px]">
                                          %{item.discountRate} İskonto
                                        </span>
                                      ) : (
                                        <span className="text-text-muted text-[11px]">Standart</span>
                                      )}
                                    </td>
                                    <td className="p-3 text-right font-bold text-text-primary font-mono">
                                      {item.offeredUnitPrice.toLocaleString('tr-TR')} ₺
                                    </td>
                                    <td className="p-3 text-right font-extrabold text-success-text font-mono">
                                      {item.totalPrice.toLocaleString('tr-TR')} ₺
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="divide-y divide-border bg-base-surface rounded-xl border border-border p-3 text-xs space-y-1.5">
                            {requestedItems.map((req, idx) => (
                              <div key={idx} className="py-2 flex items-center justify-between">
                                <div>
                                  <span className="font-semibold text-text-primary">{req.productName}</span>
                                  <span className="text-text-muted ml-2">
                                    ({req.requestedQuantity} {req.unit})
                                  </span>
                                  {req.note && <span className="text-[11px] text-text-muted block">{req.note}</span>}
                                </div>
                                {req.targetUnitPrice ? (
                                  <span className="text-text-secondary font-mono">
                                    Hedef: {req.targetUnitPrice.toLocaleString('tr-TR')} ₺
                                  </span>
                                ) : (
                                  <span className="text-warning-text font-medium">Fiyatlandırılıyor</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 2. Admin Response Note & Commercial Terms Callout */}
                      {quote.adminResponseNote && (
                        <div className="p-3.5 bg-bg-warning/80 rounded-xl border border-warning-border text-xs space-y-1">
                          <span className="font-bold text-text-primary flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-warning-text" />
                            <span>Tedarikçi Özel Mesajı & İskonto Notu:</span>
                          </span>
                          <p className="text-warning-text leading-relaxed">
                            {quote.adminResponseNote}
                          </p>
                        </div>
                      )}

                      {/* 3. Commercial Details & Financial Breakdown */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        {/* Commercial Terms Box */}
                        <div className="p-3.5 bg-base-surface rounded-xl border border-border text-xs space-y-2">
                          <div className="font-bold text-text-secondary uppercase tracking-wider text-[11px]">
                            Ticari & Teslimat Koşulları
                          </div>
                          <div className="space-y-1.5 text-text-secondary">
                            <div className="flex justify-between">
                              <span>Ödeme Koşulu:</span>
                              <strong className="text-text-primary">{quote.paymentTerms || 'Peşin (Havale/EFT)'}</strong>
                            </div>
                            <div className="flex justify-between">
                              <span>Teslimat Yeri / İli:</span>
                              <strong className="text-text-primary">{quote.deliveryCity || 'Belirtilmedi'}</strong>
                            </div>
                            {quote.validUntil && (
                              <div className="flex justify-between">
                                <span>Teklif Geçerlilik:</span>
                                <strong className="text-warning-text">{quote.validUntil}</strong>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Financial Summary Box */}
                        {quote.grandTotal ? (
                          <div className="p-3.5 bg-base-surface rounded-xl border border-border text-xs space-y-2">
                            <div className="font-bold text-text-secondary uppercase tracking-wider text-[11px]">
                              Finansal Özet
                            </div>
                            <div className="space-y-1.5 text-text-secondary">
                              {quote.subtotal ? (
                                <div className="flex justify-between">
                                  <span>Ara Toplam (KDV Hariç):</span>
                                  <span className="font-mono text-text-primary">{quote.subtotal.toLocaleString('tr-TR')} ₺</span>
                                </div>
                              ) : null}
                              {quote.discountAmount ? (
                                <div className="flex justify-between text-success-text">
                                  <span>Toplam Tanımlanan İskonto:</span>
                                  <span className="font-mono font-semibold">-{quote.discountAmount.toLocaleString('tr-TR')} ₺</span>
                                </div>
                              ) : null}
                              <div className="flex justify-between">
                                <span>KDV (%20):</span>
                                <span className="font-mono text-text-primary">
                                   {quote.taxAmount 
                                    ? `${quote.taxAmount.toLocaleString('tr-TR')} ₺` 
                                    : quote.subtotal 
                                    ? `${(Math.round(quote.subtotal * 0.20 * 100) / 100).toLocaleString('tr-TR')} ₺` 
                                    : 'Dahil'}
                                </span>
                              </div>
                              <div className="flex justify-between pt-1.5 border-t border-border font-bold text-sm">
                                <span className="text-text-primary">Teklif Toplamı (KDV Dahil):</span>
                                <span className="text-base font-extrabold text-success-text font-mono">
                                  {quote.grandTotal.toLocaleString('tr-TR')} ₺
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>

                      {/* 4. Expanded Bottom Action Toolbar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onViewPdf(quote)}
                            className="px-3.5 py-1.5 bg-base-surface hover:bg-base-surface-2 text-text-primary border border-border rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
                          >
                            <Printer className="w-3.5 h-3.5 text-success-text" />
                            <span>Resmi Teklif PDF İndir / Yazdır</span>
                          </button>

                          {onShareWhatsApp && (
                            <button
                              type="button"
                              onClick={() => onShareWhatsApp(quote)}
                              className="px-3.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>WhatsApp ile Paylaş</span>
                            </button>
                          )}
                        </div>

                        {isReadyOffer && (
                          <button
                            type="button"
                            disabled={isAccepting}
                            onClick={() => onAcceptQuote(quote.id)}
                            className="px-4 py-2 bg-success-fill hover:opacity-95 text-white font-extrabold rounded-xl text-xs flex items-center space-x-2 shadow-sm transition-all cursor-pointer active:scale-[0.98]"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Teklifi Onayla & Siparişe Dönüştür</span>
                          </button>
                        )}
                      </div>

                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <OrderPagination
            currentPage={safeCurrentPage}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={(p) => setCurrentPage(p)}
            onPageSizeChange={(sz) => {
              setPageSize(sz);
              setCurrentPage(1);
            }}
            pageSizeOptions={[5, 10, 20]}
            itemLabel="teklif"
          />
        </div>
      )}
    </div>
  );
}
