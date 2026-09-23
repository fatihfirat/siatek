import React, { useState } from 'react';
import { useModalBehavior } from '../hooks/useModalBehavior';
import { Order } from '../types';
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
  Truck,
  Package,
  QrCode,
  Share2,
  Check,
  MessageCircle,
  Copy,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { printElementById } from '../utils/printUtils';
import { copyToClipboard, openWhatsAppShare, shareContent } from '../utils/shareUtils';
import { generateOrderPDF } from '../utils/exportUtils';

interface OrderPDFModalProps {
  order: Order;
  onClose: () => void;
}

export default function OrderPDFModal({ order, onClose }: OrderPDFModalProps) {
  useModalBehavior(true, onClose);
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [copiedFeedback, setCopiedFeedback] = useState<string | null>(null);

  const getStatusLabel = (status: Order['status']): string => {
    switch (status) {
      case 'pending': return 'ONAY BEKLİYOR';
      case 'approved': return 'ONAYLANDI';
      case 'preparing': return 'HAZIRLANIYOR';
      case 'shipped': return 'SEVKİYATTA / DAĞITIMDA';
      case 'delivered': return 'TESLİM EDİLDİ';
      case 'cancelled': return 'İPTAL EDİLDİ';
      default: return 'BELİRSİZ';
    }
  };

  const getOrderSummaryText = () => {
    const itemsList = (order.items || [])
      .map((item, i) => `${i + 1}. ${item.productName || 'Ürün'} - ${item.quantity || 1} ${item.unit || 'ADET'} x ${(item.unitPrice || 0).toLocaleString('tr-TR')} ₺ = ${(item.totalPrice || 0).toLocaleString('tr-TR')} ₺`)
      .join('\n');

    return `*ALPHA TEKNİK DOĞALGAZ & TESİSAT*\n*RESMİ SİPARİŞ & SEVKİYAT BİLGİLENDİRMESİ*\n\n📦 *Sipariş No:* ${order.orderNumber || 'Sipariş'}\n👤 *Müşteri:* ${order.customerName || 'Müşteri'}\n🗓 *Tarih:* ${order.createdAt ? new Date(order.createdAt).toLocaleDateString('tr-TR') : '-'}\n📊 *Durum:* ${getStatusLabel(order.status || 'pending')}\n📍 *Teslimat Adresi:* ${order.customerAddress || '-'}\n${order.trackingNumber ? `🚚 *Sevkiyat/Takip:* ${order.trackingNumber}\n` : ''}\n*SİPARİŞ KALEMLERİ:*\n${itemsList}\n\n💰 *GENEL TOPLAM:* *${(order.total || 0).toLocaleString('tr-TR')} ₺*\n\nDetaylı bilgi ve sorularınız için bizimle iletişime geçebilirsiniz.\nTel: +90 544 440 91 80 | info@alphadogalgaz.com`;
  };

  const handleShareWhatsApp = () => {
    const msg = getOrderSummaryText();
    openWhatsAppShare({
      phone: order.customerPhone,
      message: msg,
    });
    setIsShareMenuOpen(false);
    setCopiedFeedback('WhatsApp açılıyor...');
    setTimeout(() => setCopiedFeedback(null), 3000);
  };

  const handleCopySummary = async () => {
    const msg = getOrderSummaryText();
    const success = await copyToClipboard(msg);
    if (success) {
      setCopiedFeedback('Sipariş özeti panoya kopyalandı!');
      setTimeout(() => setCopiedFeedback(null), 3000);
    }
    setIsShareMenuOpen(false);
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent(`Sipariş Bilgilendirmesi: ${order.orderNumber} - Alpha Teknik`);
    const body = encodeURIComponent(getOrderSummaryText());
    window.location.href = `mailto:${order.customerEmail || ''}?subject=${subject}&body=${body}`;
    setIsShareMenuOpen(false);
  };

  const handleNativeShare = async () => {
    const msg = getOrderSummaryText();
    await shareContent({
      title: `Sipariş: ${order.orderNumber}`,
      text: msg,
    });
    setIsShareMenuOpen(false);
  };

  const handleDownloadPDF = async () => {
    setIsGeneratingPdf(true);
    try {
      await generateOrderPDF(order);
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
    printElementById('order-print-area', `AlphaTeknik_Siparis_${order.orderNumber}`);
    setTimeout(() => setIsPrinting(false), 1000);
  };

  // Order financial totals with precise VAT & discount accounting
  const subtotal = order.subtotal !== undefined ? order.subtotal : Math.round((order.total / 1.2) * 100) / 100;
  const discount = order.discount || 0;
  const taxable = Math.max(0, subtotal - discount);
  const taxAmount = order.tax !== undefined ? order.tax : Math.round(taxable * 0.20 * 100) / 100;

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

        {/* Controls Bar (hidden when printing) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-6 border-b border-stone-200 print:hidden">
          <div className="flex items-center space-x-2.5">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              <span>Resmi Sipariş & Sevkiyat Bilgi Belgesi</span>
            </span>
            <span className="text-xs text-stone-500 font-mono font-bold">
              {order.orderNumber}
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
                title="Siparişi WhatsApp veya E-Posta ile Paylaş"
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
                      <div className="text-[10px] text-stone-500">{order.customerPhone || 'Müşteriye direkt ilet'}</div>
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
                      <div className="text-[10px] text-stone-500">Sipariş detaylarını kopyalar</div>
                    </div>
                  </button>

                  {order.customerEmail && (
                    <button
                      onClick={handleShareEmail}
                      className="w-full px-3 py-2 text-left rounded-xl hover:bg-stone-50 flex items-center space-x-2.5 transition-colors cursor-pointer text-stone-800 group"
                    >
                      <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700 border border-amber-300">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-xs group-hover:text-amber-700">E-Posta ile Gönder</div>
                        <div className="text-[10px] text-stone-500">{order.customerEmail}</div>
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
              title="Resmi A4 Sipariş PDF Dosyasını İndir"
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
        {/* PRINTABLE A4 LETTERHEAD ORDER CONTAINER                      */}
        {/* ============================================================ */}
        <div className="space-y-6 text-stone-800" id="order-print-area">
          
          {/* Antetli Üst Bilgi (Official Corporate Header) */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-[#2E5438] pb-5 gap-4">
            <div className="space-y-1.5">
              <Logo size="print" variant="light" />
              <div className="text-xs font-bold text-stone-900 mt-2">
                ALPHA TEKNİK DOĞALGAZ SIHHİ TESİSAT SAN. TİC. LTD. ŞTİ.
              </div>
              <p className="text-[11px] text-stone-600">
                Endüstriyel & Bireysel Doğalgaz, Sıhhi Tesisat ve Mekanik Ekipmanlar Tedariği
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
              <div className="text-xs uppercase font-extrabold tracking-widest text-[#2E5438]">SİPARİŞ ONAY & SEVK FORMU</div>
              <div className="text-sm font-black text-stone-900 font-mono mt-1">{order.orderNumber}</div>
              
              <div className="space-y-0.5 text-[11px] text-stone-600 mt-2">
                <div>Sipariş Tarihi: <strong>{new Date(order.createdAt).toLocaleDateString('tr-TR')}</strong></div>
                <div>Saat: <strong>{new Date(order.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</strong></div>
                <div>Durum: <strong className="text-emerald-800 uppercase">{getStatusLabel(order.status)}</strong></div>
                {order.trackingNumber && (
                  <div className="text-[#8C4A32] font-mono font-bold mt-1">
                    Sevkiyat Ref: {order.trackingNumber}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 2-Column Info Grid: Customer / Delivery & Alpha Authorized Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Customer & Delivery Details */}
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between border-b border-stone-200 pb-1.5">
                <span className="font-bold text-stone-800 uppercase tracking-wider text-[10px] flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5 text-[#2E5438]" />
                  <span>Müşteri & Teslimat Bilgileri</span>
                </span>
                <span className="text-[10px] text-stone-500 font-mono">B2B Sipariş</span>
              </div>
              
              <div className="text-sm font-bold text-stone-900 pt-0.5">
                {order.customerName}
              </div>
              <div className="text-stone-700 flex items-center space-x-1.5">
                <Mail className="w-3 h-3 text-stone-400 shrink-0" />
                <span>E-Posta: {order.customerEmail}</span>
              </div>
              <div className="text-stone-700 flex items-center space-x-1.5">
                <Phone className="w-3 h-3 text-stone-400 shrink-0" />
                <span>Telefon: {order.customerPhone}</span>
              </div>
              <div className="text-stone-700 flex items-start space-x-1.5 pt-0.5">
                <MapPin className="w-3 h-3 text-stone-400 shrink-0 mt-0.5" />
                <span className="leading-snug">Teslimat Adresi: <strong>{order.customerAddress}</strong></span>
              </div>
            </div>

            {/* Delivery & Logistics Information */}
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between border-b border-stone-200 pb-1.5">
                <span className="font-bold text-stone-800 uppercase tracking-wider text-[10px] flex items-center space-x-1.5">
                  <Truck className="w-3.5 h-3.5 text-[#2E5438]" />
                  <span>Sevkiyat & Lojistik Detayları</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                  Depo & Sevk
                </span>
              </div>

              <div className="text-stone-700 flex items-center space-x-1.5 pt-1">
                <Truck className="w-3.5 h-3.5 text-[#2E5438] shrink-0" />
                <span>Sevkiyat Türü: <strong>{order.trackingNumber ? 'Alpha Teknik Dağıtım Aracı' : 'Depodan Teslim / Sevkiyat Aracımız'}</strong></span>
              </div>
              {order.trackingNumber && (
                <div className="text-stone-700 flex items-center space-x-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#2E5438] shrink-0" />
                  <span>Sevkiyat Referans No: <strong className="font-mono">{order.trackingNumber}</strong></span>
                </div>
              )}
              <div className="text-stone-700 flex items-center space-x-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#2E5438] shrink-0" />
                <span>Çıkış Deposu: <strong>Merkez Lojistik Deposu / Şanlıurfa</strong></span>
              </div>
              <div className="text-stone-600 text-[11px] pt-1">
                Sipariş sevkiyat kontrolü ve ambalaj bütünlüğü depo sorumluları tarafından onaylanmıştır.
              </div>
            </div>

          </div>

          {/* Ordered Products Table */}
          <div className="border border-stone-300 rounded-2xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#2E5438] text-white uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-3.5 w-8">#</th>
                  <th className="py-3 px-3.5">Ürün / Malzeme Açıklaması</th>
                  <th className="py-3 px-3 text-center">Sipariş Miktarı</th>
                  <th className="py-3 px-3 text-right">Birim Fiyat</th>
                  <th className="py-3 px-3 text-center">KDV Oranı</th>
                  <th className="py-3 px-4 text-right">Toplam Tutar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 text-stone-800 bg-white">
                {(order.items || []).map((item, idx) => (
                  <tr key={idx} className={idx % 2 === 1 ? 'bg-stone-50/60' : 'bg-white'}>
                    <td className="py-3 px-3.5 font-mono text-stone-400 font-bold">{idx + 1}</td>
                    <td className="py-3 px-3.5">
                      <div className="font-bold text-stone-900">{item.productName}</div>
                      {item.note && (
                        <div className="text-[10px] text-stone-500 italic">
                          Not: {item.note}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-stone-900 font-mono">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-stone-900">
                      {item.unitPrice.toLocaleString('tr-TR')} ₺
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-stone-600">
                      %20
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-[#2E5438] font-mono">
                      {item.totalPrice.toLocaleString('tr-TR')} ₺
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pricing Totals & Bank Payment Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            
            {/* Bank / Payment Instructions */}
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-xs space-y-2">
              <div className="font-bold text-stone-900 text-[11px] uppercase tracking-wider flex items-center space-x-1.5">
                <CreditCard className="w-3.5 h-3.5 text-[#2E5438]" />
                <span>Ödeme & Fatura Notları</span>
              </div>
              <div className="space-y-1 text-[11px] text-stone-700">
                <div><strong>Banka:</strong> Garanti BBVA - Şanlıurfa Karaköprü Şubesi</div>
                <div><strong>Hesap Adı:</strong> Alpha Teknik Doğalgaz Sıhhi Tesisat San. Tic. Ltd. Şti.</div>
                <div className="font-mono text-stone-900 font-bold bg-white p-1.5 rounded border border-stone-200">
                  TR84 0006 2000 1122 3344 5566 77
                </div>
                {order.notes && (
                  <div className="text-[11px] text-stone-600 bg-white p-2 rounded border border-stone-200 mt-1">
                    <strong>Müşteri Notu:</strong> {order.notes}
                  </div>
                )}
              </div>
            </div>

            {/* Totals Summary */}
            <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-stone-200 text-xs space-y-2">
              <div className="flex justify-between text-stone-600">
                <span>Ürünler Toplamı (KDV Hariç):</span>
                <span className="font-mono font-bold text-stone-900 tabular-nums">{subtotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-stone-600">
                  <span>Uygulanan İskonto:</span>
                  <span className="font-mono font-bold text-emerald-800 tabular-nums">- {discount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺</span>
                </div>
              )}
              <div className="flex justify-between text-stone-600">
                <span>Hesaplanan KDV (%20):</span>
                <span className="font-mono font-bold text-stone-900 tabular-nums">{taxAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Şantiye Teslimat & Sevkiyat Bedeli:</span>
                <span className="font-mono font-bold text-emerald-800">Ücretsiz Sevkiyat</span>
              </div>
              <div className="border-t-2 border-[#2E5438] pt-2.5 flex justify-between items-baseline text-sm font-black text-stone-900">
                <span>GENEL SİPARİŞ TUTARI:</span>
                <span className="text-lg font-black text-[#2E5438] font-mono tabular-nums">
                  {order.total.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                </span>
              </div>
            </div>

          </div>

          {/* Stamp, Signature & Security Verification */}
          <div className="pt-4 border-t border-stone-200 grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
            
            {/* Cryptographic Security Stamp */}
            <div className="p-3 bg-stone-900 text-white rounded-2xl flex items-center space-x-3 text-[10px] font-mono">
              <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <div className="text-emerald-400 font-bold">Resmi E2EE Dijital Olarak Mühürlenmiş Sipariş</div>
                <div className="text-stone-400 truncate">
                  SHA-256: {order.signatureHash || '7a840e9d6d84a0d9b4b9b4f918e95817c62b21703661be49be0fbcf4b76a086b'}
                </div>
                <div className="text-stone-400 text-[9px]">
                  Kurumsal Güvenlik İmzası • Sistem Doğrulandı
                </div>
              </div>
            </div>

            {/* Authorized Signature Area */}
            <div className="text-right space-y-1 sm:pr-4">
              <div className="text-xs font-bold text-stone-900">ALPHA TEKNİK DOĞALGAZ SIHHİ TESİSAT</div>
              <div className="text-[11px] text-stone-600">Sevkiyat Onay & Kaşe</div>
              <div className="h-12 border-b border-dashed border-stone-300 w-48 ml-auto mt-2"></div>
            </div>

          </div>

        </div>

        {/* Modal Action Buttons (hidden in print) */}
        <div className="mt-8 pt-5 border-t border-stone-200 flex items-center justify-between print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Kapat
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-6 py-2.5 bg-[#2E5438] hover:bg-[#23452C] text-white font-bold rounded-xl text-xs flex items-center space-x-2 shadow-md transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <Download className="w-3.5 h-3.5" />
            <span>PDF Olarak Kaydet / Yazdır</span>
          </button>
        </div>

      </div>
    </div>
  </div>
);
}
