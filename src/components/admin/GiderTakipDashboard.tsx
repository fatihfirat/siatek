import { useState, useEffect } from 'react';
import {
  subscribeToGiderKayitlari,
  saveGiderKaydiToFirestore,
  updateGiderKaydiInFirestore,
  deleteGiderKaydiFromFirestore,
} from '../../lib/firestoreService';
import { GiderKaydi, GiderKategori, GiderTekrarTipi } from '../../types';
import {
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  X,
  TrendingDown,
  Receipt,
  AlertCircle,
  ChevronDown,
  Filter,
} from 'lucide-react';

// ─── Kategori Etiketleri ───────────────────────────────────────────────────
const GiderKategoriLabel: Record<GiderKategori, string> = {
  kira: 'Kira',
  elektrik_dogalgaz: 'Elektrik / Doğalgaz',
  internet_telefon: 'İnternet & Telefon',
  personel_maas: 'Personel Maaşı',
  personel_ssk: 'SGK / Prim',
  arac_yakiti: 'Araç Yakıtı',
  kargo_nakliye: 'Kargo & Nakliye',
  bakim_onarim: 'Bakım & Onarım',
  ofis_malzeme: 'Ofis Malzemesi',
  reklam_pazarlama: 'Reklam & Pazarlama',
  muhasebe_hukuk: 'Muhasebe & Hukuk',
  vergi_harclari: 'Vergi & Harçlar',
  banka_komisyon: 'Banka Komisyonu',
  diger: 'Diğer',
};

const GiderKategoriRenk: Record<GiderKategori, string> = {
  kira: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  elektrik_dogalgaz: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30',
  internet_telefon: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-500/30',
  personel_maas: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30',
  personel_ssk: 'bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30',
  arac_yakiti: 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30',
  kargo_nakliye: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
  bakim_onarim: 'bg-stone-500/15 text-stone-700 dark:text-stone-400 border-stone-500/30',
  ofis_malzeme: 'bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/30',
  reklam_pazarlama: 'bg-pink-500/15 text-pink-700 dark:text-pink-400 border-pink-500/30',
  muhasebe_hukuk: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30',
  vergi_harclari: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30',
  banka_komisyon: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  diger: 'bg-base-surface-2 text-text-secondary border-border',
};

const GiderKategoriBarRenk: Record<GiderKategori, string> = {
  kira: 'bg-blue-500',
  elektrik_dogalgaz: 'bg-yellow-500',
  internet_telefon: 'bg-cyan-500',
  personel_maas: 'bg-indigo-500',
  personel_ssk: 'bg-violet-500',
  arac_yakiti: 'bg-orange-500',
  kargo_nakliye: 'bg-amber-500',
  bakim_onarim: 'bg-stone-500',
  ofis_malzeme: 'bg-teal-500',
  reklam_pazarlama: 'bg-pink-500',
  muhasebe_hukuk: 'bg-purple-500',
  vergi_harclari: 'bg-red-500',
  banka_komisyon: 'bg-emerald-500',
  diger: 'bg-text-muted',
};

const TekrarLabel: Record<GiderTekrarTipi, string> = {
  tek_seferlik: 'Tek Seferlik',
  aylik: 'Aylık',
  yillik: 'Yıllık',
};

const KDV_ORANLARI = [1, 10, 20];

// ─── Para formatı ──────────────────────────────────────────────────────────
function formatTL(tutar: number): string {
  return tutar.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ₺';
}

// ─── Boş form ─────────────────────────────────────────────────────────────
function bosForm(): Omit<GiderKaydi, 'id' | 'createdAt' | 'updatedAt'> {
  const bugun = new Date().toISOString().split('T')[0];
  return {
    kategori: 'diger',
    tutar: 0,
    kdvDahil: false,
    kdvOrani: 20,
    kdvTutar: 0,
    aciklama: '',
    tedarikci: '',
    faturaSeriNo: '',
    tekrar: 'tek_seferlik',
    tarih: bugun,
    odemeTarihi: '',
    odendi: false,
  };
}

// ─── Bileşen ───────────────────────────────────────────────────────────────
export default function GiderTakipDashboard() {
  const now = new Date();
  const buAy = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [seciliAy, setSeciliAy] = useState<string>(buAy);
  const [kayitlar, setKayitlar] = useState<GiderKaydi[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kategoriFiltre, setKategoriFiltre] = useState<GiderKategori | 'hepsi'>('hepsi');
  const [odemeFiltre, setOdemeFiltre] = useState<'hepsi' | 'odendi' | 'bekliyor'>('hepsi');
  const [modalAcik, setModalAcik] = useState(false);
  const [duzenlenen, setDuzenlenen] = useState<GiderKaydi | null>(null);
  const [form, setForm] = useState(bosForm());
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [silmeOnayId, setSilmeOnayId] = useState<string | null>(null);
  const [hataMesaji, setHataMesaji] = useState<string | null>(null);

  // Firestore aboneliği
  useEffect(() => {
    setYukleniyor(true);
    const unsub = subscribeToGiderKayitlari((list) => {
      setKayitlar(list);
      setYukleniyor(false);
    }, seciliAy);
    return unsub;
  }, [seciliAy]);

  // Ay seçici listesi (son 12 ay)
  const ayListesi: string[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    ayListesi.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  // Filtreleme
  const filtreliKayitlar = kayitlar.filter((g) => {
    if (kategoriFiltre !== 'hepsi' && g.kategori !== kategoriFiltre) return false;
    if (odemeFiltre === 'odendi' && !g.odendi) return false;
    if (odemeFiltre === 'bekliyor' && g.odendi) return false;
    return true;
  });

  // Özet hesaplamalar
  const toplamBrüt = kayitlar.reduce((s, g) => s + (g.tutar || 0), 0);
  const toplamKdv = kayitlar.reduce((s, g) => s + (g.kdvTutar || 0), 0);
  const toplamOdendi = kayitlar.filter(g => g.odendi).reduce((s, g) => s + (g.tutar || 0), 0);
  const toplamBekliyor = kayitlar.filter(g => !g.odendi).reduce((s, g) => s + (g.tutar || 0), 0);

  // Kategori bazlı toplamlar (bar chart için)
  const kategoriBazliToplamlar = Object.keys(GiderKategoriLabel).map((kat) => {
    const katKayitlar = kayitlar.filter(g => g.kategori === kat as GiderKategori);
    const toplam = katKayitlar.reduce((s, g) => s + (g.tutar || 0), 0);
    return { kat: kat as GiderKategori, toplam };
  }).filter(k => k.toplam > 0).sort((a, b) => b.toplam - a.toplam);

  const maxKatToplam = kategoriBazliToplamlar.length > 0
    ? Math.max(...kategoriBazliToplamlar.map(k => k.toplam))
    : 1;

  // Modal aç — yeni
  const yeniGiderAc = () => {
    setDuzenlenen(null);
    setForm(bosForm());
    setModalAcik(true);
  };

  // Modal aç — düzenle
  const duzenleGider = (g: GiderKaydi) => {
    setDuzenlenen(g);
    setForm({
      kategori: g.kategori,
      tutar: g.tutar,
      kdvDahil: g.kdvDahil,
      kdvOrani: g.kdvOrani ?? 20,
      kdvTutar: g.kdvTutar ?? 0,
      aciklama: g.aciklama,
      tedarikci: g.tedarikci ?? '',
      faturaSeriNo: g.faturaSeriNo ?? '',
      tekrar: g.tekrar,
      tarih: g.tarih,
      odemeTarihi: g.odemeTarihi ?? '',
      odendi: g.odendi,
    });
    setModalAcik(true);
  };

  // KDV hesaplama
  const kdvHesapla = (tutar: number, oran: number, dahil: boolean) => {
    if (!tutar || !oran) return { kdvTutar: 0, brutTutar: tutar };
    if (dahil) {
      // Tutar KDV dahil → KDV'yi çıkar
      const kdv = Math.round((tutar - tutar / (1 + oran / 100)) * 100) / 100;
      return { kdvTutar: kdv, brutTutar: tutar };
    } else {
      // Tutar KDV hariç → KDV ekle
      const kdv = Math.round(tutar * (oran / 100) * 100) / 100;
      return { kdvTutar: kdv, brutTutar: tutar + kdv };
    }
  };

  // Form alan değişikliği
  const formDegistir = (alan: string, deger: any) => {
    setForm(prev => {
      const yeni = { ...prev, [alan]: deger };
      // KDV otomatik hesap
      if (['tutar', 'kdvOrani', 'kdvDahil'].includes(alan)) {
        const t = alan === 'tutar' ? Number(deger) : Number(yeni.tutar);
        const o = alan === 'kdvOrani' ? Number(deger) : Number(yeni.kdvOrani);
        const d = alan === 'kdvDahil' ? Boolean(deger) : Boolean(yeni.kdvDahil);
        const { kdvTutar } = kdvHesapla(t, o, d);
        yeni.kdvTutar = kdvTutar;
      }
      return yeni;
    });
  };

  // Kaydet
  const kaydet = async () => {
    if (!form.aciklama.trim()) { setHataMesaji('Açıklama boş bırakılamaz.'); return; }
    if (!form.tutar || form.tutar <= 0) { setHataMesaji('Geçerli bir tutar girin.'); return; }
    setKaydediliyor(true);
    setHataMesaji(null);
    try {
      const simdi = new Date().toISOString();
      if (duzenlenen) {
        await updateGiderKaydiInFirestore(duzenlenen.id, { ...form });
      } else {
        const yeniId = `gdr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        await saveGiderKaydiToFirestore({
          ...form,
          id: yeniId,
          createdAt: simdi,
          updatedAt: simdi,
        });
      }
      setModalAcik(false);
    } catch (e: any) {
      setHataMesaji(e?.message || 'Kayıt sırasında hata oluştu.');
    } finally {
      setKaydediliyor(false);
    }
  };

  // Ödendi işaretle
  const odemeToggle = async (g: GiderKaydi) => {
    try {
      await updateGiderKaydiInFirestore(g.id, { odendi: !g.odendi });
    } catch {}
  };

  // Sil
  const sil = async (id: string) => {
    try {
      await deleteGiderKaydiFromFirestore(id);
    } catch {}
    setSilmeOnayId(null);
  };

  // Ay etiketi
  const ayEtiketi = (ay: string) => {
    const [yil, mo] = ay.split('-');
    const d = new Date(parseInt(yil), parseInt(mo) - 1, 1);
    return d.toLocaleString('tr-TR', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-5">

      {/* Başlık & Filtreler */}
      <div className="bg-base-surface p-4 sm:p-5 rounded-2xl border border-border shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-danger-fill/15 text-danger-text border border-danger-border/30">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary">Gider Takip</h2>
              <p className="text-xs text-text-muted">Şirket giderlerini kategoriler bazında izleyin ve ödemeleri yönetin.</p>
            </div>
          </div>
          <button
            onClick={yeniGiderAc}
            className="flex items-center space-x-2 px-4 py-2 bg-danger-fill hover:opacity-90 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Gider Ekle</span>
          </button>
        </div>

        {/* Filtreler */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Ay Seçici */}
          <div className="relative">
            <select
              value={seciliAy}
              onChange={e => setSeciliAy(e.target.value)}
              className="appearance-none pl-3 pr-7 py-1.5 rounded-lg bg-base-surface-2 border border-border text-xs font-semibold text-text-primary cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand-500/50"
            >
              {ayListesi.map(a => (
                <option key={a} value={a}>{ayEtiketi(a)}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted pointer-events-none" />
          </div>

          {/* Kategori Filtresi */}
          <div className="relative">
            <select
              value={kategoriFiltre}
              onChange={e => setKategoriFiltre(e.target.value as GiderKategori | 'hepsi')}
              className="appearance-none pl-3 pr-7 py-1.5 rounded-lg bg-base-surface-2 border border-border text-xs font-semibold text-text-primary cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand-500/50"
            >
              <option value="hepsi">Tüm Kategoriler</option>
              {Object.entries(GiderKategoriLabel).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted pointer-events-none" />
          </div>

          {/* Ödeme Durumu */}
          <div className="flex items-center space-x-1 p-1 rounded-lg bg-base-surface-2 border border-border">
            {(['hepsi', 'odendi', 'bekliyor'] as const).map(f => (
              <button
                key={f}
                onClick={() => setOdemeFiltre(f)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  odemeFiltre === f
                    ? 'bg-base-surface text-text-primary border border-border shadow-2xs'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {f === 'hepsi' ? 'Tümü' : f === 'odendi' ? 'Ödendi' : 'Bekliyor'}
              </button>
            ))}
          </div>

          <span className="text-xs text-text-muted ml-auto">
            {filtreliKayitlar.length} kayıt
          </span>
        </div>
      </div>

      {/* Özet Kartlar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Bu Ay Toplam Gider', deger: toplamBrüt, renk: 'text-danger-text', bgRenk: 'bg-bg-danger/20 border-danger-border/40' },
          { label: 'Ödendi', deger: toplamOdendi, renk: 'text-success-text', bgRenk: 'bg-bg-success/20 border-success-border/40' },
          { label: 'Ödeme Bekliyor', deger: toplamBekliyor, renk: 'text-warning-text', bgRenk: 'bg-bg-warning/20 border-warning-border/40' },
          { label: 'Toplam KDV', deger: toplamKdv, renk: 'text-info-text', bgRenk: 'bg-bg-info/20 border-info-border/40' },
        ].map((k, i) => (
          <div key={i} className={`p-3.5 rounded-2xl border ${k.bgRenk} bg-base-surface`}>
            <p className="text-[11px] font-bold text-text-muted">{k.label}</p>
            <p className={`text-lg font-black font-mono mt-1 ${k.renk}`}>{formatTL(k.deger)}</p>
            <p className="text-[10px] text-text-muted mt-0.5">{ayEtiketi(seciliAy)}</p>
          </div>
        ))}
      </div>

      {/* Kategori Bar Chart */}
      {kategoriBazliToplamlar.length > 0 && (
        <div className="bg-base-surface p-4 rounded-2xl border border-border shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-text-primary flex items-center space-x-2">
            <Filter className="w-3.5 h-3.5 text-text-muted" />
            <span>Kategori Bazlı Dağılım — {ayEtiketi(seciliAy)}</span>
          </h3>
          <div className="space-y-2">
            {kategoriBazliToplamlar.map(({ kat, toplam }) => (
              <div key={kat} className="flex items-center gap-2">
                <span className="w-28 sm:w-36 text-[11px] font-semibold text-text-secondary truncate shrink-0">
                  {GiderKategoriLabel[kat]}
                </span>
                <div className="flex-1 h-4 bg-base-surface-2 rounded-full overflow-hidden border border-border/50">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${GiderKategoriBarRenk[kat]}`}
                    style={{ width: `${Math.max(2, (toplam / maxKatToplam) * 100)}%` }}
                  />
                </div>
                <span className="w-24 text-[11px] font-mono font-bold text-text-primary text-right shrink-0">
                  {formatTL(toplam)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gider Listesi */}
      <div className="bg-base-surface rounded-2xl border border-border shadow-xs overflow-hidden">
        {yukleniyor ? (
          <div className="p-8 text-center text-xs text-text-muted">Yükleniyor...</div>
        ) : filtreliKayitlar.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <Receipt className="w-10 h-10 text-text-muted mx-auto" />
            <p className="text-xs text-text-muted">Bu dönemde gider kaydı bulunamadı.</p>
            <button
              onClick={yeniGiderAc}
              className="px-4 py-2 bg-danger-fill text-white rounded-xl text-xs font-bold cursor-pointer hover:opacity-90"
            >
              İlk Gideri Ekle
            </button>
          </div>
        ) : (
          <>
            {/* Tablo Başlığı */}
            <div className="hidden sm:grid grid-cols-[90px_1fr_140px_100px_90px_80px_80px] gap-2 px-4 py-2.5 bg-base-surface-2 border-b border-border text-[11px] font-bold text-text-muted uppercase tracking-wider">
              <span>Tarih</span>
              <span>Açıklama / Tedarikçi</span>
              <span>Kategori</span>
              <span>KDV</span>
              <span className="text-right">Tutar</span>
              <span className="text-center">Durum</span>
              <span className="text-right">İşlem</span>
            </div>

            {/* Satırlar */}
            <div className="divide-y divide-border">
              {filtreliKayitlar.map((g) => (
                <div
                  key={g.id}
                  className="grid grid-cols-1 sm:grid-cols-[90px_1fr_140px_100px_90px_80px_80px] gap-2 px-4 py-3 hover:bg-base-surface-2/40 transition-colors items-center"
                >
                  {/* Tarih */}
                  <span className="text-[11px] font-mono text-text-muted">{g.tarih}</span>

                  {/* Açıklama */}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-text-primary truncate">{g.aciklama}</p>
                    {g.tedarikci && (
                      <p className="text-[10px] text-text-muted truncate">{g.tedarikci}</p>
                    )}
                    {g.faturaSeriNo && (
                      <p className="text-[10px] text-text-muted font-mono">#{g.faturaSeriNo}</p>
                    )}
                  </div>

                  {/* Kategori badge */}
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold w-fit ${GiderKategoriRenk[g.kategori]}`}>
                    {GiderKategoriLabel[g.kategori]}
                  </span>

                  {/* KDV */}
                  <div className="text-[11px] text-text-muted">
                    {g.kdvDahil ? (
                      <span>{g.kdvOrani ?? 0}% dahil / {formatTL(g.kdvTutar ?? 0)}</span>
                    ) : (
                      <span className="text-text-muted/50">—</span>
                    )}
                  </div>

                  {/* Tutar */}
                  <span className="text-xs font-black font-mono text-danger-text text-right">{formatTL(g.tutar)}</span>

                  {/* Durum */}
                  <div className="flex justify-center">
                    <button
                      onClick={() => odemeToggle(g)}
                      title={g.odendi ? 'Ödendi (tıkla: geri al)' : 'Ödenmedi (tıkla: ödendi işaretle)'}
                      className={`px-2 py-0.5 rounded-full border text-[10px] font-bold cursor-pointer transition-all active:scale-[0.95] ${
                        g.odendi
                          ? 'bg-bg-success text-success-text border-success-border'
                          : 'bg-bg-warning/40 text-warning-text border-warning-border/60 hover:bg-bg-warning'
                      }`}
                    >
                      {g.odendi ? 'Ödendi' : 'Bekliyor'}
                    </button>
                  </div>

                  {/* İşlemler */}
                  <div className="flex items-center justify-end space-x-1.5">
                    <button
                      onClick={() => duzenleGider(g)}
                      className="p-1.5 rounded-lg bg-base-surface-2 hover:bg-bg-info/30 text-text-muted hover:text-info-text border border-border hover:border-info-border transition-all cursor-pointer"
                      title="Düzenle"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {silmeOnayId === g.id ? (
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => sil(g.id)}
                          className="p-1.5 rounded-lg bg-bg-danger text-danger-text border border-danger-border cursor-pointer hover:opacity-90 text-[10px] font-bold"
                        >
                          Sil
                        </button>
                        <button
                          onClick={() => setSilmeOnayId(null)}
                          className="p-1.5 rounded-lg bg-base-surface-2 text-text-muted border border-border cursor-pointer text-[10px]"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSilmeOnayId(g.id)}
                        className="p-1.5 rounded-lg bg-base-surface-2 hover:bg-bg-danger/30 text-text-muted hover:text-danger-text border border-border hover:border-danger-border transition-all cursor-pointer"
                        title="Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Özet Satırı */}
            <div className="grid grid-cols-1 sm:grid-cols-[90px_1fr_140px_100px_90px_80px_80px] gap-2 px-4 py-3 bg-base-surface-2 border-t border-border items-center">
              <span className="text-[11px] font-bold text-text-muted uppercase hidden sm:block">Toplam</span>
              <span className="hidden sm:block" />
              <span className="hidden sm:block" />
              <div className="text-[11px] font-bold text-text-muted hidden sm:block">
                KDV: {formatTL(filtreliKayitlar.reduce((s, g) => s + (g.kdvTutar || 0), 0))}
              </div>
              <span className="text-xs font-black font-mono text-danger-text text-right">
                {formatTL(filtreliKayitlar.reduce((s, g) => s + (g.tutar || 0), 0))}
              </span>
              <div className="flex justify-center text-[10px] font-bold">
                <span className="text-success-text">
                  +{filtreliKayitlar.filter(g => g.odendi).length} ödendi
                </span>
              </div>
              <div className="text-[10px] font-bold text-text-muted text-right">
                {filtreliKayitlar.length} kayıt
              </div>
            </div>
          </>
        )}
      </div>

      {/* Gider Ekleme / Düzenleme Modalı */}
      {modalAcik && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in"
          onClick={() => setModalAcik(false)}
        >
          <div
            className="w-full max-w-lg bg-base-surface border border-border rounded-2xl shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Başlık */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-text-primary">
                {duzenlenen ? 'Gider Düzenle' : 'Yeni Gider Kaydı'}
              </h3>
              <button onClick={() => setModalAcik(false)} className="p-1.5 rounded-lg hover:bg-base-surface-2 text-text-muted cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {hataMesaji && (
              <div className="flex items-center space-x-2 p-3 rounded-xl bg-bg-danger/20 border border-danger-border text-danger-text text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{hataMesaji}</span>
              </div>
            )}

            {/* Form Alanları */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

              {/* Açıklama */}
              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] font-bold text-text-muted uppercase">Açıklama *</label>
                <input
                  type="text"
                  value={form.aciklama}
                  onChange={e => formDegistir('aciklama', e.target.value)}
                  placeholder="Gider açıklaması..."
                  className="w-full px-3 py-2 rounded-xl bg-base-surface-2 border border-border text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                />
              </div>

              {/* Kategori */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-text-muted uppercase">Kategori</label>
                <select
                  value={form.kategori}
                  onChange={e => formDegistir('kategori', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-base-surface-2 border border-border text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500/40 cursor-pointer"
                >
                  {Object.entries(GiderKategoriLabel).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              {/* Tekrar Tipi */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-text-muted uppercase">Tekrar</label>
                <select
                  value={form.tekrar}
                  onChange={e => formDegistir('tekrar', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-base-surface-2 border border-border text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500/40 cursor-pointer"
                >
                  {Object.entries(TekrarLabel).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              {/* Tarih */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-text-muted uppercase">Tarih *</label>
                <input
                  type="date"
                  value={form.tarih}
                  onChange={e => formDegistir('tarih', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-base-surface-2 border border-border text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                />
              </div>

              {/* Ödeme Tarihi */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-text-muted uppercase">Ödeme Tarihi</label>
                <input
                  type="date"
                  value={form.odemeTarihi || ''}
                  onChange={e => formDegistir('odemeTarihi', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-base-surface-2 border border-border text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                />
              </div>

              {/* Tedarikçi */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-text-muted uppercase">Tedarikçi / Firma</label>
                <input
                  type="text"
                  value={form.tedarikci || ''}
                  onChange={e => formDegistir('tedarikci', e.target.value)}
                  placeholder="Tedarikçi adı..."
                  className="w-full px-3 py-2 rounded-xl bg-base-surface-2 border border-border text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                />
              </div>

              {/* Fatura Seri No */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-text-muted uppercase">Fatura Seri No</label>
                <input
                  type="text"
                  value={form.faturaSeriNo || ''}
                  onChange={e => formDegistir('faturaSeriNo', e.target.value)}
                  placeholder="Fatura/belge no..."
                  className="w-full px-3 py-2 rounded-xl bg-base-surface-2 border border-border text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                />
              </div>

              {/* KDV Seçeneği */}
              <div className="sm:col-span-2 space-y-2">
                <div className="flex items-center space-x-3">
                  <label className="flex items-center space-x-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.kdvDahil}
                      onChange={e => formDegistir('kdvDahil', e.target.checked)}
                      className="w-4 h-4 rounded cursor-pointer accent-brand-500"
                    />
                    <span className="text-xs font-semibold text-text-primary">KDV Var</span>
                  </label>
                  {form.kdvDahil && (
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-text-muted">Oran:</span>
                      <div className="flex space-x-1">
                        {KDV_ORANLARI.map(oran => (
                          <button
                            key={oran}
                            type="button"
                            onClick={() => formDegistir('kdvOrani', oran)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer border transition-all ${
                              form.kdvOrani === oran
                                ? 'bg-brand-500/20 text-brand-600 dark:text-brand-400 border-brand-500/40'
                                : 'bg-base-surface-2 text-text-muted border-border hover:border-border-strong'
                            }`}
                          >
                            %{oran}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tutar */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-text-muted uppercase">
                  Tutar (₺) * {form.kdvDahil ? '— KDV Dahil' : form.kdvDahil === false && '— KDV Hariç'}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.tutar || ''}
                  onChange={e => formDegistir('tutar', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded-xl bg-base-surface-2 border border-border text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                />
              </div>

              {/* KDV Tutarı (otomatik hesaplama göstergesi) */}
              {form.kdvDahil && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-text-muted uppercase">KDV Tutarı (Otomatik)</label>
                  <div className="px-3 py-2 rounded-xl bg-base-surface-2/50 border border-border/50 text-xs font-mono text-info-text">
                    {formatTL(form.kdvTutar ?? 0)}
                  </div>
                </div>
              )}

              {/* Ödendi durumu */}
              <div className="sm:col-span-2">
                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.odendi}
                    onChange={e => formDegistir('odendi', e.target.checked)}
                    className="w-4 h-4 rounded cursor-pointer accent-green-500"
                  />
                  <span className="text-xs font-semibold text-text-primary">Bu gider ödendi</span>
                </label>
              </div>
            </div>

            {/* Butonlar */}
            <div className="flex justify-end space-x-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setModalAcik(false)}
                disabled={kaydediliyor}
                className="px-4 py-2 rounded-xl bg-base-surface-2 border border-border text-xs font-semibold text-text-primary hover:bg-base-surface cursor-pointer disabled:opacity-50"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={kaydet}
                disabled={kaydediliyor}
                className="px-5 py-2 rounded-xl bg-danger-fill hover:opacity-90 text-white text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center space-x-2 shadow-xs"
              >
                {kaydediliyor ? (
                  <span>Kaydediliyor...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{duzenlenen ? 'Güncelle' : 'Kaydet'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
