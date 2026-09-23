import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CariAccount, CariTransaction, Quote, Order, User } from '../types';
import { ROBOTO_REGULAR_BASE64, ROBOTO_BOLD_BASE64 } from './embeddedFonts';
import { getCompanySettings } from '../lib/companySettings';

// Helper to format Turkish currency
export function formatTRY(amount: number): string {
  return (amount || 0).toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' ₺';
}

// Convert Turkish special characters as a safe fallback
export function cleanTurkishText(text: string): string {
  if (!text) return '';
  return text
    .replace(/ğ/g, 'g')
    .replace(/Ğ/g, 'G')
    .replace(/ü/g, 'u')
    .replace(/Ü/g, 'U')
    .replace(/ş/g, 's')
    .replace(/Ş/g, 'S')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'I')
    .replace(/ö/g, 'o')
    .replace(/Ö/g, 'O')
    .replace(/ç/g, 'c')
    .replace(/Ç/g, 'C');
}

/**
 * Initializes and embeds Turkish UTF-8 compliant TrueType fonts into the jsPDF instance with 0 network latency.
 */
export function setupTurkishFont(doc: jsPDF): string {
  try {
    if (!doc.existsFileInVFS('Roboto-Regular.ttf')) {
      doc.addFileToVFS('Roboto-Regular.ttf', ROBOTO_REGULAR_BASE64);
      doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    }

    if (!doc.existsFileInVFS('Roboto-Bold.ttf')) {
      doc.addFileToVFS('Roboto-Bold.ttf', ROBOTO_BOLD_BASE64);
      doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
    }

    doc.setFont('Roboto', 'normal');
    return 'Roboto';
  } catch (e) {
    console.warn('Embedded Turkish font registration error, using standard fallback:', e);
    doc.setFont('helvetica', 'normal');
    return 'helvetica';
  }
}

/**
 * Robust helper to trigger PDF download or open in a new tab if direct save is restricted
 */
export function downloadOrSavePDF(doc: jsPDF, filename: string) {
  try {
    doc.save(filename);
  } catch (saveErr) {
    console.warn('doc.save() failed, attempting Blob download fallback:', saveErr);
    try {
      const blob = doc.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (document.body.contains(link)) document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }, 2500);
    } catch (blobErr) {
      console.error('All PDF download methods failed:', blobErr);
    }
  }
}

/**
 * Layout configuration calculated dynamically based on row count and page content
 */
export interface PDFLayoutConfig {
  margin: number;
  contentWidth: number;
  pageWidth: number;
  pageHeight: number;
  bannerHeight: number;
  infoBoxHeight: number;
  tableFontSize: number;
  tableCellPaddingV: number;
  tableCellPaddingH: number;
  minCellHeight: number;
  totalsBoxWidth: number;
  totalsBoxHeight: number;
  signBoxHeight: number;
  notesBoxHeight: number;
  isCompact: boolean;
  isMultiPage: boolean;
}

/**
 * Calculates optimized document margins, cell padding, and row heights
 * to prevent unnecessary page overflows and keep single-page documents perfectly formatted.
 */
export function calculateDynamicPDFLayout(
  itemCount: number,
  options: {
    orientation?: 'portrait' | 'landscape';
    hasNotes?: boolean;
    hasSignatures?: boolean;
  } = {}
): PDFLayoutConfig {
  const isLandscape = options.orientation === 'landscape';
  const pageWidth = isLandscape ? 297 : 210;
  const pageHeight = isLandscape ? 210 : 297;

  let margin = 12;
  let isCompact = false;
  let isMultiPage = false;
  let bannerHeight = 24;
  let infoBoxHeight = 28;
  let tableFontSize = 7.5;
  let tableCellPaddingV = 2.2;
  let minCellHeight = 6;
  let totalsBoxHeight = 24;
  let signBoxHeight = 20;
  let notesBoxHeight = 24;

  if (isLandscape) {
    margin = 10;
    tableFontSize = 7.0;
    tableCellPaddingV = 1.9;
    minCellHeight = 5.5;
  } else {
    if (itemCount <= 4) {
      // Spacious single-page
      margin = 13;
      bannerHeight = 25;
      infoBoxHeight = 30;
      tableFontSize = 8.0;
      tableCellPaddingV = 2.8;
      minCellHeight = 7.2;
    } else if (itemCount <= 8) {
      // Standard balanced single-page
      margin = 12;
      bannerHeight = 24;
      infoBoxHeight = 28;
      tableFontSize = 7.5;
      tableCellPaddingV = 2.2;
      minCellHeight = 6.2;
    } else if (itemCount <= 14) {
      // Dynamic compact single-page (keeps table + totals + notes + signatures on 1 page without overflow)
      margin = 9.5;
      isCompact = true;
      bannerHeight = 21;
      infoBoxHeight = 25;
      tableFontSize = 7.0;
      tableCellPaddingV = 1.6;
      minCellHeight = 5.0;
      totalsBoxHeight = 20;
      signBoxHeight = 16;
      notesBoxHeight = 20;
    } else {
      // Multi-page document with repeating running headers
      margin = 10;
      isMultiPage = true;
      bannerHeight = 22;
      infoBoxHeight = 26;
      tableFontSize = 7.2;
      tableCellPaddingV = 2.0;
      minCellHeight = 5.8;
    }
  }

  const contentWidth = pageWidth - margin * 2;

  return {
    margin,
    contentWidth,
    pageWidth,
    pageHeight,
    bannerHeight,
    infoBoxHeight,
    tableFontSize,
    tableCellPaddingV,
    tableCellPaddingH: 2.5,
    minCellHeight,
    totalsBoxWidth: isCompact ? 72 : 78,
    totalsBoxHeight,
    signBoxHeight,
    notesBoxHeight,
    isCompact,
    isMultiPage,
  };
}

/**
 * Generates a full-width, professionally formatted A4 PDF Statement for a Cari Account.
 */
export async function generateCariStatementPDF(
  cari: CariAccount,
  transactions: CariTransaction[],
  dateRange?: { startDate?: string; endDate?: string }
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const fontName = setupTurkishFont(doc);
  const layout = calculateDynamicPDFLayout(transactions.length, {
    orientation: 'portrait',
    hasSignatures: true,
  });

  const { margin, contentWidth, pageWidth, pageHeight } = layout;

  // 1. Header Banner / Company Info
  doc.setFillColor(24, 30, 42); // Deep Navy Slate #181E2A
  doc.roundedRect(margin, margin, contentWidth, layout.bannerHeight, 2, 2, 'F');

  // Company Name & Subtitle
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont(fontName, 'bold');
  doc.text('ALPHA TEKNİK DOĞALGAZ & TESİSAT', margin + 6, margin + 7.5);

  doc.setFontSize(7.5);
  doc.setFont(fontName, 'normal');
  const company = getCompanySettings();
  doc.setTextColor(190, 205, 225);
  doc.text(`${company.address} ${company.district} / ${company.city}`, margin + 6, margin + 13.5);
  doc.text(`Tel: ${company.phone} | ${company.email} | ${company.taxOffice} ${company.taxNumber}`, margin + 6, margin + 18.5);

  // Right Header Document Badge
  doc.setFillColor(37, 99, 235); // Blue Accent
  doc.roundedRect(pageWidth - margin - 54, margin + 3.5, 48, 15, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont(fontName, 'bold');
  doc.text('CARİ HESAP EKSTRESİ', pageWidth - margin - 30, margin + 9.5, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont(fontName, 'normal');
  doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, pageWidth - margin - 30, margin + 15, { align: 'center' });

  // 2. Cari Information & Balance Summary Boxes (Side by Side)
  const boxTop = margin + layout.bannerHeight + 4;
  const boxHeight = layout.infoBoxHeight;
  const cariBoxWidth = contentWidth * 0.60;
  const balanceBoxWidth = contentWidth * 0.38;
  const balanceBoxLeft = margin + cariBoxWidth + (contentWidth * 0.02);

  // Left Box: Cari Details
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, boxTop, cariBoxWidth, boxHeight, 2, 2, 'FD');

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(8.5);
  doc.setFont(fontName, 'bold');
  const companyTitle = (cari.companyName || '').substring(0, 48);
  doc.text(companyTitle, margin + 4, boxTop + 5.5);

  doc.setFontSize(7.5);
  doc.setFont(fontName, 'normal');
  doc.setTextColor(71, 85, 105);
  const typeText = cari.type === 'dealer' ? 'Bayi' : cari.type === 'supplier' ? 'Tedarikçi' : 'Müşteri';
  doc.text(`Cari Kodu: ${cari.code}  |  Tür: ${typeText}`, margin + 4, boxTop + 11);
  doc.text(`Yetkili: ${cari.name || '-'}  |  Tel: ${cari.phone || '-'}`, margin + 4, boxTop + 15.5);
  doc.text(`Vergi D./No: ${cari.taxOffice || '-'} ${cari.taxNumber || '-'}`, margin + 4, boxTop + 20);
  const addressText = `${cari.city || '-'}${cari.address ? ` (${cari.address.substring(0, 30)})` : ''}`;
  doc.text(`Şehir / Adres: ${addressText}`, margin + 4, boxTop + 24.5);

  // Right Box: Net Balance & Financial Status
  const isDebtor = cari.balance > 0;
  const isCreditor = cari.balance < 0;

  if (isDebtor) {
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(254, 202, 202);
  } else if (isCreditor) {
    doc.setFillColor(239, 246, 255);
    doc.setDrawColor(191, 219, 254);
  } else {
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(187, 247, 208);
  }
  doc.roundedRect(balanceBoxLeft, boxTop, balanceBoxWidth, boxHeight, 2, 2, 'FD');

  doc.setFontSize(7.5);
  doc.setFont(fontName, 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('GÜNCEL NET BAKİYE DURUMU', balanceBoxLeft + 4, boxTop + 5.5);

  doc.setFontSize(11.5);
  doc.setFont(fontName, 'bold');
  if (isDebtor) {
    doc.setTextColor(220, 38, 38);
    doc.text(`+${formatTRY(cari.balance)}`, balanceBoxLeft + 4, boxTop + 13);
    doc.setFontSize(7);
    doc.text('(BORÇLU / ALACAĞIMIZ)', balanceBoxLeft + 4, boxTop + 17.5);
  } else if (isCreditor) {
    doc.setTextColor(37, 99, 235);
    doc.text(`-${formatTRY(Math.abs(cari.balance))}`, balanceBoxLeft + 4, boxTop + 13);
    doc.setFontSize(7);
    doc.text('(ALACAKLI / BORCUMUZ)', balanceBoxLeft + 4, boxTop + 17.5);
  } else {
    doc.setTextColor(22, 163, 74);
    doc.text('0,00 ₺', balanceBoxLeft + 4, boxTop + 13);
    doc.setFontSize(7);
    doc.text('(HESAP KAPALI / MUTABIK)', balanceBoxLeft + 4, boxTop + 17.5);
  }

  doc.setFontSize(6.8);
  doc.setFont(fontName, 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Kredi Limiti: ${formatTRY(cari.creditLimit)} | Vade: ${cari.paymentTermDays} Gün`, balanceBoxLeft + 4, boxTop + 24);

  // 3. Mini KPI Row
  const kpiTop = boxTop + boxHeight + 3.5;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, kpiTop, contentWidth, 7.5, 1.5, 1.5, 'F');

  doc.setFontSize(7.2);
  doc.setFont(fontName, 'bold');
  doc.setTextColor(220, 38, 38);
  doc.text(`Toplam Borç: ${formatTRY(cari.totalDebit)}`, margin + 5, kpiTop + 5);

  doc.setTextColor(22, 163, 74);
  doc.text(`Toplam Tahsilat: ${formatTRY(cari.totalCredit)}`, margin + (contentWidth / 3) + 5, kpiTop + 5);

  doc.setTextColor(30, 41, 59);
  doc.text(`Hareket: ${transactions.length} Kayıt`, margin + ((contentWidth / 3) * 2) + 5, kpiTop + 5);

  // 4. Calculate Chronological Running Balances
  const chronological = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let currentBal = 0;
  const tableData = chronological.map(t => {
    if (t.direction === 'debit') {
      currentBal += t.amount;
    } else {
      currentBal -= t.amount;
    }

    const typeLabel = 
      t.type === 'sale_invoice' ? 'Satış Fat.' :
      t.type === 'payment_received' ? 'Tahsilat' :
      t.type === 'opening_balance' ? 'Devir/Açılış' :
      t.type === 'payment_made' ? 'Ödeme' :
      t.type === 'supplier_invoice' ? 'Alış Fat.' : 'Mahsup/İade';

    return [
      t.date,
      t.documentNo || '-',
      typeLabel,
      t.paymentMethod || 'Cari Hesap',
      t.description || '',
      t.direction === 'debit' ? formatTRY(t.amount) : '-',
      t.direction === 'credit' ? formatTRY(t.amount) : '-',
      formatTRY(currentBal),
    ];
  });

  // 5. Generate Ledger Table with AutoTable & Dynamic Page Layout
  autoTable(doc, {
    startY: kpiTop + 10,
    margin: { left: margin, right: margin, bottom: 26 },
    head: [[
      'Tarih',
      'Belge No',
      'İşlem Türü',
      'Ödeme Kanalı',
      'Açıklama',
      'Borç (+)',
      'Tahsilat / Alacak (-)',
      'Yürüyen Bakiye',
    ]],
    body: tableData.length > 0 ? tableData : [['-', '-', '-', '-', 'Kayıtlı hareket bulunamadı.', '-', '-', '-']],
    theme: 'striped',
    showHead: 'everyPage',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      font: fontName,
      fontStyle: 'bold',
      fontSize: layout.tableFontSize,
      halign: 'left',
      cellPadding: layout.tableCellPaddingV,
    },
    styles: {
      font: fontName,
      fontSize: layout.tableFontSize - 0.5,
      cellPadding: layout.tableCellPaddingV,
      minCellHeight: layout.minCellHeight,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
      overflow: 'linebreak',
    },
    columnStyles: {
      0: { cellWidth: 17 },
      1: { cellWidth: 19 },
      2: { cellWidth: 17 },
      3: { cellWidth: 19 },
      4: { cellWidth: 'auto' },
      5: { cellWidth: 23, halign: 'right', fontStyle: 'bold', textColor: [220, 38, 38] },
      6: { cellWidth: 23, halign: 'right', fontStyle: 'bold', textColor: [22, 163, 74] },
      7: { cellWidth: 25, halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didDrawPage: (data) => {
      doc.setFontSize(7);
      doc.setFont(fontName, 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text('Bu belge Alpha Teknik Doğalgaz Otomasyon Sistemi tarafından oluşturulmuştur.', margin, pageHeight - 6);
      doc.text(`Sayfa ${data.pageNumber}`, pageWidth - margin - 15, pageHeight - 6);
    },
  });

  // 6. Signatures and Stamp Block with Dynamic Page Break Handling
  const finalY = (doc as any).lastAutoTable?.finalY || 200;
  const requiredSignSpace = layout.signBoxHeight + 10;

  if (finalY + requiredSignSpace > pageHeight - margin - 4) {
    doc.addPage();
    drawSignatureBlock(doc, fontName, margin, contentWidth, margin + 8, layout.signBoxHeight);
  } else {
    drawSignatureBlock(doc, fontName, margin, contentWidth, finalY + 5, layout.signBoxHeight);
  }

  // Save the PDF
  const filename = `Cari_Ekstre_${cari.code}_${new Date().toISOString().split('T')[0]}.pdf`;
  downloadOrSavePDF(doc, filename);
  return doc;
}

export function drawSignatureBlock(
  doc: jsPDF,
  fontName: string,
  margin: number,
  contentWidth: number,
  startY: number,
  boxHeight: number = 18
) {
  const colWidth = (contentWidth - 8) / 2;

  // Company Signature Box
  doc.setDrawColor(203, 213, 225);
  doc.setLineDashPattern([1, 1], 0);
  doc.roundedRect(margin, startY, colWidth, boxHeight, 1.5, 1.5, 'D');

  doc.setFontSize(7.5);
  doc.setFont(fontName, 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('DÜZENLEYEN / ŞİRKET YETKİLİSİ', margin + (colWidth / 2), startY + 4.5, { align: 'center' });
  doc.setFontSize(6.5);
  doc.setFont(fontName, 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('ALPHA Teknik Doğalgaz & Tesisat', margin + (colWidth / 2), startY + 8.5, { align: 'center' });
  doc.text('Kaşe ve İmza', margin + (colWidth / 2), startY + boxHeight - 2.5, { align: 'center' });

  // Customer Signature Box
  const customerX = margin + colWidth + 8;
  doc.roundedRect(customerX, startY, colWidth, boxHeight, 1.5, 1.5, 'D');

  doc.setFontSize(7.5);
  doc.setFont(fontName, 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('MUTABIK KALAN / HESAP SAHİBİ', customerX + (colWidth / 2), startY + 4.5, { align: 'center' });
  doc.setFontSize(6.5);
  doc.setFont(fontName, 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Yetkili İmza & Kaşe', customerX + (colWidth / 2), startY + boxHeight - 2.5, { align: 'center' });

  doc.setLineDashPattern([], 0);
}

/**
 * Generates an All-Cariler General Balance & Risk Report PDF
 */
export async function generateAllCarilerPDF(cariler: CariAccount[], summary?: any) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const fontName = setupTurkishFont(doc);
  const layout = calculateDynamicPDFLayout(cariler.length, {
    orientation: 'landscape',
  });

  const { margin, contentWidth, pageWidth, pageHeight } = layout;

  // Header Banner
  doc.setFillColor(24, 30, 42);
  doc.roundedRect(margin, margin, contentWidth, 18, 2, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12.5);
  doc.setFont(fontName, 'bold');
  doc.text('ALPHA TEKNİK DOĞALGAZ & TESİSAT - GENEL CARİ & RİSK RAPORU', margin + 6, margin + 7.5);

  doc.setFontSize(7.5);
  doc.setFont(fontName, 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR')} | Toplam ${cariler.length} Cari Kart`, margin + 6, margin + 13.5);

  // Summary Metrics Banner
  const totalDebit = summary?.totalReceivables ?? cariler.reduce((sum, c) => sum + (c.balance > 0 ? c.balance : 0), 0);
  const totalCredit = summary?.totalPayables ?? cariler.reduce((sum, c) => sum + (c.balance < 0 ? Math.abs(c.balance) : 0), 0);

  const kpiY = margin + 21;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, kpiY, contentWidth, 9, 1.5, 1.5, 'F');

  doc.setFontSize(7.5);
  doc.setFont(fontName, 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`Toplam Cari: ${cariler.length} Adet`, margin + 6, kpiY + 6);
  doc.setTextColor(220, 38, 38);
  doc.text(`Toplam Müşteri Alacağı: ${totalDebit.toLocaleString('tr-TR')} ₺`, margin + 60, kpiY + 6);
  doc.setTextColor(234, 88, 12);
  doc.text(`Toplam Tedarikçi Borcu: ${totalCredit.toLocaleString('tr-TR')} ₺`, margin + 160, kpiY + 6);

  // Table Data
  const tableData = cariler.map(c => {
    const isDebtor = c.balance > 0;
    const isCreditor = c.balance < 0;
    const balanceStr = isDebtor ? `+${formatTRY(c.balance)}` : isCreditor ? `-${formatTRY(Math.abs(c.balance))}` : '0,00 ₺';
    const statusText = isDebtor ? 'Borçlu' : isCreditor ? 'Alacaklı' : 'Sıfır';

    return [
      c.code,
      (c.companyName || '').substring(0, 35),
      (c.name || '').substring(0, 20),
      c.type === 'dealer' ? 'Bayi' : c.type === 'supplier' ? 'Tedarikçi' : 'Müşteri',
      c.phone || '-',
      c.city || '-',
      formatTRY(c.creditLimit),
      formatTRY(c.totalDebit),
      formatTRY(c.totalCredit),
      balanceStr,
      statusText,
    ];
  });

  autoTable(doc, {
    startY: kpiY + 12,
    margin: { left: margin, right: margin, bottom: 12 },
    head: [[
      'Cari Kod',
      'Firma Ünvanı',
      'Yetkili',
      'Tür',
      'Telefon',
      'Şehir',
      'Kredi Limit',
      'Toplam Borç',
      'Toplam Tahsilat',
      'Net Bakiye',
      'Durum',
    ]],
    body: tableData,
    theme: 'striped',
    showHead: 'everyPage',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      font: fontName,
      fontSize: 7.2,
      fontStyle: 'bold',
      cellPadding: layout.tableCellPaddingV,
    },
    styles: {
      font: fontName,
      fontSize: 6.8,
      cellPadding: layout.tableCellPaddingV,
      minCellHeight: layout.minCellHeight,
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 48 },
      2: { cellWidth: 28 },
      3: { cellWidth: 18 },
      4: { cellWidth: 24 },
      5: { cellWidth: 20 },
      6: { cellWidth: 22, halign: 'right' },
      7: { cellWidth: 24, halign: 'right', textColor: [220, 38, 38] },
      8: { cellWidth: 24, halign: 'right', textColor: [22, 163, 74] },
      9: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
      10: { cellWidth: 17, halign: 'center' },
    },
    didDrawPage: (data) => {
      doc.setFontSize(7);
      doc.setFont(fontName, 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(`Alpha Teknik Finans Raporu - Sayfa ${data.pageNumber}`, pageWidth - margin - 35, pageHeight - 5);
    },
  });

  const filename = `Genel_Cari_Risk_Raporu_${new Date().toISOString().split('T')[0]}.pdf`;
  downloadOrSavePDF(doc, filename);
  return doc;
}

/**
 * Generates an Official A4 Proforma Quotation PDF Document
 */
export async function generateQuotePDF(quote: Quote) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const fontName = setupTurkishFont(doc);

  const itemCount = (quote.offeredItems?.length || quote.requestedItems?.length || 1);
  const layout = calculateDynamicPDFLayout(itemCount, {
    orientation: 'portrait',
    hasNotes: true,
    hasSignatures: true,
  });

  const { margin, contentWidth, pageWidth, pageHeight } = layout;

  // 1. Header Banner
  doc.setFillColor(30, 41, 59); // Deep Slate
  doc.roundedRect(margin, margin, contentWidth, layout.bannerHeight, 2, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont(fontName, 'bold');
  doc.text('ALPHA TEKNİK DOĞALGAZ & TESİSAT', margin + 6, margin + 7.5);

  doc.setFontSize(7.5);
  doc.setFont(fontName, 'normal');
  const company = getCompanySettings();
  doc.setTextColor(203, 213, 225);
  doc.text(`${company.address} ${company.district} / ${company.city}`, margin + 6, margin + 13.5);
  doc.text(`Tel: ${company.phone} | ${company.email} | ${company.taxOffice} ${company.taxNumber}`, margin + 6, margin + 18.5);

  // Right Quote Badge
  doc.setFillColor(16, 185, 129); // Emerald Green Accent
  doc.roundedRect(pageWidth - margin - 52, margin + 3.5, 46, 15, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont(fontName, 'bold');
  doc.text('RESMİ FİYAT TEKLİFİ', pageWidth - margin - 29, margin + 9.5, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont(fontName, 'normal');
  doc.text(`No: ${quote.quoteNumber}`, pageWidth - margin - 29, margin + 15, { align: 'center' });

  // 2. Info Cards (Customer & Document Info)
  const infoTop = margin + layout.bannerHeight + 4;
  const colWidth = (contentWidth - 6) / 2;
  const infoBoxH = layout.infoBoxHeight;

  // Customer Box (Left)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, infoTop, colWidth, infoBoxH, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont(fontName, 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('MÜŞTERİ / FİRMA BİLGİLERİ', margin + 4, infoTop + 5.5);

  doc.setFontSize(7.5);
  doc.setFont(fontName, 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Firma / Ünvan: ${(quote.customerCompany || quote.customerName || '').substring(0, 36)}`, margin + 4, infoTop + 11);
  doc.text(`İlgili Kişi: ${(quote.customerName || '').substring(0, 36)}`, margin + 4, infoTop + 15.5);
  doc.text(`Telefon: ${quote.customerPhone}  |  E-posta: ${quote.customerEmail}`, margin + 4, infoTop + 20);
  doc.text(`Teslimat İli: ${quote.deliveryCity || 'Belirtilmedi'}`, margin + 4, infoTop + 24.5);

  // Quote Metadata Box (Right)
  const rightBoxX = margin + colWidth + 6;
  doc.roundedRect(rightBoxX, infoTop, colWidth, infoBoxH, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont(fontName, 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('TEKLİF DETAYLARI & GEÇERLİLİK', rightBoxX + 4, infoTop + 5.5);

  doc.setFontSize(7.5);
  doc.setFont(fontName, 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Teklif Tarihi: ${new Date(quote.createdAt).toLocaleDateString('tr-TR')}`, rightBoxX + 4, infoTop + 11.5);
  const validUntilStr = quote.validUntil ? new Date(quote.validUntil).toLocaleDateString('tr-TR') : '15 Gün Geçerlidir';
  doc.text(`Geçerlilik Tarihi: ${validUntilStr}`, rightBoxX + 4, infoTop + 17);
  const statusStr = quote.status === 'accepted' ? 'Onaylandı' : quote.status === 'offer_sent' ? 'Teklif Sunuldu' : quote.status === 'rejected' ? 'Reddedildi' : 'Değerlendirmede';
  doc.text(`Teklif Durumu: ${statusStr}`, rightBoxX + 4, infoTop + 22.5);

  // 3. Items Table
  let itemsData: any[] = [];
  if (quote.offeredItems && quote.offeredItems.length > 0) {
    itemsData = quote.offeredItems.map((item, idx) => {
      return [
        idx + 1,
        item.productName,
        `${item.quantity} ${item.unit}`,
        formatTRY(item.offeredUnitPrice),
        item.discountRate > 0 ? `%${item.discountRate}` : '-',
        formatTRY(item.totalPrice),
      ];
    });
  } else {
    itemsData = (quote.requestedItems || []).map((item, idx) => {
      const price = item.targetUnitPrice ? formatTRY(item.targetUnitPrice) : 'Belirleniyor';
      return [
        idx + 1,
        item.productName,
        `${item.requestedQuantity} ${item.unit}`,
        price,
        '-',
        item.targetUnitPrice ? formatTRY(item.targetUnitPrice * item.requestedQuantity) : 'Fiyat Bekleniyor',
      ];
    });
  }

  autoTable(doc, {
    startY: infoTop + infoBoxH + 4,
    margin: { left: margin, right: margin, bottom: 28 },
    head: [[
      'Sıra',
      'Ürün / Malzeme Açıklaması',
      'Miktar',
      'Birim Fiyat',
      'İskonto',
      'Toplam Tutar',
    ]],
    body: itemsData,
    theme: 'striped',
    showHead: 'everyPage',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      font: fontName,
      fontSize: layout.tableFontSize,
      fontStyle: 'bold',
      cellPadding: layout.tableCellPaddingV,
    },
    styles: {
      font: fontName,
      fontSize: layout.tableFontSize - 0.5,
      cellPadding: layout.tableCellPaddingV,
      minCellHeight: layout.minCellHeight,
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
      overflow: 'linebreak',
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 24, halign: 'center' },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 18, halign: 'center' },
      5: { cellWidth: 32, halign: 'right', fontStyle: 'bold' },
    },
    didDrawPage: (data) => {
      doc.setFontSize(7);
      doc.setFont(fontName, 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text('Alpha Teknik Doğalgaz & Tesisat - Proforma Teklif Belgesi', margin, pageHeight - 6);
      doc.text(`Sayfa ${data.pageNumber}`, pageWidth - margin - 15, pageHeight - 6);
    },
  });

  // 4. Totals Block & Commercial Notes Block (Placed dynamically side-by-side or on next page)
  let finalY = (doc as any).lastAutoTable?.finalY || 160;
  const totalsBoxWidth = layout.totalsBoxWidth;
  const totalsBoxX = pageWidth - margin - totalsBoxWidth;
  const totalAndNotesHeight = layout.notesBoxHeight;
  const requiredBottomSpace = totalAndNotesHeight + layout.signBoxHeight + 10;

  // Check if totals & signatures fit on the current page
  if (finalY + requiredBottomSpace > pageHeight - margin - 4) {
    doc.addPage();
    finalY = margin + 4;
  }

  const totalsTop = finalY + 4;
  const subtotal = quote.subtotal || quote.grandTotal || 0;
  const taxAmount = quote.taxAmount || (subtotal * (quote.taxRate || 20) / 100);
  const grandTotal = quote.grandTotal || (subtotal + taxAmount);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(totalsBoxX, totalsTop, totalsBoxWidth, layout.totalsBoxHeight, 1.5, 1.5, 'FD');

  doc.setFontSize(7.2);
  doc.setFont(fontName, 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Ara Toplam:', totalsBoxX + 4, totalsTop + 5);
  doc.text(formatTRY(subtotal), totalsBoxX + totalsBoxWidth - 4, totalsTop + 5, { align: 'right' });

  doc.text(`KDV (%${quote.taxRate || 20}):`, totalsBoxX + 4, totalsTop + 9.5);
  doc.text(formatTRY(taxAmount), totalsBoxX + totalsBoxWidth - 4, totalsTop + 9.5, { align: 'right' });

  const grandTotalH = layout.isCompact ? 6.5 : 7.5;
  const grandTotalY = totalsTop + layout.totalsBoxHeight - grandTotalH - 1.5;
  doc.setFillColor(220, 252, 231);
  doc.roundedRect(totalsBoxX + 2, grandTotalY, totalsBoxWidth - 4, grandTotalH, 1, 1, 'F');
  doc.setFontSize(layout.isCompact ? 7.8 : 8.5);
  doc.setFont(fontName, 'bold');
  doc.setTextColor(22, 101, 52);
  doc.text('GENEL TOPLAM:', totalsBoxX + 4, grandTotalY + grandTotalH - 2);
  doc.text(formatTRY(grandTotal), totalsBoxX + totalsBoxWidth - 4, grandTotalY + grandTotalH - 2, { align: 'right' });

  // 5. Commercial Notes & Bank Info
  const notesWidth = contentWidth - totalsBoxWidth - 5;
  doc.setFillColor(254, 252, 232); // Light yellow note box
  doc.setDrawColor(254, 240, 138);
  doc.roundedRect(margin, totalsTop, notesWidth, layout.notesBoxHeight, 1.5, 1.5, 'FD');

  doc.setFontSize(7.2);
  doc.setFont(fontName, 'bold');
  doc.setTextColor(133, 77, 14);
  doc.text('TİCARİ KOŞULLAR VE NOTLAR:', margin + 4, totalsTop + 5);

  doc.setFontSize(6.5);
  doc.setFont(fontName, 'normal');
  doc.setTextColor(113, 63, 18);
  doc.text('1. Fiyatlarımıza belirtilen KDV oranı dahildir. Ürünler orijinal ambalajında sevk edilir.', margin + 4, totalsTop + 9);
  doc.text('2. Garanti süresi üretici firma standartlarında 2-5 yıl geçerlidir.', margin + 4, totalsTop + 13);
  doc.text('3. Banka: Kuveyt Türk TR84 0020 5000 0987 6543 2100 01 (Alpha Teknik Ltd. Şti.)', margin + 4, totalsTop + 17);
  if (!layout.isCompact) {
    doc.text('4. Teslimat süresi sipariş onayından itibaren 1-3 iş günüdür.', margin + 4, totalsTop + 21);
  }

  // 6. Signatures with Overflow Prevention
  const signY = totalsTop + Math.max(layout.totalsBoxHeight, layout.notesBoxHeight) + 4;
  if (signY + layout.signBoxHeight <= pageHeight - margin - 4) {
    drawSignatureBlock(doc, fontName, margin, contentWidth, signY, layout.signBoxHeight);
  } else {
    doc.addPage();
    drawSignatureBlock(doc, fontName, margin, contentWidth, margin + 6, layout.signBoxHeight);
  }

  const filename = `AlphaTeknik_Teklif_${quote.quoteNumber}.pdf`;
  downloadOrSavePDF(doc, filename);
  return doc;
}

/**
 * Generates an Official Order & Dispatch Note PDF Document
 */
export async function generateOrderPDF(order: Order) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const fontName = setupTurkishFont(doc);

  const itemCount = (order.items?.length || 1);
  const layout = calculateDynamicPDFLayout(itemCount, {
    orientation: 'portrait',
    hasSignatures: true,
  });

  const { margin, contentWidth, pageWidth, pageHeight } = layout;

  // Header Banner
  doc.setFillColor(30, 41, 59);
  doc.roundedRect(margin, margin, contentWidth, layout.bannerHeight, 2, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont(fontName, 'bold');
  doc.text('ALPHA TEKNİK DOĞALGAZ & TESİSAT', margin + 6, margin + 7.5);

  doc.setFontSize(7.5);
  doc.setFont(fontName, 'normal');
  const company = getCompanySettings();
  doc.setTextColor(203, 213, 225);
  doc.text(`${company.address} ${company.district} / ${company.city}`, margin + 6, margin + 13.5);
  doc.text(`Tel: ${company.phone} | ${company.email} | ${company.taxOffice} ${company.taxNumber}`, margin + 6, margin + 18.5);

  // Right Order Badge
  doc.setFillColor(37, 99, 235);
  doc.roundedRect(pageWidth - margin - 52, margin + 3.5, 46, 15, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont(fontName, 'bold');
  doc.text('SİPARİŞ VE SEVKİYAT', pageWidth - margin - 29, margin + 9.5, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont(fontName, 'normal');
  doc.text(`No: ${order.orderNumber}`, pageWidth - margin - 29, margin + 15, { align: 'center' });

  // Info Cards
  const infoTop = margin + layout.bannerHeight + 4;
  const colWidth = (contentWidth - 6) / 2;
  const infoBoxH = layout.infoBoxHeight;

  // Left Customer Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, infoTop, colWidth, infoBoxH, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont(fontName, 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('ALICI & TESLİMAT BİLGİLERİ', margin + 4, infoTop + 5.5);

  doc.setFontSize(7.5);
  doc.setFont(fontName, 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Müşteri: ${(order.customerName || '').substring(0, 36)}`, margin + 4, infoTop + 11);
  doc.text(`Telefon: ${order.customerPhone}  |  E-posta: ${order.customerEmail}`, margin + 4, infoTop + 15.5);
  doc.text(`Adres: ${(order.customerAddress || '-').substring(0, 42)}`, margin + 4, infoTop + 20);

  // Right Order Info Box
  const rightBoxX = margin + colWidth + 6;
  doc.roundedRect(rightBoxX, infoTop, colWidth, infoBoxH, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont(fontName, 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('SİPARİŞ DETAYLARI', rightBoxX + 4, infoTop + 5.5);

  doc.setFontSize(7.5);
  doc.setFont(fontName, 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Sipariş Tarihi: ${new Date(order.createdAt).toLocaleDateString('tr-TR')}`, rightBoxX + 4, infoTop + 11);
  const statusLabel = 
    order.status === 'delivered' ? 'Teslim Edildi' :
    order.status === 'shipped' ? 'Sevkiyatta / Yolda' :
    order.status === 'preparing' ? 'Hazırlanıyor' :
    order.status === 'approved' ? 'Onaylandı' :
    order.status === 'cancelled' ? 'İptal Edildi' : 'Beklemede';
  doc.text(`Durum: ${statusLabel}`, rightBoxX + 4, infoTop + 15.5);
  doc.text(`Sevkiyat / Takip No: ${order.trackingNumber || 'Alpha Teknik Dağıtım Aracı'}`, rightBoxX + 4, infoTop + 20);

  // Items Table
  const itemsData = (order.items || []).map((item, idx) => [
    idx + 1,
    item.productName,
    `${item.quantity} ${item.unit || 'Adet'}`,
    formatTRY(item.unitPrice),
    formatTRY(item.totalPrice || item.quantity * item.unitPrice),
  ]);

  autoTable(doc, {
    startY: infoTop + infoBoxH + 4,
    margin: { left: margin, right: margin, bottom: 26 },
    head: [[
      'Sıra',
      'Ürün / Malzeme Adı',
      'Miktar',
      'Birim Fiyat',
      'Toplam Tutar',
    ]],
    body: itemsData,
    theme: 'striped',
    showHead: 'everyPage',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      font: fontName,
      fontSize: layout.tableFontSize,
      fontStyle: 'bold',
      cellPadding: layout.tableCellPaddingV,
    },
    styles: {
      font: fontName,
      fontSize: layout.tableFontSize - 0.5,
      cellPadding: layout.tableCellPaddingV,
      minCellHeight: layout.minCellHeight,
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
      overflow: 'linebreak',
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 28, halign: 'center' },
      3: { cellWidth: 32, halign: 'right' },
      4: { cellWidth: 36, halign: 'right', fontStyle: 'bold' },
    },
    didDrawPage: (data) => {
      doc.setFontSize(7);
      doc.setFont(fontName, 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text('Alpha Teknik Doğalgaz & Tesisat - Sipariş & Sevkiyat Belgesi', margin, pageHeight - 6);
      doc.text(`Sayfa ${data.pageNumber}`, pageWidth - margin - 15, pageHeight - 6);
    },
  });

  // Totals & Signature
  let finalY = (doc as any).lastAutoTable?.finalY || 160;
  const totalsBoxHeight = 12;
  const requiredOrderBottomSpace = totalsBoxHeight + layout.signBoxHeight + 8;

  if (finalY + requiredOrderBottomSpace > pageHeight - margin - 4) {
    doc.addPage();
    finalY = margin + 4;
  }

  const totalsTop = finalY + 4;

  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(pageWidth - margin - 72, totalsTop, 72, totalsBoxHeight, 1.5, 1.5, 'FD');

  doc.setFontSize(8.5);
  doc.setFont(fontName, 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('SİPARİŞ TOPLAMI:', pageWidth - margin - 68, totalsTop + 8);
  doc.text(formatTRY(order.total), pageWidth - margin - 4, totalsTop + 8, { align: 'right' });

  const signY = totalsTop + totalsBoxHeight + 5;
  if (signY + layout.signBoxHeight <= pageHeight - margin - 4) {
    drawSignatureBlock(doc, fontName, margin, contentWidth, signY, layout.signBoxHeight);
  } else {
    doc.addPage();
    drawSignatureBlock(doc, fontName, margin, contentWidth, margin + 6, layout.signBoxHeight);
  }

  const filename = `AlphaTeknik_Siparis_${order.orderNumber}.pdf`;
  downloadOrSavePDF(doc, filename);
  return doc;
}

/**
 * Generates Customer Account & Financial Statement PDF for Customer Portal
 */
export async function generateCustomerFinancialPDF(user: User, orders: Order[]) {
  const totalPurchases = (orders || []).reduce((sum, o) => sum + (o.status !== 'cancelled' ? o.total : 0), 0);
  const currentBalance = totalPurchases;

  const cariProxy: CariAccount = {
    id: user.id || 'CUST',
    code: 'CR-' + (user.id ? user.id.slice(0, 6).toUpperCase() : '842910'),
    companyName: user.companyName || user.name || 'Müşteri',
    name: user.name,
    type: user.isDealer ? 'dealer' : 'customer',
    phone: user.phone || '-',
    email: user.email,
    city: user.city || '-',
    address: user.address || '-',
    taxNumber: user.taxNumber || '-',
    taxOffice: user.taxOffice || '-',
    creditLimit: 350000,
    balance: currentBalance,
    totalDebit: totalPurchases,
    totalCredit: 0,
    paymentTermDays: 30,
    status: 'active',
    createdAt: user.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const transactions: CariTransaction[] = (orders || []).map((ord, idx) => ({
    id: ord.id || `TX-${idx}`,
    cariId: cariProxy.id,
    type: 'sale_invoice',
    date: ord.createdAt.split('T')[0],
    documentNo: ord.orderNumber,
    description: `Sipariş Faturası (${ord.items.length} Kalem)`,
    amount: ord.total,
    direction: 'debit',
    paymentMethod: 'Cari Hesap',
    createdAt: ord.createdAt,
    createdBy: 'Sistem',
  }));

  return generateCariStatementPDF(cariProxy, transactions);
}

/**
 * Generates an Excel Spreadsheet for Cari Account Statement
 */
export function generateCariStatementExcel(
  cari: CariAccount,
  transactions: CariTransaction[]
) {
  const chronological = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let running = 0;
  const rowsHtml = chronological.map(t => {
    if (t.direction === 'debit') running += t.amount;
    else running -= t.amount;

    const debitStr = t.direction === 'debit' ? t.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '0,00';
    const creditStr = t.direction === 'credit' ? t.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '0,00';
    const balStr = running.toLocaleString('tr-TR', { minimumFractionDigits: 2 });

    return `
      <tr>
        <td style="border: 1px solid #ddd; padding: 6px; font-family: monospace;">${t.date}</td>
        <td style="border: 1px solid #ddd; padding: 6px; font-family: monospace;">${t.documentNo || '-'}</td>
        <td style="border: 1px solid #ddd; padding: 6px;">${t.type === 'sale_invoice' ? 'Satış Faturası' : t.type === 'payment_received' ? 'Tahsilat' : t.type === 'opening_balance' ? 'Devir Bakiyesi' : 'Diğer'}</td>
        <td style="border: 1px solid #ddd; padding: 6px;">${t.paymentMethod || 'Cari Hesap'}</td>
        <td style="border: 1px solid #ddd; padding: 6px;">${(t.description || '').replace(/</g, '&lt;')}</td>
        <td style="border: 1px solid #ddd; padding: 6px; text-align: right; color: #dc2626; font-weight: bold;">${debitStr} ₺</td>
        <td style="border: 1px solid #ddd; padding: 6px; text-align: right; color: #16a34a; font-weight: bold;">${creditStr} ₺</td>
        <td style="border: 1px solid #ddd; padding: 6px; text-align: right; font-weight: bold;">${balStr} ₺</td>
      </tr>
    `;
  }).join('');

  const excelTemplate = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
      <style>
        body { font-family: Arial, sans-serif; font-size: 11px; }
        .header-title { font-size: 16px; font-weight: bold; color: #1e293b; }
        .header-sub { font-size: 10px; color: #64748b; }
        .th-cell { background-color: #1e293b; color: #ffffff; font-weight: bold; border: 1px solid #0f172a; padding: 8px; }
      </style>
    </head>
    <body>
      <table>
        <tr>
          <td colspan="8" class="header-title">ALPHA TEKNİK DOĞALGAZ & TESİSAT - CARİ HESAP EKSTRESİ</td>
        </tr>
        <tr>
          <td colspan="8" class="header-sub">Batıkent Mah. Beyazıt Bulvarı No:32/1 Karaköprü / Şanlıurfa | Tel: +90 544 440 91 80</td>
        </tr>
        <tr><td colspan="8"></td></tr>
        <tr style="background-color: #f1f5f9; font-weight: bold;">
          <td colspan="2">Cari Kodu: ${cari.code}</td>
          <td colspan="4">Firma: ${cari.companyName}</td>
          <td colspan="2" style="text-align: right;">Tarih: ${new Date().toLocaleDateString('tr-TR')}</td>
        </tr>
        <tr style="background-color: #f8fafc;">
          <td colspan="2">Yetkili: ${cari.name}</td>
          <td colspan="2">Telefon: ${cari.phone || '-'}</td>
          <td colspan="2">Vergi: ${cari.taxOffice} / ${cari.taxNumber}</td>
          <td colspan="2" style="text-align: right; font-weight: bold; color: ${cari.balance > 0 ? '#dc2626' : '#16a34a'};">
            Güncel Bakiye: ${cari.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺ (${cari.balance > 0 ? 'Borçlu' : 'Alacaklı'})
          </td>
        </tr>
        <tr><td colspan="8"></td></tr>
        <thead>
          <tr>
            <th class="th-cell">Tarih</th>
            <th class="th-cell">Belge No</th>
            <th class="th-cell">İşlem Türü</th>
            <th class="th-cell">Ödeme Kanalı</th>
            <th class="th-cell">Açıklama</th>
            <th class="th-cell" style="text-align: right;">Borç (₺)</th>
            <th class="th-cell" style="text-align: right;">Tahsilat (₺)</th>
            <th class="th-cell" style="text-align: right;">Yürüyen Bakiye (₺)</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
        <tfoot>
          <tr style="background-color: #e2e8f0; font-weight: bold;">
            <td colspan="5" style="padding: 8px; text-align: right;">GENEL TOPLAMLAR:</td>
            <td style="padding: 8px; text-align: right; color: #dc2626;">${cari.totalDebit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
            <td style="padding: 8px; text-align: right; color: #16a34a;">${cari.totalCredit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
            <td style="padding: 8px; text-align: right;">${cari.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
          </tr>
        </tfoot>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob(['\uFEFF' + excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Cari_Ekstre_${cari.code}_${new Date().toISOString().split('T')[0]}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates an All-Cariler Excel Workbook
 */
export function generateAllCarilerExcel(cariler: CariAccount[], summary?: any) {
  const rowsHtml = cariler.map(c => {
    return `
      <tr>
        <td style="border: 1px solid #ddd; padding: 6px; font-family: monospace;">${c.code}</td>
        <td style="border: 1px solid #ddd; padding: 6px; font-weight: bold;">${(c.companyName || '').replace(/</g, '&lt;')}</td>
        <td style="border: 1px solid #ddd; padding: 6px;">${(c.name || '').replace(/</g, '&lt;')}</td>
        <td style="border: 1px solid #ddd; padding: 6px;">${c.type === 'dealer' ? 'Bayi' : c.type === 'supplier' ? 'Tedarikçi' : 'Müşteri'}</td>
        <td style="border: 1px solid #ddd; padding: 6px; font-family: monospace;">${c.phone || '-'}</td>
        <td style="border: 1px solid #ddd; padding: 6px;">${c.city || '-'}</td>
        <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">${c.creditLimit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
        <td style="border: 1px solid #ddd; padding: 6px; text-align: right; color: #dc2626; font-weight: bold;">${c.totalDebit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
        <td style="border: 1px solid #ddd; padding: 6px; text-align: right; color: #16a34a; font-weight: bold;">${c.totalCredit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
        <td style="border: 1px solid #ddd; padding: 6px; text-align: right; font-weight: bold; color: ${c.balance > 0 ? '#dc2626' : c.balance < 0 ? '#2563eb' : '#16a34a'};">
          ${c.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
        </td>
        <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${c.status === 'active' ? 'Aktif' : c.status === 'blocked' ? 'Bloke' : 'Pasif'}</td>
      </tr>
    `;
  }).join('');

  const excelTemplate = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
      <style>
        body { font-family: Arial, sans-serif; font-size: 11px; }
        .header-title { font-size: 16px; font-weight: bold; color: #1e293b; }
        .th-cell { background-color: #1e293b; color: #ffffff; font-weight: bold; border: 1px solid #0f172a; padding: 8px; }
      </style>
    </head>
    <body>
      <table>
        <tr>
          <td colspan="11" class="header-title">ALPHA TEKNİK DOĞALGAZ - GENEL CARİ VE RİSK LİSTESİ</td>
        </tr>
        <tr>
          <td colspan="11">Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR')} | Toplam Cari: ${cariler.length}</td>
        </tr>
        <tr><td colspan="11"></td></tr>
        <thead>
          <tr>
            <th class="th-cell">Cari Kodu</th>
            <th class="th-cell">Firma Ünvanı</th>
            <th class="th-cell">Yetkili</th>
            <th class="th-cell">Cari Türü</th>
            <th class="th-cell">Telefon</th>
            <th class="th-cell">Şehir</th>
            <th class="th-cell" style="text-align: right;">Kredi Limiti (₺)</th>
            <th class="th-cell" style="text-align: right;">Toplam Borç (₺)</th>
            <th class="th-cell" style="text-align: right;">Toplam Tahsilat (₺)</th>
            <th class="th-cell" style="text-align: right;">Net Güncel Bakiye (₺)</th>
            <th class="th-cell" style="text-align: center;">Durum</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob(['\uFEFF' + excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Genel_Cari_Listesi_${new Date().toISOString().split('T')[0]}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
