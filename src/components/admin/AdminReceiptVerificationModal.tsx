import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileCheck, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Eye, 
  Building2, 
  User as UserIcon, 
  ArrowUpRight, 
  Download,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Search,
  Filter
} from 'lucide-react';
import { BankPaymentReceipt, Order } from '../../types';
import { playNotificationSound } from '../../lib/audio';
import confetti from 'canvas-confetti';
import { useModalBehavior } from '../../hooks/useModalBehavior';

interface AdminReceiptVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipts?: BankPaymentReceipt[];
  orders?: Order[];
  onApproveReceipt?: (receiptId: string, orderId?: string, adminNote?: string) => Promise<void>;
  onRejectReceipt?: (receiptId: string, adminNote: string) => Promise<void>;
  onReceiptApproved?: () => void;
}

export const AdminReceiptVerificationModal: React.FC<AdminReceiptVerificationModalProps> = ({
  isOpen,
  onClose,
  receipts = [],
  orders = [],
  onApproveReceipt,
  onRejectReceipt,
  onReceiptApproved
}) => {
  const [selectedReceipt, setSelectedReceipt] = useState<BankPaymentReceipt | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [searchTerm, setSearchTerm] = useState('');

  // Synchronize when opening
  useEffect(() => {
    if (isOpen && receipts.length > 0) {
      const pendingOne = receipts.find(r => r.status === 'pending');
      setSelectedReceipt(pendingOne || receipts[0]);
    }
  }, [isOpen, receipts]);

  const filteredReceipts = receipts.filter(r => {
    if (!r) return false;
    const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
    const matchesSearch = 
      (r.customerCompany || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.orderNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.bankName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.referenceNo || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const pendingCount = receipts.filter(r => r && r.status === 'pending').length;

  const handleApprove = async (receipt: BankPaymentReceipt) => {
    if (!onApproveReceipt) return;
    setIsProcessing(true);
    try {
      await onApproveReceipt(receipt.id, receipt.orderId, adminNote);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });
      playNotificationSound('success');
      if (onReceiptApproved) onReceiptApproved();
      setSelectedReceipt(null);
      setAdminNote('');
    } catch (e: any) {
      alert('Onaylama sırasında hata oluştu: ' + (e?.message || e));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (receipt: BankPaymentReceipt) => {
    if (!onRejectReceipt) return;
    if (!adminNote.trim()) {
      alert('Lütfen reddetme gerekçesini admin notu alanına yazınız.');
      return;
    }
    setIsProcessing(true);
    try {
      await onRejectReceipt(receipt.id, adminNote);
      playNotificationSound('status');
      setSelectedReceipt(null);
      setAdminNote('');
    } catch (e: any) {
      alert('Reddetme sırasında hata oluştu: ' + (e?.message || e));
    } finally {
      setIsProcessing(false);
    }
  };

  useModalBehavior(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md p-3 sm:p-4 md:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div className="min-h-full flex items-center justify-center py-4 sm:py-6">
        <div 
          className="relative w-full max-w-5xl bg-base-surface border border-border rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-base-surface-2/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold text-text-primary tracking-tight">
                  Banka Dekontları & Havale Onay Masası
                </h2>
                {pendingCount > 0 && (
                  <span className="px-2.5 py-0.5 bg-amber-500 text-white rounded-full text-[11px] font-bold animate-pulse">
                    {pendingCount} Bekleyen
                  </span>
                )}
              </div>
              <p className="text-xs text-text-muted">
                Müşterilerin yüklediği havale/EFT dekontlarını inceleyip tek tıkla sipariş onayına dönüştürün.
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

        {/* Filters and Search Bar */}
        <div className="p-4 border-b border-border bg-base-surface flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Müşteri, şirket, sipariş no veya ref ara..."
              className="w-full pl-9 pr-3 py-2 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  filterStatus === st
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-base-surface-2 text-text-muted hover:text-text-primary'
                }`}
              >
                {st === 'all' && 'Tümü'}
                {st === 'pending' && `Bekleyenler (${receipts.filter(r => r.status === 'pending').length})`}
                {st === 'approved' && 'Onaylananlar'}
                {st === 'rejected' && 'Reddedilenler'}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 max-h-[65vh] overflow-y-auto">
          
          {/* List of Receipts */}
          <div className="lg:col-span-1 space-y-3">
            {filteredReceipts.length === 0 ? (
              <div className="p-8 text-center bg-base-surface-2/40 border border-dashed border-border rounded-2xl">
                <FileCheck className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-50" />
                <p className="text-xs text-text-muted">Bu filtreye uygun dekont bulunamadı.</p>
              </div>
            ) : (
              filteredReceipts.map((rec) => (
                <div
                  key={rec.id}
                  onClick={() => setSelectedReceipt(rec)}
                  className={`p-3.5 border rounded-2xl transition-all cursor-pointer space-y-2 ${
                    selectedReceipt?.id === rec.id
                      ? 'border-primary bg-primary/5 shadow-xs'
                      : 'border-border bg-base-surface-2/50 hover:bg-base-surface-2'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-primary line-clamp-1">
                      {rec.customerCompany || rec.customerName}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      rec.status === 'pending' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' :
                      rec.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' :
                      'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                    }`}>
                      {rec.status === 'pending' ? 'Bekliyor' : rec.status === 'approved' ? 'Onaylandı' : 'Reddedildi'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-primary">
                      {rec.amount.toLocaleString('tr-TR')} ₺
                    </span>
                    <span className="text-[11px] text-text-muted">{rec.bankName}</span>
                  </div>

                  {rec.orderNumber && (
                    <div className="text-[11px] text-text-muted font-mono flex items-center space-x-1">
                      <span>Sipariş:</span>
                      <span className="font-semibold text-text-primary">{rec.orderNumber}</span>
                    </div>
                  )}

                  <div className="text-[10px] text-text-muted">
                    {new Date(rec.paymentDate || rec.createdAt).toLocaleDateString('tr-TR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Detailed Inspector View */}
          <div className="lg:col-span-2">
            {selectedReceipt ? (
              <div className="p-5 bg-base-surface-2/60 border border-border rounded-2xl space-y-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-text-primary">
                      {selectedReceipt.customerCompany || selectedReceipt.customerName}
                    </h3>
                    <p className="text-xs text-text-muted">
                      {selectedReceipt.customerPhone} • {selectedReceipt.customerEmail}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-extrabold text-primary">
                      {selectedReceipt.amount.toLocaleString('tr-TR')} ₺
                    </div>
                    <div className="text-[11px] text-text-muted font-medium">{selectedReceipt.bankName}</div>
                  </div>
                </div>

                {/* Information Grid */}
                <div className="grid grid-cols-2 gap-3 p-3.5 bg-base-surface border border-border rounded-xl text-xs">
                  <div>
                    <span className="text-text-muted text-[11px]">Sipariş Referansı:</span>
                    <p className="font-semibold text-text-primary font-mono">{selectedReceipt.orderNumber || 'Genel Cari Tahsilat'}</p>
                  </div>
                  <div>
                    <span className="text-text-muted text-[11px]">Dekont / Ref No:</span>
                    <p className="font-semibold text-text-primary font-mono">{selectedReceipt.referenceNo || '-'}</p>
                  </div>
                  <div>
                    <span className="text-text-muted text-[11px]">Gönderen IBAN:</span>
                    <p className="font-semibold text-text-primary font-mono">{selectedReceipt.senderIban || 'Belirtilmedi'}</p>
                  </div>
                  <div>
                    <span className="text-text-muted text-[11px]">Bildirim Tarihi:</span>
                    <p className="font-semibold text-text-primary">
                      {new Date(selectedReceipt.createdAt).toLocaleString('tr-TR')}
                    </p>
                  </div>
                </div>

                {selectedReceipt.customerNote && (
                  <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-xs">
                    <span className="font-bold text-amber-700 dark:text-amber-400">Müşteri Notu: </span>
                    <span className="text-text-secondary">{selectedReceipt.customerNote}</span>
                  </div>
                )}

                {/* Receipt Image / Document Preview */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-text-secondary">
                    <span>Dekont Belgesi / Önizleme</span>
                    {selectedReceipt.receiptFileUrl && (
                      <a 
                        href={selectedReceipt.receiptFileUrl} 
                        download={selectedReceipt.receiptFileName || 'dekont.png'}
                        className="text-primary hover:underline flex items-center space-x-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>İndir</span>
                      </a>
                    )}
                  </div>
                  <div className="border border-border bg-base-surface rounded-xl p-3 flex items-center justify-center max-h-60 overflow-hidden">
                    {selectedReceipt.receiptFileUrl && (selectedReceipt.receiptFileUrl.startsWith('data:image') || selectedReceipt.receiptFileUrl.endsWith('.png') || selectedReceipt.receiptFileUrl.endsWith('.jpg')) ? (
                      <img 
                        src={selectedReceipt.receiptFileUrl} 
                        alt="Dekont" 
                        className="max-h-52 object-contain rounded-lg shadow-xs"
                      />
                    ) : (
                      <div className="p-6 text-center space-y-2">
                        <FileCheck className="w-10 h-10 text-primary mx-auto" />
                        <span className="text-xs font-semibold text-text-primary block">
                          {selectedReceipt.receiptFileName || 'PDF Dekont Dosyası'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions & Decision */}
                <div className="space-y-3 pt-2 border-t border-border">
                  <label className="block text-xs font-bold text-text-secondary">
                    Yönetici Onay / Red Notu (Müşteriye İletilir)
                  </label>
                  <input
                    type="text"
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Örn: Garanti Bankası hesabımızda tutar doğrulandı, siparişiniz hazırlanıyor."
                    className="w-full px-3 py-2 bg-base-surface border border-border rounded-xl text-xs text-text-primary focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />

                  <div className="flex items-center justify-end space-x-3">
                    <button
                      type="button"
                      disabled={isProcessing || selectedReceipt.status === 'rejected'}
                      onClick={() => handleReject(selectedReceipt)}
                      className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/20 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reddet</span>
                    </button>

                    <button
                      type="button"
                      disabled={isProcessing || selectedReceipt.status === 'approved'}
                      onClick={() => handleApprove(selectedReceipt)}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isProcessing ? 'İşleniyor...' : 'Onayla & Siparişi Hazırlığa Al'}</span>
                    </button>
                  </div>
                </div>

              </div>
            ) : (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center p-8 bg-base-surface-2/30 border border-dashed border-border rounded-2xl text-center">
                <FileCheck className="w-12 h-12 text-text-muted mb-3 opacity-40" />
                <h4 className="text-xs font-bold text-text-primary mb-1">Dekont Seçilmedi</h4>
                <p className="text-[11px] text-text-muted max-w-xs">
                  Detayları, görseli incelemek ve onaylamak için soldaki listeden bir dekont kaydına tıklayın.
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  </div>
  );
};
