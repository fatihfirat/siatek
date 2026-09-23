import { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingDown,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  Trash2,
  ChevronDown,
} from 'lucide-react';
import {
  subscribeToCekSenetList,
  saveCekSenetToFirestore,
  updateCekSenetInFirestore,
  deleteCekSenetFromFirestore,
  subscribeToCariAccounts,
} from '../../lib/firestoreService';
import { CekSenet, CekSenetTur, CekSenetYon, CekSenetDurum, CariAccount } from '../../types';

const fmt = (n: number) =>
  n.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ₺';

function durumLabel(d: CekSenetDurum) {
  const map: Record<CekSenetDurum, string> = {
    beklemede: 'Beklemede',
    tahsil_edildi: 'Tahsil Edildi',
    iade_edildi: 'İade Edildi',
    protesto: 'Protesto',
    ciro_edildi: 'Ciro Edildi',
  };
  return map[d] ?? d;
}

function durumClass(d: CekSenetDurum) {
  switch (d) {
    case 'beklemede':
      return 'bg-info-fill/15 text-info-text border-info-border';
    case 'tahsil_edildi':
      return 'bg-success-fill/15 text-success-text border-success-border';
    case 'iade_edildi':
      return 'bg-warning-fill/15 text-warning-text border-warning-border';
    case 'protesto':
      return 'bg-danger-fill/15 text-danger-text border-danger-border';
    case 'ciro_edildi':
      return 'bg-base-surface-2 text-text-secondary border-border';
    default:
      return 'bg-base-surface-2 text-text-secondary border-border';
  }
}

function kalanGun(vade: string): number {
  const bugun = new Date();
  bugun.setHours(0, 0, 0, 0);
  const v = new Date(vade);
  v.setHours(0, 0, 0, 0);
  return Math.round((v.getTime() - bugun.getTime()) / 86400000);
}

const BOSH_FORM: Omit<CekSenet, 'id' | 'createdAt' | 'updatedAt'> & { cariId: string } = {
  tur: 'cek',
  yon: 'alinan',
  durum: 'beklemede',
  tutar: 0,
  vadeTarihi: '',
  kesilenBanka: '',
  sube: '',
  hesapNo: '',
  cekNo: '',
  senetNo: '',
  cariId: '',
  cariAdi: '',
  aciklama: '',
};

export default function CekSenetDashboard() {
  const [liste, setListe] = useState<CekSenet[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAcik, setModalAcik] = useState(false);
  const [form, setForm] = useState<typeof BOSH_FORM>({ ...BOSH_FORM });
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [turFilter, setTurFilter] = useState<'hepsi' | CekSenetTur>('hepsi');
  const [yonFilter, setYonFilter] = useState<'hepsi' | CekSenetYon>('hepsi');
  const [durumFilter, setDurumFilter] = useState<'hepsi' | CekSenetDurum>('hepsi');
  const [silOnay, setSilOnay] = useState<string | null>(null);
  const [cariler, setCariler] = useState<CariAccount[]>([]);

  useEffect(() => {
    const unsub = subscribeToCekSenetList((list) => {
      setListe(list);
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = subscribeToCariAccounts((list) => setCariler(list), { uid: null, isAdmin: true });
    return unsub;
  }, []);

  const filtrelenmis = liste.filter((cs) => {
    if (turFilter !== 'hepsi' && cs.tur !== turFilter) return false;
    if (yonFilter !== 'hepsi' && cs.yon !== yonFilter) return false;
    if (durumFilter !== 'hepsi' && cs.durum !== durumFilter) return false;
    return true;
  });

  // Özet kartlar
  const bekleyen = liste.filter((c) => c.durum === 'beklemede');
  const bekleyenToplam = bekleyen.reduce((s, c) => s + Number(c.tutar || 0), 0);

  const buAy = (() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    return bekleyen.filter((c) => {
      const v = new Date(c.vadeTarihi);
      return v.getFullYear() === y && v.getMonth() === m;
    });
  })();
  const buAyToplam = buAy.reduce((s, c) => s + Number(c.tutar || 0), 0);

  const tahsilEdilen = liste.filter((c) => c.durum === 'tahsil_edildi');
  const tahsilToplam = tahsilEdilen.reduce((s, c) => s + Number(c.tutar || 0), 0);

  const protestolu = liste.filter((c) => c.durum === 'protesto');
  const protestoToplam = protestolu.reduce((s, c) => s + Number(c.tutar || 0), 0);

  const handleKaydet = async () => {
    if (!form.vadeTarihi || form.tutar <= 0) return;
    setKaydediliyor(true);
    try {
      const now = new Date().toISOString();
      const yeni: CekSenet = {
        id: `CS-${Date.now()}`,
        ...form,
        createdAt: now,
        updatedAt: now,
      };
      await saveCekSenetToFirestore(yeni);
      setModalAcik(false);
      setForm({ ...BOSH_FORM });
    } catch (e) {
      console.error('CekSenet kayıt hatası:', e);
    } finally {
      setKaydediliyor(false);
    }
  };

  const handleDurumGuncelle = async (id: string, durum: CekSenetDurum) => {
    try {
      const tahsilTarihi = durum === 'tahsil_edildi' ? new Date().toISOString().slice(0, 10) : undefined;
      await updateCekSenetInFirestore(id, { durum, ...(tahsilTarihi ? { tahsilTarihi } : {}) });
    } catch (e) {
      console.error('Durum güncelleme hatası:', e);
    }
  };

  const handleSil = async (id: string) => {
    try {
      await deleteCekSenetFromFirestore(id);
      setSilOnay(null);
    } catch (e) {
      console.error('Silme hatası:', e);
    }
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-info-fill/15 rounded-xl border border-info-border">
            <FileText className="w-5 h-5 text-info-text" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text-primary">Çek / Senet Takip</h2>
            <p className="text-xs text-text-secondary">{liste.length} kayıt</p>
          </div>
        </div>
        <button
          onClick={() => setModalAcik(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-info-fill/15 hover:bg-info-fill/25 text-info-text border border-info-border rounded-xl text-sm font-bold transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Kayıt</span>
        </button>
      </div>

      {/* Özet Kartlar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-base-surface border border-border rounded-2xl shadow-xs p-4 space-y-1">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-info-text" />
            <span className="text-xs text-text-secondary font-medium">Bekleyen Toplam</span>
          </div>
          <p className="text-xl font-bold text-text-primary">{fmt(bekleyenToplam)}</p>
          <p className="text-xs text-text-secondary">{bekleyen.length} adet</p>
        </div>
        <div className="bg-base-surface border border-border rounded-2xl shadow-xs p-4 space-y-1">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning-text" />
            <span className="text-xs text-text-secondary font-medium">Bu Ay Vadeli</span>
          </div>
          <p className="text-xl font-bold text-text-primary">{fmt(buAyToplam)}</p>
          <p className="text-xs text-text-secondary">{buAy.length} adet</p>
        </div>
        <div className="bg-base-surface border border-border rounded-2xl shadow-xs p-4 space-y-1">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-success-text" />
            <span className="text-xs text-text-secondary font-medium">Tahsil Edilen</span>
          </div>
          <p className="text-xl font-bold text-text-primary">{fmt(tahsilToplam)}</p>
          <p className="text-xs text-text-secondary">{tahsilEdilen.length} adet</p>
        </div>
        <div className="bg-base-surface border border-border rounded-2xl shadow-xs p-4 space-y-1">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-danger-text" />
            <span className="text-xs text-text-secondary font-medium">Protesto</span>
          </div>
          <p className="text-xl font-bold text-text-primary">{fmt(protestoToplam)}</p>
          <p className="text-xs text-text-secondary">{protestolu.length} adet</p>
        </div>
      </div>

      {/* Filtreler */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter className="w-4 h-4 text-text-secondary" />
        <select
          value={turFilter}
          onChange={(e) => setTurFilter(e.target.value as any)}
          className="bg-base-surface border border-border rounded-lg px-3 py-1.5 text-xs text-text-primary"
        >
          <option value="hepsi">Tüm Türler</option>
          <option value="cek">Çek</option>
          <option value="senet">Senet</option>
        </select>
        <select
          value={yonFilter}
          onChange={(e) => setYonFilter(e.target.value as any)}
          className="bg-base-surface border border-border rounded-lg px-3 py-1.5 text-xs text-text-primary"
        >
          <option value="hepsi">Tüm Yönler</option>
          <option value="alinan">Alınan</option>
          <option value="verilen">Verilen</option>
        </select>
        <select
          value={durumFilter}
          onChange={(e) => setDurumFilter(e.target.value as any)}
          className="bg-base-surface border border-border rounded-lg px-3 py-1.5 text-xs text-text-primary"
        >
          <option value="hepsi">Tüm Durumlar</option>
          <option value="beklemede">Beklemede</option>
          <option value="tahsil_edildi">Tahsil Edildi</option>
          <option value="iade_edildi">İade Edildi</option>
          <option value="protesto">Protesto</option>
          <option value="ciro_edildi">Ciro Edildi</option>
        </select>
        <span className="ml-auto text-xs text-text-secondary">{filtrelenmis.length} kayıt</span>
      </div>

      {/* Tablo — Desktop */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-text-secondary">
          <Clock className="w-5 h-5 animate-spin mr-2" />
          Yükleniyor...
        </div>
      ) : filtrelenmis.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-text-secondary space-y-2">
          <FileText className="w-10 h-10 opacity-30" />
          <p className="text-sm">Kayıt bulunamadı.</p>
        </div>
      ) : (
        <>
          {/* Desktop tablo */}
          <div className="hidden lg:block bg-base-surface border border-border rounded-2xl shadow-xs overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-base-surface-2/50">
                  <th className="px-4 py-3 text-left text-xs font-bold text-text-secondary">Tür / Yön</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-text-secondary">Cari / Banka</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-text-secondary">Tutar</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-text-secondary">Vade Tarihi</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-text-secondary">Kalan Gün</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-text-secondary">Durum</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-text-secondary">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtrelenmis.map((cs) => {
                  const gun = kalanGun(cs.vadeTarihi);
                  const vadeSinif =
                    cs.durum === 'beklemede'
                      ? gun < 0
                        ? 'text-danger-text font-bold'
                        : gun <= 7
                        ? 'text-warning-text font-semibold'
                        : 'text-text-primary'
                      : 'text-text-secondary';
                  return (
                    <tr key={cs.id} className="hover:bg-base-surface-2/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold border bg-info-fill/10 text-info-text border-info-border w-fit">
                            {cs.tur === 'cek' ? 'Çek' : 'Senet'}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
                            {cs.yon === 'alinan' ? (
                              <ArrowDownLeft className="w-3 h-3 text-success-text" />
                            ) : (
                              <ArrowUpRight className="w-3 h-3 text-danger-text" />
                            )}
                            {cs.yon === 'alinan' ? 'Alınan' : 'Verilen'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-text-primary font-medium text-xs">{cs.cariAdi || '—'}</p>
                        <p className="text-text-secondary text-xs">{cs.kesilenBanka || ''}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-text-primary">{fmt(cs.tutar)}</td>
                      <td className="px-4 py-3 text-text-primary text-xs">
                        {cs.vadeTarihi ? new Date(cs.vadeTarihi).toLocaleDateString('tr-TR') : '—'}
                      </td>
                      <td className={`px-4 py-3 text-center text-xs ${vadeSinif}`}>
                        {cs.durum === 'beklemede'
                          ? gun < 0
                            ? `${Math.abs(gun)} gün geçti`
                            : `${gun} gün`
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={cs.durum}
                          onChange={(e) => handleDurumGuncelle(cs.id, e.target.value as CekSenetDurum)}
                          className={`text-xs font-bold px-2 py-1 rounded-lg border cursor-pointer ${durumClass(cs.durum)} bg-transparent`}
                        >
                          <option value="beklemede">Beklemede</option>
                          <option value="tahsil_edildi">Tahsil Edildi</option>
                          <option value="iade_edildi">İade Edildi</option>
                          <option value="protesto">Protesto</option>
                          <option value="ciro_edildi">Ciro Edildi</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setSilOnay(cs.id)}
                          className="p-1.5 rounded-lg hover:bg-danger-fill/15 text-text-secondary hover:text-danger-text transition-colors"
                          title="Sil"
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
          <div className="block lg:hidden space-y-3">
            {filtrelenmis.map((cs) => {
              const gun = kalanGun(cs.vadeTarihi);
              const vadeSinif =
                cs.durum === 'beklemede'
                  ? gun < 0
                    ? 'text-danger-text font-bold'
                    : gun <= 7
                    ? 'text-warning-text font-semibold'
                    : 'text-text-primary'
                  : 'text-text-secondary';
              return (
                <div key={cs.id} className="bg-base-surface border border-border rounded-2xl shadow-xs p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-xs font-bold border bg-info-fill/10 text-info-text border-info-border">
                          {cs.tur === 'cek' ? 'Çek' : 'Senet'}
                        </span>
                        <span className="text-xs text-text-secondary flex items-center gap-1">
                          {cs.yon === 'alinan' ? (
                            <ArrowDownLeft className="w-3 h-3 text-success-text" />
                          ) : (
                            <ArrowUpRight className="w-3 h-3 text-danger-text" />
                          )}
                          {cs.yon === 'alinan' ? 'Alınan' : 'Verilen'}
                        </span>
                      </div>
                      <p className="text-base font-bold text-text-primary">{fmt(cs.tutar)}</p>
                    </div>
                    <button
                      onClick={() => setSilOnay(cs.id)}
                      className="p-1.5 rounded-lg hover:bg-danger-fill/15 text-text-secondary hover:text-danger-text"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-text-secondary">Cari</p>
                      <p className="text-text-primary font-medium">{cs.cariAdi || '—'}</p>
                    </div>
                    <div>
                      <p className="text-text-secondary">Vade</p>
                      <p className={vadeSinif}>
                        {cs.vadeTarihi ? new Date(cs.vadeTarihi).toLocaleDateString('tr-TR') : '—'}
                        {cs.durum === 'beklemede' && (
                          <span className="ml-1">
                            ({gun < 0 ? `${Math.abs(gun)} gün geçti` : `${gun} gün`})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <select
                    value={cs.durum}
                    onChange={(e) => handleDurumGuncelle(cs.id, e.target.value as CekSenetDurum)}
                    className={`w-full text-xs font-bold px-3 py-1.5 rounded-lg border cursor-pointer ${durumClass(cs.durum)} bg-transparent`}
                  >
                    <option value="beklemede">Beklemede</option>
                    <option value="tahsil_edildi">Tahsil Edildi</option>
                    <option value="iade_edildi">İade Edildi</option>
                    <option value="protesto">Protesto</option>
                    <option value="ciro_edildi">Ciro Edildi</option>
                  </select>
                </div>
              );
            })}
          </div>
        </>
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
            <h3 className="text-base font-bold text-text-primary">Kaydı Sil</h3>
            <p className="text-sm text-text-secondary">Bu çek/senet kaydı kalıcı olarak silinecek. Devam edilsin mi?</p>
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

      {/* Yeni kayıt modal */}
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
              <h3 className="text-base font-bold text-text-primary">Yeni Çek / Senet</h3>
              <button
                onClick={() => setModalAcik(false)}
                className="p-1.5 rounded-lg hover:bg-base-surface-2 text-text-secondary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Tür */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">Tür</label>
                <select
                  value={form.tur}
                  onChange={(e) => setForm((f) => ({ ...f, tur: e.target.value as CekSenetTur }))}
                  className="w-full bg-base-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary"
                >
                  <option value="cek">Çek</option>
                  <option value="senet">Senet</option>
                </select>
              </div>
              {/* Yön */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">Yön</label>
                <select
                  value={form.yon}
                  onChange={(e) => setForm((f) => ({ ...f, yon: e.target.value as CekSenetYon }))}
                  className="w-full bg-base-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary"
                >
                  <option value="alinan">Alınan</option>
                  <option value="verilen">Verilen</option>
                </select>
              </div>
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
              {/* Vade Tarihi */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">Vade Tarihi *</label>
                <input
                  type="date"
                  value={form.vadeTarihi}
                  onChange={(e) => setForm((f) => ({ ...f, vadeTarihi: e.target.value }))}
                  className="w-full bg-base-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary"
                />
              </div>
              {/* Cari Seçimi */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">Cari</label>
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
              {/* Kesilen Banka */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">Kesilen Banka</label>
                <input
                  type="text"
                  value={form.kesilenBanka}
                  onChange={(e) => setForm((f) => ({ ...f, kesilenBanka: e.target.value }))}
                  className="w-full bg-base-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary"
                  placeholder="Banka adı"
                />
              </div>
              {/* Şube */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">Şube</label>
                <input
                  type="text"
                  value={form.sube}
                  onChange={(e) => setForm((f) => ({ ...f, sube: e.target.value }))}
                  className="w-full bg-base-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary"
                  placeholder="Şube adı"
                />
              </div>
              {/* Çek/Senet No */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">
                  {form.tur === 'cek' ? 'Çek No' : 'Senet No'}
                </label>
                <input
                  type="text"
                  value={form.tur === 'cek' ? form.cekNo : form.senetNo}
                  onChange={(e) =>
                    setForm((f) =>
                      f.tur === 'cek' ? { ...f, cekNo: e.target.value } : { ...f, senetNo: e.target.value }
                    )
                  }
                  className="w-full bg-base-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary"
                  placeholder="Belge numarası"
                />
              </div>
            </div>

            {/* Açıklama */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-secondary">Açıklama</label>
              <textarea
                value={form.aciklama}
                onChange={(e) => setForm((f) => ({ ...f, aciklama: e.target.value }))}
                rows={2}
                className="w-full bg-base-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary resize-none"
                placeholder="Ek notlar..."
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
                disabled={kaydediliyor || !form.vadeTarihi || form.tutar <= 0}
                className="flex-1 px-4 py-2.5 bg-info-fill/15 text-info-text border border-info-border rounded-xl text-sm font-bold hover:bg-info-fill/25 transition-colors disabled:opacity-50"
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
