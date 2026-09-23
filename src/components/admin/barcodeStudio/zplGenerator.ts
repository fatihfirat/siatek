import { Product } from '../../../types';
import { LabelStudioConfig } from './types';

/**
 * Endüstriyel Zebra Barkod Yazıcıları (ZPL-II standardı) için doğrudan ham kod üretir.
 * 203 DPI standardında (1 mm ≈ 8 nokta) hesaplama yapılır.
 */
export function generateZplCode(product: Product, config: LabelStudioConfig): string {
  const dotsPerMm = 8; // 203 DPI (8 dots/mm)
  const widthDots = Math.round(config.dimensions.widthMm * dotsPerMm);
  const heightDots = Math.round(config.dimensions.heightMm * dotsPerMm);
  const paddingDots = Math.round(config.dimensions.paddingMm * dotsPerMm);

  const lines: string[] = [
    '^XA', // Start Format
    `^PW${widthDots}`, // Print Width
    `^LL${heightDots}`, // Label Length
    '^LH0,0', // Label Home
  ];

  let currentY = paddingDots;

  // Başlık Şeridi
  if (config.showHeader && config.headerText) {
    if (config.barcode.invertHeader) {
      lines.push(`^FO${paddingDots},${currentY}^GB${widthDots - (paddingDots * 2)},36,36^FS`);
      lines.push(`^FO${paddingDots + 16},${currentY + 6}^FR^A0N,24,24^FD${config.headerText}^FS`);
    } else {
      lines.push(`^FO${paddingDots},${currentY}^A0N,24,24^FD${config.headerText}^FS`);
    }
    currentY += 44;
  }

  // Ürün Adı
  if (config.showProductName) {
    const cleanName = product.name.replace(/[^\w\s\-\.\/]/gi, '');
    lines.push(`^FO${paddingDots},${currentY}^A0N,28,28^FB${widthDots - (paddingDots * 2)},2,0,C^FD${cleanName}^FS`);
    currentY += 60;
  }

  // Stok Kodu & Kategori
  if (config.showSku) {
    lines.push(`^FO${paddingDots},${currentY}^A0N,20,20^FDSTOK: ${product.sku || product.id}^FS`);
    if (config.badges.showShelfLocation && config.badges.shelfLocationText) {
      lines.push(`^FO${widthDots - paddingDots - 200},${currentY}^A0N,20,20^FD${config.badges.shelfLocationText}^FS`);
    }
    currentY += 28;
  }

  // Barkod Çizimi (CODE128)
  const barcodeValue = product.barcode || product.sku || product.id;
  const barcodeHeightDots = Math.round(config.barcode.barcodeHeightMm * dotsPerMm);
  const offsetXDots = Math.round((config.barcode.barcodeOffsetXMm || 0) * dotsPerMm);
  const offsetYDots = Math.round((config.barcode.barcodeOffsetYMm || 0) * dotsPerMm);
  const barcodeX = Math.max(paddingDots, paddingDots + 20 + offsetXDots);
  const barcodeY = Math.max(paddingDots, currentY + offsetYDots);

  lines.push(`^FO${barcodeX},${barcodeY}^BY2,3,${barcodeHeightDots}^BCN,${barcodeHeightDots},Y,N,N^FD${barcodeValue}^FS`);
  currentY += barcodeHeightDots + 36;

  // Fiyat
  if (config.showPrice) {
    const priceText = `${product.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL`;
    lines.push(`^FO${paddingDots},${currentY}^A0N,36,36^FD${priceText}^FS`);
  }

  lines.push('^XZ'); // End Format
  return lines.join('\n');
}
