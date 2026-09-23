import { useState, useMemo, useEffect } from 'react';
import { CariAccount } from '../../types';
import {
  X,
  MessageCircle,
  Mail,
  Copy,
  Check,
  Phone,
  Building2,
  Calendar,
  AlertTriangle,
  Clock,
  Send,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Info,
  CheckCircle2,
  Bell,
  DollarSign
} from 'lucide-react';
import { formatTRY } from '../../utils/exportUtils';
import { copyToClipboard, openWhatsAppShare, formatWhatsAppPhone } from '../../utils/shareUtils';
import {
  calculateCariDueStatus,
  generateQuickWhatsAppReminder,
  generateQuickEmailReminder,
  triggerOneClickWhatsAppReminder,
  triggerOneClickEmailReminder,
  OFFICIAL_BANK_INFO,
  ReminderTone
} from '../../utils/reminderUtils';

import { useModalBehavior } from '../../hooks/useModalBehavior';

interface PaymentReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  cariler: CariAccount[];
  initialCariId?: string | null;
}

export type ReminderChannel = 'whatsapp' | 'email' | 'sms';

export default function PaymentReminderModal({
  isOpen,
  onClose,
  cariler = [],
  initialCariId,
}: PaymentReminderModalProps) {
  useModalBehavior(isOpen, onClose);
  const safeCariler = Array.isArray(cariler) ? cariler : [];

  // Filter cariler that have positive debit balance (alacaklarımız)
  const debtorCariler = useMemo(() => {
    const debtors = safeCariler.filter(c => c && c.balance > 0 && c.type !== 'supplier');
    return debtors.length > 0 ? debtors : safeCariler;
  }, [safeCariler]);

  const [selectedCariId, setSelectedCariId] = useState<string>(() => {
    if (initialCariId) return initialCariId;
    if (debtorCariler.length > 0) return debtorCariler[0].id;
    return safeCariler[0]?.id || '';
  });

  const [channel, setChannel] = useState<ReminderChannel>('whatsapp');
  const [tone, setTone] = useState<ReminderTone>('formal');
  const [includeIban, setIncludeIban] = useState(true);
  const [includeLastOrder, setIncludeLastOrder] = useState(true);
  const [customNote, setCustomNote] = useState('');
  const [copied, setCopied] = useState(false);
  const [sentSuccessTrigger, setSentSuccessTrigger] = useState<string | null>(null);

  const overdueCount = useMemo(() => {
    return (debtorCariler || []).filter(c => c && calculateCariDueStatus(c)?.isOverdue).length;
  }, [debtorCariler]);

  const approachingCount = useMemo(() => {
    return (debtorCariler || []).filter(c => c && calculateCariDueStatus(c)?.isApproaching).length;
  }, [debtorCariler]);

  // Synchronize when initialCariId or debtorCariler changes
  useEffect(() => {
    if (initialCariId) {
      setSelectedCariId(initialCariId);
    } else if (debtorCariler.length > 0 && (!selectedCariId || !debtorCariler.some(c => c.id === selectedCariId))) {
      setSelectedCariId(debtorCariler[0].id);
    }
  }, [initialCariId, debtorCariler, selectedCariId]);

  const currentCariIndex = debtorCariler.findIndex(c => c && c.id === selectedCariId);
  const currentCari = (currentCariIndex >= 0 ? debtorCariler[currentCariIndex] : null) || safeCariler.find(c => c && c.id === selectedCariId) || safeCariler[0] || null;

  const dueInfo = currentCari ? calculateCariDueStatus(currentCari) : {
    isOverdue: false,
    isApproaching: false,
    diffDays: 0,
    daysText: '0 Gün',
    badgeLabel: 'Normal',
    badgeClass: 'bg-info-fill/15 text-info-text border-info-border',
    estimatedDueDate: new Date(),
  };

  // Generate Message Content
  const generatedWhatsApp = currentCari ? generateQuickWhatsAppReminder(currentCari, tone, customNote, {
    includeIban,
    includeLastOrder,
  }) : '';
  const emailObj = currentCari ? generateQuickEmailReminder(currentCari, tone, customNote, {
    includeIban,
    includeLastOrder,
  }) : { subject: '', body: '' };
  const generatedEmail = emailObj.body;
  const emailSubject = emailObj.subject;

  const generateSmsBody = (): string => {
    if (!currentCari) return '';
    const formattedBalance = formatTRY(currentCari.balance || 0);
    let msg = `Sayin ${currentCari.name || currentCari.companyName || 'Yetkili'}, Alpha Teknik cari hesabinizdaki ${formattedBalance} tutarindaki `;
    if (tone === 'urgent' || dueInfo.isOverdue) {
      msg += `vadesi ${dueInfo.diffDays > 0 ? dueInfo.diffDays + ' gun geciken ' : 'geciken '}`;
    } else if (tone === 'approaching' || dueInfo.isApproaching) {
      msg += `vadesi yaklasan `;
    } else {
      msg += `vadesi gelen `;
    }
    msg += `bakiyenizi `;
    if (includeIban) {
      msg += `Kuveyt Turk ${OFFICIAL_BANK_INFO.iban} nolu hesabimiza `;
    }
    msg += `iletmenizi rica ederiz.`;
    if (includeLastOrder && currentCari.lastTransactionDesc) {
      msg += ` (Son islem: ${currentCari.lastTransactionDesc})`;
    }
    if (customNote && customNote.trim()) {
      msg += ` Not: ${customNote.trim()}`;
    }
    msg += ` Bilgi: 05444409180`;
    return msg;
  };

  const activeMessageText = channel === 'whatsapp' 
    ? generatedWhatsApp 
    : channel === 'email' 
    ? generatedEmail 
    : generateSmsBody();

  const handleCopy = async () => {
    const ok = await copyToClipboard(activeMessageText);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSendWhatsAppDirect = () => {
    triggerOneClickWhatsAppReminder(currentCari, tone, customNote, {
      includeIban,
      includeLastOrder,
    });
    setSentSuccessTrigger('WhatsApp üzerinden hatırlatma mesajı açıldı.');
    setTimeout(() => setSentSuccessTrigger(null), 3500);
  };

  const handleSendEmailDirect = () => {
    triggerOneClickEmailReminder(currentCari, tone, customNote, {
      includeIban,
      includeLastOrder,
    });
    setSentSuccessTrigger('E-Posta istemcisi şablonla başlatıldı.');
    setTimeout(() => setSentSuccessTrigger(null), 3500);
  };

  const handlePrevCari = () => {
    if (currentCariIndex > 0) {
      setSelectedCariId(debtorCariler[currentCariIndex - 1].id);
    }
  };

  const handleNextCari = () => {
    if (currentCariIndex < debtorCariler.length - 1) {
      setSelectedCariId(debtorCariler[currentCariIndex + 1].id);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md p-2 sm:p-4 md:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div className="min-h-full flex items-center justify-center py-4 sm:py-6">
        <div 
          className="relative w-full max-w-4xl bg-base-surface text-text-primary rounded-3xl shadow-2xl border border-border flex flex-col max-h-[92vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
        
        {/* MODAL HEADER */}
        <div className="p-4 sm:px-6 border-b border-border bg-base-surface-2 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-warning-fill/15 text-warning-text border border-warning-border flex items-center justify-center font-bold shrink-0">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold text-text-primary truncate">
                  Otomatik Ödeme & Vade Hatırlatıcı Masası
                </h2>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  Tek Tuşla WhatsApp & E-Posta
                </span>
              </div>
              <p className="text-xs text-text-secondary truncate">
                Vadesi yaklaşan veya geçen borçlar için resmi banka IBAN bilgili hazır hatırlatma mesajı tetikleyici
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-base-surface transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TOP METRIC BANNER: OVERDUE VS APPROACHING */}
        <div className="px-4 sm:px-6 py-2.5 bg-base-surface border-b border-border flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1.5 font-semibold text-danger-text">
              <AlertTriangle className="w-4 h-4" />
              <span>{overdueCount} Cari Vadesi Geçmiş</span>
            </span>
            <span className="text-text-muted">|</span>
            <span className="flex items-center space-x-1.5 font-semibold text-warning-text">
              <Clock className="w-4 h-4" />
              <span>{approachingCount} Cari Vadeye Az Kaldı</span>
            </span>
          </div>

          <div className="text-[11px] text-text-muted">
            Toplam Borçlu Cari: <strong className="text-text-primary font-mono">{debtorCariler.length} Firma</strong>
          </div>
        </div>

        {/* MODAL CONTENT BODY */}
        {!currentCari ? (
          <div className="flex-1 p-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-base-surface-2 border border-border flex items-center justify-center text-text-muted">
              <Building2 className="w-8 h-8 opacity-50" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary">Kayıtlı Borçlu Cari Hesap Bulunamadı</h3>
              <p className="text-xs text-text-secondary max-w-sm mt-1">
                Hatırlatma gönderebilmek için cari listenizde açık bakiyesi veya vadesi bulunan bir cari hesap bulunmalıdır.
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-base-surface-2 hover:bg-base-surface border border-border text-xs font-bold text-text-primary transition-colors cursor-pointer"
            >
              Pencereyi Kapat
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              
              {/* CARI SELECTOR & NAVIGATION BANNER */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-base-surface-2 border border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <div className="p-2 rounded-xl bg-info-fill/15 text-info-text border border-info-border shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                      Hatırlatma Gönderilecek Cari Hesap ({debtorCariler.length} Borçlu Cari)
                    </label>
                    <select
                      value={selectedCariId}
                      onChange={(e) => setSelectedCariId(e.target.value)}
                      className="w-full mt-0.5 bg-base-surface border border-border rounded-xl px-3 py-1.5 text-xs font-bold text-text-primary focus:outline-hidden focus:ring-1 focus:ring-info-border truncate"
                    >
                      {debtorCariler.map(c => {
                        const status = calculateCariDueStatus(c);
                        return (
                          <option key={c.id} value={c.id}>
                            {c.code || 'CR'} - {c.companyName || c.name || 'Cari'} ({formatTRY(c.balance || 0)}) - {status.daysText}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {/* Prev / Next Debtor buttons */}
                <div className="flex items-center space-x-1.5 shrink-0 self-end sm:self-auto">
                  <button
                    onClick={handlePrevCari}
                    disabled={currentCariIndex <= 0}
                    className="p-2 rounded-xl bg-base-surface hover:bg-base-surface-2 border border-border text-text-secondary disabled:opacity-40 transition-colors cursor-pointer"
                    title="Önceki Borçlu Cari"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-mono font-bold text-text-muted px-1.5">
                    {Math.max(1, currentCariIndex + 1)} / {Math.max(1, debtorCariler.length)}
                  </span>
                  <button
                    onClick={handleNextCari}
                    disabled={currentCariIndex >= debtorCariler.length - 1}
                    className="p-2 rounded-xl bg-base-surface hover:bg-base-surface-2 border border-border text-text-secondary disabled:opacity-40 transition-colors cursor-pointer"
                    title="Sonraki Borçlu Cari"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* CURRENT CARI FINANCIAL STATUS CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                
                {/* Net Balance */}
                <div className="p-3.5 rounded-2xl bg-base-surface border border-border shadow-xs space-y-1">
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                    Güncel Borç Bakiyesi
                  </span>
                  <div className="text-lg sm:text-xl font-black font-mono text-danger-text">
                    {formatTRY(currentCari.balance || 0)}
                  </div>
                  <div className="text-[11px] text-text-muted">
                    Toplam Tahsilat: <span className="font-mono text-success-text">{formatTRY(currentCari.totalCredit || 0)}</span>
                  </div>
                </div>

                {/* Due Status & Term */}
                <div className="p-3.5 rounded-2xl bg-base-surface border border-border shadow-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                      Vade Süresi & Durumu
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${dueInfo.badgeClass}`}>
                      {dueInfo.badgeLabel}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-text-primary flex items-center space-x-1.5">
                    <Clock className="w-4 h-4 text-warning-text" />
                    <span>{dueInfo.daysText}</span>
                  </div>
                  <div className="text-[11px] text-text-muted">
                    Tanımlı Vade: <strong className="text-text-primary">{currentCari.paymentTermDays || 30} Gün</strong>
                  </div>
                </div>

                {/* Contact Person & Phone */}
                <div className="p-3.5 rounded-2xl bg-base-surface border border-border shadow-xs space-y-1">
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                    İletişim & Yetkili
                  </span>
                  <div className="text-sm font-bold text-text-primary truncate">
                    {currentCari.name || currentCari.companyName || 'Firma Yetkilisi'}
                  </div>
                  <div className="text-[11px] text-text-secondary font-mono flex items-center space-x-1.5 truncate">
                    <Phone className="w-3 h-3 text-text-muted shrink-0" />
                    <span>{currentCari.phone || 'Telefon Belirtilmedi'}</span>
                  </div>
                </div>

              </div>

              {/* CHANNEL & TONE CONTROLS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Communication Channel Tabs */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-text-primary flex items-center space-x-1.5">
                    <span>1. İletişim Kanalı</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setChannel('whatsapp')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                        channel === 'whatsapp'
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                          : 'bg-base-surface-2 text-text-secondary border-border hover:text-text-primary'
                      }`}
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>WhatsApp</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setChannel('email')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                        channel === 'email'
                          ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                          : 'bg-base-surface-2 text-text-secondary border-border hover:text-text-primary'
                      }`}
                    >
                      <Mail className="w-4 h-4" />
                      <span>E-Posta</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setChannel('sms')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                        channel === 'sms'
                          ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                          : 'bg-base-surface-2 text-text-secondary border-border hover:text-text-primary'
                      }`}
                    >
                      <Phone className="w-4 h-4" />
                      <span>SMS / Metin</span>
                    </button>
                  </div>
                </div>

                {/* Message Tone Tabs */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-text-primary flex items-center space-x-1.5">
                    <span>2. Mesaj Şablonu & Vade Tonu</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => setTone('approaching')}
                      className={`p-2 rounded-xl border text-[11px] font-bold transition-all cursor-pointer truncate ${
                        tone === 'approaching'
                          ? 'bg-warning-fill/20 text-warning-text border-warning-border shadow-xs'
                          : 'bg-base-surface-2 text-text-secondary border-border hover:text-text-primary'
                      }`}
                      title="Vadesi Yaklaşan Ödeme Bildirimi"
                    >
                      Vade Yaklaşıyor
                    </button>
                    <button
                      type="button"
                      onClick={() => setTone('polite')}
                      className={`p-2 rounded-xl border text-[11px] font-bold transition-all cursor-pointer truncate ${
                        tone === 'polite'
                          ? 'bg-success-fill/20 text-success-text border-success-border shadow-xs'
                          : 'bg-base-surface-2 text-text-secondary border-border hover:text-text-primary'
                      }`}
                      title="Kibar & Samimi Hatırlatma"
                    >
                      Kibar Hatırlatma
                    </button>
                    <button
                      type="button"
                      onClick={() => setTone('formal')}
                      className={`p-2 rounded-xl border text-[11px] font-bold transition-all cursor-pointer truncate ${
                        tone === 'formal'
                          ? 'bg-info-fill/20 text-info-text border-info-border shadow-xs'
                          : 'bg-base-surface-2 text-text-secondary border-border hover:text-text-primary'
                      }`}
                      title="Resmi Muhasebe & Finans Bildirimi"
                    >
                      Resmi Muhasebe
                    </button>
                    <button
                      type="button"
                      onClick={() => setTone('urgent')}
                      className={`p-2 rounded-xl border text-[11px] font-bold transition-all cursor-pointer truncate ${
                        tone === 'urgent'
                          ? 'bg-danger-fill/20 text-danger-text border-danger-border shadow-xs'
                          : 'bg-base-surface-2 text-text-secondary border-border hover:text-text-primary'
                      }`}
                      title="Acil / Vadesi Aşılmış İhbar"
                    >
                      Acil / İhbar
                    </button>
                  </div>
                </div>

              </div>

              {/* ADDITIONAL OPTIONS & CUSTOM NOTE */}
              <div className="p-3.5 rounded-2xl bg-base-surface-2 border border-border space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeIban}
                      onChange={(e) => setIncludeIban(e.target.checked)}
                      className="rounded border-border text-info-fill focus:ring-0 cursor-pointer"
                    />
                    <span className="font-semibold text-text-primary">Kuveyt Türk IBAN Bilgilerini Ekle</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeLastOrder}
                      onChange={(e) => setIncludeLastOrder(e.target.checked)}
                      className="rounded border-border text-info-fill focus:ring-0 cursor-pointer"
                    />
                    <span className="font-semibold text-text-primary">Son Sipariş / Hareket Açıklamasını Ekle</span>
                  </label>
                </div>

                <div>
                  <input
                    type="text"
                    value={customNote}
                    onChange={(e) => setCustomNote(e.target.value)}
                    placeholder="Özel ek not (opsiyonel, örn: Cuma gününe kadar kapatılması durumunda %3 iskonto geçerlidir)..."
                    className="w-full px-3 py-2 bg-base-surface border border-border rounded-xl text-xs text-text-primary focus:outline-hidden focus:ring-1 focus:ring-info-border"
                  />
                </div>
              </div>

              {/* MESSAGE PREVIEW BOX */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-text-primary flex items-center space-x-2">
                    <Sparkles className="w-3.5 h-3.5 text-warning-text" />
                    <span>Hazırlanan Otomatik Mesaj Taslağı (Canlı Önizleme)</span>
                  </label>
                  
                  {channel === 'email' && (
                    <span className="text-[11px] font-mono text-text-muted truncate max-w-sm">
                      Konu: {emailSubject}
                    </span>
                  )}
                </div>

                <div className="relative">
                  <textarea
                    readOnly
                    rows={channel === 'email' ? 12 : 9}
                    value={activeMessageText}
                    className="w-full p-4 bg-base-surface-2 border border-border rounded-2xl font-mono text-xs text-text-primary leading-relaxed resize-none select-all"
                  />
                  
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-base-surface hover:bg-base-surface-2 border border-border text-xs font-bold text-text-primary flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                    title="Panoya Kopyala"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-success-text" />
                        <span className="text-success-text">Kopyalandı!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Kopyala</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {sentSuccessTrigger && (
                <div className="p-3 rounded-xl bg-success-fill/15 text-success-text border border-success-border text-xs font-bold flex items-center space-x-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{sentSuccessTrigger}</span>
                </div>
              )}

            </div>

            {/* MODAL FOOTER ACTIONS */}
            <div className="p-4 sm:px-6 border-t border-border bg-base-surface-2 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-text-muted text-center sm:text-left">
                <span>Alıcı Telefon: <strong className="text-text-primary font-mono">{currentCari.phone || 'Belirtilmedi'}</strong></span>
                {currentCari.email && <span className="ml-3">E-Posta: <strong className="text-text-primary">{currentCari.email}</strong></span>}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
                
                {/* Copy Button */}
                <button
                  onClick={handleCopy}
                  className="px-4 py-2.5 rounded-xl bg-base-surface hover:bg-base-surface-2 border border-border text-xs font-bold text-text-primary flex items-center space-x-2 transition-all cursor-pointer"
                >
                  <Copy className="w-4 h-4" />
                  <span>{copied ? 'Panoya Kopyalandı' : 'Metni Kopyala'}</span>
                </button>

                {/* Direct Channel Trigger */}
                {channel === 'whatsapp' && (
                  <button
                    onClick={handleSendWhatsAppDirect}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center space-x-2 transition-all shadow-md cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>WhatsApp ile Tek Tuşla Gönder</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                  </button>
                )}

                {channel === 'email' && (
                  <button
                    onClick={handleSendEmailDirect}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center space-x-2 transition-all shadow-md cursor-pointer"
                  >
                    <Mail className="w-4 h-4" />
                    <span>E-Posta ile Tek Tuşla Gönder</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                  </button>
                )}

                {channel === 'sms' && (
                  <button
                    onClick={handleCopy}
                    className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center space-x-2 transition-all shadow-md cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>SMS Metnini Kopyala</span>
                  </button>
                )}

              </div>
            </div>
          </>
        )}

      </div>
      </div>
    </div>
  );
}
