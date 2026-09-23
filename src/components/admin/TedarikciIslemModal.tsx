import { useState, useEffect, FormEvent } from 'react';
import {
  X, ArrowUpRight, ArrowDownRight, SlidersHorizontal,
  Calendar, FileText, CreditCard, Check, AlertCircle,
} from 'lucide-react';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import type { TedarikciIslem, TedarikciIslemTipi } from '../../types';

type Mod = 'borc' | 'odeme' | 'guncelle';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tedarikciAdi: string;
  mevcutBakiye: number;
  onSave: (islem: Omit<TedarikciIslem, 'id' | 'createdAt'>) => Promise<void>;
}

function bugunkuTarih() {
  return new Date().toISOString().split('T')[0];
}

function yeniBelgeNo() {
  return `TDR-${Date.now().toString().slice(-6)}`;
}

export default function TedarikciIslemModal({
  isOpen, onClose, tedarikciAdi, mevcutBakiye, onSave,
}: Props) {
  const [mod, setMod] = useState<Mod>('borc');
  const [tip, setTip] = useState<TedarikciIslemTipi>('alis_faturasi');
  const [tutar, setTutar] = useState('');
  const [hedefBakiye, setHedefBakiye] = useState('');
  const [tarih, setTarih] = useState(bugunkuTarih());
  const [vadeTarihi, setVadeTarihi] = useState('');
  const [belgeNo, setBelgeNo] = useState(yeniBelgeNo());
  const [odemeSekli, setOdemeSekli] = useState<TedarikciIslem['odemeSekli']>('Havale/EFT');
  const [aciklama, setAciklama] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setTutar('');
    setHata(null);
    setBelgeNo(yeniBelgeNo());
    setTarih(bugunkuTarih());
    setVadeTarihi('');
    if (mod === 'borc') {
      setTip('alis_faturasi');
      setOdemeSekli('Açık Hesap');
      setAciklama('Alış Faturası / Mal Girişi');
    } else if (mod === 'odeme') {
      setTip('odeme_yapildi');
      setOdemeSekli('Havale/EFT');
      setAciklama('Tedarikçiye Ödeme');
    } else {
      setHedefBakiye(mevcutBakiye.toString());
      setTip('mutabakat');
      setAciklama('Bakiye Düzeltme / Mutabakat');
    }
  }, [mod, isOpen, mevcutBakiye]);

  useModalBehavior(isOpen, onClose);
  if (!isOpen) return null;

  // Tahmini bakiye hesapla
  let tahmini = mevcutBakiye;
  if (mod === 'guncelle') {
    tahmini = Number(hedefBakiye) || mevcutBakiye;
  } else {
    const t = Number(tutar) || 0;
    tahmini = mod === 'borc' ? mevcutBakiye + t : mevcutBakiye - t;
  }

  const handleModSwitch = (yeniMod: Mod) => {
    setMod(yeniMod);
    setHata(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setHata(null);

    let finalTutar: number;
    let finalYon: 'borc' | 'alacak';
    let finalTip: TedarikciIslemTipi;

    if (mod === 'guncelle') {
      const hedef = Number(hedefBakiye);
      if (isNaN(hedef)) { setHata('Geçerli hedef bakiye giriniz.'); return; }
      const fark = hedef - mevcutBakiye;
      if (Math.abs(fark) < 0.01) { setHata('Hedef bakiye mevcut bakiye ile aynı.'); return; }
      finalTutar = Math.abs(fark);
      finalYon = fark > 0 ? 'borc' : 'alacak';
      finalTip = 'mutabakat';
    } else {
      finalTutar = Number(tutar);
      if (!finalTutar || finalTutar <= 0) { setHata('Sıfırdan büyük tutar giriniz.'); return; }
      finalYon = mod === 'borc' ? 'borc' : 'alacak';
      finalTip = tip;
    }

    setSubmitting(true);
    try {
      await onSave({
        tedarikciAdi,
        tarih,
        vadeTarihi: vadeTarihi || undefined,
        tip: finalTip,
        yon: finalYon,
        tutar: finalTutar,
        aciklama: aciklama.trim() || (finalYon === 'borc' ? 'Borç Girişi' : 'Ödeme / Alacak'),
        belgeNo: belgeNo.trim() || undefined,
        odemeSekli,
      });
      onClose();
    } catch (err: any) {
      setHata(err.message || 'Kaydedilirken hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  };

  const modRenk = {
    borc: { bg: 'bg-danger-fill/15', border: 'border-danger-border', text: 'text-danger-text', active: 'bg-danger-fill text-base shadow-sm' },
    odeme: { bg: 'bg-success-fill/15', border: 'border-success-border', text: 'text-success-text', active: 'bg-success-fill text-base shadow-sm' },
    guncelle: { bg: 'bg-info-fill/15', border: 'border-info-border', text: 'text-info-text', active: 'bg-info-fill text-base shadow-sm' },
  }[mod];

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md p-3 sm:p-4 md:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div className="min-h-full flex items-center justify-center py-4 sm:py-6">
        <div
          className="relative bg-base-surface border border-border rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-base-surface-2">
            <div className="flex items-center space-x-3">
              <div className={`p-2.5 rounded-2xl border ${modRenk.bg} ${modRenk.border}`}>
                {mod === 'borc' && <ArrowUpRight className={`w-5 h-5 ${modRenk.text}`} />}
                {mod === 'odeme' && <ArrowDownRight className={`w-5 h-5 ${modRenk.text}`} />}
                {mod === 'guncelle' && <SlidersHorizontal className={`w-5 h-5 ${modRenk.text}`} />}
              </div>
              <div>
                <h2 className="text-base font-bold text-text-primary">
                  {mod === 'borc' && 'Borç Girişi (Verecek)'}
                  {mod === 'odeme' && 'Ödeme / Alacak Girişi'}
                  {mod === 'guncelle' && 'Bakiye Güncelle / Mutabakat'}
                </h2>
                <p className="text-xs text-text-muted mt-0.5 font-semibold">{tedarikciAdi}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-base-surface border border-transparent hover:border-border text-text-secondary transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mod seçimi */}
          <div className="p-4 bg-base-surface-2/60 border-b border-border">
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-base-surface rounded-2xl border border-border">
              <button
                type="button"
                onClick={() => handleModSwitch('borc')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${mod === 'borc' ? modRenk.active : 'text-text-secondary hover:text-text-primary'}`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Borç Ekle</span>
              </button>
              <button
                type="button"
                onClick={() => handleModSwitch('odeme')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${mod === 'odeme' ? 'bg-success-fill text-base shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
              >
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span>Ödeme Yaptık</span>
              </button>
              <button
                type="button"
                onClick={() => handleModSwitch('guncelle')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${mod === 'guncelle' ? 'bg-info-fill text-base shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Bakiye Düzelt</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
            {hata && (
              <div className="p-3 rounded-2xl bg-danger-fill/15 border border-danger-border text-danger-text text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{hata}</span>
              </div>
            )}

            {/* Mevcut / Tahmini Bakiye */}
            <div className="p-4 rounded-2xl bg-base-surface-2 border border-border">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[11px] font-semibold text-text-secondary block">Mevcut Borç</span>
                  <span className={`text-lg font-mono font-bold block mt-1 ${mevcutBakiye > 0 ? 'text-danger-text' : mevcutBakiye < 0 ? 'text-info-text' : 'text-success-text'}`}>
                    {mevcutBakiye !== 0 ? `${Math.abs(mevcutBakiye).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺` : '0,00 ₺'}
                  </span>
                  <span className="text-[10px] text-text-muted">
                    {mevcutBakiye > 0 ? '(Biz borçluyuz)' : mevcutBakiye < 0 ? '(Onlar borçlu)' : '(Kapalı)'}
                  </span>
                </div>
                <div className="text-right border-l border-border pl-4">
                  <span className="text-[11px] font-semibold text-text-secondary block">İşlem Sonrası</span>
                  <span className={`text-lg font-mono font-black block mt-1 ${tahmini > 0 ? 'text-danger-text' : tahmini < 0 ? 'text-info-text' : 'text-success-text'}`}>
                    {tahmini !== 0 ? `${Math.abs(tahmini).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺` : '0,00 ₺'}
                  </span>
                  <span className="text-[10px] text-text-muted">
                    {tahmini > 0 ? '(Biz borçluyuz)' : tahmini < 0 ? '(Onlar borçlu)' : '(Kapandı)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Tutar / Hedef Bakiye */}
            {mod === 'guncelle' ? (
              <div className="p-4 rounded-2xl bg-info-fill/5 border border-info-border">
                <label className="block text-xs font-bold text-text-primary mb-1">
                  Hedef Bakiye (₺) *
                </label>
                <p className="text-[11px] text-text-muted mb-2">
                  Tedarikçi hesabının olması gereken borç tutarını girin. Fark otomatik mutabakat olarak kaydedilir.
                </p>
                <input
                  type="number"
                  step="0.01"
                  required
                  autoFocus
                  placeholder="0.00"
                  value={hedefBakiye}
                  onChange={e => setHedefBakiye(e.target.value)}
                  className="w-full text-2xl font-mono font-bold px-4 py-2.5 bg-base-surface border border-border rounded-xl text-text-primary focus:border-info-border outline-none"
                />
              </div>
            ) : (
              <div className={`p-4 rounded-2xl border ${mod === 'borc' ? 'bg-danger-fill/5 border-danger-border' : 'bg-success-fill/5 border-success-border'}`}>
                <label className="block text-xs font-bold text-text-primary mb-1">
                  {mod === 'borc' ? 'Borç Tutarı (₺) *' : 'Ödeme / Alacak Tutarı (₺) *'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    autoFocus
                    placeholder="0.00"
                    value={tutar}
                    onChange={e => setTutar(e.target.value)}
                    className="w-full text-2xl font-mono font-bold px-4 py-2.5 bg-base-surface border border-border rounded-xl text-text-primary focus:border-info-border outline-none"
                  />
                  <span className="absolute right-4 top-3.5 text-xs font-bold text-text-muted">TRY (₺)</span>
                </div>
                {/* Hızlı tutarlar */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[1000, 5000, 10000, 25000, 50000].map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setTutar(v.toString())}
                      className="px-2.5 py-1 rounded-lg bg-base-surface border border-border text-xs font-mono text-text-secondary hover:text-text-primary transition-all cursor-pointer"
                    >
                      {v.toLocaleString('tr-TR')} ₺
                    </button>
                  ))}
                  {mevcutBakiye > 0 && mod === 'odeme' && (
                    <button
                      type="button"
                      onClick={() => setTutar(mevcutBakiye.toString())}
                      className="px-2.5 py-1 rounded-lg bg-success-fill/10 border border-success-border text-xs font-mono text-success-text hover:bg-success-fill/20 transition-all cursor-pointer"
                    >
                      Tüm Borç ({mevcutBakiye.toLocaleString('tr-TR')} ₺)
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* İşlem Türü & Ödeme Kanalı */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">İşlem Türü</label>
                <select
                  value={tip}
                  onChange={e => setTip(e.target.value as TedarikciIslemTipi)}
                  disabled={mod === 'guncelle'}
                  className="w-full px-3 py-2 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary focus:border-info-border outline-none disabled:opacity-60"
                >
                  {mod === 'borc' && (
                    <>
                      <option value="alis_faturasi">Alış Faturası / Mal Girişi</option>
                      <option value="devir_bakiye">Devir / Açılış Borcu</option>
                    </>
                  )}
                  {mod === 'odeme' && (
                    <>
                      <option value="odeme_yapildi">Ödeme Yapıldı</option>
                      <option value="iade_alacak">İade / Kredi Notu</option>
                    </>
                  )}
                  {mod === 'guncelle' && (
                    <option value="mutabakat">Bakiye Düzeltme / Mutabakat</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">Ödeme Kanalı</label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
                  <select
                    value={odemeSekli}
                    onChange={e => setOdemeSekli(e.target.value as TedarikciIslem['odemeSekli'])}
                    className="w-full pl-9 pr-3 py-2 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary focus:border-info-border outline-none"
                  >
                    <option value="Havale/EFT">Banka Havalesi / EFT</option>
                    <option value="Nakit">Nakit / Elden</option>
                    <option value="Kredi Kartı">Kredi Kartı / POS</option>
                    <option value="Çek/Senet">Çek / Senet</option>
                    <option value="Açık Hesap">Açık Hesap / Cari</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Tarihler */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">İşlem Tarihi *</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
                  <input
                    type="date"
                    required
                    value={tarih}
                    onChange={e => setTarih(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary focus:border-info-border outline-none font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">Vade Tarihi</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
                  <input
                    type="date"
                    value={vadeTarihi}
                    onChange={e => setVadeTarihi(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary focus:border-info-border outline-none font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Belge No & Açıklama */}
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">Belge / Fatura / Dekont No</label>
              <div className="relative">
                <FileText className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Örn: ALF-2026-0042"
                  value={belgeNo}
                  onChange={e => setBelgeNo(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary placeholder:text-text-muted focus:border-info-border outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">Açıklama</label>
              <textarea
                rows={2}
                placeholder="İşlem açıklaması veya not..."
                value={aciklama}
                onChange={e => setAciklama(e.target.value)}
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
                disabled={submitting}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold text-base transition-all flex items-center space-x-2 cursor-pointer shadow-md disabled:opacity-50 ${
                  mod === 'borc' ? 'bg-danger-fill hover:opacity-90' :
                  mod === 'odeme' ? 'bg-success-fill hover:opacity-90' :
                  'bg-info-fill hover:opacity-90'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>
                  {submitting ? 'Kaydediliyor...' :
                    mod === 'borc' ? 'Borcu Kaydet' :
                    mod === 'odeme' ? 'Ödemeyi Kaydet' :
                    'Bakiyeyi Güncelle'}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
