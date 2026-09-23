import React, { useState, useEffect, useMemo } from 'react';
import { 
  EInvoice, 
  Order, 
  Quote 
} from '../../types';
import {
  ArchivedEInvoiceRecord,
  ArchiveFolderHierarchy,
  getArchivedFolderHierarchy,
  getAllArchivedInvoicesFromIndexedDB,
  saveBatchInvoicesToIndexedDB,
  deleteArchivedInvoiceFromIndexedDB,
  clearAllIndexedDBInvoices,
  exportIndexedDBArchiveAsJson,
  importJsonToIndexedDB,
  getMonthNameTr
} from '../../utils/eInvoiceIndexedDB';
import { formatTRY } from '../../utils/exportUtils';
import { exportEInvoiceToPdf, downloadEInvoiceXML, printInvoiceDirectly } from '../../utils/eInvoiceUtils';
import {
  Folder,
  FolderOpen,
  FileText,
  Search,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  Eye,
  Printer,
  FileCode,
  Calendar,
  Layers,
  Database,
  CheckCircle2,
  Clock,
  Ban,
  ChevronRight,
  ChevronDown,
  Sparkles,
  ArrowUpRight,
  HardDrive,
  Filter,
  Check,
  Building2,
  Hash,
  Copy,
  Receipt
} from 'lucide-react';
import EInvoiceViewModal from './EInvoiceViewModal';

interface EInvoiceArchiveExplorerProps {
  serverInvoices: EInvoice[];
  onSyncServerInvoices?: () => void;
  onSelectInvoice?: (inv: EInvoice) => void;
}

export default function EInvoiceArchiveExplorer({
  serverInvoices,
  onSyncServerInvoices,
  onSelectInvoice,
}: EInvoiceArchiveExplorerProps) {
  const [hierarchy, setHierarchy] = useState<ArchiveFolderHierarchy | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<string | 'all'>('all');
  const [selectedMonth, setSelectedMonth] = useState<string | 'all'>('all'); // 'YYYY-MM' or 'all'
  const [selectedProfileFilter, setSelectedProfileFilter] = useState<'all' | 'TICARIFATURA' | 'TEMELFATURA' | 'EARSIVFATURA' | 'TEVKIFAT'>('all');
  const [expandedYears, setExpandedYears] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [previewInvoice, setPreviewInvoice] = useState<EInvoice | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Load IndexedDB hierarchy
  const loadArchive = async (showSuccessToast = false) => {
    setLoading(true);
    try {
      const data = await getArchivedFolderHierarchy();
      setHierarchy(data);

      // Expand all years by default
      const defaultExpanded: Record<string, boolean> = {};
      data.years.forEach(y => {
        defaultExpanded[y.year] = true;
      });
      setExpandedYears(prev => ({ ...defaultExpanded, ...prev }));

      if (showSuccessToast) {
        showToast(`IndexedDB Arşivi başarıyla listelendi (${data.stats.totalInvoices} Fatura).`, 'success');
      }
    } catch (err) {
      console.error('Failed to load archive from IndexedDB:', err);
      showToast('IndexedDB arşivi okunurken hata oluştu.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Initial load & automatic sync with server invoices if archive is empty or new server invoices exist
  useEffect(() => {
    const init = async () => {
      try {
        const existing = await getAllArchivedInvoicesFromIndexedDB();
        if (existing.length === 0 && serverInvoices.length > 0) {
          // Auto-seed IndexedDB from initial server invoices
          await saveBatchInvoicesToIndexedDB(serverInvoices);
        }
      } catch (e) {
        console.warn('Auto-seed check error:', e);
      }
      loadArchive(false);
    };
    init();
  }, [serverInvoices]);

  // Toggle year expansion
  const toggleYearExpand = (year: string) => {
    setExpandedYears(prev => ({
      ...prev,
      [year]: !prev[year]
    }));
  };

  // 1-Click Sync all server invoices to IndexedDB
  const handleSyncAllFromServer = async () => {
    if (!serverInvoices || serverInvoices.length === 0) {
      showToast('Sunucuda eşitlenecek fatura kaydı bulunamadı.', 'info');
      return;
    }

    setLoading(true);
    try {
      const result = await saveBatchInvoicesToIndexedDB(serverInvoices);
      await loadArchive(false);
      showToast(`${result.savedCount} adet sunucu faturası yerel IndexedDB arşivine başarıyla kaydedildi.`, 'success');
      if (onSyncServerInvoices) onSyncServerInvoices();
    } catch (err) {
      showToast('Eşitleme sırasında hata oluştu.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 1-Click List / Refresh
  const handleOneClickList = () => {
    loadArchive(true);
  };

  // Delete invoice from archive
  const handleDeleteArchivedInvoice = async (id: string, invoiceNumber: string) => {
    if (!confirm(`${invoiceNumber} numaralı faturayı yerel IndexedDB arşivinden silmek istediğinize emin misiniz?`)) return;

    try {
      await deleteArchivedInvoiceFromIndexedDB(id);
      await loadArchive(false);
      showToast(`${invoiceNumber} arşivden silindi.`, 'info');
    } catch (err) {
      showToast('Fatura arşivden silinemedi.', 'error');
    }
  };

  // Clear entire archive
  const handleClearArchive = async () => {
    if (!confirm('DİKKAT: Tarayıcıdaki tüm yerel fatura arşivi (IndexedDB) silinecektir. Emin misiniz?')) return;

    try {
      await clearAllIndexedDBInvoices();
      await loadArchive(false);
      setSelectedYear('all');
      setSelectedMonth('all');
      showToast('Yerel fatura arşivi tamamen sıfırlandı.', 'info');
    } catch (err) {
      showToast('Arşiv temizlenirken hata oluştu.', 'error');
    }
  };

  // Export JSON Backup
  const handleExportJson = async () => {
    try {
      const jsonStr = await exportIndexedDBArchiveAsJson();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `alpha-efatura-arsiv-yedek-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('E-Fatura arşivi JSON yedeği başarıyla indirildi.', 'success');
    } catch (err) {
      showToast('Yedek dışa aktarılamadı.', 'error');
    }
  };

  // Import JSON Backup
  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const result = await importJsonToIndexedDB(text);
        await loadArchive(false);
        showToast(`${result.importedCount} adet fatura IndexedDB arşivine aktarıldı (Toplam: ${result.totalInDB}).`, 'success');
      } catch (err: any) {
        showToast(err.message || 'Yedek dosyası içe aktarılamadı.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Copy invoice number or UUID
  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered invoices based on folder selection, profile, search
  const filteredInvoices = useMemo(() => {
    if (!hierarchy) return [];

    return hierarchy.allInvoices.filter(inv => {
      // Year filter
      if (selectedYear !== 'all' && inv.year !== selectedYear) return false;

      // Month filter
      if (selectedMonth !== 'all' && inv.yearMonth !== selectedMonth) return false;

      // Profile / Type filter
      if (selectedProfileFilter !== 'all') {
        if (selectedProfileFilter === 'TEVKIFAT') {
          if (inv.type !== 'TEVKIFAT') return false;
        } else {
          if (inv.profile !== selectedProfileFilter) return false;
        }
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches = 
          inv.invoiceNumber.toLowerCase().includes(q) ||
          inv.customerTitle.toLowerCase().includes(q) ||
          inv.customerVknTckn.includes(q) ||
          inv.uuid.toLowerCase().includes(q) ||
          (inv.orderNumber && inv.orderNumber.toLowerCase().includes(q)) ||
          inv.folderDisplay.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [hierarchy, selectedYear, selectedMonth, selectedProfileFilter, searchQuery]);

  // Selected folder summary metrics
  const folderSummary = useMemo(() => {
    const totalAmount = filteredInvoices.reduce((s, i) => s + i.payableAmount, 0);
    const totalVat = filteredInvoices.reduce((s, i) => s + i.totalVat, 0);
    const totalMatrah = filteredInvoices.reduce((s, i) => s + i.taxExclusiveAmount, 0);
    const eFaturaCount = filteredInvoices.filter(i => i.profile !== 'EARSIVFATURA').length;
    const eArsivCount = filteredInvoices.filter(i => i.profile === 'EARSIVFATURA').length;
    return {
      count: filteredInvoices.length,
      totalAmount,
      totalVat,
      totalMatrah,
      eFaturaCount,
      eArsivCount,
    };
  }, [filteredInvoices]);

  const diskUsageKb = hierarchy ? Math.round(hierarchy.stats.storageUsageBytes / 1024) : 0;

  return (
    <div className="space-y-4">

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

      {/* 1. TOP TOOLBAR & QUICK ACTIONS */}
      <div className="p-4 rounded-2xl bg-base-surface border border-border flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center justify-center font-bold">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-black text-text-primary">
                  Tarih Bazlı E-Fatura Arşivi (IndexedDB)
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-success-fill/15 text-success-text border border-success-border font-bold text-[10px] flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-success-fill animate-pulse" />
                  <span>Çevrimdışı / Yerel DB</span>
                </span>
              </div>
              <p className="text-xs text-text-muted">
                Tarayıcı veritabanında yıl ve ay hiyerarşisinde güvenle saklanan resmi fatura arşivi
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tek Tuşla Listele / Yenile */}
          <button
            onClick={handleOneClickList}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-base-surface-2 hover:bg-border text-text-primary border border-border text-xs font-bold transition-all shadow-2xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            title="IndexedDB Arşivini Tek Tuşla Listele"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-600 dark:text-blue-400 ${loading ? 'animate-spin' : ''}`} />
            <span>Tek Tuşla Listele</span>
          </button>

          {/* Sunucudan Tümünü Arşive Eşitle */}
          <button
            onClick={handleSyncAllFromServer}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-success-fill hover:bg-success-fill/90 text-white text-xs font-bold transition-all shadow-2xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            title="Sunucudaki tüm faturaları yerel IndexedDB arşivine kaydet"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Tümünü Arşive Kaydet ({serverInvoices.length})</span>
          </button>

          {/* JSON Export */}
          <button
            onClick={handleExportJson}
            className="p-2 rounded-xl bg-base-surface-2 hover:bg-border text-text-secondary hover:text-text-primary border border-border text-xs font-medium transition-all cursor-pointer"
            title="Arşivi JSON Olarak Yedekle"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* JSON Import */}
          <label className="p-2 rounded-xl bg-base-surface-2 hover:bg-border text-text-secondary hover:text-text-primary border border-border text-xs font-medium transition-all cursor-pointer" title="Yedek JSON Dosyası Yükle">
            <Upload className="w-4 h-4" />
            <input
              type="file"
              accept=".json"
              onChange={handleImportJson}
              className="hidden"
            />
          </label>

          {/* Clear Archive */}
          <button
            onClick={handleClearArchive}
            className="p-2 rounded-xl bg-danger-fill/10 hover:bg-danger-fill/20 text-danger-text border border-danger-border text-xs font-medium transition-all cursor-pointer"
            title="Tüm Arşivi Sıfırla"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-base-surface border border-border shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-text-muted">
            <span>Toplam Arşivlenen</span>
            <Database className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-xl font-black text-text-primary font-mono mt-1">
            {hierarchy?.stats.totalInvoices || 0} <span className="text-xs font-sans font-bold text-text-muted">Fatura</span>
          </div>
          <div className="text-[10px] text-text-muted mt-0.5">
            {hierarchy?.stats.yearCount || 0} Yıl / {hierarchy?.stats.monthCount || 0} Ay Klasörü
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-base-surface border border-border shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-text-muted">
            <span>Arşiv Ciro Toplamı</span>
            <Receipt className="w-3.5 h-3.5 text-success-text" />
          </div>
          <div className="text-xl font-black text-success-text font-mono mt-1">
            {formatTRY(hierarchy?.stats.totalAmount || 0)}
          </div>
          <div className="text-[10px] text-text-muted mt-0.5">
            KDV Dahil Net Ödenecek
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-base-surface border border-border shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-text-muted">
            <span>Fatura Türü Dağılımı</span>
            <Layers className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-sm font-bold text-text-primary mt-1 flex items-center space-x-2">
            <span className="text-red-600 dark:text-red-400 font-mono">{hierarchy?.stats.eFaturaCount || 0} E-Fatura</span>
            <span>•</span>
            <span className="text-blue-600 dark:text-blue-400 font-mono">{hierarchy?.stats.eArsivCount || 0} E-Arşiv</span>
          </div>
          <div className="text-[10px] text-text-muted mt-0.5">
            GİB Onaylı: {hierarchy?.stats.sentCount || 0} | Taslak: {hierarchy?.stats.draftCount || 0}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-base-surface border border-border shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-text-muted">
            <span>IndexedDB Kullanımı</span>
            <HardDrive className="w-3.5 h-3.5 text-purple-500" />
          </div>
          <div className="text-xl font-black text-text-primary font-mono mt-1">
            ~{diskUsageKb} <span className="text-xs font-sans font-bold text-text-muted">KB</span>
          </div>
          <div className="text-[10px] text-success-text mt-0.5">
            Tarayıcı içi sınırsız saklama
          </div>
        </div>
      </div>

      {/* 3. MAIN EXPLORER SPLIT VIEW (LEFT TREE + RIGHT CONTENT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* LEFT COLUMN: FOLDER TREE EXPLORER (4 cols) */}
        <div className="lg:col-span-4 p-4 rounded-2xl bg-base-surface border border-border shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-text-primary">
              <Folder className="w-4 h-4 text-amber-500" />
              <span>Klasör Ağacı (Yıl & Ay)</span>
            </div>
            <button
              onClick={() => {
                setSelectedYear('all');
                setSelectedMonth('all');
                setSelectedProfileFilter('all');
              }}
              className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
            >
              Filtreleri Temizle
            </button>
          </div>

          {/* Root Level: All Invoices Folder */}
          <button
            onClick={() => {
              setSelectedYear('all');
              setSelectedMonth('all');
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              selectedYear === 'all' && selectedMonth === 'all'
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 shadow-2xs'
                : 'bg-base-surface-2/60 hover:bg-base-surface-2 text-text-secondary hover:text-text-primary border-transparent'
            }`}
          >
            <div className="flex items-center space-x-2 min-w-0">
              <FolderOpen className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="truncate">Tüm Yerel Arşiv</span>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-base-surface text-text-primary font-mono text-[10px] border border-border shrink-0 ml-1">
              {hierarchy?.stats.totalInvoices || 0} Belge
            </span>
          </button>

          {/* Years & Months Hierarchy */}
          <div className="space-y-1.5 pt-1">
            {hierarchy?.years.length === 0 ? (
              <div className="p-4 text-center text-text-muted text-xs">
                Arşivde kayıtlı fatura klasörü yok.
              </div>
            ) : (
              hierarchy?.years.map(y => {
                const isYearExpanded = !!expandedYears[y.year];
                const isYearSelected = selectedYear === y.year && selectedMonth === 'all';

                return (
                  <div key={y.year} className="space-y-1 rounded-xl bg-base-surface-2/40 border border-border/60 p-1.5">
                    {/* Year Folder Header */}
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => toggleYearExpand(y.year)}
                        className="p-1 text-text-muted hover:text-text-primary cursor-pointer rounded-lg"
                        title={isYearExpanded ? 'Kapat' : 'Genişlet'}
                      >
                        {isYearExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <button
                        onClick={() => {
                          setSelectedYear(y.year);
                          setSelectedMonth('all');
                        }}
                        className={`flex-1 flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isYearSelected
                            ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200'
                            : 'text-text-primary hover:bg-base-surface-2'
                        }`}
                      >
                        <div className="flex items-center space-x-1.5 min-w-0">
                          <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="truncate">{y.year} Yılı Arşivi</span>
                        </div>
                        <span className="text-[10px] font-mono text-text-muted shrink-0 ml-1">
                          {y.count} Adet
                        </span>
                      </button>
                    </div>

                    {/* Months subfolders */}
                    {isYearExpanded && (
                      <div className="pl-6 space-y-1 pt-1 border-l-2 border-border/60 ml-3">
                        {y.months.map(m => {
                          const isMonthSelected = selectedMonth === m.yearMonth;
                          return (
                            <button
                              key={m.yearMonth}
                              onClick={() => {
                                setSelectedYear(y.year);
                                setSelectedMonth(m.yearMonth);
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                isMonthSelected
                                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                                  : 'text-text-secondary hover:text-text-primary hover:bg-base-surface-2'
                              }`}
                            >
                              <div className="flex items-center space-x-2 min-w-0">
                                <Calendar className={`w-3.5 h-3.5 shrink-0 ${isMonthSelected ? 'text-white' : 'text-text-muted'}`} />
                                <span className="truncate">{m.monthName} ({m.month})</span>
                              </div>
                              <span className={`text-[10px] font-mono shrink-0 ml-1 ${isMonthSelected ? 'text-blue-100' : 'text-text-muted'}`}>
                                {m.count} Belge
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

          {/* Scenario Filter Quick Select */}
          <div className="pt-2 border-t border-border space-y-1.5">
            <span className="text-[11px] font-bold text-text-muted block">
              Senaryo / Profil Filtresi
            </span>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <button
                onClick={() => setSelectedProfileFilter('all')}
                className={`px-2 py-1.5 rounded-lg font-bold text-[11px] cursor-pointer transition-all ${
                  selectedProfileFilter === 'all'
                    ? 'bg-base-surface-2 border border-border text-text-primary'
                    : 'text-text-secondary hover:bg-base-surface-2'
                }`}
              >
                Tümü
              </button>
              <button
                onClick={() => setSelectedProfileFilter('TICARIFATURA')}
                className={`px-2 py-1.5 rounded-lg font-bold text-[11px] cursor-pointer transition-all ${
                  selectedProfileFilter === 'TICARIFATURA'
                    ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-200'
                    : 'text-text-secondary hover:bg-base-surface-2'
                }`}
              >
                Ticari Fatura
              </button>
              <button
                onClick={() => setSelectedProfileFilter('EARSIVFATURA')}
                className={`px-2 py-1.5 rounded-lg font-bold text-[11px] cursor-pointer transition-all ${
                  selectedProfileFilter === 'EARSIVFATURA'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200'
                    : 'text-text-secondary hover:bg-base-surface-2'
                }`}
              >
                E-Arşiv Fatura
              </button>
              <button
                onClick={() => setSelectedProfileFilter('TEVKIFAT')}
                className={`px-2 py-1.5 rounded-lg font-bold text-[11px] cursor-pointer transition-all ${
                  selectedProfileFilter === 'TEVKIFAT'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200'
                    : 'text-text-secondary hover:bg-base-surface-2'
                }`}
              >
                Tevkifatlı Satış
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: ARCHIVED INVOICES EXPLORER TABLE / CARDS (8 cols) */}
        <div className="lg:col-span-8 space-y-3">
          
          {/* Active Folder Breadcrumb & Search Bar */}
          <div className="p-3.5 rounded-2xl bg-base-surface border border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs">
            
            {/* Breadcrumb */}
            <div className="flex items-center space-x-1.5 text-xs text-text-primary font-bold overflow-x-auto py-0.5">
              <span className="text-text-muted">📁 Arşiv</span>
              <ChevronRight className="w-3.5 h-3.5 text-text-muted shrink-0" />
              <span>{selectedYear === 'all' ? 'Tüm Yıllar' : `${selectedYear} Yılı`}</span>
              {selectedMonth !== 'all' && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-text-muted shrink-0" />
                  <span className="text-blue-600 dark:text-blue-400">
                    {getMonthNameTr(selectedMonth.split('-')[1])} Ayı
                  </span>
                </>
              )}
              <span className="px-2 py-0.5 rounded-md bg-base-surface-2 text-text-secondary font-mono text-[10px] border border-border shrink-0 ml-1">
                {filteredInvoices.length} Fatura ({formatTRY(folderSummary.totalAmount)})
              </span>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center space-x-1 bg-base-surface-2 p-1 rounded-xl border border-border shrink-0">
              <button
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-base-surface text-text-primary shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Tablo
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-base-surface text-text-primary shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Kartlar
              </button>
            </div>
          </div>

          {/* Search in Archive */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Arşivde Fatura No, Müşteri Ünvanı, VKN/TCKN, ETTN veya Sipariş No ile ara..."
              className="w-full pl-10 pr-4 py-2.5 bg-base-surface border border-border rounded-xl text-xs text-text-primary focus:outline-hidden focus:ring-1 focus:ring-blue-500 shadow-2xs"
            />
          </div>

          {/* Invoices Display Area */}
          {loading ? (
            <div className="p-12 text-center text-text-muted rounded-2xl bg-base-surface border border-border">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
              <p className="text-xs font-semibold">IndexedDB Arşivi okunuyor...</p>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="p-12 text-center text-text-muted rounded-2xl bg-base-surface border border-border space-y-3">
              <FolderOpen className="w-10 h-10 mx-auto text-text-muted opacity-40" />
              <div>
                <p className="text-sm font-bold text-text-primary">Seçilen Kriterlere Uygun Fatura Bulunamadı</p>
                <p className="text-xs text-text-muted mt-0.5">
                  Yukarıdaki "Tümünü Arşive Kaydet" butonuna tıklayarak sunucudaki aktif faturaları yerel veritabanına aktarabilirsiniz.
                </p>
              </div>
              <button
                onClick={handleSyncAllFromServer}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center space-x-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Sunucu Faturalarını Arşive Eşitle</span>
              </button>
            </div>
          ) : viewMode === 'table' ? (
            
            /* VIEW MODE 1: RICH DETAILED TABLE */
            <div className="border border-border rounded-2xl overflow-hidden bg-base-surface shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-base-surface-2 border-b border-border text-text-secondary text-[11px] font-bold">
                      <th className="py-3 px-3.5">Fatura No & ETTN</th>
                      <th className="py-3 px-3.5">Klasör & Tarih</th>
                      <th className="py-3 px-3.5">Müşteri / Ünvan</th>
                      <th className="py-3 px-3.5">Profil</th>
                      <th className="py-3 px-3.5 text-right">Matrah</th>
                      <th className="py-3 px-3.5 text-right">KDV</th>
                      <th className="py-3 px-3.5 text-right">Ödenecek</th>
                      <th className="py-3 px-3.5 text-center">GİB</th>
                      <th className="py-3 px-3.5 text-right">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredInvoices.map((inv) => {
                      const isEArsiv = inv.profile === 'EARSIVFATURA';
                      return (
                        <tr key={inv.id} className="hover:bg-base-surface-2/50 transition-colors">
                          
                          {/* Invoice Number & UUID */}
                          <td className="py-3 px-3.5 space-y-0.5">
                            <div className="flex items-center space-x-1.5">
                              <button
                                onClick={() => setPreviewInvoice(inv.invoiceData)}
                                className="font-mono font-bold text-text-primary hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center space-x-1 cursor-pointer"
                              >
                                <span>{inv.invoiceNumber}</span>
                                <ArrowUpRight className="w-3 h-3 text-text-muted" />
                              </button>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                isEArsiv ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                              }`}>
                                {isEArsiv ? 'E-ARŞİV' : 'E-FATURA'}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span className="font-mono text-[9px] text-text-muted truncate max-w-[130px]" title={inv.uuid}>
                                {inv.uuid}
                              </span>
                              <button
                                onClick={() => handleCopyText(inv.uuid, inv.id)}
                                className="p-0.5 text-text-muted hover:text-text-primary cursor-pointer"
                                title="ETTN Kopyala"
                              >
                                {copiedId === inv.id ? <Check className="w-3 h-3 text-success-text" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                          </td>

                          {/* Folder & Date */}
                          <td className="py-3 px-3.5 space-y-0.5">
                            <div className="font-semibold text-text-primary">
                              {new Date(inv.invoiceDate).toLocaleDateString('tr-TR')}
                            </div>
                            <span className="inline-block px-1.5 py-0.5 rounded bg-base-surface-2 text-[9px] font-mono text-text-muted border border-border">
                              📁 {inv.year}/{inv.month}
                            </span>
                          </td>

                          {/* Customer */}
                          <td className="py-3 px-3.5 space-y-0.5 max-w-[190px]">
                            <div className="font-bold text-text-primary truncate" title={inv.customerTitle}>
                              {inv.customerTitle}
                            </div>
                            <div className="text-[10px] text-text-muted font-mono">
                              {inv.customerVknTckn.length === 10 ? 'VKN:' : 'TCKN:'} {inv.customerVknTckn}
                            </div>
                          </td>

                          {/* Profile & Type */}
                          <td className="py-3 px-3.5">
                            <div className="font-semibold text-[11px] text-text-primary">
                              {inv.profile}
                            </div>
                            <div className="text-[10px] text-text-muted">
                              {inv.type === 'TEVKIFAT' ? (
                                <span className="text-amber-600 dark:text-amber-400 font-bold">Tevkifat</span>
                              ) : inv.type}
                            </div>
                          </td>

                          {/* Matrah */}
                          <td className="py-3 px-3.5 text-right font-mono text-text-secondary">
                            {formatTRY(inv.taxExclusiveAmount)}
                          </td>

                          {/* VAT */}
                          <td className="py-3 px-3.5 text-right font-mono text-text-secondary">
                            {formatTRY(inv.totalVat)}
                          </td>

                          {/* Payable Total */}
                          <td className="py-3 px-3.5 text-right font-mono font-bold text-text-primary">
                            {formatTRY(inv.payableAmount)}
                          </td>

                          {/* GİB Status */}
                          <td className="py-3 px-3.5 text-center">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              inv.status === 'sent'
                                ? 'bg-bg-success text-success-text'
                                : inv.status === 'draft'
                                ? 'bg-bg-warning text-warning-text'
                                : 'bg-danger-fill/15 text-danger-text'
                            }`}>
                              {inv.status === 'sent' && '✓ Onaylı'}
                              {inv.status === 'draft' && 'Taslak'}
                              {inv.status === 'cancelled' && 'İptal'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-3.5 text-right">
                            <div className="flex items-center justify-end space-x-1">
                              {/* Preview */}
                              <button
                                onClick={() => setPreviewInvoice(inv.invoiceData)}
                                className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-base-surface-2 transition-colors cursor-pointer"
                                title="Önizle"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {/* Direct Print */}
                              <button
                                onClick={() => printInvoiceDirectly(inv.invoiceData)}
                                className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-base-surface-2 transition-colors cursor-pointer"
                                title="A4 Yazdır"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>

                              {/* PDF Export */}
                              <button
                                onClick={() => exportEInvoiceToPdf(inv.invoiceData)}
                                className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-base-surface-2 transition-colors cursor-pointer"
                                title="PDF İndir"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>

                              {/* XML Export */}
                              <button
                                onClick={() => downloadEInvoiceXML(inv.invoiceData)}
                                className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                                title="UBL-TR XML İndir"
                              >
                                <FileCode className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete from archive */}
                              <button
                                onClick={() => handleDeleteArchivedInvoice(inv.id, inv.invoiceNumber)}
                                className="p-1.5 rounded-lg text-text-muted hover:text-danger-text hover:bg-danger-fill/15 transition-colors cursor-pointer"
                                title="Arşivden Sil"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          ) : (

            /* VIEW MODE 2: FOLDER CARDS GRID */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredInvoices.map((inv) => {
                const isEArsiv = inv.profile === 'EARSIVFATURA';
                return (
                  <div key={inv.id} className="p-4 rounded-2xl bg-base-surface border border-border shadow-xs hover:border-blue-500/50 transition-all space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-black text-sm text-text-primary">
                            {inv.invoiceNumber}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            isEArsiv ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                          }`}>
                            {isEArsiv ? 'E-ARŞİV' : 'E-FATURA'}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-text-secondary mt-1 truncate max-w-[220px]">
                          {inv.customerTitle}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-black text-text-primary font-mono">
                          {formatTRY(inv.payableAmount)}
                        </div>
                        <div className="text-[10px] text-text-muted">
                          {new Date(inv.invoiceDate).toLocaleDateString('tr-TR')}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                      <span className="text-[10px] font-mono text-text-muted">
                        📁 {inv.folderDisplay}
                      </span>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => setPreviewInvoice(inv.invoiceData)}
                          className="px-2.5 py-1 rounded-lg bg-base-surface-2 hover:bg-border text-text-primary text-[11px] font-bold cursor-pointer transition-colors"
                        >
                          İncele
                        </button>
                        <button
                          onClick={() => printInvoiceDirectly(inv.invoiceData)}
                          className="p-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-base-surface-2 transition-colors cursor-pointer"
                          title="Yazdır"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => exportEInvoiceToPdf(inv.invoiceData)}
                          className="p-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-base-surface-2 transition-colors cursor-pointer"
                          title="PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          )}

        </div>

      </div>

      {/* Invoice View Modal */}
      {previewInvoice && (
        <EInvoiceViewModal
          invoice={previewInvoice}
          onClose={() => setPreviewInvoice(null)}
        />
      )}

    </div>
  );
}
