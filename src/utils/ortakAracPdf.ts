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

function fisTuru(f: OrtakAracFis): string {
  if (f.tur === 'satis') return 'Satış';
  if (f.tur === 'gider') return GIDER_LABEL[f.giderKategori || 'diger'];
  return f.odemeYonu === 'ortaktan_aldik' ? 'Ortaktan alınan' : 'Ortağa ödenen';
}

function fisOdeyen(f: OrtakAracFis): string {
  if ((f.tur === 'gider' || f.tur === 'satis') && f.odeyen === 'ortak') {
    return f.tur === 'satis' ? 'Maliyeti ortak' : 'Ortak';
  }
  return f.tur === 'gider' || (f.tur === 'satis' && Number(f.malMaliyeti || 0) > 0) ? 'Biz' : '-';
}

/** PDF'in içeriğini üreten saf model; çizimden bağımsız test edilebilir. */
export function buildOrtakAracPdfModel(fisler: OrtakAracFis[], period: string) {
  const hesap = calculateOrtakAracHesap(fisler, period);
  const p = hesap.period;
  const bakiye = hesap.partnerBalance;

  const summaryRows: Array<[string, string]> = [
    ['Satış cirosu', formatTRY(p.revenue)],
    ['Mal maliyeti (−)', formatTRY(p.goodsCost)],
    ['Araç giderleri (−)', formatTRY(p.expenses)],
    [p.net < 0 ? 'NET ZARAR' : 'NET KÂR', formatTRY(p.net)],
    ['Ortağın payı (%50)', formatTRY(p.partnerShare)],
    ['Bizim payımız (%50)', formatTRY(p.ourShare)],
  ];

  const expenseRows = Object.entries(hesap.expenseByCategory)
    .map(([kat, toplam]) => [GIDER_LABEL[kat as OrtakAracGiderKategori] || kat, toplam] as [string, number])
    .sort((a, b) => b[1] - a[1])
    .map(([label, toplam]) => [label, formatTRY(toplam)] as [string, string]);

  const receiptRows = activeAccountingRows(fisler)
    .filter((f) => f.tarih.startsWith(period))
    .sort((a, b) => a.tarih.localeCompare(b.tarih))
    .map((f) => [
      f.tarih,
      fisTuru(f),
      [f.aciklama, f.fisNo ? `#${f.fisNo}` : ''].filter(Boolean).join(' ') || '-',
      fisOdeyen(f),
      f.tur === 'satis' ? formatTRY(Number(f.malMaliyeti || 0)) : '-',
      (f.tur === 'gider' ? '−' : '') + formatTRY(f.tutar),
    ]);

  const cariRows: Array<[string, string]> = [
    ['Ortağın toplam payı (tüm zamanlar)', formatTRY(hesap.allTime.partnerShare)],
    ['Ortağın cebinden ödedikleri: gider + mal maliyeti (+)', formatTRY(hesap.partnerAdvances)],
    ['Ortağa net ödenen (−)', formatTRY(hesap.paidToPartner)],
  ];
  const cariSonuc = bakiye > 0 ? 'Ortağa borcumuz' : bakiye < 0 ? 'Ortağın bize borcu' : 'Hesap kapalı';

  return {
    title: `Ortak Araç Hesap Özeti — ${ortakAracAyEtiketi(period)}`,
    filename: `ortak-arac-${ORTAK_ARAC_PLAKA.replace(/\s+/g, '')}-${period}.pdf`,
    period,
    summaryRows,
    expenseRows,
    receiptRows,
    cariRows,
    cariSonuc,
    cariTutar: formatTRY(Math.abs(bakiye)),
    bakiye,
    net: p.net,
  };
}

export function buildOrtakAracPdf(fisler: OrtakAracFis[], period: string): { doc: jsPDF; filename: string } {
  const m = buildOrtakAracPdfModel(fisler, period);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const font = setupTurkishFont(doc);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;
  const company = getCompanySettings();

  const SLATE: [number, number, number] = [30, 41, 59];
  const EMERALD: [number, number, number] = [5, 150, 105];

  // Başlık bandı
  doc.setFillColor(...SLATE);
  doc.roundedRect(margin, margin, contentWidth, 22, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont(font, 'bold');
  doc.setFontSize(12);
  doc.text(String(company.companyName || 'ALPHA TEKNİK').substring(0, 60), margin + 6, margin + 8);
  doc.setFont(font, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(190, 205, 225);
  doc.text(`Ortak Araç Hesap Özeti  ·  Plaka: ${ORTAK_ARAC_PLAKA}`, margin + 6, margin + 14.5);
  doc.text(`Düzenlenme: ${new Date().toLocaleDateString('tr-TR')}`, margin + 6, margin + 19);

  doc.setFillColor(...EMERALD);
  doc.roundedRect(pageWidth - margin - 46, margin + 4, 40, 14, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont(font, 'bold');
  doc.setFontSize(7.5);
  doc.text('DÖNEM', pageWidth - margin - 26, margin + 9.5, { align: 'center' });
  doc.setFontSize(9);
  doc.text(ortakAracAyEtiketi(m.period), pageWidth - margin - 26, margin + 15, { align: 'center' });

  const tableCommon = {
    theme: 'striped' as const,
    margin: { left: margin, right: margin, bottom: 22 },
    headStyles: { fillColor: SLATE, textColor: [255, 255, 255] as [number, number, number], font, fontStyle: 'bold' as const, fontSize: 8 },
    styles: { font, fontSize: 8, cellPadding: 2, textColor: SLATE, lineColor: [226, 232, 240] as [number, number, number], lineWidth: 0.1 },
    alternateRowStyles: { fillColor: [248, 250, 252] as [number, number, number] },
  };
  const lastY = () => (doc as any).lastAutoTable?.finalY ?? margin + 30;
  const sectionTitle = (text: string, y: number) => {
    doc.setTextColor(...SLATE);
    doc.setFont(font, 'bold');
    doc.setFontSize(9.5);
    doc.text(text, margin, y);
  };

  // 1) Dönem özeti
  sectionTitle('Dönem Özeti (kâr ve zarar yarı yarıya paylaşılır)', margin + 30);
  autoTable(doc, {
    ...tableCommon,
    startY: margin + 33,
    body: m.summaryRows,
    columnStyles: { 0: { cellWidth: contentWidth * 0.62 }, 1: { halign: 'right', fontStyle: 'bold' } },
    didParseCell: (d) => {
      if (d.section === 'body' && (d.row.index === 3)) {
        d.cell.styles.fontStyle = 'bold';
        d.cell.styles.fillColor = m.net < 0 ? [254, 242, 242] : [236, 253, 245];
      }
    },
  });

  // 2) Gider dağılımı
  if (m.expenseRows.length > 0) {
    sectionTitle('Gider Dağılımı', lastY() + 8);
    autoTable(doc, {
      ...tableCommon,
      startY: lastY() + 10,
      body: m.expenseRows,
      columnStyles: { 0: { cellWidth: contentWidth * 0.62 }, 1: { halign: 'right' } },
    });
  }

  // 3) Fiş dökümü
  sectionTitle('Fiş Dökümü', lastY() + 8);
  autoTable(doc, {
    ...tableCommon,
    startY: lastY() + 10,
    head: [['Tarih', 'Tür', 'Açıklama', 'Ödeyen', 'Mal Maliy.', 'Tutar']],
    body: m.receiptRows.length > 0 ? m.receiptRows : [['-', '-', 'Bu dönemde fiş yok.', '-', '-', '-']],
    showHead: 'everyPage',
    columnStyles: { 4: { halign: 'right' }, 5: { halign: 'right', fontStyle: 'bold' } },
  });

  // 4) Ortak cari
  let y = lastY() + 8;
  if (y + 58 > pageHeight - margin) {
    doc.addPage();
    y = margin + 4;
  }
  sectionTitle('Ortak Cari (tüm zamanlar)', y);
  autoTable(doc, {
    ...tableCommon,
    startY: y + 2,
    body: m.cariRows,
    columnStyles: { 0: { cellWidth: contentWidth * 0.68 }, 1: { halign: 'right' } },
  });
  const boxY = lastY() + 3;
  const [br, bg, bb]: [number, number, number] = m.bakiye > 0 ? [254, 249, 195] : m.bakiye < 0 ? [219, 234, 254] : [220, 252, 231];
  doc.setFillColor(br, bg, bb);
  doc.roundedRect(margin, boxY, contentWidth, 11, 2, 2, 'F');
  doc.setTextColor(...SLATE);
  doc.setFont(font, 'bold');
  doc.setFontSize(10);
  doc.text(m.cariSonuc, margin + 4, boxY + 7);
  doc.text(m.cariTutar, pageWidth - margin - 4, boxY + 7, { align: 'right' });

  // 5) İmza alanı
  let signY = boxY + 22;
  if (signY + 18 > pageHeight - margin) {
    doc.addPage();
    signY = margin + 20;
  }
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.2);
  const half = contentWidth / 2;
  [['Biz', margin], ['Ortak', margin + half + 4]].forEach(([label, x]) => {
    doc.line(x as number, signY, (x as number) + half - 8, signY);
    doc.setFont(font, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`${label} — ad soyad / imza`, x as number, signY + 4.5);
  });

  // Sayfa numaraları
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont(font, 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`Sayfa ${i} / ${pages}`, pageWidth - margin, pageHeight - 6, { align: 'right' });
    doc.text(`${ORTAK_ARAC_PLAKA} · ${ortakAracAyEtiketi(m.period)}`, margin, pageHeight - 6);
  }

  return { doc, filename: m.filename };
}

export function generateOrtakAracPDF(fisler: OrtakAracFis[], period: string) {
  const { doc, filename } = buildOrtakAracPdf(fisler, period);
  downloadOrSavePDF(doc, filename);
}
