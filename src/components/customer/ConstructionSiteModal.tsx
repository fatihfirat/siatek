import React, { useState, useEffect } from 'react';
import { 
  X, 
  MapPin, 
  Plus, 
  Trash2, 
  Check, 
  Building, 
  Phone, 
  User as UserIcon, 
  FileText,
  CheckCircle2,
  Navigation
} from 'lucide-react';
import { ConstructionSite, User } from '../../types';
import { getStoredConstructionSites, saveConstructionSites } from '../../data/constructionSites';
import { playNotificationSound } from '../../lib/audio';
import confetti from 'canvas-confetti';
import { useModalBehavior } from '../../hooks/useModalBehavior';

interface ConstructionSiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: User | null;
  selectedSiteId?: string;
  onSelectSite?: (site: ConstructionSite) => void;
}

export const ConstructionSiteModal: React.FC<ConstructionSiteModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  selectedSiteId,
  onSelectSite
}) => {
  useModalBehavior(isOpen, onClose);
  const [sites, setSites] = useState<ConstructionSite[]>(getStoredConstructionSites());
  const [isAddingNew, setIsAddingNew] = useState(false);

  // New site form state
  const [siteName, setSiteName] = useState('');
  const [city, setCity] = useState('İstanbul');
  const [district, setDistrict] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSaveNewSite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteName || !fullAddress || !contactPerson) {
      alert('Lütfen şantiye adı, adres ve yetkili kişi bilgilerini doldurunuz.');
      return;
    }

    const newSite: ConstructionSite = {
      id: 'site-' + Date.now(),
      siteName,
      city,
      district,
      fullAddress,
      contactPerson,
      contactPhone,
      notes,
      isDefault: sites.length === 0,
      createdAt: new Date().toISOString()
    };

    const updated = [newSite, ...sites];
    setSites(updated);
    saveConstructionSites(updated);
    setIsAddingNew(false);
    
    // Reset form
    setSiteName('');
    setDistrict('');
    setFullAddress('');
    setContactPerson('');
    setContactPhone('');
    setNotes('');

    confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    playNotificationSound('success');

    if (onSelectSite) {
      onSelectSite(newSite);
    }
  };

  const handleDeleteSite = (id: string) => {
    if (!confirm('Bu şantiye adresini silmek istediğinize emin misiniz?')) return;
    const updated = sites.filter(s => s.id !== id);
    setSites(updated);
    saveConstructionSites(updated);
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
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-text-primary tracking-tight">
                Şantiye & Teslimat Adresleri Yönetimi
              </h2>
              <p className="text-xs text-text-muted">
                Siparişlerinizin doğrudan çalıştığınız şantiyeye sevk edilmesi için adres ve yetkili tanımlayın.
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

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          
          {!isAddingNew ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-secondary">
                  Kayıtlı Şantiyeleriniz ({sites.length}):
                </span>

                <button
                  type="button"
                  onClick={() => setIsAddingNew(true)}
                  className="px-3.5 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Yeni Şantiye Ekle</span>
                </button>
              </div>

              {sites.length === 0 ? (
                <div className="p-8 text-center bg-base-surface-2/50 border border-dashed border-border rounded-2xl">
                  <MapPin className="w-10 h-10 text-text-muted mx-auto mb-2 opacity-50" />
                  <p className="text-xs text-text-muted">Kayıtlı şantiye adresi bulunamadı.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {sites.map((site) => (
                    <div
                      key={site.id}
                      className={`p-4 rounded-2xl border transition-all space-y-3 relative ${
                        selectedSiteId === site.id
                          ? 'border-primary bg-primary/5 shadow-xs ring-2 ring-primary/20'
                          : 'border-border bg-base-surface-2/60 hover:bg-base-surface-2'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          <Building className="w-4 h-4 text-primary shrink-0" />
                          <h4 className="text-xs sm:text-sm font-bold text-text-primary leading-tight">
                            {site.siteName}
                          </h4>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteSite(site.id)}
                          className="text-text-muted hover:text-rose-600 p-1 transition-colors cursor-pointer"
                          title="Şantiyeyi Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <p className="text-xs text-text-secondary leading-relaxed">
                        {site.fullAddress}
                      </p>

                      <div className="pt-2 border-t border-border/50 flex flex-col space-y-1 text-[11px] text-text-muted">
                        <div className="flex items-center justify-between">
                          <span>Yetkili: <strong className="text-text-primary">{site.contactPerson}</strong></span>
                          <span>{site.contactPhone}</span>
                        </div>
                        {site.notes && (
                          <div className="text-amber-700 dark:text-amber-400 font-medium">
                            Not: {site.notes}
                          </div>
                        )}
                      </div>

                      {onSelectSite && (
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              onSelectSite(site);
                              onClose();
                            }}
                            className="w-full py-2 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Bu Şantiyeyi Teslimat Noktası Olarak Seç</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSaveNewSite} className="space-y-4">
              <h3 className="text-sm font-bold text-text-primary">Yeni Şantiye Adresi Kaydet</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Şantiye / Proje Adı *
                  </label>
                  <input
                    type="text"
                    required
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    placeholder="Örn: Vadi Panorama Konutları A Blok"
                    className="w-full px-3 py-2 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">Şehir *</label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-2 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">İlçe / Bölge</label>
                    <input
                      type="text"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      placeholder="Örn: Sarıyer"
                      className="w-full px-3 py-2 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  Şantiye Açık Adresi (Sürücü ve Kamyon Sevk Noktası) *
                </label>
                <textarea
                  rows={2}
                  required
                  value={fullAddress}
                  onChange={(e) => setFullAddress(e.target.value)}
                  placeholder="Cadde, sokak, şantiye nizamiye kapı numarası..."
                  className="w-full px-3 py-2 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Şantiyede Malı Teslim Alacak Yetkili (Şef / Usta) *
                  </label>
                  <input
                    type="text"
                    required
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="Örn: Hasan Usta"
                    className="w-full px-3 py-2 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Yetkili Telefon Numarası *
                  </label>
                  <input
                    type="tel"
                    required
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="05xx xxx xx xx"
                    className="w-full px-3 py-2 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  Şantiye Sevk Talimatı (Vinç, Rampa, Saat Kısıtı)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Örn: Kamyon girişi saat 11:00'den önce yasaktır."
                  className="w-full px-3 py-2 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="px-4 py-2 text-xs font-semibold text-text-muted hover:text-text-primary cursor-pointer"
                >
                  Geri Dön
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer"
                >
                  Şantiyeyi Kaydet
                </button>
              </div>
            </form>
          )}

        </div>

      </div>
      </div>
    </div>
  );
};
