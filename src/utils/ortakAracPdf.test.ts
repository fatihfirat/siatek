import { describe, expect, it } from 'vitest';
import { buildOrtakAracPdf, buildOrtakAracPdfModel } from './ortakAracPdf';
import type { OrtakAracFis } from '../types';

const fis = (o: Partial<OrtakAracFis>) => ({ id: Math.random().toString(), aciklama: '', createdAt: '', updatedAt: '', tarih: '2026-09-05', tutar: 0, tur: 'satis', ...o }) as OrtakAracFis;

const fisler = [
  fis({ tur: 'satis', tutar: 10000, malMaliyeti: 6000, odeyen: 'ortak', aciklama: 'Müşteri A', fisNo: '12' }),
  fis({ tur: 'gider', tutar: 800, giderKategori: 'yakit', odeyen: 'biz' }),
  fis({ tur: 'gider', tutar: 9999, giderKategori: 'diger', status: 'void', reversedById: 'V' }),
  fis({ tur: 'ortak_odeme', tutar: 500, odemeYonu: 'ortaga_odedik', tarih: '2026-09-20' }),
  fis({ tur: 'satis', tutar: 700, malMaliyeti: 0, tarih: '2026-08-30' }),
];

describe('Ortak araç PDF modeli', () => {
  it('özet, dağılım ve cari tutarlarını dönem fişlerinden üretir; iptal fişleri almaz', () => {
    const m = buildOrtakAracPdfModel(fisler, '2026-09');

    expect(m.filename).toBe('ortak-arac-11ACH644-2026-09.pdf');
    expect(m.net).toBe(3200);
    expect(m.summaryRows.map((r) => r[0])).toContain('NET KÂR');
    expect(m.expenseRows).toHaveLength(1);
    expect(m.receiptRows).toHaveLength(3);
    expect(m.receiptRows.flat().join(' ')).not.toContain('9.999');
    // ortak payı 1600 + iade 6000 − ödenen 500 (+ ağustos satışı 350) = 7450
    expect(m.bakiye).toBe(7450);
    expect(m.cariSonuc).toBe('Ortağa borcumuz');
  });

  it('PDF belgesini hatasız üretir (Türkçe karakterler, boş dönem dahil)', () => {
    const { doc } = buildOrtakAracPdf(fisler, '2026-09');
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    expect(() => buildOrtakAracPdf([], '2026-09')).not.toThrow();
  });
});
