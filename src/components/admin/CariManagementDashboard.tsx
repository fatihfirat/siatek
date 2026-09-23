import { useState, useEffect } from 'react';
import { CariAccount, CariType } from '../../types';
import { db, collection, getDocs, query, where } from '../../lib/firebase';
import {
  subscribeToCariAccounts,
  saveCariAccountToFirestore,
  updateCariAccountInFirestore,
  deleteCariAccountFromFirestore,
  saveCariTransactionToFirestore,
  incrementCariBalanceInFirestore,
  describeFirestoreReadError,
} from '../../lib/firestoreService';
import CariAccountModal from './CariAccountModal';
import CariTransactionModal, { TransactionModalMode } from './CariTransactionModal';
import CariStatementModal from './CariStatementModal';
import PaymentReminderModal from './PaymentReminderModal';
import CariFinanceWorkspace from './CariFinanceWorkspace';
import { 
  generateAllCarilerPDF, 
  generateAllCarilerExcel, 
  generateCariStatementPDF
} from '../../utils/exportUtils';
import {
  calculateCariDueStatus,
  triggerOneClickWhatsAppReminder,
  triggerOneClickEmailReminder
} from '../../utils/reminderUtils';

const normalizeSearchText = (value: unknown) => String(value ?? '')
  .toLocaleLowerCase('tr-TR')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const nextCariCode = (cariler: CariAccount[]) => {
  const highest = cariler.reduce((max, cari) => {
    const match = String(cari.code ?? '').match(/(\d+)$/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 1000);
  return `CR-${highest + 1}`;
};

interface CariManagementDashboardProps {
  onRefreshParent?: () => void;
}

export default function CariManagementDashboard({ onRefreshParent }: CariManagementDashboardProps) {
  const [cariler, setCariler] = useState<CariAccount[]>([]);
  const [summary, setSummary] = useState({
    totalCount: 0,
    customerCount: 0,
    dealerCount: 0,
    supplierCount: 0,
    totalReceivables: 0,
    totalPayables: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | CariType>('all');
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'debtors' | 'overdue' | 'approaching' | 'creditors' | 'zero' | 'overlimit'>('all');
  const [activeView, setActiveView] = useState<'list' | 'calendar'>('list');

  // Modals state
  const [selectedCariForEdit, setSelectedCariForEdit] = useState<CariAccount | null>(null);
  const [showAccountModal, setShowAccountModal] = useState(false);

  const [selectedCariForTx, setSelectedCariForTx] = useState<CariAccount | null>(null);
  const [txModalMode, setTxModalMode] = useState<TransactionModalMode>('payment');
  const [showTxModal, setShowTxModal] = useState(false);

  const [selectedCariForStatementId, setSelectedCariForStatementId] = useState<string | null>(null);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [selectedCariForReminderId, setSelectedCariForReminderId] = useState<string | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    const openCreate = () => { setSelectedCariForEdit(null); setShowAccountModal(true); };
    document.addEventListener('siatek:open-cari-create', openCreate);
    return () => document.removeEventListener('siatek:open-cari-create', openCreate);
  }, []);

  // Firestore canli aboneligi. Eskiden fetch('/api/cariler') kullaniliyordu;
  // sunucu olmadigi icin o istek index.html dondurup sessizce bos liste
  // birakiyordu (bkz. firestoreService.ts icindeki aciklama).
  useEffect(() => {
    if (!openMenuId) return;
    const handleOutside = (e: MouseEvent) => {
      const el = document.getElementById(`cari-menu-${openMenuId}`);
      if (el && !el.contains(e.target as Node)) setOpenMenuId(null);
    };
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenMenuId(null); };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [openMenuId]);

  useEffect(() => {
    setIsLoading(true);
    setLoadError(null);
    const unsub = subscribeToCariAccounts((list) => {
      setCariler(list);
      setSummary({
        totalCount: list.length,
        customerCount: list.filter(c => c.type === 'customer').length,
        dealerCount: list.filter(c => c.type === 'dealer').length,
        supplierCount: list.filter(c => c.type === 'supplier').length,
        totalReceivables: list.reduce((t, c) => t + (c.balance > 0 ? c.balance : 0), 0),
        totalPayables: list.reduce((t, c) => t + (c.balance < 0 ? -c.balance : 0), 0),
      });
      setIsLoading(false);
      setLoadError(null);
    }, { uid: null, isAdmin: true }, (error) => {
      setLoadError(describeFirestoreReadError(error));
      setIsLoading(false);
    });
    return unsub;
  }, [refreshVersion]);

  const handleCreateOrUpdateCari = async (cariData: Partial<CariAccount>) => {
    try {
      if (selectedCariForEdit) {
        await updateCariAccountInFirestore(selectedCariForEdit.id, cariData);
      } else {
        const now = new Date().toISOString();
        const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? `cari_${crypto.randomUUID()}`
          : `cari_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        const opening = Number((cariData as any).openingBalance) || 0;
        await saveCariAccountToFirestore({
          ...(cariData as any),
          id,
          code: (cariData as any).code || nextCariCode(cariler),
          balance: opening,
          totalDebit: opening > 0 ? opening : 0,
          totalCredit: opening < 0 ? -opening : 0,
          createdAt: now,
          updatedAt: now,
        } as CariAccount);
      }
      // Liste onSnapshot ile kendiliginden tazelenir.
      setToastMessage(selectedCariForEdit ? 'Cari kartı güncellendi.' : 'Yeni cari kartı oluşturuldu.');
      window.setTimeout(() => setToastMessage(null), 3500);
      if (onRefreshParent) onRefreshParent();
    } catch (e) {
      console.error('Cari kaydedilemedi:', e);
      throw e;
    }
  };

  const handleDeleteCari = async (cari: CariAccount) => {
    if (!confirm(`"${cari.companyName}" (${cari.code}) cari hesabını silmek istediğinize emin misiniz?`)) return;

    try {
      await deleteCariAccountFromFirestore(cari.id);
      if (onRefreshParent) onRefreshParent();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveTransaction = async (data: any) => {
    if (!selectedCariForTx) return;

    try {
      const now = new Date().toISOString();
      const txId = `caritx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const tutar = Number(data?.amount) || 0;
      // Tahsilat / iade / ödeme → credit, fatura / borç → debit
      const isCredit = data?.type === 'payment_received' || data?.type === 'return_credit' || data?.type === 'payment_made' || data?.direction === 'credit';
      const direction: 'debit' | 'credit' = isCredit ? 'credit' : 'debit';

      await saveCariTransactionToFirestore({
        ...(data as any),
        id: txId,
        cariId: selectedCariForTx.id,
        direction,
        createdAt: now,
        updatedAt: now,
      } as any);

      // Atomic increment — race condition yok
      await incrementCariBalanceInFirestore(selectedCariForTx.id, tutar, direction, {
        lastTransactionDate: now,
        lastTransactionDesc: data?.description || (isCredit ? 'Tahsilat' : 'Borç'),
      });

      if (onRefreshParent) onRefreshParent();
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  // Open transaction modal for specific mode
  const handleOpenTransactionModal = (cari: CariAccount, mode: TransactionModalMode) => {
    setSelectedCariForTx(cari);
    setTxModalMode(mode);
    setShowTxModal(true);
  };

  // Quick Direct PDF statement generation for a single cari
  const handleQuickSingleCariPDF = async (cari: CariAccount) => {
    try {
      // Hareketleri Firestore'dan cek (eskiden olu /api/cariler/:id yolundan
      // okunuyordu ve PDF her zaman bos ciktiyla uretiliyordu).
      const snap = await getDocs(
        query(collection(db, 'cari_transactions'), where('cariId', '==', cari.id))
      );
      const islemler: any[] = [];
      snap.forEach(d => islemler.push({ id: d.id, ...d.data() }));
      islemler.sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
      await generateCariStatementPDF(cari as any, islemler);
    } catch (e) {
      console.error('Ekstre indirilirken hata:', e);
    }
  };

  // 1-Click WhatsApp Trigger
  const handleFastWhatsApp = (cari: CariAccount) => {
    triggerOneClickWhatsAppReminder(cari);
    setToastMessage(`"${cari.companyName}" için WhatsApp hatırlatması açıldı.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1-Click Email Trigger
  const handleFastEmail = (cari: CariAccount) => {
    triggerOneClickEmailReminder(cari);
    setToastMessage(`"${cari.companyName}" için E-Posta hatırlatması hazırlandı.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filter Cariler list
  const filteredCariler = cariler.filter(c => {
    // Search
    if (searchQuery.trim()) {
      const q = normalizeSearchText(searchQuery);
      const searchable = normalizeSearchText([
        c.code,
        c.companyName,
        c.name,
        c.city,
        c.phone,
        c.email,
        c.taxNumber,
        c.taxOffice,
      ].join(' '));
      const match = searchable.includes(q);
      if (!match) return false;
    }

    // Type Filter
    if (typeFilter !== 'all' && c.type !== typeFilter) {
      return false;
    }

    const dueInfo = calculateCariDueStatus(c);

    // Balance Filter
    if (balanceFilter === 'debtors' && c.balance <= 0) return false;
    if (balanceFilter === 'overdue' && (c.balance <= 0 || !dueInfo.isOverdue)) return false;
    if (balanceFilter === 'approaching' && (c.balance <= 0 || !dueInfo.isApproaching)) return false;
    if (balanceFilter === 'creditors' && c.balance >= 0) return false;
    if (balanceFilter === 'zero' && c.balance !== 0) return false;
    if (balanceFilter === 'overlimit' && c.balance <= c.creditLimit) return false;

    return true;
  });

  // Global PDF Export of All Cariler
  const handleExportAllPDF = async () => {
    setIsExportingPDF(true);
    try {
      await generateAllCarilerPDF(filteredCariler);
    } catch (e) {
      console.error('PDF oluşturulurken hata:', e);
    } finally {
      setTimeout(() => setIsExportingPDF(false), 500);
    }
  };

  // Global Excel Export of All Cariler
  const handleExportAllExcel = () => {
    setIsExportingExcel(true);
    try {
      generateAllCarilerExcel(filteredCariler);
    } catch (e) {
      console.error('Excel oluşturulurken hata:', e);
    } finally {
      setTimeout(() => setIsExportingExcel(false), 500);
    }
  };

  // Export all Cariler to CSV
  const handleExportAllCSV = () => {
    const headers = ['Cari Kodu', 'Firma Ünvanı', 'Yetkili', 'Cari Türü', 'Telefon', 'Şehir', 'Kredi Limiti (₺)', 'Toplam Borçlandırılan (₺)', 'Toplam Tahsil Edilen (₺)', 'Güncel Net Bakiye (₺)', 'Durum'];
    const rows = filteredCariler.map(c => [
      c.code,
      `"${c.companyName.replace(/"/g, '""')}"`,
      `"${c.name.replace(/"/g, '""')}"`,
      c.type,
      c.phone || '-',
      c.city || '-',
      c.creditLimit.toString(),
      c.totalDebit.toString(),
      c.totalCredit.toString(),
      c.balance.toString(),
      c.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Cari_Hesap_Listesi_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const overdueCariler = cariler.filter(c => c.balance > 0 && calculateCariDueStatus(c).isOverdue);
  const approachingCariler = cariler.filter(c => c.balance > 0 && calculateCariDueStatus(c).isApproaching);
  const overLimitCount = cariler.filter(c => c.creditLimit > 0 && c.balance > c.creditLimit).length;


  const handleRefresh = () => {
    setRefreshVersion(version => version + 1);
    onRefreshParent?.();
  };

  return (
    <>
      <CariFinanceWorkspace
        cariler={cariler}
        filteredCariler={filteredCariler}
        summary={summary}
        isLoading={isLoading}
        loadError={loadError}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        balanceFilter={balanceFilter}
        setBalanceFilter={setBalanceFilter}
        activeView={activeView}
        setActiveView={setActiveView}
        openMenuId={openMenuId}
        setOpenMenuId={setOpenMenuId}
        overdueCariler={overdueCariler}
        approachingCariler={approachingCariler}
        overLimitCount={overLimitCount}
        isExportingPDF={isExportingPDF}
        isExportingExcel={isExportingExcel}
        toastMessage={toastMessage}
        onRefresh={handleRefresh}
        onCreate={() => {
          setSelectedCariForEdit(null);
          setShowAccountModal(true);
        }}
        onEdit={(cari) => {
          setSelectedCariForEdit(cari);
          setShowAccountModal(true);
        }}
        onDelete={handleDeleteCari}
        onOpenTransaction={handleOpenTransactionModal}
        onOpenStatement={(cari) => setSelectedCariForStatementId(cari.id)}
        onDownloadStatement={handleQuickSingleCariPDF}
        onWhatsApp={handleFastWhatsApp}
        onEmail={handleFastEmail}
        onOpenReminder={(cariId) => {
          setSelectedCariForReminderId(cariId || null);
          setShowReminderModal(true);
        }}
        onExportPDF={handleExportAllPDF}
        onExportExcel={handleExportAllExcel}
        onExportCSV={handleExportAllCSV}
      />

      <CariAccountModal
        isOpen={showAccountModal}
        onClose={() => {
          setShowAccountModal(false);
          setSelectedCariForEdit(null);
        }}
        cari={selectedCariForEdit}
        onSave={handleCreateOrUpdateCari}
      />

      {selectedCariForTx && (
        <CariTransactionModal
          isOpen={showTxModal}
          onClose={() => {
            setShowTxModal(false);
            setSelectedCariForTx(null);
          }}
          cari={selectedCariForTx}
          defaultMode={txModalMode}
          onSave={handleSaveTransaction}
        />
      )}

      {selectedCariForStatementId && (
        <CariStatementModal
          isOpen={!!selectedCariForStatementId}
          onClose={() => setSelectedCariForStatementId(null)}
          cariId={selectedCariForStatementId}
          onRefreshCariList={handleRefresh}
        />
      )}

      <PaymentReminderModal
        isOpen={showReminderModal}
        onClose={() => {
          setShowReminderModal(false);
          setSelectedCariForReminderId(null);
        }}
        cariler={cariler}
        initialCariId={selectedCariForReminderId}
      />
    </>
  );
}
