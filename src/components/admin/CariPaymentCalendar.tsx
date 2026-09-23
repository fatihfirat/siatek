import { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ArrowDownRight, 
  ArrowUpRight, 
  Search, 
  MessageCircle, 
  Mail, 
  CreditCard, 
  RefreshCw, 
  FileText, 
  Sparkles, 
  X, 
  CalendarDays, 
  Building2, 
  Phone, 
  Edit2,
  List,
  Grid,
  Check,
  Download
} from 'lucide-react';
import { CariAccount, CariTransaction } from '../../types';
import { formatTRY } from '../../utils/exportUtils';
import { OFFICIAL_BANK_INFO } from '../../utils/reminderUtils';
import { openWhatsAppShare, formatWhatsAppPhone } from '../../utils/shareUtils';
import { useModalBehavior } from '../../hooks/useModalBehavior';

export interface CalendarTransaction extends CariTransaction {
  cariName?: string;
  cariCompanyName?: string;
  cariCode?: string;
  cariType?: 'customer' | 'dealer' | 'supplier';
  cariPhone?: string;
  cariEmail?: string;
  cariCity?: string;
  cariBalance?: number;
  paymentTermDays?: number;
}

interface CariPaymentCalendarProps {
  cariler: CariAccount[];
  onRefreshParent?: () => void;
  onOpenTransactionModal?: (cari: CariAccount, mode: 'payment' | 'debt' | 'adjust', defaultAmount?: number, defaultDocNo?: string) => void;
  onSelectCariStatement?: (cari: CariAccount) => void;
}

type FilterType = 'all' | 'receivables' | 'payables' | 'overdue' | 'approaching';

export interface ProcessedCalendarItem extends CalendarTransaction {
  effectiveDueDate: string;
  isOverdue: boolean;
  isApproaching: boolean;
  isDueToday: boolean;
  diffDays: number;
  kind: 'receivable' | 'payable';
}

const TURKISH_MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

const TURKISH_DAYS_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const TURKISH_DAYS_FULL = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

export default function CariPaymentCalendar({
  cariler = [],
  onRefreshParent,
  onOpenTransactionModal,
  onSelectCariStatement,
}: CariPaymentCalendarProps) {
  // Calendar month state
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    // Default to September 2026 if today is in 2026, or actual today
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [transactions, setTransactions] = useState<CalendarTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterType>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'agenda'>('grid');
  const [editingDueDateTx, setEditingDueDateTx] = useState<CalendarTransaction | null>(null);
  const [newDueDateInput, setNewDueDateInput] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useModalBehavior(!!editingDueDateTx, () => setEditingDueDateTx(null));

  // Fetch all transactions
  const fetchAllTransactions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/cariler-transactions/all');
      const data = await res.json();
      if (data.success && Array.isArray(data.transactions)) {
        setTransactions(data.transactions);
      }
    } catch (e) {
      console.error('Cari işlemleri yüklenirken hata:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllTransactions();
  }, []);

  const todayStr = useMemo(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

  // Compute effective due dates for all transactions
  const processedPayments = useMemo(() => {
    const list: Array<CalendarTransaction & {
      effectiveDueDate: string;
      isOverdue: boolean;
      isApproaching: boolean;
      isDueToday: boolean;
      diffDays: number;
      kind: 'receivable' | 'payable';
    }> = [];

    const carilerMap = new Map(cariler.map(c => [c.id, c]));

    transactions.forEach(tx => {
      // Find related cari
      const cari = carilerMap.get(tx.cariId);
      
      // Determine due date
      let effectiveDueDate = tx.dueDate;
      if (!effectiveDueDate) {
        // If invoice without explicit dueDate, calculate using cari's paymentTermDays
        if (tx.type === 'sale_invoice' || tx.type === 'supplier_invoice') {
          const baseDate = new Date(tx.date || tx.createdAt || Date.now());
          const term = cari?.paymentTermDays || 30;
          const calcDue = new Date(baseDate.getTime() + term * 24 * 60 * 60 * 1000);
          effectiveDueDate = calcDue.toISOString().split('T')[0];
        }
      }

      if (!effectiveDueDate) return;

      const isSupplier = cari?.type === 'supplier' || tx.type === 'supplier_invoice';
      const kind: 'receivable' | 'payable' = isSupplier ? 'payable' : 'receivable';

      // Compare with today
      const todayTime = new Date(todayStr).getTime();
      const dueTime = new Date(effectiveDueDate).getTime();
      const diffDays = Math.round((todayTime - dueTime) / (1000 * 60 * 60 * 24));
      
      const isOverdue = diffDays > 0;
      const isDueToday = diffDays === 0;
      const isApproaching = diffDays < 0 && Math.abs(diffDays) <= 7;

      list.push({
        ...tx,
        cariName: cari?.name || tx.cariName || 'Bilinmeyen Cari',
        cariCompanyName: cari?.companyName || tx.cariCompanyName || 'Cari Hesap',
        cariCode: cari?.code || tx.cariCode || '',
        cariType: cari?.type || tx.cariType || 'customer',
        cariPhone: cari?.phone || tx.cariPhone || '',
        cariEmail: cari?.email || tx.cariEmail || '',
        cariCity: cari?.city || tx.cariCity || '',
        cariBalance: cari?.balance ?? tx.cariBalance ?? 0,
        paymentTermDays: cari?.paymentTermDays || tx.paymentTermDays || 30,
        effectiveDueDate,
        isOverdue,
        isApproaching,
        isDueToday,
        diffDays,
        kind,
      });
    });

    return list;
  }, [transactions, cariler, todayStr]);

  // Filtered payments based on search and status
  const filteredPayments = useMemo(() => {
    return processedPayments.filter(item => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match = 
          item.cariCompanyName.toLowerCase().includes(q) ||
          item.cariCode.toLowerCase().includes(q) ||
          (item.documentNo && item.documentNo.toLowerCase().includes(q)) ||
          item.description.toLowerCase().includes(q) ||
          (item.cariPhone && item.cariPhone.includes(q));
        if (!match) return false;
      }

      // Status
      if (statusFilter === 'receivables' && item.kind !== 'receivable') return false;
      if (statusFilter === 'payables' && item.kind !== 'payable') return false;
      if (statusFilter === 'overdue' && !item.isOverdue) return false;
      if (statusFilter === 'approaching' && !item.isApproaching && !item.isDueToday) return false;

      return true;
    });
  }, [processedPayments, searchQuery, statusFilter]);

  // Payments grouped by date string (YYYY-MM-DD)
  const paymentsByDate = useMemo(() => {
    const map = new Map<string, typeof filteredPayments>();
    filteredPayments.forEach(p => {
      const existing = map.get(p.effectiveDueDate) || [];
      existing.push(p);
      map.set(p.effectiveDueDate, existing);
    });
    return map;
  }, [filteredPayments]);

  // Current Month Statistics
  const currentMonthStats = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth(); // 0-indexed

    let totalMonthReceivable = 0;
    let totalMonthPayable = 0;
    let totalOverdueAll = 0;
    let overdueCount = 0;
    let approachingCount = 0;

    processedPayments.forEach(p => {
      const pDate = new Date(p.effectiveDueDate);
      const isThisMonth = pDate.getFullYear() === year && pDate.getMonth() === month;

      if (isThisMonth) {
        if (p.kind === 'receivable') {
          totalMonthReceivable += p.amount;
        } else {
          totalMonthPayable += p.amount;
        }

        if (p.isApproaching || p.isDueToday) {
          approachingCount++;
        }
      }

      if (p.isOverdue) {
        totalOverdueAll += p.amount;
        overdueCount++;
      }
    });

    const netCashFlow = totalMonthReceivable - totalMonthPayable;

    return {
      totalMonthReceivable,
      totalMonthPayable,
      totalOverdueAll,
      netCashFlow,
      overdueCount,
      approachingCount,
    };
  }, [processedPayments, currentDate]);

  // Calendar Grid Cells Generation
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // First day of current month
    const firstDay = new Date(year, month, 1);
    // Number of days in current month
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Day of week for 1st day (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    // Convert to Monday = 0, ..., Sunday = 6
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    // Previous month days count
    const prevMonthDaysCount = new Date(year, month, 0).getDate();

    const days: Array<{
      date: Date;
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      items: typeof filteredPayments;
      receivableSum: number;
      payableSum: number;
      overdueSum: number;
      hasOverdue: boolean;
      hasApproaching: boolean;
    }> = [];

    // Pad leading days from previous month
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthDaysCount - i;
      const d = new Date(year, month - 1, dayNum);
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const items = paymentsByDate.get(dStr) || [];
      const receivableSum = items.filter(x => x.kind === 'receivable').reduce((s, x) => s + x.amount, 0);
      const payableSum = items.filter(x => x.kind === 'payable').reduce((s, x) => s + x.amount, 0);
      const overdueSum = items.filter(x => x.isOverdue).reduce((s, x) => s + x.amount, 0);

      days.push({
        date: d,
        dateStr: dStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
        isSelected: dStr === selectedDateStr,
        items,
        receivableSum,
        payableSum,
        overdueSum,
        hasOverdue: items.some(x => x.isOverdue),
        hasApproaching: items.some(x => x.isApproaching || x.isDueToday),
      });
    }

    // Days of current month
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const d = new Date(year, month, dayNum);
      const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const items = paymentsByDate.get(dStr) || [];
      const receivableSum = items.filter(x => x.kind === 'receivable').reduce((s, x) => s + x.amount, 0);
      const payableSum = items.filter(x => x.kind === 'payable').reduce((s, x) => s + x.amount, 0);
      const overdueSum = items.filter(x => x.isOverdue).reduce((s, x) => s + x.amount, 0);

      days.push({
        date: d,
        dateStr: dStr,
        dayNumber: dayNum,
        isCurrentMonth: true,
        isToday: dStr === todayStr,
        isSelected: dStr === selectedDateStr,
        items,
        receivableSum,
        payableSum,
        overdueSum,
        hasOverdue: items.some(x => x.isOverdue),
        hasApproaching: items.some(x => x.isApproaching || x.isDueToday),
      });
    }

    // Pad trailing days to reach full grid (multiples of 7, e.g. 35 or 42)
    const remainingSlots = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remainingSlots; i++) {
      const d = new Date(year, month + 1, i);
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const items = paymentsByDate.get(dStr) || [];
      const receivableSum = items.filter(x => x.kind === 'receivable').reduce((s, x) => s + x.amount, 0);
      const payableSum = items.filter(x => x.kind === 'payable').reduce((s, x) => s + x.amount, 0);
      const overdueSum = items.filter(x => x.isOverdue).reduce((s, x) => s + x.amount, 0);

      days.push({
        date: d,
        dateStr: dStr,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
        isSelected: dStr === selectedDateStr,
        items,
        receivableSum,
        payableSum,
        overdueSum,
        hasOverdue: items.some(x => x.isOverdue),
        hasApproaching: items.some(x => x.isApproaching || x.isDueToday),
      });
    }

    return days;
  }, [currentDate, paymentsByDate, todayStr, selectedDateStr, filteredPayments]);

  // Selected Day Items
  const selectedDayItems = useMemo(() => {
    if (!selectedDateStr) return [];
    return paymentsByDate.get(selectedDateStr) || [];
  }, [selectedDateStr, paymentsByDate]);

  // Handlers for month navigation
  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleJumpToToday = () => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDateStr(todayStr);
  };

  // 1-Click WhatsApp Reminder for Calendar Item
  const handleSendWhatsAppReminder = (item: ProcessedCalendarItem) => {
    const formattedAmount = formatTRY(item.amount);
    const docInfo = item.documentNo ? ` (${item.documentNo} nolu işlem)` : '';

    let urgencyText = item.isOverdue
      ? `*${item.diffDays} GÜN GECİKMEDE* olan`
      : item.isDueToday
      ? `*BUGÜN VADESİ DOLAN*`
      : `vadesi *${item.effectiveDueDate}* olan`;

    const text = `Sayın *${item.cariName || 'Yetkili'}* (${item.cariCompanyName}),\n\n` +
      `Alpha Teknik Doğalgaz & Sıhhi Tesisat Sistemleri Muhasebe ve Finans Departmanı'ndan hatırlatmadır.\n\n` +
      `Cari hesabınızda kayıtlı ${docInfo} ${urgencyText} *${formattedAmount}* tutarındaki ödemenizi önemle rica ederiz.\n\n` +
      `🏦 *Banka Hesap Bilgilerimiz:*\n` +
      `• *Banka:* ${OFFICIAL_BANK_INFO.name}\n` +
      `• *IBAN:* \`${OFFICIAL_BANK_INFO.iban}\`\n` +
      `• *Alıcı:* ${OFFICIAL_BANK_INFO.accountName}\n\n` +
      `Ödeme dekontunu bu hat üzerinden iletmenizi rica eder, hayırlı işler dileriz.`;

    openWhatsAppShare({
      phone: item.cariPhone,
      message: text,
    });
    
    setToastMessage(`"${item.cariCompanyName}" için WhatsApp hatırlatma taslağı hazırlandı.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1-Click Email Reminder
  const handleSendEmailReminder = (item: ProcessedCalendarItem) => {
    const subject = encodeURIComponent(`Ödeme & Vade Hatırlatması - ${item.cariCompanyName} - ${item.documentNo || 'Cari Hesap'}`);
    const formattedAmount = formatTRY(item.amount);
    const body = encodeURIComponent(
      `Sayın ${item.cariName || 'Yetkili'},\n\n` +
      `Alpha Teknik Doğalgaz & Sıhhi Tesisat Sistemleri cari hesabınızdaki ${item.documentNo || ''} nolu işlem için ` +
      `${formattedAmount} tutarındaki ödeme vadesi ${item.isOverdue ? `${item.diffDays} gün önce dolmuştur` : `yaklaşmaktadır`}.\n\n` +
      `Resmi Banka Bilgilerimiz:\n` +
      `Banka: ${OFFICIAL_BANK_INFO.name}\n` +
      `IBAN: ${OFFICIAL_BANK_INFO.iban}\n` +
      `Hesap Sahibi: ${OFFICIAL_BANK_INFO.accountName}\n\n` +
      `Ödeme sonrası dekont iletmenizi rica eder, iyi çalışmalar dileriz.\n\n` +
      `Alpha Teknik Doğalgaz & Sıhhi Tesisat Ltd. Şti.`
    );
    const mailto = `mailto:${item.cariEmail || ''}?subject=${subject}&body=${body}`;
    try {
      const a = document.createElement('a');
      a.href = mailto;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      window.location.href = mailto;
    }
  };

  // Save modified due date
  const handleSaveUpdatedDueDate = async () => {
    if (!editingDueDateTx || !newDueDateInput) return;

    try {
      const res = await fetch(`/api/cariler/${editingDueDateTx.cariId}/transactions/${editingDueDateTx.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dueDate: newDueDateInput }),
      });
      if (res.ok) {
        setToastMessage(`Vade tarihi başarıyla ${newDueDateInput} olarak güncellendi.`);
        setTimeout(() => setToastMessage(null), 3500);
        setEditingDueDateTx(null);
        await fetchAllTransactions();
        if (onRefreshParent) onRefreshParent();
      } else {
        throw new Error('Vade güncellenemedi.');
      }
    } catch (e) {
      console.error(e);
      alert('Vade tarihi güncellenirken bir sorun oluştu.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Critical Overdue Warning Banner */}
      {currentMonthStats.overdueCount > 0 && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-danger-fill/15 border border-danger-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-danger-fill text-base flex items-center justify-center shrink-0 animate-pulse">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-danger-text flex items-center space-x-2">
                <span>Vadesi Geçmiş & Gecikmede Olan Ödemeler Tespit Edildi!</span>
                <span className="px-2 py-0.5 rounded-full bg-danger-fill text-white text-[10px] font-mono font-bold">
                  {currentMonthStats.overdueCount} İşlem
                </span>
              </h4>
              <p className="text-xs text-text-secondary mt-0.5">
                Toplam <strong className="text-danger-text font-mono">{formatTRY(currentMonthStats.totalOverdueAll)}</strong> tutarında ödemenin vadesi aşılmıştır. Tek tıkla WhatsApp veya E-Posta hatırlatması iletebilirsiniz.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto shrink-0">
            <button
              onClick={() => setStatusFilter('overdue')}
              className="px-3.5 py-2 rounded-xl bg-danger-fill text-white hover:opacity-90 text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Gecikenleri Filtrele</span>
            </button>
          </div>
        </div>
      )}

      {/* TOP SUMMARY STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Toplam Vadesi Gelen Alacak (Müşteri Tahsilat) */}
        <div className="p-4 rounded-2xl bg-base-surface border border-border flex items-center space-x-3.5 shadow-2xs">
          <div className="p-3 rounded-xl bg-success-fill/15 text-success-text border border-success-border shrink-0">
            <ArrowDownRight className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs text-text-secondary font-medium block">
              {TURKISH_MONTHS[currentDate.getMonth()]} Alacak Vadesi
            </span>
            <div className="text-xl font-black text-success-text font-mono mt-0.5 truncate">
              {formatTRY(currentMonthStats.totalMonthReceivable)}
            </div>
            <span className="text-[10px] text-text-muted mt-0.5 block">
              Müşteri & Bayi Tahsilat Vadeleri
            </span>
          </div>
        </div>

        {/* Toplam Vadesi Gelen Tedarikçi Borcu (Ödeme) */}
        <div className="p-4 rounded-2xl bg-base-surface border border-border flex items-center space-x-3.5 shadow-2xs">
          <div className="p-3 rounded-xl bg-warning-fill/15 text-warning-text border border-warning-border shrink-0">
            <ArrowUpRight className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs text-text-secondary font-medium block">
              {TURKISH_MONTHS[currentDate.getMonth()]} Tedarikçi Vadesi
            </span>
            <div className="text-xl font-black text-warning-text font-mono mt-0.5 truncate">
              {formatTRY(currentMonthStats.totalMonthPayable)}
            </div>
            <span className="text-[10px] text-text-muted mt-0.5 block">
              Üretici & Fabrika Ödemeleri
            </span>
          </div>
        </div>

        {/* Net Nakit Akışı Beklentisi */}
        <div className="p-4 rounded-2xl bg-base-surface border border-border flex items-center space-x-3.5 shadow-2xs">
          <div className={`p-3 rounded-xl border shrink-0 ${
            currentMonthStats.netCashFlow >= 0 
              ? 'bg-info-fill/15 text-info-text border-info-border' 
              : 'bg-danger-fill/15 text-danger-text border-danger-border'
          }`}>
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs text-text-secondary font-medium block">
              Net Beklenen Nakit Akışı
            </span>
            <div className={`text-xl font-black font-mono mt-0.5 truncate ${
              currentMonthStats.netCashFlow >= 0 ? 'text-info-text' : 'text-danger-text'
            }`}>
              {currentMonthStats.netCashFlow >= 0 ? '+' : ''}{formatTRY(currentMonthStats.netCashFlow)}
            </div>
            <span className="text-[10px] text-text-muted mt-0.5 block">
              Alacak - Tedarikçi Ödeme Farkı
            </span>
          </div>
        </div>

        {/* Toplam Geciken Borç */}
        <div className="p-4 rounded-2xl bg-base-surface border border-border flex items-center space-x-3.5 shadow-2xs">
          <div className="p-3 rounded-xl bg-danger-fill/15 text-danger-text border border-danger-border shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs text-text-secondary font-medium block">
              Kritik Gecikmede Olan Tutar
            </span>
            <div className="text-xl font-black text-danger-text font-mono mt-0.5 truncate">
              {formatTRY(currentMonthStats.totalOverdueAll)}
            </div>
            <span className="text-[10px] text-text-muted mt-0.5 block">
              {currentMonthStats.overdueCount} Adet İşlem Gecikmede
            </span>
          </div>
        </div>
      </div>

      {/* MAIN CALENDAR CONTAINER */}
      <div className="bg-base-surface border border-border rounded-3xl overflow-hidden shadow-sm">
        
        {/* Navigation & Controls Bar */}
        <div className="p-4 sm:p-5 border-b border-border bg-base-surface-2 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Month / Year Navigator */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center bg-base-surface border border-border rounded-2xl p-1 shadow-2xs">
              <button
                onClick={handlePrevMonth}
                className="p-2 rounded-xl hover:bg-base-surface-2 text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                title="Önceki Ay"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="px-4 py-1 flex items-center space-x-2">
                <CalendarIcon className="w-4 h-4 text-info-text" />
                <span className="text-base font-extrabold text-text-primary tracking-tight">
                  {TURKISH_MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                </span>
              </div>

              <button
                onClick={handleNextMonth}
                className="p-2 rounded-xl hover:bg-base-surface-2 text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                title="Sonraki Ay"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Today Jump */}
            <button
              onClick={handleJumpToToday}
              className="px-3.5 py-2 rounded-xl bg-base-surface hover:bg-base-surface-2 border border-border text-xs font-bold text-text-primary transition-colors cursor-pointer shadow-2xs"
            >
              Bugün
            </button>

            {/* Reload Data Button */}
            <button
              onClick={fetchAllTransactions}
              disabled={isLoading}
              className="p-2 rounded-xl bg-base-surface hover:bg-base-surface-2 border border-border text-text-secondary hover:text-text-primary transition-colors cursor-pointer shadow-2xs"
              title="Verileri Yenile"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Filter Pills & View Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative min-w-[180px] sm:min-w-[220px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari adı, kod, evrak no..."
                className="w-full pl-8.5 pr-3 py-1.5 bg-base-surface border border-border rounded-xl text-xs text-text-primary placeholder:text-text-muted focus:border-border-strong shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Status Filter Buttons */}
            <div className="flex items-center bg-base-surface border border-border rounded-xl p-0.5 shadow-2xs text-xs overflow-x-auto">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === 'all'
                    ? 'bg-base-surface-2 text-text-primary shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Tümü ({processedPayments.length})
              </button>

              <button
                onClick={() => setStatusFilter('receivables')}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1 ${
                  statusFilter === 'receivables'
                    ? 'bg-success-fill/20 text-success-text shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-success-fill" />
                <span>Alacaklar</span>
              </button>

              <button
                onClick={() => setStatusFilter('payables')}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1 ${
                  statusFilter === 'payables'
                    ? 'bg-warning-fill/20 text-warning-text shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-warning-fill" />
                <span>Borçlar</span>
              </button>

              <button
                onClick={() => setStatusFilter('overdue')}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1 ${
                  statusFilter === 'overdue'
                    ? 'bg-danger-fill/20 text-danger-text shadow-xs font-black'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-danger-fill animate-pulse" />
                <span>🚨 Gecikenler ({currentMonthStats.overdueCount})</span>
              </button>

              <button
                onClick={() => setStatusFilter('approaching')}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1 ${
                  statusFilter === 'approaching'
                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Yaklaşanlar</span>
              </button>
            </div>

            {/* View Mode Switcher (Grid vs Agenda) */}
            <div className="flex items-center bg-base-surface border border-border rounded-xl p-0.5 shadow-2xs">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-base-surface-2 text-text-primary shadow-xs' : 'text-text-muted hover:text-text-primary'
                }`}
                title="Aylık Takvim Izgarası"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('agenda')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'agenda' ? 'bg-base-surface-2 text-text-primary shadow-xs' : 'text-text-muted hover:text-text-primary'
                }`}
                title="Günlük Vade Ajandası"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>

        {/* CALENDAR BODY */}
        {viewMode === 'grid' ? (
          <div>
            {/* Weekday Names Header */}
            <div className="grid grid-cols-7 border-b border-border bg-base-surface text-center">
              {TURKISH_DAYS_FULL.map((dayName, idx) => {
                const isWeekend = idx >= 5;
                return (
                  <div 
                    key={dayName} 
                    className={`py-2.5 text-xs font-bold border-r border-border last:border-r-0 ${
                      isWeekend ? 'text-text-muted bg-base-surface-2/40' : 'text-text-secondary'
                    }`}
                  >
                    <span className="hidden sm:inline">{dayName}</span>
                    <span className="sm:hidden">{TURKISH_DAYS_SHORT[idx]}</span>
                  </div>
                );
              })}
            </div>

            {/* Day Grid Cells */}
            <div className="grid grid-cols-7 auto-rows-fr divide-y divide-border border-b border-border">
              {calendarDays.map((day, idx) => {
                const isWeekend = idx % 7 >= 5;
                const isSelected = day.isSelected;
                const isToday = day.isToday;
                const hasItems = day.items.length > 0;

                return (
                  <div
                    key={`${day.dateStr}-${idx}`}
                    onClick={() => setSelectedDateStr(day.dateStr)}
                    className={`min-h-[96px] sm:min-h-[110px] p-1.5 sm:p-2 border-r border-border last:border-r-0 transition-all cursor-pointer relative flex flex-col justify-between select-none ${
                      !day.isCurrentMonth
                        ? 'bg-base-surface-2/20 text-text-muted/60 opacity-60'
                        : isWeekend
                        ? 'bg-base-surface-2/30'
                        : 'bg-base-surface'
                    } ${
                      isSelected
                        ? 'ring-2 ring-info-border bg-info-fill/10 z-10'
                        : 'hover:bg-base-surface-2/60'
                    }`}
                  >
                    {/* Top Row: Day Number & Mini Indicators */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold ${
                          isToday
                            ? 'bg-info-fill text-white shadow-xs'
                            : isSelected
                            ? 'text-info-text font-black'
                            : day.isCurrentMonth
                            ? 'text-text-primary'
                            : 'text-text-muted'
                        }`}
                      >
                        {day.dayNumber}
                      </span>

                      {/* Overdue Alert Indicator Icon */}
                      {day.hasOverdue && (
                        <span className="flex items-center text-[10px] font-bold text-danger-text bg-danger-fill/15 px-1 py-0.5 rounded border border-danger-border animate-pulse">
                          <AlertTriangle className="w-2.5 h-2.5 mr-0.5 shrink-0" />
                          <span>Geciken</span>
                        </span>
                      )}
                    </div>

                    {/* Middle: Total Badges & Chips */}
                    <div className="space-y-1 my-1">
                      {/* Receivable Sum Badge */}
                      {day.receivableSum > 0 && (
                        <div className="px-1.5 py-0.5 rounded bg-success-fill/15 text-success-text border border-success-border/50 text-[10px] font-mono font-bold truncate flex items-center justify-between">
                          <span className="truncate">+Alacak:</span>
                          <span className="shrink-0">{formatTRY(day.receivableSum)}</span>
                        </div>
                      )}

                      {/* Payable Sum Badge */}
                      {day.payableSum > 0 && (
                        <div className="px-1.5 py-0.5 rounded bg-warning-fill/15 text-warning-text border border-warning-border/50 text-[10px] font-mono font-bold truncate flex items-center justify-between">
                          <span className="truncate">-Borç:</span>
                          <span className="shrink-0">{formatTRY(day.payableSum)}</span>
                        </div>
                      )}

                      {/* Items Preview Chips (up to 2) */}
                      {day.items.slice(0, 2).map(item => (
                        <div
                          key={item.id}
                          className={`text-[9px] px-1.5 py-0.5 rounded font-medium truncate border ${
                            item.isOverdue
                              ? 'bg-danger-fill/10 text-danger-text border-danger-border'
                              : item.kind === 'payable'
                              ? 'bg-warning-fill/10 text-warning-text border-warning-border'
                              : 'bg-info-fill/10 text-info-text border-info-border'
                          }`}
                          title={`${item.cariCompanyName} - ${formatTRY(item.amount)}`}
                        >
                          <span className="font-bold mr-1">{item.cariCode || 'Cari'}:</span>
                          <span>{item.cariCompanyName.split(' ')[0]}</span>
                        </div>
                      ))}

                      {day.items.length > 2 && (
                        <div className="text-[9px] font-bold text-text-muted text-center">
                          +{day.items.length - 2} işlem daha
                        </div>
                      )}
                    </div>

                    {/* Bottom Status Dot Line */}
                    <div className="h-1 flex items-center space-x-1">
                      {day.hasOverdue && <span className="w-1.5 h-1.5 rounded-full bg-danger-fill shrink-0" />}
                      {day.hasApproaching && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />}
                      {day.receivableSum > 0 && !day.hasOverdue && <span className="w-1.5 h-1.5 rounded-full bg-success-fill shrink-0" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* AGENDA LIST VIEW */
          <div className="p-4 sm:p-5 divide-y divide-border">
            {Array.from(paymentsByDate.entries())
              .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
              .map(([dateKey, items]) => {
                const dateObj = new Date(dateKey);
                const isPast = dateObj.getTime() < new Date(todayStr).getTime();
                const isCurrent = dateKey === todayStr;

                return (
                  <div key={dateKey} className="py-4 first:pt-0 last:pb-0 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className={`p-2 rounded-xl text-xs font-bold border ${
                          isCurrent
                            ? 'bg-info-fill text-white border-info-border'
                            : isPast
                            ? 'bg-danger-fill/15 text-danger-text border-danger-border'
                            : 'bg-base-surface-2 text-text-primary border-border'
                        }`}>
                          <CalendarDays className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-extrabold text-text-primary">
                            {dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' })}
                          </h4>
                          <p className="text-xs text-text-muted">
                            {items.length} Adet Vade İşlemi
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 text-xs font-mono font-bold">
                        <span className="text-success-text">
                          +{formatTRY(items.filter(x => x.kind === 'receivable').reduce((s, x) => s + x.amount, 0))}
                        </span>
                        <span className="text-warning-text">
                          -{formatTRY(items.filter(x => x.kind === 'payable').reduce((s, x) => s + x.amount, 0))}
                        </span>
                      </div>
                    </div>

                    {/* Items Grid for this agenda date */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {items.map(item => (
                        <div
                          key={item.id}
                          className={`p-3 rounded-2xl border transition-all ${
                            item.isOverdue
                              ? 'bg-danger-fill/5 border-danger-border'
                              : item.kind === 'payable'
                              ? 'bg-warning-fill/5 border-warning-border'
                              : 'bg-base-surface-2 border-border'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center space-x-1.5">
                                <span className="font-mono font-bold text-xs text-info-text">{item.cariCode}</span>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                  item.isOverdue
                                    ? 'bg-danger-fill/20 text-danger-text border-danger-border'
                                    : item.isDueToday
                                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                    : 'bg-info-fill/15 text-info-text border-info-border'
                                }`}>
                                  {item.isOverdue ? `${item.diffDays} Gün Gecikmede` : item.isDueToday ? 'Bugün Vade' : 'Normal Vade'}
                                </span>
                              </div>
                              <p className="font-bold text-xs text-text-primary truncate mt-0.5" title={item.cariCompanyName}>
                                {item.cariCompanyName}
                              </p>
                              <p className="text-[11px] text-text-secondary truncate mt-0.5">
                                {item.documentNo || 'Evrak No Yok'} • {item.description}
                              </p>
                            </div>

                            <div className="text-right shrink-0">
                              <div className={`text-sm font-black font-mono ${
                                item.kind === 'payable' ? 'text-warning-text' : 'text-success-text'
                              }`}>
                                {item.kind === 'payable' ? '-' : '+'}{formatTRY(item.amount)}
                              </div>
                              <div className="flex items-center justify-end space-x-1 mt-1.5">
                                <button
                                  onClick={() => handleSendWhatsAppReminder(item)}
                                  className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                                  title="WhatsApp ile Hatırlat"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleSendEmailReminder(item)}
                                  className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                                  title="E-Posta Gönder"
                                >
                                  <Mail className="w-3.5 h-3.5" />
                                </button>
                                {onOpenTransactionModal && (
                                  <button
                                    onClick={() => {
                                      const cariObj = cariler.find(c => c.id === item.cariId);
                                      if (cariObj) {
                                        onOpenTransactionModal(cariObj, item.kind === 'payable' ? 'payment' : 'payment', item.amount, item.documentNo);
                                      }
                                    }}
                                    className="p-1.5 rounded-lg bg-base-surface hover:bg-base-surface-2 border border-border text-text-primary cursor-pointer"
                                    title="Tahsilat / Ödeme Yap"
                                  >
                                    <CreditCard className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        )}

      </div>

      {/* SELECTED DAY DETAIL DRAWER / INSPECTION CARD */}
      {selectedDateStr && (
        <div className="bg-base-surface border border-border rounded-3xl p-5 shadow-sm space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-info-fill/15 border border-info-border flex items-center justify-center text-info-text shrink-0">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-text-primary flex items-center space-x-2">
                  <span>
                    {new Date(selectedDateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' })}
                  </span>
                  {selectedDateStr === todayStr && (
                    <span className="px-2 py-0.5 rounded-full bg-info-fill text-white text-[10px] font-bold">
                      Bugün
                    </span>
                  )}
                </h3>
                <p className="text-xs text-text-secondary">
                  Bu tarihte vadesi gelen borç ve alacakların detaylı listesi ve hızlı işlem butonları
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 text-xs font-mono font-bold self-start sm:self-auto">
              <div className="px-3 py-1.5 rounded-xl bg-success-fill/15 text-success-text border border-success-border">
                Toplam Alacak: {formatTRY(selectedDayItems.filter(x => x.kind === 'receivable').reduce((s, x) => s + x.amount, 0))}
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-warning-fill/15 text-warning-text border border-warning-border">
                Toplam Borç: {formatTRY(selectedDayItems.filter(x => x.kind === 'payable').reduce((s, x) => s + x.amount, 0))}
              </div>
            </div>
          </div>

          {/* Items List */}
          {selectedDayItems.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-text-muted mx-auto" />
              <p className="text-xs text-text-secondary font-medium">
                Bu seçili tarihte ({selectedDateStr}) vadesi gelen kayıtlı herhangi bir borç veya alacak bulunmuyor.
              </p>
              <p className="text-[11px] text-text-muted">
                Farklı bir güne tıklayarak o günün ödeme planını inceleyebilirsiniz.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {selectedDayItems.map(item => (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border flex flex-col justify-between shadow-2xs space-y-3 transition-all ${
                    item.isOverdue
                      ? 'bg-danger-fill/5 border-danger-border'
                      : item.kind === 'payable'
                      ? 'bg-warning-fill/5 border-warning-border'
                      : 'bg-base-surface-2 border-border'
                  }`}
                >
                  <div className="space-y-2">
                    {/* Top Tag & Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-mono font-bold text-xs text-info-text">{item.cariCode}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                          item.isOverdue
                            ? 'bg-danger-fill text-white border-danger-border animate-pulse'
                            : item.isDueToday
                            ? 'bg-amber-500 text-white border-amber-500'
                            : 'bg-info-fill/15 text-info-text border-info-border'
                        }`}>
                          {item.isOverdue ? `🚨 ${item.diffDays} GÜN GECİKTİ` : item.isDueToday ? 'BUGÜN VADESİ' : 'VADE BEKLİYOR'}
                        </span>
                      </div>

                      <span className="text-[10px] font-mono text-text-muted">
                        {item.kind === 'payable' ? 'Tedarikçi Ödemesi' : 'Müşteri Tahsilatı'}
                      </span>
                    </div>

                    {/* Company Name & Contact */}
                    <div>
                      <h4 className="text-sm font-extrabold text-text-primary leading-tight">
                        {item.cariCompanyName}
                      </h4>
                      <p className="text-xs text-text-secondary mt-0.5 flex items-center space-x-1">
                        <Building2 className="w-3 h-3 text-text-muted" />
                        <span>{item.cariName}</span>
                        {item.cariCity && <span>• {item.cariCity}</span>}
                      </p>
                    </div>

                    {/* Amount & Evrak No */}
                    <div className="p-2.5 rounded-xl bg-base-surface border border-border flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-text-muted block font-medium">Vade Tutarı</span>
                        <span className={`text-base font-black font-mono ${
                          item.kind === 'payable' ? 'text-warning-text' : 'text-success-text'
                        }`}>
                          {formatTRY(item.amount)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-text-muted block font-medium">Evrak No</span>
                        <span className="text-xs font-mono font-bold text-text-primary">
                          {item.documentNo || 'EVR-YOK'}
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-[11px] text-text-secondary leading-snug line-clamp-2">
                      {item.description}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-border flex items-center justify-between gap-1.5">
                    {/* WhatsApp */}
                    <button
                      onClick={() => handleSendWhatsAppReminder(item)}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center space-x-1 cursor-pointer shadow-xs transition-colors"
                      title="Kuveyt Türk IBAN Bilgili WhatsApp Hatırlatması Gönder"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>

                    {/* E-Posta */}
                    <button
                      onClick={() => handleSendEmailReminder(item)}
                      className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center space-x-1 cursor-pointer shadow-xs transition-colors"
                      title="E-Posta Hatırlatması İlet"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">E-Posta</span>
                    </button>

                    {/* Tahsilat / Ödeme Girişi */}
                    {onOpenTransactionModal && (
                      <button
                        onClick={() => {
                          const cariObj = cariler.find(c => c.id === item.cariId);
                          if (cariObj) {
                            onOpenTransactionModal(
                              cariObj, 
                              item.kind === 'payable' ? 'payment' : 'payment', 
                              item.amount, 
                              item.documentNo
                            );
                          }
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-base-surface hover:bg-base-surface-2 border border-border text-text-primary text-xs font-bold flex items-center space-x-1 cursor-pointer transition-colors"
                        title="Bu vadeye ait ödeme/tahsilat kaydını düş"
                      >
                        <CreditCard className="w-3.5 h-3.5 text-info-text" />
                        <span>Kapat</span>
                      </button>
                    )}

                    {/* Vadeyi Ötele / Değiştir */}
                    <button
                      onClick={() => {
                        setEditingDueDateTx(item);
                        setNewDueDateInput(item.effectiveDueDate);
                      }}
                      className="p-1.5 rounded-xl bg-base-surface hover:bg-base-surface-2 border border-border text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                      title="Vade Tarihini Değiştir / Ötele"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DUE DATE EDIT MODAL */}
      {editingDueDateTx && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md p-3 sm:p-4 md:p-6 animate-in fade-in"
          onClick={() => setEditingDueDateTx(null)}
        >
          <div className="min-h-full flex items-center justify-center py-4 sm:py-6">
            <div 
              className="bg-base-surface border border-border rounded-3xl w-full max-w-md p-5 text-text-primary shadow-2xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center space-x-2">
                  <CalendarIcon className="w-5 h-5 text-info-text" />
                  <h3 className="text-base font-bold text-text-primary">
                    Vade Tarihini Güncelle / Ötele
                  </h3>
                </div>
                <button
                  onClick={() => setEditingDueDateTx(null)}
                  className="p-1 text-text-muted hover:text-text-primary cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-base-surface-2 border border-border text-xs space-y-1">
                <p className="font-bold text-text-primary">{editingDueDateTx.cariCompanyName}</p>
                <p className="text-text-secondary">Evrak: {editingDueDateTx.documentNo || '-'}</p>
                <p className="font-mono font-bold text-info-text">Tutar: {formatTRY(editingDueDateTx.amount)}</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-secondary block">
                  Yeni Vade Tarihi
                </label>
                <input
                  type="date"
                  value={newDueDateInput}
                  onChange={e => setNewDueDateInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary font-mono focus:border-info-border"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  onClick={() => setEditingDueDateTx(null)}
                  className="px-4 py-2 rounded-xl bg-base-surface-2 hover:bg-base-surface text-text-secondary text-xs font-bold cursor-pointer"
                >
                  İptal
                </button>
                <button
                  onClick={handleSaveUpdatedDueDate}
                  className="px-4 py-2 rounded-xl bg-info-fill hover:opacity-90 text-white text-xs font-bold cursor-pointer shadow-sm flex items-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Vadeyi Kaydet</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
