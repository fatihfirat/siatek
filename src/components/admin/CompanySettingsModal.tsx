import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Phone, 
  Mail, 
  Globe, 
  MapPin, 
  FileText, 
  CreditCard, 
  Plus, 
  Trash2, 
  Save, 
  X, 
  Check, 
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Star
} from 'lucide-react';
import { 
  CompanySettings, 
  CompanyBankAccount, 
  useCompanySettings, 
  saveCompanySettings 
} from '../../lib/companySettings';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import { playNotificationSound } from '../../lib/audio';
import confetti from 'canvas-confetti';

interface CompanySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CompanySettingsModal: React.FC<CompanySettingsModalProps> = ({ isOpen, onClose }) => {
  useModalBehavior(isOpen, onClose);
  const currentSettings = useCompanySettings();

  const [activeTab, setActiveTab] = useState<'general' | 'address' | 'banks'>('general');
  const [formData, setFormData] = useState<CompanySettings>(currentSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New bank account local state for "Add Bank"
  const [showAddBank, setShowAddBank] = useState(false);
  const [newBank, setNewBank] = useState<CompanyBankAccount>({
    id: '',
    bankName: '',
    accountHolder: currentSettings.companyName,
    iban: 'TR',
    branchName: '',
    branchCode: '',
    currency: 'TRY',
    isDefault: false
  });

  useEffect(() => {
    if (isOpen) {
      setFormData(currentSettings);
      setStatusMessage(null);
      setShowAddBank(false);
    }
  }, [isOpen, currentSettings]);

  if (!isOpen) return null;

  const handleChange = (field: keyof CompanySettings, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);

    try {
      await saveCompanySettings(formData);
      setStatusMessage({ type: 'success', text: 'Şirket bilgileri ve IBAN hesapları başarıyla güncellendi!' });
      playNotificationSound('status');
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });
      setTimeout(() => {
        setStatusMessage(null);
      }, 3500);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Kaydedilirken hata oluştu.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddBankAccount = () => {
    if (!newBank.bankName.trim() || !newBank.iban.trim()) {
      setStatusMessage({ type: 'error', text: 'Banka adı ve IBAN zorunludur.' });
      return;
    }

    const formattedIban = newBank.iban.replace(/\s+/g, '').toUpperCase();
    const bankItem: CompanyBankAccount = {
      ...newBank,
      id: `bank-${Date.now()}`,
      iban: formattedIban,
      accountHolder: newBank.accountHolder || formData.companyName
    };

    let updatedBanks = [...(formData.bankAccounts || [])];
    if (bankItem.isDefault) {
      updatedBanks = updatedBanks.map(b => ({ ...b, isDefault: false }));
    }
    updatedBanks.push(bankItem);

    setFormData(prev => ({ ...prev, bankAccounts: updatedBanks }));
    setShowAddBank(false);
    setNewBank({
      id: '',
      bankName: '',
      accountHolder: formData.companyName,
      iban: 'TR',
      branchName: '',
      branchCode: '',
      currency: 'TRY',
      isDefault: false
    });
    setStatusMessage({ type: 'success', text: 'Banka hesabı eklendi. Kaydet butonuna basarak onaylayın.' });
  };

  const handleDeleteBank = (id: string) => {
    setFormData(prev => ({
      ...prev,
      bankAccounts: prev.bankAccounts.filter(b => b.id !== id)
    }));
  };

  const handleSetDefaultBank = (id: string) => {
    setFormData(prev => ({
      ...prev,
      bankAccounts: prev.bankAccounts.map(b => ({
        ...b,
        isDefault: b.id === id
      }))
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in" onClick={onClose}>
      <div className="bg-base-surface border border-border w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-base-surface-2">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-brand-primary text-brand-on-primary shadow-md">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-text-primary flex items-center space-x-2">
                <span>Şirket Bilgileri & Kurumsal Ayarlar</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary font-bold">
                  Yönetici
                </span>
              </h3>
              <p className="text-xs text-text-muted">
                Faturalar, teklifler, sevk fişleri ve müşteri havale ekranlarında görünen firma bilgilerini düzenleyin.
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

        {/* Status Toast */}
        {statusMessage && (
          <div className={`px-6 py-2.5 text-xs font-semibold flex items-center justify-between border-b ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' 
              : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
          }`}>
            <div className="flex items-center space-x-2">
              {statusMessage.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{statusMessage.text}</span>
            </div>
            <button onClick={() => setStatusMessage(null)} className="text-[10px] underline">Kapat</button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-border bg-base-surface-2/60 p-1.5 gap-1.5">
          <button
            onClick={() => setActiveTab('general')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer ${
              activeTab === 'general'
                ? 'bg-base-surface text-text-primary shadow-xs border border-border'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Building2 className="w-4 h-4 text-blue-500" />
            <span>Firma & İletişim</span>
          </button>

          <button
            onClick={() => setActiveTab('address')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer ${
              activeTab === 'address'
                ? 'bg-base-surface text-text-primary shadow-xs border border-border'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <MapPin className="w-4 h-4 text-amber-500" />
            <span>Adres & Vergi Bilgileri</span>
          </button>

          <button
            onClick={() => setActiveTab('banks')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer ${
              activeTab === 'banks'
                ? 'bg-base-surface text-text-primary shadow-xs border border-border'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <CreditCard className="w-4 h-4 text-emerald-500" />
            <span>Banka Hesapları & IBAN ({formData.bankAccounts?.length || 0})</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 text-xs">
          {/* TAB 1: GENEL & İLETİŞİM */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div>
                <label className="block text-text-muted font-semibold mb-1">Resmi Şirket Ünvanı (Fatura & Teklif Başlığı):</label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={e => handleChange('companyName', e.target.value)}
                  placeholder="ALPHA TEKNİK DOĞALGAZ SIHHİ TESİSAT SAN. VE TİC. LTD. ŞTİ."
                  className="w-full px-3.5 py-2.5 bg-base-surface border border-border rounded-xl text-text-primary font-bold text-xs focus:border-brand-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-text-muted font-semibold mb-1">Kısa Ticari Ad / Marka:</label>
                  <input
                    type="text"
                    value={formData.shortName}
                    onChange={e => handleChange('shortName', e.target.value)}
                    placeholder="ALPHA TEKNİK"
                    className="w-full px-3.5 py-2.5 bg-base-surface border border-border rounded-xl text-text-primary font-bold text-xs focus:border-brand-primary"
                  />
                </div>
                <div>
                  <label className="block text-text-muted font-semibold mb-1">Marka Sloganı / Başlık:</label>
                  <input
                    type="text"
                    value={formData.brandTitle}
                    onChange={e => handleChange('brandTitle', e.target.value)}
                    placeholder="ALPHA TEKNİK HVAC & DOĞALGAZ"
                    className="w-full px-3.5 py-2.5 bg-base-surface border border-border rounded-xl text-text-primary font-bold text-xs focus:border-brand-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-text-muted font-semibold mb-1 flex items-center space-x-1.5">
                    <Phone className="w-3.5 h-3.5 text-blue-500" />
                    <span>Resmi Santral / Telefon:</span>
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={e => handleChange('phone', e.target.value)}
                    placeholder="+90 544 440 91 80"
                    className="w-full px-3.5 py-2.5 bg-base-surface border border-border rounded-xl text-text-primary font-mono font-bold text-xs focus:border-brand-primary"
                  />
                </div>
                <div>
                  <label className="block text-text-muted font-semibold mb-1 flex items-center space-x-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-500" />
                    <span>WhatsApp Sipariş & Bildirim Hattı:</span>
                  </label>
                  <input
                    type="text"
                    value={formData.whatsapp}
                    onChange={e => handleChange('whatsapp', e.target.value)}
                    placeholder="+90 544 440 91 80"
                    className="w-full px-3.5 py-2.5 bg-base-surface border border-border rounded-xl text-text-primary font-mono font-bold text-xs focus:border-brand-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-text-muted font-semibold mb-1 flex items-center space-x-1.5">
                    <Mail className="w-3.5 h-3.5 text-rose-500" />
                    <span>Resmi E-Posta Adresi:</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => handleChange('email', e.target.value)}
                    placeholder="info@alphateknikhvac.com"
                    className="w-full px-3.5 py-2.5 bg-base-surface border border-border rounded-xl text-text-primary font-mono text-xs focus:border-brand-primary"
                  />
                </div>
                <div>
                  <label className="block text-text-muted font-semibold mb-1 flex items-center space-x-1.5">
                    <Globe className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Web Sitesi / Portal:</span>
                  </label>
                  <input
                    type="text"
                    value={formData.website}
                    onChange={e => handleChange('website', e.target.value)}
                    placeholder="https://siatek.alphateknikhvac.com"
                    className="w-full px-3.5 py-2.5 bg-base-surface border border-border rounded-xl text-text-primary font-mono text-xs focus:border-brand-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ADRES & VERGİ BİLGİLERİ */}
          {activeTab === 'address' && (
            <div className="space-y-4">
              <div>
                <label className="block text-text-muted font-semibold mb-1">Açık Adres (Sokak / Cadde / No):</label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={e => handleChange('address', e.target.value)}
                  placeholder="Batıkent Mahallesi Beyazıt Bulvarı No:32/1"
                  className="w-full px-3.5 py-2 bg-base-surface border border-border rounded-xl text-text-primary text-xs focus:border-brand-primary resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-text-muted font-semibold mb-1">İlçe:</label>
                  <input
                    type="text"
                    value={formData.district}
                    onChange={e => handleChange('district', e.target.value)}
                    placeholder="Karaköprü"
                    className="w-full px-3.5 py-2.5 bg-base-surface border border-border rounded-xl text-text-primary font-semibold text-xs focus:border-brand-primary"
                  />
                </div>
                <div>
                  <label className="block text-text-muted font-semibold mb-1">Şehir / İl:</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={e => handleChange('city', e.target.value)}
                    placeholder="Şanlıurfa"
                    className="w-full px-3.5 py-2.5 bg-base-surface border border-border rounded-xl text-text-primary font-semibold text-xs focus:border-brand-primary"
                  />
                </div>
                <div>
                  <label className="block text-text-muted font-semibold mb-1">Posta Kodu:</label>
                  <input
                    type="text"
                    value={formData.postalCode}
                    onChange={e => handleChange('postalCode', e.target.value)}
                    placeholder="63050"
                    className="w-full px-3.5 py-2.5 bg-base-surface border border-border rounded-xl text-text-primary font-mono text-xs focus:border-brand-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border">
                <div>
                  <label className="block text-text-muted font-semibold mb-1">Vergi Dairesi:</label>
                  <input
                    type="text"
                    value={formData.taxOffice}
                    onChange={e => handleChange('taxOffice', e.target.value)}
                    placeholder="Karaköprü VD"
                    className="w-full px-3.5 py-2.5 bg-base-surface border border-border rounded-xl text-text-primary font-bold text-xs focus:border-brand-primary"
                  />
                </div>
                <div>
                  <label className="block text-text-muted font-semibold mb-1">Vergi Kimlik No (VKN / TCKN):</label>
                  <input
                    type="text"
                    value={formData.taxNumber}
                    onChange={e => handleChange('taxNumber', e.target.value)}
                    placeholder="0580948214"
                    className="w-full px-3.5 py-2.5 bg-base-surface border border-border rounded-xl text-text-primary font-mono font-bold text-xs focus:border-brand-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-text-muted font-semibold mb-1">MERSİS Numarası (İsteğe bağlı):</label>
                  <input
                    type="text"
                    value={formData.mersisNo}
                    onChange={e => handleChange('mersisNo', e.target.value)}
                    placeholder="0058094821400001"
                    className="w-full px-3.5 py-2.5 bg-base-surface border border-border rounded-xl text-text-primary font-mono text-xs focus:border-brand-primary"
                  />
                </div>
                <div>
                  <label className="block text-text-muted font-semibold mb-1">Ticaret Sicil No (İsteğe bağlı):</label>
                  <input
                    type="text"
                    value={formData.ticaretSicilNo}
                    onChange={e => handleChange('ticaretSicilNo', e.target.value)}
                    placeholder="12345"
                    className="w-full px-3.5 py-2.5 bg-base-surface border border-border rounded-xl text-text-primary font-mono text-xs focus:border-brand-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BANKA HESAPLARI & IBAN */}
          {activeTab === 'banks' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-text-primary text-xs">Aktif Banka Hesapları</h4>
                  <p className="text-[11px] text-text-muted">Müşterilerin havale/EFT yapabileceği banka IBAN bilgileri.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddBank(prev => !prev)}
                  className="px-3 py-1.5 bg-brand-primary hover:bg-brand-primary-hover text-brand-on-primary rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{showAddBank ? 'İptal' : 'Yeni Banka Ekle'}</span>
                </button>
              </div>

              {/* Add Bank Form */}
              {showAddBank && (
                <div className="p-4 rounded-2xl bg-base-surface-2 border-2 border-brand-primary/40 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between font-bold text-xs text-text-primary">
                    <span>Yeni Banka Hesabı Ekle</span>
                    <span className="text-[10px] text-brand-primary">Formu doldurup Ekle butonuna basın</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-text-muted mb-1 font-semibold">Banka Adı:</label>
                      <input
                        type="text"
                        placeholder="Örn: Garanti BBVA, Ziraat Bankası"
                        value={newBank.bankName}
                        onChange={e => setNewBank({ ...newBank, bankName: e.target.value })}
                        className="w-full px-3 py-2 bg-base-surface border border-border rounded-xl text-text-primary font-bold text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-text-muted mb-1 font-semibold">Hesap Sahibi / Alıcı Adı:</label>
                      <input
                        type="text"
                        value={newBank.accountHolder}
                        onChange={e => setNewBank({ ...newBank, accountHolder: e.target.value })}
                        className="w-full px-3 py-2 bg-base-surface border border-border rounded-xl text-text-primary font-bold text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-text-muted mb-1 font-semibold">IBAN Numarası:</label>
                    <input
                      type="text"
                      placeholder="TR00 0000 0000 0000 0000 0000 00"
                      value={newBank.iban}
                      onChange={e => setNewBank({ ...newBank, iban: e.target.value })}
                      className="w-full px-3 py-2 bg-base-surface border border-border rounded-xl text-text-primary font-mono font-bold text-xs tracking-wider"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-text-muted mb-1 font-semibold">Şube Adı:</label>
                      <input
                        type="text"
                        placeholder="Karaköprü Şubesi"
                        value={newBank.branchName}
                        onChange={e => setNewBank({ ...newBank, branchName: e.target.value })}
                        className="w-full px-3 py-1.5 bg-base-surface border border-border rounded-xl text-text-primary text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-text-muted mb-1 font-semibold">Şube Kodu / Hesap No:</label>
                      <input
                        type="text"
                        placeholder="631"
                        value={newBank.branchCode}
                        onChange={e => setNewBank({ ...newBank, branchCode: e.target.value })}
                        className="w-full px-3 py-1.5 bg-base-surface border border-border rounded-xl text-text-primary text-xs"
                      />
                    </div>
                    <div className="flex items-center space-x-2 pt-4">
                      <input
                        type="checkbox"
                        id="newBankDefault"
                        checked={newBank.isDefault}
                        onChange={e => setNewBank({ ...newBank, isDefault: e.target.checked })}
                        className="w-4 h-4 rounded text-brand-primary"
                      />
                      <label htmlFor="newBankDefault" className="text-xs font-bold text-text-primary cursor-pointer">
                        Ana Tahsilat Hesabı Yap
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleAddBankAccount}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center space-x-1.5 cursor-pointer shadow-xs"
                    >
                      <Check className="w-4 h-4" />
                      <span>Bu Hesabı Listeye Ekle</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Bank Accounts List */}
              <div className="space-y-2.5">
                {(!formData.bankAccounts || formData.bankAccounts.length === 0) ? (
                  <div className="p-8 text-center text-text-muted bg-base-surface-2 rounded-2xl border border-border">
                    <CreditCard className="w-8 h-8 mx-auto opacity-30 mb-2" />
                    <p className="font-semibold">Henüz tanımlı banka hesabı bulunmuyor.</p>
                    <p className="text-[11px] mt-0.5">Yukarıdaki "Yeni Banka Ekle" butonuna tıklayarak IBAN ekleyebilirsiniz.</p>
                  </div>
                ) : (
                  formData.bankAccounts.map((bank, index) => (
                    <div
                      key={bank.id || index}
                      className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all ${
                        bank.isDefault
                          ? 'bg-brand-primary/5 border-brand-primary/30 shadow-xs'
                          : 'bg-base-surface-2 border-border'
                      }`}
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-black text-text-primary text-xs">{bank.bankName}</span>
                          {bank.isDefault && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-primary text-brand-on-primary font-bold flex items-center space-x-1">
                              <Star className="w-3 h-3 fill-current" />
                              <span>Varsayılan Hesap</span>
                            </span>
                          )}
                          {bank.branchName && (
                            <span className="text-[11px] text-text-muted">({bank.branchName})</span>
                          )}
                        </div>
                        <div className="font-mono font-bold text-brand-primary text-xs tracking-wider select-all">
                          {bank.iban}
                        </div>
                        <div className="text-[10px] text-text-secondary">
                          Alıcı: {bank.accountHolder}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 self-end sm:self-center">
                        {!bank.isDefault && (
                          <button
                            type="button"
                            onClick={() => handleSetDefaultBank(bank.id)}
                            className="px-2.5 py-1 rounded-lg bg-base-surface hover:bg-base-surface-2 border border-border text-[11px] font-bold text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                          >
                            Varsayılan Yap
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteBank(bank.id)}
                          className="p-1.5 text-text-muted hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Hesabı Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-base-surface-2 flex items-center justify-between">
          <div className="text-[11px] text-text-muted flex items-center space-x-1">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Tüm değişiklikler anında kaydedilir ve Firestore ile eşitlenir.</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-brand-on-primary rounded-xl font-black text-xs flex items-center space-x-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CompanySettingsModal;
