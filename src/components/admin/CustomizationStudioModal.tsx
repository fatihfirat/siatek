import React, { useState, useEffect } from 'react';
import { 
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
  ShieldAlert, 
  Eye, 
  Smartphone, 
  Laptop,
  Megaphone,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { 
  CompanySettings, 
  useCompanySettings, 
  saveCompanySettings, 
  DEFAULT_COMPANY_SETTINGS, 
  ACCENT_PALETTES, 
  applyCompanyBrandStyles 
} from '../../lib/companySettings';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import { playNotificationSound } from '../../lib/audio';
import confetti from 'canvas-confetti';

interface CustomizationStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: 'dark' | 'light' | 'system';
  onThemeChange: (theme: 'dark' | 'light' | 'system') => void;
}

export default function CustomizationStudioModal({
  isOpen,
  onClose,
  currentTheme,
  onThemeChange,
}: CustomizationStudioModalProps) {
  useModalBehavior(isOpen, onClose);
  const companySettings = useCompanySettings();

  const [activeTab, setActiveTab] = useState<'branding' | 'ergonomics' | 'policy' | 'preview'>('branding');
  const [formData, setFormData] = useState<CompanySettings>(companySettings);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFormData(companySettings);
      setStatusMessage(null);
    }
  }, [isOpen, companySettings]);

  if (!isOpen) return null;

  const handleFieldChange = <K extends keyof CompanySettings>(field: K, value: CompanySettings[K]) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      applyCompanyBrandStyles(updated);
      return updated;
    });
  };

  const handleBannerChange = (field: 'enabled' | 'text' | 'link' | 'tone', value: any) => {
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
    setIsSaving(true);
    setStatusMessage(null);

    try {
      await saveCompanySettings(formData);
      applyCompanyBrandStyles(formData);
      setStatusMessage({ type: 'success', text: 'Özelleştirmeler başarıyla kaydedildi ve sisteme uygulandı!' });
      playNotificationSound('status');
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.6 }
      });
      setTimeout(() => {
        setStatusMessage(null);
      }, 3000);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Ayarlar kaydedilirken bir hata oluştu.' });
    } finally {
      setIsSaving(false);
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
      setFormData(resetData);
      applyCompanyBrandStyles(resetData);
      onThemeChange('dark');
    }
  };

  const activeAccent = ACCENT_PALETTES[formData.brandAccent || 'blue'] || ACCENT_PALETTES.blue;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in overflow-y-auto" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="customization-studio-title"
        className="relative w-full max-w-5xl bg-base-surface text-text-primary rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 sm:px-8 border-b border-border bg-base-surface-2/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-brand-500/15 text-brand-600 border border-brand-500/20 shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 id="customization-studio-title" className="text-lg sm:text-xl font-bold tracking-tight">
                Kurumsal Özelleştirme & Deneyim Stüdyosu
              </h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Şirket kimliğini, renk temasını, arayüz ergonomisini ve B2B politikalarını yönetin
              </p>
            </div>
          </div>

          {/* Device toggle for preview context */}
          <div className="flex items-center gap-1.5 p-1 bg-base-surface rounded-xl border border-border shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setPreviewDevice('desktop')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                previewDevice === 'desktop' ? 'bg-base-surface-2 text-text-primary shadow-xs font-bold' : 'text-text-muted hover:text-text-primary'
              }`}
              title="Masaüstü Canlı Simülasyon"
            >
              <Laptop className="w-4 h-4" />
              <span className="hidden sm:inline">Masaüstü</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewDevice('mobile')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                previewDevice === 'mobile' ? 'bg-base-surface-2 text-text-primary shadow-xs font-bold' : 'text-text-muted hover:text-text-primary'
              }`}
              title="Mobil Canlı Simülasyon"
            >
              <Smartphone className="w-4 h-4" />
              <span className="hidden sm:inline">Mobil</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 sm:px-8 border-b border-border bg-base-surface overflow-x-auto custom-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('branding')}
            className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'branding' 
                ? 'border-brand-600 text-brand-600' 
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Marka & Renk Paleti</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ergonomics')}
            className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'ergonomics' 
                ? 'border-brand-600 text-brand-600' 
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Arayüz & Ergonomi</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('policy')}
            className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'policy' 
                ? 'border-brand-600 text-brand-600' 
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>B2B & Operasyon Tercihleri</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'preview' 
                ? 'border-brand-600 text-brand-600' 
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>Canlı Önizleme Mockup</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 custom-scrollbar">
          {statusMessage && (
            <div className={`p-4 rounded-2xl text-xs sm:text-sm flex items-center gap-3 border ${
              statusMessage.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300' 
                : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300'
            }`}>
              {statusMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* TAB 1: BRANDING & COLORS */}
          {activeTab === 'branding' && (
            <div className="space-y-6 animate-in fade-in">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted mb-3 flex items-center gap-2">
                  <Palette className="w-4 h-4 text-brand-600" />
                  Kurumsal Vurgu Rengi (Accent Palette)
                </h3>
                <p className="text-xs text-text-secondary mb-4">
                  Sitenin birincil butonları, sepet göstergeleri, sekme çizgileri ve ikon vurguları bu renge bürünür.
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

              {/* Top Announcement Banner Config */}
              <div className="pt-6 border-t border-border space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
                      <Megaphone className="w-4 h-4 text-brand-600" />
                      Üst Bar Duyuru Şeridi (Announcement Bar)
                    </h3>
                    <p className="text-xs text-text-secondary mt-1">
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
                  <div className="p-4 rounded-2xl bg-base-surface-2/60 border border-border space-y-3.5">
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
                        <label className="block text-xs font-bold text-text-secondary mb-1">Renk Tonu (Vurgu)</label>
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
                        >
                        </input>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ERGONOMICS & INTERFACE */}
          {activeTab === 'ergonomics' && (
            <div className="space-y-6 animate-in fade-in">
              {/* Theme Mode Selection */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted mb-2 flex items-center gap-2">
                  <Sun className="w-4 h-4 text-brand-600" />
                  Genel Tema Modu
                </h3>
                <p className="text-xs text-text-secondary mb-4">
                  Arayüzün varsayılan renk modunu seçin. Mobil ve masaüstü tarayıcılarda sorunsuz çalışır.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => onThemeChange('light')}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      currentTheme === 'light'
                        ? 'bg-white text-slate-900 border-sky-500 ring-2 ring-sky-500/20 shadow-md font-bold'
                        : 'bg-base-surface border-border text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Sun className="w-5 h-5 text-amber-500" />
                      {currentTheme === 'light' && <Check className="w-4 h-4 text-sky-600" />}
                    </div>
                    <div className="font-bold text-xs sm:text-sm">Gündüz (Açık Mod)</div>
                    <div className="text-[11px] opacity-70 mt-1">Ferah ve yüksek kontrastlı beyaz arayüz</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onThemeChange('dark')}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      currentTheme === 'dark'
                        ? 'bg-slate-900 text-white border-sky-500 ring-2 ring-sky-500/20 shadow-md font-bold'
                        : 'bg-base-surface border-border text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Moon className="w-5 h-5 text-sky-400" />
                      {currentTheme === 'dark' && <Check className="w-4 h-4 text-sky-400" />}
                    </div>
                    <div className="font-bold text-xs sm:text-sm">Gece (Koyu Mod)</div>
                    <div className="text-[11px] opacity-70 mt-1">Göz yormayan kurumsal derin slate tonları</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onThemeChange('system')}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      currentTheme === 'system'
                        ? 'bg-base-surface-2 text-text-primary border-sky-500 ring-2 ring-sky-500/20 shadow-md font-bold'
                        : 'bg-base-surface border-border text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Monitor className="w-5 h-5 text-text-muted" />
                      {currentTheme === 'system' && <Check className="w-4 h-4 text-sky-600" />}
                    </div>
                    <div className="font-bold text-xs sm:text-sm">Sistem Otomatik</div>
                    <div className="text-[11px] opacity-70 mt-1">Cihazın saatine/ayarına göre otomatik değişir</div>
                  </button>
                </div>
              </div>

              {/* Corner Radius Selection */}
              <div className="pt-6 border-t border-border">
                <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted mb-2 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-brand-600" />
                  Köşe Yumuşaklığı (Border Radius)
                </h3>
                <p className="text-xs text-text-secondary mb-4">
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
                <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted mb-2 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-brand-600" />
                  Arayüz Yoğunluk Modu
                </h3>
                <p className="text-xs text-text-secondary mb-4">
                  Saha personeli için geniş dokunmatik alanlar veya ofis personeli için kompakt veri görünümü.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: 'comfortable', label: 'Ferah & Dokunmatik Saha Modu', desc: 'Geniş tıklama hedefleri, ferah boşluklar ve mobil ergonomi' },
                    { key: 'compact', label: 'Kompakt Masaüstü ERP Modu', desc: 'Yoğun tablo ve liste görünümü ile ekranda daha fazla kalem' },
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
            </div>
          )}

          {/* TAB 3: B2B POLICY & OPERATIONS */}
          {activeTab === 'policy' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="p-4 sm:p-5 rounded-2xl bg-base-surface border border-border flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-text-primary flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-500" />
                    Misafir Ziyaretçilere Fiyatları Gizle
                  </h4>
                  <p className="text-xs text-text-secondary mt-1">
                    Giriş yapmamış kullanıcılara fiyat yerine "Yetkili Bayi Girişi Yapınız" ibaresi gösterilir.
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
                    Tüm ekranların sağ alt köşesinde hızlı WhatsApp iletişim düğmesi gösterilir.
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
            </div>
          )}

          {/* TAB 4: INTERACTIVE LIVE PREVIEW */}
          {activeTab === 'preview' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
                  <Eye className="w-4 h-4 text-brand-600" />
                  Seçilen Tercihlerle Canlı Mockup Önizlemesi
                </h3>
                <span className="text-xs text-text-secondary font-mono">
                  {previewDevice === 'desktop' ? '1280px Masaüstü' : '390px Mobil Ekran'}
                </span>
              </div>

              <div className={`mx-auto border border-border bg-base rounded-3xl p-3 sm:p-6 shadow-inner transition-all ${
                previewDevice === 'mobile' ? 'max-w-sm rounded-[36px] ring-4 ring-slate-800' : 'w-full'
              }`}>
                {/* Simulated Announcement */}
                {(formData.announcementBanner?.enabled ?? true) && (
                  <div 
                    className="mb-3 px-3 py-1.5 rounded-lg text-white text-[11px] font-semibold flex items-center justify-between"
                    style={{ backgroundColor: activeAccent.primary }}
                  >
                    <span className="truncate">{formData.announcementBanner?.text || 'Duyuru Metni'}</span>
                    <span className="text-[10px] opacity-80 underline">Detaylar</span>
                  </div>
                )}

                {/* Simulated Header */}
                <div className="p-3 bg-base-surface rounded-2xl border border-border flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-white text-xs" 
                      style={{ backgroundColor: activeAccent.primary }}
                    >
                      α
                    </span>
                    <span className="font-bold text-xs sm:text-sm text-text-primary">
                      {formData.shortName || 'ALPHA TEKNİK'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-1 rounded-md bg-base-surface-2 border border-border text-text-secondary">
                      {currentTheme === 'dark' ? 'Gece' : 'Gündüz'}
                    </span>
                    <button
                      type="button"
                      className="px-2.5 py-1 text-white text-[11px] font-bold rounded-lg shadow-xs"
                      style={{ backgroundColor: activeAccent.primary }}
                    >
                      Giriş
                    </button>
                  </div>
                </div>

                {/* Simulated Product Card */}
                <div className="p-4 bg-base-surface rounded-2xl border border-border space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span 
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${activeAccent.primary}20`, color: activeAccent.primary }}
                      >
                        DOĞALGAZ BORULARI
                      </span>
                      <h5 className="font-bold text-xs sm:text-sm text-text-primary mt-1">
                        PPRC Doğalgaz Borusu 20mm (Boy: 4m)
                      </h5>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-600">
                      {formData.hidePricesForGuests ? 'Fiyat için giriş' : '150,00 ₺'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-[11px] text-text-muted">Stok: 25 Adet</span>
                    <button
                      type="button"
                      className="px-3 py-1.5 text-white text-xs font-bold rounded-xl shadow-xs"
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

        {/* Modal Footer */}
        <div className="p-4 sm:px-8 border-t border-border bg-base-surface-2/40 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-text-muted hover:text-text-primary transition-colors cursor-pointer self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Varsayılana Sıfırla</span>
          </button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-bold text-text-secondary hover:text-text-primary bg-base-surface border border-border rounded-xl transition-colors cursor-pointer"
            >
              Kapat
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="flex items-center justify-center gap-2 px-5 py-2 text-xs sm:text-sm font-bold text-white rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
              style={{ backgroundColor: activeAccent.primary }}
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet & Yayınla'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
