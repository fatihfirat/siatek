import React, { useState, useEffect } from 'react';
import { 
  X, 
  Tag, 
  Users, 
  Percent, 
  ShieldCheck, 
  CheckCircle2, 
  Save, 
  Sparkles, 
  Layers, 
  Award,
  Plus,
  Trash2
} from 'lucide-react';
import { useModalBehavior } from '../../hooks/useModalBehavior';

interface TierConfig {
  id: string;
  name: string;
  badge: string;
  color: string;
  discountRate: number; // %
  defaultPaymentTerms: string;
  creditLimit: number;
  description: string;
}

interface VolumeBreak {
  minQty: number;
  maxQty?: number;
  extraDiscountRate: number;
  label: string;
}

interface CustomerTierManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveConfig?: (tiers: TierConfig[], volumeBreaks: VolumeBreak[]) => void;
}

export const INITIAL_CUSTOMER_TIERS: TierConfig[] = [
  {
    id: 'retail',
    name: 'Perakende Müşteri',
    badge: 'Standart',
    color: 'slate',
    discountRate: 0,
    defaultPaymentTerms: 'Peşin / Kredi Kartı',
    creditLimit: 0,
    description: 'Liste fiyatı üzerinden peşin alışveriş yapan bireysel müşteriler.'
  },
  {
    id: 'plumber',
    name: 'Usta & Tesisatçı Grubu',
    badge: 'Usta Özel',
    color: 'blue',
    discountRate: 15,
    defaultPaymentTerms: '15 Gün Vade / Nakit İskontosu',
    creditLimit: 25000,
    description: 'Sıhhi tesisat ve doğalgaz montaj ustalarına özel indirimli fiyat tarifesi.'
  },
  {
    id: 'contractor',
    name: 'Taşeron & Müteahhit',
    badge: 'Kurumsal Proje',
    color: 'amber',
    discountRate: 25,
    defaultPaymentTerms: '45 Gün Vade',
    creditLimit: 150000,
    description: 'Toplu konut ve şantiye taahhüt projeleri için net toptan fiyatlandırma.'
  },
  {
    id: 'dealer',
    name: 'Toptan Ana Bayi',
    badge: 'VIP Bayi',
    color: 'emerald',
    discountRate: 35,
    defaultPaymentTerms: '90 Gün Vade / DBS',
    creditLimit: 500000,
    description: 'Yıllık ciro taahhüdü bulunan bölge toptancıları ve ana bayiler.'
  }
];

export const INITIAL_VOLUME_BREAKS: VolumeBreak[] = [
  { minQty: 10, maxQty: 49, extraDiscountRate: 5, label: '10+ Adet Koli Alımı (%5 Ek İskonto)' },
  { minQty: 50, maxQty: 99, extraDiscountRate: 10, label: '50+ Adet Palet Alımı (%10 Ek İskonto)' },
  { minQty: 100, extraDiscountRate: 18, label: '100+ Adet Kamyon / Tır Bazı (%18 Süper İskonto)' },
];

export default function CustomerTierManagementModal({
  isOpen,
  onClose,
  onSaveConfig
}: CustomerTierManagementModalProps) {
  useModalBehavior(isOpen, onClose);
  const [tiers, setTiers] = useState<TierConfig[]>(() => {
    const saved = localStorage.getItem('alpha_customer_tiers');
    return saved ? JSON.parse(saved) : INITIAL_CUSTOMER_TIERS;
  });

  const [volumeBreaks, setVolumeBreaks] = useState<VolumeBreak[]>(() => {
    const saved = localStorage.getItem('alpha_volume_breaks');
    return saved ? JSON.parse(saved) : INITIAL_VOLUME_BREAKS;
  });

  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleUpdateTierRate = (id: string, newRate: number) => {
    setTiers(prev => prev.map(t => t.id === id ? { ...t, discountRate: Math.max(0, Math.min(80, newRate)) } : t));
  };

  const handleUpdateTierCredit = (id: string, newCredit: number) => {
    setTiers(prev => prev.map(t => t.id === id ? { ...t, creditLimit: Math.max(0, newCredit) } : t));
  };

  const handleSave = () => {
    localStorage.setItem('alpha_customer_tiers', JSON.stringify(tiers));
    localStorage.setItem('alpha_volume_breaks', JSON.stringify(volumeBreaks));
    if (onSaveConfig) onSaveConfig(tiers, volumeBreaks);
    setFeedback('Müşteri grubu ve kademeli iskonto kuralları başarıyla kaydedildi!');
    setTimeout(() => {
      setFeedback(null);
      onClose();
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm p-3 sm:p-6"
      onClick={onClose}
    >
      <div className="min-h-full flex items-center justify-center py-4 sm:py-6">
        <div 
          className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] text-slate-100 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-800 border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <Tag className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                MÜŞTERİ GRUPLARI & KADEMELİ İSKONTO YÖNETİMİ
              </h2>
              <p className="text-xs text-slate-400">Usta, bayi ve taşeron müşteriler için otomatik fiyat ve iskonto baremleri</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className="bg-emerald-500/20 border-b border-emerald-500/40 px-6 py-2.5 text-xs text-emerald-300 flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-4 h-4" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          
          {/* Section 1: Customer Tiers */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              Müşteri Kademeleri ve Sabit Grup İskontoları
            </h3>
            <p className="text-xs text-slate-400">
              Müşterilerinize tanımlı olan gruba göre ürün kataloğunda ve sepette otomatik indirim uygulanır.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {tiers.map(tier => (
                <div key={tier.id} className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white text-sm">{tier.name}</div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-700 text-slate-300 font-mono">
                        {tier.badge}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block">Grup İskontosu:</span>
                      <div className="flex items-center gap-1 justify-end">
                        <span className="text-lg font-black text-amber-400 font-mono">%{tier.discountRate}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    {tier.description}
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-700 text-xs">
                    <div>
                      <label className="text-slate-400 text-[11px] block mb-1">İskonto Oranı (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="80"
                        value={tier.discountRate}
                        onChange={e => handleUpdateTierRate(tier.id, parseFloat(e.target.value) || 0)}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold font-mono focus:border-blue-500 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 text-[11px] block mb-1">Kredi / Risk Limiti (₺)</label>
                      <input
                        type="number"
                        step="5000"
                        min="0"
                        value={tier.creditLimit}
                        onChange={e => handleUpdateTierCredit(tier.id, parseFloat(e.target.value) || 0)}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-emerald-400 font-bold font-mono focus:border-emerald-500 text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Volume / Quantity Breaks */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              Çok Al Az Öde (Adet Baremli Hacim İskontoları)
            </h3>
            <p className="text-xs text-slate-400">
              Sepette tek bir kalemden yüksek adette sipariş verildiğinde uygulanacak otomatik ilave indirim basamakları.
            </p>

            <div className="bg-slate-800/60 rounded-xl border border-slate-700 divide-y divide-slate-700">
              {volumeBreaks.map((vb, idx) => (
                <div key={idx} className="p-3.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[11px]">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-bold text-white">{vb.label}</div>
                      <div className="text-slate-400 text-[11px]">
                        Min. {vb.minQty} adet {vb.maxQty ? `ile ${vb.maxQty} adet arası` : 've üzeri toplu alım'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 font-bold font-mono text-xs border border-emerald-500/30">
                      + %{vb.extraDiscountRate} Ek İndirim
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-800 border-t border-slate-700 flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
          >
            Kapat
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-600/30 flex items-center gap-2 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Ayarları Kaydet & Uygula</span>
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
