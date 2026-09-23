/**
 * Robust copy and share utilities supporting iframe sandbox environments
 */

export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // Method 1: Modern Clipboard API
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      console.warn('navigator.clipboard.writeText failed, trying fallback textarea:', e);
    }
  }

  // Method 2: Fallback using temporary textarea + execCommand
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    if (successful) return true;
  } catch (err) {
    console.error('Fallback execCommand copy failed:', err);
  }

  return false;
}

export function formatWhatsAppPhone(phone?: string): string {
  if (!phone) return '';
  // Remove non-digit characters
  let digits = phone.replace(/\D/g, '');
  if (!digits) return '';

  // If starts with 0090, strip leading 00
  if (digits.startsWith('0090')) {
    digits = digits.substring(2);
  }
  
  // If Turkish local number starting with 05XX (11 digits), replace 0 with 90
  if (digits.startsWith('05') && digits.length === 11) {
    digits = '90' + digits.substring(1);
  } else if (digits.startsWith('5') && digits.length === 10) {
    digits = '90' + digits;
  } else if (!digits.startsWith('90') && digits.length === 10) {
    digits = '90' + digits;
  }
  return digits;
}

export function openWhatsAppShare(options: { phone?: string; message: string }) {
  const cleanPhone = formatWhatsAppPhone(options.phone);
  const encodedText = encodeURIComponent(options.message);
  
  let url = '';
  if (cleanPhone) {
    url = `https://wa.me/${cleanPhone}?text=${encodedText}`;
  } else {
    url = `https://wa.me/?text=${encodedText}`;
  }

  // Safe window open
  try {
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (!win || win.closed || typeof win.closed === 'undefined') {
      window.location.href = url;
    }
  } catch (err) {
    window.location.href = url;
  }
}

export async function shareContent(options: {
  title: string;
  text: string;
  url?: string;
  phone?: string;
}): Promise<'native' | 'whatsapp' | 'copied' | 'failed'> {
  // Check if Web Share API is supported (mobile devices / modern browsers)
  if (navigator.share && navigator.canShare && navigator.canShare({ title: options.title, text: options.text })) {
    try {
      await navigator.share({
        title: options.title,
        text: options.text,
        url: options.url,
      });
      return 'native';
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Native share cancelled or failed:', err);
      }
    }
  }

  // If WhatsApp phone is available or on fallback, try copying + returning copied
  const copied = await copyToClipboard(options.text);
  return copied ? 'copied' : 'failed';
}

/**
 * WhatsApp Mesaj Şablonları (ALPHA TEKNİK)
 */

export function generateOrderWhatsAppMessage(order: {
  orderNumber: string;
  customerName: string;
  total: number;
  status: string;
  items: Array<{ productName: string; quantity: number; unit: string; totalPrice: number }>;
  customerAddress?: string;
  trackingNumber?: string;
}, companyName = 'ALPHA TEKNİK DOĞALGAZ & SIHHİ TESİSAT'): string {
  const statusMap: Record<string, string> = {
    pending: '⏳ Onay Bekliyor',
    approved: '✅ Sipariş Onaylandı',
    preparing: '📦 Paketleniyor / Hazırlanıyor',
    shipped: '🚚 Sevkiyatta / Dağıtımda',
    delivered: '🏁 Teslim Edildi',
    cancelled: '❌ İptal Edildi'
  };

  const statusText = statusMap[order.status] || order.status;
  const itemsText = order.items
    .slice(0, 8)
    .map((item, idx) => `${idx + 1}. ${item.productName} (${item.quantity} ${item.unit}) - ${item.totalPrice.toLocaleString('tr-TR')} ₺`)
    .join('\n');
  const moreCount = order.items.length > 8 ? `\n... ve ${order.items.length - 8} kalem ürün daha` : '';

  return `*${companyName}*\n` +
    `📋 *SİPARİŞ BİLGİLENDİRMESİ*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `Sayın *${order.customerName}*,\n\n` +
    `*Sipariş No:* #${order.orderNumber}\n` +
    `*Durum:* ${statusText}\n` +
    (order.trackingNumber ? `*Sevkiyat / Takip No:* ${order.trackingNumber}\n` : '') +
    `\n*Sipariş Kalemleri:*\n${itemsText}${moreCount}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `💰 *Genel Toplam:* *${order.total.toLocaleString('tr-TR')} ₺* (KDV Dahil)\n` +
    (order.customerAddress ? `📍 *Teslimat Adresi:* ${order.customerAddress}\n` : '') +
    `\n_Sorularınız veya sevkiyat teyidi için bu mesajı yanıtlayabilirsiniz._\n` +
    `📞 İletişim: +90 216 456 78 90\n` +
    `🌐 https://alphateknik.com.tr`;
}

export function generateQuoteWhatsAppMessage(quote: {
  quoteNumber: string;
  customerName: string;
  customerCompany?: string;
  grandTotal?: number;
  discountAmount?: number;
  validUntil?: string;
  offeredItems?: Array<{ productName: string; quantity: number; unit: string; offeredUnitPrice: number; totalPrice: number }>;
}, companyName = 'ALPHA TEKNİK DOĞALGAZ & SIHHİ TESİSAT'): string {
  const itemsText = (quote.offeredItems || [])
    .slice(0, 8)
    .map((item, idx) => `${idx + 1}. ${item.productName} (${item.quantity} ${item.unit}) - Birim: ${item.offeredUnitPrice.toLocaleString('tr-TR')} ₺`)
    .join('\n');
  const moreCount = (quote.offeredItems?.length || 0) > 8 ? `\n... ve ${(quote.offeredItems?.length || 0) - 8} kalem ürün daha` : '';

  return `*${companyName}*\n` +
    `📑 *RESMİ FİYAT TEKLİFİ*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `Sayın *${quote.customerName}* ${quote.customerCompany ? `(${quote.customerCompany})` : ''},\n\n` +
    `*Teklif No:* #${quote.quoteNumber}\n` +
    (quote.validUntil ? `*Geçerlilik Tarihi:* ${quote.validUntil}\n` : '') +
    `\n*Özel Fiyatlandırılan Ürünler:*\n${itemsText}${moreCount}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    (quote.discountAmount ? `🏷️ *Tanımlanan Özel İskonto:* ${quote.discountAmount.toLocaleString('tr-TR')} ₺\n` : '') +
    `💰 *Teklif Toplamı:* *${(quote.grandTotal || 0).toLocaleString('tr-TR')} ₺* (KDV Dahil)\n\n` +
    `_Teklifi onaylamak ve siparişi başlatmak için 'Onaylıyorum' yazarak bu mesajı yanıtlayabilirsiniz._\n` +
    `📞 Satış Departmanı: +90 216 456 78 90\n` +
    `✉️ info@alphateknik.com.tr`;
}

export function generateCariStatementWhatsAppMessage(cari: {
  companyName: string;
  name: string;
  balance: number;
  totalDebit: number;
  totalCredit: number;
  code?: string;
}, companyName = 'ALPHA TEKNİK'): string {
  const isBorclu = cari.balance > 0;
  const balanceStatus = isBorclu 
    ? `🔴 Borç Bakiyesi: *${Math.abs(cari.balance).toLocaleString('tr-TR')} ₺*`
    : cari.balance < 0 
    ? `🟢 Alacak Bakiyesi: *${Math.abs(cari.balance).toLocaleString('tr-TR')} ₺*`
    : `⚪ Bakiye: *0.00 ₺ (Kapalı / Borçsuz)*`;

  return `*${companyName}* - *Cari Bakiye Bilgilendirmesi*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `Sayın *${cari.companyName || cari.name}*,\n\n` +
    (cari.code ? `*Cari Kod:* ${cari.code}\n` : '') +
    `*Toplam Faturalanan (Borç):* ${cari.totalDebit.toLocaleString('tr-TR')} ₺\n` +
    `*Toplam Yapılan Tahsilat (Alacak):* ${cari.totalCredit.toLocaleString('tr-TR')} ₺\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📊 *GÜNCEL NET BAKİYE:* ${balanceStatus}\n\n` +
    (isBorclu ? `💳 *Ana Tahsilat Hesabımız (Garanti BBVA):*\nIBAN: *TR12 0006 2000 0001 2345 6789 01*\nAlıcı: *ALPHA TEKNİK DOĞALGAZ SIHHİ TESİSAT LTD. ŞTİ.*\n\n` : '') +
    `_Hesap mutabakatı ve detaylı ekstre talepleriniz için lütfen bize ulaşınız._\n` +
    `📞 Muhasebe & Finans: +90 216 456 78 90`;
}

export function generateEInvoiceWhatsAppMessage(invoice: {
  invoiceNumber: string;
  uuid: string;
  customerTitle: string;
  payableAmount: number;
  invoiceDate: string;
  profile: string;
  type: string;
}, companyName = 'ALPHA TEKNİK'): string {
  return `*${companyName}* - *E-Fatura / E-Arşiv Bildirimi*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `Sayın *${invoice.customerTitle}*,\n\n` +
    `Adınıza düzenlenen GİB onaylı resmi e-faturanız sisteme iletilmiştir.\n\n` +
    `🧾 *Fatura No:* ${invoice.invoiceNumber}\n` +
    `🔑 *ETTN (UUID):* ${invoice.uuid}\n` +
    `📅 *Fatura Tarihi:* ${invoice.invoiceDate}\n` +
    `📌 *Fatura Senaryosu:* ${invoice.profile} / ${invoice.type}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `💰 *Ödenecek Tutar:* *${invoice.payableAmount.toLocaleString('tr-TR')} ₺*\n\n` +
    `_Faturanızı mali müşavirinize iletebilir veya portaldan PDF olarak indirebilirsiniz._\n` +
    `📞 Muhasebe: +90 216 456 78 90`;
}

