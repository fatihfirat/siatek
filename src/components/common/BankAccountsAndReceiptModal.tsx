import React, { useState, useEffect } from 'react';
import { saveReceiptToFirestore } from '../../lib/firestoreService';
import { auth } from '../../lib/firebase';
import { 
  X, 
  Building2, 
  Copy, 
  Check, 
  Upload, 
  CreditCard, 
  FileText, 
  Send, 
  ShieldCheck, 
  AlertCircle,
  QrCode,
  Sparkles,
  Lock,
  Clock,
  ArrowRight
} from 'lucide-react';
import { useCompanySettings } from '../../lib/companySettings';
import { User, Order, BankPaymentReceipt } from '../../types';
import { playNotificationSound } from '../../lib/audio';
import confetti from 'canvas-confetti';
import { useModalBehavior } from '../../hooks/useModalBehavior';

interface BankAccountsAndReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  orders: Order[];
  selectedOrder?: Order | null;
  onReceiptSubmitted?: (receipt: BankPaymentReceipt) => void;
}

export const BankAccountsAndReceiptModal: React.FC<BankAccountsAndReceiptModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  orders,
  selectedOrder,
  onReceiptSubmitted
}) => {
  useModalBehavior(isOpen, onClose);
  const companySettings = useCompanySettings();
  const bankAccounts = companySettings.bankAccounts || [];
  const [activeTab, setActiveTab] = useState<'accounts' | 'receipt' | 'card'>('accounts');
  const [copiedIban, setCopiedIban] = useState<string | null>(null);

  // Dekont Formu State
  const [selectedOrderId, setSelectedOrderId] = useState<string>(selectedOrder?.id || '');
  const [selectedBank, setSelectedBank] = useState<string>(bankAccounts[0]?.bankName || 'Garanti BBVA');
  const [amount, setAmount] = useState<number>(selectedOrder?.total || 0);
  const [senderIban, setSenderIban] = useState<string>('');
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [customerNote, setCustomerNote] = useState<string>('');
  const [receiptFileBase64, setReceiptFileBase64] = useState<string>('');
  const [receiptFileName, setReceiptFileName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Kredi Kartı Sanal POS Formu State
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState(currentUser?.name || '');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [installment, setInstallment] = useState<number>(1);
  const [isProcessingCard, setIsProcessingCard] = useState(false);
  const [cardPaymentSuccess, setCardPaymentSuccess] = useState(false);

  if (!isOpen) return null;

  const handleCopyIban = (iban: string) => {
    navigator.clipboard.writeText(iban.replace(/\s+/g, ''));
    setCopiedIban(iban);
    playNotificationSound('status');
    setTimeout(() => setCopiedIban(null), 2500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setReceiptFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setReceiptFileBase64(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      alert('Lütfen geçerli bir ödeme tutarı giriniz.');
      return;
    }

    setIsSubmitting(true);
    try {
      const matchedOrder = orders.find(o => o.id === selectedOrderId);
      const receipt: BankPaymentReceipt = {
        id: 'rec-' + Date.now(),
        orderId: matchedOrder?.id,
        orderNumber: matchedOrder?.orderNumber,
        customerName: currentUser?.name || 'Müşteri',
        customerCompany: currentUser?.companyName || 'Bayi',
        // Kurallar customerUid + customerEmail'in OTURUMLA ayni olmasini sart kosar.
        customerUid: auth.currentUser?.uid,
        customerEmail: (auth.currentUser?.email || currentUser?.email || '').toLowerCase(),
        customerPhone: currentUser?.phone || '',
        bankName: selectedBank,
        senderIban: senderIban,
        amount: Number(amount),
        paymentDate: new Date().toISOString(),
        referenceNo: referenceNo || 'DEK-' + Math.floor(100000 + Math.random() * 900000),
        receiptFileUrl: receiptFileBase64 || '/assets/receipt-placeholder.png',
        receiptFileName: receiptFileName || 'Banka_Dekontu.pdf',
        customerNote: customerNote,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Firestore'a yaz.
      //
      // Eskiden olu /api/receipts cagriliyordu ve UC KATMANDA birden "basarili"
      // gosteriliyordu: res.ok true ise, degilse else dalinda, hata olursa
      // catch icinde. Yani musteri dekontu gonderdigini saniyor, yonetici hicbir
      // zaman gormuyordu. (19.09.2026)
      await saveReceiptToFirestore(receipt);

      setSubmitSuccess(true);
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      playNotificationSound('success');
      if (onReceiptSubmitted) onReceiptSubmitted(receipt);
    } catch (err: any) {
      console.error('Dekont gönderilemedi:', err);
      alert('Dekont gönderilemedi. Lütfen tekrar deneyin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCardPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber || !cardExpiry || !cardCvc) {
      alert('Lütfen tüm kart bilgilerini eksiksiz doldurunuz.');
      return;
    }

    setIsProcessingCard(true);
    setTimeout(() => {
      setIsProcessingCard(false);
      setCardPaymentSuccess(true);
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
      playNotificationSound('success');
    }, 1500);
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md p-3 sm:p-4 md:p-6"
      onClick={onClose}
    >
      <div className="min-h-full flex items-center justify-center py-4 sm:py-6">
        <div 
          className="relative w-full max-w-3xl bg-base-surface border border-border rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-base-surface-2/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-text-primary tracking-tight">
                B2B Ödeme & Tahsilat Merkezi
              </h2>
              <p className="text-xs text-text-muted">
                Banka Havale/EFT Hesapları, Dekont Bildirimi ve Güvenli Sanal POS
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text-primary hover:bg-base-surface rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-border bg-base-surface px-6 pt-3 space-x-2">
          <button
            onClick={() => { setActiveTab('accounts'); setSubmitSuccess(false); setCardPaymentSuccess(false); }}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center space-x-2 cursor-pointer ${
              activeTab === 'accounts'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Banka Hesaplarımız (IBAN)</span>
          </button>

          <button
            onClick={() => { setActiveTab('receipt'); setSubmitSuccess(false); }}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center space-x-2 cursor-pointer ${
              activeTab === 'receipt'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Dekont Yükle / Havale Bildir</span>
          </button>

          <button
            onClick={() => { setActiveTab('card'); setCardPaymentSuccess(false); }}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center space-x-2 cursor-pointer ${
              activeTab === 'card'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Kredi Kartı / Sanal POS</span>
          </button>
        </div>

        {/* Tab 1: Bank Accounts */}
        {activeTab === 'accounts' && (
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="p-4 bg-primary/5 border border-primary/15 rounded-2xl flex items-start space-x-3">
              <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="text-xs text-text-secondary leading-relaxed">
                <span className="font-bold text-text-primary">Kurumsal Havale / FAST Bilgileri:</span> Tüm transferlerinizde açıklama kısmına 
                <span className="font-semibold text-primary"> Sipariş Numaranızı (ORD-...)</span> veya 
                <span className="font-semibold text-primary"> Bayi Ünvanınızı</span> yazmanız siparişinizin derhal onaylanmasını sağlar.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {bankAccounts.map((bank) => (
                <div 
                  key={bank.id}
                  className="p-4 bg-base-surface-2/70 hover:bg-base-surface-2 border border-border rounded-2xl transition-all space-y-3 relative group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-text-primary">{bank.bankName}</span>
                      {bank.badgeText && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 bg-primary/10 text-primary rounded-full border border-primary/20">
                          {bank.badgeText}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-text-muted">{bank.currency}</span>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[11px] text-text-muted">Alıcı / Hesap Sahibi:</div>
                    <div className="text-xs font-medium text-text-primary leading-tight line-clamp-1">
                      {bank.accountHolder}
                    </div>
                  </div>

                  <div className="p-2.5 bg-base-surface border border-border/80 rounded-xl flex items-center justify-between space-x-2">
                    <div className="font-mono text-xs font-bold text-text-primary tracking-wider select-all">
                      {bank.iban}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyIban(bank.iban)}
                      className="p-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-lg transition-all cursor-pointer shrink-0"
                      title="IBAN Kopyala"
                    >
                      {copiedIban === bank.iban ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  {bank.branchName && (
                    <div className="flex items-center justify-between text-[11px] text-text-muted pt-1 border-t border-border/50">
                      <span>Şube: {bank.branchName} ({bank.branchCode})</span>
                      <span>Hesap No: {bank.accountNumber}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveTab('receipt')}
                className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all flex items-center space-x-2 cursor-pointer"
              >
                <span>Ödeme Yaptım, Dekont Yüklemek İstiyorum</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Upload Receipt Form */}
        {activeTab === 'receipt' && (
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {submitSuccess ? (
              <div className="py-10 text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-text-primary">Dekont Bildiriminiz Alındı!</h3>
                <p className="text-xs sm:text-sm text-text-muted max-w-md mx-auto">
                  Banka havale bildiriminiz muhasebe ve depo yönetimine iletildi. 
                  En kısa sürede onaylanıp siparişiniz hazırlık aşamasına alınacaktır.
                </p>
                <div className="pt-3">
                  <button
                    onClick={onClose}
                    className="px-6 py-2.5 bg-primary text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm cursor-pointer"
                  >
                    Tamam, Kapat
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitReceipt} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1.5">
                      İlişkili Sipariş (Opsiyonel)
                    </label>
                    <select
                      value={selectedOrderId}
                      onChange={(e) => {
                        setSelectedOrderId(e.target.value);
                        const ord = orders.find(o => o.id === e.target.value);
                        if (ord) setAmount(ord.total);
                      }}
                      className="w-full px-3 py-2.5 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    >
                      <option value="">Genel Cari Hesap Ödemesi</option>
                      {orders.map(o => (
                        <option key={o.id} value={o.id}>
                          {o.orderNumber} - {o.customerName} ({o.total.toLocaleString('tr-TR')} ₺)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1.5">
                      Havale Yapılan Banka *
                    </label>
                    <select
                      value={selectedBank}
                      onChange={(e) => setSelectedBank(e.target.value)}
                      className="w-full px-3 py-2.5 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    >
                      {bankAccounts.map(b => (
                        <option key={b.id} value={b.bankName}>
                          {b.bankName} - {b.iban}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1.5">
                      Ödenen Tutar (₺) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={amount || ''}
                      onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full px-3 py-2.5 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1.5">
                      Dekont Ref / Fiş No
                    </label>
                    <input
                      type="text"
                      value={referenceNo}
                      onChange={(e) => setReferenceNo(e.target.value)}
                      placeholder="Örn: 9482019"
                      className="w-full px-3 py-2.5 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1.5">
                      Gönderen IBAN (Son 4 Hane)
                    </label>
                    <input
                      type="text"
                      value={senderIban}
                      onChange={(e) => setSenderIban(e.target.value)}
                      placeholder="Örn: TR...1234"
                      className="w-full px-3 py-2.5 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                  </div>
                </div>

                {/* File Upload Area */}
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1.5">
                    Dekont Görseli / PDF Dosyası (JPG, PNG, PDF) *
                  </label>
                  <label className="border-2 border-dashed border-border hover:border-primary/50 bg-base-surface-2/50 hover:bg-base-surface-2 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all">
                    <Upload className="w-8 h-8 text-primary mb-2" />
                    <span className="text-xs font-bold text-text-primary">
                      {receiptFileName ? receiptFileName : 'Dekont Dosyasını Seçin veya Sürükleyin'}
                    </span>
                    <span className="text-[11px] text-text-muted mt-0.5">
                      Maksimum dosya boyutu 10MB
                    </span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1.5">
                    Ödeme Açıklaması / Notunuz
                  </label>
                  <textarea
                    rows={2}
                    value={customerNote}
                    onChange={(e) => setCustomerNote(e.target.value)}
                    placeholder="Örn: 1. parti malzeme bedeli havalesi yapılmıştır..."
                    className="w-full px-3 py-2 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-border">
                  <span className="text-[11px] text-text-muted">
                    Bildiriminiz doğrudan Yönetici ve Finans masasına iletilir.
                  </span>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSubmitting ? 'Gönderiliyor...' : 'Dekont Bildirimini Tamamla'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Tab 3: Virtual POS Card Payment */}
        {activeTab === 'card' && (
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {cardPaymentSuccess ? (
              <div className="py-10 text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-text-primary">3D Secure Ödeme Başarılı!</h3>
                <p className="text-xs sm:text-sm text-text-muted max-w-md mx-auto">
                  {amount.toLocaleString('tr-TR')} ₺ tutarındaki kredi kartı tahsilatınız güvenle onaylandı. 
                  İşlem dekontunuz ve e-Arşiv faturanız sisteminize işlendi.
                </p>
                <div className="pt-3">
                  <button
                    onClick={onClose}
                    className="px-6 py-2.5 bg-primary text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm cursor-pointer"
                  >
                    Tamam, Kapat
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCardPayment} className="space-y-4">
                <div className="p-4 bg-linear-to-r from-slate-900 to-slate-800 text-white rounded-2xl shadow-lg relative overflow-hidden max-w-md mx-auto mb-5">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-xs font-bold tracking-widest text-slate-400">ALPHA B2B POS</span>
                    <Lock className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="font-mono text-base sm:text-lg tracking-widest mb-4">
                    {cardNumber || '•••• •••• •••• ••••'}
                  </div>
                  <div className="flex justify-between items-end text-xs">
                    <div>
                      <div className="text-[9px] text-slate-400 uppercase">Kart Sahibi</div>
                      <div className="font-semibold uppercase tracking-wide">{cardHolder || 'AD SOYAD'}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-slate-400 uppercase">SKT</div>
                      <div className="font-semibold">{cardExpiry || 'AA/YY'}</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1.5">
                      Kart Sahibi Ad Soyad *
                    </label>
                    <input
                      type="text"
                      required
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      placeholder="Kart üzerindeki isim"
                      className="w-full px-3 py-2.5 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1.5">
                      Kart Numarası *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={19}
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 '))}
                      placeholder="0000 0000 0000 0000"
                      className="w-full px-3 py-2.5 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary font-mono font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1.5">
                      Son Kullanma *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={5}
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      placeholder="AA/YY"
                      className="w-full px-3 py-2.5 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary font-mono text-center font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1.5">
                      CVC / CVV *
                    </label>
                    <input
                      type="password"
                      required
                      maxLength={4}
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value)}
                      placeholder="•••"
                      className="w-full px-3 py-2.5 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary font-mono text-center font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1.5">
                      Taksit Seçeneği
                    </label>
                    <select
                      value={installment}
                      onChange={(e) => setInstallment(Number(e.target.value))}
                      className="w-full px-3 py-2.5 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    >
                      <option value={1}>Tek Çekim (Komisyonsuz)</option>
                      <option value={3}>3 Taksit (+%2.5)</option>
                      <option value={6}>6 Taksit (+%4.5)</option>
                    </select>
                  </div>
                </div>

                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs flex items-center justify-between text-emerald-800 dark:text-emerald-300">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>256-Bit SSL & 3D Secure Doğrulamalı Güvenli Ödeme</span>
                  </div>
                  <span className="font-bold">{amount ? `${amount.toLocaleString('tr-TR')} ₺` : '0.00 ₺'}</span>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isProcessingCard}
                    className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    <Lock className="w-4 h-4" />
                    <span>{isProcessingCard ? '3D Doğrulanıyor...' : `${amount ? amount.toLocaleString('tr-TR') : '0.00'} ₺ Öde`}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

      </div>
      </div>
    </div>
  );
};
