import { useEffect, useMemo, useState } from 'react';
import {
  subscribeToOrtakAracFisleri,
  saveOrtakAracFisToFirestore,
  voidOrtakAracFisInFirestore,
} from '../../lib/firestoreService';
import { calculateOrtakAracHesap, activeAccountingRows, roundMoney } from '../../utils/financeEngine';
import type {
  OrtakAracFis,
  OrtakAracFisTur,
  OrtakAracGiderKategori,
  OrtakAracOdemeYonu,
  OrtakAracOdeyen,
} from '../../types';
import {
  Truck, Plus, X, CheckCircle2, AlertCircle, Receipt, ChevronDown, ChevronLeft, ChevronRight,
  Handshake, Ban, Printer, FileDown, TrendingUp, TrendingDown, ArrowRightLeft,
} from 'lucide-react';

const PLAKA = '11 ACH 644';
const ORTAK_YUZDE = 50;

const GiderKategoriLabel: Record<OrtakAracGiderKategori, string> = {
  sofor_maas: 'Şoför Maaşı',
  yakit: 'Yakıt',
  yemek: 'Yeme / İçme',
  vergi_harc: 'Vergi & Harç',
  bakim_onarim: 'Bakım & Onarım',
  sigorta: 'Sigorta',
  diger: 'Diğer',
};

const TurLabel: Record<OrtakAracFisTur, string> = {
  satis: 'Satış',
  gider: 'Gider',
  ortak_odeme: 'Ortak Ödemesi',
};

const TurIkon: Record<OrtakAracFisTur, { icon: typeof TrendingUp; cls: string }> = {
  satis: { icon: TrendingUp, cls: 'bg-bg-success text-success-text border-success-border' },
  gider: { icon: TrendingDown, cls: 'bg-bg-danger text-danger-text border-danger-border' },
  ortak_odeme: { icon: ArrowRightLeft, cls: 'bg-bg-info text-info-text border-info-border' },
};

const num = 'font-mono tabular-nums';

type Gorunum = 'ozet' | 'fisler' | 'cari';
type TurFiltre = 'hepsi' | OrtakAracFisTur;

function formatTL(n: number): string {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
}

function formatPct(n: number): string {
  return '%' + n.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function ayEtiketi(ay: string): string {
  const [y, m] = ay.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' });
}

function tarihEtiketi(t: string): string {
  return t.split('-').reverse().join('.');
}

function bosForm() {
  return {
    tur: 'satis' as OrtakAracFisTur,
    tarih: new Date().toISOString().split('T')[0],
    tutar: '',
    malMaliyeti: '',
    giderKategori: 'yakit' as OrtakAracGiderKategori,
    odemeYonu: 'ortaga_odedik' as OrtakAracOdemeYonu,
    odeyen: 'biz' as OrtakAracOdeyen,
    fisNo: '',
    aciklama: '',
  };
}

const inputCls =
  'w-full min-h-[44px] px-3 py-2 rounded-xl bg-base-surface-2 border border-border text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500/40';

const cardCls = 'bg-base-surface rounded-2xl border border-border shadow-xs';
const eyebrow = 'text-[11px] font-bold uppercase tracking-wider text-text-muted';

export default function OrtakAracHesabi() {
  const now = new Date();
  const buAy = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [seciliAy, setSeciliAy] = useState(buAy);
  const [fisler, setFisler] = useState<OrtakAracFis[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [okumaHatasi, setOkumaHatasi] = useState(false);
  const [yenidenDene, setYenidenDene] = useState(0);
  const [modalAcik, setModalAcik] = useState(false);
  const [form, setForm] = useState(bosForm());
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [formHata, setFormHata] = useState<string | null>(null);
  const [basari, setBasari] = useState<string | null>(null);
  const [iptalOnayId, setIptalOnayId] = useState<string | null>(null);
  const [islemHatasi, setIslemHatasi] = useState<string | null>(null);
  const [gorunum, setGorunum] = useState<Gorunum>('ozet');
  const [turFiltre, setTurFiltre] = useState<TurFiltre>('hepsi');
  const [pdfHazirlaniyor, setPdfHazirlaniyor] = useState(false);

  useEffect(() => {
    setYukleniyor(true);
    setOkumaHatasi(false);
    const unsub = subscribeToOrtakAracFisleri(
      (list) => {
        setFisler(list);
        setYukleniyor(false);
      },
      () => {
        setOkumaHatasi(true);
        setYukleniyor(false);
      },
    );
    return unsub;
  }, [yenidenDene]);

  useEffect(() => {
    if (!basari) return;
    const t = window.setTimeout(() => setBasari(null), 3500);
    return () => window.clearTimeout(t);
  }, [basari]);

  const ayListesi = useMemo(() => {
    const list: string[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      list.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buAy]);
  const ayIndex = ayListesi.indexOf(seciliAy);

  const hesap = useMemo(() => calculateOrtakAracHesap(fisler, seciliAy), [fisler, seciliAy]);
  const listeFisler = useMemo(
    () => activeAccountingRows(fisler).filter((f) => f.tarih.startsWith(seciliAy)),
    [fisler, seciliAy],
  );
  const filtreliFisler = useMemo(
    () => (turFiltre === 'hepsi' ? listeFisler : listeFisler.filter((f) => f.tur === turFiltre)),
    [listeFisler, turFiltre],
  );
  const ortakHareketleri = useMemo(
    () =>
      activeAccountingRows(fisler).filter(
        (f) =>
          f.tur === 'ortak_odeme' ||
          ((f.tur === 'gider' || (f.tur === 'satis' && Number(f.malMaliyeti || 0) > 0)) && f.odeyen === 'ortak'),
      ),
    [fisler],
  );
  const giderDagilimi = useMemo(() => {
    const toplam = Object.values(hesap.expenseByCategory).reduce((a, b) => a + b, 0);
    return Object.entries(hesap.expenseByCategory)
      .map(([kat, tutar]) => ({ kat: kat as OrtakAracGiderKategori, tutar, yuzde: toplam > 0 ? (tutar / toplam) * 100 : 0 }))
      .sort((a, b) => b.tutar - a.tutar);
  }, [hesap]);
  const turSayilari = useMemo(
    () => ({
      hepsi: listeFisler.length,
      satis: listeFisler.filter((f) => f.tur === 'satis').length,
      gider: listeFisler.filter((f) => f.tur === 'gider').length,
      ortak_odeme: listeFisler.filter((f) => f.tur === 'ortak_odeme').length,
    }),
    [listeFisler],
  );

  const p = hesap.period;
  const cari = hesap.cari;
  const zarar = p.net < 0;
  const guncel = hesap.partnerBalance;
  const cariDurum =
    guncel > 0
      ? { baslik: 'Ortağa borcumuz var', kart: 'bg-bg-warning/30 border-warning-border/60', metin: 'text-warning-text' }
      : guncel < 0
        ? { baslik: 'Ortak bize borçlu', kart: 'bg-bg-info/30 border-info-border/60', metin: 'text-info-text' }
        : { baslik: 'Hesap kapalı, borç yok', kart: 'bg-bg-success/20 border-success-border/50', metin: 'text-success-text' };
  const donemSonuDurum = cari.closing > 0 ? 'ortağa borcumuz var' : cari.closing < 0 ? 'ortak bize borçlu' : 'hesap kapalı';

  const setF = <K extends keyof ReturnType<typeof bosForm>>(k: K, v: ReturnType<typeof bosForm>[K]) => {
    setFormHata(null);
    setForm((prev) => ({ ...prev, [k]: v }));
  };

  const pdfIndir = async () => {
    if (pdfHazirlaniyor) return;
    setPdfHazirlaniyor(true);
    setIslemHatasi(null);
    try {
      const { generateOrtakAracPDF } = await import('../../utils/ortakAracPdf');
      generateOrtakAracPDF(fisler, seciliAy);
      setBasari(`${ayEtiketi(seciliAy)} özeti PDF olarak hazırlandı.`);
    } catch (err) {
      console.error('[SIATEK] ortak arac PDF:', err);
      setIslemHatasi('PDF hazırlanamadı. Tekrar deneyin.');
    } finally {
      setPdfHazirlaniyor(false);
    }
  };

  const yeniAc = () => {
    setForm(bosForm());
    setFormHata(null);
    setModalAcik(true);
  };

  const kaydet = async () => {
    if (kaydediliyor) return;
    const tutar = parseFloat(String(form.tutar).replace(',', '.'));
    const maliyet = parseFloat(String(form.malMaliyeti).replace(',', '.')) || 0;
    if (!(tutar > 0)) return setFormHata('Tutar 0’dan büyük olmalı.');
    if (!form.tarih) return setFormHata('Tarih seçin.');
    if (form.tur === 'satis' && maliyet < 0) return setFormHata('Mal maliyeti negatif olamaz.');

    const ts = new Date().toISOString();
    const fis: OrtakAracFis = {
      id: '',
      tur: form.tur,
      tutar: roundMoney(tutar),
      aciklama: form.aciklama.trim(),
      fisNo: form.fisNo.trim() || undefined,
      tarih: form.tarih,
      createdAt: ts,
      updatedAt: ts,
      ...(form.tur === 'satis' ? { malMaliyeti: roundMoney(maliyet), ...(maliyet > 0 ? { odeyen: form.odeyen } : {}) } : {}),
      ...(form.tur === 'gider' ? { giderKategori: form.giderKategori, odeyen: form.odeyen } : {}),
      ...(form.tur === 'ortak_odeme' ? { odemeYonu: form.odemeYonu } : {}),
    };
    // undefined alanları Firestore reddeder
    if (!fis.fisNo) delete fis.fisNo;

    setKaydediliyor(true);
    setFormHata(null);
    try {
      await saveOrtakAracFisToFirestore(fis);
      setModalAcik(false);
      if (form.tarih.slice(0, 7) !== seciliAy) setSeciliAy(form.tarih.slice(0, 7));
      setBasari(`${TurLabel[form.tur]} fişi kaydedildi.`);
    } catch (err) {
      console.error('[SIATEK] ortak_arac_fisleri kaydet:', err);
      setFormHata('Kaydedilemedi. Bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setKaydediliyor(false);
    }
  };

  const iptalEt = async (id: string) => {
    setIslemHatasi(null);
    try {
      await voidOrtakAracFisInFirestore(id);
      setIptalOnayId(null);
      setBasari('Fiş iptal edildi.');
    } catch (err) {
      console.error('[SIATEK] ortak_arac_fisleri iptal:', err);
      setIptalOnayId(null);
      setIslemHatasi('Fiş iptal edilemedi. Tekrar deneyin.');
    }
  };

  const fisBaslik = (f: OrtakAracFis) => {
    if (f.tur === 'gider') return GiderKategoriLabel[f.giderKategori || 'diger'];
    if (f.tur === 'ortak_odeme') return f.odemeYonu === 'ortaktan_aldik' ? 'Ortaktan alınan' : 'Ortağa ödenen';
    return 'Satış';
  };

  const onizlemeKar =
    form.tur === 'satis'
      ? roundMoney((parseFloat(String(form.tutar).replace(',', '.')) || 0) - (parseFloat(String(form.malMaliyeti).replace(',', '.')) || 0))
      : 0;

  const fisSatiri = (f: OrtakAracFis, ortakOdakli = false) => {
    const { icon: Ikon, cls } = TurIkon[f.tur];
    // Ortak görünümünde satış fişi için ilgili tutar, ortağın ödediği mal maliyetidir.
    const ortakMaliyet = ortakOdakli && f.tur === 'satis';
    const gosterilenTutar = ortakMaliyet ? Number(f.malMaliyeti || 0) : f.tutar;
    const kar = f.tur === 'satis' ? roundMoney(f.tutar - Number(f.malMaliyeti || 0)) : null;
    const ortakOdedi = (f.tur === 'gider' || f.tur === 'satis') && f.odeyen === 'ortak';
    const isaret = ortakOdakli && f.tur !== 'ortak_odeme' ? '+' : f.tur === 'gider' ? '−' : f.tur === 'satis' ? '+' : f.odemeYonu === 'ortaktan_aldik' ? '←' : '→';
    const tutarRenk = ortakOdakli || f.tur === 'ortak_odeme' ? 'text-info-text' : f.tur === 'satis' ? 'text-success-text' : 'text-danger-text';
    return (
      <div key={f.id} className="flex flex-wrap sm:flex-nowrap items-center gap-x-3 gap-y-1 px-4 py-3 hover:bg-base-surface-2/40 transition-colors">
        <span className={`order-1 shrink-0 w-10 h-10 rounded-full border flex items-center justify-center ${cls}`} aria-hidden="true">
          <Ikon className="w-4 h-4" />
        </span>
        <div className="order-2 min-w-0 flex-1">
          <p className="text-sm font-semibold text-text-primary truncate">
            {ortakMaliyet ? 'Mal maliyeti' : fisBaslik(f)}
            {f.aciklama ? <span className="font-normal text-text-secondary"> · {f.aciklama}</span> : null}
          </p>
          <p className={`text-[11px] text-text-muted flex flex-wrap items-center gap-x-2 gap-y-0.5 ${num}`}>
            <span>{tarihEtiketi(f.tarih)}</span>
            {f.fisNo && <span>#{f.fisNo}</span>}
            {kar !== null && !ortakMaliyet && (
              <span>
                maliyet {formatTL(Number(f.malMaliyeti || 0))} · kâr {formatTL(kar)}
              </span>
            )}
            {ortakOdedi && (
              <span className="px-1.5 py-0.5 rounded-full bg-bg-info text-info-text border border-info-border font-sans font-bold text-[10px]">
                {f.tur === 'satis' ? 'Maliyeti ortak ödedi' : 'Ortak ödedi'}
              </span>
            )}
          </p>
        </div>
        <span
          className={`order-4 basis-full pl-[52px] sm:order-3 sm:basis-auto sm:pl-0 text-sm font-black shrink-0 ${num} ${tutarRenk}`}
        >
          {isaret} {formatTL(gosterilenTutar)}
        </span>
        {iptalOnayId === f.id ? (
          <div className="order-3 sm:order-4 flex items-center gap-1 shrink-0 print:hidden">
            <button
              onClick={() => iptalEt(f.id)}
              className="min-h-[44px] px-3 rounded-lg bg-bg-danger text-danger-text border border-danger-border text-[11px] font-bold cursor-pointer active:scale-[0.98]"
            >
              İptal Et
            </button>
            <button
              onClick={() => setIptalOnayId(null)}
              aria-label="Vazgeç"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-base-surface-2 border border-border text-text-muted cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIptalOnayId(f.id)}
            title="Fişi iptal et"
            aria-label="Fişi iptal et"
            className="order-3 sm:order-4 shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-text-muted hover:bg-bg-danger/30 hover:text-danger-text transition-all cursor-pointer active:scale-[0.98] print:hidden"
          >
            <Ban className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  };

  const bosDurum = (baslik: string, aciklama: string) => (
    <div className="p-10 text-center space-y-3">
      <div className="w-12 h-12 rounded-full bg-base-surface-2 border border-border mx-auto flex items-center justify-center">
        <Receipt className="w-5 h-5 text-text-muted" />
      </div>
      <p className="text-sm font-semibold text-text-primary">{baslik}</p>
      <p className="text-xs text-text-muted max-w-sm mx-auto">{aciklama}</p>
      <button
        onClick={yeniAc}
        className="min-h-[44px] px-4 rounded-xl bg-success-fill text-white text-xs font-bold cursor-pointer hover:opacity-90 active:scale-[0.98] print:hidden"
      >
        {turFiltre === 'hepsi' ? 'İlk Fişi Ekle' : 'Fiş Ekle'}
      </button>
    </div>
  );

  const donemSatiri = (etiket: string, deger: number, opts?: { isaret?: string; kalin?: boolean; ton?: string; sonuc?: boolean }) => (
    <div
      className={`flex items-center justify-between gap-3 px-4 min-h-[44px] ${
        opts?.sonuc ? (zarar ? 'bg-bg-danger/40' : 'bg-bg-success/40') : ''
      }`}
    >
      <span className={`text-sm ${opts?.kalin ? 'font-bold text-text-primary' : 'text-text-secondary'}`}>
        {opts?.isaret && <span className="inline-block w-4 text-text-muted">{opts.isaret}</span>}
        {etiket}
      </span>
      <span className={`text-sm ${opts?.kalin ? 'font-black' : 'font-semibold'} ${num} ${opts?.ton || 'text-text-primary'}`}>{formatTL(deger)}</span>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Başlık */}
      <div className={`${cardCls} p-4 sm:p-5 space-y-4`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 w-11 h-11 rounded-xl bg-success-fill/15 text-success-text border border-success-border/30 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-text-primary">Ortak Araç Hesabı</h2>
              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                <span className={`px-2 py-0.5 rounded-md border border-border-strong bg-base-surface-2 text-[11px] font-bold tracking-wider text-text-primary ${num}`}>
                  {PLAKA}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-success-fill/15 text-success-text border border-success-border/40 text-[11px] font-bold">
                  %{ORTAK_YUZDE} / %{100 - ORTAK_YUZDE} ortaklık
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={pdfIndir}
              disabled={pdfHazirlaniyor || yukleniyor || okumaHatasi}
              aria-label="PDF indir"
              className="min-h-[44px] px-3 rounded-xl bg-base-surface-2 border border-border text-xs font-bold text-text-secondary hover:text-text-primary cursor-pointer active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <FileDown className="w-4 h-4" />
              <span className="hidden sm:inline">{pdfHazirlaniyor ? 'Hazırlanıyor…' : 'PDF'}</span>
            </button>
            <button
              onClick={() => window.print()}
              aria-label="Yazdır"
              className="min-h-[44px] px-3 rounded-xl bg-base-surface-2 border border-border text-xs font-bold text-text-secondary hover:text-text-primary cursor-pointer active:scale-[0.98] transition-all flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Yazdır</span>
            </button>
            <button
              onClick={yeniAc}
              className="min-h-[44px] px-4 rounded-xl bg-success-fill hover:opacity-90 text-white text-xs font-bold shadow-xs cursor-pointer active:scale-[0.98] transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Fiş</span>
            </button>
          </div>
        </div>

        {/* Dönem gezgini */}
        <div className="flex items-center gap-1.5 print:hidden">
          <button
            onClick={() => ayIndex < ayListesi.length - 1 && setSeciliAy(ayListesi[ayIndex + 1])}
            disabled={ayIndex >= ayListesi.length - 1}
            aria-label="Önceki ay"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-base-surface-2 border border-border text-text-secondary hover:text-text-primary cursor-pointer active:scale-[0.98] disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="relative">
            <select
              value={seciliAy}
              onChange={(e) => setSeciliAy(e.target.value)}
              aria-label="Dönem"
              className="appearance-none min-h-[44px] min-w-[10rem] pl-3 pr-8 rounded-lg bg-base-surface-2 border border-border text-sm font-bold text-text-primary cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand-500/50"
            >
              {ayListesi.map((a) => (
                <option key={a} value={a}>{ayEtiketi(a)}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
          </div>
          <button
            onClick={() => ayIndex > 0 && setSeciliAy(ayListesi[ayIndex - 1])}
            disabled={ayIndex <= 0}
            aria-label="Sonraki ay"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-base-surface-2 border border-border text-text-secondary hover:text-text-primary cursor-pointer active:scale-[0.98] disabled:opacity-40"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {basari && (
        <div role="status" className="flex items-center gap-2 px-4 py-3 rounded-xl bg-bg-success border border-success-border text-success-text text-xs font-bold">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {basari}
        </div>
      )}

      <div role="tablist" aria-label="Ortak araç görünümü" className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-base-surface-2 border border-border print:hidden">
        {(
          [
            ['ozet', 'Özet', null],
            ['fisler', 'Fişler', listeFisler.length],
            ['cari', 'Ortak Cari', null],
          ] as Array<[Gorunum, string, number | null]>
        ).map(([id, label, adet]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={gorunum === id}
            onClick={() => setGorunum(id)}
            className={`min-h-[44px] rounded-lg text-xs font-bold cursor-pointer transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 ${
              gorunum === id ? 'bg-base-surface text-text-primary border border-border shadow-2xs' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            {label}
            {adet !== null && adet > 0 && (
              <span className={`min-w-[1.25rem] px-1.5 rounded-full bg-base-surface-2 border border-border text-[10px] leading-5 ${num}`}>{adet}</span>
            )}
          </button>
        ))}
      </div>

      {islemHatasi && (
        <div role="alert" className="flex items-center gap-2 px-4 py-3 rounded-xl bg-bg-danger border border-danger-border text-danger-text text-xs font-bold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {islemHatasi}
        </div>
      )}

      {okumaHatasi ? (
        <div role="alert" className={`${cardCls} p-8 text-center space-y-3 border-danger-border/40`}>
          <AlertCircle className="w-8 h-8 text-danger-text mx-auto" />
          <p className="text-sm font-bold text-text-primary">Fişler yüklenemedi</p>
          <p className="text-xs text-text-muted">Bağlantınızı kontrol edin. Yönetici yetkisiyle giriş yaptığınızdan emin olun.</p>
          <button
            onClick={() => setYenidenDene((n) => n + 1)}
            className="min-h-[44px] px-4 rounded-xl bg-base-surface-2 border border-border text-xs font-bold text-text-primary cursor-pointer active:scale-[0.98]"
          >
            Tekrar Dene
          </button>
        </div>
      ) : yukleniyor ? (
        <div className="space-y-4" aria-busy="true" aria-label="Yükleniyor">
          <div className="grid md:grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-32 rounded-2xl bg-base-surface-2 border border-border animate-pulse" />
            ))}
          </div>
          <div className="h-56 rounded-2xl bg-base-surface-2 border border-border animate-pulse" />
        </div>
      ) : (
        <>
          {gorunum === 'ozet' && (
            <>
              {/* Ana göstergeler */}
              <div className="grid md:grid-cols-3 gap-3">
                <div className={`p-4 rounded-2xl border ${zarar ? 'bg-bg-danger/30 border-danger-border/60' : 'bg-bg-success/30 border-success-border/60'}`}>
                  <p className={eyebrow}>{zarar ? 'Net zarar' : 'Net kâr'} · {ayEtiketi(seciliAy)}</p>
                  <p className={`text-2xl font-black mt-1.5 ${num} ${zarar ? 'text-danger-text' : 'text-success-text'}`}>{formatTL(p.net)}</p>
                  <p className="text-xs text-text-secondary mt-1">
                    Brüt marj <span className={`font-bold ${num}`}>{formatPct(p.grossMarginPercent)}</span> · {hesap.receiptCount} fiş
                  </p>
                </div>

                <div className={`${cardCls} p-4`}>
                  <p className={eyebrow}>Ortağın payı (%{ORTAK_YUZDE})</p>
                  <p className={`text-2xl font-black mt-1.5 ${num} ${p.partnerShare < 0 ? 'text-danger-text' : 'text-text-primary'}`}>{formatTL(p.partnerShare)}</p>
                  <div className="mt-2.5 flex h-2 rounded-full overflow-hidden border border-border/60" aria-hidden="true">
                    <div className="bg-success-fill/80" style={{ width: `${100 - ORTAK_YUZDE}%` }} />
                    <div className="bg-info-fill/70" style={{ width: `${ORTAK_YUZDE}%` }} />
                  </div>
                  <div className="mt-1.5 flex justify-between text-[11px] text-text-muted">
                    <span>Biz <span className={`font-bold text-text-secondary ${num}`}>{formatTL(p.ourShare)}</span></span>
                    <span>Ortak</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setGorunum('cari')}
                  className={`p-4 rounded-2xl border text-left cursor-pointer active:scale-[0.99] transition-all ${cariDurum.kart}`}
                >
                  <p className={eyebrow}>Ortak cari · güncel</p>
                  <p className={`text-2xl font-black mt-1.5 ${num} text-text-primary`}>{formatTL(Math.abs(guncel))}</p>
                  <p className={`text-xs font-bold mt-1 flex items-center gap-1 ${cariDurum.metin}`}>
                    {cariDurum.baslik}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </p>
                </button>
              </div>

              {/* Dönem hesabı */}
              <div className={`${cardCls} overflow-hidden`}>
                <div className="px-4 py-3 border-b border-border">
                  <h3 className="text-sm font-bold text-text-primary">Dönem hesabı</h3>
                  <p className="text-[11px] text-text-muted">Satıştan maliyet ve giderler düşülür; kalan kâr ya da zarar yarı yarıya paylaşılır.</p>
                </div>
                <div className="divide-y divide-border">
                  {donemSatiri('Satış cirosu', p.revenue, { ton: 'text-success-text' })}
                  {donemSatiri('Mal maliyeti', p.goodsCost, { isaret: '−' })}
                  {donemSatiri('Brüt kâr', p.grossProfit, { isaret: '=', kalin: true })}
                  {donemSatiri('Araç giderleri', p.expenses, { isaret: '−', ton: 'text-danger-text' })}
                  {donemSatiri(zarar ? 'Net zarar' : 'Net kâr', p.net, { isaret: '=', kalin: true, sonuc: true, ton: zarar ? 'text-danger-text' : 'text-success-text' })}
                </div>
                {zarar && <p className="px-4 py-2.5 text-[11px] text-warning-text border-t border-border">Bu dönem zarar var; zarar da yarı yarıya paylaşılır.</p>}
              </div>

              {/* Gider dağılımı */}
              {giderDagilimi.length > 0 && (
                <div className={`${cardCls} p-4 space-y-3`}>
                  <h3 className="text-sm font-bold text-text-primary">Gider dağılımı</h3>
                  <div className="space-y-2.5">
                    {giderDagilimi.map(({ kat, tutar, yuzde }) => (
                      <div key={kat} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-text-secondary">{GiderKategoriLabel[kat]}</span>
                          <span className={`font-bold text-text-primary ${num}`}>
                            {formatTL(tutar)} <span className="font-normal text-text-muted">· {formatPct(yuzde)}</span>
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-base-surface-2 border border-border/50 overflow-hidden" role="presentation">
                          <div className="h-full rounded-full bg-danger-fill/70" style={{ width: `${Math.max(2, yuzde)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {listeFisler.length === 0 && (
                <div className={cardCls}>{bosDurum(`${ayEtiketi(seciliAy)} için fiş yok`, 'Satış, gider ya da ortak ödemesi fişi ekleyin; hesap otomatik oluşur.')}</div>
              )}
            </>
          )}

          {gorunum === 'fisler' && (
            <div className={`${cardCls} overflow-hidden`}>
              <div className="px-3 py-2.5 border-b border-border flex flex-wrap gap-1.5 print:hidden" role="group" aria-label="Fiş türü filtresi">
                {(
                  [
                    ['hepsi', 'Tümü'],
                    ['satis', 'Satış'],
                    ['gider', 'Gider'],
                    ['ortak_odeme', 'Ortak'],
                  ] as Array<[TurFiltre, string]>
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={turFiltre === id}
                    onClick={() => setTurFiltre(id)}
                    className={`min-h-[44px] px-3.5 rounded-full text-xs font-bold cursor-pointer border transition-all active:scale-[0.98] ${
                      turFiltre === id ? 'bg-success-fill/15 text-success-text border-success-border' : 'bg-base-surface-2 text-text-muted border-border hover:text-text-primary'
                    }`}
                  >
                    {label} <span className={num}>{turSayilari[id]}</span>
                  </button>
                ))}
              </div>
              {filtreliFisler.length === 0 ? (
                bosDurum(
                  turFiltre === 'hepsi' ? `${ayEtiketi(seciliAy)} için fiş yok` : 'Bu türde fiş yok',
                  turFiltre === 'hepsi' ? 'Satış, gider ya da ortak ödemesi fişi ekleyin; hesap otomatik oluşur.' : 'Filtreyi değiştirin ya da yeni fiş ekleyin.',
                )
              ) : (
                <>
                  <div className="divide-y divide-border">{filtreliFisler.map((f) => fisSatiri(f))}</div>
                  <div className="grid grid-cols-3 gap-2 px-4 py-3 bg-base-surface-2 border-t border-border text-[11px]">
                    <div><p className="text-text-muted font-bold">Toplam satış</p><p className={`font-black text-success-text ${num}`}>{formatTL(p.revenue)}</p></div>
                    <div><p className="text-text-muted font-bold">Mal maliyeti</p><p className={`font-black text-text-primary ${num}`}>{formatTL(p.goodsCost)}</p></div>
                    <div><p className="text-text-muted font-bold">Toplam gider</p><p className={`font-black text-danger-text ${num}`}>{formatTL(p.expenses)}</p></div>
                  </div>
                </>
              )}
            </div>
          )}

          {gorunum === 'cari' && (
            <>
              <div className="grid lg:grid-cols-2 gap-3">
                <div className={`p-5 rounded-2xl border space-y-1.5 ${cariDurum.kart}`}>
                  <p className={eyebrow}>Güncel ortak cari (tüm zamanlar)</p>
                  <p className={`text-3xl font-black ${num} text-text-primary`}>{formatTL(Math.abs(guncel))}</p>
                  <p className={`text-sm font-bold ${cariDurum.metin}`}>{cariDurum.baslik}</p>
                  <p className="text-[11px] text-text-muted pt-1">
                    Satış tahsilatı bizde, ödemeler bizden varsayılır. Ortağın ödediği gider ya da mal maliyetini fişte “Ortak ödedi” seçin; ortağa yaptığınız ödemeleri “Ortak Ödemesi” fişiyle girin.
                  </p>
                </div>

                <div className={`${cardCls} overflow-hidden`}>
                  <div className="px-4 py-3 border-b border-border">
                    <h3 className="text-sm font-bold text-text-primary">{ayEtiketi(seciliAy)} ekstresi</h3>
                    <p className="text-[11px] text-text-muted">Devir + dönem hareketleri = dönem sonu bakiye</p>
                  </div>
                  <div className="divide-y divide-border">
                    {donemSatiri('Önceki dönemden devir', cari.opening)}
                    {donemSatiri('Dönem payı (ortağın %50’si)', cari.share, { isaret: '+' })}
                    {donemSatiri('Ortağın ödedikleri: gider + mal maliyeti', cari.advances, { isaret: '+' })}
                    {donemSatiri('Ortağa net ödenen', cari.paid, { isaret: '−' })}
                    <div className="flex items-center justify-between gap-3 px-4 min-h-[52px] bg-base-surface-2">
                      <span className="text-sm font-bold text-text-primary">Dönem sonu · <span className="font-semibold text-text-secondary">{donemSonuDurum}</span></span>
                      <span className={`text-base font-black text-text-primary ${num}`}>{formatTL(cari.closing)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`${cardCls} overflow-hidden`}>
                <div className="px-4 py-3 border-b border-border">
                  <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                    <Handshake className="w-4 h-4 text-text-muted" />
                    Ortakla ilgili hareketler
                  </h3>
                  <p className="text-[11px] text-text-muted">Ortağa ödemeler, avanslar ve ortağın cebinden ödenen giderler (tüm zamanlar)</p>
                </div>
                {ortakHareketleri.length === 0 ? (
                  bosDurum('Ortakla ilgili hareket yok', 'Ortağa ödeme, ortaktan avans ya da ortağın ödediği gider girildiğinde burada görünür.')
                ) : (
                  <div className="divide-y divide-border">{ortakHareketleri.map((f) => fisSatiri(f, true))}</div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* Fiş modalı */}
      {modalAcik && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => !kaydediliyor && setModalAcik(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Yeni fiş"
            className="w-full max-w-lg max-h-[92vh] overflow-y-auto bg-base-surface rounded-2xl border border-border shadow-xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-text-primary">Yeni Fiş — {PLAKA}</h3>
              <button onClick={() => setModalAcik(false)} aria-label="Kapat" className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-base-surface-2 border border-border">
              {(['satis', 'gider', 'ortak_odeme'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setF('tur', t)}
                  className={`min-h-[44px] rounded-lg text-xs font-bold cursor-pointer transition-all active:scale-[0.98] ${
                    form.tur === t ? 'bg-base-surface text-text-primary border border-border shadow-2xs' : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  {TurLabel[t]}
                </button>
              ))}
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-text-muted uppercase">Tarih *</label>
                <input type="date" value={form.tarih} onChange={(e) => setF('tarih', e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-text-muted uppercase">
                  {form.tur === 'satis' ? 'Satış Tutarı (₺) *' : form.tur === 'gider' ? 'Gider Tutarı (₺) *' : 'Ödeme Tutarı (₺) *'}
                </label>
                <input type="number" inputMode="decimal" min="0" step="0.01" value={form.tutar} onChange={(e) => setF('tutar', e.target.value)} placeholder="0,00" className={`${inputCls} ${num}`} />
              </div>

              {form.tur === 'satis' && (
                <>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-text-muted uppercase">Mal Maliyeti (₺)</label>
                    <input type="number" inputMode="decimal" min="0" step="0.01" value={form.malMaliyeti} onChange={(e) => setF('malMaliyeti', e.target.value)} placeholder="0,00" className={`${inputCls} ${num}`} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-text-muted uppercase">Bu Satışın Kârı</label>
                    <div className={`min-h-[44px] flex items-center px-3 rounded-xl bg-base-surface-2/50 border border-border/50 text-sm font-bold ${num} ${onizlemeKar < 0 ? 'text-danger-text' : 'text-success-text'}`}>
                      {formatTL(onizlemeKar)}
                    </div>
                  </div>
                </>
              )}

              {form.tur === 'gider' && (
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[11px] font-bold text-text-muted uppercase">Gider Türü</label>
                  <div className="flex flex-wrap gap-1.5">
                    {(Object.keys(GiderKategoriLabel) as OrtakAracGiderKategori[]).map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setF('giderKategori', k)}
                        className={`min-h-[44px] px-3 rounded-lg text-xs font-bold cursor-pointer border transition-all active:scale-[0.98] ${
                          form.giderKategori === k ? 'bg-brand-500/20 text-brand-600 dark:text-brand-400 border-brand-500/40' : 'bg-base-surface-2 text-text-muted border-border hover:border-border-strong'
                        }`}
                      >
                        {GiderKategoriLabel[k]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(form.tur === 'gider' || (form.tur === 'satis' && (parseFloat(String(form.malMaliyeti).replace(',', '.')) || 0) > 0)) && (
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[11px] font-bold text-text-muted uppercase">{form.tur === 'satis' ? 'Mal maliyetini kim ödedi?' : 'Kim ödedi?'}</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {([
                      ['biz', 'Biz ödedik'],
                      ['ortak', 'Ortak ödedi'],
                    ] as const).map(([k, l]) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setF('odeyen', k)}
                        className={`min-h-[44px] rounded-lg text-xs font-bold cursor-pointer border transition-all active:scale-[0.98] ${
                          form.odeyen === k ? 'bg-brand-500/20 text-brand-600 dark:text-brand-400 border-brand-500/40' : 'bg-base-surface-2 text-text-muted border-border'
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                  {form.odeyen === 'ortak' && (
                    <p className="text-[10px] text-text-muted">Ortağın cebinden çıktı; hesapta ona iade edilecek tutar olarak görünür.</p>
                  )}
                </div>
              )}

              {form.tur === 'ortak_odeme' && (
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[11px] font-bold text-text-muted uppercase">Yön</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {([
                      ['ortaga_odedik', 'Ortağa ödedik'],
                      ['ortaktan_aldik', 'Ortaktan aldık'],
                    ] as const).map(([k, l]) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setF('odemeYonu', k)}
                        className={`min-h-[44px] rounded-lg text-xs font-bold cursor-pointer border transition-all active:scale-[0.98] ${
                          form.odemeYonu === k ? 'bg-brand-500/20 text-brand-600 dark:text-brand-400 border-brand-500/40' : 'bg-base-surface-2 text-text-muted border-border'
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-text-muted uppercase">Fiş No</label>
                <input type="text" value={form.fisNo} onChange={(e) => setF('fisNo', e.target.value)} placeholder="Opsiyonel" className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-text-muted uppercase">Açıklama</label>
                <input type="text" value={form.aciklama} onChange={(e) => setF('aciklama', e.target.value)} placeholder="Ör: Müşteri adı, istasyon…" className={inputCls} />
              </div>
            </div>

            {formHata && (
              <p role="alert" className="flex items-center gap-2 text-xs font-semibold text-danger-text">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {formHata}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setModalAcik(false)}
                disabled={kaydediliyor}
                className="min-h-[44px] px-4 rounded-xl bg-base-surface-2 border border-border text-xs font-semibold text-text-primary cursor-pointer disabled:opacity-50"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={kaydet}
                disabled={kaydediliyor}
                className="min-h-[44px] px-5 rounded-xl bg-success-fill hover:opacity-90 text-white text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-xs active:scale-[0.98]"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {kaydediliyor ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
