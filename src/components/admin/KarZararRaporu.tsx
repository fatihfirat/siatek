import { useState, useEffect } from 'react';
import { db, collection, getDocs, query, orderBy } from '../../lib/firebase';
import { AlisFaturasi, GiderKaydi, GiderKategori, Order } from '../../types';
import { TrendingUp, AlertCircle, Calendar } from 'lucide-react';
import { calculateProfitLoss } from '../../utils/financeEngine';

function formatTL(n: number): string {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ₺';
}

function getAyListesi(): { label: string; value: string }[] {
  const list: { label: string; value: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' });
    list.push({ value, label });
  }
  return list;
}

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

export default function KarZararRaporu() {
  const aylar = getAyListesi();
  const [selectedAy, setSelectedAy] = useState(aylar[0].value);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [giderler, setGiderler] = useState<GiderKaydi[]>([]);
  const [alisFaturalari, setAlisFaturalari] = useState<AlisFaturasi[]>([]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc'))),
      getDocs(query(collection(db, 'gider_kayitlari'), orderBy('tarih', 'desc'))),
      getDocs(query(collection(db, 'alis_faturalari'), orderBy('tarih', 'desc'))),
    ])
      .then(([ordersSnap, giderlerSnap, alisSnap]) => {
        const orderList: Order[] = [];
        ordersSnap.forEach(d => orderList.push({ id: d.id, ...(d.data() as Omit<Order, 'id'>) }));
        const giderList: GiderKaydi[] = [];
        giderlerSnap.forEach(d => giderList.push({ id: d.id, ...(d.data() as Omit<GiderKaydi, 'id'>) } as GiderKaydi));
        const alisList: AlisFaturasi[] = [];
        alisSnap.forEach(d => alisList.push({ id: d.id, ...(d.data() as Omit<AlisFaturasi, 'id'>) } as AlisFaturasi));
        setOrders(orderList);
        setGiderler(giderList);
        setAlisFaturalari(alisList);
        setLoading(false);
      })
      .catch(e => {
        setError('Veriler yüklenemedi: ' + (e?.message || 'Bilinmeyen hata'));
        setLoading(false);
      });
  }, []);

  // Filter for selected month
  const ayOrders = orders.filter(o => o.status === 'delivered' && (o.deliveredAt || o.createdAt || '').startsWith(selectedAy));
  const ayGiderler = giderler.filter(g => (g.tarih || '').startsWith(selectedAy));
  const profitLoss = calculateProfitLoss({ orders, giderler, alisFaturalari, period: selectedAy });

  const toplamGelir = profitLoss.revenue;
  const toplamGider = profitLoss.totalExpense;
  const brutKar = profitLoss.profit;
  const karMarji = profitLoss.marginPercent;

  // Last 6 months trend (oldest → newest)
  const son6Ay = aylar.slice(0, 6).reverse();
  const trendData = son6Ay.map(({ value, label }) => {
    const summary = calculateProfitLoss({ orders, giderler, alisFaturalari, period: value });
    const gelir = summary.revenue;
    const gider = summary.totalExpense;
    const shortLabel = label.replace(/\s\d{4}$/, '');
    return { value, shortLabel, gelir, gider, kar: gelir - gider };
  });

  // Category breakdown for selected month
  const kategoriToplam: Partial<Record<GiderKategori, number>> = {};
  ayGiderler.forEach(g => {
    kategoriToplam[g.kategori] = (kategoriToplam[g.kategori] || 0) + Number(g.tutar || 0);
  });
  const kategoriSirali = (Object.entries(kategoriToplam) as [GiderKategori, number][])
    .sort(([, a], [, b]) => b - a);

  // YTD cumulative
  const selectedYear = selectedAy.split('-')[0];
  const ytdCutoff = selectedAy + '-31';
  const ytdOrders = orders.filter(o =>
    o.status === 'delivered' &&
    (o.createdAt || '').startsWith(selectedYear) &&
    (o.createdAt || '').substring(0, 7) <= selectedAy
  );
  const ytdGiderler = giderler.filter(g =>
    (g.tarih || '').startsWith(selectedYear) &&
    (g.tarih || '') <= ytdCutoff
  );
  const ytdGelir = ytdOrders.reduce((s, o) => s + Number(o.total || 0), 0);
  const ytdAlis = alisFaturalari.filter(f =>
    f.status !== 'void' &&
    !f.reversedById &&
    f.durum !== 'taslak' &&
    (f.tarih || '').startsWith(selectedYear) &&
    (f.tarih || '') <= ytdCutoff
  );
  const ytdGider = ytdGiderler.reduce((s, g) => s + Number(g.tutar || 0), 0)
    + ytdAlis.reduce((s, f) => s + Number(f.genelToplam || 0), 0);
  const ytdKar = ytdGelir - ytdGider;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-info-border border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-danger-text">
        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-success-text" />
            Kâr / Zarar Raporu
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">Teslim satış, gider ve alış faturalarına göre hesaplanır</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-text-muted" />
          <select
            value={selectedAy}
            onChange={e => setSelectedAy(e.target.value)}
            className="text-xs border border-border rounded-lg px-3 py-2 bg-base-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-info-border"
          >
            {aylar.map(a => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Hero Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-base-surface border border-border rounded-xl p-4 space-y-1">
          <p className="text-xs text-text-secondary font-medium">Toplam Gelir</p>
          <p className="text-base font-bold text-success-text">{formatTL(toplamGelir)}</p>
          <p className="text-xs text-text-muted">{ayOrders.length} sipariş</p>
        </div>
        <div className="bg-base-surface border border-border rounded-xl p-4 space-y-1">
          <p className="text-xs text-text-secondary font-medium">Toplam Gider</p>
          <p className="text-base font-bold text-danger-text">{formatTL(toplamGider)}</p>
          <p className="text-xs text-text-muted">{ayGiderler.length} kayıt</p>
        </div>
        <div className="bg-base-surface border border-border rounded-xl p-4 space-y-1">
          <p className="text-xs text-text-secondary font-medium">Alış Maliyeti</p>
          <p className="text-base font-bold text-warning-text">{formatTL(profitLoss.purchaseCost)}</p>
          <p className="text-xs text-text-muted">Onaylı/ödenmiş fatura</p>
        </div>
        <div className={`bg-base-surface border rounded-xl p-4 space-y-1 ${brutKar >= 0 ? 'border-success-border' : 'border-danger-border'}`}>
          <p className="text-xs text-text-secondary font-medium">
            Brüt {brutKar >= 0 ? 'Kâr' : 'Zarar'}
          </p>
          <p className={`text-base font-bold ${brutKar >= 0 ? 'text-success-text' : 'text-danger-text'}`}>
            {formatTL(Math.abs(brutKar))}
          </p>
          <p className="text-xs text-text-muted">{brutKar >= 0 ? 'Olumlu' : 'Olumsuz'} denge</p>
        </div>
        <div className="bg-base-surface border border-border rounded-xl p-4 space-y-1">
          <p className="text-xs text-text-secondary font-medium">Kâr Marjı</p>
          <p className={`text-base font-bold ${karMarji >= 20 ? 'text-purple-500 dark:text-purple-400' : karMarji >= 0 ? 'text-warning-text' : 'text-danger-text'}`}>
            %{karMarji.toFixed(1)}
          </p>
          <p className="text-xs text-text-muted">Gelir bazlı</p>
        </div>
      </div>

      {/* Monthly Trend Table */}
      <div className="bg-base-surface border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-bold text-text-primary">Son 6 Ay Trendi</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-base-surface-2/50">
                <th className="text-left px-4 py-2 font-semibold text-text-secondary">Ay</th>
                <th className="text-right px-4 py-2 font-semibold text-success-text">Gelir</th>
                <th className="text-right px-4 py-2 font-semibold text-danger-text">Gider</th>
                <th className="text-right px-4 py-2 font-semibold text-text-primary">Kâr / Zarar</th>
              </tr>
            </thead>
            <tbody>
              {trendData.map(row => (
                <tr
                  key={row.value}
                  className={`border-b border-border/50 hover:bg-base-surface-2/30 transition-colors ${row.value === selectedAy ? 'bg-info-fill/10' : ''}`}
                >
                  <td className="px-4 py-2.5 text-text-primary font-medium">
                    {row.shortLabel}
                    {row.value === selectedAy && (
                      <span className="ml-1.5 text-info-text text-[10px] font-normal">(seçili)</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right text-success-text">{formatTL(row.gelir)}</td>
                  <td className="px-4 py-2.5 text-right text-danger-text">{formatTL(row.gider)}</td>
                  <td className={`px-4 py-2.5 text-right font-semibold ${row.kar >= 0 ? 'text-success-text' : 'text-danger-text'}`}>
                    {row.kar >= 0 ? '+' : ''}{formatTL(row.kar)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category Breakdown */}
      {kategoriSirali.length > 0 && (
        <div className="bg-base-surface border border-border rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-text-primary">Kategori Bazlı Gider Dağılımı</h3>
          <div className="space-y-2.5">
            {kategoriSirali.map(([kat, tutar]) => {
              const pct = toplamGider > 0 ? (tutar / toplamGider) * 100 : 0;
              return (
                <div key={kat} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary">
                      {GiderKategoriLabel[kat] ?? kat}
                    </span>
                    <span className="text-text-primary font-medium">
                      {formatTL(tutar)}{' '}
                      <span className="text-text-muted font-normal">(%{pct.toFixed(1)})</span>
                    </span>
                  </div>
                  <div className="h-1.5 bg-base-surface-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${GiderKategoriBarRenk[kat] ?? 'bg-text-muted'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* YTD Cumulative */}
      <div className="bg-base-surface-2/50 border border-border rounded-xl p-4">
        <h3 className="text-sm font-bold text-text-primary mb-3">
          Yılbaşından Bugüne ({selectedYear}) Kümülatif
        </h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-xs text-text-secondary">Toplam Gelir</p>
            <p className="text-sm font-bold text-success-text mt-0.5">{formatTL(ytdGelir)}</p>
          </div>
          <div>
            <p className="text-xs text-text-secondary">Toplam Gider</p>
            <p className="text-sm font-bold text-danger-text mt-0.5">{formatTL(ytdGider)}</p>
          </div>
          <div>
            <p className="text-xs text-text-secondary">
              Net {ytdKar >= 0 ? 'Kâr' : 'Zarar'}
            </p>
            <p className={`text-sm font-bold mt-0.5 ${ytdKar >= 0 ? 'text-success-text' : 'text-danger-text'}`}>
              {formatTL(Math.abs(ytdKar))}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
