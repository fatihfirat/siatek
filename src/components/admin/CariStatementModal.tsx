import { useState, useEffect, useMemo } from 'react';
import { CariAccount, CariTransaction, CariTransactionType } from '../../types';
import {
  X,
  Printer,
  Download,
  Plus,
  Trash2,
  ArrowDownRight,
  ArrowUpRight,
  SlidersHorizontal,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Share2,
  Check,
  RotateCcw,
  Clock,
  ShieldCheck,
  AlertTriangle,
  FileText,
  FileSpreadsheet,
  MessageCircle,
  Copy,
  ExternalLink,
  ChevronDown,
  Bell,
  TrendingUp,
  TrendingDown,
  CreditCard,
  BarChart3,
  Activity,
  ShieldAlert,
  User,
  Banknote,
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react';
import CariTransactionModal, { TransactionModalMode } from './CariTransactionModal';
import PaymentReminderModal from './PaymentReminderModal';
import { generateCariStatementPDF, generateCariStatementExcel } from '../../utils/exportUtils';
import { printElementById } from '../../utils/printUtils';
import { copyToClipboard, openWhatsAppShare, shareContent } from '../../utils/shareUtils';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import {
  subscribeToCariAccounts,
  subscribeToCariTransactions,
  saveCariTransactionToFirestore,
  updateCariAccountInFirestore,
  incrementCariBalanceInFirestore,
} from '../../lib/firestoreService';
import { db, collection, getDocs, query, where, deleteDoc, doc } from '../../lib/firebase';
import { calculateCariDueStatus } from '../../utils/reminderUtils';

interface CariStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  cariId: string;
  onRefreshCariList: () => void;
}

const money = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2 });

const TX_TYPE_LABELS: Record<CariTransactionType, string> = {
  sale_invoice: 'Satış Faturası',
  payment_received: 'Tahsilat',
  supplier_invoice: 'Alış Faturası',
  payment_made: 'Ödeme',
  return_credit: 'İade / Mahsup',
  opening_balance: 'Devir/Borç Kaydı',
};

const TX_TYPE_COLORS: Record<CariTransactionType, string> = {
  sale_invoice: 'bg-danger-fill/15 text-danger-text border-danger-border',
  payment_received: 'bg-success-fill/15 text-success-text border-success-border',
  supplier_invoice: 'bg-warning-fill/15 text-warning-text border-warning-border',
  payment_made: 'bg-success-fill/15 text-success-text border-success-border',
  return_credit: 'bg-info-fill/15 text-info-text border-info-border',
  opening_balance: 'bg-warning-fill/15 text-warning-text border-warning-border',
};

export default function CariStatementModal({
  isOpen,
  onClose,
  cariId,
  onRefreshCariList,
}: CariStatementModalProps) {
  const [cari, setCari] = useState<CariAccount | null>(null);
  const [transactions, setTransactions] = useState<CariTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [txModalMode, setTxModalMode] = useState<TransactionModalMode>('payment');

  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [txSearch, setTxSearch] = useState('');
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [excelGenerating, setExcelGenerating] = useState(false);
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'ledger'>('overview');

  // Live Firestore subscription for this cari account and its transactions
  useEffect(() => {
    if (!isOpen || !cariId) return;
    setIsLoading(true);

    // Subscribe to cari account
    const unsubCari = subscribeToCariAccounts((list) => {
      const found = list.find(c => c.id === cariId) || null;
      setCari(found);
    }, { uid: null, isAdmin: true });

    // Fetch transactions from Firestore
    getDocs(query(collection(db, 'cari_transactions'), where('cariId', '==', cariId)))
      .then((snap) => {
        const list: CariTransaction[] = [];
        snap.forEach(d => list.push({ id: d.id, ...(d.data() as Omit<CariTransaction, 'id'>) }));
        list.sort((a, b) => String(a.createdAt || a.date || '').localeCompare(String(b.createdAt || b.date || '')));
        setTransactions(list);
        setIsLoading(false);
      })
      .catch((e) => {
        console.error('Cari hareketler yüklenirken hata:', e);
        setIsLoading(false);
      });

    return () => { unsubCari(); };
  }, [isOpen, cariId]);

  const refreshTransactions = async () => {
    if (!cariId) return;
    try {
      const snap = await getDocs(query(collection(db, 'cari_transactions'), where('cariId', '==', cariId)));
      const list: CariTransaction[] = [];
      snap.forEach(d => list.push({ id: d.id, ...(d.data() as Omit<CariTransaction, 'id'>) }));
      list.sort((a, b) => String(a.createdAt || a.date || '').localeCompare(String(b.createdAt || b.date || '')));
      setTransactions(list);
    } catch (e) {
      console.error(e);
    }
  };

  useModalBehavior(isOpen, () => {
    if (!showTransactionModal && !showReminderModal) {
      onClose();
    }
  });

  if (!isOpen) return null;

  const handleOpenTransaction = (mode: TransactionModalMode) => {
    setTxModalMode(mode);
    setShowTransactionModal(true);
  };

  const handleSaveTransaction = async (data: any) => {
    if (!cari) return;
    try {
      const now = new Date().toISOString();
      const txId = `caritx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const tutar = Number(data?.amount) || 0;
      const yon = data?.type === 'payment_received' || data?.type === 'return_credit' || data?.type === 'payment_made' ? -1 : 1;

      const tx: CariTransaction = {
        id: txId,
        cariId: cari.id,
        date: data?.date || now.split('T')[0],
        type: data?.type || (yon > 0 ? 'sale_invoice' : 'payment_received'),
        direction: yon > 0 ? 'debit' : 'credit',
        amount: tutar,
        description: data?.description || '',
        documentNo: data?.documentNo,
        paymentMethod: data?.paymentMethod,
        dueDate: data?.dueDate,
        createdAt: now,
      };

      await saveCariTransactionToFirestore(tx);
      // Atomic increment — race condition yok
      await incrementCariBalanceInFirestore(cari.id, tutar, yon > 0 ? 'debit' : 'credit', {
        lastTransactionDate: now,
        lastTransactionDesc: tx.description,
      });

      await refreshTransactions();
      onRefreshCariList();
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const handleDeleteTransaction = async (tx: CariTransaction) => {
    if (!cari) return;
    if (!confirm(`"${tx.description}" hareketini silmek istediğinize emin misiniz?`)) return;
    try {
      await deleteDoc(doc(db, 'cari_transactions', tx.id));

      // Atomic reverse increment — stale state yok
      await incrementCariBalanceInFirestore(
        cari.id,
        tx.amount,
        tx.direction === 'debit' ? 'credit' : 'debit', // tersine çevir
      );

      await refreshTransactions();
      onRefreshCariList();
    } catch (e) {
      console.error(e);
    }
  };

  // Filter and search transactions
  const filteredTxs = useMemo(() => transactions.filter(t => {
    if (filterStartDate && t.date < filterStartDate) return false;
    if (filterEndDate && t.date > filterEndDate) return false;
    if (txSearch.trim()) {
      const q = txSearch.trim().toLocaleLowerCase('tr-TR');
      const match =
        t.description?.toLocaleLowerCase('tr-TR').includes(q) ||
        t.documentNo?.toLocaleLowerCase('tr-TR').includes(q) ||
        (TX_TYPE_LABELS[t.type] || '').toLocaleLowerCase('tr-TR').includes(q);
      if (!match) return false;
    }
    return true;
  }), [transactions, filterStartDate, filterEndDate, txSearch]);

  // Running balance calculation
  const chronologicalTxs = [...filteredTxs].sort((a, b) =>
    String(a.date || a.createdAt || '').localeCompare(String(b.date || b.createdAt || ''))
  );
  let runningBal = 0;
  const txWithBalance = chronologicalTxs.map(t => {
    runningBal += t.direction === 'debit' ? t.amount : -t.amount;
    return { ...t, runningBalance: runningBal };
  });
  const displayTxs = [...txWithBalance].reverse();

  // Analytics
  const totalDebits = transactions.filter(t => t.direction === 'debit').reduce((s, t) => s + t.amount, 0);
  const totalCredits = transactions.filter(t => t.direction === 'credit').reduce((s, t) => s + t.amount, 0);
  const lastPayment = [...transactions].filter(t => t.direction === 'credit').sort((a, b) => b.date.localeCompare(a.date))[0];
  const lastSale = [...transactions].filter(t => t.direction === 'debit').sort((a, b) => b.date.localeCompare(a.date))[0];
  const dueInfo = cari ? calculateCariDueStatus(cari) : null;
  const riskRatio = cari && cari.creditLimit > 0 ? Math.min(100, Math.round((Math.max(0, cari.balance) / cari.creditLimit) * 100)) : 0;
  const isOverLimit = cari ? (cari.creditLimit > 0 && cari.balance > cari.creditLimit) : false;

  const getStatementSummaryText = () => {
    if (!cari) return '';
    const balanceStatus = cari.balance > 0
      ? `${money(cari.balance)} ₺ (Borçlu / Alacağımız)`
      : cari.balance < 0
      ? `${money(Math.abs(cari.balance))} ₺ (Alacaklı / Borcumuz)`
      : '0,00 ₺ (Hesap Mutabık)';
    return `*ALPHA TEKNİK DOĞALGAZ & TESİSAT*\n*CARİ HESAP EKSTRE VE MUTABAKAT ÖZETİ*\n\nSayın *${cari.companyName}* (${cari.name}),\n\n🗓 *Tarih:* ${new Date().toLocaleDateString('tr-TR')}\n🏢 *Cari Kodu:* ${cari.code}\n📊 *Toplam Borçlandırılan:* ${money(cari.totalDebit)} ₺\n💳 *Toplam Tahsil Edilen:* ${money(cari.totalCredit)} ₺\n💰 *GÜNCEL NET BAKİYE:* *${balanceStatus}*\n⏱ *Standart Vade:* ${cari.paymentTermDays} Gün\n\nDetaylı hesap dökümü ve sorularınız için bizimle iletişime geçebilirsiniz.\nTel: +90 544 440 91 80 | info@alphadogalgaz.com`;
  };

  const handleShareWhatsApp = () => {
    if (!cari) return;
    openWhatsAppShare({ phone: cari.phone, message: getStatementSummaryText() });
    setIsShareMenuOpen(false);
    setShareFeedback('WhatsApp açılıyor...');
    setTimeout(() => setShareFeedback(null), 3000);
  };

  const handleCopySummary = async () => {
    if (!cari) return;
    const success = await copyToClipboard(getStatementSummaryText());
    if (success) {
      setCopiedNotification(true);
      setShareFeedback('Ekstre özeti panoya kopyalandı!');
      setTimeout(() => { setCopiedNotification(false); setShareFeedback(null); }, 3000);
    }
    setIsShareMenuOpen(false);
  };

  const handleShareEmail = () => {
    if (!cari) return;
    const subject = encodeURIComponent(`Cari Hesap Ekstre Bilgilendirmesi - ${cari.companyName}`);
    const body = encodeURIComponent(getStatementSummaryText());
    window.location.href = `mailto:${cari.email || ''}?subject=${subject}&body=${body}`;
    setIsShareMenuOpen(false);
  };

  const handleNativeShare = async () => {
    if (!cari) return;
    await shareContent({ title: `${cari.companyName} - Cari Ekstre`, text: getStatementSummaryText() });
    setIsShareMenuOpen(false);
  };

  const handleExportPDF = async () => {
    if (!cari) return;
    setPdfGenerating(true);
    try {
      await generateCariStatementPDF(cari, filteredTxs, { startDate: filterStartDate, endDate: filterEndDate });
    } catch (e) {
      console.error('PDF oluşturulurken hata:', e);
    } finally {
      setTimeout(() => setPdfGenerating(false), 500);
    }
  };

  const handleExportExcel = () => {
    if (!cari) return;
    setExcelGenerating(true);
    try {
      generateCariStatementExcel(cari, filteredTxs);
    } catch (e) {
      console.error('Excel oluşturulurken hata:', e);
    } finally {
      setTimeout(() => setExcelGenerating(false), 500);
    }
  };

  const handlePrint = () => {
    setIsPrinting(true);
    printElementById('cari-statement-print-area', `${cari?.companyName || 'Cari'} - Hesap Ekstresi`);
    setTimeout(() => setIsPrinting(false), 1000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:static"
      onClick={onClose}
    >
      <div
        className="bg-base-surface border border-border rounded-3xl w-full max-w-6xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 my-4 flex flex-col max-h-[94vh] print:max-h-none print:border-none print:shadow-none print:rounded-none"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Toast Feedback */}
        {shareFeedback && (
          <div className="fixed top-5 right-5 z-[60] bg-success-fill text-base text-xs font-bold px-4 py-2.5 rounded-2xl shadow-xl flex items-center space-x-2 animate-in fade-in slide-in-from-top-2">
            <Check className="w-4 h-4" />
            <span>{shareFeedback}</span>
          </div>
        )}

        {/* HEADER */}
        <div className="flex flex-wrap items-center justify-between px-5 py-3.5 border-b border-border bg-base-surface-2 print:hidden shrink-0 gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-info-fill/15 text-info-text border border-info-border flex items-center justify-center shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm sm:text-base font-black tracking-tight text-text-primary">
                  {cari ? cari.companyName : 'Yükleniyor...'}
                </h2>
                {cari && (
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${
                    cari.type === 'dealer' ? 'bg-warning-fill/15 text-warning-text border-warning-border'
                    : cari.type === 'supplier' ? 'bg-success-fill/15 text-success-text border-success-border'
                    : 'bg-info-fill/15 text-info-text border-info-border'
                  }`}>
                    {cari.type === 'dealer' ? 'Bayi' : cari.type === 'supplier' ? 'Tedarikçi' : 'Müşteri'}
                  </span>
                )}
                {cari?.status === 'blocked' && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-danger-fill/15 text-danger-text border border-danger-border uppercase animate-pulse">
                    BLOKE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-text-secondary">
                {cari ? `${cari.code} · Yetkili: ${cari.name}` : ''}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button onClick={() => handleOpenTransaction('payment')}
              className="px-2.5 py-1.5 rounded-xl bg-success-fill hover:opacity-90 text-base text-xs font-bold flex items-center space-x-1 shadow-xs cursor-pointer transition-opacity">
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>Ödeme Al</span>
            </button>
            <button onClick={() => handleOpenTransaction('debt')}
              className="px-2.5 py-1.5 rounded-xl bg-danger-fill hover:opacity-90 text-base text-xs font-bold flex items-center space-x-1 shadow-xs cursor-pointer transition-opacity">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Borç Ekle</span>
            </button>
            <button onClick={() => handleOpenTransaction('adjust')}
              className="px-2.5 py-1.5 rounded-xl bg-info-fill hover:opacity-90 text-base text-xs font-bold flex items-center space-x-1 shadow-xs cursor-pointer transition-opacity">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bakiye Güncelle</span>
            </button>

            <div className="h-5 w-px bg-border mx-0.5" />

            {cari && cari.balance > 0 && (
              <button onClick={() => setShowReminderModal(true)}
                className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center space-x-1 cursor-pointer shadow-2xs">
                <Bell className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Hatırlat</span>
              </button>
            )}

            <button onClick={handleExportPDF} disabled={pdfGenerating}
              className="px-2.5 py-1.5 rounded-xl bg-base-surface-2 hover:bg-base-surface border border-border text-xs font-bold flex items-center space-x-1 cursor-pointer shadow-2xs transition-colors">
              <Download className="w-3.5 h-3.5 text-danger-text" />
              <span className="hidden sm:inline">{pdfGenerating ? 'Hazır...' : 'PDF'}</span>
            </button>

            <button onClick={handleExportExcel} disabled={excelGenerating}
              className="px-2.5 py-1.5 rounded-xl bg-base-surface-2 hover:bg-base-surface border border-border text-xs font-bold flex items-center space-x-1 cursor-pointer shadow-2xs transition-colors">
              <FileSpreadsheet className="w-3.5 h-3.5 text-success-text" />
              <span className="hidden sm:inline">{excelGenerating ? 'Hazır...' : 'Excel'}</span>
            </button>

            {/* Share Dropdown */}
            <div className="relative">
              <button onClick={() => setIsShareMenuOpen(!isShareMenuOpen)}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center space-x-1 cursor-pointer shadow-2xs transition-colors ${
                  isShareMenuOpen ? 'bg-success-fill text-base border-success-border' : 'bg-base-surface-2 hover:bg-base-surface border-border text-text-primary'
                }`}>
                {copiedNotification ? <Check className="w-3.5 h-3.5 text-success-text" /> : <Share2 className="w-3.5 h-3.5 text-success-text" />}
                <span className="hidden sm:inline">Paylaş</span>
                <ChevronDown className="w-3 h-3 text-text-muted" />
              </button>
              {isShareMenuOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-base-surface border border-border rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 text-xs"
                  onClick={(e) => e.stopPropagation()}>
                  <div className="px-3 py-1.5 border-b border-border mb-1 text-[10px] font-bold text-text-muted uppercase">Paylaşım Seçenekleri</div>
                  <button onClick={handleShareWhatsApp} className="w-full px-3 py-2 text-left rounded-xl hover:bg-base-surface-2 flex items-center space-x-2.5 cursor-pointer text-text-primary group transition-colors">
                    <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 border border-emerald-300 dark:border-emerald-800"><MessageCircle className="w-4 h-4" /></div>
                    <div><div className="font-semibold group-hover:text-success-text">WhatsApp ile Gönder</div><div className="text-[10px] text-text-muted">{cari?.phone || 'Mesaj oluştur'}</div></div>
                  </button>
                  <button onClick={handleCopySummary} className="w-full px-3 py-2 text-left rounded-xl hover:bg-base-surface-2 flex items-center space-x-2.5 cursor-pointer text-text-primary group transition-colors">
                    <div className="p-1.5 rounded-lg bg-info-fill/15 text-info-text border border-info-border"><Copy className="w-4 h-4" /></div>
                    <div><div className="font-semibold group-hover:text-info-text">Metni Panoya Kopyala</div><div className="text-[10px] text-text-muted">SMS, mesaj veya belge için</div></div>
                  </button>
                  {cari?.email && (
                    <button onClick={handleShareEmail} className="w-full px-3 py-2 text-left rounded-xl hover:bg-base-surface-2 flex items-center space-x-2.5 cursor-pointer text-text-primary group transition-colors">
                      <div className="p-1.5 rounded-lg bg-warning-fill/15 text-warning-text border border-warning-border"><Mail className="w-4 h-4" /></div>
                      <div><div className="font-semibold group-hover:text-warning-text">E-Posta ile Gönder</div><div className="text-[10px] text-text-muted">{cari.email}</div></div>
                    </button>
                  )}
                  {typeof navigator !== 'undefined' && 'share' in navigator && (
                    <button onClick={handleNativeShare} className="w-full px-3 py-2 text-left rounded-xl hover:bg-base-surface-2 flex items-center space-x-2.5 cursor-pointer text-text-primary transition-colors">
                      <div className="p-1.5 rounded-lg bg-base-surface-2 text-text-secondary border border-border"><ExternalLink className="w-4 h-4" /></div>
                      <div><div className="font-semibold">Cihaz Menüsü ile Paylaş</div><div className="text-[10px] text-text-muted">Mobil paylaşım penceresi</div></div>
                    </button>
                  )}
                </div>
              )}
            </div>

            <button onClick={handlePrint} disabled={isPrinting}
              className="px-2.5 py-1.5 rounded-xl bg-base-surface-2 hover:bg-base-surface border border-border text-xs font-bold flex items-center space-x-1 cursor-pointer shadow-2xs transition-colors">
              <Printer className={`w-3.5 h-3.5 ${isPrinting ? 'animate-pulse text-warning-text' : 'text-text-secondary'}`} />
              <span className="hidden sm:inline">{isPrinting ? 'Yazdırılıyor...' : 'Yazdır'}</span>
            </button>

            <button onClick={onClose} className="p-2 rounded-xl hover:bg-base-surface text-text-secondary hover:text-text-primary transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TAB NAVIGATION */}
        <div className="flex items-center border-b border-border bg-base-surface-2 px-5 print:hidden shrink-0">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'overview' ? 'border-info-fill text-info-text' : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Cari Profil & Özet</span>
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'ledger' ? 'border-info-fill text-info-text' : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Hesap Ekstresi</span>
            <span className="px-1.5 py-0.5 rounded-full bg-base text-[10px] font-mono text-text-muted border border-border/50">
              {transactions.length}
            </span>
          </button>
        </div>

        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-base custom-scrollbar print:overflow-visible print:p-0">
          {isLoading ? (
            <div className="py-20 text-center">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin text-info-fill mb-3" />
              <p className="text-xs text-text-secondary">Cari hesap yükleniyor...</p>
            </div>
          ) : !cari ? (
            <div className="py-20 text-center text-text-muted">
              <Building2 className="w-10 h-10 mx-auto opacity-30 mb-3" />
              <p className="text-sm font-semibold">Cari hesap bulunamadı.</p>
            </div>
          ) : activeTab === 'overview' ? (
            /* ============ PREMIUM OVERVIEW TAB ============ */
            <div className="space-y-5 animate-in fade-in duration-200">

              {/* Company Info Card */}
              <div className="bg-base-surface border border-border rounded-3xl overflow-hidden shadow-sm">
                {/* Company header band */}
                <div className={`h-1.5 w-full ${
                  cari.balance > 0 ? 'bg-danger-fill' : cari.balance < 0 ? 'bg-info-fill' : 'bg-success-fill'
                }`} />
                <div className="p-5 sm:p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-5">
                    {/* Left: Identity */}
                    <div className="flex-1 space-y-4">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-mono font-bold text-info-text text-sm tracking-wide">{cari.code}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            cari.status === 'blocked' ? 'bg-danger-fill/15 text-danger-text border-danger-border'
                            : cari.status === 'passive' ? 'bg-base-surface-2 text-text-muted border-border'
                            : 'bg-success-fill/10 text-success-text border-success-border'
                          }`}>
                            {cari.status === 'blocked' ? 'BLOKE' : cari.status === 'passive' ? 'PASİF' : 'AKTİF'}
                          </span>
                        </div>
                        <h3 className="text-lg font-black text-text-primary leading-snug">{cari.companyName}</h3>
                        <p className="text-sm text-text-secondary mt-0.5">Yetkili: <strong className="text-text-primary">{cari.name}</strong></p>
                      </div>

                      {/* Contact grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {cari.phone && (
                          <a href={`tel:${cari.phone}`} className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-base-surface-2 border border-border hover:border-info-border transition-colors group">
                            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                              <Phone className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="text-[10px] text-text-muted">Telefon</div>
                              <div className="font-mono font-bold text-text-primary group-hover:text-info-text">{cari.phone}</div>
                            </div>
                          </a>
                        )}
                        {cari.email && (
                          <a href={`mailto:${cari.email}`} className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-base-surface-2 border border-border hover:border-info-border transition-colors group">
                            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 border border-blue-500/20">
                              <Mail className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="text-[10px] text-text-muted">E-Posta</div>
                              <div className="font-medium text-text-primary group-hover:text-info-text truncate max-w-[140px]">{cari.email}</div>
                            </div>
                          </a>
                        )}
                        {cari.city && (
                          <div className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-base-surface-2 border border-border">
                            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20">
                              <MapPin className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="text-[10px] text-text-muted">Şehir / Adres</div>
                              <div className="font-medium text-text-primary">{cari.city}{cari.address ? ` — ${cari.address}` : ''}</div>
                            </div>
                          </div>
                        )}
                        {(cari.taxNumber || cari.taxOffice) && (
                          <div className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-base-surface-2 border border-border">
                            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 border border-purple-500/20">
                              <FileText className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="text-[10px] text-text-muted">Vergi Dairesi / No</div>
                              <div className="font-mono font-medium text-text-primary">{cari.taxOffice} {cari.taxNumber}</div>
                            </div>
                          </div>
                        )}
                      </div>

                      {cari.notes && (
                        <div className="p-3 rounded-xl bg-amber-500/8 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200">
                          <span className="font-bold text-amber-700 dark:text-amber-400">Not: </span>{cari.notes}
                        </div>
                      )}
                    </div>

                    {/* Right: Balance & Risk Panel */}
                    <div className="lg:w-72 space-y-3">
                      {/* Main balance card */}
                      <div className={`p-4 rounded-2xl border shadow-sm ${
                        cari.balance > 0 ? 'bg-danger-fill/10 border-danger-border'
                        : cari.balance < 0 ? 'bg-info-fill/10 border-info-border'
                        : 'bg-success-fill/10 border-success-border'
                      }`}>
                        <div className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1">Güncel Net Bakiye</div>
                        <div className={`text-3xl font-black font-mono tracking-tight ${
                          cari.balance > 0 ? 'text-danger-text' : cari.balance < 0 ? 'text-info-text' : 'text-success-text'
                        }`}>
                          {cari.balance > 0 ? `+${money(cari.balance)}` : cari.balance < 0 ? `-${money(Math.abs(cari.balance))}` : '0,00'} ₺
                        </div>
                        <div className={`text-xs font-bold mt-0.5 ${
                          cari.balance > 0 ? 'text-danger-text' : cari.balance < 0 ? 'text-info-text' : 'text-success-text'
                        }`}>
                          {cari.balance > 0 ? 'Borçlu (Alacağımız)' : cari.balance < 0 ? 'Alacaklı (Borcumuz)' : 'Hesap Mutabık'}
                        </div>
                        {cari.balance > 0 && dueInfo && (
                          <div className={`mt-2 px-2.5 py-1 rounded-lg text-[10px] font-bold border inline-flex items-center space-x-1 ${dueInfo.badgeClass}`}>
                            <Clock className="w-3 h-3" />
                            <span>{dueInfo.daysText}</span>
                          </div>
                        )}
                      </div>

                      {/* Debit / Credit stats */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 rounded-xl bg-base-surface-2 border border-border">
                          <div className="text-[10px] text-text-muted font-semibold uppercase">Toplam Borç</div>
                          <div className="text-sm font-black font-mono text-danger-text mt-0.5">{money(cari.totalDebit)} ₺</div>
                          <div className="text-[10px] text-text-muted mt-0.5">{transactions.filter(t => t.direction === 'debit').length} işlem</div>
                        </div>
                        <div className="p-3 rounded-xl bg-base-surface-2 border border-border">
                          <div className="text-[10px] text-text-muted font-semibold uppercase">Toplam Tahsilat</div>
                          <div className="text-sm font-black font-mono text-success-text mt-0.5">{money(cari.totalCredit)} ₺</div>
                          <div className="text-[10px] text-text-muted mt-0.5">{transactions.filter(t => t.direction === 'credit').length} işlem</div>
                        </div>
                      </div>

                      {/* Credit limit bar */}
                      <div className="p-3.5 rounded-xl bg-base-surface-2 border border-border space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-text-secondary">Kredi / Risk Limiti</span>
                          <span className="font-mono font-bold text-text-primary">{money(cari.creditLimit)} ₺</span>
                        </div>
                        <div className="w-full bg-base h-2.5 rounded-full overflow-hidden border border-border/60">
                          <div
                            className={`h-full rounded-full transition-all ${isOverLimit ? 'bg-danger-fill animate-pulse' : riskRatio > 75 ? 'bg-warning-fill' : 'bg-success-fill'}`}
                            style={{ width: `${riskRatio}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className={`font-bold ${isOverLimit ? 'text-danger-text' : riskRatio > 75 ? 'text-warning-text' : 'text-text-muted'}`}>
                            {isOverLimit ? '⚠ Limit Aşımı!' : `%${riskRatio} Kullanımda`}
                          </span>
                          <span className="text-text-muted">Vade: <strong className="text-text-primary">{cari.paymentTermDays} Gün</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* KPI Metric Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-base-surface border border-border p-4 rounded-2xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-text-secondary">Son Satış</span>
                    <TrendingUp className="w-4 h-4 text-danger-text" />
                  </div>
                  <div className="text-sm font-black text-text-primary font-mono">
                    {lastSale ? `${money(lastSale.amount)} ₺` : '—'}
                  </div>
                  <div className="text-[10px] text-text-muted">
                    {lastSale ? lastSale.date : 'Kayıtlı satış yok'}
                  </div>
                </div>

                <div className="bg-base-surface border border-border p-4 rounded-2xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-text-secondary">Son Ödeme</span>
                    <TrendingDown className="w-4 h-4 text-success-text" />
                  </div>
                  <div className="text-sm font-black text-success-text font-mono">
                    {lastPayment ? `${money(lastPayment.amount)} ₺` : '—'}
                  </div>
                  <div className="text-[10px] text-text-muted">
                    {lastPayment ? lastPayment.date : 'Kayıtlı ödeme yok'}
                  </div>
                </div>

                <div className="bg-base-surface border border-border p-4 rounded-2xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-text-secondary">Toplam İşlem</span>
                    <Activity className="w-4 h-4 text-info-text" />
                  </div>
                  <div className="text-sm font-black text-text-primary font-mono">{transactions.length}</div>
                  <div className="text-[10px] text-text-muted">
                    {transactions.filter(t => t.direction === 'debit').length} borç · {transactions.filter(t => t.direction === 'credit').length} tahsilat
                  </div>
                </div>

                <div className="bg-base-surface border border-border p-4 rounded-2xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-text-secondary">Kayıt Tarihi</span>
                    <Calendar className="w-4 h-4 text-text-muted" />
                  </div>
                  <div className="text-sm font-black text-text-primary">
                    {new Date(cari.createdAt).toLocaleDateString('tr-TR')}
                  </div>
                  <div className="text-[10px] text-text-muted">
                    {Math.floor((Date.now() - new Date(cari.createdAt).getTime()) / (1000 * 60 * 60 * 24))} gün önce
                  </div>
                </div>
              </div>

              {/* Recent transactions (last 5) */}
              {transactions.length > 0 && (
                <div className="bg-base-surface border border-border rounded-2xl overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-base-surface-2">
                    <h4 className="text-xs font-bold text-text-primary flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-info-text" />
                      <span>Son 5 Hareket</span>
                    </h4>
                    <button onClick={() => setActiveTab('ledger')}
                      className="text-[11px] font-bold text-info-text hover:underline cursor-pointer">
                      Tüm hareketler →
                    </button>
                  </div>
                  <div className="divide-y divide-border">
                    {[...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).map(t => (
                      <div key={t.id} className="flex items-center justify-between px-5 py-3 hover:bg-base-surface-2/50 transition-colors">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                            t.direction === 'debit' ? 'bg-danger-fill/15 text-danger-text border-danger-border' : 'bg-success-fill/15 text-success-text border-success-border'
                          }`}>
                            {t.direction === 'debit' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-text-primary truncate max-w-[200px]">{t.description}</div>
                            <div className="text-[10px] text-text-muted">{t.date} · {TX_TYPE_LABELS[t.type] || t.type}</div>
                          </div>
                        </div>
                        <div className={`text-sm font-black font-mono ${t.direction === 'debit' ? 'text-danger-text' : 'text-success-text'}`}>
                          {t.direction === 'debit' ? '+' : '-'}{money(t.amount)} ₺
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ============ LEDGER TAB ============ */
            <div id="cari-statement-print-area" className="space-y-5">

              {/* Print header */}
              <div className="hidden print:flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-border gap-4">
                <div>
                  <h1 className="text-xl font-bold">ALPHA TEKNİK DOĞALGAZ & TESİSAT</h1>
                  <p className="text-xs text-text-secondary">Batıkent Mah. Beyazıt Bulvarı No:32/1 Karaköprü / Şanlıurfa | Tel: +90 544 440 91 80</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold">CARİ HESAP EKSTRESİ</span>
                  <p className="text-xs text-text-secondary mt-1">Döküm: {new Date().toLocaleDateString('tr-TR')}</p>
                </div>
              </div>

              {/* Cari summary bar */}
              <div className="p-4 rounded-2xl bg-base-surface border border-border">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <div className="text-text-muted">Cari Kodu</div>
                    <div className="font-mono font-bold text-info-text">{cari.code}</div>
                  </div>
                  <div>
                    <div className="text-text-muted">Firma</div>
                    <div className="font-bold text-text-primary truncate">{cari.companyName}</div>
                  </div>
                  <div>
                    <div className="text-text-muted">Net Bakiye</div>
                    <div className={`font-mono font-bold ${cari.balance > 0 ? 'text-danger-text' : cari.balance < 0 ? 'text-info-text' : 'text-success-text'}`}>
                      {money(cari.balance)} ₺
                    </div>
                  </div>
                  <div>
                    <div className="text-text-muted">Toplam İşlem</div>
                    <div className="font-bold text-text-primary">{transactions.length} Adet</div>
                  </div>
                </div>
              </div>

              {/* Filter bar */}
              <div className="flex flex-wrap items-center gap-2 print:hidden">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    value={txSearch}
                    onChange={e => setTxSearch(e.target.value)}
                    placeholder="Açıklama veya evrak ara..."
                    className="pl-8 pr-3 py-1.5 rounded-lg bg-base-surface border border-border text-xs text-text-primary outline-none focus:border-info-border w-52"
                  />
                </div>
                <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-base-surface border border-border rounded-lg text-xs font-mono text-text-primary outline-none" />
                <span className="text-text-muted text-xs">—</span>
                <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-base-surface border border-border rounded-lg text-xs font-mono text-text-primary outline-none" />
                {(filterStartDate || filterEndDate || txSearch) && (
                  <button onClick={() => { setFilterStartDate(''); setFilterEndDate(''); setTxSearch(''); }}
                    className="px-2.5 py-1.5 text-xs text-text-muted hover:text-text-primary border border-border rounded-lg hover:bg-base-surface-2 cursor-pointer">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}

                <div className="ml-auto flex items-center space-x-4 text-xs font-mono text-text-secondary">
                  <span>Borç: <strong className="text-danger-text">{money(totalDebits)} ₺</strong></span>
                  <span>Tahsilat: <strong className="text-success-text">{money(totalCredits)} ₺</strong></span>
                  <span>Hareket: <strong className="text-text-primary">{filteredTxs.length}</strong></span>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="overflow-x-auto border border-border rounded-2xl shadow-sm">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-base-surface-2 border-b border-border text-text-secondary font-semibold">
                      <th className="py-3 px-3 whitespace-nowrap">Tarih</th>
                      <th className="py-3 px-3 whitespace-nowrap">Evrak No</th>
                      <th className="py-3 px-3 whitespace-nowrap">İşlem Türü</th>
                      <th className="py-3 px-3 whitespace-nowrap">Ödeme Kanalı</th>
                      <th className="py-3 px-3 min-w-[160px]">Açıklama</th>
                      <th className="py-3 px-3 text-right text-danger-text whitespace-nowrap">Borç (+)</th>
                      <th className="py-3 px-3 text-right text-success-text whitespace-nowrap">Tahsilat (−)</th>
                      <th className="py-3 px-3 text-right whitespace-nowrap">Yürüyen Bakiye</th>
                      <th className="py-3 px-3 text-center print:hidden whitespace-nowrap">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {displayTxs.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-10 text-center text-text-muted">
                          <FileText className="w-8 h-8 mx-auto opacity-30 mb-2" />
                          <p>Hareket kaydı bulunamadı.</p>
                        </td>
                      </tr>
                    ) : (
                      displayTxs.map(t => (
                        <tr key={t.id} className="hover:bg-base-surface-2/50 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-text-secondary whitespace-nowrap">{t.date}</td>
                          <td className="py-2.5 px-3 font-mono font-medium text-text-primary whitespace-nowrap">{t.documentNo || '—'}</td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${TX_TYPE_COLORS[t.type] || 'bg-base-surface-2 text-text-secondary border-border'}`}>
                              {TX_TYPE_LABELS[t.type] || t.type}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-text-secondary whitespace-nowrap text-[11px]">
                            {t.paymentMethod || 'Cari Hesap'}
                          </td>
                          <td className="py-2.5 px-3 text-text-primary">
                            <span className="line-clamp-2">{t.description}</span>
                            {t.dueDate && (
                              <span className="block text-[10px] text-text-muted mt-0.5">Vade: {t.dueDate}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-danger-text whitespace-nowrap">
                            {t.direction === 'debit' ? `${money(t.amount)} ₺` : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-success-text whitespace-nowrap">
                            {t.direction === 'credit' ? `${money(t.amount)} ₺` : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap">
                            <span className={t.runningBalance > 0 ? 'text-danger-text' : t.runningBalance < 0 ? 'text-info-text' : 'text-success-text'}>
                              {money(t.runningBalance)} ₺
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center print:hidden whitespace-nowrap">
                            <button
                              onClick={() => handleDeleteTransaction(t)}
                              className="p-1.5 rounded-lg text-text-muted hover:text-danger-text hover:bg-danger-fill/15 transition-colors cursor-pointer"
                              title="Bu hareketi sil"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Print Signature Footer */}
              <div className="pt-8 border-t border-border grid grid-cols-2 gap-8 text-center text-xs text-text-secondary hidden print:grid">
                <div>
                  <p className="font-bold text-text-primary">DÜZENLEYEN / ŞİRKET</p>
                  <p className="text-[11px] text-text-muted mt-1">ALPHA Teknik Doğalgaz & Tesisat</p>
                  <div className="h-16 mt-4 border-b border-dashed border-border" />
                  <p className="text-[10px] text-text-muted mt-1">İmza & Kaşe</p>
                </div>
                <div>
                  <p className="font-bold text-text-primary">MUTABIK KALAN / MÜŞTERİ</p>
                  <p className="text-[11px] text-text-muted mt-1">{cari.companyName}</p>
                  <div className="h-16 mt-4 border-b border-dashed border-border" />
                  <p className="text-[10px] text-text-muted mt-1">Yetkili İmza & Kaşe</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Transaction Modal */}
      {cari && (
        <CariTransactionModal
          isOpen={showTransactionModal}
          onClose={() => setShowTransactionModal(false)}
          cari={cari}
          defaultMode={txModalMode}
          onSave={handleSaveTransaction}
        />
      )}

      {/* Payment Reminder Modal */}
      {cari && (
        <PaymentReminderModal
          isOpen={showReminderModal}
          onClose={() => setShowReminderModal(false)}
          cariler={[cari]}
          initialCariId={cari.id}
        />
      )}
    </div>
  );
}
