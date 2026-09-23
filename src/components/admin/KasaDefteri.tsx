import { useState, useEffect, useMemo } from 'react';
import {
  Wallet,
  Plus,
  X,
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingUp,
  TrendingDown,
  Banknote,
  Filter,
  Trash2,
  Clock,
} from 'lucide-react';
import {
  subscribeToKasaHareketleri,
  saveKasaHareketiToFirestore,
  deleteKasaHareketiFromFirestore,
  subscribeToCariAccounts,
  describeFirestoreReadError,
} from '../../lib/firestoreService';
import { KasaHareketi, KasaHareket, KasaKategori, CariAccount } from '../../types';

const fmt = (n: number) =>
  n.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ₺';

function kategoriLabel(k: KasaKategori): string {
  const map: Record<KasaKategori, string> = {
    satis_tahsilat: 'Satış Tahsilatı',
    cari_odeme: 'Cari Ödeme',
    tedarikci_odeme: 'Tedarikçi Ödemesi',
    gider: 'Gider',
    personel: 'Personel',
    diger: 'Diğer',
  };
  return map[k] ?? k;
}

const BOSH_FORM: Omit<KasaHareketi, 'id' | 'createdAt' | 'updatedAt'> & { cariId: string } = {
  tip: 'giris',
  kategori: 'satis_tahsilat',
  tutar: 0,
  aciklama: '',
  referansNo: '',
  cariId: '',
  cariAdi: '',
  tarih: new Date().toISOString().slice(0, 10),
};

type DonemFiltre = 'bu_hafta' | 'bu_ay' | 'hepsi';

function startOf(donem: DonemFiltre): Date | null {
  const now = new Date();
  if (donem === 'bu_hafta') {
    const d = new Date(now);
    d.setDate(d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1));
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (donem === 'bu_ay') {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return null;
}

export default function KasaDefteri() {
  const [liste, setListe] = useState<KasaHareketi[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAcik, setModalAcik] = useState(false);
  const [form, setForm] = useState<typeof BOSH_FORM>({ ...BOSH_FORM });
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [donem, setDonem] = useState<DonemFiltre>('bu_ay');
  const [silOnay, setSilOnay] = useState<string | null>(null);
  const [cariler, setCariler] = useState<CariAccount[]>([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const unsub = subscribeToKasaHareketleri((list) => {
      setListe(list);
      setLoadError('');
      setLoading(false);
    }, (error) => {
      setLoadError(describeFirestoreReadError(error));
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = subscribeToCariAccounts((list) => setCariler(list), { uid: null, isAdmin: true });
    return unsub;
  }, []);

  const filtrelenmis = useMemo(() => {
    const start = startOf(donem);
    if (!start) return liste;
    return liste.filter((h) => new Date(h.tarih) >= start);
  }, [liste, donem]);

  // Bugünün hareketleri
  const bugun = useMemo(() => {
    const d = new Date().toISOString().slice(0, 10);
    return liste.filter((h) => h.tarih.slice(0, 10) === d);
  }, [liste]);

  const bugunGiris = bugun.filter((h) => h.tip === 'giris').reduce((s, h) => s + Number(h.tutar || 0), 0);
  const bugunCikis = bugun.filter((h) => h.tip === 'cikis').reduce((s, h) => s + Number(h.tutar || 0), 0);
  const bugunNet = bugunGiris - bugunCikis;

  // Filtreli toplam
  const filtreGiris = filtrelenmis.filter((h) => h.tip === 'giris').reduce((s, h) => s + Number(h.tutar || 0), 0);
  const filtreCikis = filtrelenmis.filter((h) => h.tip === 'cikis').reduce((s, h) => s + Number(h.tutar || 0), 0);

  // Kümülatif bakiye (tarihe göre sıralı)
  const sirali = useMemo(
    () => [...filtrelenmis].sort((a, b) => a.tarih.localeCompare(b.tarih)),
    [filtrelenmis]
  );

  const kumulatif: number[] = useMemo(() => {
    let bakiye = 0;
    return sirali.map((h) => {
      bakiye += h.tip === 'giris' ? Number(h.tutar || 0) : -Number(h.tutar || 0);
      return bakiye;
    });
  }, [sirali]);

  // Tarihe göre grupla (yeniden eskiye)
  const gruplar = useMemo(() => {
    const map = new Map<string, KasaHareketi[]>();
    for (const h of filtrelenmis) {
      const tarih = h.tarih.slice(0, 10);
      if (!map.has(tarih)) map.set(tarih, []);
      map.get(tarih)!.push(h);
    }
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [filtrelenmis]);

  const handleKaydet = async () => {
    if (!form.tarih || form.tutar <= 0 || !form.aciklama.trim()) return;
    setKaydediliyor(true);
    try {
      const now = new Date().toISOString();
      const yeni: KasaHareketi = {
        id: `KH-${Date.now()}`,
        ...form,
        createdAt: now,
        updatedAt: now,
      };
      await saveKasaHareketiToFirestore(yeni);
      setModalAcik(false);
      setForm({ ...BOSH_FORM, tarih: new Date().toISOString().slice(0, 10) });
    } catch (e) {
      console.error('KasaHareketi kayıt hatası:', e);
    } finally {
      setKaydediliyor(false);
    }
  };

  const handleSil = async (id: string) => {
    try {
      await deleteKasaHareketiFromFirestore(id);
      setSilOnay(null);
    } catch (e) {
      console.error('Silme hatası:', e);
    }
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-success-fill/15 rounded-xl border border-success-border">
            <Wallet className="w-5 h-5 text-success-text" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text-primary">Kasa Defteri</h2>
            <p className="text-xs text-text-secondary">{liste.length} hareket</p>
          </div>
        </div>
        <button
          onClick={() => setModalAcik(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-success-fill/15 hover:bg-success-fill/25 text-success-text border border-success-border rounded-xl text-sm font-bold transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Hareket</span>
        </button>
      </div>

      {loadError ? (
        <div className="rounded-2xl border border-danger-border bg-danger-fill/10 p-4 text-sm text-danger-text">
          <div className="font-bold">Kasa verisi okunamadı</div>
          <p className="mt-1 text-xs text-danger-text/80">{loadError}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 px-3 py-2 min-h-[44px] rounded-xl border border-danger-border bg-base-surface text-xs font-bold"
          >
            Tekrar dene
          </button>
        </div>
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-success-fill/10 border border-success-border rounded-2xl shadow-xs p-5 space-y-2">
          <div className="flex items-center gap-2">
            <ArrowDownCircle className="w-5 h-5 text-success-text" />
            <span className="text-sm font-semibold text-success-text">Bugün Giriş</span>
          </div>
          <p className="text-3xl font-black tabular-nums text-success-text">{fmt(bugunGiris)}</p>
          <p className="text-xs text-success-text/70">{bugun.filter((h) => h.tip === 'giris').length} hareket</p>
        </div>
        <div className="bg-danger-fill/10 border border-danger-border rounded-2xl shadow-xs p-5 space-y-2">
          <div className="flex items-center gap-2">
            <ArrowUpCircle className="w-5 h-5 text-danger-text" />
            <span className="text-sm font-semibold text-danger-text">Bugün Çıkış</span>
          </div>
          <p className="text-3xl font-black tabular-nums text-danger-text">{fmt(bugunCikis)}</p>
          <p className="text-xs text-danger-text/70">{bugun.filter((h) => h.tip === 'cikis').length} hareket</p>
        </div>
        <div
          className={`border rounded-2xl shadow-xs p-5 space-y-2 ${
            bugunNet >= 0
              ? 'bg-info-fill/10 border-info-border'
              : 'bg-danger-fill/10 border-danger-border'
          }`}
        >
          <div className="flex items-center gap-2">
            <Banknote className={`w-5 h-5 ${bugunNet >= 0 ? 'text-info-text' : 'text-danger-text'}`} />
            <span className={`text-sm font-semibold ${bugunNet >= 0 ? 'text-info-text' : 'text-danger-text'}`}>
              Bugün Net Bakiye
            </span>
          </div>
          <p className={`text-3xl font-black tabular-nums ${bugunNet >= 0 ? 'text-info-text' : 'text-danger-text'}`}>
            {bugunNet >= 0 ? '+' : ''}{fmt(bugunNet)}
          </p>
          <p className={`text-xs ${bugunNet >= 0 ? 'text-info-text/70' : 'text-danger-text/70'}`}>
            {bugun.length} toplam hareket
          </p>
        </div>
      </div>
      )}

      {/* Dönem Filtresi + Özet */}
      <div className="flex flex-wrap gap-3 items-center">
        <Filter className="w-4 h-4 text-text-secondary" />
        {(['bu_hafta', 'bu_ay', 'hepsi'] as DonemFiltre[]).map((d) => (
          <button
            key={d}
            onClick={() => setDonem(d)}
            className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold border transition-all active:scale-[0.98] ${
              donem === d
                ? 'bg-info-fill/15 text-info-text border-info-border'
                : 'bg-base-surface-2/60 text-text-secondary border-border/40 hover:bg-base-surface-2'
            }`}
          >
            {d === 'bu_hafta' ? 'Bu Hafta' : d === 'bu_ay' ? 'Bu Ay' : 'Tümü'}
          </button>
        ))}
        <div className="ml-auto flex gap-4 text-xs">
          <span className="text-success-text font-bold">+{fmt(filtreGiris)}</span>
          <span className="text-danger-text font-bold">-{fmt(filtreCikis)}</span>
        </div>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-text-secondary">
          <Clock className="w-5 h-5 animate-spin mr-2" />
          Yükleniyor...
        </div>
      ) : loadError ? (
        <div className="flex flex-col items-center justify-center py-16 text-danger-text space-y-2">
          <Wallet className="w-10 h-10 opacity-30" />
          <p className="text-sm font-semibold">Kasa hareketleri görüntülenemiyor.</p>
          <p className="text-xs text-danger-text/80">{loadError}</p>
        </div>
      ) : filtrelenmis.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-text-secondary space-y-2">
          <Wallet className="w-10 h-10 opacity-30" />
          <p className="text-sm">Bu dönemde hareket bulunamadı.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {gruplar.map(([tarih, hareketler]) => {
            const gunGiris = hareketler.filter((h) => h.tip === 'giris').reduce((s, h) => s + Number(h.tutar || 0), 0);
            const gunCikis = hareketler.filter((h) => h.tip === 'cikis').reduce((s, h) => s + Number(h.tutar || 0), 0);
            return (
              <div key={tarih} className="space-y-2">
                {/* Tarih başlığı */}
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-bold text-text-secondary">
                    {new Date(tarih).toLocaleDateString('tr-TR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </h3>
                  <div className="flex gap-3 text-xs">
                    {gunGiris > 0 && <span className="text-success-text font-semibold">+{fmt(gunGiris)}</span>}
                    {gunCikis > 0 && <span className="text-danger-text font-semibold">-{fmt(gunCikis)}</span>}
                  </div>
                </div>

                {/* Desktop tablo */}
                <div className="hidden lg:block bg-base-surface border border-border rounded-2xl shadow-xs overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-base-surface-2/50">
                        <th className="px-4 py-2.5 text-left text-xs font-bold text-text-secondary w-8">Tip</th>
                        <th className="px-4 py-2.5 text-left text-xs font-bold text-text-secondary">Açıklama</th>
                        <th className="px-4 py-2.5 text-left text-xs font-bold text-text-secondary">Kategori</th>
                        <th className="px-4 py-2.5 text-left text-xs font-bold text-text-secondary">Cari</th>
                        <th className="px-4 py-2.5 text-right text-xs font-bold text-text-secondary">Tutar</th>
                        <th className="px-4 py-2.5 text-right text-xs font-bold text-text-secondary">Bakiye</th>
                        <th className="px-4 py-2.5 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {hareketler.map((h) => {
                        const idx = sirali.findIndex((s) => s.id === h.id);
                        const bakiye = idx >= 0 ? kumulatif[idx] : null;
                        return (
                          <tr key={h.id} className="hover:bg-base-surface-2/30 transition-colors">
                            <td className="px-4 py-3">
                              {h.tip === 'giris' ? (
                                <TrendingUp className="w-4 h-4 text-success-text" />
                              ) : (
                                <TrendingDown className="w-4 h-4 text-danger-text" />
                              )}
                            </td>
                            <td className="px-4 py-3 text-text-primary font-medium text-xs">{h.aciklama}</td>
                            <td className="px-4 py-3 text-text-secondary text-xs">{kategoriLabel(h.kategori)}</td>
                            <td className="px-4 py-3 text-text-secondary text-xs">{h.cariAdi || '—'}</td>
                            <td
                              className={`px-4 py-3 text-right font-bold text-sm ${
                                h.tip === 'giris' ? 'text-success-text' : 'text-danger-text'
                              }`}
                            >
                              {h.tip === 'giris' ? '+' : '-'}
                              {fmt(h.tutar)}
                            </td>
                            <td
                              className={`px-4 py-3 text-right text-xs font-semibold ${
                                bakiye !== null
                                  ? bakiye >= 0
                                    ? 'text-text-primary'
                                    : 'text-danger-text'
                                  : 'text-text-secondary'
                              }`}
                            >
                              {bakiye !== null ? fmt(bakiye) : '—'}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => setSilOnay(h.id)}
                                className="p-1.5 rounded-lg hover:bg-danger-fill/15 text-text-secondary hover:text-danger-text transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobil kartlar */}
                <div className="block lg:hidden space-y-2">
                  {hareketler.map((h) => {
                    const idx = sirali.findIndex((s) => s.id === h.id);
                    const bakiye = idx >= 0 ? kumulatif[idx] : null;
                    return (
                      <div
                        key={h.id}
                        className="bg-base-surface border border-border rounded-2xl p-4 flex items-center justify-between gap-3 shadow-xs transition-transform active:scale-[0.99]"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {h.tip === 'giris' ? (
                            <TrendingUp className="w-5 h-5 text-success-text shrink-0" />
                          ) : (
                            <TrendingDown className="w-5 h-5 text-danger-text shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-text-primary truncate">{h.aciklama}</p>
                            <p className="text-xs text-text-secondary">{kategoriLabel(h.kategori)}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end shrink-0 gap-1">
                          <span
                            className={`text-sm font-bold ${
                              h.tip === 'giris' ? 'text-success-text' : 'text-danger-text'
                            }`}
                          >
                            {h.tip === 'giris' ? '+' : '-'}{fmt(h.tutar)}
                          </span>
                          {bakiye !== null && (
                            <span className="text-xs text-text-secondary">{fmt(bakiye)}</span>
                          )}
                          <button
                            onClick={() => setSilOnay(h.id)}
                            className="p-1 rounded-lg hover:bg-danger-fill/15 text-text-secondary hover:text-danger-text"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Silme onay modal */}
      {silOnay && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSilOnay(null)}
        >
          <div
            className="bg-base-surface border border-border rounded-2xl p-6 max-w-sm w-full space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-text-primary">Hareketi Sil</h3>
            <p className="text-sm text-text-secondary">Bu kasa hareketi kalıcı olarak silinecek.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setSilOnay(null)}
                className="flex-1 px-4 py-2.5 border border-border rounded-xl text-sm text-text-secondary hover:bg-base-surface-2 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={() => handleSil(silOnay)}
                className="flex-1 px-4 py-2.5 bg-danger-fill/15 text-danger-text border border-danger-border rounded-xl text-sm font-bold hover:bg-danger-fill/25 transition-colors"
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Yeni hareket modal */}
      {modalAcik && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto"
          onClick={() => setModalAcik(false)}
        >
          <div
            className="bg-base-surface border border-border rounded-2xl w-full max-w-lg my-8 p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-text-primary">Yeni Kasa Hareketi</h3>
              <button
                onClick={() => setModalAcik(false)}
                className="p-1.5 rounded-lg hover:bg-base-surface-2 text-text-secondary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tip seçimi */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    tip: 'giris',
                    kategori: 'satis_tahsilat',
                  }))
                }
                className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold border transition-all ${
                  form.tip === 'giris'
                    ? 'bg-success-fill/15 text-success-text border-success-border ring-1 ring-success-border'
                    : 'bg-base-surface-2 text-text-secondary border-border/40'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                Giriş
              </button>
              <button
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    tip: 'cikis',
                    kategori: 'gider',
                  }))
                }
                className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold border transition-all ${
                  form.tip === 'cikis'
                    ? 'bg-danger-fill/15 text-danger-text border-danger-border ring-1 ring-danger-border'
                    : 'bg-base-surface-2 text-text-secondary border-border/40'
                }`}
              >
                <TrendingDown className="w-4 h-4" />
                Çıkış
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Tutar */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">Tutar (₺) *</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.tutar || ''}
                  onChange={(e) => setForm((f) => ({ ...f, tutar: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-base-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary"
                  placeholder="0,00"
                />
              </div>
              {/* Tarih */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">Tarih *</label>
                <input
                  type="date"
                  value={form.tarih}
                  onChange={(e) => setForm((f) => ({ ...f, tarih: e.target.value }))}
                  className="w-full bg-base-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary"
                />
              </div>
              {/* Kategori */}
              <div className="space-y-1 col-span-2">
                <label className="text-xs font-semibold text-text-secondary">Kategori</label>
                <select
                  value={form.kategori}
                  onChange={(e) => setForm((f) => ({ ...f, kategori: e.target.value as KasaKategori }))}
                  className="w-full bg-base-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary"
                >
                  {form.tip === 'giris' ? (
                    <>
                      <option value="satis_tahsilat">Satış Tahsilatı</option>
                      <option value="cari_odeme">Cari Tahsilat</option>
                      <option value="diger">Diğer Giriş</option>
                    </>
                  ) : (
                    <>
                      <option value="gider">Gider</option>
                      <option value="tedarikci_odeme">Tedarikçi Ödemesi</option>
                      <option value="cari_odeme">Cari Ödeme</option>
                      <option value="personel">Personel</option>
                      <option value="diger">Diğer</option>
                    </>
                  )}
                </select>
              </div>
              {/* Cari Seçimi */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">
                  Cari {(form.kategori === 'cari_odeme' || form.kategori === 'satis_tahsilat') && <span className="text-warning-text">*</span>}
                </label>
                <select
                  value={form.cariId || ''}
                  onChange={(e) => {
                    const c = cariler.find(x => x.id === e.target.value);
                    setForm((f) => ({ ...f, cariId: c?.id || '', cariAdi: c?.name || '' }));
                  }}
                  className="w-full bg-base-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary"
                >
                  <option value="">{cariler.length === 0 ? '— Yükleniyor... —' : '— Seçiniz (isteğe bağlı) —'}</option>
                  {cariler.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              {/* Referans No */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">Referans No</label>
                <input
                  type="text"
                  value={form.referansNo}
                  onChange={(e) => setForm((f) => ({ ...f, referansNo: e.target.value }))}
                  className="w-full bg-base-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary"
                  placeholder="Fatura/sipariş no"
                />
              </div>
            </div>

            {/* Açıklama */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-secondary">Açıklama *</label>
              <input
                type="text"
                value={form.aciklama}
                onChange={(e) => setForm((f) => ({ ...f, aciklama: e.target.value }))}
                className="w-full bg-base-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary"
                placeholder="Hareketi açıklayın..."
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setModalAcik(false)}
                className="flex-1 px-4 py-2.5 border border-border rounded-xl text-sm text-text-secondary hover:bg-base-surface-2 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleKaydet}
                disabled={kaydediliyor || form.tutar <= 0 || !form.aciklama.trim()}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold border transition-colors disabled:opacity-50 ${
                  form.tip === 'giris'
                    ? 'bg-success-fill/15 text-success-text border-success-border hover:bg-success-fill/25'
                    : 'bg-danger-fill/15 text-danger-text border-danger-border hover:bg-danger-fill/25'
                }`}
              >
                {kaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
