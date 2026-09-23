import { describe, expect, it } from 'vitest';
import { calculateProfitLoss, calculateVatSummary, createAlisFaturaReversal, createKasaReversal } from './financeEngine';
import type { AlisFaturasi, GiderKaydi, KasaHareketi, Order } from '../types';

describe('Faz 3 — Ön muhasebe motoru', () => {
  it('KDV raporu gider ve alış faturasını belge durumuna göre toplar', () => {
    const giderler = [
      { id: 'g1', tarih: '2026-09-10', kdvDahil: true, kdvOrani: 20, kdvTutar: 200, tutar: 1200, aciklama: 'Gider' },
    ] as GiderKaydi[];
    const alisFaturalari = [
      {
        id: 'a1',
        faturaNo: 'AF-1',
        tedarikciAdi: 'Tedarikçi',
        tarih: '2026-09-11',
        kalemler: [{ urunAdi: 'Ürün', miktar: 1, birim: 'adet', birimFiyat: 1000, kdvOrani: 20, kdvTutar: 200, toplam: 1200 }],
        araToplam: 1000,
        kdvToplam: 200,
        genelToplam: 1200,
        durum: 'onaylandi',
        createdAt: '',
        updatedAt: '',
      },
    ] as AlisFaturasi[];

    const result = calculateVatSummary({ giderler, alisFaturalari, period: '2026-09' });

    expect(result.totalVat).toBe(400);
    expect(result.totalGross).toBe(2400);
    expect(result.rows).toHaveLength(2);
  });

  it('kâr/zarar satış, gider ve alış maliyetini aynı dönem içinde hesaplar', () => {
    const orders = [{ id: 'o1', status: 'delivered', createdAt: '2026-09-02', total: 3000 }] as Order[];
    const giderler = [{ id: 'g1', tarih: '2026-09-03', tutar: 400 }] as GiderKaydi[];
    const alisFaturalari = [{ id: 'a1', tarih: '2026-09-04', genelToplam: 1000, durum: 'odendi', kalemler: [] }] as AlisFaturasi[];

    const result = calculateProfitLoss({ orders, giderler, alisFaturalari, period: '2026-09' });

    expect(result.revenue).toBe(3000);
    expect(result.totalExpense).toBe(1400);
    expect(result.profit).toBe(1600);
  });

  it('silme yerine ters hareket üretir', () => {
    const kasa = {
      id: 'kh1',
      tip: 'giris',
      kategori: 'satis_tahsilat',
      tutar: 500,
      aciklama: 'Tahsilat',
      tarih: '2026-09-12',
      createdAt: '',
      updatedAt: '',
    } as KasaHareketi;

    const reversal = createKasaReversal(kasa, '2026-09-12T10:00:00.000Z');

    expect(reversal.tip).toBe('cikis');
    expect(reversal.reversalOfId).toBe('kh1');
    expect(reversal.lockedPeriod).toBe('2026-09');
  });

  it('alış faturası iptali negatif belge hareketi üretir', () => {
    const fatura = {
      id: 'a1',
      faturaNo: 'AF-1',
      tedarikciAdi: 'Tedarikçi',
      tarih: '2026-09-12',
      kalemler: [{ urunAdi: 'Ürün', miktar: 2, birim: 'adet', birimFiyat: 100, kdvOrani: 20, kdvTutar: 40, toplam: 240 }],
      araToplam: 200,
      kdvToplam: 40,
      genelToplam: 240,
      durum: 'onaylandi',
      createdAt: '',
      updatedAt: '',
    } as AlisFaturasi;

    const reversal = createAlisFaturaReversal(fatura, '2026-09-12T10:00:00.000Z');

    expect(reversal.durum).toBe('iptal');
    expect(reversal.genelToplam).toBe(-240);
    expect(reversal.kalemler[0].miktar).toBe(-2);
  });
});
