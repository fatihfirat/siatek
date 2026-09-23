import { useState, useEffect, FormEvent } from 'react';
import { CariAccount, CariType, CariStatus } from '../../types';
import { X, Building2, User, Phone, Mail, MapPin, DollarSign, Calendar, ShieldAlert, Check, FileText } from 'lucide-react';
import { useModalBehavior } from '../../hooks/useModalBehavior';

interface CariAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<CariAccount, 'id' | 'code' | 'balance' | 'totalDebit' | 'totalCredit' | 'createdAt'>) => Promise<void>;
  cari?: CariAccount | null;
}

function cariSaveErrorMessage(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code?: unknown }).code) : '';
  if (code.includes('permission-denied')) return 'Bu işlem için yönetici yetkisi doğrulanamadı. Oturumu yenileyip tekrar deneyin.';
  if (code.includes('unavailable')) return 'Sunucuya ulaşılamadı. İnternet bağlantısını kontrol edip tekrar deneyin.';
  if (code.includes('unauthenticated')) return 'Oturum süresi doldu. Yeniden giriş yapın.';
  if (code.includes('resource-exhausted')) return 'İşlem limiti aşıldı. Kısa süre sonra tekrar deneyin.';
  return error instanceof Error && error.message
    ? `Cari kart kaydedilemedi: ${error.message}`
    : 'Cari kart kaydedilemedi. Bilgileri kontrol edip tekrar deneyin.';
}

export default function CariAccountModal({
  isOpen,
  onClose,
  onSave,
  cari,
}: CariAccountModalProps) {
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [type, setType] = useState<CariType>('customer');
  const [taxNumber, setTaxNumber] = useState('');
  const [taxOffice, setTaxOffice] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('Şanlıurfa');
  const [address, setAddress] = useState('');
  const [creditLimit, setCreditLimit] = useState('50000');
  const [paymentTermDays, setPaymentTermDays] = useState('30');
  const [status, setStatus] = useState<CariStatus>('active');
  const [notes, setNotes] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cari) {
      setName(cari.name || '');
      setCompanyName(cari.companyName || '');
      setType(cari.type || 'customer');
      setTaxNumber(cari.taxNumber || '');
      setTaxOffice(cari.taxOffice || '');
      setPhone(cari.phone || '');
      setEmail(cari.email || '');
      setCity(cari.city || 'Şanlıurfa');
      setAddress(cari.address || '');
      setCreditLimit(cari.creditLimit?.toString() || '0');
      setPaymentTermDays(cari.paymentTermDays?.toString() || '30');
      setStatus(cari.status || 'active');
      setNotes(cari.notes || '');
      setOpeningBalance('');
    } else {
      setName('');
      setCompanyName('');
      setType('customer');
      setTaxNumber('');
      setTaxOffice('');
      setPhone('');
      setEmail('');
      setCity('Şanlıurfa');
      setAddress('');
      setCreditLimit('50000');
      setPaymentTermDays('30');
      setStatus('active');
      setNotes('');
      setOpeningBalance('');
    }
    setError(null);
  }, [cari, isOpen]);

  useModalBehavior(isOpen, onClose);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !name.trim()) {
      setError('Lütfen Firma Ünvanı ve Yetkili Kişi adını doldurunuz.');
      return;
    }

    const parsedCreditLimit = Number(creditLimit);
    const parsedPaymentTerm = Number(paymentTermDays);
    const parsedOpeningBalance = openingBalance === '' ? undefined : Number(openingBalance);
    if (!Number.isFinite(parsedCreditLimit) || parsedCreditLimit < 0) {
      setError('Kredi limiti 0 veya daha büyük geçerli bir tutar olmalıdır.');
      return;
    }
    if (!Number.isInteger(parsedPaymentTerm) || parsedPaymentTerm < 0 || parsedPaymentTerm > 180) {
      setError('Standart vade 0–180 arasında tam gün olmalıdır.');
      return;
    }
    if (parsedOpeningBalance !== undefined && !Number.isFinite(parsedOpeningBalance)) {
      setError('Açılış bakiyesi geçerli bir tutar olmalıdır.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSave({
        name: name.trim(),
        companyName: companyName.trim(),
        type,
        taxNumber: taxNumber.trim(),
        taxOffice: taxOffice.trim(),
        phone: phone.trim(),
        email: email.trim(),
        city: city.trim(),
        address: address.trim(),
        creditLimit: parsedCreditLimit,
        paymentTermDays: parsedPaymentTerm,
        status,
        notes: notes.trim(),
        openingBalance: parsedOpeningBalance,
      } as any);
      onClose();
    } catch (err: unknown) {
      setError(cariSaveErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm p-3 sm:p-5 md:p-8 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div className="min-h-full flex items-center justify-center py-4 sm:py-6">
        <div 
          className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-base-surface shadow-2xl animate-in fade-in zoom-in-95"
          onClick={(e) => e.stopPropagation()}
        >
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border bg-base-surface/95 px-5 py-5 backdrop-blur-md sm:px-6">
          <div className="flex items-center space-x-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-success-border bg-success-fill/10 text-success-text">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-success-text">Cari kartı</p>
              <h2 className="mt-0.5 text-lg font-black tracking-tight text-text-primary">
                {cari ? 'Cari Kartı Düzenle' : 'Yeni Cari Hesap Kartı Aç'}
              </h2>
              <p className="mt-0.5 text-xs text-text-secondary">
                {cari ? `${cari.code} - ${cari.companyName}` : 'Müşteri, Bayi veya Tedarikçi cari hesabı tanımlayın'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-transparent text-text-secondary transition-all duration-100 hover:border-border hover:bg-base-surface-2 hover:text-text-primary active:scale-[0.98] cursor-pointer"
            aria-label="Cari kartını kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="max-h-[min(78vh,760px)] space-y-5 overflow-y-auto p-5 custom-scrollbar sm:p-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-danger-fill/15 border border-danger-border text-danger-text text-xs flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Cari Tipi & Durumu */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">
                Cari Hesap Türü *
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setType('dealer')}
                  className={`py-2 px-2 text-xs font-semibold rounded-xl border text-center transition-all cursor-pointer ${
                    type === 'dealer'
                      ? 'bg-success-fill/10 border-success-border text-success-text ring-1 ring-success-border'
                      : 'bg-base-surface-2 border-border text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Bayi
                </button>
                <button
                  type="button"
                  onClick={() => setType('customer')}
                  className={`py-2 px-2 text-xs font-semibold rounded-xl border text-center transition-all cursor-pointer ${
                    type === 'customer'
                      ? 'bg-success-fill/10 border-success-border text-success-text ring-1 ring-success-border'
                      : 'bg-base-surface-2 border-border text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Müşteri
                </button>
                <button
                  type="button"
                  onClick={() => setType('supplier')}
                  className={`py-2 px-2 text-xs font-semibold rounded-xl border text-center transition-all cursor-pointer ${
                    type === 'supplier'
                      ? 'bg-success-fill/10 border-success-border text-success-text ring-1 ring-success-border'
                      : 'bg-base-surface-2 border-border text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Tedarikçi
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">
                Hesap Durumu
              </label>
              <select
                value={status}
                onChange={(e: any) => setStatus(e.target.value)}
                className="w-full px-3 py-2 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary focus:border-info-border outline-none"
              >
                <option value="active">Aktif (Çalışılıyor)</option>
                <option value="passive">Pasif (Geçici Durduruldu)</option>
                <option value="blocked">Bloke (Kredi Limiti Aşımı / Hukuki)</option>
              </select>
            </div>
          </div>

          {/* Firma Ünvanı & Yetkili */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                Firma Tam Ünvanı *
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  placeholder="Örn: Yılmaz Mekanik & Doğalgaz Tesisat Ltd. Şti."
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary placeholder:text-text-muted focus:border-info-border outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  Yetkili Kişi Adı Soyadı *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="Örn: Ahmet Yılmaz"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary placeholder:text-text-muted focus:border-info-border outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  Telefon Numarası
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Örn: +90 532 123 45 67"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary placeholder:text-text-muted focus:border-info-border outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* E-posta, Vergi No, Vergi Dairesi */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                E-posta Adresi
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
                <input
                  type="email"
                  placeholder="muhasebe@firma.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary placeholder:text-text-muted focus:border-info-border outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                Vergi Numarası / T.C.
              </label>
              <input
                type="text"
                placeholder="10 veya 11 Haneli"
                value={taxNumber}
                onChange={e => setTaxNumber(e.target.value)}
                className="w-full px-3 py-2 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary placeholder:text-text-muted focus:border-info-border outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                Vergi Dairesi
              </label>
              <input
                type="text"
                placeholder="Örn: Karaköprü VD"
                value={taxOffice}
                onChange={e => setTaxOffice(e.target.value)}
                className="w-full px-3 py-2 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary placeholder:text-text-muted focus:border-info-border outline-none"
              />
            </div>
          </div>

          {/* Şehir & Adres */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                Şehir / Bölge
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Örn: Şanlıurfa"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary placeholder:text-text-muted focus:border-info-border outline-none"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-text-primary mb-1">
                Açık Adres / Şantiye / Depo
              </label>
              <input
                type="text"
                placeholder="Mahalle, Cadde, No, İlçe"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full px-3 py-2 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary placeholder:text-text-muted focus:border-info-border outline-none"
              />
            </div>
          </div>

          {/* Finansal Parametreler: Kredi Limiti, Vade Günü, Açılış Bakiyesi */}
          <div className="space-y-3 rounded-xl border border-success-border bg-success-fill/5 p-4">
            <h3 className="text-xs font-bold text-text-primary flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-success-text" />
              <span>Ticari & Finansal Limit Ayarları</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                  Kredi / Risk Limiti (₺)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={creditLimit}
                  onChange={e => setCreditLimit(e.target.value)}
                  className="w-full px-3 py-2 bg-base-surface border border-border rounded-xl text-xs font-mono font-bold text-text-primary focus:border-info-border outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                  Standart Vade (Gün)
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
                  <input
                    type="number"
                    min="0"
                    max="180"
                    value={paymentTermDays}
                    onChange={e => setPaymentTermDays(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-base-surface border border-border rounded-xl text-xs font-mono font-bold text-text-primary focus:border-info-border outline-none"
                  />
                </div>
              </div>

              {!cari && (
                <div>
                  <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                    Açılış Devir Bakiyesi (₺)
                  </label>
                  <input
                    type="number"
                    step="100"
                    placeholder="0 (Borç: +, Alacak: -)"
                    value={openingBalance}
                    onChange={e => setOpeningBalance(e.target.value)}
                    className="w-full px-3 py-2 bg-base-surface border border-border rounded-xl text-xs font-mono text-text-primary focus:border-info-border outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Notlar */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">
              Cari Özel Notları / Sevkiyat Talimatı
            </label>
            <textarea
              rows={2}
              placeholder="Örn: Toptan malzeme alımı yapıyor, sevkiyatlar Gebze şantiyesine yapılacak..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary placeholder:text-text-muted focus:border-info-border outline-none resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="sticky bottom-0 -mx-5 -mb-5 flex items-center justify-end space-x-3 border-t border-border bg-base-surface/95 px-5 py-4 backdrop-blur-md sm:-mx-6 sm:-mb-6 sm:px-6">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-lg border border-border bg-base-surface-2 px-4 text-xs font-semibold text-text-secondary transition-all duration-100 hover:bg-base-surface active:scale-[0.98] cursor-pointer"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex min-h-11 items-center space-x-2 rounded-lg border border-success-border bg-success-fill px-5 text-xs font-bold text-white shadow-sm transition-all duration-100 hover:opacity-90 active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Kaydediliyor...' : cari ? 'Değişiklikleri Kaydet' : 'Cari Kartı Oluştur'}</span>
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}
