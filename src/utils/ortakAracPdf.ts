import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { OrtakAracFis, OrtakAracGiderKategori } from '../types';
import { activeAccountingRows, calculateOrtakAracHesap } from './financeEngine';
import { downloadOrSavePDF, formatTRY, setupTurkishFont } from './exportUtils';
import { getCompanySettings } from '../lib/companySettings';

export const ORTAK_ARAC_PLAKA = '11 ACH 644';

const GIDER_LABEL: Record<OrtakAracGiderKategori, string> = {
  sofor_maas: 'Şoför Maaşı',
  yakit: 'Yakıt',
  yemek: 'Yeme / İçme',
  vergi_harc: 'Vergi & Harç',
  bakim_onarim: 'Bakım & Onarım',
  sigorta: 'Sigorta',
  diger: 'Diğer',
};

export function ortakAracAyEtiketi(period: string): string {
  const [y, m] = period.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' });
}

function pct(n: number): string {
  return '%' + n.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function fisTuru(f: OrtakAracFis): string {
  if (f.tur === 'satis') return 'Satış';
  if (f.tur === 'gider') return GIDER_LABEL[f.giderKategori || 'diger'];
  return f.odemeYonu === 'ortaktan_aldik' ? 'Ortaktan alınan' : 'Ortağa ödenen';
}

function fisOdeyen(f: OrtakAracFis): string {
  if ((f.tur === 'gider' || f.tur === 'satis') && f.odeyen === 'ortak') {
    return f.tur === 'satis' ? 'Ortak (maliyet)' : 'Ortak';
  }
  return f.tur === 'gider' || (f.tur === 'satis' && Number(f.malMaliyeti || 0) > 0) ? 'Biz' : '-';
}

function tutarMetni(f: OrtakAracFis): string {
  if (f.tur === 'satis') return `+ ${formatTRY(f.tutar)}`;
  if (f.tur === 'gider') return `− ${formatTRY(f.tutar)}`;
  return `${f.odemeYonu === 'ortaktan_aldik' ? '←' : '→'} ${formatTRY(f.tutar)}`;
}

function bakiyeSonucu(bakiye: number): string {
  return bakiye > 0 ? 'Ortağa borcumuz var' : bakiye < 0 ? 'Ortağın bize borcu var' : 'Hesap kapalı';
}

/** PDF'in içeriğini üreten saf model; çizimden bağımsız test edilebilir. */
export function buildOrtakAracPdfModel(fisler: OrtakAracFis[], period: string) {
  const hesap = calculateOrtakAracHesap(fisler, period);
  const p = hesap.period;
  const cari = hesap.cari;

  const giderToplam = Object.values(hesap.expenseByCategory).reduce((a, b) => a + b, 0);
  const expenseBars = Object.entries(hesap.expenseByCategory)
    .map(([kat, toplam]) => ({
      label: GIDER_LABEL[kat as OrtakAracGiderKategori] || kat,
      amount: toplam,
      percent: giderToplam > 0 ? (toplam / giderToplam) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const periodRows = activeAccountingRows(fisler)
    .filter((f) => f.tarih.startsWith(period))
    .sort((a, b) => a.tarih.localeCompare(b.tarih));

  const receiptRows = periodRows.map((f) => ({
    tur: f.tur,
    cells: [
      f.tarih.split('-').reverse().join('.'),
      fisTuru(f),
      [f.aciklama, f.fisNo ? `#${f.fisNo}` : ''].filter(Boolean).join(' ') || '-',
      fisOdeyen(f),
      f.tur === 'satis' ? formatTRY(Number(f.malMaliyeti || 0)) : '-',
      tutarMetni(f),
    ],
  }));

  const hesapRows: Array<{ label: string; value: string; strong?: boolean; tone?: 'net' }> = [
    { label: 'Satış cirosu', value: formatTRY(p.revenue) },
    { label: 'Mal maliyeti (−)', value: formatTRY(p.goodsCost) },
    { label: `Brüt kâr (${pct(p.grossMarginPercent)})`, value: formatTRY(p.grossProfit), strong: true },
    { label: 'Araç giderleri (−)', value: formatTRY(p.expenses) },
    { label: p.net < 0 ? 'Net zarar' : 'Net kâr', value: formatTRY(p.net), strong: true, tone: 'net' },
    { label: 'Ortağın payı (%50)', value: formatTRY(p.partnerShare) },
    { label: 'Bizim payımız (%50)', value: formatTRY(p.ourShare) },
  ];

  const cariRows: Array<[string, string]> = [
    ['Önceki dönemden devir', formatTRY(cari.opening)],
    ['Dönem payı — ortağın %50 payı (+)', formatTRY(cari.share)],
    ['Ortağın cebinden ödedikleri: gider + mal maliyeti (+)', formatTRY(cari.advances)],
    ['Ortağa net ödenen (−)', formatTRY(cari.paid)],
  ];

  return {
    title: `Ortak Araç Hesap Özeti — ${ortakAracAyEtiketi(period)}`,
    belgeNo: `OAH-${period}`,
    filename: `ortak-arac-${ORTAK_ARAC_PLAKA.replace(/\s+/g, '')}-${period}.pdf`,
    period,
    net: p.net,
    grossMarginPercent: p.grossMarginPercent,
    partnerShare: p.partnerShare,
    ourShare: p.ourShare,
    hesapRows,
    summaryRows: hesapRows.map((r) => [r.label, r.value] as [string, string]),
    expenseBars,
    expenseRows: expenseBars.map((b) => [b.label, formatTRY(b.amount)] as [string, string]),
    receiptRows: receiptRows.map((r) => r.cells),
    receiptTurs: receiptRows.map((r) => r.tur),
    totals: { revenue: p.revenue, goodsCost: p.goodsCost, expenses: p.expenses },
    cariRows,
    cariSonuc: bakiyeSonucu(cari.closing),
    cariTutar: formatTRY(Math.abs(cari.closing)),
    bakiye: cari.closing,
    guncelBakiye: hesap.partnerBalance,
  };
}

type RGB = [number, number, number];
const INK: RGB = [15, 23, 42];
const SLATE: RGB = [30, 41, 59];
const MUTED: RGB = [100, 116, 139];
const LINE: RGB = [226, 232, 240];
const PANEL: RGB = [248, 250, 252];
const EMERALD: RGB = [5, 150, 105];
const EMERALD_DK: RGB = [4, 120, 87];
const EMERALD_BG: RGB = [236, 253, 245];
const RED: RGB = [185, 28, 28];
const RED_BG: RGB = [254, 242, 242];
const BLUE: RGB = [29, 78, 216];
const BLUE_BG: RGB = [239, 246, 255];
const AMBER: RGB = [180, 83, 9];
const AMBER_BG: RGB = [255, 251, 235];

export function buildOrtakAracPdf(fisler: OrtakAracFis[], period: string): { doc: jsPDF; filename: string } {
  const m = buildOrtakAracPdfModel(fisler, period);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const font = setupTurkishFont(doc);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const cw = pageWidth - margin * 2;
  const bottomLimit = pageHeight - 20;
  const company = getCompanySettings();
  const ayLabel = ortakAracAyEtiketi(m.period);

  const text = (t: string, x: number, y: number, size: number, color: RGB, style: 'normal' | 'bold' = 'normal', align: 'left' | 'right' | 'center' = 'left') => {
    doc.setFont(font, style);
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(t, x, y, { align });
  };
  const fill = (c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
  const stroke = (c: RGB, w = 0.2) => {
    doc.setDrawColor(c[0], c[1], c[2]);
    doc.setLineWidth(w);
  };

  // ── Başlık (açık zemin, ince emerald çizgi) ─────────────────────────────
  text(String(company.companyName || 'ALPHA TEKNİK').substring(0, 64).toUpperCase(), margin, 17, 7.5, MUTED, 'bold');
  text('Ortak Araç Hesap Özeti', margin, 26, 19, INK, 'bold');
  text(`Plaka ${ORTAK_ARAC_PLAKA}   ·   ${ayLabel}   ·   Kâr ve zarar %50 / %50`, margin, 32.5, 9, MUTED);
  text('BELGE NO', pageWidth - margin, 17, 6.5, MUTED, 'bold', 'right');
  text(m.belgeNo, pageWidth - margin, 23, 12, EMERALD_DK, 'bold', 'right');
  text(`Düzenlenme: ${new Date().toLocaleDateString('tr-TR')}`, pageWidth - margin, 29, 8, MUTED, 'normal', 'right');
  stroke(LINE, 0.3);
  doc.line(margin, 37, pageWidth - margin, 37);
  fill(EMERALD);
  doc.rect(margin, 36.5, 28, 1, 'F');

  let y = 44;
  const ensure = (h: number) => {
    if (y + h > bottomLimit) {
      doc.addPage();
      y = margin + 4;
    }
  };
  const section = (title: string) => {
    ensure(16);
    text(title.toUpperCase(), margin, y, 7.5, MUTED, 'bold');
    y += 3;
  };

  // ── 3 özet kartı ────────────────────────────────────────────────────────
  const gap = 4;
  const cardW = (cw - gap * 2) / 3;
  const cardH = 25;
  const zarar = m.net < 0;
  const cariTone: { accent: RGB; value: RGB } =
    m.bakiye > 0 ? { accent: AMBER, value: AMBER } : m.bakiye < 0 ? { accent: BLUE, value: BLUE } : { accent: EMERALD, value: EMERALD_DK };
  const cards: Array<{ label: string; value: string; sub: string; accent: RGB; valueColor: RGB }> = [
    {
      label: zarar ? 'NET ZARAR' : 'NET KÂR',
      value: formatTRY(m.net),
      sub: `Brüt marj ${pct(m.grossMarginPercent)}`,
      accent: zarar ? RED : EMERALD,
      valueColor: zarar ? RED : EMERALD_DK,
    },
    {
      label: 'ORTAĞIN PAYI (%50)',
      value: formatTRY(m.partnerShare),
      sub: `Bizim payımız ${formatTRY(m.ourShare)}`,
      accent: SLATE,
      valueColor: INK,
    },
    {
      label: 'ORTAK CARİ · DÖNEM SONU',
      value: formatTRY(Math.abs(m.bakiye)),
      sub: m.cariSonuc,
      accent: cariTone.accent,
      valueColor: cariTone.value,
    },
  ];
  cards.forEach((c, i) => {
    const x = margin + i * (cardW + gap);
    fill(PANEL);
    stroke(LINE, 0.25);
    doc.roundedRect(x, y, cardW, cardH, 2, 2, 'FD');
    fill(c.accent);
    doc.rect(x, y + 3, 1.2, cardH - 6, 'F');
    text(c.label, x + 5, y + 7, 6.5, MUTED, 'bold');
    text(c.value, x + 5, y + 15.5, 13.5, c.valueColor, 'bold');
    text(c.sub, x + 5, y + 21.5, 7.5, MUTED);
  });
  y += cardH + 9;

  const lastY = () => (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
  const baseTable = {
    theme: 'plain' as const,
    margin: { left: margin, right: margin, bottom: 22 },
    styles: { font, fontSize: 8.5, cellPadding: { top: 2.2, bottom: 2.2, left: 2, right: 2 }, textColor: SLATE, lineColor: LINE, lineWidth: 0 },
  };

  // ── Dönem hesabı ────────────────────────────────────────────────────────
  section(`Dönem hesabı — ${ayLabel}`);
  autoTable(doc, {
    ...baseTable,
    startY: y,
    body: m.hesapRows.map((r) => [r.label, r.value]),
    columnStyles: { 0: { cellWidth: cw * 0.66 }, 1: { halign: 'right' } },
    didParseCell: (d) => {
      const row = m.hesapRows[d.row.index];
      if (!row) return;
      if (row.strong) d.cell.styles.fontStyle = 'bold';
      if (row.tone === 'net') {
        d.cell.styles.fillColor = zarar ? RED_BG : EMERALD_BG;
        d.cell.styles.textColor = zarar ? RED : EMERALD_DK;
      }
    },
    didDrawCell: (d) => {
      if (d.section === 'body') {
        stroke(LINE, 0.2);
        doc.line(d.cell.x, d.cell.y + d.cell.height, d.cell.x + d.cell.width, d.cell.y + d.cell.height);
      }
    },
  });
  y = lastY() + 9;

  // ── Gider dağılımı (çubuklu) ────────────────────────────────────────────
  if (m.expenseBars.length > 0) {
    section('Gider dağılımı');
    const labelW = 44;
    const valueW = 52;
    const trackX = margin + labelW;
    const trackW = cw - labelW - valueW;
    m.expenseBars.forEach((b) => {
      ensure(8);
      text(b.label, margin, y + 4, 8.5, SLATE);
      fill([241, 245, 249]);
      doc.roundedRect(trackX, y + 1.2, trackW, 3.6, 1.8, 1.8, 'F');
      fill([220, 90, 90]);
      doc.roundedRect(trackX, y + 1.2, Math.max(1.8, (trackW * b.percent) / 100), 3.6, 1.8, 1.8, 'F');
      text(pct(b.percent), trackX + trackW + 12, y + 4, 8, MUTED, 'normal', 'right');
      text(formatTRY(b.amount), pageWidth - margin, y + 4, 8.5, SLATE, 'bold', 'right');
      y += 7;
    });
    y += 5;
  }

  // ── Fiş dökümü ──────────────────────────────────────────────────────────
  section('Fiş dökümü');
  autoTable(doc, {
    ...baseTable,
    startY: y,
    head: [['Tarih', 'Tür', 'Açıklama', 'Ödeyen', 'Mal maliyeti', 'Tutar']],
    body: m.receiptRows.length > 0 ? m.receiptRows : [['-', '-', 'Bu dönemde fiş yok.', '-', '-', '-']],
    showHead: 'everyPage',
    headStyles: { fillColor: [241, 245, 249], textColor: MUTED, font, fontStyle: 'bold', fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 28 },
      4: { halign: 'right', cellWidth: 26 },
      5: { halign: 'right', cellWidth: 32, fontStyle: 'bold' },
    },
    didParseCell: (d) => {
      if (d.section !== 'body') return;
      const tur = m.receiptTurs[d.row.index];
      const color = tur === 'satis' ? EMERALD_DK : tur === 'gider' ? RED : BLUE;
      if (d.column.index === 1 || d.column.index === 5) {
        d.cell.styles.textColor = color;
        if (d.column.index === 1) d.cell.styles.fontStyle = 'bold';
      }
    },
    didDrawCell: (d) => {
      if (d.section === 'body') {
        stroke(LINE, 0.15);
        doc.line(d.cell.x, d.cell.y + d.cell.height, d.cell.x + d.cell.width, d.cell.y + d.cell.height);
      }
    },
  });
  y = lastY() + 3;

  ensure(14);
  fill(PANEL);
  stroke(LINE, 0.2);
  doc.roundedRect(margin, y, cw, 11, 2, 2, 'FD');
  const third = cw / 3;
  (
    [
      ['Toplam satış', formatTRY(m.totals.revenue), EMERALD_DK],
      ['Toplam mal maliyeti', formatTRY(m.totals.goodsCost), SLATE],
      ['Toplam gider', formatTRY(m.totals.expenses), RED],
    ] as Array<[string, string, RGB]>
  ).forEach(([label, value, color], i) => {
    const x = margin + i * third + 4;
    text(label, x, y + 4.5, 6.5, MUTED, 'bold');
    text(value, x, y + 9, 9, color, 'bold');
  });
  y += 11 + 9;

  // ── Ortak cari: dönem ekstresi ──────────────────────────────────────────
  ensure(60);
  section('Ortak cari — dönem ekstresi');
  autoTable(doc, {
    ...baseTable,
    startY: y,
    body: m.cariRows,
    columnStyles: { 0: { cellWidth: cw * 0.72 }, 1: { halign: 'right' } },
    didDrawCell: (d) => {
      if (d.section === 'body') {
        stroke(LINE, 0.2);
        doc.line(d.cell.x, d.cell.y + d.cell.height, d.cell.x + d.cell.width, d.cell.y + d.cell.height);
      }
    },
  });
  y = lastY() + 2;
  const [tone, toneBg]: [RGB, RGB] = m.bakiye > 0 ? [AMBER, AMBER_BG] : m.bakiye < 0 ? [BLUE, BLUE_BG] : [EMERALD_DK, EMERALD_BG];
  fill(toneBg);
  doc.roundedRect(margin, y, cw, 12, 2, 2, 'F');
  fill(tone);
  doc.rect(margin, y + 2.5, 1.2, 7, 'F');
  text(`Dönem sonu bakiye — ${m.cariSonuc}`, margin + 5, y + 7.6, 9.5, tone, 'bold');
  text(m.cariTutar, pageWidth - margin - 4, y + 7.6, 12, tone, 'bold', 'right');
  y += 12 + 2.5;
  text('(+) ortağa borcumuz · (−) ortağın bize borcu. Bakiye dönem sonu itibarıyla, sonraki dönem fişleri hariç hesaplanmıştır.', margin, y + 2, 6.8, MUTED);
  y += 12;

  // ── Mutabakat ve imza ───────────────────────────────────────────────────
  ensure(50);
  section('Mutabakat');
  const noteLines = doc.splitTextToSize(
    `Yukarıdaki hesap özetini inceledim. ${ayLabel} dönemine ait ortak araç (${ORTAK_ARAC_PLAKA}) hesabını ve dönem sonu bakiyesini kabul ediyorum.`,
    cw,
  ) as string[];
  doc.setFont(font, 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(SLATE[0], SLATE[1], SLATE[2]);
  doc.text(noteLines, margin, y + 1.5);
  y += noteLines.length * 4.2 + 12;

  const half = (cw - 10) / 2;
  (
    [
      ['Biz', margin],
      ['Ortak', margin + half + 10],
    ] as Array<[string, number]>
  ).forEach(([who, x]) => {
    stroke([148, 163, 184], 0.25);
    doc.line(x, y + 12, x + half, y + 12);
    text(`${who} — ad soyad / imza`, x, y + 16.5, 7.5, MUTED);
    text('Tarih:  ....  /  ....  /  ........', x + half, y + 16.5, 7.5, MUTED, 'normal', 'right');
  });

  // ── Alt bilgi (her sayfada) ─────────────────────────────────────────────
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    stroke(LINE, 0.2);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    text('Bu belge yönetim raporudur; mali belge, fatura veya defter yerine geçmez. Tutarlara KDV dahil edilmemiştir.', margin, pageHeight - 10.5, 6.5, MUTED);
    text(`${m.belgeNo}  ·  Sayfa ${i} / ${pages}`, pageWidth - margin, pageHeight - 10.5, 6.5, MUTED, 'normal', 'right');
  }

  return { doc, filename: m.filename };
}

export function generateOrtakAracPDF(fisler: OrtakAracFis[], period: string) {
  const { doc, filename } = buildOrtakAracPdf(fisler, period);
  downloadOrSavePDF(doc, filename);
}
