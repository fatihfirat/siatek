import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  CreditCard, 
  Palette, 
  Sliders, 
  Sparkles, 
  Check, 
  Save, 
  RotateCcw, 
  Sun, 
  Moon, 
  Monitor, 
  MessageCircle, 
  ShieldCheck, 
  ShieldAlert, 
  Eye, 
  Smartphone, 
  Laptop,
  Megaphone,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Copy,
  Download,
  Upload,
  Cloud,
  ExternalLink,
  RefreshCw,
  Star,
  Layers,
  Phone,
  FileText,
  MapPin,
  Loader2,
  Truck,
  Search,
  Navigation
} from 'lucide-react';
import { Haptics } from '../../utils/haptics';
import { 
  CompanySettings, 
  CompanyBankAccount, 
  FleetVehicle,
  DispatchDriver,
  useCompanySettings, 
  saveCompanySettings, 
  DEFAULT_COMPANY_SETTINGS, 
  ACCENT_PALETTES, 
  applyCompanyBrandStyles,
  sanitizeForFirestore
} from '../../lib/companySettings';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import { playNotificationSound } from '../../lib/audio';
import confetti from 'canvas-confetti';
import { db, collection, getDocs, doc, setDoc, writeBatch } from '../../lib/firebase';

interface AlphaEnterpriseSuiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: 'dark' | 'light' | 'system';
  onThemeChange: (theme: 'dark' | 'light' | 'system') => void;
  initialTab?: 'identity' | 'banks' | 'studio' | 'fleet' | 'policies' | 'backup' | 'preview';
  displayMode?: 'modal' | 'page';
  fleetOnly?: boolean;
}

export default function AlphaEnterpriseSuiteModal({
  isOpen,
  onClose,
  currentTheme,
  onThemeChange,
  initialTab = 'studio',
  displayMode = 'modal',
  fleetOnly = false,
}: AlphaEnterpriseSuiteModalProps) {
  useModalBehavior(isOpen && displayMode === 'modal', onClose);
  const companySettings = useCompanySettings();

  const [activeTab, setActiveTab] = useState<'identity' | 'banks' | 'studio' | 'fleet' | 'policies' | 'backup' | 'preview'>(initialTab);
  const [formData, setFormData] = useState<CompanySettings>(companySettings);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedIban, setCopiedIban] = useState<string | null>(null);

  // Bank form state for new bank
  const [showAddBank, setShowAddBank] = useState(false);
  const [newBank, setNewBank] = useState<CompanyBankAccount>({
    id: '',
    bankName: '',
    accountHolder: companySettings.companyName,
    iban: 'TR',
    branchName: '',
    branchCode: '',
    currency: 'TRY',
    isDefault: false
  });

  // Fleet & Drivers state
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [newVehicle, setNewVehicle] = useState<FleetVehicle>({
    id: '',
    plate: '',
    name: '',
    type: 'Kamyon',
    capacity: '3.5 Ton',
    isDefault: false
  });

  const [showAddDriver, setShowAddDriver] = useState(false);
  const [newDriver, setNewDriver] = useState<DispatchDriver>({
    id: '',
    name: '',
    phone: '',
    role: 'Şoför & Sevkiyat Sorumlusu',
    isDefault: false
  });

  // Backup state
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [lastBackupInfo, setLastBackupInfo] = useState<string | null>(null);

  const prevIsOpenRef = React.useRef(false);

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setFormData(companySettings);
      setStatusMessage(null);
      setSaveState('idle');
      setIsDirty(false);
      setShowAddBank(false);
      setActiveTab(initialTab);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, initialTab, companySettings]);

  if (!isOpen) return null;

  const handleFieldChange = <K extends keyof CompanySettings>(field: K, value: CompanySettings[K]) => {
    setIsDirty(true);
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      applyCompanyBrandStyles(updated);
      return updated;
    });
  };

  const handleBannerChange = (field: 'enabled' | 'text' | 'link' | 'tone', value: any) => {
    setIsDirty(true);
    setFormData(prev => {
      const currentBanner = prev.announcementBanner || {
        enabled: false,
        text: '',
        tone: 'brand',
      };
      const updatedBanner = { ...currentBanner, [field]: value };
      return { ...prev, announcementBanner: updatedBanner };
    });
  };

  const handleSave = async () => {
    setSaveState('saving');
    setStatusMessage(null);
    Haptics.impact();

    try {
      await saveCompanySettings(formData);
      applyCompanyBrandStyles(formData);
      setSaveState('saved');
      setIsDirty(false);
      const timeStr = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastSavedTime(timeStr);
      setStatusMessage({ 
        type: 'success', 
        text: `✓ Alpha Enterprise Suite ayarları (${timeStr}) başarıyla Firestore bulutuna kaydedildi ve sisteme uygulandı!` 
      });
      playNotificationSound('success');
      Haptics.notification('success');
      confetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.6 }
      });
      setTimeout(() => {
        setSaveState('idle');
      }, 5000);
    } catch (err: any) {
      console.error('Enterprise Suite Save Error:', err);
      setSaveState('error');
      setStatusMessage({ type: 'error', text: err?.message || 'Ayarlar kaydedilirken bir hata oluştu.' });
      Haptics.notification('error');
      setTimeout(() => {
        setSaveState('idle');
      }, 6000);
    }
  };

  const handleResetToDefault = () => {
    if (window.confirm('Tüm kurumsal stil ve görünüm tercihlerini fabrika ayarlarına sıfırlamak istiyor musunuz?')) {
      const resetData: CompanySettings = {
        ...formData,
        brandAccent: DEFAULT_COMPANY_SETTINGS.brandAccent,
        brandRadius: DEFAULT_COMPANY_SETTINGS.brandRadius,
        uiDensity: DEFAULT_COMPANY_SETTINGS.uiDensity,
        announcementBanner: DEFAULT_COMPANY_SETTINGS.announcementBanner,
        hidePricesForGuests: DEFAULT_COMPANY_SETTINGS.hidePricesForGuests,
        whatsappSupportEnabled: DEFAULT_COMPANY_SETTINGS.whatsappSupportEnabled,
      };
      setIsDirty(true);
      setFormData(resetData);
      applyCompanyBrandStyles(resetData);
      onThemeChange('dark');
    }
  };

  const handleCopyIban = (iban: string) => {
    navigator.clipboard.writeText(iban);
    setCopiedIban(iban);
    setTimeout(() => setCopiedIban(null), 2500);
  };

  const handleAddBank = () => {
    if (!newBank.bankName.trim() || !newBank.iban.trim()) {
      setStatusMessage({ type: 'error', text: 'Banka adı ve IBAN zorunludur.' });
      return;
    }
    const cleanIban = newBank.iban.replace(/\s+/g, '').toUpperCase();
    const bankItem: CompanyBankAccount = {
      ...newBank,
      id: `bank-${Date.now()}`,
      iban: cleanIban,
      accountHolder: newBank.accountHolder || formData.companyName
    };
    let updatedBanks = [...(formData.bankAccounts || [])];
    if (bankItem.isDefault) {
      updatedBanks = updatedBanks.map(b => ({ ...b, isDefault: false }));
    }
    updatedBanks.push(bankItem);
    setIsDirty(true);
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
    setStatusMessage({ type: 'success', text: 'Banka hesabı eklendi. "Kaydet & Yayınla" butonuna basarak onaylayabilirsiniz.' });
  };

  const handleDeleteBank = (id: string) => {
    setIsDirty(true);
    setFormData(prev => ({
      ...prev,
      bankAccounts: (prev.bankAccounts || []).filter(b => b.id !== id)
    }));
  };

  const handleSetDefaultBank = (id: string) => {
    setIsDirty(true);
    setFormData(prev => ({
      ...prev,
      bankAccounts: (prev.bankAccounts || []).map(b => ({
        ...b,
        isDefault: b.id === id
      }))
    }));
  };

  // Fleet Vehicle Handlers
  const handleAddVehicle = () => {
    if (!newVehicle.plate.trim() || !newVehicle.name.trim()) {
      setStatusMessage({ type: 'error', text: 'Lütfen araç plakası ve araç adını giriniz.' });
      return;
    }
    const id = `veh_${Date.now()}`;
    const vehicleToAdd: FleetVehicle = {
      ...newVehicle,
      id,
      plate: newVehicle.plate.trim().toUpperCase(),
      name: newVehicle.name.trim(),
      type: newVehicle.type.trim() || 'Kamyon',
      capacity: newVehicle.capacity?.trim() || '3.5 Ton',
    };

    setIsDirty(true);
    setFormData(prev => {
      const existing = prev.fleetVehicles || [];
      const updated: FleetVehicle[] = vehicleToAdd.isDefault
        ? [...existing.map(v => ({ ...v, isDefault: false })), vehicleToAdd]
        : [...existing, vehicleToAdd];
      return { ...prev, fleetVehicles: updated };
    });

    setNewVehicle({
      id: '',
      plate: '',
      name: '',
      type: 'Kamyon',
      capacity: '3.5 Ton',
      isDefault: false
    });
    setShowAddVehicle(false);
  };

  const handleDeleteVehicle = (id: string) => {
    Haptics.impact('light');
    setIsDirty(true);
    setFormData(prev => ({
      ...prev,
      fleetVehicles: (prev.fleetVehicles || []).filter(v => v.id !== id)
    }));
  };

  const handleSetDefaultVehicle = (id: string) => {
    Haptics.impact('selection');
    setIsDirty(true);
    setFormData(prev => ({
      ...prev,
      fleetVehicles: (prev.fleetVehicles || []).map(v => ({
        ...v,
        isDefault: v.id === id
      }))
    }));
  };

  const handleAddDriver = () => {
    if (!newDriver.name.trim()) {
      alert('Lütfen sürücü/sorumlu adını girin');
      return;
    }

    Haptics.impact('medium');
    const driverToAdd: DispatchDriver = {
      id: `drv-${Date.now()}`,
      isDefault: Boolean(newDriver.isDefault),
      name: newDriver.name.trim(),
      phone: newDriver.phone.trim() || '+90 544 440 91 80',
      role: newDriver.role.trim() || 'Şoför & Sevkiyat Sorumlusu',
    };

    setIsDirty(true);
    setFormData(prev => {
      const existing = prev.dispatchPersonnel || [];
      const updated: DispatchDriver[] = driverToAdd.isDefault
        ? [...existing.map(d => ({ ...d, isDefault: false })), driverToAdd]
        : [...existing, driverToAdd];
      return { ...prev, dispatchPersonnel: updated };
    });

    setNewDriver({
      id: '',
      name: '',
      phone: '',
      role: 'Şoför & Sevkiyat Sorumlusu',
      isDefault: false
    });
    setShowAddDriver(false);
  };

  const handleDeleteDriver = (id: string) => {
    setIsDirty(true);
    setFormData(prev => ({
      ...prev,
      dispatchPersonnel: (prev.dispatchPersonnel || []).filter(d => d.id !== id)
    }));
  };

  const handleSetDefaultDriver = (id: string) => {
    setIsDirty(true);
    setFormData(prev => ({
      ...prev,
      dispatchPersonnel: (prev.dispatchPersonnel || []).map(d => ({
        ...d,
        isDefault: d.id === id
      }))
    }));
  };

  const handleExportFullBackup = async () => {
    setBackupLoading(true);
    setStatusMessage(null);
    try {
      const collectionsToBackup = [
        'products',
        'orders',
        'quotes',
        'cari_accounts',
        'cari_transactions',
        'invoices',
        'settings'
      ];

      const backupData: Record<string, any[]> = {};

      for (const colName of collectionsToBackup) {
        try {
          const colRef = collection(db, colName);
          const snap = await getDocs(colRef);
          backupData[colName] = snap.docs.map(docSnap => ({
            _id: docSnap.id,
            ...docSnap.data()
          }));
        } catch (e) {
          console.warn(`Collection ${colName} backup skipped:`, e);
          backupData[colName] = [];
        }
      }

      backupData['company_settings_snapshot'] = [formData];

      const payload = {
        app: 'SiatTek Alpha Enterprise',
        version: '2.5.0',
        exportedAt: new Date().toISOString(),
        exportedBy: 'Executive Admin',
        stats: {
          productsCount: backupData['products']?.length || 0,
          ordersCount: backupData['orders']?.length || 0,
          quotesCount: backupData['quotes']?.length || 0,
          cariAccountsCount: backupData['cari_accounts']?.length || 0,
          cariTransactionsCount: backupData['cari_transactions']?.length || 0,
        },
        data: backupData
      };

      const dateStr = new Date().toISOString().slice(0, 10);
      const timeStr = new Date().toTimeString().slice(0, 5).replace(':', '-');
      const filename = `siatek_tam_guvenli_yedek_${dateStr}_${timeStr}.json`;

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setLastBackupInfo(`${dateStr} ${timeStr} (${payload.stats.cariAccountsCount} Cari, ${payload.stats.productsCount} Ürün)`);
      setStatusMessage({ 
        type: 'success', 
        text: `Tam sistem yedeği (${filename}) başarıyla oluşturuldu ve indirildi! Bu dosyayı Google Drive klasörünüze kaydedebilirsiniz.` 
      });
      playNotificationSound('status');
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Yedekleme hatası: ${err.message}` });
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('DİKKAT: Seçilen yedek dosyası sisteme yüklenecek. Mevcut kayıtların üzerine yazılabilir. Devam etmek istiyor musunuz?')) {
      e.target.value = '';
      return;
    }

    setRestoreLoading(true);
    setStatusMessage(null);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!parsed.data || typeof parsed.data !== 'object') {
        throw new Error('Geçersiz yedek dosyası formatı.');
      }

      if (parsed.data.company_settings_snapshot && parsed.data.company_settings_snapshot[0]) {
        const restoredSettings = parsed.data.company_settings_snapshot[0];
        await saveCompanySettings(restoredSettings);
        setFormData(restoredSettings);
        applyCompanyBrandStyles(restoredSettings);
      }

      // Helper to batch-write documents with ID-based Upsert (Prevents Duplication)
      const batchUpsert = async (collectionName: string, items: any[]) => {
        if (!Array.isArray(items) || items.length === 0) return;
        for (let i = 0; i < items.length; i += 400) {
          const chunk = items.slice(i, i + 400);
          const batch = writeBatch(db);
          for (const item of chunk) {
            const docId = item._id || item.id || `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            const { _id, ...cleanData } = item;
            const sanitizedData = sanitizeForFirestore(cleanData);
            batch.set(doc(db, collectionName, docId), sanitizedData, { merge: true });
          }
          await batch.commit();
        }
      };

      let totalRestored = 0;
      const collectionsToRestore = [
        'cari_accounts',
        'cari_transactions',
        'orders',
        'quotes',
        'products',
        'invoices',
        'settings'
      ];

      for (const col of collectionsToRestore) {
        if (Array.isArray(parsed.data[col]) && parsed.data[col].length > 0) {
          await batchUpsert(col, parsed.data[col]);
          totalRestored += parsed.data[col].length;
        }
      }

      setStatusMessage({ 
        type: 'success', 
        text: `✓ Yedek başarıyla içeri aktarıldı! ${totalRestored} kayıt tekilleştirilerek sisteme işlendi.` 
      });
      playNotificationSound('success');
      Haptics.notification('success');
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Geri yükleme hatası: ${err.message}` });
    } finally {
      setRestoreLoading(false);
      e.target.value = '';
    }
  };

  const activeAccent = ACCENT_PALETTES[formData.brandAccent || 'blue'] || ACCENT_PALETTES.blue;

  return (
    <div
      className={displayMode === 'modal'
        ? 'fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/75 backdrop-blur-md animate-in fade-in overflow-y-auto'
        : 'w-full animate-in fade-in'}
      onClick={displayMode === 'modal' ? onClose : undefined}
    >
      <div
        role={displayMode === 'modal' ? 'dialog' : 'region'}
        aria-modal={displayMode === 'modal' ? true : undefined}
        aria-labelledby={displayMode === 'modal' ? 'enterprise-suite-title' : undefined}
        aria-label={displayMode === 'page' ? 'Firma ayarları operasyon paneli' : undefined}
        className={`relative w-full bg-base-surface text-text-primary rounded-3xl border border-border overflow-hidden flex flex-col ${displayMode === 'modal' ? 'max-w-5xl shadow-2xl max-h-[94vh]' : 'shadow-sm'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal başlığı. Sayfa görünümünde Ayarlar Merkezi başlığı zaten mevcut. */}
        {displayMode === 'modal' && (
        <div className="p-4 sm:px-8 border-b border-border bg-base-surface-2/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div 
              className="p-3 rounded-2xl border shrink-0 text-white shadow-md flex items-center justify-center"
              style={{ backgroundColor: activeAccent.primary, borderColor: activeAccent.border }}
            >
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="enterprise-suite-title" className="text-lg sm:text-xl font-black tracking-tight text-text-primary">
                  Alpha Enterprise Suite
                </h2>
                <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-brand-500/15 text-brand-600 border border-brand-500/30">
                  Yönetim & Deneyim
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                Şirket kimliği, resmi IBAN'lar, arayüz ergonomisi, B2B politikaları ve Drive yedekleme
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <div className="flex items-center gap-1 p-1 bg-base-surface rounded-xl border border-border">
              <button
                type="button"
                onClick={() => {
                  Haptics.tap();
                  setPreviewDevice('desktop');
                  setActiveTab('preview');
                }}
                className={`p-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'preview' && previewDevice === 'desktop' ? 'bg-base-surface-2 text-text-primary shadow-xs font-bold ring-1 ring-brand-500/40' : 'text-text-muted hover:text-text-primary'
                }`}
                title="Masaüstü Canlı Simülasyonu Aç"
              >
                <Laptop className="w-4 h-4" />
                <span>Masaüstü</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  Haptics.tap();
                  setPreviewDevice('mobile');
                  setActiveTab('preview');
                }}
                className={`p-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'preview' && previewDevice === 'mobile' ? 'bg-brand-500/15 text-brand-600 shadow-xs font-bold ring-2 ring-brand-500' : 'text-text-muted hover:text-text-primary'
                }`}
                title="Mobil Ekran Canlı Simülasyonunu Aç"
              >
                <Smartphone className="w-4 h-4 text-brand-500" />
                <span className="font-bold">Mobil</span>
              </button>
            </div>
          </div>
        </div>
        )}

        {/* Tab Navigation */}
        {!fleetOnly && (
        <div className={`flex items-center gap-1 px-3 sm:px-8 border-b border-border bg-base-surface overflow-x-auto custom-scrollbar shrink-0 ${displayMode === 'page' ? 'rounded-t-3xl' : ''}`}>
          <button
            type="button"
            onClick={() => setActiveTab('studio')}
            className={`px-3 sm:px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'studio' 
                ? 'border-brand-600 text-brand-600' 
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Tasarım & Ergonomi</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('banks')}
            className={`px-3 sm:px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'banks' 
                ? 'border-brand-600 text-brand-600' 
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Banka & IBAN Portföyü</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('identity')}
            className={`px-3 sm:px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'identity' 
                ? 'border-brand-600 text-brand-600' 
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Şirket Kimliği & Yasal</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('policies')}
            className={`px-3 sm:px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'policies' 
                ? 'border-brand-600 text-brand-600' 
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>B2B & Güvenlik</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`px-3 sm:px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'backup' 
                ? 'border-brand-600 text-brand-600' 
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>Google Drive & Yedek</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`px-3 sm:px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'preview' 
                ? 'border-brand-600 text-brand-600 bg-brand-500/5' 
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>Canlı Simülatör ({previewDevice === 'mobile' ? 'Mobil' : 'Masaüstü'})</span>
          </button>
        </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 custom-scrollbar">
          {statusMessage && (
            <div className={`p-4 rounded-2xl text-xs sm:text-sm flex items-center gap-3 border shadow-sm ${
              statusMessage.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300' 
                : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300'
            }`}>
              {statusMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
              <span className="font-medium">{statusMessage.text}</span>
            </div>
          )}

          {/* TAB 1: STUDIO & ERGONOMICS */}
          {activeTab === 'studio' && (
            <div className="space-y-6 animate-in fade-in">
              {/* Theme Selector */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2 flex items-center gap-2">
                  <Sun className="w-4 h-4 text-brand-600" />
                  Genel Tema Tercihi
                </h3>
                <p className="text-xs text-text-secondary mb-3">
                  Tüm portalın ve sitenin aydınlık/karanlık görünümünü anında değiştirin.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => onThemeChange('light')}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      currentTheme === 'light'
                        ? 'bg-white text-slate-900 border-sky-500 ring-2 ring-sky-500/25 shadow-md font-bold'
                        : 'bg-base-surface border-border text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Sun className="w-5 h-5 text-amber-500" />
                      {currentTheme === 'light' && <Check className="w-4 h-4 text-sky-600" />}
                    </div>
                    <div className="font-bold text-xs sm:text-sm">Gündüz (Açık Mod)</div>
                    <div className="text-[11px] opacity-75 mt-1">Ferah ve yüksek kontrastlı beyaz arayüz</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onThemeChange('dark')}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      currentTheme === 'dark'
                        ? 'bg-slate-900 text-white border-sky-500 ring-2 ring-sky-500/25 shadow-md font-bold'
                        : 'bg-base-surface border-border text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Moon className="w-5 h-5 text-sky-400" />
                      {currentTheme === 'dark' && <Check className="w-4 h-4 text-sky-400" />}
                    </div>
                    <div className="font-bold text-xs sm:text-sm">Gece (Koyu Mod)</div>
                    <div className="text-[11px] opacity-75 mt-1">Göz yormayan kurumsal derin slate tonları</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onThemeChange('system')}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      currentTheme === 'system'
                        ? 'bg-base-surface-2 text-text-primary border-sky-500 ring-2 ring-sky-500/25 shadow-md font-bold'
                        : 'bg-base-surface border-border text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Monitor className="w-5 h-5 text-text-muted" />
                      {currentTheme === 'system' && <Check className="w-4 h-4 text-sky-600" />}
                    </div>
                    <div className="font-bold text-xs sm:text-sm">Sistem Otomatik</div>
                    <div className="text-[11px] opacity-75 mt-1">Cihazın saatine/ayarına göre otomatik değişir</div>
                  </button>
                </div>
              </div>

              {/* Accent Palette */}
              <div className="pt-6 border-t border-border">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2 flex items-center gap-2">
                  <Palette className="w-4 h-4 text-brand-600" />
                  Kurumsal Vurgu Rengi (Accent Palette)
                </h3>
                <p className="text-xs text-text-secondary mb-3">
                  Sitenin butonları, sekmeleri ve birincil aksan renkleri anında seçilen renge bürünür.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(Object.keys(ACCENT_PALETTES) as Array<keyof typeof ACCENT_PALETTES>).map(colorKey => {
                    const pal = ACCENT_PALETTES[colorKey];
                    const isSelected = (formData.brandAccent || 'blue') === colorKey;
                    return (
                      <div
                        key={colorKey}
                        onClick={() => handleFieldChange('brandAccent', colorKey)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected 
                            ? 'bg-base-surface-2 border-brand-600 ring-2 ring-brand-500/20 shadow-md' 
                            : 'bg-base-surface border-border hover:border-border-strong'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span 
                            className="w-7 h-7 rounded-xl shadow-xs border border-white/20 shrink-0" 
                            style={{ backgroundColor: pal.primary }} 
                          />
                          <div>
                            <div className="text-xs font-bold text-text-primary">{pal.label}</div>
                            <div className="text-[11px] font-mono text-text-muted">{pal.primary}</div>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-brand-600 shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Corner Radius */}
              <div className="pt-6 border-t border-border">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-brand-600" />
                  Köşe Yumuşaklığı (Border Radius)
                </h3>
                <p className="text-xs text-text-secondary mb-3">
                  Kartlar, butonlar ve giriş alanlarının köşe yuvarlaklığı tarzını belirleyin.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { key: 'sharp', label: 'Kurumsal Keskin (4-6px)', desc: 'Ciddi, endüstriyel ERP çizgileri' },
                    { key: 'rounded', label: 'Modern Dengeli (12px)', desc: 'Apple/Stripe standart dengeli tasarım' },
                    { key: 'pill', label: 'Akışkan & Yumuşak (18-24px)', desc: 'Yeni nesil modern ve sıcak mobil hissi' },
                  ].map(rad => {
                    const isSelected = (formData.brandRadius || 'rounded') === rad.key;
                    return (
                      <div
                        key={rad.key}
                        onClick={() => handleFieldChange('brandRadius', rad.key as any)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-base-surface-2 border-brand-600 ring-2 ring-brand-500/20 shadow-sm'
                            : 'bg-base-surface border-border hover:border-border-strong'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div 
                            className="w-8 h-8 bg-brand-500/20 border border-brand-500/40"
                            style={{
                              borderRadius: rad.key === 'sharp' ? '4px' : rad.key === 'pill' ? '14px' : '8px'
                            }}
                          />
                          {isSelected && <Check className="w-4 h-4 text-brand-600" />}
                        </div>
                        <div className="text-xs sm:text-sm font-bold text-text-primary">{rad.label}</div>
                        <div className="text-[11px] text-text-muted mt-1">{rad.desc}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* UI Density */}
              <div className="pt-6 border-t border-border">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-brand-600" />
                  Arayüz Yoğunluk Modu
                </h3>
                <p className="text-xs text-text-secondary mb-3">
                  Saha personeli için geniş dokunmatik alanlar veya ofis personeli için kompakt tablo görünümü.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: 'comfortable', label: 'Ferah & Dokunmatik Saha Modu', desc: 'Geniş tıklama hedefleri, ferah boşluklar ve mobil ergonomi' },
                    { key: 'compact', label: 'Kompakt Masaüstü ERP Modu', desc: 'Yoğun tablo ve liste görünümü ile ekranda daha fazla satır ve kalem' },
                  ].map(den => {
                    const isSelected = (formData.uiDensity || 'comfortable') === den.key;
                    return (
                      <div
                        key={den.key}
                        onClick={() => handleFieldChange('uiDensity', den.key as any)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-base-surface-2 border-brand-600 ring-2 ring-brand-500/20 shadow-sm'
                            : 'bg-base-surface border-border hover:border-border-strong'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs sm:text-sm font-bold text-text-primary">{den.label}</span>
                          {isSelected && <Check className="w-4 h-4 text-brand-600" />}
                        </div>
                        <p className="text-[11px] text-text-muted mt-1 leading-relaxed">{den.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top Announcement Banner */}
              <div className="pt-6 border-t border-border space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
                      <Megaphone className="w-4 h-4 text-brand-600" />
                      Üst Bar Duyuru Şeridi (Announcement Bar)
                    </h3>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Sitenin en üstünde kampanya, bayram sevkiyatı veya özel duyuru bandı yayınlayın.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.announcementBanner?.enabled ?? true}
                      onChange={(e) => handleBannerChange('enabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-base-surface-2 peer- rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {(formData.announcementBanner?.enabled ?? true) && (
                  <div className="p-4 rounded-2xl bg-base-surface-2/60 border border-border space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-text-secondary mb-1">Duyuru Metni</label>
                      <input
                        type="text"
                        value={formData.announcementBanner?.text || ''}
                        onChange={(e) => handleBannerChange('text', e.target.value)}
                        placeholder="Örn: Alpha Teknik: Bayram tatili öncesi tüm doğalgaz siparişleri aynı gün sevk edilmektedir!"
                        className="w-full px-3.5 py-2.5 bg-base-surface border border-border rounded-xl text-xs sm:text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-text-secondary mb-1">Renk Tonu</label>
                        <select
                          value={formData.announcementBanner?.tone || 'brand'}
                          onChange={(e) => handleBannerChange('tone', e.target.value as any)}
                          className="w-full px-3.5 py-2.5 bg-base-surface border border-border rounded-xl text-xs sm:text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                        >
                          <option value="brand">Kurumsal Degrade (Mavi/İndigo)</option>
                          <option value="info">Bilgi Mavisi</option>
                          <option value="warning">Uyarı Turuncusu / Kehribar</option>
                          <option value="success">Başarı Zümrüt Yeşili</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-text-secondary mb-1">Bağlantı Linki (İsteğe Bağlı)</label>
                        <input
                          type="text"
                          value={formData.announcementBanner?.link || ''}
                          onChange={(e) => handleBannerChange('link', e.target.value)}
                          placeholder="https://..."
                          className="w-full px-3.5 py-2.5 bg-base-surface border border-border rounded-xl text-xs sm:text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: BANK ACCOUNTS & IBAN PORTFOLIO */}
          {activeTab === 'banks' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-brand-600" />
                    Resmi Şirket Tahsilat IBAN Hesapları
                  </h3>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Müşterilerin havale/EFT işlemlerinde sipariş ve teklif ekranında listelenen resmi hesaplar.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddBank(!showAddBank)}
                  className="px-3 py-2 bg-brand-500/15 hover:bg-brand-500/25 text-brand-600 border border-brand-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Yeni IBAN Ekle</span>
                </button>
              </div>

              {/* Add New Bank Form */}
              {showAddBank && (
                <div className="p-4 sm:p-5 rounded-2xl bg-base-surface-2 border border-brand-500/30 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-xs font-bold uppercase text-brand-600 flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Yeni Banka Hesabı Tanımla
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowAddBank(false)}
                      className="text-text-muted hover:text-text-primary text-xs"
                    >
                      İptal
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-text-secondary mb-1">Banka Adı *</label>
                      <input
                        type="text"
                        value={newBank.bankName}
                        onChange={(e) => setNewBank(prev => ({ ...prev, bankName: e.target.value }))}
                        placeholder="Örn: Garanti BBVA"
                        className="w-full px-3 py-2 bg-base-surface border border-border rounded-xl text-xs text-text-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-text-secondary mb-1">Hesap Sahibi Ünvanı *</label>
                      <input
                        type="text"
                        value={newBank.accountHolder}
                        onChange={(e) => setNewBank(prev => ({ ...prev, accountHolder: e.target.value }))}
                        placeholder="ALPHA TEKNİK..."
                        className="w-full px-3 py-2 bg-base-surface border border-border rounded-xl text-xs text-text-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-text-secondary mb-1">Para Birimi</label>
                      <select
                        value={newBank.currency}
                        onChange={(e) => setNewBank(prev => ({ ...prev, currency: e.target.value }))}
                        className="w-full px-3 py-2 bg-base-surface border border-border rounded-xl text-xs text-text-primary"
                      >
                        <option value="TRY">Türk Lirası (₺)</option>
                        <option value="USD">Amerikan Doları ($)</option>
                        <option value="EUR">Euro (€)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-text-secondary mb-1">IBAN Numarası *</label>
                    <input
                      type="text"
                      value={newBank.iban}
                      onChange={(e) => setNewBank(prev => ({ ...prev, iban: e.target.value }))}
                      placeholder="TR00 0000 0000 0000 0000 0000 00"
                      className="w-full px-3 py-2 bg-base-surface border border-border rounded-xl text-xs font-mono text-text-primary"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-text-secondary mb-1">Şube Adı / Kodu (İsteğe Bağlı)</label>
                      <input
                        type="text"
                        value={newBank.branchName || ''}
                        onChange={(e) => setNewBank(prev => ({ ...prev, branchName: e.target.value }))}
                        placeholder="Örn: Karaköprü Ticari (Kod: 631)"
                        className="w-full px-3 py-2 bg-base-surface border border-border rounded-xl text-xs text-text-primary"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                        <input
                          type="checkbox"
                          checked={newBank.isDefault}
                          onChange={(e) => setNewBank(prev => ({ ...prev, isDefault: e.target.checked }))}
                          className="rounded text-brand-600"
                        />
                        <span>Birincil (Varsayılan) Tahsilat Hesabı Yap</span>
                      </label>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleAddBank}
                      className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Hesabı Portföye Ekle
                    </button>
                  </div>
                </div>
              )}

              {/* Bank Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(formData.bankAccounts || []).map((bank) => {
                  const isDefault = bank.isDefault;
                  return (
                    <div
                      key={bank.id}
                      className={`relative p-4 rounded-2xl border transition-all flex flex-col justify-between overflow-hidden group ${
                        isDefault
                          ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-sky-950 text-white border-sky-500/50 shadow-lg ring-2 ring-sky-500/20'
                          : 'bg-base-surface border-border hover:border-border-strong text-text-primary'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm tracking-tight">{bank.bankName}</span>
                            {isDefault && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                                <Star className="w-2.5 h-2.5 fill-amber-400" />
                                Varsayılan
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-white/10 text-text-muted">
                            {bank.currency || 'TRY'}
                          </span>
                        </div>

                        <p className="text-[11px] text-text-secondary truncate mb-2">
                          {bank.accountHolder}
                        </p>

                        <div className="p-2.5 rounded-xl bg-black/20 border border-white/10 font-mono text-xs tracking-wider flex items-center justify-between gap-2">
                          <span className="truncate">{bank.iban}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyIban(bank.iban)}
                            className="p-1 rounded hover:bg-white/20 text-text-secondary hover:text-text-primary shrink-0 transition-colors"
                            title="IBAN Kopyala"
                          >
                            {copiedIban === bank.iban ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        {bank.branchName && (
                          <div className="text-[10px] text-text-muted mt-2 truncate">
                            Şube: {bank.branchName} {bank.branchCode ? `(Kod: ${bank.branchCode})` : ''}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                        {!isDefault ? (
                          <button
                            type="button"
                            onClick={() => handleSetDefaultBank(bank.id)}
                            className="text-[11px] font-semibold text-text-muted hover:text-brand-600 transition-colors"
                          >
                            Varsayılan Yap
                          </button>
                        ) : (
                          <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                            <Check className="w-3 h-3" /> Birincil
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteBank(bank.id)}
                          className="p-1 text-text-muted hover:text-rose-500 transition-colors"
                          title="Hesabı Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: COMPANY IDENTITY & LEGAL */}
          {activeTab === 'identity' && (
            <div className="space-y-6 animate-in fade-in">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-brand-600" />
                  Kurumsal Kimlik & Marka Bilgileri
                </h3>
                <p className="text-xs text-text-secondary mb-3">
                  Sipariş belgeleri, teklif formları ve e-fatura çıktılarında görünen resmi şirket bilgileri.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-text-secondary mb-1">Tam Ticari Ünvan</label>
                    <input
                      type="text"
                      value={formData.companyName || ''}
                      onChange={(e) => handleFieldChange('companyName', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-base-surface border border-border rounded-xl text-xs sm:text-sm text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">Kısa Ticari İsim (Marka Adı)</label>
                    <input
                      type="text"
                      value={formData.shortName || ''}
                      onChange={(e) => handleFieldChange('shortName', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-base-surface border border-border rounded-xl text-xs sm:text-sm text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">Slogan / Başlık</label>
                    <input
                      type="text"
                      value={formData.brandTitle || ''}
                      onChange={(e) => handleFieldChange('brandTitle', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-base-surface border border-border rounded-xl text-xs sm:text-sm text-text-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="pt-6 border-t border-border">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-brand-600" />
                  Resmi İletişim Kanalları
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">Telefon</label>
                    <input
                      type="text"
                      value={formData.phone || ''}
                      onChange={(e) => handleFieldChange('phone', e.target.value)}
                      className="w-full px-3.5 py-2 bg-base-surface border border-border rounded-xl text-xs text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">WhatsApp Sipariş Hattı</label>
                    <input
                      type="text"
                      value={formData.whatsapp || ''}
                      onChange={(e) => handleFieldChange('whatsapp', e.target.value)}
                      className="w-full px-3.5 py-2 bg-base-surface border border-border rounded-xl text-xs text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">E-Posta Adresi</label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => handleFieldChange('email', e.target.value)}
                      className="w-full px-3.5 py-2 bg-base-surface border border-border rounded-xl text-xs text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">Web Sitesi</label>
                    <input
                      type="text"
                      value={formData.website || ''}
                      onChange={(e) => handleFieldChange('website', e.target.value)}
                      className="w-full px-3.5 py-2 bg-base-surface border border-border rounded-xl text-xs text-text-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Legal / Tax Info */}
              <div className="pt-6 border-t border-border">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-brand-600" />
                  Vergi ve Resmi Sicil Kayıtları
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">Vergi Dairesi</label>
                    <input
                      type="text"
                      value={formData.taxOffice || ''}
                      onChange={(e) => handleFieldChange('taxOffice', e.target.value)}
                      className="w-full px-3.5 py-2 bg-base-surface border border-border rounded-xl text-xs text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">Vergi Kimlik No</label>
                    <input
                      type="text"
                      value={formData.taxNumber || ''}
                      onChange={(e) => handleFieldChange('taxNumber', e.target.value)}
                      className="w-full px-3.5 py-2 bg-base-surface border border-border rounded-xl text-xs font-mono text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">MERSİS No</label>
                    <input
                      type="text"
                      value={formData.mersisNo || ''}
                      onChange={(e) => handleFieldChange('mersisNo', e.target.value)}
                      className="w-full px-3.5 py-2 bg-base-surface border border-border rounded-xl text-xs font-mono text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">Ticaret Sicil No</label>
                    <input
                      type="text"
                      value={formData.ticaretSicilNo || ''}
                      onChange={(e) => handleFieldChange('ticaretSicilNo', e.target.value)}
                      className="w-full px-3.5 py-2 bg-base-surface border border-border rounded-xl text-xs font-mono text-text-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="pt-6 border-t border-border">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-brand-600" />
                  Fatura ve Merkez Adresi
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-bold text-text-secondary mb-1">Açık Adres (Cadde/Sokak/Bina)</label>
                    <input
                      type="text"
                      value={formData.address || ''}
                      onChange={(e) => handleFieldChange('address', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-base-surface border border-border rounded-xl text-xs sm:text-sm text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">İlçe</label>
                    <input
                      type="text"
                      value={formData.district || ''}
                      onChange={(e) => handleFieldChange('district', e.target.value)}
                      className="w-full px-3.5 py-2 bg-base-surface border border-border rounded-xl text-xs text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">Şehir</label>
                    <input
                      type="text"
                      value={formData.city || ''}
                      onChange={(e) => handleFieldChange('city', e.target.value)}
                      className="w-full px-3.5 py-2 bg-base-surface border border-border rounded-xl text-xs text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">Posta Kodu</label>
                    <input
                      type="text"
                      value={formData.postalCode || ''}
                      onChange={(e) => handleFieldChange('postalCode', e.target.value)}
                      className="w-full px-3.5 py-2 bg-base-surface border border-border rounded-xl text-xs font-mono text-text-primary"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: FLEET & DISPATCH MANAGEMENT */}
          {activeTab === 'fleet' && (
            <div className="space-y-8 animate-in fade-in">
              {/* Part 1: Vehicles */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
                      <Truck className="w-4 h-4 text-brand-600" />
                      Sevkiyat & Dağıtım Araçları (Özmal / Filo)
                    </h3>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Depo çeki listesi ve şoför sevk irsaliyesi oluştururken kullanılan araç ve plaka kayıtları.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAddVehicle(!showAddVehicle)}
                    className="px-3 py-2 bg-brand-500/15 hover:bg-brand-500/25 text-brand-600 border border-brand-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Yeni Araç Ekle</span>
                  </button>
                </div>

                {/* Add New Vehicle Form */}
                {showAddVehicle && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-base-surface-2 border border-brand-500/30 space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-xs font-bold uppercase text-brand-600 flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Yeni Sevkiyat Aracı Tanımla
                      </h4>
                      <button
                        type="button"
                        onClick={() => setShowAddVehicle(false)}
                        className="text-text-muted hover:text-text-primary text-xs cursor-pointer"
                      >
                        İptal
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-text-muted block mb-1">Araç Plakası *</label>
                        <input
                          type="text"
                          placeholder="Örn: 63 AT 941"
                          value={newVehicle.plate}
                          onChange={(e) => setNewVehicle({ ...newVehicle, plate: e.target.value })}
                          className="w-full px-3 py-2 bg-base-surface border border-border rounded-xl text-xs font-mono font-bold uppercase"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-semibold text-text-muted block mb-1">Araç Adı & Tanımı *</label>
                        <input
                          type="text"
                          placeholder="Örn: ALPHA TEKNİK Özmal Dağıtım Aracı"
                          value={newVehicle.name}
                          onChange={(e) => setNewVehicle({ ...newVehicle, name: e.target.value })}
                          className="w-full px-3 py-2 bg-base-surface border border-border rounded-xl text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-text-muted block mb-1">Araç Tipi</label>
                        <select
                          value={newVehicle.type}
                          onChange={(e) => setNewVehicle({ ...newVehicle, type: e.target.value })}
                          className="w-full px-3 py-2 bg-base-surface border border-border rounded-xl text-xs font-semibold"
                        >
                          <option value="Kamyon">Kamyon</option>
                          <option value="Panelvan">Panelvan</option>
                          <option value="Kamyonet">Kamyonet</option>
                          <option value="Pikap">Pikap</option>
                          <option value="Şantiye Servis">Şantiye Servis</option>
                          <option value="Kurye Motor">Kurye Motor</option>
                          <option value="Diğer">Diğer</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <label className="flex items-center gap-2 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={newVehicle.isDefault}
                          onChange={(e) => setNewVehicle({ ...newVehicle, isDefault: e.target.checked })}
                          className="rounded border-border text-brand-600 focus:ring-brand-500"
                        />
                        <span className="font-medium text-text-secondary">Varsayılan birincil sevkiyat aracı yap</span>
                      </label>

                      <button
                        type="button"
                        onClick={handleAddVehicle}
                        className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        Aracı Kaydet
                      </button>
                    </div>
                  </div>
                )}

                {/* Vehicles Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {(formData.fleetVehicles || []).map((vehicle) => {
                    const isDefault = vehicle.isDefault;
                    return (
                      <div
                        key={vehicle.id}
                        className={`p-4 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                          isDefault 
                            ? 'bg-base-surface-2 border-brand-500/40 shadow-sm ring-1 ring-brand-500/20' 
                            : 'bg-base-surface border-border hover:border-border-strong'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            {/* Turkish Plate Style Badge */}
                            <div className="inline-flex items-center rounded-md border-2 border-slate-700 bg-white dark:bg-slate-900 text-slate-950 dark:text-white px-2 py-0.5 font-mono font-black text-xs tracking-wider shadow-2xs">
                              <span className="bg-blue-600 text-white text-[9px] font-bold px-1 py-0.5 rounded-xs mr-1.5">TR</span>
                              <span>{vehicle.plate}</span>
                            </div>

                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-base-surface-2 text-text-muted border border-border font-semibold">
                              {vehicle.type}
                            </span>
                          </div>

                          <div className="font-bold text-xs text-text-primary">
                            {vehicle.name}
                          </div>
                          {vehicle.capacity && (
                            <div className="text-[10px] text-text-muted mt-1 font-mono">
                              Kapasite: {vehicle.capacity}
                            </div>
                          )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-border/70 flex items-center justify-between gap-2">
                          {!isDefault ? (
                            <button
                              type="button"
                              onClick={() => handleSetDefaultVehicle(vehicle.id)}
                              className="text-[11px] font-semibold text-text-muted hover:text-brand-600 transition-colors cursor-pointer"
                            >
                              Varsayılan Yap
                            </button>
                          ) : (
                            <span className="text-[11px] text-emerald-500 font-semibold flex items-center gap-1">
                              <Check className="w-3 h-3" /> Birincil Araç
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteVehicle(vehicle.id)}
                            className="p-1 text-text-muted hover:text-rose-500 transition-colors cursor-pointer"
                            title="Aracı Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Part 2: Drivers & Dispatch Personnel */}
              <div className="space-y-4 pt-4 border-t border-border">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
                      <Phone className="w-4 h-4 text-emerald-600" />
                      Sevkiyat Şoförleri & Dağıtım Ekibi
                    </h3>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Çeki listesine ve teslimat rotalarına atanan sürücü ve personel bilgileri.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAddDriver(!showAddDriver)}
                    className="px-3 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Yeni Şoför Ekle</span>
                  </button>
                </div>

                {/* Add New Driver Form */}
                {showAddDriver && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-base-surface-2 border border-emerald-500/30 space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-xs font-bold uppercase text-emerald-600 flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Yeni Şoför / Personel Tanımla
                      </h4>
                      <button
                        type="button"
                        onClick={() => setShowAddDriver(false)}
                        className="text-text-muted hover:text-text-primary text-xs cursor-pointer"
                      >
                        İptal
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-text-muted block mb-1">Ad Soyad *</label>
                        <input
                          type="text"
                          placeholder="Örn: Ahmet Yılmaz"
                          value={newDriver.name}
                          onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })}
                          className="w-full px-3 py-2 bg-base-surface border border-border rounded-xl text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-text-muted block mb-1">Telefon Numarası</label>
                        <input
                          type="text"
                          placeholder="Örn: 0544 440 91 80"
                          value={newDriver.phone}
                          onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })}
                          className="w-full px-3 py-2 bg-base-surface border border-border rounded-xl text-xs font-mono font-semibold"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-text-muted block mb-1">Görev / Rol</label>
                        <input
                          type="text"
                          placeholder="Örn: Şoför & Sevkiyat Sorumlusu"
                          value={newDriver.role}
                          onChange={(e) => setNewDriver({ ...newDriver, role: e.target.value })}
                          className="w-full px-3 py-2 bg-base-surface border border-border rounded-xl text-xs font-semibold"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <label className="flex items-center gap-2 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={newDriver.isDefault}
                          onChange={(e) => setNewDriver({ ...newDriver, isDefault: e.target.checked })}
                          className="rounded border-border text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="font-medium text-text-secondary">Varsayılan birincil şoför yap</span>
                      </label>

                      <button
                        type="button"
                        onClick={handleAddDriver}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        Şoförü Kaydet
                      </button>
                    </div>
                  </div>
                )}

                {/* Drivers Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {(formData.dispatchPersonnel || []).map((driver) => {
                    const isDefault = driver.isDefault;
                    return (
                      <div
                        key={driver.id}
                        className={`p-4 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                          isDefault 
                            ? 'bg-base-surface-2 border-emerald-500/40 shadow-sm ring-1 ring-emerald-500/20' 
                            : 'bg-base-surface border-border hover:border-border-strong'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <strong className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                              <span>{driver.name}</span>
                            </strong>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-500/20">
                              {driver.role}
                            </span>
                          </div>

                          <div className="text-[11px] font-mono text-text-muted flex items-center gap-1 mt-1">
                            <Phone className="w-3 h-3 text-emerald-500" />
                            <span>{driver.phone}</span>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-border/70 flex items-center justify-between gap-2">
                          {!isDefault ? (
                            <button
                              type="button"
                              onClick={() => handleSetDefaultDriver(driver.id)}
                              className="text-[11px] font-semibold text-text-muted hover:text-emerald-600 transition-colors cursor-pointer"
                            >
                              Varsayılan Yap
                            </button>
                          ) : (
                            <span className="text-[11px] text-emerald-500 font-semibold flex items-center gap-1">
                              <Check className="w-3 h-3" /> Birincil Şoför
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteDriver(driver.id)}
                            className="p-1 text-text-muted hover:text-rose-500 transition-colors cursor-pointer"
                            title="Şoförü Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: B2B POLICIES & SECURITY */}
          {activeTab === 'policies' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="p-4 sm:p-5 rounded-2xl bg-base-surface border border-border flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-text-primary flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-500" />
                    Misafir Ziyaretçilere Fiyatları Gizle (B2B Bayi Modu)
                  </h4>
                  <p className="text-xs text-text-secondary mt-1">
                    Giriş yapmamış kullanıcılara fiyatlar gizlenir ve "Yetkili Bayi Girişi Yapınız" rozeti gösterilir.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={formData.hidePricesForGuests ?? false}
                    onChange={(e) => handleFieldChange('hidePricesForGuests', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-base-surface-2 peer- rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                </label>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-base-surface border border-border flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-text-primary flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-emerald-500" />
                    WhatsApp Hızlı Destek & Sipariş Butonu
                  </h4>
                  <p className="text-xs text-text-secondary mt-1">
                    Ekranların sağ alt köşesinde müşteriler için hızlı WhatsApp iletişim butonu gösterilir.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={formData.whatsappSupportEnabled ?? true}
                    onChange={(e) => handleFieldChange('whatsappSupportEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-base-surface-2 peer- rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Cloud Security Shield Card */}
              <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-950/40 via-base-surface to-base-surface border border-emerald-500/30 space-y-3">
                <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-sm">
                  <ShieldCheck className="w-5 h-5" />
                  <span>Google Cloud & Firestore Siber Güvenlik Kalkanı</span>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Sisteminiz Google Cloud global altyapısında 256-bit SSL/TLS şifreleme ve DDoS kalkanı ile korunmaktadır. 
                  Yönetici yetkileri ve ticari defterler (<code className="text-emerald-400 font-mono">firestore.rules</code>) 
                  ile dış dünyaya kilitlidir.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2">
                  <div className="flex items-center gap-2 text-text-secondary">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Cari ve Kasa verileri yalnızca adminlere açıktır</span>
                  </div>
                  <div className="flex items-center gap-2 text-text-secondary">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Müşteriler sadece kendi sipariş/tekliflerini görebilir</span>
                  </div>
                  <div className="flex items-center gap-2 text-text-secondary">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Yetkisiz fiyat ve stok değişiklikleri engellenmiştir</span>
                  </div>
                  <div className="flex items-center gap-2 text-text-secondary">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Banka hesap şifreleri sistemde asla tutulmaz</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: GOOGLE DRIVE & DATA BACKUP */}
          {activeTab === 'backup' && (
            <div className="space-y-6 animate-in fade-in">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2 flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-brand-600" />
                  Google Drive & Bulut Veri Yedekleme Merkezi
                </h3>
                <p className="text-xs text-text-secondary mb-4">
                  Olası veri kaybına karşı tüm cari hesapları, finansal hareketleri, ürünleri ve siparişleri tek tıkla tarih damgalı olarak yedekleyin.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Export Card */}
                  <div className="p-5 rounded-2xl bg-base-surface-2/70 border border-border space-y-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-brand-600 font-bold text-sm mb-1">
                        <Download className="w-4 h-4" />
                        <span>Tam Sistem Yedeği Al (JSON / Drive)</span>
                      </div>
                      <p className="text-xs text-text-secondary leading-relaxed">
                        Tüm cari defterleri, stokları, faturaları, teklifleri ve şirket ayarlarını içeren tek bir güvenli yedek paketi oluşturur.
                      </p>
                      {lastBackupInfo && (
                        <div className="text-[11px] text-emerald-500 font-medium mt-2 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Son İndirilen Yedek: {lastBackupInfo}</span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={backupLoading}
                      onClick={handleExportFullBackup}
                      className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 active:scale-98 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50 cursor-pointer"
                    >
                      {backupLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      <span>{backupLoading ? 'Paketleniyor...' : 'Tüm Veritabanını İndir & Drive\'a Kaydet'}</span>
                    </button>
                  </div>

                  {/* Restore Card */}
                  <div className="p-5 rounded-2xl bg-base-surface-2/70 border border-border space-y-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-amber-500 font-bold text-sm mb-1">
                        <Upload className="w-4 h-4" />
                        <span>Yedekten Sistemi Kurtar (Restore)</span>
                      </div>
                      <p className="text-xs text-text-secondary leading-relaxed">
                        Daha önce indirdiğiniz <code className="text-amber-500 font-mono">.json</code> formatındaki yedeği seçerek veritabanını kurtarabilirsiniz.
                      </p>
                    </div>

                    <label className="w-full py-2.5 px-4 bg-base-surface hover:bg-base-surface-2 border border-border hover:border-border-strong text-text-primary rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer">
                      {restoreLoading ? <RefreshCw className="w-4 h-4 animate-spin text-amber-500" /> : <Upload className="w-4 h-4 text-amber-500" />}
                      <span>{restoreLoading ? 'Kurtarılıyor...' : 'Yedek Dosyası Seç & Geri Yükle'}</span>
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleRestoreBackup}
                        disabled={restoreLoading}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Google Drive Guide */}
              <div className="p-5 rounded-3xl bg-base-surface-2/50 border border-border space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-sky-500" />
                  Google Drive Otomatik Senkronizasyon Kılavuzu
                </h4>
                <ol className="text-xs text-text-secondary space-y-2 list-decimal list-inside leading-relaxed">
                  <li>Yukarıdaki <strong>"Tüm Veritabanını İndir"</strong> butonuna tıklayarak tarih damgalı yedek dosyasını bilgisayarınıza indirin.</li>
                  <li>Bilgisayarınızdaki <strong>Google Drive</strong> klasöründe <code className="text-sky-400 font-mono">SiatTek_Yedekler</code> adında bir klasör açın.</li>
                  <li>İndirilen dosyayı bu klasöre taşıdığınızda dosyanız anında Google Drive bulut hesabınızda güvenle arşivlenecektir.</li>
                </ol>
              </div>

              {/* Anti-Duplication & Safe Upsert Explanation Card */}
              <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-blue-300">
                  <ShieldCheck className="w-4 h-4 text-blue-400" />
                  <span>Mükerrer (Çift) Kayıt Koruması & Akıllı Birleştirme Garantisi</span>
                </div>
                <p className="leading-relaxed text-[11px] text-slate-300">
                  <strong>Eski veriler silinmemişse yedekten yükleyince mükerrer kayıt oluşur mu?</strong><br />
                  Hayır, kesinlikle oluşmaz. Sistemimiz <strong>ID bazlı Akıllı Upsert (Tekilleştirme)</strong> mimarisi kullanır. Her sipariş, cari ve ürünün benzersiz kimliği (ID) korunur. Bir yedeği sisteme yüklediğinizde aynı ID'li kayıtların üzerine güncellenir; mükerrer (çift) kayıt oluşması teknik olarak engellenmiştir.
                </p>
              </div>
            </div>
          )}

          {/* TAB 6: LIVE PREVIEW SIMULATION */}
          {activeTab === 'preview' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-base-surface-2/40 border border-border">
                <div>
                  <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                    <Eye className="w-4 h-4 text-brand-600" />
                    <span>Canlı Tercih Simülatörü</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/15 text-brand-600 font-extrabold uppercase">
                      {previewDevice === 'mobile' ? 'Mobil Ekran (390px)' : 'Masaüstü (1280px)'}
                    </span>
                  </h3>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Yapılan tema, renk, duyuru ve ergonomi değişikliklerinin son kullanıcıya nasıl görüneceğini test edin.
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="flex items-center gap-1 p-1 bg-base-surface rounded-xl border border-border">
                    <button
                      type="button"
                      onClick={() => setPreviewDevice('desktop')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        previewDevice === 'desktop' ? 'bg-base-surface-2 text-text-primary shadow-xs font-bold ring-1 ring-brand-500/30' : 'text-text-muted hover:text-text-primary'
                      }`}
                    >
                      <Laptop className="w-3.5 h-3.5" />
                      <span>Masaüstü</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewDevice('mobile')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        previewDevice === 'mobile' ? 'bg-brand-500/15 text-brand-600 shadow-xs font-bold ring-2 ring-brand-500' : 'text-text-muted hover:text-text-primary'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5 text-brand-500" />
                      <span>Mobil</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      window.open(window.location.origin, '_blank', 'width=390,height=844,menubar=no,toolbar=no,location=no,status=no');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-base-surface hover:bg-base-surface-2 border border-border hover:border-border-strong text-xs font-bold text-text-primary flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    title="Ayrı küçük pencerede gerçek mobil sayfayı aç"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-brand-500" />
                    <span className="hidden md:inline">Yeni Pencerede Canlı Mobil Portalı Aç</span>
                    <span className="md:hidden">Canlı Pencere</span>
                  </button>
                </div>
              </div>

              {previewDevice === 'mobile' ? (
                /* SMARTPHONE MOCKUP FRAME */
                <div className="flex justify-center py-2">
                  <div className="w-[360px] sm:w-[380px] rounded-[42px] border-[6px] border-slate-800 bg-base shadow-2xl p-3.5 space-y-2.5 ring-2 ring-slate-700/60 relative overflow-hidden transition-all">
                    {/* Dynamic Island / Notch & Status Bar */}
                    <div className="flex items-center justify-between px-3 pt-0.5 text-[10px] text-text-muted font-mono select-none">
                      <span className="font-bold text-text-primary">12:45</span>
                      <div className="w-20 h-3.5 bg-slate-900 rounded-full mx-auto" />
                      <div className="flex items-center gap-1 text-[9px]">
                        <span>5G</span>
                        <span>%100</span>
                      </div>
                    </div>

                    {/* Announcement Banner */}
                    {(formData.announcementBanner?.enabled ?? true) && (
                      <div 
                        className="px-3 py-1.5 rounded-lg text-white text-[10px] font-semibold flex items-center justify-between shadow-xs transition-colors"
                        style={{ backgroundColor: activeAccent.primary }}
                      >
                        <span className="truncate">{formData.announcementBanner?.text || 'Alpha Teknik: B2B Dijital Sipariş Portalı'}</span>
                        <span className="text-[9px] opacity-85 underline shrink-0 ml-2">Detay</span>
                      </div>
                    )}

                    {/* Mobile Header Bar */}
                    <div className="p-2.5 bg-base-surface rounded-xl border border-border flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-white text-xs shadow-xs" 
                          style={{ backgroundColor: activeAccent.primary }}
                        >
                          α
                        </span>
                        <div>
                          <span className="font-black text-xs text-text-primary block leading-tight">
                            {formData.shortName || 'ALPHA TEKNİK'}
                          </span>
                          <span className="text-[9px] text-text-muted">HVAC & Doğalgaz B2B</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-base-surface-2 border border-border text-text-secondary font-mono">
                          {currentTheme === 'dark' ? 'Gece' : 'Gündüz'}
                        </span>
                        <button
                          type="button"
                          className="px-2 py-0.5 text-white text-[10px] font-bold rounded shadow-xs"
                          style={{ backgroundColor: activeAccent.primary }}
                        >
                          Giriş
                        </button>
                      </div>
                    </div>

                    {/* Mobile Search Input Mockup */}
                    <div className="p-2 bg-base-surface rounded-xl border border-border flex items-center gap-2 text-text-muted text-[11px]">
                      <Search className="w-3.5 h-3.5" />
                      <span className="truncate">Ürün, kod veya marka ara...</span>
                    </div>

                    {/* Quick Category Chips */}
                    <div className="flex items-center gap-1 overflow-x-auto py-0.5 custom-scrollbar text-[10px]">
                      <span className="px-2 py-0.5 rounded-full text-white font-bold shrink-0 shadow-xs" style={{ backgroundColor: activeAccent.primary }}>Tümü</span>
                      <span className="px-2 py-0.5 rounded-full bg-base-surface border border-border text-text-secondary shrink-0">Doğalgaz</span>
                      <span className="px-2 py-0.5 rounded-full bg-base-surface border border-border text-text-secondary shrink-0">Radyatör</span>
                      <span className="px-2 py-0.5 rounded-full bg-base-surface border border-border text-text-secondary shrink-0">Sayaç</span>
                      <span className="px-2 py-0.5 rounded-full bg-base-surface border border-border text-text-secondary shrink-0">Kombi</span>
                    </div>

                    {/* Product Card 1 Mockup */}
                    <div className="p-3 bg-base-surface rounded-2xl border border-border space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span 
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full inline-block"
                            style={{ backgroundColor: `${activeAccent.primary}20`, color: activeAccent.primary }}
                          >
                            DOĞALGAZ BORULARI
                          </span>
                          <h5 className="font-bold text-xs text-text-primary mt-1 truncate">
                            PPRC Doğalgaz Borusu 20mm (4m)
                          </h5>
                          <span className="text-[10px] text-text-muted font-mono block mt-0.5">PN25 Standart Sertifikalı</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-emerald-500 shrink-0">
                          {formData.hidePricesForGuests ? 'Bayi Girişi' : '150,00 ₺'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Stok: 45 Adet</span>
                        <button
                          type="button"
                          className="px-3 py-1 text-white text-[11px] font-bold rounded-lg shadow-xs"
                          style={{ backgroundColor: activeAccent.primary }}
                        >
                          Sepete Ekle
                        </button>
                      </div>
                    </div>

                    {/* Product Card 2 Mockup */}
                    <div className="p-3 bg-base-surface rounded-2xl border border-border space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span 
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full inline-block"
                            style={{ backgroundColor: `${activeAccent.primary}20`, color: activeAccent.primary }}
                          >
                            VANA & ARMATÜR
                          </span>
                          <h5 className="font-bold text-xs text-text-primary mt-1 truncate">
                            Doğalgaz Küresel Vana 1/2" PN5
                          </h5>
                          <span className="text-[10px] text-text-muted font-mono block mt-0.5">TSE Belgeli Sarı Pirinç</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-emerald-500 shrink-0">
                          {formData.hidePricesForGuests ? 'Bayi Girişi' : '185,00 ₺'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Stok: 120 Adet</span>
                        <button
                          type="button"
                          className="px-3 py-1 text-white text-[11px] font-bold rounded-lg shadow-xs"
                          style={{ backgroundColor: activeAccent.primary }}
                        >
                          Sepete Ekle
                        </button>
                      </div>
                    </div>

                    {/* Mobile Bottom Navigation Bar Mockup */}
                    <div className="p-2 bg-base-surface-2 rounded-2xl border border-border flex items-center justify-around text-[9px] text-text-muted pt-1.5 pb-1">
                      <div className="flex flex-col items-center gap-0.5 font-bold" style={{ color: activeAccent.primary }}>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Ana Sayfa</span>
                      </div>
                      <div className="flex flex-col items-center gap-0.5">
                        <Palette className="w-3.5 h-3.5" />
                        <span>Katalog</span>
                      </div>
                      <div className="flex flex-col items-center gap-0.5 relative">
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Sepet (3)</span>
                      </div>
                      <div className="flex flex-col items-center gap-0.5">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>Siparişler</span>
                      </div>
                    </div>

                    {/* Floating WhatsApp Button Mockup */}
                    {(formData.whatsappSupportEnabled ?? true) && (
                      <div className="flex items-center justify-end pr-1">
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-bold shadow-lg">
                          <MessageCircle className="w-3 h-3" />
                          <span>Hızlı Sipariş WhatsApp</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* DESKTOP WIDESCREEN MOCKUP */
                <div className="border border-border bg-base rounded-3xl p-4 sm:p-6 shadow-inner space-y-4">
                  {/* Announcement Bar Simulation */}
                  {(formData.announcementBanner?.enabled ?? true) && (
                    <div 
                      className="px-4 py-2 rounded-xl text-white text-xs font-semibold flex items-center justify-between shadow-xs transition-colors"
                      style={{ backgroundColor: activeAccent.primary }}
                    >
                      <span className="truncate">{formData.announcementBanner?.text || 'Alpha Teknik: B2B Dijital Sipariş & Proje Portalı'}</span>
                      <span className="text-[11px] opacity-85 underline shrink-0 ml-2">Detayları İncele</span>
                    </div>
                  )}

                  {/* Header Mockup */}
                  <div className="p-4 bg-base-surface rounded-2xl border border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span 
                        className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-sm shadow-xs" 
                        style={{ backgroundColor: activeAccent.primary }}
                      >
                        α
                      </span>
                      <div>
                        <span className="font-extrabold text-sm sm:text-base text-text-primary block leading-tight">
                          {formData.shortName || 'ALPHA TEKNİK'}
                        </span>
                        <span className="text-xs text-text-muted">{formData.companyName || 'Alpha Teknik Ltd. Şti.'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2.5 py-1 rounded-lg bg-base-surface-2 border border-border text-text-secondary font-mono">
                        {currentTheme === 'dark' ? 'Koyu Mod (Gece)' : 'Açık Mod (Gündüz)'}
                      </span>
                      <button
                        type="button"
                        className="px-4 py-1.5 text-white text-xs font-bold rounded-xl shadow-xs"
                        style={{ backgroundColor: activeAccent.primary }}
                      >
                        Müşteri Girişi
                      </button>
                    </div>
                  </div>

                  {/* Desktop Product Grid Mockup */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-base-surface rounded-2xl border border-border space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <span 
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: `${activeAccent.primary}20`, color: activeAccent.primary }}
                          >
                            DOĞALGAZ BORULARI
                          </span>
                          <h5 className="font-bold text-sm text-text-primary mt-1">
                            PPRC Doğalgaz Borusu 20mm (Boy: 4m)
                          </h5>
                          <span className="text-xs text-text-muted">PN25 Basınca Dayanıklı</span>
                        </div>
                        <span className="text-sm font-mono font-bold text-emerald-500">
                          {formData.hidePricesForGuests ? 'Bayi Girişi Gerekir' : '150,00 ₺'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <span className="text-xs text-text-muted">Mevcut Stok: 45 Adet</span>
                        <button
                          type="button"
                          className="px-4 py-1.5 text-white text-xs font-bold rounded-xl shadow-xs"
                          style={{ backgroundColor: activeAccent.primary }}
                        >
                          Sepete Ekle
                        </button>
                      </div>
                    </div>

                    <div className="p-4 bg-base-surface rounded-2xl border border-border space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <span 
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: `${activeAccent.primary}20`, color: activeAccent.primary }}
                          >
                            VANA & ARMATÜR
                          </span>
                          <h5 className="font-bold text-sm text-text-primary mt-1">
                            Doğalgaz Küresel Vana 1/2" PN5
                          </h5>
                          <span className="text-xs text-text-muted">TSE Standartlı Gaz Emniyetli</span>
                        </div>
                        <span className="text-sm font-mono font-bold text-emerald-500">
                          {formData.hidePricesForGuests ? 'Bayi Girişi Gerekir' : '185,00 ₺'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <span className="text-xs text-text-muted">Mevcut Stok: 120 Adet</span>
                        <button
                          type="button"
                          className="px-4 py-1.5 text-white text-xs font-bold rounded-xl shadow-xs"
                          style={{ backgroundColor: activeAccent.primary }}
                        >
                          Sepete Ekle
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky Status Message Banner right above footer */}
        {statusMessage && (
          <div className={`mx-4 sm:mx-8 mb-2 p-3.5 rounded-2xl text-xs sm:text-sm flex items-center justify-between gap-3 border shadow-lg transition-all animate-in slide-in-from-bottom-2 shrink-0 ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-800 dark:text-emerald-200 ring-2 ring-emerald-500/20' 
              : 'bg-red-500/15 border-red-500/35 text-red-800 dark:text-red-200 ring-2 ring-red-500/20'
          }`}>
            <div className="flex items-center gap-2.5 min-w-0">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 animate-in zoom-in-75" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
              )}
              <span className="font-bold leading-tight truncate sm:whitespace-normal">{statusMessage.text}</span>
            </div>
            <button 
              type="button" 
              onClick={() => setStatusMessage(null)} 
              className="px-2 py-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg cursor-pointer text-xs font-bold shrink-0"
              title="Kapat"
            >
              Kapat
            </button>
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-4 sm:px-8 border-t border-border bg-base-surface-2/60 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <button
              type="button"
              onClick={handleResetToDefault}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Varsayılana Sıfırla</span>
            </button>

            {isDirty ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />
                <span>Kaydedilmemiş Değişiklikler Var</span>
              </span>
            ) : lastSavedTime ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Son Kayıt: {lastSavedTime} (Bulut Güncel)</span>
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {displayMode === 'modal' && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs sm:text-sm font-bold text-text-secondary hover:text-text-primary bg-base-surface border border-border rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                Kapat
              </button>
            )}
            <button
              type="button"
              disabled={saveState === 'saving'}
              onClick={handleSave}
              className={`flex items-center justify-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-black text-white rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-60 cursor-pointer min-w-[220px] ${
                saveState === 'saved'
                  ? 'bg-emerald-600 hover:bg-emerald-500 ring-4 ring-emerald-500/40 shadow-xl shadow-emerald-600/40 scale-[1.02]'
                  : saveState === 'error'
                  ? 'bg-red-600 hover:bg-red-500 ring-2 ring-red-500'
                  : isDirty
                  ? 'ring-2 ring-amber-400/80 shadow-lg'
                  : ''
              }`}
              style={saveState === 'idle' || saveState === 'saving' ? { backgroundColor: activeAccent.primary } : undefined}
            >
              {saveState === 'saving' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Buluta Kaydediliyor...</span>
                </>
              ) : saveState === 'saved' ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-white animate-in zoom-in-75" />
                  <span className="tracking-wide">✓ BAŞARIYLA KAYDEDİLDİ!</span>
                </>
              ) : saveState === 'error' ? (
                <>
                  <AlertCircle className="w-4 h-4 text-white" />
                  <span>Kayıt Başarısız (Tekrar Dene)</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isDirty ? '● Değişiklikleri Kaydet & Yayınla' : 'Değişiklikleri Kaydet & Yayınla'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
