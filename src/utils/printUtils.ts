/**
 * Robust printing utility for DOM elements within modal / iframe / sandboxed environments
 * Includes automatic page margin calculation and dynamic row height formatting to prevent page overflow.
 */

import { getCompanySettings } from '../lib/companySettings';

export function printElementById(elementId: string, title = 'Belge Yazdır'): boolean {
  try {
    const elem = document.getElementById(elementId);
    if (!elem) {
      console.warn(`Element with ID '${elementId}' not found, falling back to window.print()`);
      try {
        window.print();
        return true;
      } catch (err) {
        console.error('window.print() error:', err);
        return false;
      }
    }

    // Measure table row count and element density for automatic margin calculation
    const rowCount = elem.querySelectorAll('tbody tr').length;
    const isDense = rowCount > 10;
    const isVeryDense = rowCount > 18;

    // Dynamically calculate page margins and cell padding based on content volume
    const pageMargin = isVeryDense ? '6mm 8mm' : isDense ? '8mm 10mm' : '10mm 12mm';
    const cellPadding = isVeryDense ? '2px 4px' : isDense ? '3.5px 5px' : '5px 7px';
    const bodyFontSize = isVeryDense ? '10px' : isDense ? '10.5px' : '11px';
    const bodyLineHeight = isVeryDense ? '1.2' : isDense ? '1.28' : '1.35';

    // Collect all stylesheets from current document to keep typography and layout intact
    let stylesHtml = '';
    document.querySelectorAll('style, link[rel="stylesheet"]').forEach(styleNode => {
      stylesHtml += styleNode.outerHTML;
    });

    const printHtml = `
      <!DOCTYPE html>
      <html lang="tr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${title}</title>
          ${stylesHtml}
          <style>
            @page {
              size: A4 portrait;
              margin: ${pageMargin};
            }
            *, *::before, *::after {
              box-sizing: border-box !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-shadow: none !important;
              text-shadow: none !important;
            }
            html, body {
              background: #ffffff !important;
              color: #0f172a !important;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
              font-size: ${bodyFontSize} !important;
              line-height: ${bodyLineHeight} !important;
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              height: auto !important;
              overflow: visible !important;
            }
            .print\\:hidden, button, [role="button"], nav, footer, input, select {
              display: none !important;
            }
            .print\\:block {
              display: block !important;
            }
            .print\\:flex {
              display: flex !important;
            }
            .print-root-container {
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 auto !important;
              padding: 0 !important;
              overflow: visible !important;
              background: transparent !important;
            }
            /* Dynamic table layout with overflow prevention */
            table {
              width: 100% !important;
              table-layout: auto !important;
              border-collapse: collapse !important;
              page-break-inside: auto;
              margin-top: 4px !important;
              margin-bottom: 6px !important;
            }
            thead {
              display: table-header-group !important;
            }
            tfoot {
              display: table-footer-group !important;
            }
            tr {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              min-height: 0 !important;
            }
            th, td {
              padding: ${cellPadding} !important;
              line-height: ${bodyLineHeight} !important;
              word-break: break-word !important;
              overflow-wrap: break-word !important;
              border-color: #cbd5e1 !important;
            }
            /* Prevent card and signature container splits */
            .avoid-break,
            .rounded-2xl,
            .rounded-3xl,
            .border,
            .grid,
            [data-print-avoid-break="true"] {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            /* Force high contrast text on backgrounds */
            .bg-base-surface, .bg-base-surface-2, .bg-stone-900 {
              background-color: #f8fafc !important;
              color: #0f172a !important;
              border-color: #cbd5e1 !important;
            }
            .text-text-primary, .text-text-secondary, .text-text-muted {
              color: #1e293b !important;
            }
          </style>
        </head>
        <body>
          <div class="print-root-container">
            ${elem.innerHTML}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                try {
                  window.focus();
                  window.print();
                } catch (e) {
                  console.error('Print trigger failed:', e);
                }
              }, 250);
            };
          </script>
        </body>
      </html>
    `;

    // Try Window Popup first (bypasses iframe sandbox print restrictions)
    let printWindow: Window | null = null;
    try {
      printWindow = window.open('', '_blank', 'width=800,height=900,menubar=no,toolbar=no,location=no,status=no');
    } catch (popupErr) {
      console.warn('window.open popup blocked or not allowed:', popupErr);
    }

    if (printWindow && !printWindow.closed) {
      try {
        printWindow.document.open();
        printWindow.document.write(printHtml);
        printWindow.document.close();
        return true;
      } catch (writeErr) {
        console.warn('Writing to popup failed, falling back to iframe/window.print():', writeErr);
      }
    }

    // Fallback: Invisible iframe
    const iframe = document.createElement('iframe');
    iframe.name = 'print_frame_' + Date.now();
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const frameDoc = iframe.contentWindow?.document || iframe.contentDocument;
    if (frameDoc) {
      frameDoc.open();
      frameDoc.write(printHtml);
      frameDoc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (iframeErr) {
          console.warn('Iframe print failed (likely sandbox), falling back to window.print():', iframeErr);
          try {
            window.print();
          } catch (e) {
            console.error('Final window.print() failed:', e);
          }
        } finally {
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 2000);
        }
      }, 300);
      return true;
    }

    // Last resort fallback
    window.print();
    return true;
  } catch (e) {
    console.error('Error executing printElementById:', e);
    try {
      window.print();
    } catch (err) {
      console.error('window.print fallback failed:', err);
    }
    return false;
  }
}

/**
 * 80mm / 58mm Termal Fiş / Sevk İrsaliyesi / Depo Çeki Listesi Yazdırıcı
 * Xprinter, Epson POS, Bixolon, Hugin, Zebra için optimize edilmiştir.
 */
export function printThermalReceipt80mm(data: {
  title?: string;
  orderNumber?: string;
  customerName: string;
  customerPhone?: string;
  date?: string;
  items: Array<{ name: string; qty: number; unit: string; price?: number; total?: number }>;
  totalAmount?: number;
  taxAmount?: number;
  notes?: string;
  barcode?: string;
  documentType?: 'SEVK_IRSALIYESI' | 'DEPO_CEKI_LISTESI' | 'SIPARIS_FISI' | 'TAHSILAT_MAKBUZU' | 'TEKLIF_FISI' | 'TEDARIKCI_SIPARIS_FISI';
}): boolean {
  if (!data) {
    console.error('Hata: Yazdırılacak belge verisi (data) eksik veya null.');
    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert('Hata: Yazdırılacak belge verisi eksik veya geçersiz.');
    }
    return false;
  }

  if (!Array.isArray(data.items)) {
    console.error('Hata: Belge ürün listesi (items) geçersiz veya dizi değil.');
    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert('Hata: Belge ürün listesi geçersiz veya eksik.');
    }
    return false;
  }

  const title = data.title || 'ALPHA TEKNİK';
  const docTypeLabel = 
    data.documentType === 'DEPO_CEKI_LISTESI' ? 'DEPO ÇEKİ & TOPLAMA FİŞİ' :
    data.documentType === 'SEVK_IRSALIYESI' ? 'SEVK İRSALİYE BİLGİ FİŞİ' :
    data.documentType === 'TAHSILAT_MAKBUZU' ? 'TAHSİLAT MAKBUZU' :
    data.documentType === 'TEKLIF_FISI' ? 'TEKLİF & FİYAT FORMU' :
    data.documentType === 'TEDARIKCI_SIPARIS_FISI' ? 'TEDARİKÇİ SATIN ALMA SİPARİŞİ' : 'SİPARİŞ BİLGİ FİŞİ';

  const dateStr = data.date || new Date().toLocaleString('tr-TR');
  const safeItems = data.items;

  let itemsRows = '';
  safeItems.forEach((it, idx) => {
    if (!it) return; // Skip null/undefined items safely
    const qty = (typeof it.qty === 'number' && Number.isFinite(it.qty)) ? it.qty : 1;
    const unit = it.unit || 'ADET';
    const name = it.name || 'Ürün';
    const priceFormatted = (typeof it.price === 'number' && Number.isFinite(it.price)) ? `x ${it.price.toLocaleString('tr-TR')} ₺` : '';
    const totalFormatted = (typeof it.total === 'number' && Number.isFinite(it.total)) ? `<span style="font-weight: bold;">${it.total.toLocaleString('tr-TR')} ₺</span>` : '';

    itemsRows += `
      <div style="margin-bottom: 4px; font-size: 11px; border-bottom: 1px dashed #ccc; padding-bottom: 3px;">
        <div style="font-weight: bold;">${idx + 1}. ${name}</div>
        <div style="display: flex; justify-content: space-between; color: #333; font-size: 10.5px;">
          <span>${qty} ${unit} ${priceFormatted}</span>
          ${totalFormatted}
        </div>
      </div>
    `;
  });

  const thermalHtml = `
    <!DOCTYPE html>
    <html lang="tr">
      <head>
        <meta charset="UTF-8">
        <title>80mm Fiş - ${data.orderNumber || 'Yazdır'}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 2mm 3mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
          }
          body {
            font-family: 'Courier New', Courier, monospace, sans-serif;
            font-size: 11px;
            line-height: 1.25;
            color: #000;
            background: #fff;
            width: 74mm;
            margin: 0 auto;
            padding: 2mm 0;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 5px 0; }
          .double-divider { border-top: 2px solid #000; margin: 6px 0; }
          .flex-between { display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="center">
          <div style="font-size: 14px; font-weight: 900; letter-spacing: 0.5px;">${title}</div>
          <div style="font-size: 9px; margin-top: 1px;">DOĞALGAZ & SIHHİ TESİSAT MALZEMELERİ</div>
          <div style="font-size: 9px;">Tel: ${getCompanySettings().phone} - ${getCompanySettings().city}</div>
        </div>

        <div class="double-divider"></div>

        <div class="center bold" style="font-size: 11px; padding: 2px 0;">
          *** ${docTypeLabel} ***
        </div>

        <div class="divider"></div>

        <div style="font-size: 10px;">
          ${data.orderNumber ? `<div><strong>Belge/Sipariş No:</strong> #${data.orderNumber}</div>` : ''}
          <div><strong>Tarih:</strong> ${dateStr}</div>
          <div><strong>Müşteri / Firma:</strong> ${data.customerName}</div>
          ${data.customerPhone ? `<div><strong>Telefon:</strong> ${data.customerPhone}</div>` : ''}
        </div>

        <div class="divider"></div>
        <div class="bold" style="font-size: 10px; margin-bottom: 4px;">ÜRÜN LİSTESİ (${safeItems.length} KALEM)</div>

        ${itemsRows}

        ${typeof data.totalAmount === 'number' && !isNaN(data.totalAmount) ? `
          <div class="double-divider"></div>
          ${typeof data.taxAmount === 'number' && !isNaN(data.taxAmount) ? `
            <div class="flex-between" style="font-size: 10.5px;">
              <span>Hesaplanan KDV (%20):</span>
              <span>${data.taxAmount.toLocaleString('tr-TR')} ₺</span>
            </div>
          ` : ''}
          <div class="flex-between bold" style="font-size: 13px; margin-top: 3px;">
            <span>GENEL TOPLAM:</span>
            <span>${data.totalAmount.toLocaleString('tr-TR')} ₺</span>
          </div>
        ` : ''}

        ${data.notes ? `
          <div class="divider"></div>
          <div style="font-size: 9.5px;">
            <strong>Not:</strong> ${data.notes}
          </div>
        ` : ''}

        <div class="divider"></div>
        <div style="margin-top: 10px; font-size: 9.5px; text-align: center;">
          <div>Teslim Eden (Depo) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Teslim Alan (Şoför/Müşteri)</div>
          <div style="height: 25px;"></div>
          <div>................... &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ...................</div>
        </div>

        <div class="center" style="margin-top: 8px; font-size: 8.5px; color: #555;">
          Mal tesliminde lütfen adedi kontrol ediniz.<br/>
          Bizi tercih ettiğiniz için teşekkür ederiz.
        </div>
      </body>
    </html>
  `;

  // Try window open
  let printWindow: Window | null = null;
  try {
    printWindow = window.open('', '_blank', 'width=420,height=700');
  } catch (err) {
    console.warn('Thermal print window.open blocked:', err);
  }

  if (printWindow && !printWindow.closed) {
    printWindow.document.open();
    printWindow.document.write(thermalHtml);
    printWindow.document.close();
    setTimeout(() => {
      printWindow?.focus();
      printWindow?.print();
    }, 250);
    return true;
  }

  // Fallback iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (doc) {
    doc.open();
    doc.write(thermalHtml);
    doc.close();
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error('Thermal iframe print error:', e);
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) document.body.removeChild(iframe);
        }, 2000);
      }
    }, 300);
    return true;
  }

  return false;
}

/**
 * 100mm x 150mm Standart Sevkiyat ve Depo Koli Etiketi Yazdırıcı
 * Zebra, Argox, Honeywell, Xprinter, TSC ve termal etiket yazıcıları için tam uyumlu.
 */
export function printShippingLabel100x150(data: {
  orderNumber: string;
  trackingNumber?: string;
  senderName?: string;
  senderPhone?: string;
  senderAddress?: string;
  customerName: string;
  customerCompany?: string;
  customerPhone: string;
  customerAddress: string;
  customerCity?: string;
  parcelCount?: number;
  currentParcel?: number;
  desi?: number;
  weightKg?: number;
  paymentType?: 'Kapıda Nakit' | 'Kapıda Kredi Kartı' | 'Önceden Ödendi (Havale/EFT/Kredi Kartı)' | 'Cari Hesap';
  cashOnDeliveryAmount?: number;
  itemsSummary?: Array<{ name: string; qty: number; unit: string }>;
  notes?: string;
}): boolean {
  if (!data) {
    console.error('Hata: Sevkiyat etiketi verisi (data) eksik veya null.');
    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert('Hata: Sevkiyat etiketi verisi eksik veya geçersiz.');
    }
    return false;
  }

  const company = getCompanySettings();
  const sender = data.senderName || company.companyName;
  const senderPhone = data.senderPhone || company.phone;
  const senderAddress = data.senderAddress || `${company.address} ${company.district} / ${company.city}`;
  const barcodeValue = data.trackingNumber || `ALP-${(data.orderNumber || '000').replace(/\D/g, '')}`;
  const parcelText = `${data.currentParcel || 1} / ${data.parcelCount || 1}`;
  const dateStr = new Date().toLocaleDateString('tr-TR');

  const safeItemsSummary = Array.isArray(data.itemsSummary) ? data.itemsSummary : [];
  const itemsHtml = safeItemsSummary.length > 0
    ? safeItemsSummary.slice(0, 5).map((it, i) => `
        <div style="font-size: 8.5px; border-bottom: 1px dotted #ccc; padding: 1px 0;">
          <strong>${i + 1}.</strong> ${it?.name || 'Ürün'} - <strong>${it?.qty || 1} ${it?.unit || 'ADET'}</strong>
        </div>
      `).join('') + (safeItemsSummary.length > 5 ? `<div style="font-size: 8px; color: #666; margin-top: 1px;">+ ${safeItemsSummary.length - 5} kalem ürün daha...</div>` : '')
    : '<div style="font-size: 8px; color: #666;">Doğalgaz & Sıhhi Tesisat Malzemeleri</div>';

  const labelHtml = `
    <!DOCTYPE html>
    <html lang="tr">
      <head>
        <meta charset="UTF-8">
        <title>Koli Etiketi - #${data.orderNumber}</title>
        <style>
          @page {
            size: 100mm 150mm;
            margin: 2mm 3mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            font-size: 11px;
            color: #000;
            background: #fff;
            width: 94mm;
            height: 144mm;
            margin: 0 auto;
            padding: 2mm;
            border: 2px solid #000;
          }
          .header-box {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #000;
            padding-bottom: 4px;
            margin-bottom: 4px;
          }
          .sender-box {
            border: 1px solid #000;
            padding: 4px;
            margin-bottom: 4px;
            background: #f8f8f8;
            font-size: 9px;
          }
          .receiver-box {
            border: 2px solid #000;
            padding: 6px;
            margin-bottom: 6px;
            background: #fff;
          }
          .tag {
            display: inline-block;
            background: #000;
            color: #fff;
            font-weight: bold;
            font-size: 9px;
            padding: 2px 6px;
            border-radius: 2px;
          }
          .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 4px;
          }
          .barcode-area {
            text-align: center;
            border: 1px dashed #000;
            padding: 6px 2px;
            margin: 6px 0;
            background: #fafafa;
          }
          .barcode-bars {
            display: flex;
            justify-content: center;
            align-items: flex-end;
            height: 38px;
            gap: 1.5px;
            margin-bottom: 3px;
          }
          .bar { background: #000; }
          .warning-badges {
            display: flex;
            justify-content: space-between;
            gap: 4px;
            margin-top: 4px;
          }
          .warning-badge {
            border: 1px solid #000;
            padding: 2px 4px;
            font-size: 8px;
            font-weight: bold;
            text-align: center;
            flex: 1;
          }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div class="header-box">
          <div>
            <div style="font-size: 13px; font-weight: 900; letter-spacing: -0.5px;">ALPHA TEKNİK</div>
            <div style="font-size: 8px; font-weight: bold;">SEVKİYAT & TESLİMAT ETİKETİ</div>
          </div>
          <div style="text-align: right;">
            <span class="tag">KOLİ: ${parcelText}</span>
            <div style="font-size: 8px; margin-top: 2px;">Tarih: ${dateStr}</div>
          </div>
        </div>

        <!-- Sender Box -->
        <div class="sender-box">
          <div style="font-weight: bold; color: #444; font-size: 8px;">GÖNDERİCİ (SELLER):</div>
          <div style="font-weight: bold;">${sender}</div>
          <div>${senderAddress}</div>
          <div>Tel: ${senderPhone}</div>
        </div>

        <!-- Receiver Box -->
        <div class="receiver-box">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div style="font-weight: 900; font-size: 10px; background: #000; color: #fff; padding: 1px 4px; display: inline-block;">ALICI (DELIVER TO):</div>
            <div style="font-weight: bold; font-size: 12px; color: #000;">${data.customerCity || 'İSTANBUL'}</div>
          </div>
          <div style="font-size: 13px; font-weight: 900; margin-top: 3px; line-height: 1.2;">
            ${data.customerCompany ? `${data.customerCompany}<br/><span style="font-size: 11px; font-weight: bold;">(Yetkili: ${data.customerName})</span>` : data.customerName}
          </div>
          <div style="font-size: 11px; margin-top: 3px; line-height: 1.3; font-weight: 500;">
            ${data.customerAddress}
          </div>
          <div style="font-size: 12px; font-weight: 900; margin-top: 3px;">
            📞 ${data.customerPhone}
          </div>
        </div>

        <!-- Barcode Area -->
        <div class="barcode-area">
          <div class="barcode-bars">
            <!-- Simulated High Density Code-128 Barcode -->
            <div class="bar" style="width: 2px; height: 36px;"></div>
            <div class="bar" style="width: 1px; height: 36px;"></div>
            <div class="bar" style="width: 3px; height: 36px;"></div>
            <div class="bar" style="width: 1px; height: 36px;"></div>
            <div class="bar" style="width: 2px; height: 36px;"></div>
            <div class="bar" style="width: 4px; height: 36px;"></div>
            <div class="bar" style="width: 1px; height: 36px;"></div>
            <div class="bar" style="width: 3px; height: 36px;"></div>
            <div class="bar" style="width: 2px; height: 36px;"></div>
            <div class="bar" style="width: 1px; height: 36px;"></div>
            <div class="bar" style="width: 3px; height: 36px;"></div>
            <div class="bar" style="width: 1px; height: 36px;"></div>
            <div class="bar" style="width: 4px; height: 36px;"></div>
            <div class="bar" style="width: 2px; height: 36px;"></div>
            <div class="bar" style="width: 1px; height: 36px;"></div>
            <div class="bar" style="width: 3px; height: 36px;"></div>
            <div class="bar" style="width: 2px; height: 36px;"></div>
            <div class="bar" style="width: 1px; height: 36px;"></div>
            <div class="bar" style="width: 4px; height: 36px;"></div>
            <div class="bar" style="width: 2px; height: 36px;"></div>
            <div class="bar" style="width: 1px; height: 36px;"></div>
            <div class="bar" style="width: 3px; height: 36px;"></div>
            <div class="bar" style="width: 2px; height: 36px;"></div>
            <div class="bar" style="width: 1px; height: 36px;"></div>
            <div class="bar" style="width: 3px; height: 36px;"></div>
            <div class="bar" style="width: 4px; height: 36px;"></div>
            <div class="bar" style="width: 1px; height: 36px;"></div>
            <div class="bar" style="width: 2px; height: 36px;"></div>
            <div class="bar" style="width: 3px; height: 36px;"></div>
            <div class="bar" style="width: 1px; height: 36px;"></div>
          </div>
          <div style="font-family: monospace; font-size: 11px; font-weight: bold; letter-spacing: 2px;">
            *${barcodeValue}*
          </div>
        </div>

        <!-- Info Grid -->
        <div class="grid-2" style="font-size: 9.5px; margin-bottom: 4px;">
          <div style="border: 1px solid #ccc; padding: 3px;">
            <div><strong>Sipariş No:</strong> #${data.orderNumber}</div>
            <div><strong>Desi:</strong> ${data.desi ? `${data.desi} Desi` : 'Standart'}</div>
            <div><strong>Ağırlık:</strong> ${data.weightKg ? `${data.weightKg} kg` : '-'}</div>
          </div>
          <div style="border: 1px solid #ccc; padding: 3px; background: #fff8f0;">
            <div><strong>Ödeme Şekli:</strong></div>
            <div style="font-weight: bold; color: #b45309;">${data.paymentType || 'Cari / Havale'}</div>
            ${data.cashOnDeliveryAmount ? `<div style="color: #b91c1c; font-weight: 900; font-size: 11px;">Tahsilat: ${data.cashOnDeliveryAmount.toLocaleString('tr-TR')} ₺</div>` : ''}
          </div>
        </div>

        <!-- Items Summary -->
        <div style="border: 1px solid #000; padding: 3px; margin-bottom: 4px;">
          <div style="font-size: 8px; font-weight: bold; border-bottom: 1px solid #000; margin-bottom: 2px;">KOLİ İÇERİK ÖZETİ:</div>
          ${itemsHtml}
        </div>

        ${data.notes ? `<div style="font-size: 8px; background: #fef08a; padding: 2px 4px; border: 1px solid #ca8a04; margin-bottom: 4px;"><strong>Not:</strong> ${data.notes}</div>` : ''}

        <!-- Warnings -->
        <div class="warning-badges">
          <div class="warning-badge">⚠️ KIRILABİLİR</div>
          <div class="warning-badge">⬆️ DİK TAŞIYINIZ</div>
          <div class="warning-badge">💧 SUDAN KORUYUN</div>
        </div>
      </body>
    </html>
  `;

  // Try window open
  let printWindow: Window | null = null;
  try {
    printWindow = window.open('', '_blank', 'width=460,height=720');
  } catch (err) {
    console.warn('Label print window.open blocked:', err);
  }

  if (printWindow && !printWindow.closed) {
    printWindow.document.open();
    printWindow.document.write(labelHtml);
    printWindow.document.close();
    setTimeout(() => {
      printWindow?.focus();
      printWindow?.print();
    }, 250);
    return true;
  }

  // Fallback iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (doc) {
    doc.open();
    doc.write(labelHtml);
    doc.close();
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error('Label iframe print error:', e);
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) document.body.removeChild(iframe);
        }, 2000);
      }
    }, 300);
    return true;
  }

  return false;
}

/**
 * Şoför / Sevkiyat Aracı Toplu Dağıtım ve Rota Teslim Çizelgesi Yazdırıcı
 * A4 Formatında tüm teslim edilecek siparişlerin şoför zimmet fişi.
 */
export function printDispatchRouteSheet(data: {
  driverName: string;
  vehiclePlate?: string;
  routeRegion?: string;
  date?: string;
  orders: Array<{
    orderNumber: string;
    customerName: string;
    companyName?: string;
    phone: string;
    address: string;
    parcelCount: number;
    paymentType: string;
    cashOnDeliveryAmount?: number;
    totalAmount: number;
  }>;
}): boolean {
  if (!data || !Array.isArray(data.orders)) {
    console.error('Hata: Sevkiyat rota verisi (data veya orders) eksik veya geçersiz.');
    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert('Hata: Sevkiyat rota bilgileri eksik veya geçersiz.');
    }
    return false;
  }
  const dateStr = data.date || new Date().toLocaleDateString('tr-TR');
  const safeOrders = data.orders;
  const totalParcels = safeOrders.reduce((sum, o) => sum + ((typeof o?.parcelCount === 'number' && Number.isFinite(o.parcelCount)) ? o.parcelCount : 1), 0);
  const totalCashToCollect = safeOrders.reduce((sum, o) => sum + ((typeof o?.cashOnDeliveryAmount === 'number' && Number.isFinite(o.cashOnDeliveryAmount)) ? o.cashOnDeliveryAmount : 0), 0);
  const totalRevenue = safeOrders.reduce((sum, o) => sum + ((typeof o?.totalAmount === 'number' && Number.isFinite(o.totalAmount)) ? o.totalAmount : 0), 0);

  let rowsHtml = '';
  safeOrders.forEach((o, idx) => {
    rowsHtml += `
      <tr style="border-bottom: 1px solid #cbd5e1; font-size: 11px;">
        <td style="padding: 6px; text-align: center; font-weight: bold; background: #f8fafc;">${idx + 1}</td>
        <td style="padding: 6px; font-weight: bold; font-family: monospace;">#${o.orderNumber}</td>
        <td style="padding: 6px;">
          <div style="font-weight: bold;">${o.companyName ? `${o.companyName} (${o.customerName})` : o.customerName}</div>
          <div style="color: #475569; font-size: 10px;">📞 ${o.phone}</div>
        </td>
        <td style="padding: 6px; font-size: 10.5px; max-width: 220px;">
          ${o.address}
        </td>
        <td style="padding: 6px; text-align: center; font-weight: bold;">${o.parcelCount || 1} Koli</td>
        <td style="padding: 6px; font-size: 10px;">
          <div style="font-weight: 600;">${o.paymentType}</div>
          ${o.cashOnDeliveryAmount ? `<div style="color: #b91c1c; font-weight: bold;">Tahsilat: ${o.cashOnDeliveryAmount.toLocaleString('tr-TR')} ₺</div>` : ''}
        </td>
        <td style="padding: 6px; text-align: right; font-weight: bold;">${o.totalAmount.toLocaleString('tr-TR')} ₺</td>
        <td style="padding: 6px; text-align: center; min-width: 90px; border-left: 1px dashed #cbd5e1;">
          <div style="height: 22px;"></div>
        </td>
      </tr>
    `;
  });

  const routeHtml = `
    <!DOCTYPE html>
    <html lang="tr">
      <head>
        <meta charset="UTF-8">
        <title>Sevkiyat Dağıtım Çizelgesi - ${dateStr}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 8mm 10mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            font-size: 11px;
            color: #0f172a;
            background: #fff;
            margin: 0;
            padding: 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          th {
            background: #0f172a;
            color: #ffffff;
            font-weight: bold;
            text-align: left;
            padding: 8px 6px;
            font-size: 10.5px;
          }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 8px;">
          <div>
            <div style="font-size: 18px; font-weight: 900; letter-spacing: -0.5px;">ALPHA TEKNİK DOĞALGAZ & TESİSAT</div>
            <div style="font-size: 13px; font-weight: bold; color: #334155; margin-top: 2px;">ŞOFÖR SEVKİYAT VE ROTA TESLİMAT ÇİZELGESİ</div>
          </div>
          <div style="text-align: right; font-size: 11px;">
            <div><strong>Tarih:</strong> ${dateStr}</div>
            <div><strong>Şoför / Sevkiyat Sorumlusu:</strong> ${data.driverName}</div>
            ${data.vehiclePlate ? `<div><strong>Araç Plakası:</strong> ${data.vehiclePlate}</div>` : ''}
            ${data.routeRegion ? `<div><strong>Bölge / Hat:</strong> ${data.routeRegion}</div>` : ''}
          </div>
        </div>

        <!-- Summary KPI Cards -->
        <div style="display: flex; gap: 12px; margin-top: 10px;">
          <div style="flex: 1; border: 1px solid #cbd5e1; padding: 6px 10px; border-radius: 4px; background: #f8fafc;">
            <div style="font-size: 10px; color: #64748b; font-weight: bold;">TOPLAM SİPARİŞ</div>
            <div style="font-size: 15px; font-weight: 900;">${data.orders.length} Adet</div>
          </div>
          <div style="flex: 1; border: 1px solid #cbd5e1; padding: 6px 10px; border-radius: 4px; background: #f8fafc;">
            <div style="font-size: 10px; color: #64748b; font-weight: bold;">TOPLAM KOLİ / PAKET</div>
            <div style="font-size: 15px; font-weight: 900; color: #2563eb;">${totalParcels} Koli</div>
          </div>
          <div style="flex: 1; border: 1px solid #cbd5e1; padding: 6px 10px; border-radius: 4px; background: #fff8f0;">
            <div style="font-size: 10px; color: #b45309; font-weight: bold;">KAPIDA TAHSİL EDİLECEK TUTAR</div>
            <div style="font-size: 15px; font-weight: 900; color: #b91c1c;">${totalCashToCollect.toLocaleString('tr-TR')} ₺</div>
          </div>
          <div style="flex: 1; border: 1px solid #cbd5e1; padding: 6px 10px; border-radius: 4px; background: #f8fafc;">
            <div style="font-size: 10px; color: #64748b; font-weight: bold;">TOPLAM İRSALİYE TUTARI</div>
            <div style="font-size: 15px; font-weight: 900;">${totalRevenue.toLocaleString('tr-TR')} ₺</div>
          </div>
        </div>

        <!-- Orders Table -->
        <table>
          <thead>
            <tr>
              <th style="width: 30px; text-align: center;">Sıra</th>
              <th style="width: 100px;">Sipariş No</th>
              <th style="width: 170px;">Müşteri / Yetkili</th>
              <th>Teslimat Adresi</th>
              <th style="width: 70px; text-align: center;">Koli</th>
              <th style="width: 140px;">Ödeme / Tahsilat</th>
              <th style="width: 100px; text-align: right;">Tutar</th>
              <th style="width: 100px; text-align: center;">Teslim İmzası</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <!-- Footer Signatures -->
        <div style="display: flex; justify-content: space-between; margin-top: 30px; padding-top: 15px; border-top: 1px solid #cbd5e1; font-size: 11px;">
          <div style="text-align: center; width: 220px;">
            <div><strong>Sevkiyat & Depo Sorumlusu</strong></div>
            <div style="height: 35px;"></div>
            <div>İmza / Kaşe</div>
          </div>
          <div style="text-align: center; width: 220px;">
            <div><strong>Teslim Eden Şoför</strong></div>
            <div style="height: 35px;"></div>
            <div>${data.driverName} - İmza</div>
          </div>
          <div style="text-align: center; width: 220px;">
            <div><strong>Muhasebe / Kasa Teslim Onayı</strong></div>
            <div style="height: 35px;"></div>
            <div>(Tahsilat Teslim Alındı)</div>
          </div>
        </div>
      </body>
    </html>
  `;

  // Try window open
  let printWindow: Window | null = null;
  try {
    printWindow = window.open('', '_blank', 'width=900,height=650');
  } catch (err) {
    console.warn('Route print window.open blocked:', err);
  }

  if (printWindow && !printWindow.closed) {
    printWindow.document.open();
    printWindow.document.write(routeHtml);
    printWindow.document.close();
    setTimeout(() => {
      printWindow?.focus();
      printWindow?.print();
    }, 250);
    return true;
  }

  // Fallback iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (doc) {
    doc.open();
    doc.write(routeHtml);
    doc.close();
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error('Route iframe print error:', e);
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) document.body.removeChild(iframe);
        }, 2000);
      }
    }, 300);
    return true;
  }

  return false;
}



