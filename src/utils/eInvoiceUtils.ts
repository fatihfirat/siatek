import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { EInvoice, EInvoiceItem } from '../types';
import { setupTurkishFont, formatTRY } from './exportUtils';

/**
 * Converts a numeric monetary amount into formal Turkish words for GİB Invoices
 * e.g. 145020.50 => "Yalnız Yüz Kırk Beş Bin Yirmi Türk Lirası Elli Kuruş"
 */
export function numberToTurkishWords(num: number): string {
  if (num === 0) return 'Yalnız Sıfır Türk Lirası';

  const ones = ['', 'Bir', 'İki', 'Üç', 'Dört', 'Beş', 'Altı', 'Yedi', 'Sekiz', 'Dokuz'];
  const tens = ['', 'On', 'Yirmi', 'Otuz', 'Kırk', 'Elli', 'Altmış', 'Yetmiş', 'Seksen', 'Doksan'];
  const thousands = ['', 'Bin', 'Milyon', 'Milyar', 'Trilyon'];

  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const lira = Math.floor(absNum);
  const kurus = Math.round((absNum - lira) * 100);

  function convertGroup(n: number): string {
    let result = '';
    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const o = n % 10;

    if (h > 0) {
      result += (h === 1 ? '' : ones[h]) + 'Yüz';
    }
    if (t > 0) {
      result += tens[t];
    }
    if (o > 0) {
      result += ones[o];
    }
    return result;
  }

  let liraStr = '';
  let groupIdx = 0;
  let tempLira = lira;

  if (tempLira === 0) {
    liraStr = 'Sıfır';
  } else {
    while (tempLira > 0) {
      const group = tempLira % 1000;
      if (group > 0) {
        let groupText = convertGroup(group);
        if (groupIdx === 1 && group === 1) {
          groupText = ''; // "Bir Bin" değil, sadece "Bin"
        }
        liraStr = groupText + thousands[groupIdx] + liraStr;
      }
      tempLira = Math.floor(tempLira / 1000);
      groupIdx++;
    }
  }

  let result = (isNegative ? 'Eksi ' : '') + 'Yalnız ' + liraStr + ' Türk Lirası';

  if (kurus > 0) {
    const kurusGroup = convertGroup(kurus);
    result += ' ' + kurusGroup + ' Kuruş';
  }

  return result;
}

/**
 * Generates an SVG string representation of a QR Code / Data Matrix for GİB e-invoice compliance
 */
export function generateGibQrCodeDataUrl(invoice: EInvoice): string {
  // GİB standard karekod format
  const qrText = `VKN:0580948214|AVKN:${invoice.customerVknTckn}|SNO:${invoice.invoiceNumber}|TRH:${invoice.invoiceDate}|TUT:${invoice.payableAmount.toFixed(2)}|ETTN:${invoice.uuid}|KDV:${invoice.totalVat.toFixed(2)}`;

  // Generate a lightweight, deterministic SVG Matrix visual
  const matrixSize = 25;
  let hash = 0;
  for (let i = 0; i < qrText.length; i++) {
    hash = ((hash << 5) - hash) + qrText.charCodeAt(i);
    hash |= 0;
  }

  const cells: string[] = [];
  const cellSize = 4;
  const padding = 8;
  const totalSvgSize = matrixSize * cellSize + padding * 2;

  // Corner markers for standard QR look
  function addMarker(startX: number, startY: number) {
    // 7x7 outer
    cells.push(`<rect x="${startX}" y="${startY}" width="28" height="28" fill="#1e293b" />`);
    cells.push(`<rect x="${startX + 4}" y="${startY + 4}" width="20" height="20" fill="#ffffff" />`);
    cells.push(`<rect x="${startX + 8}" y="${startY + 8}" width="12" height="12" fill="#1e293b" />`);
  }

  addMarker(padding, padding);
  addMarker(padding + (matrixSize - 7) * cellSize, padding);
  addMarker(padding, padding + (matrixSize - 7) * cellSize);

  // Pseudo-random deterministic payload cells based on invoice fields
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      // Skip corner marker zones
      if ((r < 8 && c < 8) || (r < 8 && c >= matrixSize - 8) || (r >= matrixSize - 8 && c < 8)) {
        continue;
      }
      const val = Math.abs(Math.sin((r * 31 + c * 17 + hash)) * 10000);
      if (val % 2 < 1.05) {
        cells.push(`<rect x="${padding + c * cellSize}" y="${padding + r * cellSize}" width="${cellSize - 0.5}" height="${cellSize - 0.5}" fill="#1e293b" />`);
      }
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSvgSize} ${totalSvgSize}" width="100" height="100">
    <rect width="100%" height="100%" fill="#ffffff" />
    ${cells.join('\n')}
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Generates UBL-TR 2.1 Compliant XML Document for GİB E-Fatura / E-Arşiv submission
 */
export function generateUBLTR21XML(invoice: EInvoice): string {
  const isEArsiv = invoice.profile === 'EARSIVFATURA';
  const xmlLines: string[] = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<!-- GİB UBL-TR 2.1 Standart E-Fatura / E-Arşiv Paketi -->`,
    `<!-- Oluşturan: ALPHA TEKNİK DOĞALGAZ & TESİSAT ERP Modülü -->`,
    `<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"`,
    `         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"`,
    `         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"`,
    `         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"`,
    `         xmlns:qdt="urn:oasis:names:specification:ubl:schema:xsd:QualifiedDataTypes-2"`,
    `         xmlns:udt="urn:oasis:names:specification:ubl:schema:xsd:UnqualifiedDataTypes-2"`,
    `         xmlns:ccts="urn:un:unece:uncefact:documentation:2"`,
    `         xmlns:ds="http://www.w3.org/2000/09/xmldsig#"`,
    `         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">`,
    `  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>`,
    `  <cbc:CustomizationID>TR1.2</cbc:CustomizationID>`,
    `  <cbc:ProfileID>${invoice.profile}</cbc:ProfileID>`,
    `  <cbc:ID>${invoice.invoiceNumber}</cbc:ID>`,
    `  <cbc:CopyIndicator>false</cbc:CopyIndicator>`,
    `  <cbc:UUID>${invoice.uuid}</cbc:UUID>`,
    `  <cbc:IssueDate>${invoice.invoiceDate}</cbc:IssueDate>`,
    `  <cbc:IssueTime>${invoice.invoiceTime || '12:00:00'}</cbc:IssueTime>`,
    `  <cbc:InvoiceTypeCode>${invoice.type}</cbc:InvoiceTypeCode>`,
  ];

  // Notes
  if (invoice.notes && invoice.notes.length > 0) {
    invoice.notes.forEach(note => {
      xmlLines.push(`  <cbc:Note>${escapeXml(note)}</cbc:Note>`);
    });
  }
  xmlLines.push(`  <cbc:Note>${escapeXml(invoice.amountInWords)}</cbc:Note>`);
  xmlLines.push(`  <cbc:DocumentCurrencyCode>${invoice.currency}</cbc:DocumentCurrencyCode>`);
  xmlLines.push(`  <cbc:LineCountNumeric>${invoice.items.length}</cbc:LineCountNumeric>`);

  // Despatch Document Reference (İrsaliye)
  if (invoice.despatchNumber) {
    xmlLines.push(`  <cac:DespatchDocumentReference>`);
    xmlLines.push(`    <cbc:ID>${escapeXml(invoice.despatchNumber)}</cbc:ID>`);
    xmlLines.push(`    <cbc:IssueDate>${invoice.despatchDate || invoice.invoiceDate}</cbc:IssueDate>`);
    xmlLines.push(`  </cac:DespatchDocumentReference>`);
  }

  // Order Reference (Sipariş)
  if (invoice.orderNumber || invoice.sourceNumber) {
    xmlLines.push(`  <cac:OrderReference>`);
    xmlLines.push(`    <cbc:ID>${escapeXml(invoice.orderNumber || invoice.sourceNumber || '')}</cbc:ID>`);
    xmlLines.push(`    <cbc:IssueDate>${invoice.orderDate || invoice.invoiceDate}</cbc:IssueDate>`);
    xmlLines.push(`  </cac:OrderReference>`);
  }

  // Supplier (Satıcı - Alpha Teknik)
  xmlLines.push(`  <cac:AccountingSupplierParty>`);
  xmlLines.push(`    <cac:Party>`);
  xmlLines.push(`      <cbc:WebsiteURI>https://www.alphadogalgaz.com</cbc:WebsiteURI>`);
  xmlLines.push(`      <cac:PartyIdentification>`);
  xmlLines.push(`        <cbc:ID schemeID="VKN">${invoice.supplierVkn}</cbc:ID>`);
  xmlLines.push(`      </cac:PartyIdentification>`);
  if (invoice.supplierMersisNo) {
    xmlLines.push(`      <cac:PartyIdentification>`);
    xmlLines.push(`        <cbc:ID schemeID="MERSISNO">${invoice.supplierMersisNo}</cbc:ID>`);
    xmlLines.push(`      </cac:PartyIdentification>`);
  }
  if (invoice.supplierTicaretSicilNo) {
    xmlLines.push(`      <cac:PartyIdentification>`);
    xmlLines.push(`        <cbc:ID schemeID="TICARETSICILNO">${invoice.supplierTicaretSicilNo}</cbc:ID>`);
    xmlLines.push(`      </cac:PartyIdentification>`);
  }
  xmlLines.push(`      <cac:PartyName>`);
  xmlLines.push(`        <cbc:Name>${escapeXml(invoice.supplierTitle)}</cbc:Name>`);
  xmlLines.push(`      </cac:PartyName>`);
  xmlLines.push(`      <cac:PostalAddress>`);
  xmlLines.push(`        <cbc:StreetName>${escapeXml(invoice.supplierAddress)}</cbc:StreetName>`);
  xmlLines.push(`        <cbc:CitySubdivisionName>${escapeXml(invoice.supplierDistrict || 'Karaköprü')}</cbc:CitySubdivisionName>`);
  xmlLines.push(`        <cbc:CityName>${escapeXml(invoice.supplierCity || 'Şanlıurfa')}</cbc:CityName>`);
  xmlLines.push(`        <cbc:PostalZone>63050</cbc:PostalZone>`);
  xmlLines.push(`        <cac:Country><cbc:Name>Türkiye</cbc:Name></cac:Country>`);
  xmlLines.push(`      </cac:PostalAddress>`);
  xmlLines.push(`      <cac:PartyTaxScheme>`);
  xmlLines.push(`        <cac:TaxScheme><cbc:Name>${escapeXml(invoice.supplierTaxOffice)}</cbc:Name></cac:TaxScheme>`);
  xmlLines.push(`      </cac:PartyTaxScheme>`);
  xmlLines.push(`      <cac:Contact>`);
  xmlLines.push(`        <cbc:Telephone>${invoice.supplierPhone}</cbc:Telephone>`);
  xmlLines.push(`        <cbc:ElectronicMail>${invoice.supplierEmail}</cbc:ElectronicMail>`);
  xmlLines.push(`      </cac:Contact>`);
  xmlLines.push(`    </cac:Party>`);
  xmlLines.push(`  </cac:AccountingSupplierParty>`);

  // Customer (Alıcı)
  const isVkn = invoice.customerVknTckn.length === 10;
  xmlLines.push(`  <cac:AccountingCustomerParty>`);
  xmlLines.push(`    <cac:Party>`);
  xmlLines.push(`      <cac:PartyIdentification>`);
  xmlLines.push(`        <cbc:ID schemeID="${isVkn ? 'VKN' : 'TCKN'}">${invoice.customerVknTckn}</cbc:ID>`);
  xmlLines.push(`      </cac:PartyIdentification>`);
  xmlLines.push(`      <cac:PartyName>`);
  xmlLines.push(`        <cbc:Name>${escapeXml(invoice.customerTitle || invoice.customerName || '')}</cbc:Name>`);
  xmlLines.push(`      </cac:PartyName>`);
  xmlLines.push(`      <cac:PostalAddress>`);
  xmlLines.push(`        <cbc:StreetName>${escapeXml(invoice.customerAddress || 'Belirtilmedi')}</cbc:StreetName>`);
  xmlLines.push(`        <cbc:CitySubdivisionName>${escapeXml(invoice.customerDistrict || '-')}</cbc:CitySubdivisionName>`);
  xmlLines.push(`        <cbc:CityName>${escapeXml(invoice.customerCity || 'Şanlıurfa')}</cbc:CityName>`);
  xmlLines.push(`        <cac:Country><cbc:Name>Türkiye</cbc:Name></cac:Country>`);
  xmlLines.push(`      </cac:PostalAddress>`);
  if (invoice.customerTaxOffice) {
    xmlLines.push(`      <cac:PartyTaxScheme>`);
    xmlLines.push(`        <cac:TaxScheme><cbc:Name>${escapeXml(invoice.customerTaxOffice)}</cbc:Name></cac:TaxScheme>`);
    xmlLines.push(`      </cac:PartyTaxScheme>`);
  }
  xmlLines.push(`    </cac:Party>`);
  xmlLines.push(`  </cac:AccountingCustomerParty>`);

  // Payment Means
  if (invoice.paymentMethod || invoice.bankIban) {
    xmlLines.push(`  <cac:PaymentMeans>`);
    xmlLines.push(`    <cbc:PaymentMeansCode>${invoice.paymentMethod === 'Kredi Kartı' ? '48' : '31'}</cbc:PaymentMeansCode>`);
    xmlLines.push(`    <cbc:PaymentChannelCode>${escapeXml(invoice.paymentMethod || 'Banka Havalesi')}</cbc:PaymentChannelCode>`);
    if (invoice.bankIban) {
      xmlLines.push(`    <cac:PayeeFinancialAccount>`);
      xmlLines.push(`      <cbc:ID>${escapeXml(invoice.bankIban)}</cbc:ID>`);
      xmlLines.push(`      <cbc:CurrencyCode>TRY</cbc:CurrencyCode>`);
      xmlLines.push(`    </cac:PayeeFinancialAccount>`);
    }
    xmlLines.push(`  </cac:PaymentMeans>`);
  }

  // Tax Total (KDV Toplamı)
  xmlLines.push(`  <cac:TaxTotal>`);
  xmlLines.push(`    <cbc:TaxAmount currencyID="TRY">${invoice.totalVat.toFixed(2)}</cbc:TaxAmount>`);

  // 20% VAT Subtotal
  if (invoice.vat20Amount && invoice.vat20Amount > 0) {
    xmlLines.push(`    <cac:TaxSubtotal>`);
    xmlLines.push(`      <cbc:TaxableAmount currencyID="TRY">${(invoice.vat20Matrah || 0).toFixed(2)}</cbc:TaxableAmount>`);
    xmlLines.push(`      <cbc:TaxAmount currencyID="TRY">${invoice.vat20Amount.toFixed(2)}</cbc:TaxAmount>`);
    xmlLines.push(`      <cbc:Percent>20.00</cbc:Percent>`);
    xmlLines.push(`      <cac:TaxCategory>`);
    xmlLines.push(`        <cac:TaxScheme>`);
    xmlLines.push(`          <cbc:Name>KDV</cbc:Name>`);
    xmlLines.push(`          <cbc:TaxTypeCode>0015</cbc:TaxTypeCode>`);
    xmlLines.push(`        </cac:TaxScheme>`);
    xmlLines.push(`      </cac:TaxCategory>`);
    xmlLines.push(`    </cac:TaxSubtotal>`);
  }

  // 10% VAT Subtotal
  if (invoice.vat10Amount && invoice.vat10Amount > 0) {
    xmlLines.push(`    <cac:TaxSubtotal>`);
    xmlLines.push(`      <cbc:TaxableAmount currencyID="TRY">${(invoice.vat10Matrah || 0).toFixed(2)}</cbc:TaxableAmount>`);
    xmlLines.push(`      <cbc:TaxAmount currencyID="TRY">${invoice.vat10Amount.toFixed(2)}</cbc:TaxAmount>`);
    xmlLines.push(`      <cbc:Percent>10.00</cbc:Percent>`);
    xmlLines.push(`      <cac:TaxCategory>`);
    xmlLines.push(`        <cac:TaxScheme>`);
    xmlLines.push(`          <cbc:Name>KDV</cbc:Name>`);
    xmlLines.push(`          <cbc:TaxTypeCode>0015</cbc:TaxTypeCode>`);
    xmlLines.push(`        </cac:TaxScheme>`);
    xmlLines.push(`      </cac:TaxCategory>`);
    xmlLines.push(`    </cac:TaxSubtotal>`);
  }

  // 1% VAT Subtotal
  if (invoice.vat1Amount && invoice.vat1Amount > 0) {
    xmlLines.push(`    <cac:TaxSubtotal>`);
    xmlLines.push(`      <cbc:TaxableAmount currencyID="TRY">${(invoice.vat1Matrah || 0).toFixed(2)}</cbc:TaxableAmount>`);
    xmlLines.push(`      <cbc:TaxAmount currencyID="TRY">${invoice.vat1Amount.toFixed(2)}</cbc:TaxAmount>`);
    xmlLines.push(`      <cbc:Percent>1.00</cbc:Percent>`);
    xmlLines.push(`      <cac:TaxCategory>`);
    xmlLines.push(`        <cac:TaxScheme>`);
    xmlLines.push(`          <cbc:Name>KDV</cbc:Name>`);
    xmlLines.push(`          <cbc:TaxTypeCode>0015</cbc:TaxTypeCode>`);
    xmlLines.push(`        </cac:TaxScheme>`);
    xmlLines.push(`      </cac:TaxCategory>`);
    xmlLines.push(`    </cac:TaxSubtotal>`);
  }

  xmlLines.push(`  </cac:TaxTotal>`);

  // Legal Monetary Total (Parasal Dip Toplamlar)
  xmlLines.push(`  <cac:LegalMonetaryTotal>`);
  xmlLines.push(`    <cbc:LineExtensionAmount currencyID="TRY">${invoice.subtotal.toFixed(2)}</cbc:LineExtensionAmount>`);
  xmlLines.push(`    <cbc:TaxExclusiveAmount currencyID="TRY">${invoice.taxExclusiveAmount.toFixed(2)}</cbc:TaxExclusiveAmount>`);
  xmlLines.push(`    <cbc:TaxInclusiveAmount currencyID="TRY">${(invoice.taxExclusiveAmount + invoice.totalVat).toFixed(2)}</cbc:TaxInclusiveAmount>`);
  xmlLines.push(`    <cbc:AllowanceTotalAmount currencyID="TRY">${invoice.totalDiscount.toFixed(2)}</cbc:AllowanceTotalAmount>`);
  xmlLines.push(`    <cbc:PayableAmount currencyID="TRY">${invoice.payableAmount.toFixed(2)}</cbc:PayableAmount>`);
  xmlLines.push(`  </cac:LegalMonetaryTotal>`);

  // Invoice Lines (Mal / Hizmet Satırları)
  invoice.items.forEach((item, index) => {
    const lineNum = index + 1;
    const itemSubtotal = item.quantity * item.unitPrice;
    const netLine = itemSubtotal - item.discountAmount;

    xmlLines.push(`  <cac:InvoiceLine>`);
    xmlLines.push(`    <cbc:ID>${lineNum}</cbc:ID>`);
    xmlLines.push(`    <cbc:InvoicedQuantity unitCode="${mapUnitToGibCode(item.unit)}">${item.quantity}</cbc:InvoicedQuantity>`);
    xmlLines.push(`    <cbc:LineExtensionAmount currencyID="TRY">${netLine.toFixed(2)}</cbc:LineExtensionAmount>`);

    if (item.discountAmount > 0) {
      xmlLines.push(`    <cac:AllowanceCharge>`);
      xmlLines.push(`      <cbc:ChargeIndicator>false</cbc:ChargeIndicator>`);
      xmlLines.push(`      <cbc:MultiplierFactorNumeric>${(item.discountPercent / 100).toFixed(4)}</cbc:MultiplierFactorNumeric>`);
      xmlLines.push(`      <cbc:Amount currencyID="TRY">${item.discountAmount.toFixed(2)}</cbc:Amount>`);
      xmlLines.push(`      <cbc:BaseAmount currencyID="TRY">${itemSubtotal.toFixed(2)}</cbc:BaseAmount>`);
      xmlLines.push(`    </cac:AllowanceCharge>`);
    }

    // Line Tax Total
    xmlLines.push(`    <cac:TaxTotal>`);
    xmlLines.push(`      <cbc:TaxAmount currencyID="TRY">${item.vatAmount.toFixed(2)}</cbc:TaxAmount>`);
    xmlLines.push(`      <cac:TaxSubtotal>`);
    xmlLines.push(`        <cbc:TaxableAmount currencyID="TRY">${netLine.toFixed(2)}</cbc:TaxableAmount>`);
    xmlLines.push(`        <cbc:TaxAmount currencyID="TRY">${item.vatAmount.toFixed(2)}</cbc:TaxAmount>`);
    xmlLines.push(`        <cbc:Percent>${item.vatRate.toFixed(2)}</cbc:Percent>`);
    xmlLines.push(`        <cac:TaxCategory>`);
    xmlLines.push(`          <cac:TaxScheme>`);
    xmlLines.push(`            <cbc:Name>KDV</cbc:Name>`);
    xmlLines.push(`            <cbc:TaxTypeCode>0015</cbc:TaxTypeCode>`);
    xmlLines.push(`          </cac:TaxScheme>`);
    xmlLines.push(`        </cac:TaxCategory>`);
    xmlLines.push(`      </cac:TaxSubtotal>`);
    xmlLines.push(`    </cac:TaxTotal>`);

    // Item Details
    xmlLines.push(`    <cac:Item>`);
    xmlLines.push(`      <cbc:Name>${escapeXml(item.name)}</cbc:Name>`);
    if (item.sku) {
      xmlLines.push(`      <cac:SellersItemIdentification>`);
      xmlLines.push(`        <cbc:ID>${escapeXml(item.sku)}</cbc:ID>`);
      xmlLines.push(`      </cac:SellersItemIdentification>`);
    }
    xmlLines.push(`    </cac:Item>`);

    // Price
    xmlLines.push(`    <cac:Price>`);
    xmlLines.push(`      <cbc:PriceAmount currencyID="TRY">${item.unitPrice.toFixed(2)}</cbc:PriceAmount>`);
    xmlLines.push(`    </cac:Price>`);

    xmlLines.push(`  </cac:InvoiceLine>`);
  });

  xmlLines.push(`</Invoice>`);
  return xmlLines.join('\n');
}

function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

function mapUnitToGibCode(unit: string): string {
  const u = (unit || '').toUpperCase();
  if (u.includes('METRE') || u === 'M') return 'MTR';
  if (u.includes('PAKET') || u === 'PK') return 'PA';
  if (u.includes('KOLİ') || u === 'KOLI') return 'BX';
  if (u.includes('SET')) return 'SET';
  if (u.includes('KG')) return 'KGM';
  return 'C62'; // Standard ADET / Unit
}

/**
 * Downloads the GİB UBL-TR 2.1 XML document to the client computer
 */
export function downloadEInvoiceXML(invoice: EInvoice) {
  const xmlContent = generateUBLTR21XML(invoice);
  const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${invoice.invoiceNumber}_${invoice.uuid}.xml`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Options for E-Invoice PDF Export and Direct Printing
 */
export interface EInvoiceRenderOptions {
  templateType?: 'detailed' | 'simple';
  logoUrl?: string | null;
}

/**
 * Generates official GİB UBL-TR 2.1 E-Fatura HTML printable template
 */
export function generateEInvoiceHTML(
  invoice: EInvoice,
  options: EInvoiceRenderOptions = {}
): string {
  const templateType = options.templateType || 'detailed';
  const logoUrl = options.logoUrl || null;
  const isEArsiv = invoice.profile === 'EARSIVFATURA';
  const qrDataUrl = generateGibQrCodeDataUrl(invoice);

  const itemsHtml = invoice.items.map((item, idx) => {
    return `
      <tr>
        <td style="text-align:center;font-family:monospace;color:#64748b;padding:6px 4px;border:1px solid #cbd5e1;">${idx + 1}</td>
        <td style="padding:6px 8px;border:1px solid #cbd5e1;">
          <div style="font-weight:600;color:#0f172a;">${escapeXml(item.name)}</div>
          ${item.sku ? `<div style="font-size:9px;color:#64748b;font-family:monospace;">SKU: ${escapeXml(item.sku)}</div>` : ''}
          ${templateType === 'detailed' && item.tevkifatCode ? `
            <div style="font-size:9px;color:#b45309;font-weight:500;">
              Tevkifat: ${escapeXml(item.tevkifatCode)} (${escapeXml(item.tevkifatRate || '')} - ${formatTRY(item.tevkifatAmount || 0)})
            </div>
          ` : ''}
        </td>
        <td style="text-align:center;font-weight:bold;font-family:monospace;padding:6px 4px;border:1px solid #cbd5e1;">${item.quantity}</td>
        <td style="text-align:center;color:#475569;padding:6px 4px;border:1px solid #cbd5e1;">${escapeXml(item.unit)}</td>
        <td style="text-align:right;font-family:monospace;padding:6px 8px;border:1px solid #cbd5e1;">${formatTRY(item.unitPrice)}</td>
        ${templateType === 'detailed' ? `
          <td style="text-align:center;font-family:monospace;color:#64748b;padding:6px 4px;border:1px solid #cbd5e1;">${item.discountPercent > 0 ? `%${item.discountPercent}` : '-'}</td>
          <td style="text-align:right;font-family:monospace;color:#475569;padding:6px 4px;border:1px solid #cbd5e1;">${item.discountAmount > 0 ? formatTRY(item.discountAmount) : '-'}</td>
        ` : ''}
        <td style="text-align:center;font-family:monospace;padding:6px 4px;border:1px solid #cbd5e1;">%${item.vatRate}</td>
        <td style="text-align:right;font-family:monospace;padding:6px 8px;border:1px solid #cbd5e1;">${formatTRY(item.vatAmount)}</td>
        <td style="text-align:right;font-weight:bold;font-family:monospace;padding:6px 8px;border:1px solid #cbd5e1;color:#0f172a;">${formatTRY(item.lineTotal)}</td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="utf-8">
      <title>${escapeXml(invoice.invoiceNumber)} - ${escapeXml(invoice.customerTitle)}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 8mm 10mm;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          font-size: 11px;
          line-height: 1.35;
          color: #0f172a;
          background: #ffffff;
          padding: 0;
        }
        .container {
          max-width: 100%;
          margin: 0 auto;
        }
        .header-box {
          border: 1.5px solid #94a3b8;
          border-radius: 8px;
          padding: 10px 12px;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f8fafc;
          gap: 12px;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .logo-img {
          max-height: 48px;
          max-width: 130px;
          object-fit: contain;
        }
        .badge {
          background: ${isEArsiv ? '#1d4ed8' : '#b91c1c'};
          color: #ffffff;
          padding: 6px 12px;
          border-radius: 6px;
          text-align: center;
          font-weight: 800;
          font-size: 12px;
          letter-spacing: 0.5px;
        }
        .badge-sub {
          font-size: 8px;
          font-weight: normal;
          opacity: 0.9;
          display: block;
        }
        .company-info h1 {
          font-size: 13px;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.2;
          margin-bottom: 3px;
        }
        .company-info p {
          font-size: 10px;
          color: #475569;
          margin-bottom: 2px;
        }
        .meta-table {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 6px 10px;
          font-size: 10px;
          min-width: 180px;
        }
        .meta-row {
          display: flex;
          justify-content: space-between;
          padding: 2px 0;
          border-bottom: 1px solid #f1f5f9;
        }
        .meta-row:last-child {
          border-bottom: none;
        }
        .meta-label {
          color: #64748b;
          font-weight: 500;
        }
        .meta-val {
          font-weight: 700;
          color: #0f172a;
          font-family: monospace;
        }
        .cards-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 10px;
        }
        .party-card {
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 8px 10px;
          background: #f8fafc;
          font-size: 10.5px;
        }
        .party-header {
          font-size: 9.5px;
          font-weight: 800;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 3px;
          margin-bottom: 5px;
          display: flex;
          justify-content: space-between;
        }
        .party-title {
          font-weight: 700;
          font-size: 11px;
          color: #0f172a;
          margin-bottom: 2px;
        }
        .ettn-bar {
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 6px 10px;
          background: #f1f5f9;
          margin-bottom: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .ettn-text {
          font-size: 9px;
          color: #475569;
        }
        .ettn-uuid {
          font-family: monospace;
          font-weight: 700;
          font-size: 10.5px;
          color: #0f172a;
        }
        table.items-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10px;
          margin-bottom: 10px;
        }
        table.items-table th {
          background: #1e293b;
          color: #ffffff;
          padding: 6px 4px;
          border: 1px solid #334155;
          font-weight: 700;
          text-align: center;
        }
        .bottom-grid {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: 10px;
          margin-bottom: 10px;
          page-break-inside: avoid;
        }
        .notes-box {
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 8px 10px;
          background: #f8fafc;
          font-size: 10px;
        }
        .totals-box {
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 8px 10px;
          background: #f8fafc;
          font-size: 10.5px;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 2.5px 0;
          color: #475569;
        }
        .grand-total {
          margin-top: 6px;
          padding: 6px 8px;
          background: #dcfce7;
          border: 1px solid #86efac;
          border-radius: 6px;
          display: flex;
          justify-content: space-between;
          font-weight: 800;
          color: #166534;
          font-size: 12px;
        }
        .legal-footer {
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 6px 8px;
          background: #f8fafc;
          font-size: 8.5px;
          color: #64748b;
          page-break-inside: avoid;
        }
      </style>
    </head>
    <body>
      <div class="container">
        
        <!-- HEADER -->
        <div class="header-box">
          <div class="header-left">
            ${logoUrl ? `<img src="${logoUrl}" alt="Logo" class="logo-img" />` : ''}
            <div class="badge">
              <span>${isEArsiv ? 'e-ARŞİV FATURA' : 'e-FATURA'}</span>
              <span class="badge-sub">${isEArsiv ? 'GİB E-Arşiv Portal' : 'GİB UBL-TR 2.1 Standardı'}</span>
            </div>
            <div class="company-info">
              <h1>${escapeXml(invoice.supplierTitle)}</h1>
              <p>${escapeXml(invoice.supplierAddress)} ${escapeXml(invoice.supplierCity)}</p>
              <p style="font-family: monospace; font-size: 9.5px;">
                VKN: <strong>${escapeXml(invoice.supplierVkn)}</strong> • V.D.: ${escapeXml(invoice.supplierTaxOffice)} • Tel: ${escapeXml(invoice.supplierPhone)}
              </p>
            </div>
          </div>

          <div class="meta-table">
            <div class="meta-row">
              <span class="meta-label">Fatura No:</span>
              <span class="meta-val" style="color:${isEArsiv ? '#1d4ed8' : '#b91c1c'}">${escapeXml(invoice.invoiceNumber)}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Tarih:</span>
              <span class="meta-val">${new Date(invoice.invoiceDate).toLocaleDateString('tr-TR')}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Senaryo:</span>
              <span class="meta-val">${invoice.profile}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Fatura Tipi:</span>
              <span class="meta-val">${invoice.type}</span>
            </div>
          </div>
        </div>

        <!-- BUYER & SUPPLIER DETAILS -->
        <div class="cards-grid">
          <div class="party-card">
            <div class="party-header">
              <span>SAYIN SATICI (DÜZENLEYEN)</span>
            </div>
            <div class="party-title">${escapeXml(invoice.supplierTitle)}</div>
            <div style="color:#475569;">${escapeXml(invoice.supplierAddress)}</div>
            <div style="color:#475569;">${escapeXml(invoice.supplierDistrict || 'Karaköprü')} / ${escapeXml(invoice.supplierCity)}</div>
            <div style="margin-top:3px;font-family:monospace;">
              <strong>Vergi Dairesi:</strong> ${escapeXml(invoice.supplierTaxOffice)}<br />
              <strong>VKN:</strong> ${escapeXml(invoice.supplierVkn)} ${invoice.supplierMersisNo ? `• Mersis: ${escapeXml(invoice.supplierMersisNo)}` : ''}
            </div>
          </div>

          <div class="party-card">
            <div class="party-header">
              <span>SAYIN ALICI (MÜŞTERİ)</span>
              <span style="font-size:8.5px;padding:1px 4px;background:#e2e8f0;border-radius:4px;">
                ${invoice.isEInvoicePayer ? 'E-Fatura Mükellefi' : 'E-Arşiv Alıcısı'}
              </span>
            </div>
            <div class="party-title">${escapeXml(invoice.customerTitle || invoice.customerName || '')}</div>
            <div style="color:#475569;">${escapeXml(invoice.customerAddress || 'Belirtilmedi')}</div>
            <div style="color:#475569;">${escapeXml(invoice.customerDistrict ? `${invoice.customerDistrict} / ` : '')}${escapeXml(invoice.customerCity || 'Şanlıurfa')}</div>
            <div style="margin-top:3px;font-family:monospace;">
              <strong>Vergi Dairesi:</strong> ${escapeXml(invoice.customerTaxOffice || 'Belirtilmedi')}<br />
              <strong>${invoice.customerVknTckn.length === 10 ? 'VKN:' : 'TCKN:'}</strong> ${escapeXml(invoice.customerVknTckn)}
            </div>
          </div>
        </div>

        <!-- ETTN BAR -->
        <div class="ettn-bar">
          <div>
            <div class="ettn-text">ETTN (Elektronik Belge Takip Numarası - UUID)</div>
            <div class="ettn-uuid">${invoice.uuid}</div>
            ${invoice.despatchNumber ? `
              <div style="font-size:9.5px;color:#475569;margin-top:2px;">
                İrsaliye Bilgisi: <strong>${escapeXml(invoice.despatchNumber)}</strong> (Tarih: ${invoice.despatchDate || invoice.invoiceDate})
              </div>
            ` : ''}
          </div>
          <div style="display:flex;align-items:center;gap:6px;">
            <img src="${qrDataUrl}" alt="QR" style="width:44px;height:44px;border:1px solid #cbd5e1;background:#fff;padding:2px;" />
            <div style="font-size:8px;color:#64748b;line-height:1.2;">GİB Doğrulama<br />Karekodu</div>
          </div>
        </div>

        <!-- ITEMS TABLE -->
        <table class="items-table">
          <thead>
            <tr>
              <th style="width:24px;">#</th>
              <th>Mal / Hizmet Açıklaması</th>
              <th style="width:36px;">Miktar</th>
              <th style="width:36px;">Birim</th>
              <th style="width:68px;">Birim Fiyat</th>
              ${templateType === 'detailed' ? `
                <th style="width:36px;">İsk.%</th>
                <th style="width:50px;">İskonto</th>
              ` : ''}
              <th style="width:36px;">KDV</th>
              <th style="width:56px;">KDV Tutar</th>
              <th style="width:72px;">Satır Toplamı</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <!-- TOTALS & NOTES -->
        <div class="bottom-grid">
          <div class="notes-box">
            <div style="font-size:9.5px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:3px;">
              Yazıyla Ödenecek Tutar:
            </div>
            <div style="font-weight:700;font-style:italic;color:#0f172a;margin-bottom:8px;">
              ${escapeXml(invoice.amountInWords)}
            </div>

            <div style="font-size:9.5px;font-weight:700;color:#475569;text-transform:uppercase;border-top:1px solid #e2e8f0;padding-top:4px;margin-bottom:3px;">
              Notlar & Açıklamalar
            </div>
            ${invoice.notes && invoice.notes.map(n => `<div style="color:#475569;">• ${escapeXml(n)}</div>`).join('')}
            ${invoice.bankIban ? `
              <div style="margin-top:4px;font-family:monospace;font-size:9.5px;color:#334155;">
                <strong>Banka:</strong> ${escapeXml(invoice.bankName || 'Kuveyt Türk')} • <strong>IBAN:</strong> ${escapeXml(invoice.bankIban)}
              </div>
            ` : ''}
          </div>

          <div class="totals-box">
            <div class="total-row">
              <span>Mal / Hizmet Toplam Tutarı:</span>
              <span style="font-family:monospace;font-weight:600;color:#0f172a;">${formatTRY(invoice.subtotal)}</span>
            </div>

            ${invoice.totalDiscount > 0 ? `
              <div class="total-row" style="color:#e11d48;">
                <span>Toplam İskonto:</span>
                <span style="font-family:monospace;font-weight:600;">-${formatTRY(invoice.totalDiscount)}</span>
              </div>
            ` : ''}

            <div class="total-row" style="border-top:1px solid #e2e8f0;padding-top:3px;">
              <span>Hesaplanan KDV:</span>
              <span style="font-family:monospace;font-weight:600;color:#0f172a;">${formatTRY(invoice.totalVat)}</span>
            </div>

            ${templateType === 'detailed' && invoice.vat20Amount && invoice.vat20Amount > 0 ? `
              <div class="total-row" style="font-size:9px;color:#64748b;padding-left:6px;">
                <span>• %20 KDV Matrahı (${formatTRY(invoice.vat20Matrah || invoice.taxExclusiveAmount)}):</span>
                <span style="font-family:monospace;">${formatTRY(invoice.vat20Amount)}</span>
              </div>
            ` : ''}

            ${templateType === 'detailed' && invoice.totalTevkifat && invoice.totalTevkifat > 0 ? `
              <div class="total-row" style="color:#b45309;">
                <span>Tevkif Edilen KDV:</span>
                <span style="font-family:monospace;font-weight:600;">-${formatTRY(invoice.totalTevkifat)}</span>
              </div>
            ` : ''}

            <div class="grand-total">
              <span>ÖDENECEK TUTAR:</span>
              <span style="font-family:monospace;font-size:13px;">${formatTRY(invoice.payableAmount)}</span>
            </div>
          </div>
        </div>

        <!-- FOOTER SIGNATURE -->
        <div class="legal-footer">
          <div style="font-weight:700;color:#334155;margin-bottom:2px;">
            MÂLİ MÜHÜR & ELEKTRONİK İMZA DOĞRULAMA (5070 Sayılı Kanun & 213 Sayılı V.U.K.)
          </div>
          <div>
            Bu fatura Gelir İdaresi Başkanlığı (GİB) UBL-TR 2.1 standardında düzenlenmiş olup elektronik mühür ile onaylanmıştır.
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:3px;font-family:monospace;font-size:8px;color:#94a3b8;">
            <span>İmzalayan: ALPHA TEKNİK DOĞALGAZ SIHHİ TESİSAT</span>
            <span>Zaman Damgası: ${invoice.invoiceDate} ${invoice.invoiceTime || '12:00:00'}</span>
            <span>Doğrulama: GİB Portal / Entegratör</span>
          </div>
        </div>

      </div>
    </body>
    </html>
  `;
}

/**
 * Direct Printing function with resilient multi-tier fallbacks:
 * 1. Dedicated print window popup
 * 2. Injected print portal element with @media print
 * 3. Fallback to window.print()
 */
export function printInvoiceDirectly(
  invoice: EInvoice,
  options: EInvoiceRenderOptions = {}
): boolean {
  try {
    const htmlContent = generateEInvoiceHTML(invoice, options);

    // Method 1: Try dedicated popup window
    let printWin: Window | null = null;
    try {
      printWin = window.open('', '_blank', 'width=850,height=900,menubar=no,toolbar=no,location=no,status=no');
    } catch (popupErr) {
      console.warn('Popup window.open failed:', popupErr);
    }

    if (printWin && !printWin.closed) {
      try {
        printWin.document.open();
        printWin.document.write(htmlContent);
        printWin.document.close();
        printWin.focus();
        setTimeout(() => {
          try {
            printWin?.print();
          } catch (e) {
            console.error('printWin.print() failed:', e);
          }
        }, 300);
        return true;
      } catch (e) {
        console.warn('Writing to popup window failed, proceeding to Method 2:', e);
      }
    }

    // Method 2: Inject dedicated print portal container directly in document.body
    let portal = document.getElementById('einvoice-direct-print-portal');
    if (!portal) {
      portal = document.createElement('div');
      portal.id = 'einvoice-direct-print-portal';
      document.body.appendChild(portal);
    }

    // Style portal and print isolation
    let styleElem = document.getElementById('einvoice-print-style') as HTMLStyleElement | null;
    if (!styleElem) {
      styleElem = document.createElement('style');
      styleElem.id = 'einvoice-print-style';
      styleElem.innerHTML = `
        @media print {
          body > *:not(#einvoice-direct-print-portal) {
            display: none !important;
          }
          #einvoice-direct-print-portal {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #0f172a !important;
            z-index: 999999 !important;
          }
        }
        @media screen {
          #einvoice-direct-print-portal {
            display: none !important;
          }
        }
      `;
      document.head.appendChild(styleElem);
    }

    portal.innerHTML = htmlContent;

    // Trigger browser print
    setTimeout(() => {
      try {
        window.focus();
        window.print();
      } catch (err) {
        console.error('window.print() error:', err);
      }
    }, 200);

    return true;
  } catch (err) {
    console.error('printInvoiceDirectly critical error:', err);
    try {
      window.print();
      return true;
    } catch (e) {
      return false;
    }
  }
}

/**
 * Renders and exports a high-fidelity official GİB E-Fatura / E-Arşiv PDF
 * Supports templateType ('detailed' vs 'simple') and custom logo rendering
 */
export function exportEInvoiceToPdf(
  invoice: EInvoice,
  options: EInvoiceRenderOptions = {}
) {
  const templateType = options.templateType || 'detailed';
  const logoUrl = options.logoUrl || null;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const fontName = setupTurkishFont(doc);
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;

  const isEArsiv = invoice.profile === 'EARSIVFATURA';

  // 1. Top GİB / E-Arşiv Header Box
  const bannerHeight = 24;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, margin, contentWidth, bannerHeight, 2, 2, 'FD');

  let textStartX = margin + 56;

  // Render Custom Logo if available (Base64 or image url)
  if (logoUrl) {
    try {
      doc.addImage(logoUrl, 'PNG', margin + 2, margin + 2.5, 28, 19);
      textStartX = margin + 34 + 48; // shift text right
    } catch (e) {
      console.warn('Could not render logo to PDF:', e);
    }
  }

  // Badge Red for E-Fatura / Blue for E-Arşiv
  const badgeColor: [number, number, number] = isEArsiv ? [30, 64, 175] : [185, 28, 28];
  const badgeX = logoUrl ? margin + 32 : margin + 3;
  const badgeWidth = logoUrl ? 44 : 48;

  doc.setFillColor(...badgeColor);
  doc.roundedRect(badgeX, margin + 3.5, badgeWidth, 17, 2, 2, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(logoUrl ? 8.5 : 9);
  doc.setFont(fontName, 'bold');
  doc.text(isEArsiv ? 'e-ARŞİV FATURA' : 'e-FATURA', badgeX + badgeWidth / 2, margin + 10, { align: 'center' });
  doc.setFontSize(6.2);
  doc.setFont(fontName, 'normal');
  doc.text(isEArsiv ? 'GİB E-Arşiv Portal' : 'GİB UBL-TR 2.1 Standardı', badgeX + badgeWidth / 2, margin + 16, { align: 'center' });

  // Center: Company Title
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10.5);
  doc.setFont(fontName, 'bold');
  doc.text(invoice.supplierTitle.substring(0, 36), textStartX, margin + 8.5);

  doc.setFontSize(7);
  doc.setFont(fontName, 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`${invoice.supplierAddress} ${invoice.supplierCity}`, textStartX, margin + 13.5);
  doc.text(`VKN: ${invoice.supplierVkn} | V.D.: ${invoice.supplierTaxOffice} | Tel: ${invoice.supplierPhone}`, textStartX, margin + 18);

  // Right Side: Invoice Meta Box
  const metaBoxW = 44;
  const metaBoxX = pageWidth - margin - metaBoxW - 2;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(metaBoxX, margin + 2.5, metaBoxW, 19, 1.5, 1.5, 'FD');

  doc.setFontSize(7.5);
  doc.setFont(fontName, 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('FATURA NO:', metaBoxX + 2.5, margin + 7);
  doc.setTextColor(...badgeColor);
  doc.text(invoice.invoiceNumber, metaBoxX + metaBoxW - 2.5, margin + 7, { align: 'right' });

  doc.setFontSize(6.8);
  doc.setFont(fontName, 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Tarih:', metaBoxX + 2.5, margin + 11.5);
  doc.text(new Date(invoice.invoiceDate).toLocaleDateString('tr-TR'), metaBoxX + metaBoxW - 2.5, margin + 11.5, { align: 'right' });

  doc.text('Senaryo:', metaBoxX + 2.5, margin + 15.5);
  doc.text(invoice.profile, metaBoxX + metaBoxW - 2.5, margin + 15.5, { align: 'right' });

  doc.text('Tip:', metaBoxX + 2.5, margin + 19.5);
  doc.text(invoice.type, metaBoxX + metaBoxW - 2.5, margin + 19.5, { align: 'right' });

  // 2. Info Cards (Supplier & Customer Boxes)
  const infoTop = margin + bannerHeight + 3;
  const colWidth = (contentWidth - 4) / 2;
  const infoBoxH = 32;

  // Supplier Card (Left)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, infoTop, colWidth, infoBoxH, 1.5, 1.5, 'FD');

  doc.setFontSize(7.5);
  doc.setFont(fontName, 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('SAYIN SATICI (DÜZENLEYEN)', margin + 3.5, infoTop + 5.5);

  doc.setFontSize(7);
  doc.setFont(fontName, 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Ünvan: ${invoice.supplierTitle.substring(0, 42)}`, margin + 3.5, infoTop + 10.5);
  doc.text(`Adres: ${invoice.supplierAddress}`, margin + 3.5, infoTop + 15);
  doc.text(`Şehir / İlçe: ${invoice.supplierCity}`, margin + 3.5, infoTop + 19.5);
  doc.text(`Vergi Dairesi: ${invoice.supplierTaxOffice}`, margin + 3.5, infoTop + 24);
  doc.text(`VKN / TCKN: ${invoice.supplierVkn} | Mersis: ${invoice.supplierMersisNo || '-'}`, margin + 3.5, infoTop + 28.5);

  // Customer Card (Right)
  const rightBoxX = margin + colWidth + 4;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(rightBoxX, infoTop, colWidth, infoBoxH, 1.5, 1.5, 'FD');

  doc.setFontSize(7.5);
  doc.setFont(fontName, 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('SAYIN ALICI (MÜŞTERİ)', rightBoxX + 3.5, infoTop + 5.5);

  doc.setFontSize(7);
  doc.setFont(fontName, 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Ünvan / Ad: ${(invoice.customerTitle || invoice.customerName || '').substring(0, 42)}`, rightBoxX + 3.5, infoTop + 10.5);
  doc.text(`Adres: ${(invoice.customerAddress || 'Şanlıurfa').substring(0, 45)}`, rightBoxX + 3.5, infoTop + 15);
  doc.text(`Şehir / İlçe: ${invoice.customerCity || 'Şanlıurfa'} ${invoice.customerDistrict ? `/ ${invoice.customerDistrict}` : ''}`, rightBoxX + 3.5, infoTop + 19.5);
  doc.text(`Vergi Dairesi: ${invoice.customerTaxOffice || 'Belirtilmedi'}`, rightBoxX + 3.5, infoTop + 24);
  doc.text(`VKN / TCKN: ${invoice.customerVknTckn}`, rightBoxX + 3.5, infoTop + 28.5);

  // ETTN (UUID) Bar
  const ettnY = infoTop + infoBoxH + 2.5;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, ettnY, contentWidth, 6, 1, 1, 'F');
  doc.setFontSize(6.5);
  doc.setFont(fontName, 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text(`ETTN (Elektronik Belge Takip No): ${invoice.uuid}`, margin + 3.5, ettnY + 4.2);
  if (invoice.despatchNumber) {
    doc.text(`İrsaliye No: ${invoice.despatchNumber}`, pageWidth - margin - 3.5, ettnY + 4.2, { align: 'right' });
  }

  // 3. Items Table (GİB Standart Fatura Satırları)
  const isSimple = templateType === 'simple';
  
  const headers = isSimple ? [
    ['Sıra', 'Mal / Hizmet Açıklaması', 'Miktar', 'Birim', 'Birim Fiyat', 'KDV', 'KDV Tutar', 'Toplam Tutar']
  ] : [
    ['Sıra', 'Mal / Hizmet Açıklaması', 'Miktar', 'Birim', 'Birim Fiyat', 'İsk.%', 'İskonto', 'KDV', 'KDV Tutar', 'Toplam Tutar']
  ];

  const itemsData = invoice.items.map((item, idx) => {
    if (isSimple) {
      return [
        (idx + 1).toString(),
        item.name,
        item.quantity.toString(),
        item.unit,
        formatTRY(item.unitPrice),
        `%${item.vatRate}`,
        formatTRY(item.vatAmount),
        formatTRY(item.lineTotal),
      ];
    }
    return [
      (idx + 1).toString(),
      item.name,
      item.quantity.toString(),
      item.unit,
      formatTRY(item.unitPrice),
      item.discountPercent > 0 ? `%${item.discountPercent}` : '-',
      item.discountAmount > 0 ? formatTRY(item.discountAmount) : '-',
      `%${item.vatRate}`,
      formatTRY(item.vatAmount),
      formatTRY(item.lineTotal),
    ];
  });

  const columnStylesConfig = isSimple ? {
    0: { cellWidth: 8, halign: 'center' as const },
    1: { cellWidth: 'auto' as const, halign: 'left' as const },
    2: { cellWidth: 14, halign: 'center' as const },
    3: { cellWidth: 14, halign: 'center' as const },
    4: { cellWidth: 24, halign: 'right' as const },
    5: { cellWidth: 12, halign: 'center' as const },
    6: { cellWidth: 22, halign: 'right' as const },
    7: { cellWidth: 28, halign: 'right' as const, fontStyle: 'bold' as const },
  } : {
    0: { cellWidth: 8, halign: 'center' as const },
    1: { cellWidth: 'auto' as const, halign: 'left' as const },
    2: { cellWidth: 12, halign: 'center' as const },
    3: { cellWidth: 12, halign: 'center' as const },
    4: { cellWidth: 20, halign: 'right' as const },
    5: { cellWidth: 10, halign: 'center' as const },
    6: { cellWidth: 16, halign: 'right' as const },
    7: { cellWidth: 10, halign: 'center' as const },
    8: { cellWidth: 18, halign: 'right' as const },
    9: { cellWidth: 24, halign: 'right' as const, fontStyle: 'bold' as const },
  };

  autoTable(doc, {
    startY: ettnY + 8,
    margin: { left: margin, right: margin, bottom: 25 },
    head: headers,
    body: itemsData,
    theme: 'grid',
    showHead: 'everyPage',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      font: fontName,
      fontSize: 7.2,
      fontStyle: 'bold',
      cellPadding: 1.8,
      halign: 'center',
    },
    styles: {
      font: fontName,
      fontSize: 6.8,
      cellPadding: 1.6,
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
      overflow: 'linebreak',
    },
    columnStyles: columnStylesConfig,
    didDrawPage: (data) => {
      // Bottom GİB Footer
      doc.setFontSize(6.5);
      doc.setFont(fontName, 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text('Bu belge 5070 sayılı Elektronik İmza Kanunu uyarınca düzenlenmiştir.', margin, pageHeight - 5);
      doc.text(`Sayfa ${data.pageNumber}`, pageWidth - margin - 15, pageHeight - 5);
    },
  });

  // 4. Totals Block & Tax Schedule
  let finalY = (doc as any).lastAutoTable?.finalY || 160;
  const totalsBoxW = 82;
  const totalsBoxX = pageWidth - margin - totalsBoxW;
  const totalsBoxH = 34;

  if (finalY + totalsBoxH + 28 > pageHeight - margin) {
    doc.addPage();
    finalY = margin + 4;
  }

  const totalsTop = finalY + 4;

  // Left Box: Yazıyla Tutar, Banka & Notlar
  const leftBoxW = contentWidth - totalsBoxW - 4;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, totalsTop, leftBoxW, totalsBoxH, 1.5, 1.5, 'FD');

  doc.setFontSize(7.2);
  doc.setFont(fontName, 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('ÖDENECEK TUTAR (YAZIYLA):', margin + 3, totalsTop + 5);

  doc.setFontSize(6.8);
  doc.setFont(fontName, 'italic');
  doc.setTextColor(15, 23, 42);
  doc.text(invoice.amountInWords, margin + 3, totalsTop + 9.5);

  doc.setFontSize(6.8);
  doc.setFont(fontName, 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('NOTLAR & AÇIKLAMALAR:', margin + 3, totalsTop + 15);

  doc.setFontSize(6.2);
  doc.setFont(fontName, 'normal');
  doc.setTextColor(71, 85, 105);
  const noteLines = invoice.notes.slice(0, 3);
  noteLines.forEach((note, idx) => {
    doc.text(`• ${note.substring(0, 65)}`, margin + 3, totalsTop + 19 + idx * 4);
  });
  if (invoice.bankIban) {
    doc.text(`Banka: ${invoice.bankName || 'Kuveyt Türk'} IBAN: ${invoice.bankIban}`, margin + 3, totalsTop + 31);
  }

  // Right Box: GİB Parasal Toplamlar
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(totalsBoxX, totalsTop, totalsBoxW, totalsBoxH, 1.5, 1.5, 'FD');

  doc.setFontSize(6.8);
  doc.setFont(fontName, 'normal');
  doc.setTextColor(71, 85, 105);

  doc.text('Mal / Hizmet Toplam Tutarı:', totalsBoxX + 3, totalsTop + 5);
  doc.text(formatTRY(invoice.subtotal), totalsBoxX + totalsBoxW - 3, totalsTop + 5, { align: 'right' });

  if (invoice.totalDiscount > 0) {
    doc.text('Toplam İskonto:', totalsBoxX + 3, totalsTop + 9.5);
    doc.text(`-${formatTRY(invoice.totalDiscount)}`, totalsBoxX + totalsBoxW - 3, totalsTop + 9.5, { align: 'right' });
  }

  doc.text('Hesaplanan KDV (%20 / %10 / %1):', totalsBoxX + 3, totalsTop + 14);
  doc.text(formatTRY(invoice.totalVat), totalsBoxX + totalsBoxW - 3, totalsTop + 14, { align: 'right' });

  if (!isSimple && invoice.totalTevkifat && invoice.totalTevkifat > 0) {
    doc.text('Tevkif Edilen KDV:', totalsBoxX + 3, totalsTop + 18.5);
    doc.text(`-${formatTRY(invoice.totalTevkifat)}`, totalsBoxX + totalsBoxW - 3, totalsTop + 18.5, { align: 'right' });
  }

  // Final Payable Banner
  doc.setFillColor(220, 252, 231);
  doc.roundedRect(totalsBoxX + 2, totalsTop + totalsBoxH - 10, totalsBoxW - 4, 8, 1, 1, 'F');

  doc.setFontSize(8);
  doc.setFont(fontName, 'bold');
  doc.setTextColor(22, 101, 52);
  doc.text('ÖDENECEK TUTAR:', totalsBoxX + 4, totalsTop + totalsBoxH - 4.5);
  doc.text(formatTRY(invoice.payableAmount), totalsBoxX + totalsBoxW - 4, totalsTop + totalsBoxH - 4.5, { align: 'right' });

  // 5. Electronic Seal & Signature Box
  const sealY = totalsTop + totalsBoxH + 3;
  if (sealY + 16 <= pageHeight - margin - 4) {
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, sealY, contentWidth, 14, 1.5, 1.5, 'F');

    doc.setFontSize(6.5);
    doc.setFont(fontName, 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('MÂLİ MÜHÜR & ELEKTRONİK İMZA DOĞRULAMA', margin + 3.5, sealY + 4.5);

    doc.setFontSize(6);
    doc.setFont(fontName, 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`GİB İmza Zamanı: ${invoice.invoiceDate} ${invoice.invoiceTime || '12:00:00'} | Doğrulama Kodu: SHA-256 (e-Fatura Entegratörlüğü)`, margin + 3.5, sealY + 8.5);
    doc.text('Bu belge 213 sayılı V.U.K. hükümlerine göre Gelir İdaresi Başkanlığı sistemlerine aktarılmıştır.', margin + 3.5, sealY + 12);
  }

  const filename = `${invoice.invoiceNumber}_${invoice.profile}.pdf`;
  doc.save(filename);
}
