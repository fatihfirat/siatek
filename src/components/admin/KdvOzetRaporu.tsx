import { useState, useEffect } from 'react';
import { db, collection, getDocs, query, orderBy } from '../../lib/firebase';
import { AlisFaturasi, GiderKaydi } from '../../types';
import { Receipt, AlertCircle, Calendar, Info } from 'lucide-react';
import { calculateVatSummary } from '../../utils/financeEngine';

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

export default function KdvOzetRaporu() {
  const aylar = getAyListesi();
  const [selectedAy, setSelectedAy] = useState(aylar[0].value);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [giderler, setGiderler] = useState<GiderKaydi[]>([]);
  const [alisFaturalari, setAlisFaturalari] = useState<AlisFaturasi[]>([]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getDocs(query(collection(db, 'gider_kayitlari'), orderBy('tarih', 'desc'))),
      getDocs(query(collection(db, 'alis_faturalari'), orderBy('tarih', 'desc'))),
    ])
      .then(([giderSnap, alisSnap]) => {
        const list: GiderKaydi[] = [];
        giderSnap.forEach(d => list.push({ id: d.id, ...(d.data() as Omit<GiderKaydi, 'id'>) } as GiderKaydi));
        const alisList: AlisFaturasi[] = [];
        alisSnap.forEach(d => alisList.push({ id: d.id, ...(d.data() as Omit<AlisFaturasi, 'id'>) } as AlisFaturasi));
        setGiderler(list);
        setAlisFaturalari(alisList);
        setLoading(false);
      })
      .catch(e => {
        setError('Veriler yüklenemedi: ' + (e?.message || 'Bilinmeyen hata'));
        setLoading(false);
      });
  }, []);

  const kdvSummary = calculateVatSummary({ giderler, alisFaturalari, period: selectedAy });
  const ayKdvliGiderler = kdvSummary.rows;
  const toplamKdv = kdvSummary.totalVat;
  const kdvGruplari = [
    { oran: 1, label: '%1 KDV', color: 'text-emerald-600 dark:text-emerald-400', barColor: 'bg-emerald-500', cardColor: 'text-emerald-600 dark:text-emerald-400' },
    { oran: 10, label: '%10 KDV', color: 'text-amber-600 dark:text-amber-400', barColor: 'bg-amber-500', cardColor: 'text-amber-600 dark:text-amber-400' },
    { oran: 20, label: '%20 KDV', color: 'text-red-500', barColor: 'bg-red-500', cardColor: 'text-red-500' },
  ];

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
            <Receipt className="w-5 h-5 text-info-text" />
            KDV Özet Raporu
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">İndirilecek KDV: gider + alış faturası</p>
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

      {/* Warning Banner */}
      <div className="flex items-start gap-3 bg-warning-fill/10 border border-warning-border rounded-xl p-4">
        <Info className="w-4 h-4 text-warning-text shrink-0 mt-0.5" />
        <p className="text-xs text-warning-text">
          Bu rapor bilgi amaçlıdır. KDV beyannamesi ve resmi işlemler için muhasebeciye danışınız.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-base-surface border border-border rounded-xl p-4 space-y-1">
          <p className="text-xs text-text-secondary font-medium">Toplam İndirilecek KDV</p>
          <p className="text-base font-bold text-info-text">{formatTL(toplamKdv)}</p>
          <p className="text-xs text-text-muted">{ayKdvliGiderler.length} KDV'li kayıt</p>
        </div>
        {kdvGruplari.map(({ oran, label, cardColor }) => {
          const grup = ayKdvliGiderler.filter(g => g.vatRate === oran);
          const toplam = grup.reduce((s, g) => s + Number(g.vatAmount || 0), 0);
          return (
            <div key={oran} className="bg-base-surface border border-border rounded-xl p-4 space-y-1">
              <p className="text-xs text-text-secondary font-medium">{label}</p>
              <p className={`text-base font-bold ${cardColor}`}>{formatTL(toplam)}</p>
              <p className="text-xs text-text-muted">{grup.length} kayıt</p>
            </div>
          );
        })}
      </div>

      {/* Rate Breakdown Bars */}
      {toplamKdv > 0 && (
        <div className="bg-base-surface border border-border rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-text-primary">Oran Dağılımı</h3>
          <div className="space-y-2.5">
            {kdvGruplari.map(({ oran, label, barColor, cardColor }) => {
              const grup = ayKdvliGiderler.filter(g => g.vatRate === oran);
              const toplam = grup.reduce((s, g) => s + Number(g.vatAmount || 0), 0);
              const pct = toplamKdv > 0 ? (toplam / toplamKdv) * 100 : 0;
              return (
                <div key={oran} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary">{label}</span>
                    <span className={`font-medium ${cardColor}`}>
                      {formatTL(toplam)}{' '}
                      <span className="text-text-muted font-normal">(%{pct.toFixed(1)})</span>
                    </span>
                  </div>
                  <div className="h-1.5 bg-base-surface-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* KDV List Table */}
      <div className="bg-base-surface border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-bold text-text-primary">KDV Kayıt Listesi</h3>
          <span className="text-xs text-text-muted">{ayKdvliGiderler.length} kayıt</span>
        </div>
        {ayKdvliGiderler.length === 0 ? (
          <div className="p-8 text-center text-text-muted text-sm">
            Bu ay için KDV'li gider kaydı bulunamadı.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-base-surface-2/50">
                  <th className="text-left px-4 py-2 font-semibold text-text-secondary">Tarih</th>
                  <th className="text-left px-4 py-2 font-semibold text-text-secondary">Açıklama</th>
                  <th className="text-left px-4 py-2 font-semibold text-text-secondary hidden sm:table-cell">
                    Tedarikçi
                  </th>
                  <th className="text-right px-4 py-2 font-semibold text-text-secondary">KDV %</th>
                  <th className="text-right px-4 py-2 font-semibold text-text-secondary">KDV Tutarı</th>
                  <th className="text-right px-4 py-2 font-semibold text-text-secondary hidden md:table-cell">
                    Brüt Tutar
                  </th>
                </tr>
              </thead>
              <tbody>
                {ayKdvliGiderler.map(g => (
                  <tr
                    key={g.id}
                    className="border-b border-border/50 hover:bg-base-surface-2/30 transition-colors"
                  >
                    <td className="px-4 py-2.5 text-text-secondary whitespace-nowrap">{g.date}</td>
                    <td className="px-4 py-2.5 text-text-primary max-w-[180px] truncate">{g.title}</td>
                    <td className="px-4 py-2.5 text-text-secondary hidden sm:table-cell">
                      {g.party || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="inline-flex px-1.5 py-0.5 rounded text-[11px] font-medium bg-info-fill/15 text-info-text">
                        %{g.vatRate}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-info-text">
                      {formatTL(g.vatAmount || 0)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-text-primary hidden md:table-cell">
                      {formatTL(g.grossAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-base-surface-2/50 border-t-2 border-border">
                  <td
                    colSpan={4}
                    className="px-4 py-2.5 text-xs font-bold text-text-primary text-right"
                  >
                    Toplam KDV:
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs font-bold text-info-text">
                    {formatTL(toplamKdv)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs font-bold text-text-primary hidden md:table-cell">
                    {formatTL(kdvSummary.totalGross)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
