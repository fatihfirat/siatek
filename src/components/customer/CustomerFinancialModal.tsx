import React, { useState, useEffect } from 'react';
import { 
  X, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Download, 
  Printer, 
  Building2, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText,
  HelpCircle,
  Copy,
  Check,
  Share2,
  MessageCircle,
  ChevronDown
} from 'lucide-react';
import { User, Order } from '../../types';
import { printElementById } from '../../utils/printUtils';
import { copyToClipboard, openWhatsAppShare } from '../../utils/shareUtils';
import { useModalBehavior } from '../../hooks/useModalBehavior';

interface CustomerFinancialModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  orders?: Order[];
}

export const CustomerFinancialModal: React.FC<CustomerFinancialModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  orders = [],
}) => {
  useModalBehavior(isOpen, onClose);
  const [filterType, setFilterType] = useState<'all' | 'invoice' | 'payment'>('all');
  const [copiedIban, setCopiedIban] = useState<string | null>(null);
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  if (!isOpen) return null;

  const safeOrders = Array.isArray(orders) ? orders : [];
  const companyName = currentUser?.companyName || 'Yılmaz Mekanik & Tesisat Ltd. Şti.';
  const taxNumber = currentUser?.taxNumber || '9840284719';
  const taxOffice = currentUser?.taxOffice || 'Ümraniye V.D.';
  const customerCode = 'CR-' + (currentUser?.id ? currentUser.id.slice(0, 6).toUpperCase() : '842910');

  // Calculate real totals from actual orders or structured defaults
  const totalOrderSum = safeOrders.reduce((sum, o) => sum + (o && o.status !== 'cancelled' ? o.total : 0), 0);
  const currentDebitBalance = totalOrderSum > 0 ? totalOrderSum : 38450;
  const creditLimit = 350000;
  const remainingCredit = Math.max(0, creditLimit - currentDebitBalance);
  const duePaymentAmount = Math.round(currentDebitBalance * 0.45);

  // Financial transactions statement records
  const transactions = [
    {
      id: 'TXN-2026-004',
      date: '2026-08-25',
      type: 'invoice',
      title: 'Satış Faturası (Doğalgaz & Radyatör Malz.)',
      docNo: 'FTR-2026-0892',
      dueDate: '2026-09-25',
      debit: 24800,
      credit: 0,
      balance: currentDebitBalance,
      status: 'unpaid',
    },
    {
      id: 'TXN-2026-003',
      date: '2026-08-18',
      type: 'payment',
      title: 'Banka Havalesi / Tahsilat',
      docNo: 'BNK-904128',
      dueDate: '-',
      debit: 0,
      credit: 45000,
      balance: currentDebitBalance - 24800,
      status: 'completed',
    },
    {
      id: 'TXN-2026-002',
      date: '2026-08-10',
      type: 'invoice',
      title: 'Satış Faturası (Kombi & Sayaç Grubu)',
      docNo: 'FTR-2026-0741',
      dueDate: '2026-09-10',
      debit: 58650,
      credit: 0,
      balance: currentDebitBalance - 24800 + 45000,
      status: 'partially_paid',
    },
    {
      id: 'TXN-2026-001',
      date: '2026-08-01',
      type: 'payment',
      title: 'EFT Tahsilat (Garanti BBVA)',
      docNo: 'EFT-382910',
      dueDate: '-',
      debit: 0,
      credit: 60000,
      balance: 0,
      status: 'completed',
    },
  ];

  const filteredTransactions = transactions.filter((item) => {
    if (filterType === 'all') return true;
    return item.type === filterType;
  });

  const handleCopyIban = async (iban: string, bank: string) => {
    await copyToClipboard(iban);
    setCopiedIban(bank);
    setTimeout(() => setCopiedIban(null), 2000);
  };

  const getFinancialSummaryText = () => {
    return `*ALPHA TEKNİK DOĞALGAZ & TESİSAT*\n*MÜŞTERİ CARİ HESAP DURUMU*\n\n🏢 *Firma:* ${companyName}\n🔑 *Cari Kod:* ${customerCode}\n🗓 *Tarih:* ${new Date().toLocaleDateString('tr-TR')}\n\n💰 *GÜNCEL BORÇ BAKİYESİ:* *${currentDebitBalance.toLocaleString('tr-TR')} ₺*\n🛡 *Kullanılabilir Kredi Limiti:* ${remainingCredit.toLocaleString('tr-TR')} ₺\n⏱ *Vadesi Gelen Tutar:* ${duePaymentAmount.toLocaleString('tr-TR')} ₺\n\nDetaylı bilgi için: +90 544 440 91 80 | info@alphadogalgaz.com`;
  };

  const handleShareWhatsApp = () => {
    const msg = getFinancialSummaryText();
    openWhatsAppShare({
      phone: currentUser?.phone,
      message: msg,
    });
    setIsShareMenuOpen(false);
    setCopiedNotification('WhatsApp açılıyor...');
    setTimeout(() => setCopiedNotification(null), 3000);
  };

  const handleCopySummary = async () => {
    const msg = getFinancialSummaryText();
    const success = await copyToClipboard(msg);
    if (success) {
      setCopiedNotification('Finans özeti panoya kopyalandı!');
      setTimeout(() => setCopiedNotification(null), 3000);
    }
    setIsShareMenuOpen(false);
  };

  const handlePrint = () => {
    setIsPrinting(true);
    printElementById('customer-financial-print-area', `${companyName} - Cari Hesap Ekstresi`);
    setTimeout(() => setIsPrinting(false), 1000);
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md p-3 sm:p-5 animate-in fade-in"
      onClick={onClose}
    >
      <div className="min-h-full flex items-center justify-center py-4 sm:py-6">
        <div 
          role="dialog"
          aria-modal="true"
          aria-labelledby="financial-modal-title"
          className="bg-base-surface w-full max-w-4xl max-h-[92vh] rounded-3xl border border-border shadow-2xl flex flex-col overflow-hidden text-text-primary relative"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Toast Notification */}
        {copiedNotification && (
          <div className="fixed top-5 right-5 z-[60] bg-success-fill text-base text-xs font-bold px-4 py-2.5 rounded-2xl shadow-xl flex items-center space-x-2 animate-in fade-in slide-in-from-top-2">
            <Check className="w-4 h-4" />
            <span>{copiedNotification}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 bg-base-surface-2 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-success-fill/15 text-success-text rounded-2xl border border-success-border">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 id="financial-modal-title" className="text-base sm:text-lg font-extrabold text-text-primary">
                Cari Hesap & Finans Özeti
              </h2>
              <div className="flex items-center space-x-2 text-xs text-text-secondary">
                <span className="font-semibold text-text-primary">{companyName}</span>
                <span>•</span>
                <span className="font-mono">Cari Kod: {customerCode}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Paylaş Menüsü */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsShareMenuOpen(!isShareMenuOpen)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                  isShareMenuOpen 
                    ? 'bg-success-fill text-base border-success-border' 
                    : 'bg-base-surface border-border text-text-primary hover:bg-base-surface-2'
                }`}
                title="Cari Hesap Özetini Paylaş"
              >
                <Share2 className="w-3.5 h-3.5 text-success-text" />
                <span>Paylaş</span>
                <ChevronDown className="w-3 h-3 text-text-muted" />
              </button>

              {isShareMenuOpen && (
                <div 
                  className="absolute right-0 mt-2 w-60 bg-base-surface border border-border rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 text-xs text-text-primary"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={handleShareWhatsApp}
                    className="w-full px-3 py-2 text-left rounded-xl hover:bg-base-surface-2 flex items-center space-x-2.5 transition-colors cursor-pointer group"
                  >
                    <MessageCircle className="w-4 h-4 text-success-text" />
                    <div>
                      <div className="font-semibold text-xs group-hover:text-success-text">WhatsApp ile Gönder</div>
                    </div>
                  </button>

                  <button
                    onClick={handleCopySummary}
                    className="w-full px-3 py-2 text-left rounded-xl hover:bg-base-surface-2 flex items-center space-x-2.5 transition-colors cursor-pointer group"
                  >
                    <Copy className="w-4 h-4 text-info-text" />
                    <div>
                      <div className="font-semibold text-xs group-hover:text-info-text">Metni Panoya Kopyala</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={handlePrint}
              disabled={isPrinting}
              type="button"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-border bg-base-surface text-xs font-semibold text-text-primary hover:bg-base-surface-2 transition-colors cursor-pointer"
              title="Cari Ekstreyi Yazdır"
            >
              <Printer className={`w-3.5 h-3.5 ${isPrinting ? 'animate-pulse text-warning-text' : ''}`} />
              <span>{isPrinting ? 'Yazdırılıyor...' : 'Yazdır'}</span>
            </button>
            <button
              onClick={onClose}
              type="button"
              className="p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-base-surface-2 transition-colors cursor-pointer"
              aria-label="Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div id="customer-financial-print-area" className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar">
          
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            
            {/* 1. Güncel Cari Bakiye */}
            <div className="p-4 rounded-2xl bg-base-surface border border-danger-border shadow-xs">
              <div className="flex items-center justify-between text-xs text-text-secondary">
                <span className="font-bold text-danger-text">Güncel Cari Bakiye</span>
                <span className="px-2 py-0.5 rounded-full bg-danger-border text-danger-text font-mono font-bold text-[10px]">
                  Borç Bakiyesi
                </span>
              </div>
              <div className="text-2xl font-black text-danger-text mt-2 font-mono">
                {currentDebitBalance.toLocaleString('tr-TR')} ₺
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-text-secondary">
                <span>Vadesi Gelen Tutar:</span>
                <span className="font-bold text-text-primary font-mono">{duePaymentAmount.toLocaleString('tr-TR')} ₺</span>
              </div>
            </div>

            {/* 2. Kredi & Risk Limiti */}
            <div className="p-4 rounded-2xl bg-base-surface border border-success-border shadow-xs">
              <div className="flex items-center justify-between text-xs text-text-secondary">
                <span className="font-bold text-success-text">Tanımlı Kredi Limiti</span>
                <span className="px-2 py-0.5 rounded-full bg-success-border text-success-text font-mono font-bold text-[10px]">
                  Açık Hesap
                </span>
              </div>
              <div className="text-2xl font-black text-success-text mt-2 font-mono">
                {creditLimit.toLocaleString('tr-TR')} ₺
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-text-secondary">
                <span>Kullanılabilir Limit:</span>
                <span className="font-bold text-success-text font-mono">{remainingCredit.toLocaleString('tr-TR')} ₺</span>
              </div>
            </div>

            {/* 3. Vade ve Ödeme Koşulu */}
            <div className="p-4 rounded-2xl bg-base-surface border border-border shadow-xs">
              <div className="flex items-center justify-between text-xs text-text-secondary">
                <span className="font-bold text-text-primary">Ödeme & Vade Koşulu</span>
                <span className="px-2 py-0.5 rounded-full bg-base-surface-2 text-text-primary border border-border font-mono font-bold text-[10px]">
                  30 Gün Vadeli
                </span>
              </div>
              <div className="text-xl font-black text-text-primary mt-2 font-mono">
                Standart Bayi
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-text-secondary">
                <span>Ortalama Vade Günü:</span>
                <span className="font-bold text-text-primary">25 Gün</span>
              </div>
            </div>

          </div>

          {/* Account Details & Tax Info Banner */}
          <div className="p-4 rounded-2xl bg-base-surface-2 border border-border flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-text-secondary" />
                <span className="font-bold text-text-primary">Cari Firma Bilgileri:</span>
                <span className="text-text-secondary">{companyName}</span>
              </div>
              <div className="flex items-center space-x-3 text-text-secondary pl-6">
                <span>Vergi No: <strong className="font-mono text-text-primary">{taxNumber}</strong></span>
                <span>•</span>
                <span>Vergi Dairesi: <strong className="text-text-primary">{taxOffice}</strong></span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-[11px] text-text-secondary">Mutabakat veya ekstre talepleri için:</span>
              <span className="font-mono font-bold text-info-text bg-base-surface px-2 py-1 rounded-lg border border-border">
                muhasebe@alphateknik.com.tr
              </span>
            </div>
          </div>

          {/* Ekstre / Hareketler Tablosu */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-sm font-extrabold text-text-primary flex items-center space-x-2">
                <span>Son Cari Hesap Hareketleri</span>
                <span className="text-[11px] font-normal text-text-secondary">({filteredTransactions.length} kayıt)</span>
              </h3>

              {/* Filter Tabs */}
              <div className="flex items-center space-x-1 bg-base-surface-2 p-1 rounded-xl border border-border text-xs">
                <button
                  type="button"
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    filterType === 'all'
                      ? 'bg-base-surface text-text-primary shadow-xs border border-border'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Tüm Hareketler
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('invoice')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    filterType === 'invoice'
                      ? 'bg-base-surface text-text-primary shadow-xs border border-border'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Faturalar (Borç)
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('payment')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    filterType === 'payment'
                      ? 'bg-base-surface text-text-primary shadow-xs border border-border'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Tahsilatlar (Alacak)
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-base-surface-2 border-b border-border text-text-secondary font-bold">
                    <th className="py-3 px-4">Tarih</th>
                    <th className="py-3 px-4">Evrak / İşlem</th>
                    <th className="py-3 px-4">Belge No</th>
                    <th className="py-3 px-4">Vade</th>
                    <th className="py-3 px-4 text-right">Borç (₺)</th>
                    <th className="py-3 px-4 text-right">Alacak (₺)</th>
                    <th className="py-3 px-4 text-right">Kalan Bakiye (₺)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-base-surface">
                  {filteredTransactions.map((item) => (
                    <tr key={item.id} className="hover:bg-base-surface-2 transition-colors">
                      <td className="py-3 px-4 font-mono text-text-secondary">{item.date}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          {item.type === 'invoice' ? (
                            <ArrowUpRight className="w-3.5 h-3.5 text-danger-text shrink-0" />
                          ) : (
                            <ArrowDownLeft className="w-3.5 h-3.5 text-success-text shrink-0" />
                          )}
                          <span className="font-semibold text-text-primary">{item.title}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-text-secondary">{item.docNo}</td>
                      <td className="py-3 px-4 text-text-muted font-mono">{item.dueDate}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-danger-text">
                        {item.debit > 0 ? `${item.debit.toLocaleString('tr-TR')} ₺` : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-success-text">
                        {item.credit > 0 ? `${item.credit.toLocaleString('tr-TR')} ₺` : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-text-primary">
                        {item.balance.toLocaleString('tr-TR')} ₺
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Havale / EFT Banka Bilgileri */}
          <div className="p-4 rounded-2xl bg-base-surface-2 border border-border space-y-3">
            <h4 className="text-xs font-bold text-text-primary flex items-center space-x-2">
              <CreditCard className="w-4 h-4 text-info-text" />
              <span>ALPHA TEKNİK Kurumsal Banka Hesapları (Tahsilat & Ödeme)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              
              {/* Garanti Bankası */}
              <div className="p-3 bg-base-surface rounded-xl border border-border space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-text-primary">Garanti BBVA - TL Hesabı</span>
                  <button
                    type="button"
                    onClick={() => handleCopyIban('TR420006200000012345678901', 'Garanti')}
                    className="flex items-center space-x-1 text-[11px] text-info-text font-bold hover:underline cursor-pointer"
                  >
                    {copiedIban === 'Garanti' ? <Check className="w-3.5 h-3.5 text-success-text" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedIban === 'Garanti' ? 'Kopyalandı' : 'IBAN Kopyala'}</span>
                  </button>
                </div>
                <div className="font-mono text-[11px] text-text-secondary select-all">
                  TR42 0006 2000 0001 2345 6789 01
                </div>
                <div className="text-[10px] text-text-muted">Alıcı: ALPHA TEKNİK DOĞALGAZ SIHHİ TESİSAT SAN. VE TİC. LTD. ŞTİ.</div>
              </div>

              {/* İş Bankası */}
              <div className="p-3 bg-base-surface rounded-xl border border-border space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-text-primary">Türkiye İş Bankası - TL Hesabı</span>
                  <button
                    type="button"
                    onClick={() => handleCopyIban('TR760006400000112233445566', 'IsBank')}
                    className="flex items-center space-x-1 text-[11px] text-info-text font-bold hover:underline cursor-pointer"
                  >
                    {copiedIban === 'IsBank' ? <Check className="w-3.5 h-3.5 text-success-text" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedIban === 'IsBank' ? 'Kopyalandı' : 'IBAN Kopyala'}</span>
                  </button>
                </div>
                <div className="font-mono text-[11px] text-text-secondary select-all">
                  TR76 0006 4000 0011 2233 4455 66
                </div>
                <div className="text-[10px] text-text-muted">Alıcı: ALPHA TEKNİK DOĞALGAZ SIHHİ TESİSAT SAN. VE TİC. LTD. ŞTİ.</div>
              </div>

            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-base-surface-2 border-t border-border flex items-center justify-between">
          <span className="text-[11px] text-text-muted">
            * Hesap ekstresi ve bakiye kayıtları sistem tarafından anlık olarak güncellenmektedir.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-info-fill text-base hover:opacity-90 text-xs font-bold transition-all cursor-pointer"
          >
            Kapat
          </button>
        </div>
      </div>
      </div>
    </div>
  );
};
export default CustomerFinancialModal;
