import React, { useRef, useState, useEffect } from 'react';
import { EInvoice, EInvoiceTemplateType } from '../../types';
import { 
  X, 
  Printer, 
  Download, 
  FileCode, 
  Send, 
  ShieldCheck, 
  Building2, 
  CreditCard, 
  FileText, 
  Upload, 
  Image as ImageIcon, 
  RotateCcw, 
  Layers, 
  LayoutList, 
  Check, 
  Copy
} from 'lucide-react';
import { formatTRY } from '../../utils/exportUtils';
import { 
  exportEInvoiceToPdf, 
  downloadEInvoiceXML, 
  generateGibQrCodeDataUrl, 
  printInvoiceDirectly 
} from '../../utils/eInvoiceUtils';
import { useModalBehavior } from '../../hooks/useModalBehavior';

const STORAGE_LOGO_KEY = 'alpha_einvoice_custom_logo';
const STORAGE_TEMPLATE_KEY = 'alpha_einvoice_template_pref';

interface EInvoiceViewModalProps {
  invoice: EInvoice;
  onClose: () => void;
  onSendGib?: (invoiceId: string) => void;
  onCancelInvoice?: (invoiceId: string) => void;
}

export default function EInvoiceViewModal({
  invoice,
  onClose,
  onSendGib,
  onCancelInvoice,
}: EInvoiceViewModalProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Template Type State ('detailed' | 'simple')
  const [templateType, setTemplateType] = useState<EInvoiceTemplateType>(() => {
    return (localStorage.getItem(STORAGE_TEMPLATE_KEY) as EInvoiceTemplateType) || 'detailed';
  });

  // Dynamic Logo State
  const [logoUrl, setLogoUrl] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_LOGO_KEY) || null;
  });

  const [copiedUuid, setCopiedUuid] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const isEArsiv = invoice.profile === 'EARSIVFATURA';
  const qrDataUrl = generateGibQrCodeDataUrl(invoice);

  // Update localStorage when template changes
  const handleTemplateChange = (type: EInvoiceTemplateType) => {
    setTemplateType(type);
    localStorage.setItem(STORAGE_TEMPLATE_KEY, type);
  };

  // Handle Logo Upload (File to Base64)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Logo dosyası boyutu 2MB dan küçük olmalıdır.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setLogoUrl(result);
        localStorage.setItem(STORAGE_LOGO_KEY, result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetLogo = () => {
    setLogoUrl(null);
    localStorage.removeItem(STORAGE_LOGO_KEY);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCopyUuid = () => {
    navigator.clipboard.writeText(invoice.uuid);
    setCopiedUuid(true);
    setTimeout(() => setCopiedUuid(false), 2000);
  };

  // Reliable Direct Print Function
  const handlePrint = () => {
    setIsPrinting(true);
    try {
      printInvoiceDirectly(invoice, {
        templateType,
        logoUrl,
      });
    } catch (e) {
      console.error('Direct print failed, fallback:', e);
      window.print();
    } finally {
      setTimeout(() => setIsPrinting(false), 1000);
    }
  };

  const handlePdfExport = () => {
    exportEInvoiceToPdf(invoice, {
      templateType,
      logoUrl,
    });
  };

  useModalBehavior(true, onClose);

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-4xl bg-white dark:bg-[#1C2024] text-slate-900 dark:text-slate-100 rounded-3xl shadow-2xl border border-slate-200 dark:border-[#2E353B] flex flex-col max-h-[92vh] print:max-h-none print:h-auto print:border-none print:shadow-none print:rounded-none"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header Actions (Hidden on Print) */}
        <div className="p-4 sm:px-6 border-b border-slate-200 dark:border-[#2E353B] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 dark:bg-[#16191D] rounded-t-3xl print:hidden">
          
          <div className="flex items-center space-x-3 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold shrink-0 ${
              isEArsiv ? 'bg-blue-600 shadow-blue-500/20' : 'bg-red-600 shadow-red-500/20'
            } shadow-md`}>
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate font-mono">
                  {invoice.invoiceNumber}
                </h2>
                <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                  invoice.status === 'sent'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : invoice.status === 'draft'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                }`}>
                  {invoice.status === 'sent' ? '✓ GİB Onaylı (1300)' : invoice.status === 'draft' ? 'Taslak' : 'İptal'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {invoice.customerTitle} • <span className="font-mono">{invoice.profile}</span>
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0 self-end sm:self-auto">
            {invoice.status === 'draft' && onSendGib && (
              <button
                onClick={() => onSendGib(invoice.id)}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
                title="Gelir İdaresi Başkanlığı sistemine ilet ve onayla"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">GİB'e Gönder</span>
              </button>
            )}

            <button
              onClick={handlePdfExport}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600 text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
              title="A4 Resmi GİB Formatında PDF İndir"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>

            <button
              onClick={() => downloadEInvoiceXML(invoice)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
              title="GİB UBL-TR 2.1 Standart XML İndir"
            >
              <FileCode className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span className="hidden sm:inline">XML</span>
            </button>

            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm cursor-pointer"
              title="E-Fatura Yazdır (A4 Direkt Yazıcı)"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">{isPrinting ? 'Yazdırılıyor...' : 'Yazdır'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dynamic Controls Bar: Template Switcher & Dynamic Logo Loader (Hidden on Print) */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-100 dark:bg-[#121518] border-b border-slate-200 dark:border-[#2E353B] flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
          
          {/* Template Selection Tab (Detaylı vs Basit) */}
          <div className="flex items-center space-x-2">
            <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center space-x-1">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span>Taslak Şablonu:</span>
            </span>
            <div className="inline-flex p-0.5 rounded-xl bg-white dark:bg-[#1E2328] border border-slate-200 dark:border-[#2E353B]">
              <button
                type="button"
                onClick={() => handleTemplateChange('detailed')}
                className={`px-2.5 py-1 rounded-lg font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                  templateType === 'detailed'
                    ? 'bg-slate-900 text-white dark:bg-blue-600 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span>Detaylı (Resmi GİB)</span>
              </button>
              <button
                type="button"
                onClick={() => handleTemplateChange('simple')}
                className={`px-2.5 py-1 rounded-lg font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                  templateType === 'simple'
                    ? 'bg-slate-900 text-white dark:bg-blue-600 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span>⚡ Basit / Sade</span>
              </button>
            </div>
          </div>

          {/* Dynamic Logo Uploader & Reset */}
          <div className="flex items-center space-x-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleLogoUpload} 
              accept="image/png,image/jpeg,image/svg+xml,image/webp" 
              className="hidden" 
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#1E2328] hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-[#2E353B] text-slate-700 dark:text-slate-200 font-medium flex items-center space-x-1.5 transition-all cursor-pointer shadow-2xs"
            >
              <Upload className="w-3.5 h-3.5 text-blue-500" />
              <span>{logoUrl ? 'Logoyu Değiştir' : 'Kurum Logosu Yükle'}</span>
            </button>

            {logoUrl && (
              <button
                type="button"
                onClick={handleResetLogo}
                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
                title="Logoyu Kaldır / Sıfırla"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

        </div>

        {/* Official GİB Invoice Document Canvas (Printable Area) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200/60 dark:bg-[#121518] print:p-0 print:bg-white print:overflow-visible">
          <div 
            id="einvoice-print-area"
            ref={printAreaRef}
            className="max-w-3xl mx-auto bg-white text-slate-900 p-6 sm:p-8 rounded-2xl shadow-md border border-slate-300 font-sans print:shadow-none print:border-none print:p-0 print:max-w-none text-xs leading-relaxed"
          >
            
            {/* 1. TOP GİB / E-ARŞİV OFFICIAL HEADER BANNER */}
            <div className="border border-slate-300 rounded-xl p-4 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50/70">
              
              <div className="flex items-center space-x-3.5">
                {/* Dynamically Uploaded Logo (if present) */}
                {logoUrl && (
                  <div className="max-w-[110px] max-h-[50px] flex items-center justify-center p-1 bg-white border border-slate-200 rounded-lg shrink-0">
                    <img 
                      src={logoUrl} 
                      alt="Kurum Logosu" 
                      className="max-h-11 max-w-[100px] object-contain"
                    />
                  </div>
                )}

                {/* Official Logo Banner */}
                <div className={`px-4 py-2.5 rounded-lg text-white font-bold flex flex-col items-center justify-center text-center shadow-xs shrink-0 ${
                  isEArsiv ? 'bg-blue-700' : 'bg-red-700'
                }`}>
                  <span className="text-xs sm:text-sm tracking-wider font-extrabold">{isEArsiv ? 'e-ARŞİV FATURA' : 'e-FATURA'}</span>
                  <span className="text-[8.5px] font-normal opacity-90">{isEArsiv ? 'GİB E-Arşiv Portal' : 'GİB UBL-TR 2.1 Standardı'}</span>
                </div>

                <div>
                  <h1 className="font-extrabold text-xs sm:text-sm text-slate-900 tracking-tight leading-snug">
                    {invoice.supplierTitle}
                  </h1>
                  <p className="text-[11px] text-slate-600">
                    {invoice.supplierAddress} {invoice.supplierCity}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    VKN: <strong>{invoice.supplierVkn}</strong> • V.D.: {invoice.supplierTaxOffice} • Tel: {invoice.supplierPhone}
                  </p>
                </div>
              </div>

              {/* Invoice Meta Table */}
              <div className="w-full sm:w-auto min-w-[200px] bg-white border border-slate-200 rounded-lg p-2.5 text-[11px] space-y-1 shrink-0">
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500 font-medium">Fatura No:</span>
                  <span className={`font-mono font-bold ${isEArsiv ? 'text-blue-700' : 'text-red-700'}`}>
                    {invoice.invoiceNumber}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500 font-medium">Düzenleme Tarihi:</span>
                  <span className="font-semibold text-slate-800">{new Date(invoice.invoiceDate).toLocaleDateString('tr-TR')}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500 font-medium">Düzenleme Zamanı:</span>
                  <span className="font-mono text-slate-700">{invoice.invoiceTime || '12:00:00'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500 font-medium">Fatura Senaryosu:</span>
                  <span className="font-bold text-slate-900">{invoice.profile}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Fatura Tipi:</span>
                  <span className="font-bold text-slate-900">{invoice.type}</span>
                </div>
              </div>
            </div>

            {/* 2. SUPPLIER & BUYER INFO CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              {/* Supplier Info Box */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/70 space-y-1">
                <div className="text-[10px] font-bold text-slate-700 uppercase tracking-wider pb-1 border-b border-slate-200 flex items-center justify-between">
                  <span>SAYIN SATICI (DÜZENLEYEN)</span>
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <div className="font-bold text-slate-900 text-xs pt-0.5">{invoice.supplierTitle}</div>
                <div className="text-slate-600 text-[11px]">{invoice.supplierAddress}</div>
                <div className="text-slate-600 text-[11px]">{invoice.supplierDistrict || 'Karaköprü'} / {invoice.supplierCity}</div>
                <div className="text-slate-700 text-[11px] font-mono pt-0.5">
                  <strong>Vergi Dairesi:</strong> {invoice.supplierTaxOffice}
                </div>
                <div className="text-slate-700 text-[11px] font-mono">
                  <strong>VKN:</strong> {invoice.supplierVkn} {invoice.supplierMersisNo ? `• Mersis: ${invoice.supplierMersisNo}` : ''}
                </div>
                <div className="text-slate-600 text-[10px]">
                  E-Posta: {invoice.supplierEmail} • Tel: {invoice.supplierPhone}
                </div>
              </div>

              {/* Customer Info Box */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/70 space-y-1">
                <div className="text-[10px] font-bold text-slate-700 uppercase tracking-wider pb-1 border-b border-slate-200 flex items-center justify-between">
                  <span>SAYIN ALICI (MÜŞTERİ)</span>
                  <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold">
                    {invoice.isEInvoicePayer ? 'E-Fatura Mükellefi' : 'E-Arşiv Alıcısı'}
                  </span>
                </div>
                <div className="font-bold text-slate-900 text-xs pt-0.5">{invoice.customerTitle || invoice.customerName}</div>
                <div className="text-slate-600 text-[11px]">{invoice.customerAddress || 'Belirtilmedi'}</div>
                <div className="text-slate-600 text-[11px]">
                  {invoice.customerDistrict ? `${invoice.customerDistrict} / ` : ''}{invoice.customerCity || 'Şanlıurfa'}
                </div>
                <div className="text-slate-700 text-[11px] font-mono pt-0.5">
                  <strong>Vergi Dairesi:</strong> {invoice.customerTaxOffice || 'Belirtilmedi'}
                </div>
                <div className="text-slate-700 text-[11px] font-mono">
                  <strong>{invoice.customerVknTckn.length === 10 ? 'VKN:' : 'TCKN:'}</strong> {invoice.customerVknTckn}
                </div>
                {invoice.customerPhone && (
                  <div className="text-slate-600 text-[10px]">
                    Tel: {invoice.customerPhone} {invoice.customerEmail ? `• E-Posta: ${invoice.customerEmail}` : ''}
                  </div>
                )}
              </div>
            </div>

            {/* ETTN & QR Code Bar */}
            <div className="border border-slate-200 rounded-xl p-2.5 mb-3 bg-slate-50 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-2">
                  <span>ETTN (Elektronik Ticari Takip Numarası - UUID)</span>
                  <button 
                    type="button" 
                    onClick={handleCopyUuid} 
                    className="p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer print:hidden"
                    title="ETTN Kopyala"
                  >
                    {copiedUuid ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
                <div className="font-mono text-[10.5px] font-bold text-slate-800 break-all select-all">
                  {invoice.uuid}
                </div>
                {invoice.despatchNumber && (
                  <div className="text-[10px] text-slate-600 pt-0.5">
                    İrsaliye Bilgisi: <strong className="font-mono">{invoice.despatchNumber}</strong> (Tarih: {invoice.despatchDate || invoice.invoiceDate})
                  </div>
                )}
              </div>
              <div className="shrink-0 flex items-center space-x-2 pl-2 border-l border-slate-200">
                <img src={qrDataUrl} alt="GİB Karekod" className="w-11 h-11 border border-slate-300 rounded bg-white p-0.5" />
                <div className="text-[9px] text-slate-500 font-mono hidden sm:block leading-tight">
                  GİB Doğrulama<br />Karekodu
                </div>
              </div>
            </div>

            {/* 3. INVOICE ITEMS TABLE (Render based on templateType) */}
            <div className="border border-slate-200 rounded-xl overflow-hidden mb-3">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-800 text-white font-semibold">
                      <th className="py-2 px-2 text-center w-8">#</th>
                      <th className="py-2 px-3">Mal / Hizmet Açıklaması</th>
                      <th className="py-2 px-2 text-center w-14">Miktar</th>
                      <th className="py-2 px-2 text-center w-14">Birim</th>
                      <th className="py-2 px-3 text-right w-24">Birim Fiyat</th>
                      {templateType === 'detailed' && (
                        <>
                          <th className="py-2 px-2 text-center w-12">İsk.%</th>
                          <th className="py-2 px-2 text-right w-16">İskonto</th>
                        </>
                      )}
                      <th className="py-2 px-2 text-center w-12">KDV</th>
                      <th className="py-2 px-3 text-right w-20">KDV Tutarı</th>
                      <th className="py-2 px-3 text-right w-24">Satır Toplamı</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {invoice.items.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50">
                        <td className="py-2 px-2 text-center font-mono text-slate-500">{idx + 1}</td>
                        <td className="py-2 px-3 font-medium text-slate-900">
                          {item.name}
                          {item.sku && <span className="block text-[9px] font-mono text-slate-400">SKU: {item.sku}</span>}
                          {templateType === 'detailed' && item.tevkifatCode && (
                            <span className="block text-[9px] text-amber-700 font-medium">
                              Tevkifat: {item.tevkifatCode} ({item.tevkifatRate} - {formatTRY(item.tevkifatAmount || 0)})
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-center font-mono font-bold text-slate-800">{item.quantity}</td>
                        <td className="py-2 px-2 text-center text-slate-600">{item.unit}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-800">{formatTRY(item.unitPrice)}</td>
                        {templateType === 'detailed' && (
                          <>
                            <td className="py-2 px-2 text-center font-mono text-slate-500">{item.discountPercent > 0 ? `%${item.discountPercent}` : '-'}</td>
                            <td className="py-2 px-2 text-right font-mono text-slate-600">{item.discountAmount > 0 ? formatTRY(item.discountAmount) : '-'}</td>
                          </>
                        )}
                        <td className="py-2 px-2 text-center font-mono text-slate-700">%{item.vatRate}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-800">{formatTRY(item.vatAmount)}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{formatTRY(item.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. TOTALS & TAX BREAKDOWN & NOTES */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mb-3">
              
              {/* Left Column: Amount in Words, Bank & Notes */}
              <div className="sm:col-span-7 space-y-2.5">
                {/* Turkish Words Box */}
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider block">
                    Yazıyla Ödenecek Tutar:
                  </span>
                  <span className="font-semibold text-slate-900 text-[11.5px] italic">
                    {invoice.amountInWords}
                  </span>
                </div>

                {/* Notes and Bank Box */}
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-[11px]">
                  <span className="text-[9.5px] font-bold text-slate-700 uppercase tracking-wider block border-b border-slate-200 pb-0.5">
                    Notlar & Açıklamalar
                  </span>
                  {invoice.notes && invoice.notes.map((n, i) => (
                    <div key={i} className="text-slate-600 flex items-start space-x-1.5">
                      <span className="text-slate-400 font-bold">•</span>
                      <span>{n}</span>
                    </div>
                  ))}
                  {invoice.bankIban && (
                    <div className="pt-0.5 text-slate-700 font-mono text-[9.5px]">
                      <strong>Banka:</strong> {invoice.bankName || 'Kuveyt Türk'} • <strong>IBAN:</strong> {invoice.bankIban}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Monetary Totals & Tax Schedule */}
              <div className="sm:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5 text-[11px]">
                <div className="flex justify-between text-slate-600">
                  <span>Mal / Hizmet Toplam Tutarı:</span>
                  <span className="font-mono font-medium text-slate-900">{formatTRY(invoice.subtotal)}</span>
                </div>

                {invoice.totalDiscount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Toplam İskonto:</span>
                    <span className="font-mono font-medium">-{formatTRY(invoice.totalDiscount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-700 pt-1 border-t border-slate-200">
                  <span>Hesaplanan KDV:</span>
                  <span className="font-mono font-semibold text-slate-900">{formatTRY(invoice.totalVat)}</span>
                </div>

                {templateType === 'detailed' && invoice.vat20Amount !== undefined && invoice.vat20Amount > 0 && (
                  <div className="flex justify-between text-[10px] text-slate-500 pl-2">
                    <span>• %20 KDV (Matrah: {formatTRY(invoice.vat20Matrah || invoice.taxExclusiveAmount)}):</span>
                    <span className="font-mono">{formatTRY(invoice.vat20Amount)}</span>
                  </div>
                )}

                {templateType === 'detailed' && invoice.totalTevkifat && invoice.totalTevkifat > 0 ? (
                  <div className="flex justify-between text-amber-700">
                    <span>Tevkif Edilen KDV:</span>
                    <span className="font-mono font-medium">-{formatTRY(invoice.totalTevkifat)}</span>
                  </div>
                ) : null}

                {/* Final Payable Badge */}
                <div className="mt-1.5 p-2 rounded-lg bg-emerald-50 border border-emerald-200 flex justify-between items-center text-emerald-900">
                  <span className="font-bold text-xs uppercase tracking-tight">ÖDENECEK TUTAR:</span>
                  <span className="font-mono font-extrabold text-sm sm:text-base text-emerald-700">
                    {formatTRY(invoice.payableAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* 5. ELECTRONIC SIGNATURE & LEGAL DISCLAIMER */}
            <div className="border border-slate-200 rounded-xl p-2.5 bg-slate-50/70 text-[9.5px] text-slate-500 space-y-1">
              <div className="flex items-center space-x-1.5 font-bold text-slate-700 uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Elektronik Mühür ve İmza Bilgisi (5070 Sayılı Kanun & 213 Sayılı V.U.K.)</span>
              </div>
              <p>
                Bu fatura Gelir İdaresi Başkanlığı (GİB) UBL-TR 2.1 standardında düzenlenmiş olup elektronik mühür ile onaylanmıştır.
              </p>
              <div className="flex flex-wrap items-center justify-between text-[8.5px] font-mono text-slate-400 pt-0.5 border-t border-slate-200">
                <span>İmzalayan: ALPHA TEKNİK DOĞALGAZ SIHHİ TESİSAT</span>
                <span>Zaman Damgası: {invoice.invoiceDate} {invoice.invoiceTime || '12:00:00'}</span>
                <span>Doğrulama: GİB Portal / Entegratör</span>
              </div>
            </div>

          </div>
        </div>

        {/* Modal Footer (Hidden on Print) */}
        <div className="p-3 sm:px-6 border-t border-slate-200 dark:border-[#2E353B] flex flex-wrap items-center justify-between gap-2 bg-slate-50 dark:bg-[#16191D] rounded-b-3xl text-xs print:hidden">
          <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400">
            <span className="font-mono font-bold text-slate-700 dark:text-slate-200">{invoice.invoiceNumber}</span>
            <span>•</span>
            <span>{invoice.customerTitle}</span>
          </div>

          <div className="flex items-center space-x-2">
            {invoice.status !== 'cancelled' && onCancelInvoice && (
              <button
                onClick={() => onCancelInvoice(invoice.id)}
                className="px-3 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition-all cursor-pointer"
              >
                Faturayı İptal Et
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 font-bold transition-all cursor-pointer"
            >
              Kapat
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
