import { useState, useEffect } from 'react';
import {
  Plus, Trash2, Edit3, X, Check, Search, Filter,
  FileText, Package, ChevronDown, AlertTriangle, Users, Building2,
} from 'lucide-react';
import {
  subscribeToAlisFaturalari,
  saveAlisFaturasToFirestore,
  deleteAlisFaturaFromFirestore,
  subscribeToTedarikciler,
  saveTedarikciToFirestore,
  deleteTedarikciFromFirestore,
  describeFirestoreReadError,
} from '../../lib/firestoreService';
import type { AlisFaturasi, AlisFaturasiDurum, AlisFaturasiKalem, Tedarikci } from '../../types';

const BIRIMLER = ['adet', 'kg', 'm', 'lt', 'kutu', 'koli', 'paket'];
const KDV_ORANLARI = [0, 1, 10, 20];

function formatPara(n: number) {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ₺';
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function yeniFaturaNo() {
  return `ALF-${Date.now()}`;
}

const BOSH_KALEM: AlisFaturasiKalem = {
  urunAdi: '',
  miktar: 1,
  birim: 'adet',
  birimFiyat: 0,
  kdvOrani: 20,
  kdvTutar: 0,
  toplam: 0,
};

function hesaplaKalem(k: AlisFaturasiKalem): AlisFaturasiKalem {
  const net = k.miktar * k.birimFiyat;
  const kdvTutar = Math.round(net * (k.kdvOrani / 100) * 100) / 100;
  return { ...k, kdvTutar, toplam: Math.round((net + kdvTutar) * 100) / 100 };
}

function durumBadge(durum: AlisFaturasiDurum) {
  const map: Record<AlisFaturasiDurum, string> = {
    taslak: 'bg-base-surface-2 text-text-secondary border-border',
    onaylandi: 'bg-bg-info text-info-text border-info-border',
    odendi: 'bg-bg-success text-success-text border-success-border',
    iptal: 'bg-bg-danger text-danger-text border-danger-border',
  };
  const label: Record<AlisFaturasiDurum, string> = {
    taslak: 'Taslak', onaylandi: 'Onaylandı', odendi: 'Ödendi', iptal: 'İptal',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${map[durum]}`}>
      {label[durum]}
    </span>
  );
}

interface ModalState {
  open: boolean;
  editing: AlisFaturasi | null;
}

const BOSH_FATURA = (): Omit<AlisFaturasi, 'id' | 'createdAt' | 'updatedAt'> => ({
  faturaNo: yeniFaturaNo(),
  tedarikciId: '',
  tedarikciAdi: '',
  tarih: todayStr(),
  vadeTarihi: '',
  kalemler: [{ ...BOSH_KALEM }],
  araToplam: 0,
  kdvToplam: 0,
  genelToplam: 0,
  durum: 'taslak',
  aciklama: '',
});

export default function AlisFaturalariDashboard() {
  const [faturalar, setFaturalar] = useState<AlisFaturasi[]>([]);
  const [tedarikciler, setTedarikciler] = useState<Tedarikci[]>([]);
  const [modal, setModal] = useState<ModalState>({ open: false, editing: null });
  const [form, setForm] = useState<Omit<AlisFaturasi, 'id' | 'createdAt' | 'updatedAt'>>(BOSH_FATURA());
  const [serbest, setSerbest] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [durumFilter, setDurumFilter] = useState<'all' | AlisFaturasiDurum>('all');
  const [tedarikciFilter, setTedarikciFilter] = useState('all');
  const [ayFilter, setAyFilter] = useState('');
  // Tedarikci form
  const [tedarikciModal, setTedarikciModal] = useState(false);
  const [tForm, setTForm] = useState({ ad: '', vergiNo: '', telefon: '', email: '', adres: '', notlar: '' });
  const [tSaving, setTSaving] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const handleError = (error: Parameters<typeof describeFirestoreReadError>[0]) => {
      setLoadError(describeFirestoreReadError(error));
    };
    const u1 = subscribeToAlisFaturalari((list) => {
      setFaturalar(list);
      setLoadError('');
    }, handleError);
    const u2 = subscribeToTedarikciler((list) => {
      setTedarikciler(list);
      setLoadError('');
    }, handleError);
    return () => { u1(); u2(); };
  }, []);

  // Compute summaries
  const buAy = new Date().toISOString().slice(0, 7);
  const buAyFaturalar = faturalar.filter(f => f.tarih.startsWith(buAy));
  const buAyToplam = buAyFaturalar.reduce((s, f) => s + f.genelToplam, 0);
  const buAyKdv = buAyFaturalar.filter(f => f.durum !== 'iptal').reduce((s, f) => s + f.kdvToplam, 0);
  const odenmemis = faturalar.filter(f => f.durum === 'onaylandi');
  const bugun = todayStr();
  const vadesiGecmis = odenmemis.filter(f => f.vadeTarihi && f.vadeTarihi < bugun);

  // Filtered list
  const filtered = faturalar.filter(f => {
    if (durumFilter !== 'all' && f.durum !== durumFilter) return false;
    if (tedarikciFilter !== 'all' && f.tedarikciAdi !== tedarikciFilter) return false;
    if (ayFilter && !f.tarih.startsWith(ayFilter)) return false;
    if (searchQ) {
      const q = searchQ.toLowerCase();
      return f.faturaNo.toLowerCase().includes(q) || f.tedarikciAdi.toLowerCase().includes(q);
    }
    return true;
  });

  function openNew() {
    setForm(BOSH_FATURA());
    setSerbest(false);
    setModal({ open: true, editing: null });
  }

  function openEdit(f: AlisFaturasi) {
    setForm({
      faturaNo: f.faturaNo,
      tedarikciId: f.tedarikciId ?? '',
      tedarikciAdi: f.tedarikciAdi,
      tarih: f.tarih,
      vadeTarihi: f.vadeTarihi ?? '',
      kalemler: f.kalemler,
      araToplam: f.araToplam,
      kdvToplam: f.kdvToplam,
      genelToplam: f.genelToplam,
      durum: f.durum,
      aciklama: f.aciklama ?? '',
    });
    setSerbest(!f.tedarikciId);
    setModal({ open: true, editing: f });
  }

  function closeModal() {
    setModal({ open: false, editing: null });
  }

  function updateKalem(idx: number, patch: Partial<AlisFaturasiKalem>) {
    const kalemler = form.kalemler.map((k, i) => {
      if (i !== idx) return k;
      return hesaplaKalem({ ...k, ...patch });
    });
    const araToplam = kalemler.reduce((s, k) => s + k.miktar * k.birimFiyat, 0);
    const kdvToplam = kalemler.reduce((s, k) => s + k.kdvTutar, 0);
    const genelToplam = kalemler.reduce((s, k) => s + k.toplam, 0);
    setForm(f => ({ ...f, kalemler, araToplam: Math.round(araToplam * 100) / 100, kdvToplam: Math.round(kdvToplam * 100) / 100, genelToplam: Math.round(genelToplam * 100) / 100 }));
  }

  function addKalem() {
    setForm(f => ({ ...f, kalemler: [...f.kalemler, { ...BOSH_KALEM }] }));
  }

  function removeKalem(idx: number) {
    const kalemler = form.kalemler.filter((_, i) => i !== idx);
    const araToplam = kalemler.reduce((s, k) => s + k.miktar * k.birimFiyat, 0);
    const kdvToplam = kalemler.reduce((s, k) => s + k.kdvTutar, 0);
    const genelToplam = kalemler.reduce((s, k) => s + k.toplam, 0);
    setForm(f => ({ ...f, kalemler, araToplam, kdvToplam, genelToplam }));
  }

  async function handleSave() {
    if (!form.faturaNo || !form.tedarikciAdi || !form.tarih) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const id = modal.editing?.id || `alf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      await saveAlisFaturasToFirestore({
        ...form,
        id,
        createdAt: modal.editing?.createdAt ?? now,
        updatedAt: now,
      });
      closeModal();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Bu fatura silinsin mi?')) return;
    await deleteAlisFaturaFromFirestore(id);
  }

  async function handleTedarikciSave() {
    if (!tForm.ad) return;
    setTSaving(true);
    try {
      const now = new Date().toISOString();
      await saveTedarikciToFirestore({
        id: `tdr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        ...tForm,
        createdAt: now,
        updatedAt: now,
      });
      setTForm({ ad: '', vergiNo: '', telefon: '', email: '', adres: '', notlar: '' });
      setTedarikciModal(false);
    } finally {
      setTSaving(false);
    }
  }

  async function handleTedarikciDelete(id: string) {
    if (!confirm('Tedarikçi silinsin mi?')) return;
    await deleteTedarikciFromFirestore(id);
  }

  return (
    <div className="space-y-5">
      {loadError ? (
        <div className="rounded-2xl border border-danger-border bg-danger-fill/10 p-4 text-sm text-danger-text">
          <div className="font-bold">Alış verisi okunamadı</div>
          <p className="mt-1 text-xs text-danger-text/80">{loadError}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 px-3 py-2 min-h-[44px] rounded-xl border border-danger-border bg-base-surface text-xs font-bold"
          >
            Tekrar dene
          </button>
        </div>
      ) : (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-base-surface border border-border rounded-2xl p-4 shadow-xs space-y-1">
          <div className="text-xs text-text-muted font-medium">Toplam Fatura</div>
          <div className="text-2xl font-black font-mono text-text-primary">{faturalar.length}</div>
        </div>
        <div className="bg-base-surface border border-border rounded-2xl p-4 shadow-xs space-y-1">
          <div className="text-xs text-text-muted font-medium">Bu Ay Alım</div>
          <div className="text-xl font-black font-mono text-info-text">{formatPara(buAyToplam)}</div>
        </div>
        <div className="bg-base-surface border border-border rounded-2xl p-4 shadow-xs space-y-1">
          <div className="text-xs text-text-muted font-medium flex items-center gap-1">
            {vadesiGecmis.length > 0 && <AlertTriangle className="w-3 h-3 text-danger-text" />}
            Ödenmemiş / Vadesi Geçmiş
          </div>
          <div className={`text-xl font-black font-mono ${vadesiGecmis.length > 0 ? 'text-danger-text' : 'text-text-primary'}`}>
            {odenmemis.length} / {vadesiGecmis.length}
          </div>
        </div>
        <div className="bg-base-surface border border-border rounded-2xl p-4 shadow-xs space-y-1">
          <div className="text-xs text-text-muted font-medium">Bu Ay KDV İndirilecek</div>
          <div className="text-xl font-black font-mono text-success-text">{formatPara(buAyKdv)}</div>
        </div>
      </div>
      )}

      {/* Filtreler + Yeni Fatura butonu */}
      <div className="bg-base-surface border border-border rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-text-secondary" />
            <h2 className="text-sm font-bold text-text-primary">Alış Faturaları</h2>
            <span className="px-2 py-0.5 bg-base-surface-2 text-text-muted text-xs font-mono rounded-lg border border-border">{filtered.length}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setTedarikciModal(true)}
              className="px-3 py-1.5 bg-base-surface-2 hover:bg-base-surface text-text-secondary hover:text-text-primary border border-border rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Tedarikçiler</span>
            </button>
            <button
              onClick={openNew}
              className="px-3.5 py-1.5 bg-brand-blue hover:opacity-90 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Yeni Fatura</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="Fatura no veya tedarikçi ara..."
              className="w-full pl-8 pr-3 py-2 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div className="relative">
            <Filter className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={durumFilter}
              onChange={e => setDurumFilter(e.target.value as any)}
              className="pl-8 pr-8 py-2 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary focus:outline-none appearance-none cursor-pointer"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="taslak">Taslak</option>
              <option value="onaylandi">Onaylandı</option>
              <option value="odendi">Ödendi</option>
              <option value="iptal">İptal</option>
            </select>
            <ChevronDown className="w-3 h-3 text-text-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <div className="relative">
            <Users className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={tedarikciFilter}
              onChange={e => setTedarikciFilter(e.target.value)}
              className="pl-8 pr-8 py-2 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary focus:outline-none appearance-none cursor-pointer"
            >
              <option value="all">Tüm Tedarikçiler</option>
              {Array.from(new Set(faturalar.map(f => f.tedarikciAdi).filter(Boolean))).map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-text-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <input
            type="month"
            value={ayFilter}
            onChange={e => setAyFilter(e.target.value)}
            className="px-3 py-2 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary focus:outline-none cursor-pointer"
          />
        </div>
      </div>

      {/* Fatura Tablosu (desktop) / Kart (mobil) */}
      <div className="bg-base-surface border border-border rounded-2xl shadow-xs overflow-hidden">
        {loadError ? (
          <div className="p-10 text-center text-danger-text text-sm">
            <div className="font-bold">Fatura listesi görüntülenemiyor.</div>
            <p className="mt-1 text-xs text-danger-text/80">{loadError}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-text-muted text-sm">Fatura bulunamadı.</div>
        ) : (
          <>
            {/* Desktop tablo */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-base-surface-2 text-text-secondary font-bold">
                    <th className="px-4 py-3 text-left">Fatura No</th>
                    <th className="px-4 py-3 text-left">Tedarikçi</th>
                    <th className="px-4 py-3 text-left">Tarih</th>
                    <th className="px-4 py-3 text-left">Vade</th>
                    <th className="px-4 py-3 text-right">Genel Toplam</th>
                    <th className="px-4 py-3 text-right">KDV</th>
                    <th className="px-4 py-3 text-center">Durum</th>
                    <th className="px-4 py-3 text-center">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(f => {
                    const vadesiGecti = f.vadeTarihi && f.vadeTarihi < bugun && f.durum !== 'odendi' && f.durum !== 'iptal';
                    return (
                      <tr key={f.id} className="border-b border-border/50 hover:bg-base-surface-2/50 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-text-primary">{f.faturaNo}</td>
                        <td className="px-4 py-3 text-text-primary">{f.tedarikciAdi}</td>
                        <td className="px-4 py-3 text-text-secondary">{f.tarih}</td>
                        <td className={`px-4 py-3 ${vadesiGecti ? 'text-danger-text font-bold' : 'text-text-secondary'}`}>
                          {f.vadeTarihi || '-'}
                          {vadesiGecti && <span className="ml-1 text-[10px] bg-bg-danger px-1 rounded">Vadesi Geçti</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-text-primary font-mono">{formatPara(f.genelToplam)}</td>
                        <td className="px-4 py-3 text-right text-text-secondary font-mono">{formatPara(f.kdvToplam)}</td>
                        <td className="px-4 py-3 text-center">{durumBadge(f.durum)}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button onClick={() => openEdit(f)} className="p-1.5 rounded-lg hover:bg-base-surface-2 text-text-secondary hover:text-text-primary transition-colors cursor-pointer" title="Düzenle">
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(f.id)} className="p-1.5 rounded-lg hover:bg-bg-danger text-text-secondary hover:text-danger-text transition-colors cursor-pointer" title="Sil">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobil kartlar */}
            <div className="md:hidden divide-y divide-border">
              {filtered.map(f => {
                const vadesiGecti = f.vadeTarihi && f.vadeTarihi < bugun && f.durum !== 'odendi' && f.durum !== 'iptal';
                return (
                  <div key={f.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-mono font-bold text-text-primary text-sm">{f.faturaNo}</div>
                        <div className="text-xs text-text-secondary mt-0.5">{f.tedarikciAdi}</div>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        {durumBadge(f.durum)}
                        <button onClick={() => openEdit(f)} className="p-1.5 rounded-lg hover:bg-base-surface-2 text-text-muted cursor-pointer"><Edit3 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(f.id)} className="p-1.5 rounded-lg hover:bg-bg-danger text-text-muted hover:text-danger-text cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-muted">{f.tarih}{f.vadeTarihi && <> → <span className={vadesiGecti ? 'text-danger-text font-bold' : ''}>{f.vadeTarihi}</span></>}</span>
                      <span className="font-bold font-mono text-text-primary">{formatPara(f.genelToplam)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Fatura Ekle/Düzenle Modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm animate-in fade-in p-3 sm:p-4 md:p-6" onClick={closeModal}>
          <div className="min-h-full flex items-start justify-center py-4">
            <div className="relative bg-base-surface border border-border rounded-2xl w-full max-w-3xl shadow-2xl" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-border">
                <h3 className="text-sm font-bold text-text-primary flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-text-secondary" />
                  <span>{modal.editing ? 'Fatura Düzenle' : 'Yeni Alış Faturası'}</span>
                </h3>
                <button onClick={closeModal} className="p-2 rounded-xl hover:bg-base-surface-2 text-text-muted cursor-pointer"><X className="w-4 h-4" /></button>
              </div>

              <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
                {/* Fatura No + Durum */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">Fatura No *</label>
                    <input value={form.faturaNo} onChange={e => setForm(f => ({ ...f, faturaNo: e.target.value }))} className="w-full px-3 py-2 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">Tarih *</label>
                    <input type="date" value={form.tarih} onChange={e => setForm(f => ({ ...f, tarih: e.target.value }))} className="w-full px-3 py-2 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">Vade Tarihi</label>
                    <input type="date" value={form.vadeTarihi} onChange={e => setForm(f => ({ ...f, vadeTarihi: e.target.value }))} className="w-full px-3 py-2 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary focus:outline-none" />
                  </div>
                </div>

                {/* Tedarikçi */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-text-secondary">Tedarikçi *</label>
                    <button type="button" onClick={() => setSerbest(s => !s)} className="text-[11px] text-brand-blue underline cursor-pointer">
                      {serbest ? 'Listeden seç' : 'Serbest giriş'}
                    </button>
                  </div>
                  {serbest ? (
                    <input
                      value={form.tedarikciAdi}
                      onChange={e => setForm(f => ({ ...f, tedarikciAdi: e.target.value, tedarikciId: '' }))}
                      placeholder="Tedarikçi adı girin"
                      className="w-full px-3 py-2 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  ) : (
                    <div className="relative">
                      <select
                        value={form.tedarikciId}
                        onChange={e => {
                          const t = tedarikciler.find(t => t.id === e.target.value);
                          setForm(f => ({ ...f, tedarikciId: e.target.value, tedarikciAdi: t?.ad ?? '' }));
                        }}
                        className="w-full px-3 pr-8 py-2 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary focus:outline-none appearance-none cursor-pointer"
                      >
                        <option value="">-- Tedarikçi Seçin --</option>
                        {tedarikciler.map(t => <option key={t.id} value={t.id}>{t.ad}</option>)}
                      </select>
                      <ChevronDown className="w-3 h-3 text-text-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  )}
                </div>

                {/* Kalem Tablosu */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-text-secondary">Kalemler</label>
                    <button type="button" onClick={addKalem} className="text-xs text-brand-blue flex items-center space-x-1 cursor-pointer hover:underline">
                      <Plus className="w-3.5 h-3.5" />
                      <span>Kalem Ekle</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-base-surface-2 text-text-secondary border-b border-border">
                          <th className="px-2 py-2 text-left font-semibold">Ürün Adı</th>
                          <th className="px-2 py-2 text-right font-semibold">Miktar</th>
                          <th className="px-2 py-2 text-left font-semibold">Birim</th>
                          <th className="px-2 py-2 text-right font-semibold">Birim Fiyat</th>
                          <th className="px-2 py-2 text-right font-semibold">KDV %</th>
                          <th className="px-2 py-2 text-right font-semibold">Toplam</th>
                          <th className="px-2 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.kalemler.map((k, i) => (
                          <tr key={i} className="border-b border-border/40">
                            <td className="px-2 py-1.5">
                              <input value={k.urunAdi} onChange={e => updateKalem(i, { urunAdi: e.target.value })} className="w-full px-2 py-1 bg-base-surface-2 border border-border rounded-lg text-xs focus:outline-none" placeholder="Ürün adı" />
                            </td>
                            <td className="px-2 py-1.5">
                              <input type="number" min="0" value={k.miktar} onChange={e => updateKalem(i, { miktar: Number(e.target.value) })} className="w-16 px-2 py-1 bg-base-surface-2 border border-border rounded-lg text-xs text-right focus:outline-none" />
                            </td>
                            <td className="px-2 py-1.5">
                              <select value={k.birim} onChange={e => updateKalem(i, { birim: e.target.value })} className="px-2 py-1 bg-base-surface-2 border border-border rounded-lg text-xs focus:outline-none cursor-pointer">
                                {BIRIMLER.map(b => <option key={b}>{b}</option>)}
                              </select>
                            </td>
                            <td className="px-2 py-1.5">
                              <input type="number" min="0" step="0.01" value={k.birimFiyat} onChange={e => updateKalem(i, { birimFiyat: Number(e.target.value) })} className="w-24 px-2 py-1 bg-base-surface-2 border border-border rounded-lg text-xs text-right focus:outline-none" />
                            </td>
                            <td className="px-2 py-1.5">
                              <select value={k.kdvOrani} onChange={e => updateKalem(i, { kdvOrani: Number(e.target.value) })} className="px-2 py-1 bg-base-surface-2 border border-border rounded-lg text-xs focus:outline-none cursor-pointer">
                                {KDV_ORANLARI.map(r => <option key={r} value={r}>%{r}</option>)}
                              </select>
                            </td>
                            <td className="px-2 py-1.5 text-right font-bold font-mono text-text-primary whitespace-nowrap">{formatPara(k.toplam)}</td>
                            <td className="px-2 py-1.5">
                              <button type="button" onClick={() => removeKalem(i)} disabled={form.kalemler.length <= 1} className="p-1 rounded hover:bg-bg-danger text-text-muted hover:text-danger-text disabled:opacity-30 cursor-pointer">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Toplam özeti */}
                  <div className="flex justify-end">
                    <div className="text-xs space-y-1 text-right bg-base-surface-2 rounded-xl border border-border px-4 py-3 min-w-[200px]">
                      <div className="flex justify-between gap-6 text-text-secondary"><span>Ara Toplam</span><span className="font-mono">{formatPara(form.araToplam)}</span></div>
                      <div className="flex justify-between gap-6 text-text-secondary"><span>KDV</span><span className="font-mono">{formatPara(form.kdvToplam)}</span></div>
                      <div className="flex justify-between gap-6 font-bold text-text-primary border-t border-border pt-1"><span>Genel Toplam</span><span className="font-mono">{formatPara(form.genelToplam)}</span></div>
                    </div>
                  </div>
                </div>

                {/* Durum + Açıklama */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">Durum</label>
                    <div className="relative">
                      <select value={form.durum} onChange={e => setForm(f => ({ ...f, durum: e.target.value as AlisFaturasiDurum }))} className="w-full px-3 pr-8 py-2 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary focus:outline-none appearance-none cursor-pointer">
                        <option value="taslak">Taslak</option>
                        <option value="onaylandi">Onaylandı</option>
                        <option value="odendi">Ödendi</option>
                        <option value="iptal">İptal</option>
                      </select>
                      <ChevronDown className="w-3 h-3 text-text-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">Açıklama</label>
                    <input value={form.aciklama} onChange={e => setForm(f => ({ ...f, aciklama: e.target.value }))} className="w-full px-3 py-2 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary focus:outline-none" placeholder="İsteğe bağlı not..." />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end space-x-2 p-5 border-t border-border">
                <button onClick={closeModal} className="px-4 py-2 bg-base-surface-2 hover:bg-base-surface text-text-primary border border-border rounded-xl text-xs font-semibold cursor-pointer">Vazgeç</button>
                <button onClick={handleSave} disabled={saving || !form.faturaNo || !form.tedarikciAdi} className="px-5 py-2 bg-brand-blue hover:opacity-90 text-white rounded-xl text-xs font-bold shadow-xs flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer">
                  <Check className="w-3.5 h-3.5" />
                  <span>{saving ? 'Kaydediliyor...' : 'Kaydet'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tedarikçi Yönetimi Modal */}
      {tedarikciModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm animate-in fade-in p-3 sm:p-4" onClick={() => setTedarikciModal(false)}>
          <div className="min-h-full flex items-start justify-center py-4">
            <div className="relative bg-base-surface border border-border rounded-2xl w-full max-w-xl shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-border">
                <h3 className="text-sm font-bold text-text-primary flex items-center space-x-2">
                  <Building2 className="w-4 h-4 text-text-secondary" />
                  <span>Tedarikçi Yönetimi</span>
                </h3>
                <button onClick={() => setTedarikciModal(false)} className="p-2 rounded-xl hover:bg-base-surface-2 text-text-muted cursor-pointer"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Yeni tedarikçi formu */}
                <div className="bg-base-surface-2 rounded-xl border border-border p-4 space-y-3">
                  <div className="text-xs font-bold text-text-primary">Yeni Tedarikçi Ekle</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { key: 'ad', label: 'Ad *', placeholder: 'Tedarikçi adı' },
                      { key: 'vergiNo', label: 'Vergi No', placeholder: 'VKN' },
                      { key: 'telefon', label: 'Telefon', placeholder: '0212...' },
                      { key: 'email', label: 'E-posta', placeholder: 'mail@...' },
                    ].map(({ key, label, placeholder }) => (
                      <div key={key}>
                        <label className="block text-[11px] text-text-muted mb-1">{label}</label>
                        <input
                          value={(tForm as any)[key]}
                          onChange={e => setTForm(f => ({ ...f, [key]: e.target.value }))}
                          placeholder={placeholder}
                          className="w-full px-2.5 py-1.5 bg-base-surface border border-border rounded-lg text-xs text-text-primary focus:outline-none"
                        />
                      </div>
                    ))}
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] text-text-muted mb-1">Adres</label>
                      <input value={tForm.adres} onChange={e => setTForm(f => ({ ...f, adres: e.target.value }))} className="w-full px-2.5 py-1.5 bg-base-surface border border-border rounded-lg text-xs text-text-primary focus:outline-none" placeholder="Adres" />
                    </div>
                  </div>
                  <button
                    onClick={handleTedarikciSave}
                    disabled={tSaving || !tForm.ad}
                    className="px-4 py-2 bg-brand-blue hover:opacity-90 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{tSaving ? 'Kaydediliyor...' : 'Ekle'}</span>
                  </button>
                </div>

                {/* Mevcut tedarikçiler */}
                {tedarikciler.length === 0 ? (
                  <div className="text-xs text-text-muted text-center py-4">Henüz tedarikçi yok.</div>
                ) : (
                  <div className="space-y-2">
                    {tedarikciler.map(t => (
                      <div key={t.id} className="flex items-center justify-between p-3 bg-base-surface-2 rounded-xl border border-border">
                        <div>
                          <div className="text-xs font-bold text-text-primary">{t.ad}</div>
                          <div className="text-[11px] text-text-muted">{[t.vergiNo, t.telefon].filter(Boolean).join(' · ')}</div>
                        </div>
                        <button onClick={() => handleTedarikciDelete(t.id)} className="p-1.5 rounded-lg hover:bg-bg-danger text-text-muted hover:text-danger-text cursor-pointer">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
