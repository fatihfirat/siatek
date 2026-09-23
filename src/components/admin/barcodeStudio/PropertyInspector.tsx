import React from 'react';
import { LabelStudioConfig, PaperPreset, BarcodeType } from './types';
import { STUDIO_PRESETS } from './presets';
import { 
  Sliders, 
  Type, 
  Barcode as BarcodeIcon, 
  Award, 
  SlidersHorizontal, 
  Layers, 
  Printer, 
  Check, 
  ChevronRight,
  ShieldCheck,
  MapPin,
  Tag,
  Move,
  RotateCcw
} from 'lucide-react';

interface PropertyInspectorProps {
  config: LabelStudioConfig;
  onChange: (newConfig: LabelStudioConfig) => void;
  activePreset: PaperPreset;
  onSelectPreset: (preset: PaperPreset) => void;
}

export const PropertyInspector: React.FC<PropertyInspectorProps> = ({
  config,
  onChange,
  activePreset,
  onSelectPreset,
}) => {
  const [activeTab, setActiveTab] = React.useState<'layout' | 'typography' | 'barcode' | 'badges' | 'calibration'>('layout');

  const update = (partial: Partial<LabelStudioConfig>) => {
    onChange({ ...config, ...partial });
  };

  const updateDimensions = (partial: Partial<LabelStudioConfig['dimensions']>) => {
    onChange({ ...config, dimensions: { ...config.dimensions, ...partial } });
  };

  const updateTypography = (partial: Partial<LabelStudioConfig['typography']>) => {
    onChange({ ...config, typography: { ...config.typography, ...partial } });
  };

  const updateBarcode = (partial: Partial<LabelStudioConfig['barcode']>) => {
    onChange({ ...config, barcode: { ...config.barcode, ...partial } });
  };

  const updateBadges = (partial: Partial<LabelStudioConfig['badges']>) => {
    onChange({ ...config, badges: { ...config.badges, ...partial } });
  };

  const updateCalibration = (partial: Partial<LabelStudioConfig['calibration']>) => {
    onChange({ ...config, calibration: { ...config.calibration, ...partial } });
  };

  return (
    <div className="flex flex-col h-full bg-[#0E131F] rounded-2xl border border-slate-800 overflow-hidden text-slate-300 select-none">
      {/* Tab Navigation */}
      <div className="flex items-center border-b border-slate-800 bg-slate-900/90 px-2 py-1.5 gap-1 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveTab('layout')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'layout'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Şablon
        </button>
        <button
          onClick={() => setActiveTab('typography')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'typography'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Type className="w-3.5 h-3.5" />
          Yazı
        </button>
        <button
          onClick={() => setActiveTab('barcode')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'barcode'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <BarcodeIcon className="w-3.5 h-3.5" />
          Barkod
        </button>
        <button
          onClick={() => setActiveTab('badges')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'badges'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          Rozetler
        </button>
        <button
          onClick={() => setActiveTab('calibration')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'calibration'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Ofset
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs custom-scrollbar">
        {/* TAB 1: LAYOUT & PRESETS */}
        {activeTab === 'layout' && (
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Hazır Endüstriyel Şablonlar
              </label>
              <div className="space-y-2">
                {STUDIO_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      onSelectPreset(preset.presetKey);
                      onChange({ ...config, ...preset.config });
                    }}
                    className={`w-full text-left p-2.5 rounded-xl border transition flex items-start gap-2.5 ${
                      activePreset === preset.presetKey
                        ? 'border-blue-500 bg-blue-500/10 text-white shadow-xs'
                        : 'border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 text-slate-300'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${activePreset === preset.presetKey ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                      <Layers className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-xs text-white">{preset.name}</div>
                      <div className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{preset.description}</div>
                    </div>
                    {activePreset === preset.presetKey && (
                      <Check className="w-4 h-4 text-blue-400 shrink-0 mt-1" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Dimensions */}
            <div className="pt-3 border-t border-slate-800">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Özel Etiket Ölçüleri (mm)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400">Genişlik (mm)</span>
                  <input
                    type="number"
                    value={config.dimensions.widthMm}
                    onChange={(e) => updateDimensions({ widthMm: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white mt-1"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">Yükseklik (mm)</span>
                  <input
                    type="number"
                    value={config.dimensions.heightMm}
                    onChange={(e) => updateDimensions({ heightMm: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Header Text */}
            <div className="pt-3 border-t border-slate-800">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Şirket Başlığı
              </label>
              <input
                type="text"
                value={config.headerText}
                onChange={(e) => update({ headerText: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                placeholder="Şirket Adı..."
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-slate-400 text-xs">Başlık Şeridini Göster</span>
                <input
                  type="checkbox"
                  checked={config.showHeader}
                  onChange={(e) => update({ showHeader: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TYPOGRAPHY */}
        {activeTab === 'typography' && (
          <div className="space-y-4">
            {/* Product Name Size */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-300 font-medium">Ürün Adı Boyutu</span>
                <span className="font-mono text-blue-400 font-bold">{config.typography.productNameFontSizePt} pt</span>
              </div>
              <input
                type="range"
                min="7"
                max="18"
                step="0.5"
                value={config.typography.productNameFontSizePt}
                onChange={(e) => updateTypography({ productNameFontSizePt: Number(e.target.value) })}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>

            {/* Price Size */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-300 font-medium">Fiyat Punto Boyutu</span>
                <span className="font-mono text-emerald-400 font-bold">{config.typography.priceFontSizePt} pt</span>
              </div>
              <input
                type="range"
                min="10"
                max="26"
                step="1"
                value={config.typography.priceFontSizePt}
                onChange={(e) => updateTypography({ priceFontSizePt: Number(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* Header Size */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-300 font-medium">Başlık Boyutu</span>
                <span className="font-mono text-slate-400">{config.typography.headerFontSizePt} pt</span>
              </div>
              <input
                type="range"
                min="6"
                max="14"
                step="0.5"
                value={config.typography.headerFontSizePt}
                onChange={(e) => updateTypography({ headerFontSizePt: Number(e.target.value) })}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>

            {/* Barcode Text Size */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-300 font-medium">Barkod Altı Metin</span>
                <span className="font-mono text-slate-400">{config.typography.barcodeTextFontSizePt} pt</span>
              </div>
              <input
                type="range"
                min="6"
                max="12"
                step="0.5"
                value={config.typography.barcodeTextFontSizePt}
                onChange={(e) => updateTypography({ barcodeTextFontSizePt: Number(e.target.value) })}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* TAB 3: BARCODE SETTINGS */}
        {activeTab === 'barcode' && (
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Barkod Formatı
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['CODE128', 'EAN13', 'QR', 'DUAL'] as BarcodeType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => updateBarcode({ type })}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-semibold transition text-center ${
                      config.barcode.type === type
                        ? 'border-blue-500 bg-blue-500/20 text-white'
                        : 'border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-400'
                    }`}
                  >
                    {type === 'DUAL' ? 'ÇİFT (Barkod + QR)' : type}
                  </button>
                ))}
              </div>
            </div>

            {/* Barcode Height */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-300 font-medium">Barkod Yüksekliği</span>
                <span className="font-mono text-blue-400 font-bold">{config.barcode.barcodeHeightMm} mm</span>
              </div>
              <input
                type="range"
                min="8"
                max="35"
                step="1"
                value={config.barcode.barcodeHeightMm}
                onChange={(e) => updateBarcode({ barcodeHeightMm: Number(e.target.value) })}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>

            {/* Barcode Density / Scale */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-300 font-medium">Çizgi Yoğunluğu (Density)</span>
                <span className="font-mono text-blue-400 font-bold">{config.barcode.barcodeWidthScale}x</span>
              </div>
              <input
                type="range"
                min="1"
                max="2.5"
                step="0.1"
                value={config.barcode.barcodeWidthScale}
                onChange={(e) => updateBarcode({ barcodeWidthScale: Number(e.target.value) })}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>

            {/* Toggles */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800 cursor-pointer">
                <span>Barkod Altında Numarayı Yaz</span>
                <input
                  type="checkbox"
                  checked={config.barcode.showText}
                  onChange={(e) => updateBarcode({ showText: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800 cursor-pointer">
                <span>Ters Renk Başlık Bandı (Invert Ribbon)</span>
                <input
                  type="checkbox"
                  checked={config.barcode.invertHeader}
                  onChange={(e) => updateBarcode({ invertHeader: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500"
                />
              </label>
            </div>

            {/* Direct Position / Shifting Controls (Etiket Üzerinde Kaydırma) */}
            <div className="pt-3 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-400">
                  <Move className="w-3.5 h-3.5" />
                  <span>Barkod Konumlandırma & Kaydırma</span>
                </div>
                {((config.barcode.barcodeOffsetXMm || 0) !== 0 || (config.barcode.barcodeOffsetYMm || 0) !== 0) && (
                  <button
                    type="button"
                    onClick={() => updateBarcode({ barcodeOffsetXMm: 0, barcodeOffsetYMm: 0 })}
                    className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-0.5 underline cursor-pointer"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    Sıfırla
                  </button>
                )}
              </div>

              <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-200 text-[11px] leading-relaxed">
                💡 <strong>Ultra-Premium Özellik:</strong> Önizleme alanındaki barkodu farenizle (mouse) doğrudan tutup istediğiniz yöne sürükleyebilir veya aşağıdaki milimetrik kaydırma çubuklarını kullanabilirsiniz.
              </div>

              {/* Dikey Kaydırma (Y-Ekseni) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-300 font-medium">Dikey Konum (Y-Ekseni)</span>
                  <span className="font-mono text-blue-400 font-bold">
                    {(config.barcode.barcodeOffsetYMm || 0) > 0 ? `+${config.barcode.barcodeOffsetYMm}` : (config.barcode.barcodeOffsetYMm || 0)} mm
                  </span>
                </div>
                <input
                  type="range"
                  min="-25"
                  max="25"
                  step="0.5"
                  value={config.barcode.barcodeOffsetYMm || 0}
                  onChange={(e) => updateBarcode({ barcodeOffsetYMm: Number(e.target.value) })}
                  className="w-full accent-blue-500 cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-slate-500 px-0.5">
                  <span>-25mm (Yukarı)</span>
                  <span>0 (Merkez)</span>
                  <span>+25mm (Aşağı)</span>
                </div>
              </div>

              {/* Yatay Kaydırma (X-Ekseni) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-300 font-medium">Yatay Konum (X-Ekseni)</span>
                  <span className="font-mono text-blue-400 font-bold">
                    {(config.barcode.barcodeOffsetXMm || 0) > 0 ? `+${config.barcode.barcodeOffsetXMm}` : (config.barcode.barcodeOffsetXMm || 0)} mm
                  </span>
                </div>
                <input
                  type="range"
                  min="-25"
                  max="25"
                  step="0.5"
                  value={config.barcode.barcodeOffsetXMm || 0}
                  onChange={(e) => updateBarcode({ barcodeOffsetXMm: Number(e.target.value) })}
                  className="w-full accent-blue-500 cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-slate-500 px-0.5">
                  <span>-25mm (Sola)</span>
                  <span>0 (Merkez)</span>
                  <span>+25mm (Sağa)</span>
                </div>
              </div>

              {/* Quick Nudge Buttons */}
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => updateBarcode({ barcodeOffsetYMm: Math.max(-25, (config.barcode.barcodeOffsetYMm || 0) - 2) })}
                  className="py-1 px-2 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 text-[10px] text-slate-300 font-medium text-center"
                >
                  ↑ 2mm Yukarı
                </button>
                <button
                  type="button"
                  onClick={() => updateBarcode({ barcodeOffsetXMm: 0, barcodeOffsetYMm: 0 })}
                  className="py-1 px-2 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 text-[10px] text-slate-300 font-medium text-center"
                >
                  Tam Merkeze Al
                </button>
                <button
                  type="button"
                  onClick={() => updateBarcode({ barcodeOffsetYMm: Math.min(25, (config.barcode.barcodeOffsetYMm || 0) + 2) })}
                  className="py-1 px-2 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 text-[10px] text-slate-300 font-medium text-center"
                >
                  ↓ 2mm Aşağı
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: BADGES & LABELS */}
        {activeTab === 'badges' && (
          <div className="space-y-3">
            {/* Domestic Product Badge */}
            <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="font-semibold text-white">Türk Malı / Yerli Üretim Rozeti</div>
                  <div className="text-[11px] text-slate-400">Resmi yerli üretim logosu</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.badges.showDomesticProductBadge}
                onChange={(e) => updateBadges({ showDomesticProductBadge: e.target.checked })}
                className="rounded border-slate-700 bg-slate-800 text-emerald-600 focus:ring-emerald-500"
              />
            </label>

            {/* Shelf Location */}
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-400" />
                  <span className="font-semibold text-white">Depo / Raf Lokasyonu</span>
                </div>
                <input
                  type="checkbox"
                  checked={config.badges.showShelfLocation}
                  onChange={(e) => updateBadges({ showShelfLocation: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500"
                />
              </label>
              {config.badges.showShelfLocation && (
                <input
                  type="text"
                  value={config.badges.shelfLocationText || ''}
                  onChange={(e) => updateBadges({ shelfLocationText: e.target.value })}
                  placeholder="Örn: RAF: B2 / GÖZ: 4"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                />
              )}
            </div>

            {/* LOT Number */}
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-purple-400" />
                  <span className="font-semibold text-white">Parti / LOT Numarası</span>
                </div>
                <input
                  type="checkbox"
                  checked={config.badges.showLotNumber}
                  onChange={(e) => updateBadges({ showLotNumber: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-800 text-purple-600 focus:ring-purple-500"
                />
              </label>
              {config.badges.showLotNumber && (
                <input
                  type="text"
                  value={config.badges.lotNumberText || ''}
                  onChange={(e) => updateBadges({ lotNumberText: e.target.value })}
                  placeholder="Örn: LOT-2026/09"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                />
              )}
            </div>

            {/* Campaign Banner */}
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <span className="font-semibold text-white">Kampanya / Dikkat Bandı</span>
              <input
                type="text"
                value={config.badges.campaignBannerText || ''}
                onChange={(e) => updateBadges({ campaignBannerText: e.target.value })}
                placeholder="Örn: NET FİYAT, YENİ ÜRÜN..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
              />
            </div>

            {/* Strikethrough Discount */}
            <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer">
              <div>
                <div className="font-semibold text-white">Üstü Çizili Liste Fiyatı</div>
                <div className="text-[11px] text-slate-400">İndirimli net bayi fiyatını vurgular</div>
              </div>
              <input
                type="checkbox"
                checked={config.badges.showDiscountStrike}
                onChange={(e) => updateBadges({ showDiscountStrike: e.target.checked })}
                className="rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500"
              />
            </label>
          </div>
        )}

        {/* TAB 5: PRINTER CALIBRATION */}
        {activeTab === 'calibration' && (
          <div className="space-y-4">
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-[11px] leading-relaxed">
              <strong>Yazıcı Kayma Kalibrasyonu:</strong> Termal yazıcınız veya A4 sayfanız 1-2 mm sağa/sola kayıyorsa, buradan milimetrik ofset vererek sıfırlayabilirsiniz.
            </div>

            {/* X Offset */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-300 font-medium">Yatay Ofset (X Ekseni)</span>
                <span className="font-mono text-blue-400 font-bold">
                  {config.calibration.offsetXmm > 0 ? `+${config.calibration.offsetXmm}` : config.calibration.offsetXmm} mm
                </span>
              </div>
              <input
                type="range"
                min="-5"
                max="5"
                step="0.5"
                value={config.calibration.offsetXmm}
                onChange={(e) => updateCalibration({ offsetXmm: Number(e.target.value) })}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>

            {/* Y Offset */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-300 font-medium">Dikey Ofset (Y Ekseni)</span>
                <span className="font-mono text-blue-400 font-bold">
                  {config.calibration.offsetYmm > 0 ? `+${config.calibration.offsetYmm}` : config.calibration.offsetYmm} mm
                </span>
              </div>
              <input
                type="range"
                min="-5"
                max="5"
                step="0.5"
                value={config.calibration.offsetYmm}
                onChange={(e) => updateCalibration({ offsetYmm: Number(e.target.value) })}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>

            <button
              onClick={() => updateCalibration({ offsetXmm: 0, offsetYmm: 0 })}
              className="w-full py-1.5 px-3 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Ofsetleri Sıfırla (0 mm)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
