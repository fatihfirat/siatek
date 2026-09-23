import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  CheckCircle2, 
  Banknote, 
  CreditCard, 
  Building2, 
  FileCheck, 
  AlertTriangle, 
  PackageCheck, 
  AlertCircle,
  ShieldCheck
} from 'lucide-react';
import type { Order, CariAccount, OrderPaymentStatus } from '../../types';
import { useModalBehavior } from '../../hooks/useModalBehavior';

export interface DeliverySettlementData {
  status: 'delivered';
  paymentStatus: OrderPaymentStatus;
  settlementChannel?: 'cash' | 'pos' | 'transfer' | 'cari';
  settlementNote?: string;
  createCariDebit?: boolean;
  cariId?: string;
  driverName?: string;
  collectedAmount?: number;
}

interface DeliverySettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  cariAccounts?: CariAccount[];
  onConfirmSettlement: (orderId: string, data: DeliverySettlementData) => Promise<void>;
  isProcessing?: boolean;
}

type SettlementOptionType = 'cash_pos' | 'cari' | 'prepaid' | 'uncollected';

export default function DeliverySettlementModal({
  isOpen,
  onClose,
  order,
  cariAccounts = [],
  onConfirmSettlement,
  isProcessing = false,
}: DeliverySettlementModalProps) {
  useModalBehavior(isOpen, onClose);

  const [selectedOption, setSelectedOption] = useState<SettlementOptionType>('cash_pos');
  const [collectionMethod, setCollectionMethod] = useState<'cash' | 'pos'>('cash');
  const [collectedAmount, setCollectedAmount] = useState<number>(0);
  const [selectedCariId, setSelectedCariId] = useState<string>('');
  const [createCariDebit, setCreateCariDebit] = useState<boolean>(true);
  const [driverName, setDriverName] = useState<string>('');
  const [settlementNote, setSettlementNote] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Automatically detect matching Cari Account or presets
  const matchedCari = useMemo(() => {
    if (!order) return undefined;
    if (order.cariId) {
      const found = cariAccounts.find(c => c.id === order.cariId);
      if (found) return found;
    }
    // Match by company name or customer name
    const orderNameNorm = (order.customerName || '').toLowerCase().trim();
    return cariAccounts.find(c => 
      (c.companyName && c.companyName.toLowerCase().includes(orderNameNorm)) || 
      (c.name && c.name.toLowerCase().includes(orderNameNorm)) ||
      (order.customerPhone && c.phone && c.phone.replace(/\D/g, '').includes(order.customerPhone.replace(/\D/g, '')))
    );
  }, [order, cariAccounts]);

  // Reset state when opening with an order
  useEffect(() => {
    if (isOpen && order) {
      setCollectedAmount(order.total || 0);
      setDriverName(order.deliveryPersonnel || 'Özmal Filo Şoförü');
      setSettlementNote('');
      setErrorMessage(null);

      // Intelligent preset detection
      if (matchedCari) {
        setSelectedCariId(matchedCari.id);
      } else if (cariAccounts.length > 0) {
        setSelectedCariId(cariAccounts[0].id);
      }

      if (order.receiptStatus === 'verified' || order.paymentMethod === 'Havale/EFT') {
        setSelectedOption('prepaid');
      } else if (order.paymentMethod === 'Cari Hesap' || matchedCari) {
        setSelectedOption('cari');
        setCreateCariDebit(true);
      } else if (order.paymentMethod === 'Kredi Kartı') {
        setSelectedOption('cash_pos');
        setCollectionMethod('pos');
      } else {
        setSelectedOption('cash_pos');
        setCollectionMethod('cash');
      }
    }
  }, [isOpen, order, matchedCari, cariAccounts]);

  if (!isOpen || !order) return null;

  const currentSelectedCari = cariAccounts.find(c => c.id === selectedCariId) || matchedCari;

  const handleConfirm = async () => {
    setErrorMessage(null);
    let paymentStatus: OrderPaymentStatus = 'paid';
    let settlementChannel: 'cash' | 'pos' | 'transfer' | 'cari' = 'cash';
    let finalCreateCariDebit = false;
    let finalCariId: string | undefined = undefined;

    if (selectedOption === 'cash_pos') {
      paymentStatus = 'paid';
      settlementChannel = collectionMethod;
    } else if (selectedOption === 'cari') {
      paymentStatus = 'on_account';
      settlementChannel = 'cari';
      finalCreateCariDebit = createCariDebit;
      finalCariId = selectedCariId || matchedCari?.id;
      if (createCariDebit && !finalCariId) {
        setErrorMessage('Lütfen borcun işleneceği Cari Hesabı seçiniz.');
        return;
      }
    } else if (selectedOption === 'prepaid') {
      paymentStatus = 'paid';
      settlementChannel = 'transfer';
    } else if (selectedOption === 'uncollected') {
      paymentStatus = 'pending_collection';
      settlementChannel = 'cash';
    }

    const payload: DeliverySettlementData = {
      status: 'delivered',
      paymentStatus,
      settlementChannel,
      settlementNote: settlementNote.trim() || undefined,
      createCariDebit: finalCreateCariDebit,
      cariId: finalCariId,
      driverName: driverName.trim() || undefined,
      collectedAmount: (selectedOption === 'cash_pos' || selectedOption === 'prepaid') ? collectedAmount : 0,
    };

    try {
      await onConfirmSettlement(order.id, payload);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Teslimat onaylanırken bir hata oluştu.');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs p-3 sm:p-5 flex items-center justify-center animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-2xl bg-base-surface border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-text-primary"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4.5 bg-base-surface-2 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-success-fill/15 text-success-text border border-success-border flex items-center justify-center shadow-xs">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-text-primary">
                  Teslimat & Tahsilat Uzlaştırma Masası
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-bg-success text-success-text border border-success-border font-mono font-bold">
                  Kural Tabanlı Kapatma
                </span>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                Sipariş teslim edilirken tahsilat durumunu belirleyin ve ciroya işleyin.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-base-surface text-text-muted hover:text-text-primary rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 custom-scrollbar flex-1">
          {/* Order Summary Strip */}
          <div className="p-4 rounded-2xl bg-base-surface-2 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="font-mono font-bold text-sm text-text-primary">
                  {order.orderNumber}
                </span>
                <span className="text-xs text-text-secondary">
                  • {order.customerName}
                </span>
              </div>
              <p className="text-xs text-text-muted">
                {order.items?.length || 0} Kalem Ürün • Ödeme Metodu: {order.paymentMethod || 'Belirtilmedi'}
              </p>
            </div>
            <div className="text-right sm:border-l sm:border-border sm:pl-4">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                Teslim Edilecek Tutar
              </span>
              <span className="text-xl font-black text-success-text font-mono">
                {order.total.toLocaleString('tr-TR')} ₺
              </span>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-bg-danger border border-danger-border rounded-xl text-xs text-danger-text flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section: Select Settlement Rule */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block">
              1. Tahsilat Kuralı Seçimi
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Cash or POS Collection */}
              <div 
                role="button"
                tabIndex={0}
                onClick={() => setSelectedOption('cash_pos')}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSelectedOption('cash_pos')}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
                  selectedOption === 'cash_pos'
                    ? 'bg-bg-success border-success-border ring-2 ring-success-border shadow-xs'
                    : 'bg-base-surface border-border hover:border-success-border'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-xl border ${
                    selectedOption === 'cash_pos'
                      ? 'bg-success-fill text-white border-transparent'
                      : 'bg-base-surface-2 text-text-secondary border-border'
                  }`}>
                    <Banknote className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-text-primary block">
                      Kapıda / Elden Tahsil Edildi
                    </span>
                    <span className="text-[11px] text-text-muted mt-0.5 block">
                      Şoför veya vezne nakit / mobil POS ile tahsil etti. Kasa/banka cironuz artar.
                    </span>
                  </div>
                </div>
              </div>

              {/* Option 2: Cari Account Debit (B2B Açık Hesap) */}
              <div 
                role="button"
                tabIndex={0}
                onClick={() => setSelectedOption('cari')}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSelectedOption('cari')}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
                  selectedOption === 'cari'
                    ? 'bg-bg-info border-info-border ring-2 ring-info-border shadow-xs'
                    : 'bg-base-surface border-border hover:border-info-border'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-xl border ${
                    selectedOption === 'cari'
                      ? 'bg-info-fill text-white border-transparent'
                      : 'bg-base-surface-2 text-text-secondary border-border'
                  }`}>
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-bold text-text-primary block">
                        Cari Hesaba Borç Yaz
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-info-fill/20 text-info-text font-bold">
                        Açık Hesap
                      </span>
                    </div>
                    <span className="text-[11px] text-text-muted mt-0.5 block">
                      Tutar müşterinin cari hesabına borç kaydedilir. Ekstresine ve vadeli bakiyesine işlenir.
                    </span>
                  </div>
                </div>
              </div>

              {/* Option 3: Pre-paid / Bank Transfer Verified */}
              <div 
                role="button"
                tabIndex={0}
                onClick={() => setSelectedOption('prepaid')}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSelectedOption('prepaid')}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
                  selectedOption === 'prepaid'
                    ? 'bg-amber-500/10 border-amber-500/30 ring-2 ring-amber-500 shadow-xs'
                    : 'bg-base-surface border-border hover:border-amber-500/30'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-xl border ${
                    selectedOption === 'prepaid'
                      ? 'bg-amber-500 text-white border-transparent'
                      : 'bg-base-surface-2 text-text-secondary border-border'
                  }`}>
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-text-primary block">
                      Zaten Peşin / Havale İle Ödendi
                    </span>
                    <span className="text-[11px] text-text-muted mt-0.5 block">
                      Banka dekontu veya peşin ödeme sipariş öncesinde teyit edilmiş.
                    </span>
                  </div>
                </div>
              </div>

              {/* Option 4: Uncollected / Pending Payment Risk */}
              <div 
                role="button"
                tabIndex={0}
                onClick={() => setSelectedOption('uncollected')}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSelectedOption('uncollected')}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
                  selectedOption === 'uncollected'
                    ? 'bg-bg-danger border-danger-border ring-2 ring-danger-border shadow-xs'
                    : 'bg-base-surface border-border hover:border-danger-border'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-xl border ${
                    selectedOption === 'uncollected'
                      ? 'bg-danger-fill text-white border-transparent'
                      : 'bg-base-surface-2 text-text-secondary border-border'
                  }`}>
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-bold text-danger-text block">
                        ⚠️ Para Alınmadı (Açıkta)
                      </span>
                    </div>
                    <span className="text-[11px] text-text-muted mt-0.5 block">
                      Mal teslim edildi fakat para henüz alınmadı. Tabloda kırmızı risk uyarısıyla görünür.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Option Details Sub-panel */}
          <div className="p-4 rounded-2xl bg-base-surface-2 border border-border space-y-4">
            
            {/* 1. Cash / POS Sub-form */}
            {selectedOption === 'cash_pos' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text-primary">
                    Tahsilat Kanalı ve Detayları
                  </span>
                  <div className="flex items-center space-x-1 bg-base-surface p-1 rounded-xl border border-border">
                    <button
                      type="button"
                      onClick={() => setCollectionMethod('cash')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                        collectionMethod === 'cash'
                          ? 'bg-success-fill text-white shadow-2xs'
                          : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      <Banknote className="w-3.5 h-3.5" />
                      <span>Nakit Kasa</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCollectionMethod('pos')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                        collectionMethod === 'pos'
                          ? 'bg-info-fill text-white shadow-2xs'
                          : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Mobil POS / Kart</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-text-muted block mb-1">
                      Tahsil Edilen Tutar (₺)
                    </label>
                    <input
                      type="number"
                      value={collectedAmount}
                      onChange={e => setCollectedAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-base-surface border border-border rounded-xl text-sm font-mono font-bold text-text-primary focus:ring-2 focus:ring-success-border outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-text-muted block mb-1">
                      Tahsil Eden / Teslim Eden Şoför
                    </label>
                    <input
                      type="text"
                      value={driverName}
                      onChange={e => setDriverName(e.target.value)}
                      placeholder="Şoför adı..."
                      className="w-full px-3 py-2 bg-base-surface border border-border rounded-xl text-xs text-text-primary focus:ring-2 focus:ring-success-border outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 2. Cari Account Sub-form */}
            {selectedOption === 'cari' && (
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-text-muted block mb-1">
                    Borcun Kaydedileceği Müşteri Cari Hesabı
                  </label>
                  <select
                    value={selectedCariId}
                    onChange={e => setSelectedCariId(e.target.value)}
                    className="w-full px-3 py-2 bg-base-surface border border-border rounded-xl text-xs font-semibold text-text-primary focus:ring-2 focus:ring-info-border outline-none"
                  >
                    <option value="">-- Cari Kart Seçiniz --</option>
                    {cariAccounts.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.companyName || c.name} (Bakiye: {c.balance.toLocaleString('tr-TR')} ₺)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-3 bg-bg-info/30 border border-info-border rounded-xl flex items-start space-x-2.5">
                  <input
                    type="checkbox"
                    id="chk-create-debit"
                    checked={createCariDebit}
                    onChange={e => setCreateCariDebit(e.target.checked)}
                    className="mt-0.5 rounded border-border text-info-fill focus:ring-info-fill cursor-pointer"
                  />
                  <label htmlFor="chk-create-debit" className="text-xs text-text-primary cursor-pointer select-none">
                    <span className="font-bold">Otomatik Cari Borç Hareketi Oluşturulsun:</span>
                    <span className="block text-[11px] text-text-muted mt-0.5">
                      Sipariş tutarı olan <strong className="font-mono text-text-primary">{order.total.toLocaleString('tr-TR')} ₺</strong>, {currentSelectedCari?.companyName || currentSelectedCari?.name || 'seçili cari'} ekstresine teslimat borcu (Satış Faturası / İrsaliye) olarak eklenecektir.
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* 3. Pre-paid Sub-form */}
            {selectedOption === 'prepaid' && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-xs font-semibold text-text-primary">
                  <ShieldCheck className="w-4 h-4 text-amber-500" />
                  <span>Önceden Teyit Edilmiş Peşin / Havale Ödemesi</span>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  Bu sipariş için banka hesaplarımıza veya online kasaya ödeme daha önceden yansımıştır. Teslimat tamamlanarak ciro resmi olarak gerçekleşen ciroya aktarılacaktır.
                </p>
              </div>
            )}

            {/* 4. Uncollected Sub-form */}
            {selectedOption === 'uncollected' && (
              <div className="p-3 bg-bg-danger/20 border border-danger-border rounded-xl space-y-1.5">
                <div className="flex items-center space-x-2 text-xs font-bold text-danger-text">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Finansal Risk Uyarısı (Açıkta Kalan Teslimat)</span>
                </div>
                <p className="text-[11px] text-text-muted leading-relaxed">
                  Ürün müşteriye teslim edilmiş sayılacak fakat para henüz tahsil edilmediği için kasaya nakit girişi olmayacaktır. Sipariş listesinde bu sipariş <strong className="text-danger-text font-semibold">🔴 Para Alınmadı</strong> rozeti ile yanıp sönecektir. Tahsilatı daha sonra tek tıkla kapatabilirsiniz.
                </p>
              </div>
            )}

            {/* Optional Note Field */}
            <div>
              <label className="text-[11px] font-semibold text-text-muted block mb-1">
                İrsaliye / Tahsilat Notu (İsteğe Bağlı)
              </label>
              <input
                type="text"
                value={settlementNote}
                onChange={e => setSettlementNote(e.target.value)}
                placeholder="Örn: Şantiyede şantiye şefi Ali Bey'e teslim edildi..."
                className="w-full px-3 py-2 bg-base-surface border border-border rounded-xl text-xs text-text-primary focus:ring-2 focus:ring-border-strong outline-none"
              />
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="px-6 py-4 bg-base-surface-2 border-t border-border flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 bg-base-surface hover:bg-base-surface-2 text-text-secondary hover:text-text-primary border border-border rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            Vazgeç
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isProcessing}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all shadow-xs cursor-pointer ${
              selectedOption === 'uncollected'
                ? 'bg-danger-fill hover:opacity-90 text-white'
                : selectedOption === 'cari'
                ? 'bg-info-fill hover:opacity-90 text-white'
                : 'bg-success-fill hover:opacity-90 text-white'
            }`}
          >
            {isProcessing ? (
              <span>İşleniyor...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {selectedOption === 'uncollected'
                    ? 'Tahsilatsız Teslimatı Onayla'
                    : selectedOption === 'cari'
                    ? 'Cari Borcu Kaydet & Teslim Et'
                    : 'Tahsilatı Al & Teslim Et'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
