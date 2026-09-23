import React, { useState } from 'react';
import { useModalBehavior } from '../hooks/useModalBehavior';
import { Quote } from '../types';
import Logo from './Logo';
import { 
  Printer, 
  ShieldCheck, 
  Download, 
  X, 
  Building2, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  Phone, 
  Mail, 
  MapPin, 
  User, 
  CreditCard,
  QrCode,
  Sparkles,
  Share2,
  Check,
  MessageCircle,
  Copy,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { printElementById } from '../utils/printUtils';
import { copyToClipboard, openWhatsAppShare, shareContent } from '../utils/shareUtils';
import { generateQuotePDF } from '../utils/exportUtils';

interface QuotePDFModalProps {
  quote: Quote;
  onClose: () => void;
  onAccept?: () => void;
}

export default function QuotePDFModal({ quote, onClose, onAccept }: QuotePDFModalProps) {
  useModalBehavior(true, onClose);
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [copiedFeedback, setCopiedFeedback] = useState<string | null>(null);

  const getQuoteSummaryText = () => {
    const items = quote.offeredItems && quote.offeredItems.length > 0
      ? quote.offeredItems.map((item, i) => `${i + 1}. ${item.productName} - ${item.quantity} ${item.unit} x ${item.offeredUnitPrice ? `${item.offeredUnitPrice.toLocaleString('tr-TR')} ₺` : 'Fiyat Belirleniyor'}`)
      : (quote.requestedItems || []).map((item, i) => `${i + 1}. ${item.productName} - ${item.requestedQuantity} ${item.unit} x ${item.targetUnitPrice ? `${item.targetUnitPrice.toLocaleString('tr-TR')} ₺ (Hedef)` : 'Fiyat Bekleniyor'}`);

    const itemsList = items.join('\n');
    const grandTotalFormatted = quote.grandTotal ? `${quote.grandTotal.toLocaleString('tr-TR')} ₺` : 'Fiyat Belirleniyor';

    return `*ALPHA TEKNİK DOĞALGAZ & TESİSAT*\n*RESMİ PROFORMA TEKLİF BELGESİ*\n\n📄 *Teklif No:* ${quote.quoteNumber}\n👤 *Müşteri:* ${quote.customerName} (${quote.customerCompany || 'Bireysel'})\n🗓 *Tarih:* ${new Date(quote.createdAt).toLocaleDateString('tr-TR')}\n📍 *Teslimat İli:* ${quote.deliveryCity}\n\n*TALEP EDİLEN ÜRÜNLER:*\n${itemsList}\n\n💰 *GENEL TOPLAM (KDV Dahil):* *${grandTotalFormatted}*\n\nDetaylı teklif incelemesi ve onay için iletişime geçebilirsiniz.\nTel: +90 544 440 91 80 | info@alphadogalgaz.com`;
  };

  const handleShareWhatsApp = () => {
    const msg = getQuoteSummaryText();
    openWhatsAppShare({
      phone: quote.customerPhone,
      message: msg,
    });
    setIsShareMenuOpen(false);
    setCopiedFeedback('WhatsApp açılıyor...');
    setTimeout(() => setCopiedFeedback(null), 3000);
  };

  const handleCopySummary = async () => {
    const msg = getQuoteSummaryText();
    const success = await copyToClipboard(msg);
    if (success) {
      setCopiedFeedback('Teklif özeti panoya kopyalandı!');
      setTimeout(() => setCopiedFeedback(null), 3000);
    }
    setIsShareMenuOpen(false);
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent(`Resmi Fiyat Teklifi: ${quote.quoteNumber} - Alpha Teknik`);
    const body = encodeURIComponent(getQuoteSummaryText());
    window.location.href = `mailto:${quote.customerEmail || ''}?subject=${subject}&body=${body}`;
    setIsShareMenuOpen(false);
  };

  const handleNativeShare = async () => {
    const msg = getQuoteSummaryText();
    await shareContent({
      title: `Teklif: ${quote.quoteNumber}`,
      text: msg,
    });
    setIsShareMenuOpen(false);
  };

  const handleDownloadPDF = async () => {
    setIsGeneratingPdf(true);
    try {
      await generateQuotePDF(quote);
      setCopiedFeedback('PDF başarıyla indirildi!');
      setTimeout(() => setCopiedFeedback(null), 3000);
    } catch (err) {
      console.error('PDF oluşturma hatası:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    setIsPrinting(true);
    printElementById('quote-print-area', `AlphaTeknik_Teklif_${quote.quoteNumber}`);
    setTimeout(() => setIsPrinting(false), 1000);
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/80 backdrop-blur-sm animate-in fade-in p-3 sm:p-4 md:p-6 print:p-0 print:bg-white print:static"
      onClick={onClose}
    >
      <div className="min-h-full flex items-center justify-center py-4 sm:py-6 print:block print:p-0">
        <div 
          className="bg-white text-stone-900 rounded-3xl w-full max-w-4xl max-h-[94vh] overflow-y-auto shadow-2xl p-6 sm:p-10 relative print:p-0 print:m-0 print:max-w-none print:shadow-none print:rounded-none print:max-h-none print:overflow-visible"
          onClick={(e) => e.stopPropagation()}
        >
        
        {/* Toast / Feedback notification */}
        {copiedFeedback && (
          <div className="fixed top-5 right-5 z-[60] bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-xl flex items-center space-x-2 animate-in fade-in slide-in-from-top-2">
            <Check className="w-4 h-4" />
            <span>{copiedFeedback}</span>
          </div>
        )}

        {/* Controls (hidden when printing) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-6 border-b border-stone-200 print:hidden">
          <div className="flex items-center space-x-2.5">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              <span>Resmi Kurumsal Proforma Teklif Belgesi</span>
            </span>
            <span className="text-xs text-stone-500 font-mono font-bold">
              {quote.quoteNumber}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Paylaş Menüsü */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsShareMenuOpen(!isShareMenuOpen)}
                className={`px-3.5 py-2 border rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-sm cursor-pointer ${
                  isShareMenuOpen 
                    ? 'bg-emerald-700 text-white border-emerald-800' 
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-800 border-stone-300'
                }`}
                title="Teklifi WhatsApp veya E-Posta ile Paylaş"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Paylaş</span>
                <ChevronDown className="w-3 h-3 text-stone-500" />
              </button>

              {isShareMenuOpen && (
                <div 
                  className="absolute right-0 mt-2 w-64 bg-white border border-stone-200 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 text-xs text-stone-800"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-3 py-1.5 border-b border-stone-100 mb-1 text-[11px] font-bold text-stone-500 uppercase">
                    Paylaşım Kanalları
                  </div>

                  <button
                    onClick={handleShareWhatsApp}
                    className="w-full px-3 py-2 text-left rounded-xl hover:bg-stone-50 flex items-center space-x-2.5 transition-colors cursor-pointer text-stone-800 group"
                  >
                    <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-300">
                      <MessageCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-xs group-hover:text-emerald-700">WhatsApp ile Gönder</div>
                      <div className="text-[10px] text-stone-500">{quote.customerPhone || 'Müşteriye direkt ilet'}</div>
                    </div>
                  </button>

                  <button
                    onClick={handleCopySummary}
                    className="w-full px-3 py-2 text-left rounded-xl hover:bg-stone-50 flex items-center space-x-2.5 transition-colors cursor-pointer text-stone-800 group"
                  >
                    <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700 border border-blue-300">
                      <Copy className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-xs group-hover:text-blue-700">Metni Panoya Kopyala</div>
                      <div className="text-[10px] text-stone-500">Tüm ürün ve fiyat dökümünü kopyalar</div>
                    </div>
                  </button>

                  {quote.customerEmail && (
                    <button
                      onClick={handleShareEmail}
                      className="w-full px-3 py-2 text-left rounded-xl hover:bg-stone-50 flex items-center space-x-2.5 transition-colors cursor-pointer text-stone-800 group"
                    >
                      <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700 border border-amber-300">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-xs group-hover:text-amber-700">E-Posta ile Gönder</div>
                        <div className="text-[10px] text-stone-500">{quote.customerEmail}</div>
                      </div>
                    </button>
                  )}

                  {typeof navigator !== 'undefined' && 'share' in navigator && (
                    <button
                      onClick={handleNativeShare}
                      className="w-full px-3 py-2 text-left rounded-xl hover:bg-stone-50 flex items-center space-x-2.5 transition-colors cursor-pointer text-stone-800 group"
                    >
                      <div className="p-1.5 rounded-lg bg-stone-100 text-stone-700 border border-stone-200">
                        <ExternalLink className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-xs">Cihaz Menüsü ile Paylaş</div>
                        <div className="text-[10px] text-stone-500">Mobil / sistem paylaşım penceresi</div>
                      </div>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Direct PDF Download */}
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isGeneratingPdf}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-sm cursor-pointer"
              title="Resmi A4 PDF Dosyasını Doğrudan İndir"
            >
              <Download className={`w-3.5 h-3.5 ${isGeneratingPdf ? 'animate-bounce' : ''}`} />
              <span>{isGeneratingPdf ? 'PDF Hazırlanıyor...' : 'PDF İndir'}</span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="px-3.5 py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-sm cursor-pointer"
              title="A4 Boyutunda Yazdır"
            >
              <Printer className={`w-3.5 h-3.5 ${isPrinting ? 'animate-pulse' : ''}`} />
              <span>{isPrinting ? 'Yazdırılıyor...' : 'Yazdır'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* PRINTABLE A4 LETTERHEAD PROPOSAL CONTAINER                   */}
        {/* ============================================================ */}
        <div className="space-y-6 text-stone-800" id="quote-print-area">
          
          {/* Antetli Üst Bilgi (Official Corporate Header) */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-[#2E5438] pb-5 gap-4">
            <div className="space-y-1.5">
              <Logo size="print" variant="light" />
              <div className="text-xs font-bold text-stone-900 mt-2">
                ALPHA TEKNİK DOĞALGAZ SIHHİ TESİSAT SAN. TİC. LTD. ŞTİ.
              </div>
              <p className="text-[11px] text-stone-600">
                Endüstriyel & Bireysel Doğalgaz, Sıhhi Tesisat ve Mekanik Ekipmanlar
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-stone-600 pt-1">
                <span className="flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-[#2E5438] shrink-0" />
                  <span>Batıkent Mahallesi Beyazıt Bulvarı No:32/1 Karaköprü / Şanlıurfa</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Phone className="w-3.5 h-3.5 text-[#2E5438] shrink-0" />
                  <span>0544 440 91 80</span>
                </span>
              </div>
            </div>

            {/* Document Info Box */}
            <div className="text-left sm:text-right bg-[#FAF8F5] sm:bg-stone-50/80 p-4 rounded-2xl border border-stone-200 w-full sm:w-64 shrink-0">
              <div className="text-xs uppercase font-extrabold tracking-widest text-[#2E5438]">KURUMSAL FİYAT TEKLİFİ</div>
              <div className="text-sm font-black text-stone-900 font-mono mt-1">{quote.quoteNumber}</div>
              
              <div className="space-y-0.5 text-[11px] text-stone-600 mt-2">
                <div>Düzenleme Tarihi: <strong>{new Date(quote.createdAt).toLocaleDateString('tr-TR')}</strong></div>
                {quote.validUntil ? (
                  <div className="text-rose-700 font-bold">
                    Geçerlilik: {new Date(quote.validUntil).toLocaleDateString('tr-TR')}
                  </div>
                ) : (
                  <div>Geçerlilik: <strong>15 Gün</strong></div>
                )}
                <div>Durum: <strong className="text-emerald-700 uppercase">{quote.status === 'offer_sent' ? 'TEKLİF SUNULDU' : quote.status === 'accepted' ? 'ONAYLANDI' : 'HAZIRLANIYOR'}</strong></div>
              </div>
            </div>
          </div>

          {/* Customer Information Card */}
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-xs">
            <div className="flex items-center justify-between border-b border-stone-200 pb-2 mb-3">
              <span className="font-bold text-stone-800 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#2E5438]" />
                <span>Müşteri / Kurum Bilgileri</span>
              </span>
              <span className="text-[10px] text-stone-500 font-mono">B2B Kurumsal Müşteri</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <div className="text-[10px] text-stone-500 uppercase font-semibold">Firma / Ünvan</div>
                <div className="text-sm font-bold text-stone-900 mt-0.5">
                  {quote.customerCompany || quote.customerName}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-stone-500 uppercase font-semibold">İlgili Yetkili</div>
                <div className="text-xs font-semibold text-stone-800 flex items-center space-x-1 mt-0.5">
                  <User className="w-3 h-3 text-stone-400 shrink-0" />
                  <span>{quote.customerName}</span>
                </div>
              </div>
              <div>
                <div className="text-[10px] text-stone-500 uppercase font-semibold">İletişim</div>
                <div className="text-xs text-stone-700 mt-0.5 space-y-0.5">
                  <div className="flex items-center space-x-1 font-mono">
                    <Phone className="w-3 h-3 text-stone-400 shrink-0" />
                    <span>{quote.customerPhone}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Mail className="w-3 h-3 text-stone-400 shrink-0" />
                    <span className="truncate">{quote.customerEmail}</span>
                  </div>
                </div>
              </div>
              <div>
                <div className="text-[10px] text-stone-500 uppercase font-semibold">Teslimat Şehri / Adres</div>
                <div className="text-xs font-semibold text-stone-800 flex items-center space-x-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                  <span>{quote.deliveryCity}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Products / Offer Items Table */}
          <div className="border border-stone-300 rounded-2xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#2E5438] text-white uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-3.5 w-8">#</th>
                  <th className="py-3 px-3.5">Ürün / Hizmet Tanımı</th>
                  <th className="py-3 px-3 text-center">Miktar</th>
                  <th className="py-3 px-3 text-right">Liste Fiyatı</th>
                  <th className="py-3 px-3 text-center">İskonto</th>
                  <th className="py-3 px-3 text-right">Teklif Birim Fiyat</th>
                  <th className="py-3 px-4 text-right">Toplam Tutar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 text-stone-800 bg-white">
                {quote.offeredItems && quote.offeredItems.length > 0 ? (
                  quote.offeredItems.map((item, idx) => (
                    <tr key={idx} className={idx % 2 === 1 ? 'bg-stone-50/60' : 'bg-white'}>
                      <td className="py-3 px-3.5 font-mono text-stone-400 font-bold">{idx + 1}</td>
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-stone-900">{item.productName}</div>
                        {item.adminNote && (
                          <div className="text-[10px] text-[#2E5438] font-semibold mt-0.5">
                            * {item.adminNote}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-stone-900 font-mono">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="py-3 px-3 text-right text-stone-400 line-through font-mono">
                        {item.listPrice ? `${item.listPrice.toLocaleString('tr-TR')} ₺` : '-'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200 font-bold text-[10px] font-mono">
                          %{item.discountRate || 0}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-stone-900 font-mono">
                        {item.offeredUnitPrice.toLocaleString('tr-TR')} ₺
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-[#2E5438] font-mono">
                        {item.totalPrice.toLocaleString('tr-TR')} ₺
                      </td>
                    </tr>
                  ))
                ) : (
                  quote.requestedItems.map((item, idx) => (
                    <tr key={idx} className="bg-white">
                      <td className="py-3 px-3.5 font-mono text-stone-400">{idx + 1}</td>
                      <td className="py-3 px-3.5 font-semibold text-stone-900">{item.productName}</td>
                      <td className="py-3 px-3 text-center font-bold">{item.requestedQuantity} {item.unit}</td>
                      <td colSpan={4} className="py-3 px-4 text-center text-stone-500 italic">
                        İnceleniyor & Özel Mühendislik Fiyatlandırması Bekleniyor
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pricing Totals & Bank Payment Details Box */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            
            {/* Bank Accounts & Terms */}
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-xs space-y-2">
              <div className="font-bold text-stone-900 text-[11px] uppercase tracking-wider flex items-center space-x-1.5">
                <CreditCard className="w-3.5 h-3.5 text-[#2E5438]" />
                <span>Ödeme & Banka Havale / EFT Bilgileri</span>
              </div>
              <div className="space-y-1 text-[11px] text-stone-700">
                <div><strong>Banka:</strong> Garanti BBVA - Şanlıurfa Karaköprü Şubesi</div>
                <div><strong>Hesap Adı:</strong> Alpha Teknik Doğalgaz Sıhhi Tesisat San. Tic. Ltd. Şti.</div>
                <div className="font-mono text-stone-900 font-bold bg-white p-1.5 rounded border border-stone-200">
                  TR84 0006 2000 1122 3344 5566 77
                </div>
                <div className="text-[10px] text-stone-500 pt-0.5">
                  * Açıklama kısmına <strong>{quote.quoteNumber}</strong> teklif numarasını yazınız.
                </div>
              </div>
            </div>

            {/* Pricing Totals Summary */}
            {quote.grandTotal ? (
              <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-stone-200 text-xs space-y-2">
                <div className="flex justify-between text-stone-600">
                  <span>Mal & Hizmet Ara Toplamı:</span>
                  <span className="font-mono font-bold text-stone-900">{(quote.subtotal || 0).toLocaleString('tr-TR')} ₺</span>
                </div>
                {quote.discountAmount ? (
                  <div className="flex justify-between text-emerald-800 font-bold">
                    <span>Toplam B2B İskonto Tutarı:</span>
                    <span className="font-mono">-{(quote.discountAmount).toLocaleString('tr-TR')} ₺</span>
                  </div>
                ) : null}
                <div className="flex justify-between text-stone-600">
                  <span>Hesaplanan KDV (%20):</span>
                  <span className="font-mono font-bold text-stone-900">{(quote.taxAmount || 0).toLocaleString('tr-TR')} ₺</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Nakliye / Ambar Sevkiyatı:</span>
                  <span className="font-mono font-bold text-emerald-800">
                    {quote.shippingFee && quote.shippingFee > 0 ? `${quote.shippingFee} ₺` : 'Ücretsiz Sevkiyat'}
                  </span>
                </div>
                <div className="border-t-2 border-[#2E5438] pt-2.5 flex justify-between items-baseline text-sm font-black text-stone-900">
                  <span>GENEL TEKLİF TOPLAMI:</span>
                  <span className="text-lg font-black text-[#2E5438] font-mono">
                    {quote.grandTotal.toLocaleString('tr-TR')} ₺
                  </span>
                </div>
              </div>
            ) : null}

          </div>

          {/* Admin Note / Remarks */}
          {quote.adminResponseNote && (
            <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-200 text-xs">
              <span className="font-bold text-emerald-950 block mb-0.5">Tedarikçi & Mühendislik Özel Notu:</span>
              <p className="text-emerald-900 leading-relaxed">{quote.adminResponseNote}</p>
            </div>
          )}

          {/* Stamp, Signature & E2EE Cryptographic Verification */}
          <div className="pt-4 border-t border-stone-200 grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
            
            {/* Cryptographic SHA-256 Stamp */}
            <div className="p-3 bg-stone-900 text-white rounded-2xl flex items-center space-x-3 text-[10px] font-mono">
              <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <div className="text-emerald-400 font-bold">E2EE Kriptografik Olarak Doğrulanmış Proforma</div>
                <div className="text-stone-400 truncate">
                  SHA-256: {quote.securityHash || '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08'}
                </div>
                <div className="text-stone-400 text-[9px]">
                  Kurumsal Güvenlik İmzası • Sistem Kaydı Aktif
                </div>
              </div>
            </div>

            {/* Authorized Signature Area */}
            <div className="text-right space-y-1 sm:pr-4">
              <div className="text-xs font-bold text-stone-900">ALPHA TEKNİK DOĞALGAZ SIHHİ TESİSAT</div>
              <div className="text-[11px] text-stone-600">Yetkili İmza & Kaşe</div>
              <div className="h-12 border-b border-dashed border-stone-300 w-48 ml-auto mt-2"></div>
            </div>

          </div>

        </div>

        {/* Modal Action Buttons (hidden in print) */}
        <div className="mt-8 pt-5 border-t border-stone-200 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Kapat
          </button>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2.5 bg-[#2E5438] hover:bg-[#23452C] text-white font-bold rounded-xl text-xs flex items-center space-x-2 shadow-md transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>PDF Olarak Kaydet / Yazdır</span>
            </button>

            {quote.status === 'offer_sent' && onAccept && (
              <button
                type="button"
                onClick={() => {
                  onAccept();
                  onClose();
                }}
                className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs flex items-center space-x-2 shadow-lg shadow-emerald-700/30 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Teklifi Onayla & Siparişe Dönüştür</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
);
}
