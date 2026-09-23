import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Product } from '../../types';
import {
  Barcode as BarcodeIcon,
  Printer,
  Download,
  X,
  Search,
  CheckSquare,
  Square,
  Layers,
  Settings2,
  Tag,
  Eye,
  RefreshCw,
  Sliders,
  Copy,
  Check,
  Building,
  DollarSign,
  QrCode,
  FileSpreadsheet,
  AlertCircle,
  ExternalLink,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  Code
} from 'lucide-react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import { playNotificationSound } from '../../lib/audio';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import { RulerCanvas } from './barcodeStudio/RulerCanvas';
import { PropertyInspector } from './barcodeStudio/PropertyInspector';
import { DEFAULT_LABEL_CONFIG, STUDIO_PRESETS } from './barcodeStudio/presets';
import { LabelStudioConfig } from './barcodeStudio/types';
import { generateZplCode } from './barcodeStudio/zplGenerator';

export type PaperPreset = 'a4-24' | 'a4-40' | 'a4-14' | 'shelf-talker' | 'thermal-80x50' | 'thermal-50x30' | 'thermal-100x150';
export type BarcodeType = 'CODE128' | 'EAN13' | 'QR' | 'DUAL';

interface BarcodeGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  initialSelectedProductIds?: string[];
}

// Helper: Calculate valid 13-digit EAN-13 barcode with checksum
export function getValidEAN13(val: string): { code: string; isValidEan: boolean } {
  const digitsOnly = val.replace(/\D/g, '');
  if (digitsOnly.length === 13) {
    return { code: digitsOnly, isValidEan: true };
  }
  if (digitsOnly.length === 12) {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const d = parseInt(digitsOnly[i], 10);
      sum += i % 2 === 0 ? d : d * 3;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return { code: `${digitsOnly}${checkDigit}`, isValidEan: true };
  }
  // Generate deterministic 12 digits from string with 869 prefix (TR GS1 standard)
  let hashNum = 0;
  for (let i = 0; i < val.length; i++) {
    hashNum = (hashNum * 31 + val.charCodeAt(i)) % 100000000;
  }
  const padded = `869${String(hashNum).padStart(9, '0')}`;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const d = parseInt(padded[i], 10);
    sum += i % 2 === 0 ? d : d * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return { code: `${padded}${checkDigit}`, isValidEan: true };
}

export default function BarcodeGeneratorModal({
  isOpen,
  onClose,
  products = [],
  initialSelectedProductIds = [],
}: BarcodeGeneratorModalProps) {
  useModalBehavior(isOpen, onClose);
  // Selection State: Map of productId -> quantity
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK'>('ALL');

  // Label Layout & Format Settings
  const [paperPreset, setPaperPreset] = useState<PaperPreset>('a4-24');
  const [barcodeType, setBarcodeType] = useState<BarcodeType>('CODE128');
  
  // Customization Toggles
  const [companyHeader, setCompanyHeader] = useState('ALPHA TEKNİK');
  const [showCompanyHeader, setShowCompanyHeader] = useState(true);
  const [showProductName, setShowProductName] = useState(true);
  const [showSku, setShowSku] = useState(true);
  const [showBarcodeText, setShowBarcodeText] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [priceType, setPriceType] = useState<'retail' | 'wholesale' | 'both'>('retail');
  const [showVatInfo, setShowVatInfo] = useState(true);
  const [showUnit, setShowUnit] = useState(true);
  const [showCategory, setShowCategory] = useState(true);
  
  // Active View Tab: 'select' | 'studio' | 'preview'
  const [activeTab, setActiveTab] = useState<'select' | 'studio' | 'preview'>('select');
  const [studioConfig, setStudioConfig] = useState<LabelStudioConfig>(DEFAULT_LABEL_CONFIG);
  const [studioPreviewProductId, setStudioPreviewProductId] = useState<string>('');
  const [copiedZpl, setCopiedZpl] = useState(false);
  const [studioZoom, setStudioZoom] = useState<number>(100);
  
  // Mobile sub-tab in preview mode: 'preview' | 'settings'
  const [mobilePreviewTab, setMobilePreviewTab] = useState<'preview' | 'settings'>('preview');
  // Preview Zoom level in %
  const [previewZoom, setPreviewZoom] = useState<number>(100);

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printSuccessMessage, setPrintSuccessMessage] = useState<string | null>(null);

  // Hidden print iframe ref
  const printAreaRef = useRef<HTMLDivElement>(null);

  const safeProducts = Array.isArray(products) ? products : [];

  const studioPreviewProduct = useMemo(() => {
    if (studioPreviewProductId) {
      const found = safeProducts.find(p => p.id === studioPreviewProductId);
      if (found) return found;
    }
    const selectedIds = Object.keys(selectedItems);
    if (selectedIds.length > 0) {
      const found = safeProducts.find(p => p.id === selectedIds[0]);
      if (found) return found;
    }
    return safeProducts[0] || ({
      id: 'demo-1',
      name: 'Endüstriyel Küresel Vana DN50 PN16 Tam Geçişli',
      sku: 'ST-KUV-DN50',
      barcode: '8690123456789',
      price: 1450.00,
      category: 'Vanalar',
      stock: 45,
      unit: 'ADET'
    } as Product);
  }, [studioPreviewProductId, safeProducts, selectedItems]);

  const handleCopyZpl = async () => {
    if (!studioPreviewProduct) return;
    const zpl = generateZplCode(studioPreviewProduct, studioConfig);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(zpl);
        setCopiedZpl(true);
        playNotificationSound('success');
        setTimeout(() => setCopiedZpl(false), 2200);
      }
    } catch {
      console.warn('Pano kopyalama engellendi');
    }
  };

  // Prevent background body scrolling when modal is open
  // Ham scroll kilidi KALDIRILDI (18.09.2026): bu bilesende zaten
  // useModalBehavior calisiyor; ikinci bir ham kilit sayaci bozuyordu.

  // Initialize selection when opened
  useEffect(() => {
    if (isOpen) {
      if (initialSelectedProductIds && initialSelectedProductIds.length > 0) {
        const initialMap: Record<string, number> = {};
        initialSelectedProductIds.forEach(id => {
          initialMap[id] = 1;
        });
        setSelectedItems(initialMap);
        setActiveTab('preview');
      } else if (Object.keys(selectedItems).length === 0 && safeProducts.length > 0) {
        // Default select first 12 products for quick start demo
        const defaultMap: Record<string, number> = {};
        safeProducts.slice(0, 12).forEach(p => {
          defaultMap[p.id] = 1;
        });
        setSelectedItems(defaultMap);
      }
    }
  }, [isOpen, initialSelectedProductIds, safeProducts]);

  const categories = ['ALL', ...Array.from(new Set(safeProducts.map(p => p.category)))];

  // Filtered Products for Selection List
  const filteredProducts = useMemo(() => {
    return safeProducts.filter(p => {
      if (!p) return false;
      const matchSearch =
        (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.sku || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.barcode && p.barcode.includes(searchTerm));
      const matchCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
      const matchStock =
        stockFilter === 'ALL' ||
        (stockFilter === 'IN_STOCK' && p.stock > 0) ||
        (stockFilter === 'LOW_STOCK' && p.stock <= 5);
      return matchSearch && matchCategory && matchStock;
    });
  }, [safeProducts, searchTerm, selectedCategory, stockFilter]);

  // Flattened Label List for Print/Preview based on item quantities
  const labelList = useMemo(() => {
    const list: Product[] = [];
    Object.entries(selectedItems).forEach(([pId, rawQty]) => {
      const qty = Number(rawQty) || 0;
      if (qty > 0) {
        const prod = safeProducts.find(p => p.id === pId);
        if (prod) {
          for (let i = 0; i < qty; i++) {
            list.push(prod);
          }
        }
      }
    });
    return list;
  }, [selectedItems, safeProducts]);

  const totalSelectedProducts = Object.values(selectedItems).filter(qty => Number(qty) > 0).length;
  const totalLabelsToPrint = labelList.length;

  // Toggle Single Product Selection
  const toggleSelectProduct = (productId: string) => {
    setSelectedItems(prev => {
      const current = prev[productId] || 0;
      if (current > 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      } else {
        return { ...prev, [productId]: 1 };
      }
    });
  };

  // Change Quantity for Single Product
  const updateProductQuantity = (productId: string, quantity: number) => {
    const val = Math.max(0, Math.min(500, quantity));
    setSelectedItems(prev => {
      if (val === 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: val };
    });
  };

  // Bulk Selection Actions
  const handleSelectAllFiltered = (qty: number = 1) => {
    setSelectedItems(prev => {
      const copy = { ...prev };
      filteredProducts.forEach(p => {
        copy[p.id] = qty;
      });
      return copy;
    });
  };

  const handleDeselectAllFiltered = () => {
    setSelectedItems(prev => {
      const copy = { ...prev };
      filteredProducts.forEach(p => {
        delete copy[p.id];
      });
      return copy;
    });
  };

  const handleSetQtyToStock = () => {
    setSelectedItems(prev => {
      const copy = { ...prev };
      filteredProducts.forEach(p => {
        if (p.stock > 0) {
          copy[p.id] = Math.min(200, p.stock);
        }
      });
      return copy;
    });
  };

  // Helper function to render a barcode image data URL asynchronously
  const getBarcodeDataUrl = (codeVal: string, bType: BarcodeType): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      try {
        if (bType === 'QR') {
          QRCode.toCanvas(canvas, codeVal, { width: 120, margin: 1 }, (err) => {
            if (!err) resolve(canvas.toDataURL('image/png'));
            else resolve('');
          });
        } else {
          let format = 'CODE128';
          let finalVal = codeVal;
          if (bType === 'EAN13') {
            const eanRes = getValidEAN13(codeVal);
            finalVal = eanRes.code;
            format = 'EAN13';
          }
          JsBarcode(canvas, finalVal, {
            format,
            width: 2,
            height: 40,
            displayValue: false,
            margin: 0,
            lineColor: '#000000',
          });
          resolve(canvas.toDataURL('image/png'));
        }
      } catch (e) {
        // Fallback to CODE128 if EAN13 fails
        try {
          JsBarcode(canvas, codeVal, {
            format: 'CODE128',
            width: 2,
            height: 40,
            displayValue: false,
            margin: 0,
          });
          resolve(canvas.toDataURL('image/png'));
        } catch {
          resolve('');
        }
      }
    });
  };

  // Dedicated Robust Print Engine (Hidden Iframe / Popup Window)
  const handleDirectPrint = async (openInNewTab = false) => {
    if (labelList.length === 0) return;
    setIsPrinting(true);
    playNotificationSound('status');

    try {
      // 1. Prepare SVG & QR codes for all labels
      const renderedCards = await Promise.all(
        labelList.map(async (p, idx) => {
          const barcodeVal = p.barcode || p.sku;
          const barcodeImg = await getBarcodeDataUrl(barcodeVal, barcodeType === 'DUAL' ? 'CODE128' : barcodeType);
          let qrImg = '';
          if (barcodeType === 'DUAL' || barcodeType === 'QR') {
            const qrPayload = `SKU:${p.sku}|BAR:${p.barcode || p.sku}|FIYAT:${p.price}TL`;
            qrImg = await getBarcodeDataUrl(qrPayload, 'QR');
          }

          const wholesale = p.wholesalePrice || Math.round(p.price * 0.85);
          const retailStr = `₺${p.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
          const wholesaleStr = `₺${wholesale.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;

          let priceHtml = '';
          if (showPrice) {
            if (priceType === 'wholesale') {
              priceHtml = `<div class="price-box"><span class="price-val">${wholesaleStr}</span> <span class="price-sub">/ Bayi (${p.unit})</span></div>`;
            } else if (priceType === 'both') {
              priceHtml = `<div class="price-box-both"><div class="price-row"><span class="lbl">Perakende:</span> <span class="val">${retailStr}</span></div><div class="price-row"><span class="lbl">Bayi/Toptan:</span> <span class="val bold">${wholesaleStr}</span></div></div>`;
            } else {
              priceHtml = `<div class="price-box"><span class="price-val">${retailStr}</span> <span class="price-sub">/ ${p.unit}</span></div>`;
            }
          }

          let barcodeGraphicsHtml = '';
          if (barcodeType === 'DUAL') {
            barcodeGraphicsHtml = `
              <div class="dual-graphic-row">
                <img src="${barcodeImg}" class="barcode-1d-dual" alt="Barcode" />
                ${qrImg ? `<img src="${qrImg}" class="barcode-qr-dual" alt="QR" />` : ''}
              </div>
            `;
          } else if (barcodeType === 'QR') {
            barcodeGraphicsHtml = `
              <div class="qr-graphic-row">
                <img src="${barcodeImg}" class="barcode-qr-single" alt="QR" />
              </div>
            `;
          } else {
            barcodeGraphicsHtml = `
              <div class="barcode-graphic-row">
                <img src="${barcodeImg}" class="barcode-1d-single" alt="Barcode" />
              </div>
            `;
          }

          return `
            <div class="label-card ${paperPreset}">
              <div class="label-header">
                ${showCompanyHeader ? `<div class="company-title">${companyHeader}</div>` : '<div></div>'}
                ${showCategory ? `<div class="category-title">${p.category}</div>` : ''}
              </div>

              ${showProductName ? `<div class="product-title">${p.name}</div>` : ''}

              ${barcodeGraphicsHtml}

              <div class="label-code-row">
                ${showSku ? `<span>KOD: <strong>${p.sku}</strong></span>` : ''}
                ${showBarcodeText && p.barcode ? `<span class="barcode-digits">${p.barcode}</span>` : ''}
              </div>

              ${showPrice ? `
                <div class="label-footer">
                  <div class="vat-note">${showVatInfo ? 'KDV Dahil' : ''}</div>
                  ${priceHtml}
                </div>
              ` : ''}
            </div>
          `;
        })
      );

      // Page size configuration
      let pageSizeCss = '@page { size: A4 portrait; margin: 4mm; }';
      let containerClass = 'grid-a4-24';
      if (paperPreset === 'a4-40') {
        pageSizeCss = '@page { size: A4 portrait; margin: 3mm; }';
        containerClass = 'grid-a4-40';
      } else if (paperPreset === 'a4-14') {
        pageSizeCss = '@page { size: A4 portrait; margin: 4mm; }';
        containerClass = 'grid-a4-14';
      } else if (paperPreset === 'shelf-talker') {
        pageSizeCss = '@page { size: A4 portrait; margin: 5mm; }';
        containerClass = 'grid-shelf-talker';
      } else if (paperPreset === 'thermal-80x50') {
        pageSizeCss = '@page { size: 80mm 50mm; margin: 2mm; }';
        containerClass = 'flex-thermal-80';
      } else if (paperPreset === 'thermal-50x30') {
        pageSizeCss = '@page { size: 50mm 30mm; margin: 1.5mm; }';
        containerClass = 'flex-thermal-50';
      }

      const printableHtml = `
        <!DOCTYPE html>
        <html lang="tr">
        <head>
          <meta charset="utf-8" />
          <title>ALPHA TEKNİK - Barkod ve Raf Etiketleri (${paperPreset})</title>
          <style>
            ${pageSizeCss}
            * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; background: #fff; color: #000; }
            
            .print-grid {
              display: grid;
              width: 100%;
            }
            .grid-a4-24 {
              grid-template-columns: repeat(3, 1fr);
              gap: 2.5mm;
              padding: 2mm;
            }
            .grid-a4-40 {
              grid-template-columns: repeat(4, 1fr);
              gap: 1.5mm;
              padding: 1.5mm;
            }
            .grid-a4-14 {
              grid-template-columns: repeat(2, 1fr);
              gap: 3mm;
              padding: 3mm;
            }
            .grid-shelf-talker {
              grid-template-columns: repeat(2, 1fr);
              gap: 4mm;
              padding: 4mm;
            }
            .flex-thermal-80 {
              display: flex;
              flex-direction: column;
              gap: 3mm;
              width: 80mm;
              margin: 0 auto;
            }
            .flex-thermal-50 {
              display: flex;
              flex-direction: column;
              gap: 2mm;
              width: 50mm;
              margin: 0 auto;
            }

            .label-card {
              border: 1px solid #c0c0c0;
              border-radius: 4px;
              padding: 4px 6px;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              background: #fff;
              page-break-inside: avoid;
              break-inside: avoid;
              overflow: hidden;
            }
            .label-card.a4-24 { min-height: 35.5mm; height: 35.5mm; }
            .label-card.a4-40 { min-height: 27.5mm; height: 27.5mm; padding: 3px 4px; }
            .label-card.a4-14 { min-height: 40mm; height: 40mm; padding: 6px 8px; }
            .label-card.shelf-talker { min-height: 70mm; height: 70mm; padding: 8px 10px; }
            .label-card.thermal-80x50 { width: 76mm; height: 46mm; min-height: 46mm; }
            .label-card.thermal-50x30 { width: 47mm; height: 27mm; min-height: 27mm; padding: 2px 4px; }

            .label-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 1px solid #e0e0e0;
              padding-bottom: 2px;
              margin-bottom: 2px;
              font-size: 7px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.2px;
            }
            .company-title { color: #111; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .category-title { color: #666; font-weight: 600; font-size: 6.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

            .product-title {
              font-size: 8.5px;
              font-weight: 900;
              line-height: 1.15;
              color: #000;
              max-height: 2.3em;
              overflow: hidden;
              margin-bottom: 2px;
            }
            .a4-40 .product-title { font-size: 7.5px; }
            .shelf-talker .product-title { font-size: 12px; margin-bottom: 6px; }

            .barcode-graphic-row { display: flex; justify-content: center; align-items: center; width: 100%; margin: 1px 0; }
            .barcode-1d-single { max-width: 96%; height: 26px; object-fit: contain; }
            .a4-40 .barcode-1d-single { height: 20px; }
            .shelf-talker .barcode-1d-single { height: 40px; }

            .dual-graphic-row { display: flex; justify-content: space-between; align-items: center; width: 100%; }
            .barcode-1d-dual { max-width: 72%; height: 22px; object-fit: contain; }
            .barcode-qr-dual { width: 22px; height: 22px; object-fit: contain; }

            .qr-graphic-row { display: flex; justify-content: center; align-items: center; }
            .barcode-qr-single { width: 34px; height: 34px; object-fit: contain; }
            .shelf-talker .barcode-qr-single { width: 55px; height: 55px; }

            .label-code-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 7px;
              font-family: monospace;
              font-weight: bold;
              color: #333;
              margin: 1px 0;
            }
            .barcode-digits { letter-spacing: 0.5px; }

            .label-footer {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              border-top: 1px solid #e0e0e0;
              padding-top: 2px;
              margin-top: 1px;
            }
            .vat-note { font-size: 6.5px; color: #777; font-weight: 500; }
            .price-box { text-align: right; line-height: 1; }
            .price-val { font-size: 11px; font-weight: 900; font-family: monospace; color: #000; }
            .a4-40 .price-val { font-size: 9px; }
            .shelf-talker .price-val { font-size: 16px; color: #d00; }
            .price-sub { font-size: 7px; color: #555; font-weight: bold; }

            .price-box-both { text-align: right; font-size: 7px; line-height: 1.1; }
            .price-row { display: flex; justify-content: flex-end; gap: 4px; }
            .price-row .lbl { color: #666; font-size: 6.5px; }
            .price-row .val { font-family: monospace; font-weight: bold; }
            .price-row .val.bold { font-weight: 900; color: #000; }
          </style>
        </head>
        <body>
          <div class="print-grid ${containerClass}">
            ${renderedCards.join('')}
          </div>
        </body>
        </html>
      `;

      if (openInNewTab) {
        // Open in clean new tab/window for direct browser preview
        const printWin = window.open('', '_blank');
        if (printWin) {
          printWin.document.open();
          printWin.document.write(printableHtml);
          printWin.document.close();
          printWin.focus();
        }
      } else {
        // Trigger via isolated invisible iframe
        let printIframe = document.getElementById('barcode-isolated-print-frame') as HTMLIFrameElement;
        if (!printIframe) {
          printIframe = document.createElement('iframe');
          printIframe.id = 'barcode-isolated-print-frame';
          printIframe.style.position = 'fixed';
          printIframe.style.right = '0';
          printIframe.style.bottom = '0';
          printIframe.style.width = '0px';
          printIframe.style.height = '0px';
          printIframe.style.border = 'none';
          printIframe.style.zIndex = '-9999';
          document.body.appendChild(printIframe);
        }

        const iframeDoc = printIframe.contentWindow?.document || printIframe.contentDocument;
        if (iframeDoc) {
          iframeDoc.open();
          iframeDoc.write(printableHtml);
          iframeDoc.close();

          setTimeout(() => {
            printIframe.contentWindow?.focus();
            printIframe.contentWindow?.print();
            setPrintSuccessMessage('Yazdırma komutu başarıyla gönderildi!');
            setTimeout(() => setPrintSuccessMessage(null), 4000);
          }, 350);
        }
      }
    } catch (err) {
      console.error('Print Execution Error:', err);
    } finally {
      setIsPrinting(false);
    }
  };

  // Generate & Download PDF with jsPDF
  const handleDownloadPdf = async () => {
    if (labelList.length === 0) return;
    setIsGeneratingPdf(true);
    playNotificationSound('status');

    try {
      let isThermal = paperPreset.startsWith('thermal');
      let pdf: jsPDF;

      if (paperPreset === 'thermal-80x50') {
        pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [50, 80] });
      } else if (paperPreset === 'thermal-50x30') {
        pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [30, 50] });
      } else {
        pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      }

      if (isThermal) {
        // Single label per page in thermal roll mode
        const labelWidth = paperPreset === 'thermal-80x50' ? 80 : 50;
        const labelHeight = paperPreset === 'thermal-80x50' ? 50 : 30;

        for (let i = 0; i < labelList.length; i++) {
          if (i > 0) pdf.addPage([labelHeight, labelWidth], 'landscape');
          const p = labelList[i];
          const barcodeVal = p.barcode || p.sku;
          const barcodeImg = await getBarcodeDataUrl(barcodeVal, barcodeType === 'DUAL' ? 'CODE128' : barcodeType);

          let y = 4;
          // Company header
          if (showCompanyHeader && companyHeader) {
            pdf.setFontSize(7);
            pdf.setFont('helvetica', 'bold');
            pdf.text(companyHeader.substring(0, 32), labelWidth / 2, y, { align: 'center' });
            y += 3.5;
          }

          // Product name
          if (showProductName) {
            pdf.setFontSize(paperPreset === 'thermal-50x30' ? 7 : 8);
            pdf.setFont('helvetica', 'bold');
            const lines = pdf.splitTextToSize(p.name, labelWidth - 8);
            pdf.text(lines.slice(0, 2), labelWidth / 2, y, { align: 'center' });
            y += (lines.slice(0, 2).length * 3.2) + 1;
          }

          // Barcode image
          if (barcodeImg) {
            const imgWidth = barcodeType === 'QR' ? 16 : labelWidth - 14;
            const imgHeight = barcodeType === 'QR' ? 16 : (paperPreset === 'thermal-50x30' ? 9 : 13);
            const imgX = (labelWidth - imgWidth) / 2;
            pdf.addImage(barcodeImg, 'PNG', imgX, y, imgWidth, imgHeight);
            y += imgHeight + 2;
          }

          // Barcode & SKU text
          if (showBarcodeText || showSku) {
            pdf.setFontSize(6.5);
            pdf.setFont('helvetica', 'normal');
            const codeTxt = `${showSku ? p.sku : ''} ${showBarcodeText && p.barcode ? `(${p.barcode})` : ''}`.trim();
            pdf.text(codeTxt, labelWidth / 2, y, { align: 'center' });
            y += 3.5;
          }

          // Price info
          if (showPrice) {
            pdf.setFontSize(paperPreset === 'thermal-50x30' ? 8 : 10);
            pdf.setFont('helvetica', 'bold');
            const wholesale = p.wholesalePrice || Math.round(p.price * 0.85);
            const priceVal = priceType === 'wholesale' ? wholesale : p.price;
            const priceTxt = `₺${priceVal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ${showUnit ? `/${p.unit}` : ''} ${showVatInfo ? '(KDV Dahil)' : ''}`;
            pdf.text(priceTxt, labelWidth / 2, y, { align: 'center' });
          }
        }
      } else {
        // A4 Sheet Layouts
        let cols = 3;
        let rows = 8;
        let cellW = 70;
        let cellH = 37.1;
        let marginX = 0;
        let marginY = 0;

        if (paperPreset === 'a4-40') {
          cols = 4;
          rows = 10;
          cellW = 52.5;
          cellH = 29.7;
        } else if (paperPreset === 'a4-14') {
          cols = 2;
          rows = 7;
          cellW = 105;
          cellH = 42.4;
        } else if (paperPreset === 'shelf-talker') {
          cols = 2;
          rows = 4;
          cellW = 105;
          cellH = 74.25;
        }

        const labelsPerPage = cols * rows;
        const totalPages = Math.ceil(labelList.length / labelsPerPage);

        for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
          if (pageIdx > 0) pdf.addPage('a4', 'portrait');

          const startIndex = pageIdx * labelsPerPage;
          const pageItems = labelList.slice(startIndex, startIndex + labelsPerPage);

          for (let itemIdx = 0; itemIdx < pageItems.length; itemIdx++) {
            const col = itemIdx % cols;
            const row = Math.floor(itemIdx / cols);
            const x = marginX + (col * cellW);
            const y = marginY + (row * cellH);

            const p = pageItems[itemIdx];
            const barcodeVal = p.barcode || p.sku;
            const barcodeImg = await getBarcodeDataUrl(barcodeVal, barcodeType === 'DUAL' ? 'CODE128' : barcodeType);

            let curY = y + 4;

            // Company Header
            if (showCompanyHeader && companyHeader) {
              pdf.setFontSize(6);
              pdf.setFont('helvetica', 'bold');
              pdf.text(companyHeader.substring(0, 28), x + (cellW / 2), curY, { align: 'center' });
              curY += 3;
            }

            // Product Name
            if (showProductName) {
              pdf.setFontSize(paperPreset === 'a4-40' ? 6.5 : 7.5);
              pdf.setFont('helvetica', 'bold');
              const lines = pdf.splitTextToSize(p.name, cellW - 6);
              pdf.text(lines.slice(0, 2), x + (cellW / 2), curY, { align: 'center' });
              curY += (lines.slice(0, 2).length * 3) + 1;
            }

            // Barcode image
            if (barcodeImg) {
              const imgW = barcodeType === 'QR' ? (cellH > 35 ? 16 : 12) : cellW - 12;
              const imgH = barcodeType === 'QR' ? (cellH > 35 ? 16 : 12) : (cellH > 35 ? 11 : 8);
              const imgX = x + ((cellW - imgW) / 2);
              pdf.addImage(barcodeImg, 'PNG', imgX, curY, imgW, imgH);
              curY += imgH + 1.5;
            }

            // SKU & Barcode text
            if (showSku || showBarcodeText) {
              pdf.setFontSize(6);
              pdf.setFont('helvetica', 'normal');
              const codeTxt = `${showSku ? p.sku : ''} ${showBarcodeText && p.barcode ? p.barcode : ''}`.trim();
              pdf.text(codeTxt, x + (cellW / 2), curY, { align: 'center' });
              curY += 3;
            }

            // Price text
            if (showPrice) {
              pdf.setFontSize(paperPreset === 'a4-40' ? 7.5 : 9);
              pdf.setFont('helvetica', 'bold');
              const wholesale = p.wholesalePrice || Math.round(p.price * 0.85);
              let priceStr = '';
              if (priceType === 'wholesale') {
                priceStr = `₺${wholesale.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} (Bayi)`;
              } else if (priceType === 'both') {
                priceStr = `Per: ₺${p.price.toLocaleString('tr-TR')} | Bayi: ₺${wholesale.toLocaleString('tr-TR')}`;
              } else {
                priceStr = `₺${p.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
              }
              if (showUnit && priceType !== 'both') priceStr += ` / ${p.unit}`;
              pdf.text(priceStr, x + (cellW / 2), curY, { align: 'center' });
            }
          }
        }
      }

      // Save PDF file
      const dateStr = new Date().toISOString().split('T')[0];
      pdf.save(`Dogus_Tesisat_Barkodlar_${paperPreset}_${dateStr}.pdf`);
      setPrintSuccessMessage('PDF başarıyla oluşturuldu ve indirildi!');
      setTimeout(() => setPrintSuccessMessage(null), 4000);
    } catch (err) {
      console.error('PDF Export Error:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md p-2 sm:p-4 md:p-6 animate-in fade-in"
      onClick={onClose}
    >
      <div className="min-h-full flex items-center justify-center py-2 sm:py-4">
        <div 
          className="relative bg-base-surface border border-border rounded-2xl w-full max-w-7xl h-[92dvh] sm:h-[94dvh] flex flex-col shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
        
        {/* MODAL HEADER */}
        <div className="px-3 sm:px-5 py-3 sm:py-4 bg-base-surface-2 border-b border-border flex flex-wrap items-center justify-between gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-base-surface border border-border flex items-center justify-center text-text-primary shadow-xs">
              <BarcodeIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
                <h2 className="text-sm sm:text-base font-black text-text-primary leading-tight min-w-0">
                  Toplu Barkod & Raf Etiketi Üretim Masası
                </h2>
                <span className="hidden sm:inline-block shrink-0 whitespace-nowrap px-2 py-0.5 rounded-md text-[11px] font-bold bg-bg-success text-success-text border border-success-border">
                  Code-128 / EAN-13 / QR / Termal
                </span>
              </div>
              <p className="hidden sm:block text-xs text-text-muted">
                Stoklarınız için anında çizgili barkod ve QR etiketleri oluşturun, A4 tabaka veya termal rulo yazıcıdan milimetrik yazdırın.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 basis-full sm:basis-auto min-w-0 sm:ml-auto">
            {/* View Switcher Tabs */}
            <div className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto overscroll-x-contain bg-base-surface p-1 rounded-xl border border-border">
              <button
                type="button"
                onClick={() => setActiveTab('select')}
                className={`flex items-center shrink-0 whitespace-nowrap gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'select'
                    ? 'bg-base-surface-2 text-text-primary shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Ürün Seçimi ({totalSelectedProducts})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('studio')}
                className={`flex items-center shrink-0 whitespace-nowrap gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'studio'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Tasarım Stüdyosu</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`flex items-center shrink-0 whitespace-nowrap gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'preview'
                    ? 'bg-base-surface-2 text-text-primary shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Baskı Önizleme ({totalLabelsToPrint} Etiket)</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-base-surface transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* FEEDBACK BANNER */}
        {printSuccessMessage && (
          <div className="px-5 py-2.5 bg-bg-success border-b border-success-border text-success-text text-xs font-bold flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-success-text" />
              <span>{printSuccessMessage}</span>
            </div>
            <button onClick={() => setPrintSuccessMessage(null)} className="hover:underline cursor-pointer">
              Kapat
            </button>
          </div>
        )}

        {/* MODAL BODY */}
        {activeTab === 'select' ? (
          /* TAB 1: PRODUCT SELECTION & QUANTITIES (FULL WIDTH & HEIGHT) */
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden p-3 sm:p-4 space-y-3">
            
            {/* Search & Quick Filters Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 shrink-0">
              <div className="grid grid-cols-2 gap-2 w-full min-w-0 sm:flex sm:flex-1 sm:items-center">
                <div className="relative col-span-2 min-w-0 sm:flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Ürün adı, Stok Kodu (ST00xxx) veya Barkod ile ara..."
                    className="w-full pl-9 pr-8 py-2 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary focus:border-border-strong placeholder:text-text-muted"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary text-xs cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Category Selector */}
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="w-full min-w-0 sm:w-auto px-3 py-2 bg-base-surface-2 border border-border rounded-xl text-xs font-semibold text-text-primary cursor-pointer"
                >
                  {categories.map(c => (
                    <option key={c} value={c}>
                      {c === 'ALL' ? 'Tüm Kategoriler' : c}
                    </option>
                  ))}
                </select>

                {/* Stock Status Selector */}
                <select
                  value={stockFilter}
                  onChange={e => setStockFilter(e.target.value as any)}
                  className="w-full min-w-0 sm:w-auto px-3 py-2 bg-base-surface-2 border border-border rounded-xl text-xs font-semibold text-text-primary cursor-pointer"
                >
                  <option value="ALL">Tüm Stoklar</option>
                  <option value="IN_STOCK">Yalnızca Stoğu Olanlar (&gt; 0)</option>
                  <option value="LOW_STOCK">Kritik Stoklar (≤ 5)</option>
                </select>
              </div>

              {/* Batch Action Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleSelectAllFiltered(1)}
                  className="px-2.5 py-1.5 rounded-lg bg-base-surface-2 hover:bg-base-surface text-text-primary text-xs font-bold border border-border transition-colors cursor-pointer"
                  title="Filtrelenen tüm ürünlerden 1'er adet seç"
                >
                  Filtrelenenleri Seç (1x)
                </button>

                <button
                  type="button"
                  onClick={handleSetQtyToStock}
                  className="px-2.5 py-1.5 rounded-lg bg-bg-warning hover:bg-bg-warning/80 text-warning-text text-xs font-bold border border-warning-border transition-colors cursor-pointer"
                  title="Her ürünün mevcut stok adedi kadar etiket yazdır"
                >
                  Stok Miktarı Kadar Seç
                </button>

                <button
                  type="button"
                  onClick={handleDeselectAllFiltered}
                  className="px-2.5 py-1.5 rounded-lg bg-base-surface-2 hover:bg-bg-danger text-text-secondary hover:text-danger-text text-xs font-semibold border border-border transition-colors cursor-pointer"
                >
                  Seçimi Temizle
                </button>
              </div>
            </div>

            {/* Selection Count Badge Bar */}
            <div className="flex items-center justify-between text-xs px-1 text-text-muted shrink-0">
              <div>
                Filtrelenen: <strong>{filteredProducts.length}</strong> ürün | Seçilen Farklı Ürün: <strong className="text-text-primary">{totalSelectedProducts}</strong> | Toplam Basılacak Etiket: <strong className="text-success-text">{totalLabelsToPrint} adet</strong>
              </div>
              {totalLabelsToPrint > 0 && (
                <button
                  onClick={() => setActiveTab('preview')}
                  className="text-text-primary font-bold hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  <span>Önizlemeye Geç &rarr;</span>
                </button>
              )}
            </div>

            {/* Products Table */}
            <div className="flex-1 min-h-0 border border-border rounded-xl bg-base-surface overflow-auto shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-base-surface-2 text-text-secondary uppercase font-bold text-[10px] tracking-wider sticky top-0 z-10 border-b border-border">
                  <tr>
                    <th className="py-1 px-2 w-10 text-center">
                      <label className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center cursor-pointer touch-manipulation">
                        <input
                          type="checkbox"
                          checked={filteredProducts.length > 0 && filteredProducts.every(p => (selectedItems[p.id] || 0) > 0)}
                          onChange={(e) => {
                            if (e.target.checked) handleSelectAllFiltered(1);
                            else handleDeselectAllFiltered();
                          }}
                          className="w-4 h-4 rounded cursor-pointer text-accent-fill"
                        />
                      </label>
                    </th>
                    <th className="py-2.5 px-3 min-w-[200px]">Ürün & Barkod Bilgisi</th>
                    <th className="py-2.5 px-3 min-w-[130px]">Kategori</th>
                    <th className="py-2.5 px-3 text-right">Fiyat</th>
                    <th className="py-2.5 px-3 text-center">Depo Stoğu</th>
                    <th className="py-2.5 px-3 text-center min-w-[130px]">Basılacak Etiket Adedi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-text-primary">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-text-muted">
                        Arama kriterine uygun ürün bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map(p => {
                      const qty = selectedItems[p.id] || 0;
                      const isSelected = qty > 0;

                      return (
                        <tr
                          key={p.id}
                          className={`transition-colors ${
                            isSelected ? 'bg-base-surface-2/70 font-medium' : 'hover:bg-base-surface-2/40'
                          }`}
                        >
                          <td className="py-1 px-2 text-center">
                            <label className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center cursor-pointer touch-manipulation">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectProduct(p.id)}
                                className="w-4 h-4 rounded cursor-pointer text-accent-fill"
                              />
                            </label>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-text-primary">{p.name}</div>
                            <div className="flex items-center space-x-2 text-[11px] text-text-muted mt-0.5">
                              <span className="font-mono bg-base-surface-2 px-1.5 py-0.5 rounded border border-border">
                                {p.sku}
                              </span>
                              {p.barcode && (
                                <span className="font-mono text-text-secondary flex items-center space-x-1">
                                  <BarcodeIcon className="w-3 h-3 text-text-muted" />
                                  <span>{p.barcode}</span>
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-text-secondary">
                            <span className="px-2 py-0.5 rounded bg-base-surface-2 border border-border text-[10px] font-semibold">
                              {p.category}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold">
                            ₺{p.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                            <span className="text-[10px] text-text-muted block font-normal">/{p.unit}</span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                                p.stock <= 5
                                  ? 'bg-bg-danger text-danger-text border border-danger-border'
                                  : 'bg-base-surface-2 text-text-primary'
                              }`}
                            >
                              {p.stock} {p.unit}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                type="button"
                                onClick={() => updateProductQuantity(p.id, qty - 1)}
                                className="w-6 h-6 rounded bg-base-surface-2 hover:bg-base-surface border border-border flex items-center justify-center font-bold text-xs cursor-pointer"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min={0}
                                max={500}
                                value={qty}
                                onChange={e => updateProductQuantity(p.id, parseInt(e.target.value) || 0)}
                                className="w-14 text-center py-1 bg-base-surface border border-border rounded font-mono font-bold text-xs focus:border-border-strong"
                              />
                              <button
                                type="button"
                                onClick={() => updateProductQuantity(p.id, qty + 1)}
                                className="w-6 h-6 rounded bg-base-surface-2 hover:bg-base-surface border border-border flex items-center justify-center font-bold text-xs cursor-pointer"
                              >
                                +
                              </button>
                              {p.stock > 0 && (
                                <button
                                  type="button"
                                  onClick={() => updateProductQuantity(p.id, p.stock)}
                                  className="px-1.5 py-1 text-[10px] rounded bg-base-surface-2 hover:bg-bg-warning text-text-secondary hover:text-warning-text border border-border font-bold ml-1 cursor-pointer"
                                  title="Bu ürünün stok sayısı kadar bas"
                                >
                                  Stok ({p.stock})
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

          </div>
        ) : activeTab === 'studio' ? (
          /* TAB 2: ULTRA-PREMIUM INTERACTIVE LABEL STUDIO */
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden p-3 sm:p-4 space-y-3 bg-[#0B0F19]">
            {/* Top Studio Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 px-3 py-2 bg-[#0E131F] border border-slate-800 rounded-xl shrink-0">
              <div className="flex items-center gap-2 min-w-[260px] flex-1">
                <span className="text-xs font-semibold text-slate-400 shrink-0">Örnek Ürün:</span>
                <select
                  value={studioPreviewProductId || studioPreviewProduct.id}
                  onChange={(e) => setStudioPreviewProductId(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white flex-1 focus:border-blue-500 truncate"
                >
                  {safeProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku ? `[${p.sku}] ` : ''}{p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyZpl}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition border cursor-pointer ${
                    copiedZpl
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  }`}
                  title="Zebra Barkod Yazıcıları için ZPL-II ham kodunu kopyala"
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>{copiedZpl ? 'ZPL Kopyalandı!' : 'Zebra ZPL Kodu'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Bu Tasarımla Yazdır</span>
                </button>
              </div>
            </div>

            {/* Studio Split Workspace: Left Canvas + Right Property Inspector */}
            <div className="flex-1 flex flex-col lg:flex-row gap-3 min-h-0 overflow-hidden">
              {/* Center Canvas */}
              <div className="flex-1 min-h-[360px] lg:min-h-0 overflow-hidden">
                <RulerCanvas
                  product={studioPreviewProduct}
                  config={studioConfig}
                  zoom={studioZoom}
                  onZoomChange={setStudioZoom}
                  onConfigChange={setStudioConfig}
                />
              </div>

              {/* Right Property Inspector */}
              <div className="w-full lg:w-80 shrink-0 h-64 lg:h-full overflow-hidden">
                <PropertyInspector
                  config={studioConfig}
                  onChange={setStudioConfig}
                  activePreset={paperPreset}
                  onSelectPreset={(p) => setPaperPreset(p)}
                />
              </div>
            </div>
          </div>
        ) : (
          /* TAB 3: LIVE PRINT PREVIEW & SETTINGS */
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            
            {/* Mobile Tab Switcher (< lg) */}
            <div className="lg:hidden flex items-center bg-base-surface-2 border-b border-border p-2 gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setMobilePreviewTab('preview')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                  mobilePreviewTab === 'preview'
                    ? 'bg-text-primary text-base font-bold shadow-xs'
                    : 'bg-base-surface text-text-secondary hover:text-text-primary border border-border'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Canlı Önizleme</span>
              </button>
              <button
                type="button"
                onClick={() => setMobilePreviewTab('settings')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                  mobilePreviewTab === 'settings'
                    ? 'bg-text-primary text-base font-bold shadow-xs'
                    : 'bg-base-surface text-text-secondary hover:text-text-primary border border-border'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Baskı Ayarları & Yazdır</span>
              </button>
            </div>

            {/* Main Content Workspace */}
            <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
              
              {/* LEFT / PREVIEW CANVAS PANE */}
              <div
                className={`flex-1 flex-col min-h-0 overflow-hidden p-3 sm:p-4 space-y-3 bg-base-surface-2/40 border-b lg:border-b-0 lg:border-r border-border ${
                  mobilePreviewTab === 'preview' ? 'flex' : 'hidden lg:flex'
                }`}
              >
                {/* Preview Controls Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-base-surface p-2.5 sm:p-3 rounded-xl border border-border shadow-2xs shrink-0">
                  <div className="flex items-center space-x-2 min-w-0">
                    <Eye className="w-4 h-4 text-text-muted shrink-0" />
                    <span className="text-xs font-bold text-text-primary truncate">
                      Canlı Baskı Önizlemesi ({totalLabelsToPrint} Etiket)
                    </span>
                    <span className="text-[11px] text-text-muted font-mono hidden md:inline">
                      | {paperPreset.toUpperCase()} | {barcodeType}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    {/* Zoom Controls */}
                    <div className="flex items-center space-x-1 bg-base-surface-2 px-1.5 py-1 rounded-lg border border-border">
                      <button
                        type="button"
                        onClick={() => setPreviewZoom(z => Math.max(40, z - 15))}
                        className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-base-surface transition-colors cursor-pointer"
                        title="Küçült"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-[10px] font-mono font-bold text-text-primary w-9 text-center select-none">
                        %{previewZoom}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPreviewZoom(z => Math.min(150, z + 15))}
                        className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-base-surface transition-colors cursor-pointer"
                        title="Büyüt"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      {previewZoom !== 100 && (
                        <button
                          type="button"
                          onClick={() => setPreviewZoom(100)}
                          className="text-[9px] font-bold text-text-muted hover:text-text-primary px-1.5 py-0.5 rounded bg-base-surface cursor-pointer"
                          title="Varsayılan Boyut (%100)"
                        >
                          Sıfırla
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => handleDirectPrint(true)}
                      className="px-2.5 py-1.5 rounded-lg bg-base-surface-2 hover:bg-base-surface text-text-primary text-xs font-semibold border border-border cursor-pointer flex items-center space-x-1"
                      title="Yazdırma sayfasını tam ekran yeni sekmede aç"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Yeni Sekmede Aç</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('select')}
                      className="px-2.5 py-1.5 rounded-lg bg-base-surface-2 hover:bg-base-surface text-text-primary text-xs font-semibold border border-border cursor-pointer transition-colors"
                    >
                      &larr; Ürün Seçimi
                    </button>
                  </div>
                </div>

                {/* Scrollable Printable Label Canvas */}
                <div className="flex-1 min-h-0 overflow-auto p-4 sm:p-6 bg-neutral-900/10 rounded-xl border border-border flex justify-center items-start">
                  {labelList.length === 0 ? (
                    <div className="p-12 text-center text-text-muted bg-base-surface rounded-xl border border-border max-w-md my-auto">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 text-warning-text" />
                      <div className="font-bold text-sm text-text-primary mb-1">Hiç Etiket Seçilmedi</div>
                      <p className="text-xs mb-4">Lütfen barkodunu basmak istediğiniz ürünleri ve adetlerini belirleyin.</p>
                      <button
                        onClick={() => setActiveTab('select')}
                        className="px-4 py-2 rounded-xl bg-text-primary text-base font-bold text-xs cursor-pointer"
                      >
                        Ürün Seçimine Git
                      </button>
                    </div>
                  ) : (
                    <div
                      style={{
                        transform: `scale(${previewZoom / 100})`,
                        transformOrigin: 'top center',
                        marginBottom: previewZoom > 100 ? `${(previewZoom - 100) * 8}px` : undefined
                      }}
                      className="transition-transform duration-150 origin-top"
                    >
                      <div
                        id="barcode-print-container"
                        ref={printAreaRef}
                        className={`bg-white text-black transition-all shadow-lg rounded-sm ${
                          paperPreset === 'a4-24'
                            ? 'w-[210mm] min-h-[297mm] p-[5mm] grid grid-cols-3 gap-[2.5mm]'
                            : paperPreset === 'a4-40'
                            ? 'w-[210mm] min-h-[297mm] p-[4mm] grid grid-cols-4 gap-[1.5mm]'
                            : paperPreset === 'a4-14'
                            ? 'w-[210mm] min-h-[297mm] p-[5mm] grid grid-cols-2 gap-[3mm]'
                            : paperPreset === 'shelf-talker'
                            ? 'w-[210mm] min-h-[297mm] p-[6mm] grid grid-cols-2 gap-[4mm]'
                            : paperPreset === 'thermal-80x50'
                            ? 'w-[80mm] p-[3mm] flex flex-col space-y-[4mm]'
                            : 'w-[50mm] p-[2mm] flex flex-col space-y-[3mm]'
                        }`}
                      >
                        {labelList.map((product, idx) => (
                          <BarcodeSingleCard
                            key={`${product.id}-${idx}`}
                            product={product}
                            preset={paperPreset}
                            barcodeType={barcodeType}
                            companyHeader={companyHeader}
                            showCompanyHeader={showCompanyHeader}
                            showProductName={showProductName}
                            showSku={showSku}
                            showBarcodeText={showBarcodeText}
                            showPrice={showPrice}
                            priceType={priceType}
                            showVatInfo={showVatInfo}
                            showUnit={showUnit}
                            showCategory={showCategory}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* RIGHT SIDEBAR: FORMAT & PRINT SETTINGS PANEL */}
              <div
                className={`w-full lg:w-84 xl:w-92 bg-base-surface p-4 flex-col space-y-4 shrink-0 overflow-y-auto min-h-0 h-full ${
                  mobilePreviewTab === 'settings' ? 'flex' : 'hidden lg:flex'
                }`}
              >
                <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
                  <div className="flex items-center space-x-2">
                    <Sliders className="w-4 h-4 text-text-primary" />
                    <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                      Baskı & Kağıt Ayarları
                    </h3>
                  </div>
                  {/* On mobile, shortcut to preview */}
                  <button
                    type="button"
                    onClick={() => setMobilePreviewTab('preview')}
                    className="lg:hidden text-xs font-bold text-text-primary hover:underline flex items-center space-x-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Önizlemeyi Gör</span>
                  </button>
                </div>

                {/* Paper / Layout Preset */}
                <div className="space-y-1.5 shrink-0">
                  <label className="text-[11px] font-bold text-text-secondary uppercase">
                    Kağıt / Etiket Şablonu
                  </label>
                  <select
                    value={paperPreset}
                    onChange={e => setPaperPreset(e.target.value as PaperPreset)}
                    className="w-full px-3 py-2 bg-base-surface-2 border border-border rounded-xl text-xs font-bold text-text-primary cursor-pointer"
                  >
                    <option value="a4-24">📄 A4 Tabaka - 24'lü (70 x 37 mm)</option>
                    <option value="a4-40">📄 A4 Tabaka - 40'lı (52.5 x 29.7 mm)</option>
                    <option value="a4-14">📦 A4 Tabaka - 14'lü Koli (105 x 42.4 mm)</option>
                    <option value="shelf-talker">🏷️ A4 Raf Etiketi - 8'li Büyük Fiyat</option>
                    <option value="thermal-80x50">🖨️ Termal Rulo - 80 x 50 mm (Zebra/Argox)</option>
                    <option value="thermal-50x30">🖨️ Termal Rulo - 50 x 30 mm (Kompakt)</option>
                  </select>
                </div>

                {/* Barcode Type */}
                <div className="space-y-1.5 shrink-0">
                  <label className="text-[11px] font-bold text-text-secondary uppercase">
                    Barkod Formatı & Kodlama
                  </label>
                  <select
                    value={barcodeType}
                    onChange={e => setBarcodeType(e.target.value as BarcodeType)}
                    className="w-full px-3 py-2 bg-base-surface-2 border border-border rounded-xl text-xs font-bold text-text-primary cursor-pointer"
                  >
                    <option value="CODE128">📊 Code-128 (El Terminali & Standart Lazer)</option>
                    <option value="EAN13">🌐 EAN-13 / GS1 Perakende</option>
                    <option value="QR">📱 QR Karekod (Kamera / Akıllı Telefon)</option>
                    <option value="DUAL">⚡ Çiftli Mod (Code-128 + QR Yan Yana)</option>
                  </select>
                </div>

                {/* Company Header Input */}
                <div className="space-y-1.5 shrink-0">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-text-secondary uppercase">
                      Şirket / Marka Başlığı
                    </label>
                    <input
                      type="checkbox"
                      checked={showCompanyHeader}
                      onChange={e => setShowCompanyHeader(e.target.checked)}
                      className="rounded cursor-pointer"
                    />
                  </div>
                  {showCompanyHeader && (
                    <input
                      type="text"
                      value={companyHeader}
                      onChange={e => setCompanyHeader(e.target.value)}
                      placeholder="ALPHA TEKNİK"
                      className="w-full px-3 py-1.5 bg-base-surface-2 border border-border rounded-lg text-xs font-medium text-text-primary"
                    />
                  )}
                </div>

                {/* Content Field Toggles */}
                <div className="space-y-2 pt-2 border-t border-border shrink-0">
                  <label className="text-[11px] font-bold text-text-secondary uppercase block mb-1">
                    Etiket Üzerindeki Alanlar
                  </label>

                  <label className="flex items-center justify-between text-xs text-text-primary cursor-pointer hover:bg-base-surface-2 px-2 py-1 rounded-lg">
                    <span>Ürün Adı</span>
                    <input
                      type="checkbox"
                      checked={showProductName}
                      onChange={e => setShowProductName(e.target.checked)}
                      className="rounded cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between text-xs text-text-primary cursor-pointer hover:bg-base-surface-2 px-2 py-1 rounded-lg">
                    <span>Stok Kodu (SKU)</span>
                    <input
                      type="checkbox"
                      checked={showSku}
                      onChange={e => setShowSku(e.target.checked)}
                      className="rounded cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between text-xs text-text-primary cursor-pointer hover:bg-base-surface-2 px-2 py-1 rounded-lg">
                    <span>Barkod Metni (Rakamlar)</span>
                    <input
                      type="checkbox"
                      checked={showBarcodeText}
                      onChange={e => setShowBarcodeText(e.target.checked)}
                      className="rounded cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between text-xs text-text-primary cursor-pointer hover:bg-base-surface-2 px-2 py-1 rounded-lg">
                    <span>Fiyat Bilgisi</span>
                    <input
                      type="checkbox"
                      checked={showPrice}
                      onChange={e => setShowPrice(e.target.checked)}
                      className="rounded cursor-pointer"
                    />
                  </label>

                  {showPrice && (
                    <div className="pl-4 space-y-1.5 py-1">
                      <select
                        value={priceType}
                        onChange={e => setPriceType(e.target.value as any)}
                        className="w-full px-2 py-1 bg-base-surface-2 border border-border rounded text-[11px] font-medium"
                      >
                        <option value="retail">Perakende Fiyatı (Satış 1)</option>
                        <option value="wholesale">Toptan / Bayi Fiyatı (Satış 2)</option>
                        <option value="both">İki Fiyatı da Göster</option>
                      </select>
                      
                      <label className="flex items-center space-x-2 text-[11px] text-text-muted cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showVatInfo}
                          onChange={e => setShowVatInfo(e.target.checked)}
                          className="rounded"
                        />
                        <span>KDV Dahil / Hariç Notu</span>
                      </label>
                    </div>
                  )}

                  <label className="flex items-center justify-between text-xs text-text-primary cursor-pointer hover:bg-base-surface-2 px-2 py-1 rounded-lg">
                    <span>Birim (Adet / Metre / Koli)</span>
                    <input
                      type="checkbox"
                      checked={showUnit}
                      onChange={e => setShowUnit(e.target.checked)}
                      className="rounded cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between text-xs text-text-primary cursor-pointer hover:bg-base-surface-2 px-2 py-1 rounded-lg">
                    <span>Kategori & Raf Grubu</span>
                    <input
                      type="checkbox"
                      checked={showCategory}
                      onChange={e => setShowCategory(e.target.checked)}
                      className="rounded cursor-pointer"
                    />
                  </label>
                </div>

                {/* ACTION BUTTONS: DIRECT PRINT & PDF DOWNLOAD */}
                <div className="pt-3 border-t border-border space-y-2 mt-auto shrink-0">
                  
                  <button
                    type="button"
                    onClick={() => handleDirectPrint(false)}
                    disabled={labelList.length === 0 || isPrinting}
                    className="w-full py-3 px-4 rounded-xl bg-text-primary hover:opacity-90 text-base font-bold text-xs flex items-center justify-center space-x-2 shadow-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Printer className="w-4 h-4" />
                    <span>{isPrinting ? 'Yazıcıya Gönderiliyor...' : `Yazdır (${totalLabelsToPrint} Etiket)`}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    disabled={labelList.length === 0 || isGeneratingPdf}
                    className="w-full py-2.5 px-4 rounded-xl bg-base-surface-2 hover:bg-base-surface text-text-primary border border-border font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-40"
                  >
                    <Download className="w-4 h-4 text-text-muted" />
                    <span>{isGeneratingPdf ? 'PDF Hazırlanıyor...' : 'Vektörel PDF İndir'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDirectPrint(true)}
                    disabled={labelList.length === 0}
                    className="w-full py-2 px-3 rounded-xl text-text-secondary hover:text-text-primary text-[11px] font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Yazdırma Penceresini Yeni Sekmede Aç</span>
                  </button>

                </div>

              </div>

            </div>

          </div>
        )}

      </div>
      </div>
    </div>
  );
}

// Sub-Component: Single Barcode Label Card with dynamic SVG rendering
interface BarcodeSingleCardProps {
  key?: string;
  product: Product;
  preset: PaperPreset;
  barcodeType: BarcodeType;
  companyHeader: string;
  showCompanyHeader: boolean;
  showProductName: boolean;
  showSku: boolean;
  showBarcodeText: boolean;
  showPrice: boolean;
  priceType: 'retail' | 'wholesale' | 'both';
  showVatInfo: boolean;
  showUnit: boolean;
  showCategory: boolean;
}

function BarcodeSingleCard({
  product,
  preset,
  barcodeType,
  companyHeader,
  showCompanyHeader,
  showProductName,
  showSku,
  showBarcodeText,
  showPrice,
  priceType,
  showVatInfo,
  showUnit,
  showCategory,
}: BarcodeSingleCardProps) {
  const barcodeSvgRef = useRef<SVGSVGElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const barcodeValue = product.barcode || product.sku;

  // Render Barcode SVG via JsBarcode safely
  useEffect(() => {
    if (barcodeSvgRef.current && barcodeType !== 'QR') {
      try {
        let format = 'CODE128';
        let finalVal = barcodeValue;
        if (barcodeType === 'EAN13') {
          const eanRes = getValidEAN13(barcodeValue);
          finalVal = eanRes.code;
          format = 'EAN13';
        }
        JsBarcode(barcodeSvgRef.current, finalVal, {
          format,
          width: preset === 'a4-40' ? 1.05 : preset === 'shelf-talker' ? 1.8 : 1.35,
          height: preset === 'a4-40' ? 22 : preset === 'shelf-talker' ? 38 : 28,
          displayValue: false, // We render clean HTML text for maximum clarity
          margin: 0,
          lineColor: '#000000',
        });
      } catch (err) {
        // Fallback to CODE128
        try {
          if (barcodeSvgRef.current) {
            JsBarcode(barcodeSvgRef.current, barcodeValue, {
              format: 'CODE128',
              width: 1.2,
              height: 25,
              displayValue: false,
              margin: 0,
            });
          }
        } catch (fallbackErr) {
          console.warn('JsBarcode render error:', fallbackErr);
        }
      }
    }
  }, [barcodeValue, barcodeType, preset]);

  // Render QR Code Data URL if needed
  useEffect(() => {
    if (barcodeType === 'QR' || barcodeType === 'DUAL') {
      const qrPayload = `SKU:${product.sku}|BAR:${product.barcode || product.sku}|FIYAT:${product.price}TL`;
      QRCode.toDataURL(qrPayload, { width: 90, margin: 1 })
        .then(url => setQrDataUrl(url))
        .catch(e => console.warn(e));
    }
  }, [product, barcodeType]);

  // Sizing and layout classes based on preset
  const isShelfTalker = preset === 'shelf-talker';
  const isCompact40 = preset === 'a4-40';

  const wholesalePrice = product.wholesalePrice || Math.round(product.price * 0.85);

  return (
    <div
      className={`barcode-label-card border border-neutral-300 rounded-md p-1.5 flex flex-col justify-between overflow-hidden bg-white text-black font-sans select-none relative ${
        isShelfTalker ? 'p-3 min-h-[68mm]' : isCompact40 ? 'p-1 min-h-[27mm]' : 'min-h-[35mm]'
      }`}
    >
      {/* 1. Header (Company Name & Category) */}
      <div className="flex items-center justify-between border-b border-neutral-200 pb-0.5 mb-1 leading-none">
        {showCompanyHeader && (
          <span className="font-extrabold tracking-tight text-[8px] text-neutral-800 uppercase truncate">
            {companyHeader}
          </span>
        )}
        {showCategory && (
          <span className="text-[7px] text-neutral-500 font-semibold truncate ml-1">
            {product.category}
          </span>
        )}
      </div>

      {/* 2. Product Name */}
      {showProductName && (
        <div
          className={`font-black text-neutral-900 tracking-tight leading-tight line-clamp-2 ${
            isShelfTalker ? 'text-xs mb-1.5' : isCompact40 ? 'text-[8.5px]' : 'text-[9.5px]'
          }`}
          title={product.name}
        >
          {product.name}
        </div>
      )}

      {/* 3. Barcode & QR Code Graphic */}
      <div className="flex items-center justify-center my-0.5 w-full overflow-hidden">
        {barcodeType === 'DUAL' ? (
          <div className="flex items-center justify-between w-full space-x-1">
            <div className="flex-1 flex justify-center overflow-hidden">
              <svg ref={barcodeSvgRef} className="max-w-full h-auto" />
            </div>
            {qrDataUrl && (
              <img src={qrDataUrl} alt="QR" className="w-7 h-7 shrink-0" />
            )}
          </div>
        ) : barcodeType === 'QR' ? (
          <div className="flex justify-center">
            {qrDataUrl && <img src={qrDataUrl} alt="QR Code" className={isShelfTalker ? 'w-14 h-14' : 'w-9 h-9'} />}
          </div>
        ) : (
          <div className="flex justify-center w-full overflow-hidden">
            <svg ref={barcodeSvgRef} className="max-w-full h-auto" />
          </div>
        )}
      </div>

      {/* 4. SKU & Barcode Text */}
      {(showSku || showBarcodeText) && (
        <div className="flex items-center justify-between text-neutral-700 font-mono text-[8px] font-bold px-0.5">
          {showSku && <span>KOD: {product.sku}</span>}
          {showBarcodeText && (
            <span className="tracking-widest">{product.barcode || product.sku}</span>
          )}
        </div>
      )}

      {/* 5. Price Footer */}
      {showPrice && (
        <div className="flex items-end justify-between border-t border-neutral-200 pt-0.5 mt-0.5 leading-none">
          <div className="text-[7px] text-neutral-500 font-medium">
            {showVatInfo && <span>KDV Dahil</span>}
          </div>
          
          <div className="text-right">
            {priceType === 'wholesale' ? (
              <div>
                <span className={`font-black font-mono text-neutral-950 ${isShelfTalker ? 'text-base' : isCompact40 ? 'text-[10px]' : 'text-xs'}`}>
                  ₺{wholesalePrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[7px] text-neutral-600 font-bold ml-1">/ Bayi</span>
              </div>
            ) : priceType === 'both' ? (
              <div className="text-[7.5px] leading-tight">
                <div>Per: <strong className="font-mono">₺{product.price.toLocaleString('tr-TR')}</strong></div>
                <div>Bayi: <strong className="font-mono text-neutral-950 font-black">₺{wholesalePrice.toLocaleString('tr-TR')}</strong></div>
              </div>
            ) : (
              <div>
                <span className={`font-black font-mono text-neutral-950 ${isShelfTalker ? 'text-base' : isCompact40 ? 'text-[10px]' : 'text-xs'}`}>
                  ₺{product.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </span>
                {showUnit && (
                  <span className="text-[7.5px] text-neutral-600 font-bold ml-0.5">
                    /{product.unit}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
