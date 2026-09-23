import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  RefreshCw, 
  Table, 
  FileText, 
  Filter,
  Calculator,
  Plus
} from 'lucide-react';
import { Product } from '../../types';
import { useModalBehavior } from '../../hooks/useModalBehavior';

interface BulkExcelImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onApplyBulkImport: (importedProducts: Partial<Product>[]) => Promise<void>;
}

interface ParsedRow {
  id?: string;
  sku: string;
  barcode?: string;
  name: string;
  category: string;
  price: number;
  wholesalePrice?: number;
  stock: number;
  unit: string;
  minOrderQuantity?: number;
  action: 'update' | 'create' | 'unchanged';
  priceDiff?: number;
  stockDiff?: number;
}

export default function BulkExcelImportExportModal({
  isOpen,
  onClose,
  products = [],
  onApplyBulkImport,
}: BulkExcelImportExportModalProps) {
  useModalBehavior(isOpen, onClose);
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [exportCategory, setExportCategory] = useState<string>('all');
  const [includeWholesale, setIncludeWholesale] = useState<boolean>(true);

  // Import State
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Multiplier formula for supplier list price conversion
  const [useMultiplier, setUseMultiplier] = useState<boolean>(false);
  const [multiplierRate, setMultiplierRate] = useState<number>(0.55); // Örn: %45 iskonto = 0.55 çarpan

  const fileInputRef = useRef<HTMLInputElement>(null);

  const safeProducts = Array.isArray(products) ? products : [];

  const categories = useMemo(() => {
    const set = new Set<string>();
    safeProducts.forEach(p => {
      if (p && p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [safeProducts]);

  // Handle Export CSV (Compatible with Excel)
  const handleExportCSV = () => {
    const filtered = exportCategory === 'all' 
      ? safeProducts 
      : safeProducts.filter(p => p && p.category === exportCategory);

    // UTF-8 BOM for Turkish Excel character rendering
    const BOM = '\uFEFF';
    const headers = [
      'Stok Kodu (SKU)',
      'Barkod',
      'Ürün Adı',
      'Kategori',
      'Birim',
      'Perakende Satış Fiyatı (TL)',
      'Toptan / Bayi Fiyatı (TL)',
      'Mevcut Stok',
      'Minimum Sipariş Adedi',
      'KDV Oranı (%)'
    ];

    const rows = filtered.map(p => [
      `"${p.sku || ''}"`,
      `"${p.barcode || ''}"`,
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${(p.category || '').replace(/"/g, '""')}"`,
      `"${p.unit || 'ADET'}"`,
      p.price || 0,
      p.wholesalePrice || p.price || 0,
      p.stock || 0,
      p.minOrderQuantity || 1,
      p.vatRate || 20
    ]);

    const csvContent = BOM + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ALPHA_STOK_LISTESI_${exportCategory === 'all' ? 'TUMU' : exportCategory}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Download Empty Template
  const handleDownloadTemplate = () => {
    const BOM = '\uFEFF';
    const headers = [
      'Stok Kodu (SKU)',
      'Barkod',
      'Ürün Adı',
      'Kategori',
      'Birim',
      'Perakende Satış Fiyatı (TL)',
      'Toptan / Bayi Fiyatı (TL)',
      'Mevcut Stok',
      'Minimum Sipariş Adedi',
      'KDV Oranı (%)'
    ];

    const sampleRow = [
      'ST-SAMPLE-01',
      '8690000012345',
      'ÖRNEK 1/2 PPRC KÜRESEL VANA',
      'BORU & EK PARÇALARI',
      'ADET',
      '145.50',
      '120.00',
      '50',
      '1',
      '20'
    ];

    const csvContent = BOM + [headers.join(';'), sampleRow.join(';')].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'ALPHA_STOK_ICE_AKTARMA_SABLONU.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parse CSV File
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setErrorMessage(null);
    setFeedback(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        setFileContent(text);
        parseCSVText(text);
      } catch (err) {
        setErrorMessage('Dosya okunurken hata oluştu! Lütfen CSV veya metin dosyasının biçimini kontrol ediniz.');
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const parseCSVText = (csvString: string) => {
    try {
      const lines = csvString.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length < 2) {
        setErrorMessage('Yüklenen dosyada başlık satırı dışında veri bulunamadı.');
        return;
      }

      // Determine separator (; or , or \t)
      const firstLine = lines[0];
      const sep = firstLine.includes(';') ? ';' : firstLine.includes('\t') ? '\t' : ',';

      const skuMap = new Map<string, Product>();
      products.forEach(p => {
        if (p.sku) skuMap.set(p.sku.toLowerCase().trim(), p);
      });

      const parsed: ParsedRow[] = [];

      // Skip header line
      for (let i = 1; i < lines.length; i++) {
        const rawLine = lines[i];
        if (!rawLine.trim()) continue;

        // Simple CSV splitter respecting quotes
        const cols = rawLine.split(sep).map(c => c.trim().replace(/^["']|["']$/g, ''));
        if (cols.length < 3) continue;

        const sku = cols[0]?.trim() || `ST-NEW-${i}`;
        const barcode = cols[1]?.trim() || undefined;
        const name = cols[2]?.trim() || 'İsimsiz Ürün';
        const category = cols[3]?.trim() || 'GENEL';
        const unit = cols[4]?.trim() || 'ADET';
        
        let price = parseFloat(cols[5]?.replace(',', '.')) || 0;
        if (useMultiplier && multiplierRate > 0) {
          price = Math.round(price * multiplierRate * 100) / 100;
        }

        const wholesalePrice = parseFloat(cols[6]?.replace(',', '.')) || (price > 0 ? Math.round(price * 0.85 * 100) / 100 : undefined);
        const stock = parseInt(cols[7], 10) || 0;
        const minOrderQuantity = parseInt(cols[8], 10) || 1;

        const existing = skuMap.get(sku.toLowerCase());

        let action: 'update' | 'create' | 'unchanged' = 'create';
        let priceDiff = 0;
        let stockDiff = 0;

        if (existing) {
          priceDiff = price - existing.price;
          stockDiff = stock - existing.stock;
          if (Math.abs(priceDiff) > 0.01 || stockDiff !== 0 || existing.name !== name) {
            action = 'update';
          } else {
            action = 'unchanged';
          }
        }

        parsed.push({
          id: existing?.id,
          sku,
          barcode,
          name,
          category,
          unit,
          price,
          wholesalePrice,
          stock,
          minOrderQuantity,
          action,
          priceDiff,
          stockDiff
        });
      }

      setParsedRows(parsed);
      setFeedback(`${parsed.length} kalem satır başarıyla ayrıştırıldı.`);
    } catch (err) {
      console.error(err);
      setErrorMessage('CSV satırları ayrıştırılırken hata oluştu.');
    }
  };

  // Re-run parser if multiplier changed
  const handleMultiplierChange = (newRate: number) => {
    setMultiplierRate(newRate);
    if (fileContent) {
      parseCSVText(fileContent);
    }
  };

  // Apply Changes
  const handleApply = async () => {
    if (parsedRows.length === 0) return;

    setIsProcessing(true);
    try {
      const payload: Partial<Product>[] = parsedRows.map(r => ({
        id: r.id,
        sku: r.sku,
        barcode: r.barcode,
        name: r.name,
        category: r.category,
        unit: r.unit,
        price: r.price,
        wholesalePrice: r.wholesalePrice,
        stock: r.stock,
        minOrderQuantity: r.minOrderQuantity || 1,
      }));

      await onApplyBulkImport(payload);
      setFeedback(`Toplu içe aktarma tamamlandı! ${payload.length} ürün güncellendi/eklendi.`);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setErrorMessage('İçe aktarma uygulanırken sunucu hatası oluştu.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm p-3 sm:p-6"
      onClick={onClose}
    >
      <div className="min-h-full flex items-center justify-center py-4 sm:py-6">
        <div 
          className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[90vh] text-slate-100 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-800 border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                EXCEL & CSV TOPLU STOK / FİYAT AKTARIMI
              </h2>
              <p className="text-xs text-slate-400">Ürün listesini dışa aktarın, Excel ile düzenleyip tek tıkla geri yükleyin</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-700 text-xs">
              <button
                onClick={() => setActiveTab('export')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  activeTab === 'export' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Dışa Aktar (Export)
              </button>
              <button
                onClick={() => setActiveTab('import')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  activeTab === 'import' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                İçe Aktar (Import)
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors ml-2"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Feedback alerts */}
        {feedback && (
          <div className="bg-emerald-500/20 border-b border-emerald-500/40 px-6 py-2.5 text-xs text-emerald-300 flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}
        {errorMessage && (
          <div className="bg-rose-500/20 border-b border-rose-500/40 px-6 py-2.5 text-xs text-rose-300 flex items-center gap-2 shrink-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Content Area */}
        <div className="p-6 flex-1 overflow-y-auto">
          {activeTab === 'export' ? (
            <div className="space-y-6 max-w-2xl mx-auto py-4">
              <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700 space-y-4">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Download className="w-5 h-5 text-emerald-400" />
                  Stok ve Fiyat Listesini Excel CSV Olarak İndir
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Tüm ürünlerinizi veya seçili kategoriyi Excel ile açılabilir UTF-8 formatında indirin. Fiyatları, barkodları veya stok miktarlarını düzenleyip "İçe Aktar" sekmesinden tek seferde sisteme yükleyebilirsiniz.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">Kategori Filtresi</label>
                    <select
                      value={exportCategory}
                      onChange={e => setExportCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-emerald-500"
                    >
                      <option value="all">📦 Tüm Kategoriler ({products.length} Ürün)</option>
                      {categories.map(c => (
                        <option key={c} value={c}>
                          {c} ({products.filter(p => p.category === c).length} Ürün)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">Fiyat Sütunları</label>
                    <label className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeWholesale}
                        onChange={e => setIncludeWholesale(e.target.checked)}
                        className="rounded text-emerald-500 focus:ring-0"
                      />
                      <span>Toptan & Perakende Fiyatları Dahil</span>
                    </label>
                  </div>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleExportCSV}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>CSV Listesini İndir ({exportCategory === 'all' ? products.length : products.filter(p => p.category === exportCategory).length} Kalem)</span>
                  </button>

                  <button
                    onClick={handleDownloadTemplate}
                    className="py-3 px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium text-xs rounded-xl border border-slate-600 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Boş Şablon İndir</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Upload Dropzone */}
              <div className="bg-slate-800/80 p-5 rounded-2xl border-2 border-dashed border-slate-700 hover:border-blue-500 transition-colors flex flex-col items-center justify-center text-center">
                <Upload className="w-10 h-10 text-blue-400 mb-2" />
                <p className="text-sm font-semibold text-white">CSV veya Excel Dosyasını Buraya Bırakın veya Seçin</p>
                <p className="text-xs text-slate-400 mt-1">UTF-8 Kodlu CSV, Noktalı Virgül (;) veya Virgül (,) ile ayrılmış tablo dosyaları</p>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-600/30"
                  >
                    Dosya Seç ({fileName || 'Henüz Seçilmedi'})
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded-xl"
                  >
                    Örnek Şablon Al
                  </button>
                </div>
              </div>

              {/* Supplier Multiplier Tool */}
              {parsedRows.length > 0 && (
                <div className="bg-slate-800 p-3.5 rounded-xl border border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-amber-400" />
                    <span className="font-semibold text-white">Tedarikçi Liste Fiyatı Çarpanı:</span>
                    <label className="flex items-center gap-1.5 cursor-pointer ml-2">
                      <input
                        type="checkbox"
                        checked={useMultiplier}
                        onChange={e => {
                          setUseMultiplier(e.target.checked);
                          if (fileContent) parseCSVText(fileContent);
                        }}
                        className="rounded text-amber-500"
                      />
                      <span className="text-slate-300">Formüllü Fiyat Uygula</span>
                    </label>
                  </div>

                  {useMultiplier && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Liste Fiyatı Çarpanı:</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.05"
                        max="2"
                        value={multiplierRate}
                        onChange={e => handleMultiplierChange(parseFloat(e.target.value) || 1)}
                        className="w-20 px-2 py-1 bg-slate-900 border border-slate-700 rounded font-mono font-bold text-amber-400 text-xs"
                      />
                      <span className="text-slate-400">(Örn: 0.55 = %45 İskonto)</span>
                    </div>
                  )}
                </div>
              )}

              {/* Parsed Diff Preview Table */}
              {parsedRows.length > 0 && (
                <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col">
                  <div className="px-4 py-2.5 bg-slate-850 border-b border-slate-700 flex items-center justify-between text-xs">
                    <span className="font-bold text-white">
                      Önizleme ({parsedRows.length} Kalem) - 
                      <span className="text-emerald-400 ml-1 font-normal">
                        {parsedRows.filter(r => r.action === 'create').length} Yeni
                      </span> • 
                      <span className="text-blue-400 ml-1 font-normal">
                        {parsedRows.filter(r => r.action === 'update').length} Güncelleme
                      </span> • 
                      <span className="text-slate-400 ml-1 font-normal">
                        {parsedRows.filter(r => r.action === 'unchanged').length} Değişmeyen
                      </span>
                    </span>

                    <button
                      onClick={handleApply}
                      disabled={isProcessing}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-md shadow-emerald-600/30 flex items-center gap-1.5 transition-all"
                    >
                      {isProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      <span>Değişiklikleri Kataloğa Kaydet</span>
                    </button>
                  </div>

                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-700/60">
                    {parsedRows.slice(0, 50).map((row, idx) => (
                      <div key={idx} className="px-4 py-2 grid grid-cols-12 items-center text-xs">
                        <div className="col-span-1">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            row.action === 'create' ? 'bg-emerald-500/20 text-emerald-300' :
                            row.action === 'update' ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-700 text-slate-400'
                          }`}>
                            {row.action === 'create' ? '+ YENİ' : row.action === 'update' ? 'GÜNCELLE' : 'AYNI'}
                          </span>
                        </div>
                        <div className="col-span-2 font-mono text-slate-300 text-[11px] truncate">
                          {row.sku}
                        </div>
                        <div className="col-span-4 font-semibold text-white truncate">
                          {row.name}
                        </div>
                        <div className="col-span-2 text-right">
                          <span className="font-bold text-amber-400">{row.price.toLocaleString('tr-TR')} ₺</span>
                          {row.priceDiff !== undefined && Math.abs(row.priceDiff) > 0.01 && (
                            <span className={`text-[10px] block ${row.priceDiff > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {row.priceDiff > 0 ? `+${row.priceDiff.toFixed(1)} ₺` : `${row.priceDiff.toFixed(1)} ₺`}
                            </span>
                          )}
                        </div>
                        <div className="col-span-2 text-right">
                          <span className="text-slate-200">{row.stock} {row.unit}</span>
                          {row.stockDiff !== undefined && row.stockDiff !== 0 && (
                            <span className={`text-[10px] block ${row.stockDiff > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {row.stockDiff > 0 ? `+${row.stockDiff}` : row.stockDiff}
                            </span>
                          )}
                        </div>
                        <div className="col-span-1 text-right text-slate-400 text-[11px]">
                          {row.category.slice(0, 8)}
                        </div>
                      </div>
                    ))}
                  </div>
                  {parsedRows.length > 50 && (
                    <div className="p-2 text-center text-xs text-slate-400 bg-slate-900">
                      ... ve {parsedRows.length - 50} satır daha mevcut.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
