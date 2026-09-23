import { useState, useEffect } from 'react';
import { ChevronDown, Building2 } from 'lucide-react';
import { subscribeToAlisFaturalari, subscribeToTedarikciler } from '../../lib/firestoreService';
import type { AlisFaturasi, AlisFaturasiDurum, Tedarikci } from '../../types';

function formatPara(n: number) {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ₺';
}

const DURUM_LABEL: Record<AlisFaturasiDurum, string> = {
  taslak: 'Taslak',
  onaylandi: 'Onaylandı',
  odendi: 'Ödendi',
  iptal: 'İptal',
};

const DURUM_CLASS: Record<AlisFaturasiDurum, string> = {
  taslak: 'bg-base-surface-2 text-text-secondary border-border',
  onaylandi: 'bg-bg-info text-info-text border-info-border',
  odendi: 'bg-bg-success text-success-text border-success-border',
  iptal: 'bg-bg-danger text-danger-text border-danger-border',
};

export default function TedarikciEkstresi() {
  const [faturalar, setFaturalar] = useState<AlisFaturasi[]>([]);
  const [tedarikciler, setTedarikciler] = useState<Tedarikci[]>([]);
  const [secili, setSecili] = useState('');

  useEffect(() => {
    const u1 = subscribeToAlisFaturalari(setFaturalar);
    const u2 = subscribeToTedarikciler(setTedarikciler);
    return () => { u1(); u2(); };
  }, []);

  // Tüm tedarikçi adları (kayıtlı + faturalardaki)
  const tumTedarikciAdlari = Array.from(new Set([
    ...tedarikciler.map(t => t.ad),
    ...faturalar.map(f => f.tedarikciAdi),
  ].filter(Boolean))).sort();

  const seciliFaturalar = secili
    ? faturalar.filter(f => f.tedarikciAdi === secili)
    : [];

  const toplamAlim = seciliFaturalar.reduce((s, f) => s + f.genelToplam, 0);
  const odenen = seciliFaturalar.filter(f => f.durum === 'odendi').reduce((s, f) => s + f.genelToplam, 0);
  const odenmemis = seciliFaturalar
    .filter(f => f.durum === 'onaylandi' || f.durum === 'taslak')
    .reduce((s, f) => s + f.genelToplam, 0);

  return (
    <div className="space-y-5">
      {/* Tedarikçi seçimi */}
      <div className="bg-base-surface border border-border rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center space-x-2">
          <Building2 className="w-5 h-5 text-text-secondary" />
          <h2 className="text-sm font-bold text-text-primary">Tedarikçi Ekstresi</h2>
        </div>
        <div className="relative max-w-sm">
          <select
            value={secili}
            onChange={e => setSecili(e.target.value)}
            className="w-full px-4 pr-10 py-2.5 bg-base-surface-2 border border-border rounded-xl text-sm text-text-primary focus:outline-none appearance-none cursor-pointer"
          >
            <option value="">-- Tedarikçi Seçin --</option>
            {tumTedarikciAdlari.map(ad => (
              <option key={ad} value={ad}>{ad}</option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-text-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {!secili ? (
        <div className="bg-base-surface border border-border rounded-2xl p-10 text-center text-text-muted text-sm shadow-xs">
          Ekstre görüntülemek için tedarikçi seçin.
        </div>
      ) : (
        <>
          {/* Özet kartlar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-base-surface border border-border rounded-2xl p-4 shadow-xs">
              <div className="text-xs text-text-muted font-medium mb-1">Toplam Fatura</div>
              <div className="text-2xl font-black font-mono text-text-primary">{seciliFaturalar.length}</div>
            </div>
            <div className="bg-base-surface border border-border rounded-2xl p-4 shadow-xs">
              <div className="text-xs text-text-muted font-medium mb-1">Toplam Alım</div>
              <div className="text-xl font-black font-mono text-info-text">{formatPara(toplamAlim)}</div>
            </div>
            <div className="bg-base-surface border border-border rounded-2xl p-4 shadow-xs">
              <div className="text-xs text-text-muted font-medium mb-1">Ödenen</div>
              <div className="text-xl font-black font-mono text-success-text">{formatPara(odenen)}</div>
            </div>
            <div className="bg-base-surface border border-border rounded-2xl p-4 shadow-xs">
              <div className="text-xs text-text-muted font-medium mb-1">Ödenmemiş</div>
              <div className={`text-xl font-black font-mono ${odenmemis > 0 ? 'text-warning-text' : 'text-text-primary'}`}>{formatPara(odenmemis)}</div>
            </div>
          </div>

          {/* Fatura listesi */}
          <div className="bg-base-surface border border-border rounded-2xl shadow-xs overflow-hidden">
            {seciliFaturalar.length === 0 ? (
              <div className="p-8 text-center text-text-muted text-sm">Bu tedarikçiye ait fatura bulunmuyor.</div>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-base-surface-2 border-b border-border text-text-secondary font-bold">
                        <th className="px-4 py-3 text-left">Fatura No</th>
                        <th className="px-4 py-3 text-left">Tarih</th>
                        <th className="px-4 py-3 text-left">Vade</th>
                        <th className="px-4 py-3 text-right">Ara Toplam</th>
                        <th className="px-4 py-3 text-right">KDV</th>
                        <th className="px-4 py-3 text-right">Genel Toplam</th>
                        <th className="px-4 py-3 text-center">Durum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {seciliFaturalar.map(f => (
                        <tr key={f.id} className="border-b border-border/50 hover:bg-base-surface-2/50">
                          <td className="px-4 py-3 font-mono font-bold text-text-primary">{f.faturaNo}</td>
                          <td className="px-4 py-3 text-text-secondary">{f.tarih}</td>
                          <td className="px-4 py-3 text-text-secondary">{f.vadeTarihi || '-'}</td>
                          <td className="px-4 py-3 text-right font-mono text-text-secondary">{formatPara(f.araToplam)}</td>
                          <td className="px-4 py-3 text-right font-mono text-text-secondary">{formatPara(f.kdvToplam)}</td>
                          <td className="px-4 py-3 text-right font-bold font-mono text-text-primary">{formatPara(f.genelToplam)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${DURUM_CLASS[f.durum]}`}>
                              {DURUM_LABEL[f.durum]}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-base-surface-2 border-t-2 border-border font-bold">
                        <td colSpan={3} className="px-4 py-3 text-xs text-text-primary">TOPLAM</td>
                        <td className="px-4 py-3 text-right font-mono text-text-primary">
                          {formatPara(seciliFaturalar.reduce((s, f) => s + f.araToplam, 0))}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-text-primary">
                          {formatPara(seciliFaturalar.reduce((s, f) => s + f.kdvToplam, 0))}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-info-text text-sm">
                          {formatPara(toplamAlim)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Mobil kartlar */}
                <div className="md:hidden divide-y divide-border">
                  {seciliFaturalar.map(f => (
                    <div key={f.id} className="p-4 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-sm text-text-primary">{f.faturaNo}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${DURUM_CLASS[f.durum]}`}>{DURUM_LABEL[f.durum]}</span>
                      </div>
                      <div className="text-xs text-text-secondary">{f.tarih}{f.vadeTarihi ? ` → ${f.vadeTarihi}` : ''}</div>
                      <div className="text-xs flex justify-between">
                        <span className="text-text-muted">Genel Toplam</span>
                        <span className="font-bold font-mono text-text-primary">{formatPara(f.genelToplam)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
