import { useState, useEffect, FormEvent } from 'react';
import { CariAccount, CariTransactionType } from '../../types';
import { 
  X, 
  ArrowDownRight, 
  ArrowUpRight, 
  Calendar, 
  FileText, 
  CreditCard, 
  Check, 
  AlertCircle, 
  SlidersHorizontal,
  DollarSign,
  Sparkles,
  Calculator,
  RotateCcw
} from 'lucide-react';

export type TransactionModalMode = 'payment' | 'debt' | 'adjust';

import { useModalBehavior } from '../../hooks/useModalBehavior';

interface CariTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  cari: CariAccount;
  defaultMode?: TransactionModalMode;
  defaultDirection?: 'debit' | 'credit';
  onSave: (data: {
    type: CariTransactionType;
    amount: number;
    direction: 'debit' | 'credit';
    description: string;
    documentNo?: string;
    paymentMethod?: 'Nakit' | 'Havale/EFT' | 'Kredi Kartı' | 'Çek/Senet' | 'Cari Hesap';
    date: string;
    dueDate?: string;
  }) => Promise<void>;
}

export default function CariTransactionModal({
  isOpen,
  onClose,
  cari,
  defaultMode = 'payment',
  defaultDirection = 'credit',
  onSave,
}: CariTransactionModalProps) {
  const [activeMode, setActiveMode] = useState<TransactionModalMode>(
    defaultMode || (defaultDirection === 'debit' ? 'debt' : 'payment')
  );
  
  const [direction, setDirection] = useState<'debit' | 'credit'>(
    defaultDirection || (defaultMode === 'debt' ? 'debit' : 'credit')
  );
  
  const [type, setType] = useState<CariTransactionType>('payment_received');
  const [amount, setAmount] = useState('');
  const [targetBalance, setTargetBalance] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [documentNo, setDocumentNo] = useState(`EVR-${Math.floor(10000 + Math.random() * 90000)}`);
  const [paymentMethod, setPaymentMethod] = useState<'Nakit' | 'Havale/EFT' | 'Kredi Kartı' | 'Çek/Senet' | 'Cari Hesap'>('Havale/EFT');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initialMode = defaultMode || (defaultDirection === 'debit' ? 'debt' : 'payment');
    setActiveMode(initialMode);
    
    if (initialMode === 'payment') {
      setDirection('credit');
      setType('payment_received');
      setPaymentMethod('Havale/EFT');
      setDescription('Banka Havalesi / Tahsilat Girişi');
      setAmount('');
    } else if (initialMode === 'debt') {
      setDirection('debit');
      setType('sale_invoice');
      setPaymentMethod('Cari Hesap');
      setDescription('Satış Faturası / Mal Teslim Borçlandırması');
      const due = new Date();
      due.setDate(due.getDate() + (cari.paymentTermDays || 30));
      setDueDate(due.toISOString().split('T')[0]);
      setAmount('');
    } else if (initialMode === 'adjust') {
      setTargetBalance(cari.balance.toString());
      setDescription('Cari Bakiye Düzeltme & Mutabakat Güncellemesi');
      setPaymentMethod('Cari Hesap');
      setAmount('');
    }

    setDate(new Date().toISOString().split('T')[0]);
    setDocumentNo(`EVR-${Math.floor(10000 + Math.random() * 90000)}`);
    setError(null);
  }, [defaultMode, defaultDirection, cari, isOpen]);

  useModalBehavior(isOpen, onClose);

  if (!isOpen) return null;

  const handleModeSwitch = (mode: TransactionModalMode) => {
    setActiveMode(mode);
    setError(null);

    if (mode === 'payment') {
      setDirection('credit');
      setType('payment_received');
      setPaymentMethod('Havale/EFT');
      setDescription('Banka Havalesi / Tahsilat Girişi');
      setAmount('');
    } else if (mode === 'debt') {
      setDirection('debit');
      setType('sale_invoice');
      setPaymentMethod('Cari Hesap');
      setDescription('Satış Faturası / Mal Teslim Borçlandırması');
      const due = new Date();
      due.setDate(due.getDate() + (cari.paymentTermDays || 30));
      setDueDate(due.toISOString().split('T')[0]);
      setAmount('');
    } else if (mode === 'adjust') {
      setTargetBalance(cari.balance.toString());
      setDescription('Cari Bakiye Düzeltme & Mutabakat Güncellemesi');
      setPaymentMethod('Cari Hesap');
      setAmount('');
    }
  };

  // Quick Preset Actions
  const handleQuickAmount = (val: number) => {
    if (activeMode === 'adjust') {
      setTargetBalance(val.toString());
    } else {
      setAmount(val.toString());
    }
  };

  const handleFullPayoff = () => {
    if (cari.balance > 0) {
      if (activeMode === 'adjust') {
        setTargetBalance('0');
      } else {
        setActiveMode('payment');
        setDirection('credit');
        setType('payment_received');
        setAmount(cari.balance.toString());
        setDescription('Tüm Bakiye Kapatma & Hesap Sıfırlama Tahsilatı');
      }
    }
  };

  const handleFiftyPercent = () => {
    if (cari.balance > 0) {
      const half = Math.round((cari.balance / 2) * 100) / 100;
      if (activeMode === 'adjust') {
        setTargetBalance(half.toString());
      } else {
        setActiveMode('payment');
        setDirection('credit');
        setAmount(half.toString());
        setDescription('%50 Kısmi Ara Ödeme Tahsilatı');
      }
    }
  };

  // Calculate Projected Balance
  let projectedBalance = cari.balance;
  let computedTxAmount = Number(amount) || 0;
  let computedTxDirection: 'debit' | 'credit' = direction;
  let computedTxType: CariTransactionType = type;

  if (activeMode === 'adjust') {
    const target = Number(targetBalance);
    if (!isNaN(target)) {
      const diff = target - cari.balance;
      if (diff > 0) {
        // Needs more debit (borç eklenecek)
        computedTxDirection = 'debit';
        computedTxAmount = Math.abs(diff);
        computedTxType = 'opening_balance';
      } else if (diff < 0) {
        // Needs credit (alacak/mahsup eklenecek)
        computedTxDirection = 'credit';
        computedTxAmount = Math.abs(diff);
        computedTxType = 'return_credit';
      } else {
        computedTxAmount = 0;
      }
      projectedBalance = target;
    }
  } else {
    if (direction === 'credit') {
      projectedBalance = cari.balance - computedTxAmount;
    } else {
      projectedBalance = cari.balance + computedTxAmount;
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    let finalAmount = computedTxAmount;
    let finalDirection = computedTxDirection;
    let finalType = computedTxType;

    if (activeMode === 'adjust') {
      const target = Number(targetBalance);
      if (isNaN(target)) {
        setError('Lütfen geçerli bir hedef bakiye tutarı giriniz.');
        return;
      }
      const diff = target - cari.balance;
      if (Math.abs(diff) < 0.01) {
        setError('Hedef bakiye mevcut bakiye ile aynıdır, değişiklik yapılmadı.');
        return;
      }
      finalAmount = Math.round(Math.abs(diff) * 100) / 100;
      finalDirection = diff > 0 ? 'debit' : 'credit';
      finalType = diff > 0 ? 'opening_balance' : 'return_credit';
    } else {
      finalAmount = Number(amount);
      if (!finalAmount || finalAmount <= 0) {
        setError('Lütfen sıfırdan büyük geçerli bir tutar giriniz.');
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSave({
        type: finalType,
        amount: finalAmount,
        direction: finalDirection,
        description: description.trim() || (finalDirection === 'credit' ? 'Tahsilat / Ödeme' : 'Borç / Fatura Girişi'),
        documentNo: documentNo.trim(),
        paymentMethod,
        date,
        dueDate: dueDate || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'İşlem kaydedilirken bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md p-3 sm:p-4 md:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div className="min-h-full flex items-center justify-center py-4 sm:py-6">
        <div 
          className="relative bg-base-surface border border-border rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95"
          onClick={(e) => e.stopPropagation()}
        >
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-base-surface-2">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-2xl border ${
              activeMode === 'payment'
                ? 'bg-success-fill/15 text-success-text border-success-border'
                : activeMode === 'debt'
                ? 'bg-danger-fill/15 text-danger-text border-danger-border'
                : 'bg-info-fill/15 text-info-text border-info-border'
            }`}>
              {activeMode === 'payment' && <ArrowDownRight className="w-5 h-5" />}
              {activeMode === 'debt' && <ArrowUpRight className="w-5 h-5" />}
              {activeMode === 'adjust' && <SlidersHorizontal className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary flex items-center space-x-2">
                <span>
                  {activeMode === 'payment' && 'Yeni Ödeme & Tahsilat Ekle'}
                  {activeMode === 'debt' && 'Yeni Borçlandırma & Fatura Ekle'}
                  {activeMode === 'adjust' && 'Hızlı Borç / Bakiye Güncelleme'}
                </span>
              </h2>
              <p className="text-xs text-text-secondary mt-0.5">
                <span className="font-mono font-semibold text-text-primary">{cari.code}</span> - {cari.companyName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-base-surface text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3-Way Mode Switcher Tabs */}
        <div className="p-4 bg-base-surface-2/60 border-b border-border">
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-base-surface rounded-2xl border border-border">
            <button
              type="button"
              onClick={() => handleModeSwitch('payment')}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                activeMode === 'payment'
                  ? 'bg-success-fill text-base shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>Ödeme Al</span>
            </button>

            <button
              type="button"
              onClick={() => handleModeSwitch('debt')}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                activeMode === 'debt'
                  ? 'bg-danger-fill text-base shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Borç Ekle</span>
            </button>

            <button
              type="button"
              onClick={() => handleModeSwitch('adjust')}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                activeMode === 'adjust'
                  ? 'bg-info-fill text-base shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Borç Güncelle</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-2xl bg-danger-fill/15 border border-danger-border text-danger-text text-xs flex items-center space-x-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Balance & Projected Balance Visual Card */}
          <div className="p-4 rounded-2xl bg-base-surface-2 border border-border">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[11px] font-semibold text-text-secondary block">Mevcut Bakiye</span>
                <div className="mt-1 flex items-baseline space-x-1.5">
                  <span className={`text-lg font-mono font-bold ${
                    cari.balance > 0 ? 'text-danger-text' : cari.balance < 0 ? 'text-info-text' : 'text-success-text'
                  }`}>
                    {cari.balance > 0 
                      ? `${cari.balance.toLocaleString('tr-TR')} ₺` 
                      : cari.balance < 0 
                      ? `${Math.abs(cari.balance).toLocaleString('tr-TR')} ₺` 
                      : '0,00 ₺'}
                  </span>
                  <span className="text-[10px] text-text-muted">
                    {cari.balance > 0 ? '(Borçlu)' : cari.balance < 0 ? '(Alacaklı)' : '(Kapalı)'}
                  </span>
                </div>
              </div>

              <div className="text-right border-l border-border pl-4">
                <span className="text-[11px] font-semibold text-text-secondary block">İşlem Sonrası Net Bakiye</span>
                <div className="mt-1 flex items-baseline justify-end space-x-1.5">
                  <span className={`text-lg font-mono font-black ${
                    projectedBalance > 0 ? 'text-danger-text' : projectedBalance < 0 ? 'text-info-text' : 'text-success-text'
                  }`}>
                    {projectedBalance > 0 
                      ? `${projectedBalance.toLocaleString('tr-TR')} ₺` 
                      : projectedBalance < 0 
                      ? `${Math.abs(projectedBalance).toLocaleString('tr-TR')} ₺` 
                      : '0,00 ₺'}
                  </span>
                  <span className="text-[10px] text-text-muted">
                    {projectedBalance > 0 ? '(Borçlu)' : projectedBalance < 0 ? '(Alacaklı)' : '(Sıfırlandı)'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Amount / Target Input with Big Typography */}
          {activeMode === 'adjust' ? (
            <div className="p-4 rounded-2xl bg-info-fill/5 border border-info-border">
              <label className="block text-xs font-bold text-text-primary mb-1">
                Hedef Net Bakiye / Yeni Borç Tutarı (₺) *
              </label>
              <p className="text-[11px] text-text-secondary mb-2">
                Cari bakiyesini doğrudan ayarlayın. Sistem aradaki farkı otomatik mutabakat hareketi olarak kaydeder.
              </p>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  required
                  autoFocus
                  placeholder="0.00"
                  value={targetBalance}
                  onChange={e => setTargetBalance(e.target.value)}
                  className="w-full text-2xl font-mono font-bold px-4 py-2.5 bg-base-surface border border-border rounded-xl text-text-primary focus:border-info-border outline-none shadow-xs"
                />
                <span className="absolute right-4 top-3.5 text-xs font-bold text-text-muted">TRY (₺)</span>
              </div>
            </div>
          ) : (
            <div className={`p-4 rounded-2xl border ${
              activeMode === 'payment'
                ? 'bg-success-fill/5 border-success-border'
                : 'bg-danger-fill/5 border-danger-border'
            }`}>
              <label className="block text-xs font-bold text-text-primary mb-1">
                {activeMode === 'payment' ? 'Tahsil Edilen Tutar (₺) *' : 'Borçlandırılan Tutar (₺) *'}
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  autoFocus
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full text-2xl font-mono font-bold px-4 py-2.5 bg-base-surface border border-border rounded-xl text-text-primary focus:border-info-border outline-none shadow-xs"
                />
                <span className="absolute right-4 top-3.5 text-xs font-bold text-text-muted">TRY (₺)</span>
              </div>
            </div>
          )}

          {/* Quick Preset Buttons */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-text-secondary flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5 text-warning-text" />
                <span>Hızlı Tutar Seçenekleri:</span>
              </span>
              {cari.balance > 0 && (
                <button
                  type="button"
                  onClick={handleFullPayoff}
                  className="text-[11px] font-bold text-success-text hover:underline cursor-pointer"
                >
                  Bakiyeyi Tam Kapat ({cari.balance.toLocaleString('tr-TR')} ₺) ➔
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {cari.balance > 0 && (
                <>
                  <button
                    type="button"
                    onClick={handleFullPayoff}
                    className="px-2.5 py-1 rounded-lg bg-base-surface-2 hover:bg-success-fill/15 hover:text-success-text border border-border text-xs font-medium text-text-primary transition-all cursor-pointer"
                  >
                    Tüm Bakiye ({cari.balance.toLocaleString('tr-TR')} ₺)
                  </button>
                  <button
                    type="button"
                    onClick={handleFiftyPercent}
                    className="px-2.5 py-1 rounded-lg bg-base-surface-2 hover:bg-info-fill/15 hover:text-info-text border border-border text-xs font-medium text-text-primary transition-all cursor-pointer"
                  >
                    %50 ({Math.round(cari.balance / 2).toLocaleString('tr-TR')} ₺)
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => handleQuickAmount(1000)}
                className="px-2.5 py-1 rounded-lg bg-base-surface-2 hover:bg-base-surface border border-border text-xs font-mono text-text-secondary hover:text-text-primary transition-all cursor-pointer"
              >
                1.000 ₺
              </button>
              <button
                type="button"
                onClick={() => handleQuickAmount(5000)}
                className="px-2.5 py-1 rounded-lg bg-base-surface-2 hover:bg-base-surface border border-border text-xs font-mono text-text-secondary hover:text-text-primary transition-all cursor-pointer"
              >
                5.000 ₺
              </button>
              <button
                type="button"
                onClick={() => handleQuickAmount(10000)}
                className="px-2.5 py-1 rounded-lg bg-base-surface-2 hover:bg-base-surface border border-border text-xs font-mono text-text-secondary hover:text-text-primary transition-all cursor-pointer"
              >
                10.000 ₺
              </button>
              <button
                type="button"
                onClick={() => handleQuickAmount(25000)}
                className="px-2.5 py-1 rounded-lg bg-base-surface-2 hover:bg-base-surface border border-border text-xs font-mono text-text-secondary hover:text-text-primary transition-all cursor-pointer"
              >
                25.000 ₺
              </button>
            </div>
          </div>

          {/* İşlem Türü & Ödeme Kanalı */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                İşlem Türü
              </label>
              <select
                value={activeMode === 'adjust' ? (computedTxDirection === 'debit' ? 'opening_balance' : 'return_credit') : type}
                onChange={(e: any) => setType(e.target.value)}
                disabled={activeMode === 'adjust'}
                className="w-full px-3 py-2 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary focus:border-info-border outline-none disabled:opacity-75"
              >
                {activeMode === 'payment' && (
                  <>
                    <option value="payment_received">Tahsilat (Nakit / Havale)</option>
                    <option value="return_credit">İade Faturası / Mahsup Alacağı</option>
                    <option value="supplier_invoice">Tedarikçi Alış Faturası</option>
                  </>
                )}
                {activeMode === 'debt' && (
                  <>
                    <option value="sale_invoice">Satış Faturası / Mal Teslimi</option>
                    <option value="payment_made">Tedarikçiye Ödeme Çıkışı</option>
                    <option value="opening_balance">Devir / Açılış Borcu</option>
                  </>
                )}
                {activeMode === 'adjust' && (
                  <>
                    <option value="opening_balance">Bakiye Düzeltme / Mutabakat Borcu</option>
                    <option value="return_credit">Bakiye Düzeltme / Mahsup Alacağı</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                Ödeme / Tahsilat Kanalı
              </label>
              <div className="relative">
                <CreditCard className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
                <select
                  value={paymentMethod}
                  onChange={(e: any) => setPaymentMethod(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary focus:border-info-border outline-none"
                >
                  <option value="Havale/EFT">Banka Havalesi / EFT</option>
                  <option value="Nakit">Elden Nakit / Kasa</option>
                  <option value="Kredi Kartı">Kredi Kartı / POS</option>
                  <option value="Çek/Senet">Müşteri Çeki / Senedi</option>
                  <option value="Cari Hesap">Açık Hesap / Cari Mahsup</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tarih & Vade Tarihi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                İşlem Tarihi *
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
                <input
                  type="date"
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary focus:border-info-border outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                Vade / Tahsilat Tarihi
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary focus:border-info-border outline-none font-mono"
                />
              </div>
            </div>
          </div>

          {/* Belge No & Açıklama */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">
              Belge / Evrak / Fatura / Dekont No
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Örn: DEK-2026-9041 veya FAT-88120"
                value={documentNo}
                onChange={e => setDocumentNo(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary placeholder:text-text-muted focus:border-info-border outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">
              Açıklama & Not
            </label>
            <textarea
              rows={2}
              placeholder="İşlem açıklaması veya dekont detayı..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary placeholder:text-text-muted focus:border-info-border outline-none resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-base-surface-2 hover:bg-base-surface border border-border text-xs font-semibold text-text-secondary transition-colors cursor-pointer"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold text-base transition-all flex items-center space-x-2 cursor-pointer shadow-md disabled:opacity-50 ${
                activeMode === 'payment'
                  ? 'bg-success-fill hover:opacity-90'
                  : activeMode === 'debt'
                  ? 'bg-danger-fill hover:opacity-90'
                  : 'bg-info-fill hover:opacity-90'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'Kaydediliyor...'
                  : activeMode === 'payment'
                  ? 'Tahsilatı Kaydet'
                  : activeMode === 'debt'
                  ? 'Borcu Kaydet'
                  : 'Bakiyeyi Güncelle'}
              </span>
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}
