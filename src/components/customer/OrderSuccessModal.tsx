import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Copy, 
  Check, 
  FileText, 
  MessageCircle, 
  ArrowRight, 
  Building2, 
  MapPin, 
  Clock, 
  Sparkles, 
  X, 
  Upload, 
  ShieldCheck, 
  ShoppingBag,
  Package,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Wallet,
  Truck,
  ExternalLink,
  Info
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Order } from '../../types';
import { COMPANY_BANK_ACCOUNTS } from '../../data/bankAccounts';
import { playNotificationSound } from '../../lib/audio';
import { copyToClipboard, openWhatsAppShare, generateOrderWhatsAppMessage } from '../../utils/shareUtils';
import { formatTRY } from '../../utils/exportUtils';
import { useModalBehavior } from '../../hooks/useModalBehavior';

export interface OrderSuccessModalProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
  onGoToOrders: () => void;
  onViewPdf?: (order: Order) => void;
  onUploadReceipt?: (order: Order) => void;
  onShareWhatsApp?: (order: Order) => void;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  isOpen,
  order,
  onClose,
  onGoToOrders,
  onViewPdf,
  onUploadReceipt,
  onShareWhatsApp
}) => {
  useModalBehavior(isOpen, onClose);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showItemsAccordion, setShowItemsAccordion] = useState(false);
  const [selectedBankIndex, setSelectedBankIndex] = useState(0);

  useEffect(() => {
    if (isOpen && order) {
      // Confetti burst on open
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#059669', '#3b82f6', '#f59e0b', '#6366f1']
        });
      } catch (e) {
        // Ignore if confetti fails
      }

      // Audio notification
      try {
        playNotificationSound('success');
      } catch (e) {
        // Ignore audio errors
      }
    }
  }, [isOpen, order]);

  if (!isOpen || !order) return null;

  const handleCopy = async (text: string, fieldName: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2500);
    }
  };

  const handleWhatsAppClick = () => {
    if (onShareWhatsApp) {
      onShareWhatsApp(order);
    } else {
      const msg = generateOrderWhatsAppMessage(order);
      openWhatsAppShare({
        phone: order.customerPhone,
        message: msg
      });
    }
  };

  const getPaymentMethodLabel = (method?: string) => {
    switch (method) {
      case 'bank_transfer': return 'Banka Havalesi / EFT';
      case 'credit_card': return 'Kredi Kartı / Online Ödeme';
      case 'current_account': return 'Cari Hesap Bakiye';
      case 'on_delivery': return 'Kapıda Teslimatta Ödeme';
      default: return method || 'Belirtilmemiş';
    }
  };

  const isBankTransfer = order.paymentMethod === 'bank_transfer' || 
    (order.notes && order.notes.toLowerCase().includes('havale')) ||
    (!order.paymentMethod);

  const activeBank = COMPANY_BANK_ACCOUNTS[selectedBankIndex] || COMPANY_BANK_ACCOUNTS[0];

  const formattedDate = order.createdAt 
    ? new Date(order.createdAt).toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : new Date().toLocaleDateString('tr-TR');

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md p-3 sm:p-4 md:p-6 animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-success-title"
    >
      <div className="min-h-full flex items-center justify-center py-4 sm:py-6">
        <div 
          className="bg-base-surface text-text-primary rounded-3xl border border-border shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden relative animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Subtle decorative top glow */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-blue-500" />

        {/* Modal Close Button */}
        <button
          onClick={onClose}
          aria-label="Kapat"
          className="absolute top-4 right-4 z-10 p-2 rounded-full text-text-secondary hover:text-text-primary hover:bg-base-surface-3 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 custom-scrollbar">
          
          {/* Top Hero Section with Animated Celebration */}
          <div className="text-center pt-2">
            <div className="relative inline-flex items-center justify-center mb-4">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl animate-pulse" />
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <CheckCircle2 className="w-9 h-9 sm:w-11 sm:h-11 stroke-[2.2]" />
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Sipariş Başarıyla Alındı</span>
            </div>

            <h2 id="order-success-title" className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
              Teşekkürler, Siparişiniz Kaydedildi!
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary max-w-md mx-auto mt-1.5">
              Siparişiniz Alpha Teknik operasyon sistemine aktarıldı. Depo ve lojistik ekibimiz hazırlık sürecini başlattı.
            </p>
          </div>

          {/* Order Reference Card */}
          <div className="bg-base-surface-2 rounded-2xl border border-border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-text-secondary tracking-wider uppercase">
                Sipariş Numarası
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base sm:text-lg font-bold text-brand-600 dark:text-brand-400">
                  {order.orderNumber}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(order.orderNumber, 'orderNumber')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-base-surface border border-border hover:bg-base-surface-3 transition-colors text-text-primary cursor-pointer"
                  title="Sipariş Numarasını Kopyala"
                >
                  {copiedField === 'orderNumber' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Kopyalandı!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-text-secondary" />
                      <span>Kopyala</span>
                    </>
                  )}
                </button>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-text-secondary pt-0.5">
                <Clock className="w-3.5 h-3.5" />
                <span>{formattedDate}</span>
              </div>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 border-t sm:border-t-0 pt-3 sm:pt-0 border-border/60">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>Onay Bekliyor</span>
              </span>
              <span className="text-[11px] text-text-secondary flex items-center gap-1">
                <Truck className="w-3 h-3 text-brand-500" />
                <span>Hızlı Sevkiyat & Sevk</span>
              </span>
            </div>
          </div>

          {/* 3-Column Key Metrics Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Metric 1: Total Price */}
            <div className="bg-base-surface-2/70 rounded-2xl border border-border p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-text-secondary mb-1">
                <span className="text-xs font-medium">Toplam Tutar</span>
                <Wallet className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {order.pricingVerified === false ? 'Onayda netleşecek' : formatTRY(order.total)}
              </div>
              <span className="text-[11px] text-text-secondary mt-0.5">
                {order.items?.length || 0} Kalem Ürün • KDV Dahil
              </span>
            </div>

            {/* Metric 2: Payment Method */}
            <div className="bg-base-surface-2/70 rounded-2xl border border-border p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-text-secondary mb-1">
                <span className="text-xs font-medium">Ödeme Şekli</span>
                <CreditCard className="w-4 h-4 text-brand-500" />
              </div>
              <div className="text-sm font-bold text-text-primary line-clamp-1">
                {getPaymentMethodLabel(order.paymentMethod)}
              </div>
              <span className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                {order.paymentMethod === 'bank_transfer' ? 'Dekont / EFT Bekleniyor' : 'İşlem Alındı'}
              </span>
            </div>

            {/* Metric 3: Delivery Location */}
            <div className="bg-base-surface-2/70 rounded-2xl border border-border p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-text-secondary mb-1">
                <span className="text-xs font-medium">Teslimat Adresi</span>
                <MapPin className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-sm font-semibold text-text-primary line-clamp-1" title={order.customerAddress}>
                {order.constructionSiteName ? `Şantiye: ${order.constructionSiteName}` : order.customerAddress || 'Adres Kayıtlı'}
              </div>
              <span className="text-[11px] text-text-secondary mt-0.5">
                {order.customerName}
              </span>
            </div>
          </div>

          {/* Conditional Bank Transfer / EFT Details Box */}
          {isBankTransfer && (
            <div className="bg-brand-500/5 rounded-2xl border border-brand-500/20 p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-text-primary">
                      Banka Havalesi / EFT Bilgileri
                    </h4>
                    <p className="text-[11px] text-text-secondary">
                      Ödemenizi aşağıdaki resmi kurumsal hesaba gönderebilirsiniz.
                    </p>
                  </div>
                </div>

                {/* Bank account selector if multiple */}
                {COMPANY_BANK_ACCOUNTS.length > 1 && (
                  <select
                    value={selectedBankIndex}
                    onChange={(e) => setSelectedBankIndex(Number(e.target.value))}
                    className="text-xs bg-base-surface border border-border rounded-lg px-2 py-1 text-text-primary focus:outline-hidden focus:ring-1 focus:ring-brand-500 cursor-pointer"
                  >
                    {COMPANY_BANK_ACCOUNTS.map((bank, idx) => (
                      <option key={bank.id || idx} value={idx}>
                        {bank.bankName}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Bank Details Container */}
              <div className="bg-base-surface rounded-xl border border-border p-3.5 space-y-2 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-border/60">
                  <span className="text-text-secondary font-medium">Banka & Şube:</span>
                  <span className="font-bold text-text-primary">
                    {activeBank.bankName} {activeBank.branchName ? `(${activeBank.branchName})` : ''}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-border/60">
                  <span className="text-text-secondary font-medium">Alıcı Ünvanı:</span>
                  <span className="font-bold text-text-primary text-[11px] sm:text-xs">
                    {activeBank.accountHolder}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                  <div className="space-y-0.5">
                    <span className="text-text-secondary font-medium block">IBAN Numarası:</span>
                    <span className="font-mono font-bold text-text-primary text-xs sm:text-sm tracking-wide">
                      {activeBank.iban}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(activeBank.iban, 'iban')}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-500/10 text-brand-600 dark:text-brand-400 hover:bg-brand-500/20 border border-brand-500/30 transition-colors cursor-pointer shrink-0"
                  >
                    {copiedField === 'iban' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Kopyalandı</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>IBAN Kopyala</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Reminder & Action Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                <div className="flex items-start gap-1.5 text-[11px] text-text-secondary">
                  <Info className="w-3.5 h-3.5 text-brand-500 shrink-0 mt-0.5" />
                  <span>
                    Açıklama alanına <strong className="text-text-primary font-mono">{order.orderNumber}</strong> yazmayı unutmayınız.
                  </span>
                </div>

                {onUploadReceipt && (
                  <button
                    type="button"
                    onClick={() => onUploadReceipt(order)}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-xs transition-all cursor-pointer shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Dekont Yükle & Bildir</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Ordered Products Accordion */}
          {order.items && order.items.length > 0 && (
            <div className="border border-border rounded-2xl overflow-hidden bg-base-surface">
              <button
                type="button"
                onClick={() => setShowItemsAccordion(!showItemsAccordion)}
                className="w-full px-4 py-3 bg-base-surface-2/60 hover:bg-base-surface-2 flex items-center justify-between transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-brand-500" />
                  <span className="text-xs sm:text-sm font-bold text-text-primary">
                    Sipariş Kalemleri ({order.items.length} Ürün)
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-text-secondary">
                  <span>{showItemsAccordion ? 'Gizle' : 'Ürünleri Göster'}</span>
                  {showItemsAccordion ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {showItemsAccordion && (
                <div className="p-3 sm:p-4 divide-y divide-border/60 max-h-60 overflow-y-auto custom-scrollbar">
                  {order.items.map((item, idx) => (
                    <div key={item.productId || idx} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs">
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <p className="font-semibold text-text-primary truncate">
                          {item.productName}
                        </p>
                        <p className="text-[11px] text-text-secondary">
                          {item.quantity} {item.unit || 'Adet'}{order.pricingVerified === false ? '' : ` × ${formatTRY(item.unitPrice)}`}
                          {item.note && <span className="ml-2 italic text-text-muted">({item.note})</span>}
                        </p>
                      </div>
                      <div className="font-bold text-text-primary shrink-0">
                        {order.pricingVerified === false ? 'Bekliyor' : formatTRY(item.totalPrice || (item.quantity * item.unitPrice))}
                      </div>
                    </div>
                  ))}

                  {/* Summary row */}
                  <div className="pt-3 mt-2 flex items-center justify-between font-bold text-xs text-text-primary">
                    <span>Toplam ({order.items.length} Kalem)</span>
                    <span className="text-emerald-600 dark:text-emerald-400 text-sm">
                      {order.pricingVerified === false ? 'Onayda netleşecek' : formatTRY(order.total)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick Sharing & PDF Actions Bar */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            {onViewPdf && (
              <button
                type="button"
                onClick={() => onViewPdf(order)}
                className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-border bg-base-surface-2 hover:bg-base-surface-3 text-xs font-semibold text-text-primary transition-colors cursor-pointer"
              >
                <FileText className="w-4 h-4 text-brand-500" />
                <span>Sipariş PDF İndir</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleWhatsAppClick}
              className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-semibold text-emerald-700 dark:text-emerald-300 transition-colors cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>WhatsApp ile Paylaş</span>
            </button>
          </div>

        </div>

        {/* Modal Bottom Actions Footer */}
        <div className="p-4 sm:p-5 bg-base-surface-2 border-t border-border flex flex-col sm:flex-row items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold text-text-secondary hover:text-text-primary hover:bg-base-surface-3 transition-colors cursor-pointer text-center"
          >
            Alışverişe Devam Et
          </button>

          <button
            type="button"
            onClick={onGoToOrders}
            className="w-full sm:w-auto px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-500/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Siparişlerime Git & Takip Et</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      </div>
    </div>
  );
};

export default OrderSuccessModal;
