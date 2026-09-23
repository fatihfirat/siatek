import React, { useState, useEffect } from 'react';
import { 
  EInvoice, 
  Order, 
  Quote, 
  Product, 
  CariAccount 
} from '../../types';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  FileCode, 
  Eye, 
  Send, 
  CheckCircle2, 
  Clock, 
  Ban, 
  Trash2, 
  RefreshCw, 
  ShoppingBag, 
  Sparkles, 
  Building2, 
  QrCode, 
  TrendingUp, 
  DollarSign, 
  Receipt, 
  Layers,
  ArrowUpRight,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  User,
  Phone,
  MapPin,
  MessageSquare,
  Printer,
  X,
  FolderArchive
} from 'lucide-react';
import { formatTRY } from '../../utils/exportUtils';
import { exportEInvoiceToPdf, downloadEInvoiceXML, printInvoiceDirectly } from '../../utils/eInvoiceUtils';
import { saveInvoiceToIndexedDB, saveBatchInvoicesToIndexedDB } from '../../utils/eInvoiceIndexedDB';
import { copyToClipboard, generateEInvoiceWhatsAppMessage } from '../../utils/shareUtils';
import OrderPagination from '../common/OrderPagination';
import WhatsAppShareModal from '../common/WhatsAppShareModal';
import EInvoiceActionDropdown from './EInvoiceActionDropdown';
import EInvoiceViewModal from './EInvoiceViewModal';
import EInvoiceCreateModal from './EInvoiceCreateModal';
import EInvoiceArchiveExplorer from './EInvoiceArchiveExplorer';

interface EInvoiceDashboardProps {
  orders: Order[];
  quotes: Quote[];
  products: Product[];
  onOrderSelect?: (order: Order) => void;
  onQuoteSelect?: (quote: Quote) => void;
}

export default function EInvoiceDashboard({
  orders = [],
  quotes = [],
  products = [],
  onOrderSelect,
  onQuoteSelect,
}: EInvoiceDashboardProps) {
  const [invoices, setInvoices] = useState<EInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeViewMode, setActiveViewMode] = useState<'live' | 'archive'>('live');
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'draft' | 'queued' | 'rejected' | 'cancelled'>('all');
  const [profileFilter, setProfileFilter] = useState<'all' | 'TICARIFATURA' | 'TEMELFATURA' | 'EARSIVFATURA'>('all');
  const [selectedCustomerFilter, setSelectedCustomerFilter] = useState<string>('all');

  // Pagination & Master-Detail state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expandedInvoiceIds, setExpandedInvoiceIds] = useState<Set<string>>(new Set());
  const [copiedInvoiceFeedback, setCopiedInvoiceFeedback] = useState<string | null>(null);

  // Modals state
  const [selectedInvoice, setSelectedInvoice] = useState<EInvoice | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [initialOrderForCreate, setInitialOrderForCreate] = useState<Order | null>(null);
  const [initialQuoteForCreate, setInitialQuoteForCreate] = useState<Quote | null>(null);

  // WhatsApp Share Modal state
  const [whatsAppShareState, setWhatsAppShareState] = useState<{
    isOpen: boolean;
    title: string;
    defaultPhone: string;
    defaultMessage: string;
    recipientName?: string;
  }>({
    isOpen: false,
    title: '',
    defaultPhone: '',
    defaultMessage: '',
  });

  // Notification toast
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const readJson = async (res: Response) => {
    const text = await res.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      throw new Error('Sunucu beklenen JSON cevabı vermedi.');
    }
  };

  // Fetch invoices from backend
  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/invoices');
      const data = await readJson(res);
      if (!res.ok) {
        throw new Error(data.error || 'Faturalar okunamadı.');
      }
      if (data && data.invoices) {
        setInvoices(data.invoices);
        // Seamlessly sync to local IndexedDB archive
        saveBatchInvoicesToIndexedDB(data.invoices).catch(console.error);
      }
    } catch (err) {
      console.error('Failed to fetch e-invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const upsertInvoice = (invoice: EInvoice) => {
    setInvoices(prev => prev.map(inv => inv.id === invoice.id ? invoice : inv));
    if (selectedInvoice && selectedInvoice.id === invoice.id) {
      setSelectedInvoice(invoice);
    }
    saveInvoiceToIndexedDB(invoice).catch(console.error);
  };

  // Send draft invoice to GİB
  const handleSendGib = async (invoiceId: string) => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/send-gib`, { method: 'POST' });
      const data = await readJson(res);
      if (res.ok && data.success && data.invoice) {
        upsertInvoice(data.invoice);
        showNotification(`${data.invoice.invoiceNumber} GİB cevabıyla kabul edildi: ${data.gib?.description || data.invoice.gibStatusDescription || '1300'}.`, 'success');
      } else {
        if (data.invoice) {
          upsertInvoice(data.invoice);
        }
        showNotification(data.error || data.gib?.description || 'GİB gönderimi tamamlanmadı.', 'error');
      }
    } catch (err: any) {
      showNotification('GİB entegrasyon hatası oluştu.', 'error');
    }
  };

  const handleCheckGibStatus = async (invoiceId: string) => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/gib-status`);
      const data = await readJson(res);
      if (data.invoice) upsertInvoice(data.invoice);
      if (res.ok) {
        showNotification(data.gib?.description || data.invoice?.gibStatusDescription || 'GİB durumu güncellendi.', data.success ? 'success' : 'info');
      } else {
        showNotification(data.error || 'GİB durumu sorgulanamadı.', 'error');
      }
    } catch {
      showNotification('GİB durum sorgusu bağlantı hatası.', 'error');
    }
  };

  const handleRetryGib = async (invoiceId: string) => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/retry-gib`, { method: 'POST' });
      const data = await readJson(res);
      if (data.invoice) upsertInvoice(data.invoice);
      if (res.ok && data.success) {
        showNotification(data.gib?.description || 'GİB tekrar deneme başarılı.', 'success');
      } else {
        showNotification(data.error || data.gib?.description || 'GİB tekrar deneme beklemede.', res.ok ? 'info' : 'error');
      }
    } catch {
      showNotification('GİB tekrar deneme bağlantı hatası.', 'error');
    }
  };

  const handleExportOfficialArchive = async () => {
    try {
      const res = await fetch('/api/invoices/archive/export');
      if (!res.ok) {
        const data = await readJson(res);
        throw new Error(data.error || 'Arşiv dışa aktarılamadı.');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `alpha-e-belge-arsiv-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showNotification('Resmi e-belge arşivi indirildi.', 'success');
    } catch (err: any) {
      showNotification(err?.message || 'Resmi e-belge arşivi indirilemedi.', 'error');
    }
  };

  // Batch Send Draft Invoices to GİB
  const handleBatchSendGib = async () => {
    if (draftCount === 0) {
      showNotification('Gönderilecek taslak fatura bulunmuyor.', 'info');
      return;
    }
    if (!confirm(`${draftCount} adet taslak faturanın Gelir İdaresi Başkanlığı (GİB) sistemine onaylanarak iletilmesini istiyor musunuz?`)) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/invoices/batch-send-gib', { method: 'POST' });
      const data = await readJson(res);
      if (res.ok && data.success) {
        if (data.invoices) {
          setInvoices(data.invoices);
          for (const inv of data.invoices) {
            saveInvoiceToIndexedDB(inv).catch(console.error);
          }
        }
        showNotification(`${data.processedCount} taslak işlendi, ${data.successCount || 0} belge GİB cevabıyla kabul edildi.`, 'success');
      } else {
        if (data.invoices) setInvoices(data.invoices);
        showNotification(data.error || 'Toplu GİB gönderimi başarısız oldu.', 'error');
      }
    } catch (e) {
      showNotification('GİB entegrasyonu bağlantı hatası.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Cancel invoice
  const handleCancelInvoice = async (invoiceId: string) => {
    const reason = prompt('Lütfen iptal gerekçesini belirtiniz:', 'Müşteri talebi / Yanlış düzenleme');
    if (!reason) return;

    try {
      const res = await fetch(`/api/invoices/${invoiceId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = await readJson(res);
      if (res.ok && data.success && data.invoice) {
        setInvoices(prev => prev.map(inv => inv.id === invoiceId ? data.invoice : inv));
        if (selectedInvoice && selectedInvoice.id === invoiceId) {
          setSelectedInvoice(data.invoice);
        }
        // Update IndexedDB
        saveInvoiceToIndexedDB(data.invoice).catch(console.error);
        showNotification('Fatura başarıyla iptal edildi.', 'info');
      }
    } catch (err) {
      showNotification('İptal işlemi başarısız oldu.', 'error');
    }
  };

  // Delete invoice
  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!confirm('Bu fatura kaydını silmek istediğinize emin misiniz?')) return;

    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, { method: 'DELETE' });
      const data = await readJson(res);
      if (res.ok && data.success) {
        setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
        if (selectedInvoice && selectedInvoice.id === invoiceId) {
          setSelectedInvoice(null);
        }
        showNotification('Fatura kaydı silindi.', 'info');
      }
    } catch (err) {
      showNotification('Silme işlemi başarısız.', 'error');
    }
  };

  // Copy helper
  const handleCopyText = async (text: string, identifier: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedInvoiceFeedback(identifier);
      setTimeout(() => setCopiedInvoiceFeedback(null), 2000);
    }
  };

  // Toggle detail accordion
  const handleToggleExpand = (invoiceId: string) => {
    setExpandedInvoiceIds(prev => {
      const next = new Set(prev);
      if (next.has(invoiceId)) next.delete(invoiceId);
      else next.add(invoiceId);
      return next;
    });
  };

  // Unique Customer list
  const customerOptions = Array.from(new Set(invoices.map(i => i.customerTitle).filter(Boolean))).sort();

  // Status Counts
  const counts = {
    all: invoices.length,
    sent: invoices.filter(i => i.status === 'sent').length,
    draft: invoices.filter(i => i.status === 'draft').length,
    queued: invoices.filter(i => i.status === 'queued').length,
    rejected: invoices.filter(i => i.status === 'rejected').length,
    cancelled: invoices.filter(i => i.status === 'cancelled').length,
  };

  // Filtered Invoices
  const filteredInvoices = invoices.filter(inv => {
    if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
    if (profileFilter !== 'all' && inv.profile !== profileFilter) return false;
    if (selectedCustomerFilter !== 'all' && inv.customerTitle !== selectedCustomerFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchNum = inv.invoiceNumber.toLowerCase().includes(q);
      const matchTitle = (inv.customerTitle || '').toLowerCase().includes(q);
      const matchVkn = (inv.customerVknTckn || '').includes(q);
      const matchUuid = (inv.uuid || '').toLowerCase().includes(q);
      const matchOrder = (inv.orderNumber || '').toLowerCase().includes(q);
      const matchItem = (inv.items || []).some(i => (i.name || '').toLowerCase().includes(q));
      if (!matchNum && !matchTitle && !matchVkn && !matchUuid && !matchOrder && !matchItem) return false;
    }

    return true;
  });

  // Pagination calculation
  const totalItems = filteredInvoices.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedInvoices = filteredInvoices.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize
  );

  // Calculate KPIs
  const totalInvoiced = invoices
    .filter(i => i.status !== 'cancelled')
    .reduce((sum, i) => sum + i.payableAmount, 0);

  const totalVatCalculated = invoices
    .filter(i => i.status !== 'cancelled')
    .reduce((sum, i) => sum + i.totalVat, 0);

  const totalMatrah = invoices
    .filter(i => i.status !== 'cancelled')
    .reduce((sum, i) => sum + (i.taxExclusiveAmount || i.subtotal), 0);

  const sentCount = counts.sent;
  const draftCount = counts.draft;

  // Status Badge Renderer
  const getGibStatusBadge = (status: EInvoice['status']) => {
    switch (status) {
      case 'sent':
        return (
          <span className="px-2.5 py-1 rounded-full bg-bg-success text-success-text border border-success-border text-xs font-bold flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3 text-success-text" />
            <span>GİB Onaylandı</span>
          </span>
        );
      case 'draft':
        return (
          <span className="px-2.5 py-1 rounded-full bg-bg-warning text-warning-text border border-warning-border text-xs font-bold flex items-center space-x-1 animate-pulse">
            <Clock className="w-3 h-3 text-warning-text" />
            <span>Taslak (Bekliyor)</span>
          </span>
        );
      case 'queued':
        return (
          <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center space-x-1">
            <RefreshCw className="w-3 h-3" />
            <span>GİB Kuyruğunda</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2.5 py-1 rounded-full bg-bg-danger text-danger-text border border-danger-border text-xs font-semibold flex items-center space-x-1">
            <Ban className="w-3 h-3 text-danger-text" />
            <span>GİB Hata</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-1 rounded-full bg-bg-danger text-danger-text border border-danger-border text-xs font-semibold flex items-center space-x-1">
            <Ban className="w-3 h-3 text-danger-text" />
            <span>İptal Edildi</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl shadow-xl border flex items-center space-x-3 text-xs font-bold animate-in slide-in-from-bottom-5 ${
          notification.type === 'success'
            ? 'bg-bg-success text-success-text border-success-border'
            : notification.type === 'error'
            ? 'bg-danger-fill/15 text-danger-text border-danger-border'
            : 'bg-info-fill/15 text-info-text border-info-border'
        }`}>
          {notification.type === 'success' && <CheckCircle2 className="w-5 h-5 shrink-0" />}
          {notification.type === 'error' && <Ban className="w-5 h-5 shrink-0" />}
          {notification.type === 'info' && <Clock className="w-5 h-5 shrink-0" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* 1. TOP HEADER & STRUCTURED ACTION MANAGEMENT */}
      <div className="bg-base-surface p-4 sm:p-5 rounded-2xl border border-border shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Left: Title, Icon & Description */}
          <div className="flex items-start sm:items-center space-x-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-danger-fill/15 border border-danger-border flex items-center justify-center text-danger-text font-black text-lg shrink-0 shadow-2xs">
              <Receipt className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">
                  E-Fatura & E-Arşiv Yönetimi
                </h1>
                <span className="px-2 py-0.5 rounded-md bg-base-surface-2 border border-border text-[11px] font-mono font-bold text-text-secondary">
                  UBL-TR 2.1
                </span>
              </div>
              <p className="text-xs text-text-muted mt-0.5 truncate">
                Gelir İdaresi Başkanlığı (GİB) e-Fatura, e-Arşiv ve Tevkifatlı fatura düzenleme merkezi
              </p>
            </div>
          </div>

          {/* Right: Mode Switcher & Operational Actions Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            
            {/* View Mode Switcher Pill */}
            <div className="inline-flex items-center p-1 bg-base-surface-2 rounded-2xl border border-border">
              <button
                type="button"
                onClick={() => setActiveViewMode('live')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  activeViewMode === 'live'
                    ? 'bg-base-surface text-text-primary shadow-xs border border-border/60'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Canlı Fatura Masası</span>
                <span className="px-1.5 py-0.5 rounded-full bg-base-surface-2 text-[10px] font-mono border border-border">
                  {invoices.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveViewMode('archive')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  activeViewMode === 'archive'
                    ? 'bg-blue-600 text-white shadow-xs font-extrabold'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <FolderArchive className="w-3.5 h-3.5" />
                <span>Tarih Bazlı Arşiv</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  activeViewMode === 'archive' ? 'bg-blue-700 text-blue-100' : 'bg-base-surface text-text-secondary border border-border'
                }`}>
                  Yerel DB
                </span>
              </button>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={fetchInvoices}
              className="p-2 rounded-xl bg-base-surface-2 hover:bg-base-surface text-text-primary border border-border hover:border-border-strong transition-all cursor-pointer shadow-2xs"
              title="Faturaları Yenile"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-500' : 'text-text-muted'}`} />
            </button>

            <button
              type="button"
              onClick={handleExportOfficialArchive}
              className="px-3 py-2 rounded-xl bg-base-surface-2 hover:bg-base-surface text-text-primary border border-border hover:border-border-strong text-xs font-bold transition-all shadow-2xs flex items-center space-x-1.5 cursor-pointer"
              title="GİB cevabıyla kabul edilmiş belgeleri resmi arşiv paketi olarak indir"
            >
              <FolderArchive className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden sm:inline">Resmi Arşiv</span>
            </button>

            {/* Batch Send GİB Button */}
            {draftCount > 0 && (
              <button
                type="button"
                onClick={handleBatchSendGib}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md flex items-center space-x-1.5 cursor-pointer animate-pulse"
                title="Bekleyen tüm taslak faturaları GİB sistemine ilet"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Toplu GİB'e Gönder ({draftCount})</span>
              </button>
            )}

            {/* Primary Action: Create Invoice */}
            <button
              type="button"
              onClick={() => {
                setInitialOrderForCreate(null);
                setInitialQuoteForCreate(null);
                setIsCreateModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-success-fill hover:opacity-90 text-white text-xs font-extrabold transition-all shadow-md flex items-center space-x-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Fatura Düzenle</span>
            </button>

          </div>

        </div>
      </div>

      {/* CONDITIONAL RENDER: ARCHIVE VS LIVE */}
      {activeViewMode === 'archive' ? (
        <EInvoiceArchiveExplorer
          serverInvoices={invoices}
          onSyncServerInvoices={fetchInvoices}
          onSelectInvoice={(inv) => setSelectedInvoice(inv)}
        />
      ) : (
        <>
          {/* 2. KPI METRIC CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            
            {/* Total Invoiced */}
            <div 
              role="button"
              tabIndex={0}
              onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
              className="p-4 sm:p-5 rounded-2xl bg-base-surface border border-border hover:border-border-strong transition-all shadow-xs space-y-2 cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
                  Toplam Faturalandırılan
                </span>
                <div className="w-8 h-8 rounded-xl bg-success-fill/15 text-success-text flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-text-primary tracking-tight font-mono">
                {formatTRY(totalInvoiced)}
              </div>
              <div className="text-xs text-text-muted flex items-center space-x-1.5">
                <span className="font-semibold text-text-primary">{invoices.length} Adet</span>
                <span>Toplam Düzenlenen Belge</span>
              </div>
            </div>

            {/* GİB Onaylı / Gönderilen */}
            <div 
              role="button"
              tabIndex={0}
              onClick={() => { setStatusFilter('sent'); setCurrentPage(1); }}
              className={`p-4 sm:p-5 rounded-2xl bg-base-surface border transition-all shadow-xs space-y-2 cursor-pointer ${
                statusFilter === 'sent' ? 'border-success-border ring-1 ring-success-border' : 'border-border hover:border-border-strong'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
                  GİB'e İletilen / Onaylı
                </span>
                <div className="w-8 h-8 rounded-xl bg-info-fill/15 text-info-text flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-text-primary tracking-tight font-mono">
                {sentCount} <span className="text-sm font-normal text-text-muted font-sans">Fatura</span>
              </div>
              <div className="text-xs text-success-text flex items-center space-x-1 font-semibold">
                <span>✓ 1300 Başarıyla İşlendi</span>
              </div>
            </div>

            {/* KDV & Matrah */}
            <div className="p-4 sm:p-5 rounded-2xl bg-base-surface border border-border shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
                  KDV Matrahı & KDV
                </span>
                <div className="w-8 h-8 rounded-xl bg-warning-fill/15 text-warning-text flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-text-primary tracking-tight font-mono">
                {formatTRY(totalVatCalculated)}
              </div>
              <div className="text-xs text-text-muted truncate">
                Matrah: <strong className="text-text-primary font-mono">{formatTRY(totalMatrah)}</strong>
              </div>
            </div>

            {/* Taslak Bekleyen */}
            <div 
              role="button"
              tabIndex={0}
              onClick={() => { setStatusFilter('draft'); setCurrentPage(1); }}
              className={`p-4 sm:p-5 rounded-2xl bg-base-surface border transition-all shadow-xs space-y-2 cursor-pointer ${
                statusFilter === 'draft' ? 'border-warning-border ring-1 ring-warning-border' : 'border-border hover:border-border-strong'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
                  Bekleyen Taslaklar
                </span>
                <div className="w-8 h-8 rounded-xl bg-warning-fill/15 text-warning-text flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-text-primary tracking-tight font-mono">
                {draftCount} <span className="text-sm font-normal text-text-muted font-sans">Taslak</span>
              </div>
              <div className="text-xs text-warning-text font-semibold">
                GİB onayı bekleyen belgeler
              </div>
            </div>

          </div>

          {/* 3. FILTERS & SEARCH TOOLBAR (Siparişler Mimarisi) */}
          <div className="space-y-3 bg-base-surface p-3.5 sm:p-4 rounded-2xl border border-border shadow-xs">
            
            {/* Search Input, Customer Selector & Scenario Filter */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              
              {/* Search */}
              <div className="sm:col-span-6 relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Fatura No, Müşteri Ünvanı, VKN/TCKN, ETTN UUID, Sipariş No ara..."
                  className="w-full pl-10 pr-8 py-2 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary placeholder:text-text-muted focus:outline-hidden focus:ring-1 focus:ring-success-border transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setCurrentPage(1);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Customer Filter */}
              <div className="sm:col-span-3">
                <select
                  value={selectedCustomerFilter}
                  onChange={(e) => {
                    setSelectedCustomerFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-base-surface-2 border border-border rounded-xl px-3 py-2 text-xs text-text-primary font-medium focus:outline-hidden focus:ring-1 focus:ring-success-border transition-all cursor-pointer"
                >
                  <option value="all">Tüm Müşteriler ({customerOptions.length})</option>
                  {customerOptions.map((cust) => (
                    <option key={cust} value={cust}>
                      {cust}
                    </option>
                  ))}
                </select>
              </div>

              {/* Scenario / Profile Filter */}
              <div className="sm:col-span-3">
                <select
                  value={profileFilter}
                  onChange={(e) => {
                    setProfileFilter(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-base-surface-2 border border-border rounded-xl px-3 py-2 text-xs text-text-primary font-medium focus:outline-hidden focus:ring-1 focus:ring-success-border transition-all cursor-pointer"
                >
                  <option value="all">Tüm Senaryolar</option>
                  <option value="TICARIFATURA">Ticari E-Fatura</option>
                  <option value="TEMELFATURA">Temel E-Fatura</option>
                  <option value="EARSIVFATURA">E-Arşiv Fatura</option>
                </select>
              </div>

            </div>

            {/* High Contrast Status Filter KPI Chips Bar */}
            {(() => {
              const statusChips = [
                { 
                  key: 'all', 
                  label: 'Tüm Faturalar', 
                  count: counts.all, 
                  icon: Receipt, 
                  activeClass: 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 border-slate-900 dark:border-slate-100 shadow-sm font-extrabold',
                  inactiveClass: 'bg-base-surface-2 hover:bg-base-surface-3 text-text-secondary hover:text-text-primary border-border'
                },
                { 
                  key: 'sent', 
                  label: 'GİB Onaylı', 
                  count: counts.sent, 
                  icon: CheckCircle2, 
                  activeClass: 'bg-emerald-600 text-white border-emerald-700 shadow-sm font-extrabold',
                  inactiveClass: 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/30'
                },
                { 
                  key: 'draft', 
                  label: 'Taslak (Bekleyen)', 
                  count: counts.draft, 
                  icon: Clock, 
                  activeClass: 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm font-extrabold ring-1 ring-amber-500/50',
                  inactiveClass: 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/30'
                },
                {
                  key: 'queued',
                  label: 'GİB Kuyruğu',
                  count: counts.queued,
                  icon: RefreshCw,
                  activeClass: 'bg-amber-600 text-white border-amber-700 shadow-sm font-extrabold',
                  inactiveClass: 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/30'
                },
                {
                  key: 'rejected',
                  label: 'GİB Hata',
                  count: counts.rejected,
                  icon: Ban,
                  activeClass: 'bg-rose-600 text-white border-rose-700 shadow-sm font-extrabold',
                  inactiveClass: 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-500/30'
                },
                { 
                  key: 'cancelled', 
                  label: 'İptal Edilen', 
                  count: counts.cancelled, 
                  icon: Ban, 
                  activeClass: 'bg-rose-600 text-white border-rose-700 shadow-sm font-extrabold',
                  inactiveClass: 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-500/30'
                },
              ];

              return (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar pt-1">
                  {statusChips.map((chip) => {
                    const isSelected = statusFilter === chip.key;
                    const Icon = chip.icon;
                    return (
                      <button
                        key={chip.key}
                        type="button"
                        onClick={() => {
                          setStatusFilter(chip.key as any);
                          setCurrentPage(1);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all flex items-center space-x-1.5 cursor-pointer shrink-0 border ${
                          isSelected ? chip.activeClass : chip.inactiveClass
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{chip.label}</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                          isSelected 
                            ? chip.key === 'draft'
                              ? 'bg-slate-950/20 text-slate-950 font-bold'
                              : chip.key === 'all'
                              ? 'bg-white/20 dark:bg-slate-950/20 text-white dark:text-slate-950 font-bold'
                              : 'bg-white/20 text-white font-bold'
                            : 'bg-base-surface text-text-muted border border-border/50'
                        }`}>
                          {chip.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })()}

            {/* Active Filters Tag Summary */}
            {(statusFilter !== 'all' || selectedCustomerFilter !== 'all' || profileFilter !== 'all' || searchQuery.trim()) && (
              <div className="flex flex-wrap items-center gap-2 p-2.5 bg-base-surface-2 rounded-xl border border-border text-xs">
                <span className="text-text-muted font-medium flex items-center gap-1 text-[11px]">
                  <Filter className="w-3 h-3" />
                  <span>Aktif Filtreler:</span>
                </span>

                {statusFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-warning-fill/15 text-warning-text border border-warning-border font-medium text-[11px]">
                    <span>Durum: {statusFilter === 'sent' ? 'GİB Onaylı' : statusFilter === 'draft' ? 'Taslak' : 'İptal'}</span>
                    <button type="button" onClick={() => setStatusFilter('all')} className="hover:opacity-75 cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {selectedCustomerFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-info-fill/15 text-info-text border border-info-border font-medium text-[11px]">
                    <span>Müşteri: {selectedCustomerFilter}</span>
                    <button type="button" onClick={() => setSelectedCustomerFilter('all')} className="hover:opacity-75 cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {profileFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 font-medium text-[11px]">
                    <span>Senaryo: {profileFilter}</span>
                    <button type="button" onClick={() => setProfileFilter('all')} className="hover:opacity-75 cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {searchQuery.trim() && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-brand-500/15 text-brand-600 dark:text-brand-400 border border-brand-500/30 font-medium text-[11px]">
                    <span>Arama: "{searchQuery}"</span>
                    <button type="button" onClick={() => setSearchQuery('')} className="hover:opacity-75 cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('all');
                    setSelectedCustomerFilter('all');
                    setProfileFilter('all');
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                  className="ml-auto text-brand-600 dark:text-brand-400 hover:underline font-bold text-[11px] cursor-pointer"
                >
                  Tüm Filtreleri Temizle
                </button>
              </div>
            )}

          </div>

          {/* 4. MASTER-DETAIL INVOICES LIST & PAGINATION (Siparişler Mimarisi) */}
          {loading ? (
            <div className="p-12 text-center bg-base-surface rounded-2xl border border-border text-text-muted text-xs shadow-xs space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-success-text opacity-75" />
              <p className="font-bold text-sm text-text-primary">E-Faturalar yükleniyor...</p>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="p-12 text-center bg-base-surface rounded-2xl border border-border text-text-muted text-xs shadow-xs space-y-3">
              <Receipt className="w-12 h-12 mx-auto opacity-30 text-text-muted" />
              <p className="font-bold text-sm text-text-primary">
                {searchQuery || selectedCustomerFilter !== 'all' || statusFilter !== 'all' || profileFilter !== 'all'
                  ? 'E-Fatura Kaydı Bulunamadı'
                  : 'Henüz kayıtlı e-fatura bulunmuyor.'}
              </p>
              <p className="text-xs text-text-secondary max-w-sm mx-auto">
                Arama terimini veya durum/müşteri filtrelerini sıfırlayın veya yeni fatura düzenleyin.
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                {(searchQuery || selectedCustomerFilter !== 'all' || statusFilter !== 'all' || profileFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter('all');
                      setSelectedCustomerFilter('all');
                      setProfileFilter('all');
                      setSearchQuery('');
                      setCurrentPage(1);
                    }}
                    className="px-4 py-2 bg-base-surface-2 hover:bg-base-surface-3 text-text-primary border border-border rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                  >
                    Filtreleri Temizle
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setInitialOrderForCreate(null);
                    setInitialQuoteForCreate(null);
                    setIsCreateModalOpen(true);
                  }}
                  className="px-4 py-2 bg-success-fill hover:opacity-90 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  Yeni E-Fatura Düzenle
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              
              {/* Master-Detail Invoice Cards */}
              {paginatedInvoices.map((inv, idx) => {
                const isExpanded = expandedInvoiceIds.has(inv.id);
                const isCopiedNum = copiedInvoiceFeedback === inv.invoiceNumber;
                const isCopiedUuid = copiedInvoiceFeedback === inv.uuid;
                const isEArsiv = inv.profile === 'EARSIVFATURA';
                const itemsCount = (inv.items || []).length;

                return (
                  <div
                    key={inv.id}
                    id={`admin-invoice-${inv.id}`}
                    style={{ zIndex: isExpanded ? 40 : 35 - Math.min(idx, 30) }}
                    className={`relative rounded-2xl border transition-all shadow-xs ${
                      inv.status === 'draft'
                        ? 'bg-base-surface border-warning-border ring-1 ring-warning-border/70'
                        : inv.status === 'queued'
                        ? 'bg-base-surface border-amber-500/40 ring-1 ring-amber-500/30'
                        : inv.status === 'rejected'
                        ? 'bg-base-surface border-danger-border/70 ring-1 ring-danger-border/50'
                        : inv.status === 'cancelled'
                        ? 'bg-base-surface border-danger-border/60 opacity-80'
                        : 'bg-base-surface border-border hover:border-border-strong'
                    }`}
                  >
                    {/* Master Header Row */}
                    <div className={`p-3.5 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-base-surface ${isExpanded ? 'rounded-t-2xl' : 'rounded-2xl'}`}>
                      
                      {/* Left: Expand toggle, Invoice No, Customer, Date, Status */}
                      <div className="flex items-start sm:items-center space-x-3 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleToggleExpand(inv.id)}
                          className="p-1.5 rounded-lg border border-border bg-base-surface-2 hover:bg-base-surface-3 text-text-secondary hover:text-text-primary transition-colors cursor-pointer shrink-0 mt-0.5 sm:mt-0"
                          title={isExpanded ? 'Detayları Gizle' : 'Detayları Göster'}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>

                        {/* Document Type Badge */}
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-[11px] shrink-0 border ${
                          isEArsiv 
                            ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30' 
                            : 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30'
                        }`}>
                          {isEArsiv ? 'E-ARŞ' : 'E-FAT'}
                        </div>

                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-sm text-text-primary">
                              {inv.invoiceNumber}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyText(inv.invoiceNumber, inv.invoiceNumber)}
                              className="text-text-muted hover:text-text-primary cursor-pointer"
                              title="Fatura No Kopyala"
                            >
                              {isCopiedNum ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {getGibStatusBadge(inv.status)}

                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                              inv.profile === 'TICARIFATURA'
                                ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30'
                                : inv.profile === 'TEMELFATURA'
                                ? 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30'
                                : 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30'
                            }`}>
                              {inv.profile}
                            </span>

                            {inv.type === 'TEVKIFAT' && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 font-bold">
                                Tevkifatlı Satış
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-xs text-text-secondary flex-wrap">
                            <span className="font-semibold text-text-primary flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 text-text-muted" />
                              <span className="truncate max-w-[260px] sm:max-w-md">{inv.customerTitle}</span>
                            </span>
                            <span className="text-text-muted">•</span>
                            <span className="text-[11px] text-text-muted font-mono">
                              {inv.customerVknTckn.length === 10 ? 'VKN:' : 'TCKN:'} {inv.customerVknTckn}
                            </span>
                            {inv.customerCity && (
                              <>
                                <span className="text-text-muted">•</span>
                                <span className="text-[11px] text-text-muted">{inv.customerCity}</span>
                              </>
                            )}
                            <span className="text-text-muted">•</span>
                            <span className="text-[11px] text-text-muted font-mono flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{new Date(inv.invoiceDate).toLocaleDateString('tr-TR')} {inv.invoiceTime || ''}</span>
                            </span>
                            {inv.orderNumber && (
                              <>
                                <span className="text-text-muted">•</span>
                                <span className="text-[11px] text-success-text font-bold">
                                  Sipariş: #{inv.orderNumber}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Amount & Quick Operational Action Buttons */}
                      <div className="flex items-center justify-between lg:justify-end gap-2 sm:gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-border/50">
                        
                        {/* Price Breakdown */}
                        <div className="text-left lg:text-right px-2.5 py-1 rounded-xl bg-base-surface-2/80 border border-border/60 shadow-2xs">
                          <div className="text-[10px] text-text-secondary flex items-center lg:justify-end gap-1 font-mono font-medium">
                            <span>Matrah: {formatTRY(inv.taxExclusiveAmount || inv.subtotal)}</span>
                            <span>•</span>
                            <span>KDV: {formatTRY(inv.totalVat)}</span>
                          </div>
                          <span className="text-sm sm:text-base font-black text-emerald-500 dark:text-emerald-400 font-mono tracking-tight">
                            {formatTRY(inv.payableAmount)}
                          </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          
                          {/* Send GİB */}
                          {inv.status === 'draft' && (
                            <button
                              type="button"
                              onClick={() => handleSendGib(inv.id)}
                              className="px-3 py-1.5 bg-success-fill hover:opacity-90 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                              title="GİB'e gönder; başarı sadece dış sistem cevabıyla kesinleşir"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">GİB'e Gönder</span>
                            </button>
                          )}

                          {(inv.status === 'queued' || inv.status === 'sent' || inv.status === 'approved' || inv.status === 'rejected') && (
                            <button
                              type="button"
                              onClick={() => handleCheckGibStatus(inv.id)}
                              className="px-2.5 py-1.5 bg-base-surface-2 hover:bg-base-surface-3 text-text-primary border border-border rounded-xl text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                              title="GİB belge durumunu sorgula"
                            >
                              <RefreshCw className="w-3.5 h-3.5 text-amber-500" />
                              <span className="hidden md:inline">Durum</span>
                            </button>
                          )}

                          {(inv.status === 'queued' || inv.status === 'rejected') && (
                            <button
                              type="button"
                              onClick={() => handleRetryGib(inv.id)}
                              className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                              title="GİB gönderimini tekrar dene"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span className="hidden md:inline">Tekrar</span>
                            </button>
                          )}

                          {/* A4 PDF */}
                          <button
                            type="button"
                            onClick={() => exportEInvoiceToPdf(inv)}
                            className="px-2.5 py-1.5 bg-base-surface-2 hover:bg-base-surface-3 text-text-primary border border-border rounded-xl text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                            title="A4 Resmi E-Fatura PDF İndir"
                          >
                            <Download className="w-3.5 h-3.5 text-brand-500" />
                            <span className="hidden md:inline">PDF</span>
                          </button>

                          {/* WhatsApp */}
                          <button
                            type="button"
                            onClick={() => {
                              setWhatsAppShareState({
                                isOpen: true,
                                title: `E-Fatura #${inv.invoiceNumber} - ${inv.customerTitle}`,
                                defaultPhone: '',
                                defaultMessage: generateEInvoiceWhatsAppMessage(inv),
                                recipientName: inv.customerTitle,
                              });
                            }}
                            className="p-1.5 sm:px-2.5 sm:py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer shadow-2xs"
                            title="Müşteriye WhatsApp Fatura Bildirimi Gönder"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span className="hidden md:inline">WhatsApp</span>
                          </button>

                          {/* Action Dropdown Menu */}
                          <EInvoiceActionDropdown
                            invoice={inv}
                            onView={() => setSelectedInvoice(inv)}
                            onSendGib={inv.status === 'draft' ? () => handleSendGib(inv.id) : undefined}
                            onExportPdf={() => exportEInvoiceToPdf(inv)}
                            onPrintDirect={() => printInvoiceDirectly(inv)}
                            onDownloadXml={() => downloadEInvoiceXML(inv)}
                            onCancelInvoice={inv.status !== 'cancelled' ? () => handleCancelInvoice(inv.id) : undefined}
                            onDeleteInvoice={() => handleDeleteInvoice(inv.id)}
                          />
                        </div>

                      </div>

                    </div>

                    {/* Expanded Detail Panel (Master-Detail Accordion) */}
                    {isExpanded && (
                      <div className="p-4 sm:p-5 border-t border-border bg-base-surface-2/40 space-y-4 animate-in fade-in duration-150 rounded-b-2xl">
                        
                        {/* Customer & Tax Details Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                          
                          <div className="p-3 bg-base-surface rounded-xl border border-border flex items-start space-x-2.5">
                            <Building2 className="w-4 h-4 text-warning-text shrink-0 mt-0.5" />
                            <div className="space-y-0.5 min-w-0">
                              <span className="text-text-muted text-[10px] uppercase font-bold block">Müşteri & Vergi Bilgileri</span>
                              <strong className="text-text-primary block truncate">{inv.customerTitle}</strong>
                              <div className="text-text-muted text-[11px] font-mono">
                                {inv.customerVknTckn.length === 10 ? 'VKN:' : 'TCKN:'} {inv.customerVknTckn} {inv.customerTaxOffice ? `(${inv.customerTaxOffice} V.D.)` : ''}
                              </div>
                            </div>
                          </div>

                          <div className="p-3 bg-base-surface rounded-xl border border-border flex items-start space-x-2.5">
                            <FileCode className="w-4 h-4 text-info-text shrink-0 mt-0.5" />
                            <div className="space-y-0.5 min-w-0 flex-1">
                              <span className="text-text-muted text-[10px] uppercase font-bold block">GİB ETTN (UUID) & Belge</span>
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-text-primary text-[11px] font-mono truncate">{inv.uuid}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyText(inv.uuid, inv.uuid)}
                                  className="text-text-muted hover:text-text-primary cursor-pointer shrink-0"
                                  title="ETTN Kopyala"
                                >
                                  {isCopiedUuid ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                              <div className="text-[11px] text-success-text font-medium">
                                {inv.gibStatusDescription || (inv.status === 'sent' ? '1300 - Başarıyla İşlendi (GİB)' : 'Taslak Düzenleme')}
                              </div>
                            </div>
                          </div>

                          <div className="p-3 bg-base-surface rounded-xl border border-border flex items-start space-x-2.5">
                            <MapPin className="w-4 h-4 text-success-text shrink-0 mt-0.5" />
                            <div className="space-y-0.5 min-w-0">
                              <span className="text-text-muted text-[10px] uppercase font-bold block">Fatura Adresi & Notlar</span>
                              <span className="text-text-secondary leading-snug block line-clamp-2">{inv.customerAddress || 'Adres belirtilmemiş'}</span>
                              {inv.notes && (
                                <span className="text-text-muted text-[10px] block truncate">
                                  Not: {inv.notes}
                                </span>
                              )}
                            </div>
                          </div>

                        </div>

                        {/* Invoice Items Table */}
                        <div className="divide-y divide-border bg-base-surface rounded-xl border border-border overflow-hidden text-xs">
                          <div className="p-2.5 bg-base-surface-2 font-bold text-text-secondary flex justify-between text-[11px]">
                            <span>Fatura Kalemleri ({itemsCount} Kalem)</span>
                            <span>Tutar & KDV</span>
                          </div>
                          {(inv.items || []).map((item, iIdx) => (
                            <div key={iIdx} className="p-2.5 flex items-center justify-between hover:bg-base-surface-2/40 transition-colors">
                              <div className="space-y-0.5">
                                <span className="font-semibold text-text-primary">{item.name}</span>
                                <div className="text-text-muted text-[11px] font-mono">
                                  {item.quantity} {item.unit || 'Adet'} × {formatTRY(item.unitPrice)}
                                  {item.discountAmount ? ` (İskonto: -${formatTRY(item.discountAmount)})` : ''}
                                  <span className="ml-2 text-info-text font-semibold">KDV: %{item.vatRate}</span>
                                </div>
                              </div>
                              <div className="text-right font-mono">
                                <span className="font-bold text-text-primary block">{formatTRY(item.totalPrice)}</span>
                                <span className="text-[10px] text-text-muted block">+{formatTRY(item.vatAmount)} KDV</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Financial Breakdown Summary Table */}
                        <div className="p-3.5 bg-base-surface rounded-xl border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div className="flex flex-wrap items-center gap-4 text-text-secondary font-mono">
                            <div>
                              <span className="text-[10px] text-text-muted block">Mal/Hizmet Matrahı</span>
                              <strong className="text-text-primary">{formatTRY(inv.taxExclusiveAmount || inv.subtotal)}</strong>
                            </div>
                            <div>
                              <span className="text-[10px] text-text-muted block">Hesaplanan KDV</span>
                              <strong className="text-text-primary">{formatTRY(inv.totalVat)}</strong>
                            </div>
                            {inv.totalTevkifat ? (
                              <div>
                                <span className="text-[10px] text-amber-600 block">Tevkifat Tutarı</span>
                                <strong className="text-amber-600">-{formatTRY(inv.totalTevkifat)}</strong>
                              </div>
                            ) : null}
                          </div>

                          <div className="text-left sm:text-right pt-2 sm:pt-0 border-t sm:border-t-0 border-border">
                            <span className="text-[10px] text-text-muted block uppercase font-bold">Ödenecek Net Tutar</span>
                            <span className="text-base sm:text-lg font-black text-success-text font-mono">
                              {formatTRY(inv.payableAmount)}
                            </span>
                          </div>
                        </div>

                      </div>
                    )}

                  </div>
                );
              })}

              {/* Pagination Controls */}
              <OrderPagination
                currentPage={safeCurrentPage}
                totalItems={filteredInvoices.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(sz) => {
                  setPageSize(sz);
                  setCurrentPage(1);
                }}
                pageSizeOptions={[10, 25, 50]}
                itemLabel="fatura"
              />

            </div>
          )}

        </>
      )}

      {/* WhatsApp Share Modal */}
      <WhatsAppShareModal
        isOpen={whatsAppShareState.isOpen}
        onClose={() => setWhatsAppShareState(prev => ({ ...prev, isOpen: false }))}
        title={whatsAppShareState.title}
        defaultPhone={whatsAppShareState.defaultPhone}
        defaultMessage={whatsAppShareState.defaultMessage}
        recipientName={whatsAppShareState.recipientName}
      />

      {/* View Modal */}
      {selectedInvoice && (
        <EInvoiceViewModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onSendGib={handleSendGib}
          onCancelInvoice={handleCancelInvoice}
        />
      )}

      {/* Create Modal */}
      {isCreateModalOpen && (
        <EInvoiceCreateModal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            setInitialOrderForCreate(null);
            setInitialQuoteForCreate(null);
          }}
          orders={orders}
          quotes={quotes}
          products={products}
          initialOrder={initialOrderForCreate}
          initialQuote={initialQuoteForCreate}
          onSuccess={(newInv) => {
            setInvoices(prev => [newInv, ...prev]);
            setSelectedInvoice(newInv);
            saveInvoiceToIndexedDB(newInv).catch(console.error);
            showNotification(`${newInv.invoiceNumber} faturası başarıyla oluşturuldu ve arşive kaydedildi.`, 'success');
          }}
        />
      )}

    </div>
  );
}
