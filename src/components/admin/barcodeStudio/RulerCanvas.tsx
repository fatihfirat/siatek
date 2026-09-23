import React, { useEffect, useRef, useState } from 'react';
import { Product } from '../../../types';
import { LabelStudioConfig } from './types';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { getValidEAN13 } from '../BarcodeGeneratorModal';
import { 
  MapPin, 
  ShieldCheck, 
  Tag, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Move, 
  Maximize2, 
  Plus, 
  Minus,
  Sparkles,
  Hand
} from 'lucide-react';

interface RulerCanvasProps {
  product: Product;
  config: LabelStudioConfig;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onConfigChange?: (config: LabelStudioConfig) => void;
}

export const RulerCanvas: React.FC<RulerCanvasProps> = ({
  product,
  config,
  zoom,
  onZoomChange,
  onConfigChange,
}) => {
  const barcodeSvgRef = useRef<SVGSVGElement>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  // Canvas Pan State (Sonsuz Kanvas Kaydırma)
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanningCanvas, setIsPanningCanvas] = useState(false);
  const canvasDragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Barcode Drag State (Barkodu Etiket Üzerinde Tutup Kaydırma)
  const [isDraggingBarcode, setIsDraggingBarcode] = useState(false);
  const [isHoveringBarcode, setIsHoveringBarcode] = useState(false);
  const barcodeDragStartRef = useRef<{ x: number; y: number; startOffsetX: number; startOffsetY: number }>({
    x: 0,
    y: 0,
    startOffsetX: 0,
    startOffsetY: 0,
  });

  const barcodeValue = product.barcode || product.sku || product.id;

  // Render Barcode
  useEffect(() => {
    if (barcodeSvgRef.current) {
      try {
        if (config.barcode.type === 'EAN13') {
          const { code } = getValidEAN13(barcodeValue);
          JsBarcode(barcodeSvgRef.current, code, {
            format: 'EAN13',
            lineColor: '#000000',
            width: Math.max(1, config.barcode.barcodeWidthScale),
            height: Math.max(20, config.barcode.barcodeHeightMm * 3.78),
            displayValue: config.barcode.showText,
            fontSize: config.typography.barcodeTextFontSizePt * 1.33,
            margin: 0,
          });
        } else {
          JsBarcode(barcodeSvgRef.current, barcodeValue, {
            format: 'CODE128',
            lineColor: '#000000',
            width: Math.max(1, config.barcode.barcodeWidthScale),
            height: Math.max(20, config.barcode.barcodeHeightMm * 3.78),
            displayValue: config.barcode.showText,
            fontSize: config.typography.barcodeTextFontSizePt * 1.33,
            margin: 0,
          });
        }
      } catch (err) {
        console.warn('Barcode render error:', err);
      }
    }
  }, [barcodeValue, config.barcode, config.typography.barcodeTextFontSizePt]);

  // Render QR
  useEffect(() => {
    if (qrCanvasRef.current && (config.barcode.type === 'QR' || config.barcode.type === 'DUAL')) {
      QRCode.toCanvas(
        qrCanvasRef.current,
        `https://siatek.alphateknikhvac.com/p/${product.id}`,
        {
          width: Math.max(30, config.barcode.qrSizeMm * 3.78),
          margin: 0,
          color: { dark: '#000000', light: '#ffffff' }
        },
        () => {}
      );
    }
  }, [product.id, config.barcode.type, config.barcode.qrSizeMm]);

  // Conversion: 1mm = 3.78px (at 96 DPI standard screen)
  const scale = zoom / 100;
  const mmToPx = (mm: number) => mm * 3.78 * scale;
  const labelWidthPx = mmToPx(config.dimensions.widthMm);
  const labelHeightPx = mmToPx(config.dimensions.heightMm);

  // Top ruler markers (every 10mm)
  const horizontalMarkers = Array.from({ length: Math.ceil(config.dimensions.widthMm / 10) + 1 });
  // Left ruler markers (every 10mm)
  const verticalMarkers = Array.from({ length: Math.ceil(config.dimensions.heightMm / 10) + 1 });

  const formattedPrice = product.price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const strikePrice = (product.price * (config.badges.discountListPrice || 1.2)).toLocaleString('tr-TR', { minimumFractionDigits: 2 });

  // 1. Mouse Handlers for Barcode Dragging on Label (Tut & Kaydır)
  const handleBarcodeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDraggingBarcode(true);
    barcodeDragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startOffsetX: config.barcode.barcodeOffsetXMm || 0,
      startOffsetY: config.barcode.barcodeOffsetYMm || 0,
    };
  };

  // 2. Mouse Handlers for Infinite Canvas Panning
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Sadece sol tıklama ile kanvas kaydırma
    if (e.button !== 0) return;
    setIsPanningCanvas(true);
    canvasDragStartRef.current = {
      x: e.clientX - panOffset.x,
      y: e.clientY - panOffset.y,
    };
  };

  const handleGlobalMouseMove = (e: React.MouseEvent) => {
    // A) Barkodu sürüklüyorsa
    if (isDraggingBarcode && onConfigChange) {
      const deltaX = (e.clientX - barcodeDragStartRef.current.x) / (3.78 * scale);
      const deltaY = (e.clientY - barcodeDragStartRef.current.y) / (3.78 * scale);
      
      const newOffsetX = Math.round((barcodeDragStartRef.current.startOffsetX + deltaX) * 2) / 2;
      const newOffsetY = Math.round((barcodeDragStartRef.current.startOffsetY + deltaY) * 2) / 2;

      // Maksimum +/- 25 mm kaydırma sınırı
      const clampedX = Math.max(-25, Math.min(25, newOffsetX));
      const clampedY = Math.max(-25, Math.min(25, newOffsetY));

      onConfigChange({
        ...config,
        barcode: {
          ...config.barcode,
          barcodeOffsetXMm: clampedX,
          barcodeOffsetYMm: clampedY,
        }
      });
      return;
    }

    // B) Kanvası sürüklüyorsa
    if (isPanningCanvas) {
      setPanOffset({
        x: e.clientX - canvasDragStartRef.current.x,
        y: e.clientY - canvasDragStartRef.current.y,
      });
    }
  };

  const handleGlobalMouseUp = () => {
    setIsDraggingBarcode(false);
    setIsPanningCanvas(false);
  };

  // Hızlı Yükseklik Değiştirme
  const handleAdjustHeight = (deltaMm: number) => {
    if (!onConfigChange) return;
    const newHeight = Math.max(25, Math.min(200, config.dimensions.heightMm + deltaMm));
    onConfigChange({
      ...config,
      dimensions: {
        ...config.dimensions,
        heightMm: newHeight,
      }
    });
  };

  // Barkod Konumunu Merkeze Sıfırlama
  const handleResetBarcodePosition = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onConfigChange) return;
    onConfigChange({
      ...config,
      barcode: {
        ...config.barcode,
        barcodeOffsetXMm: 0,
        barcodeOffsetYMm: 0,
      }
    });
  };

  const currentBarcodeOffsetX = config.barcode.barcodeOffsetXMm || 0;
  const currentBarcodeOffsetY = config.barcode.barcodeOffsetYMm || 0;

  return (
    <div 
      className="flex flex-col h-full bg-[#0E131F] rounded-2xl border border-slate-800 overflow-hidden select-none"
      onMouseMove={handleGlobalMouseMove}
      onMouseUp={handleGlobalMouseUp}
      onMouseLeave={handleGlobalMouseUp}
    >
      {/* Canvas Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 text-xs text-slate-400 gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-slate-300 font-semibold">{config.dimensions.widthMm} × {config.dimensions.heightMm} mm</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
            {config.barcode.type}
          </span>
          
          {/* Quick Height Adjustment */}
          <div className="flex items-center gap-1 bg-slate-800/80 px-1.5 py-0.5 rounded-lg border border-slate-700/60 text-[11px]">
            <span className="text-slate-400">Yükseklik:</span>
            <button
              type="button"
              onClick={() => handleAdjustHeight(-5)}
              className="p-0.5 hover:text-white rounded hover:bg-slate-700"
              title="Yüksekliği 5mm azalt"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="font-mono font-bold text-white px-0.5">{config.dimensions.heightMm}mm</span>
            <button
              type="button"
              onClick={() => handleAdjustHeight(5)}
              className="p-0.5 hover:text-white rounded hover:bg-slate-700"
              title="Yüksekliği 5mm artır (Taşmaları önler)"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          {/* Barcode Position Indicator & Reset */}
          {(currentBarcodeOffsetX !== 0 || currentBarcodeOffsetY !== 0) && (
            <button
              type="button"
              onClick={handleResetBarcodePosition}
              className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition cursor-pointer"
              title="Barkod kaydırmasını sıfırla (0,0)"
            >
              <Move className="w-3 h-3" />
              <span>Barkod Kaydı: X{currentBarcodeOffsetX > 0 ? `+${currentBarcodeOffsetX}` : currentBarcodeOffsetX} / Y{currentBarcodeOffsetY > 0 ? `+${currentBarcodeOffsetY}` : currentBarcodeOffsetY}mm</span>
              <RotateCcw className="w-2.5 h-2.5 ml-0.5" />
            </button>
          )}
        </div>

        {/* Zoom & Canvas Controls */}
        <div className="flex items-center gap-1 bg-slate-800/80 rounded-lg p-0.5 border border-slate-700/60">
          <button
            type="button"
            onClick={() => onZoomChange(Math.max(50, zoom - 25))}
            className="p-1 hover:text-white rounded hover:bg-slate-700 transition cursor-pointer"
            title="Uzaklaştır"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="px-2 font-mono text-[11px] text-slate-300 min-w-[45px] text-center font-bold">
            %{zoom}
          </span>
          <button
            type="button"
            onClick={() => onZoomChange(Math.min(300, zoom + 25))}
            className="p-1 hover:text-white rounded hover:bg-slate-700 transition cursor-pointer"
            title="Yakınlaştır"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              onZoomChange(100);
              setPanOffset({ x: 0, y: 0 });
            }}
            className="p-1 hover:text-white rounded hover:bg-slate-700 transition text-[10px] px-1.5 font-mono cursor-pointer"
            title="Kanvası Sıfırla ve Merkeze Al"
          >
            Merkez
          </button>
        </div>
      </div>

      {/* Interactive Ruler Workspace with Pan & Drag */}
      <div 
        className={`flex-1 overflow-hidden p-6 flex items-center justify-center relative bg-[radial-gradient(#1E293B_1px,transparent_1px)] [background-size:16px_16px] ${
          isPanningCanvas ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        onMouseDown={handleCanvasMouseDown}
      >
        {/* Helper Hint Toast */}
        <div className="absolute top-3 left-4 pointer-events-none z-20 flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 px-2.5 py-1 rounded-lg text-[11px] text-slate-300 shadow-md">
          <Move className="w-3.5 h-3.5 text-blue-400" />
          <span>İpucu: <strong>Barkodun üzerine basıp sürükleyerek</strong> etiket içinde serbestçe kaydırabilirsiniz.</span>
        </div>

        {/* Ruler Container (Pannable) */}
        <div 
          className="relative inline-block shadow-2xl transition-transform duration-75"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
          }}
        >
          {/* Top Horizontal Ruler */}
          <div 
            className="h-5 bg-slate-800/90 border-b border-slate-700 text-[9px] font-mono text-slate-400 flex relative ml-5"
            style={{ width: `${labelWidthPx}px` }}
          >
            {horizontalMarkers.map((_, idx) => (
              <div 
                key={idx}
                className="absolute top-0 bottom-0 border-l border-slate-600 pl-0.5 text-[8px] flex items-end pb-0.5"
                style={{ left: `${idx * 10 * 3.78 * scale}px` }}
              >
                {idx * 10}
              </div>
            ))}
          </div>

          <div className="flex">
            {/* Left Vertical Ruler */}
            <div 
              className="w-5 bg-slate-800/90 border-r border-slate-700 text-[9px] font-mono text-slate-400 relative shrink-0"
              style={{ height: `${labelHeightPx}px` }}
            >
              {verticalMarkers.map((_, idx) => (
                <div 
                  key={idx}
                  className="absolute left-0 right-0 border-t border-slate-600 pr-0.5 text-[8px] text-right"
                  style={{ top: `${idx * 10 * 3.78 * scale}px` }}
                >
                  {idx * 10}
                </div>
              ))}
            </div>

            {/* Actual Physical Label Preview (White Thermal Paper) */}
            <div
              className="bg-white text-black relative transition-all duration-150 overflow-hidden flex flex-col justify-between shadow-2xl"
              style={{
                width: `${labelWidthPx}px`,
                height: `${labelHeightPx}px`,
                padding: `${config.dimensions.paddingMm * 3.78 * scale}px`,
                borderRadius: `${config.dimensions.borderRadiusMm * 3.78 * scale}px`,
                transform: `translate(${config.calibration.offsetXmm * 3.78 * scale}px, ${config.calibration.offsetYmm * 3.78 * scale}px)`,
              }}
            >
              {/* Top Section: Header Ribbon & Campaign */}
              <div className="shrink-0">
                {config.showHeader && (
                  <div
                    className={`text-center font-bold uppercase tracking-wider ${
                      config.barcode.invertHeader
                        ? 'bg-black text-white px-2 py-0.5 rounded-xs'
                        : 'text-black border-b border-black/20 pb-0.5'
                    }`}
                    style={{ fontSize: `${config.typography.headerFontSizePt * scale}pt` }}
                  >
                    {config.headerText || 'ALPHA TEKNİK'}
                  </div>
                )}

                {/* Campaign / Notice Banner if present */}
                {config.badges.campaignBannerText && (
                  <div className="bg-red-600 text-white font-black text-center text-[9px] tracking-widest uppercase py-0.5 my-0.5">
                    {config.badges.campaignBannerText}
                  </div>
                )}

                {/* Product Info Block */}
                <div className="my-0.5">
                  {config.showProductName && (
                    <div
                      className="leading-tight line-clamp-2"
                      style={{
                        fontSize: `${config.typography.productNameFontSizePt * scale}pt`,
                        fontWeight: config.typography.productNameWeight === 'black' ? 900 : config.typography.productNameWeight === 'bold' ? 700 : 600
                      }}
                    >
                      {product.name}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-black/70 mt-0.5" style={{ fontSize: `${config.typography.detailsFontSizePt * scale}pt` }}>
                    {config.showSku && (
                      <span className="font-mono font-semibold">KOD: {product.sku || product.id}</span>
                    )}
                    {config.badges.showShelfLocation && config.badges.shelfLocationText && (
                      <span className="inline-flex items-center gap-0.5 font-bold text-black border border-black/30 px-1 rounded-xs">
                        <MapPin className="w-2.5 h-2.5" />
                        {config.badges.shelfLocationText}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Middle Section: INTERACTIVE DRAGGABLE BARCODE & QR */}
              <div 
                className={`flex-1 min-h-0 flex items-center justify-center relative my-0.5 transition-all ${
                  isDraggingBarcode 
                    ? 'cursor-grabbing ring-2 ring-blue-500 rounded-lg bg-blue-50/50' 
                    : 'cursor-grab hover:ring-1 hover:ring-blue-400/80 rounded-lg'
                }`}
                onMouseDown={handleBarcodeMouseDown}
                onMouseEnter={() => setIsHoveringBarcode(true)}
                onMouseLeave={() => setIsHoveringBarcode(false)}
                style={{
                  transform: `translate(${currentBarcodeOffsetX * 3.78 * scale}px, ${currentBarcodeOffsetY * 3.78 * scale}px)`,
                }}
                title="Barkodu tutup sürükleyerek istediğiniz yere kaydırın"
              >
                {/* Visual Drag Handle Pill on Hover */}
                {(isHoveringBarcode || isDraggingBarcode) && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white font-mono text-[8px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm z-30 pointer-events-none">
                    <Move className="w-2 h-2" />
                    <span>Kaydır (X: {currentBarcodeOffsetX} / Y: {currentBarcodeOffsetY} mm)</span>
                  </div>
                )}

                <div className="flex items-center justify-center gap-2 max-w-full max-h-full">
                  {/* Barcode */}
                  {(config.barcode.type === 'CODE128' || config.barcode.type === 'EAN13' || config.barcode.type === 'DUAL') && (
                    <div className="flex flex-col items-center justify-center overflow-hidden max-h-full">
                      <svg ref={barcodeSvgRef} className="max-w-full max-h-full object-contain" />
                    </div>
                  )}

                  {/* QR Code */}
                  {(config.barcode.type === 'QR' || config.barcode.type === 'DUAL') && (
                    <div className="flex flex-col items-center justify-center shrink-0 max-h-full">
                      <canvas ref={qrCanvasRef} className="max-h-full object-contain" />
                      <span className="text-[7px] text-black/60 font-mono mt-0.5">FÖYÜ GÖR</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Section: NEVER CUT OFF (Fiyat & Rozetler Asla Kesilmez) */}
              <div className="shrink-0 mt-auto pt-1 border-t border-black/15 flex items-end justify-between bg-white z-10">
                {/* Badges / LOT / Domestic */}
                <div className="flex flex-col gap-0.5">
                  {config.badges.showDomesticProductBadge && (
                    <div className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-black text-white font-black text-[7px] rounded-xs uppercase tracking-tight">
                      <ShieldCheck className="w-2.5 h-2.5 text-white" />
                      TÜRK MALI
                    </div>
                  )}
                  {config.badges.showLotNumber && config.badges.lotNumberText && (
                    <span className="font-mono text-[7px] text-black/70 font-semibold">
                      {config.badges.lotNumberText}
                    </span>
                  )}
                </div>

                {/* Price Block (Sıfır Taşma, Tam Görünür) */}
                {config.showPrice && (
                  <div className="text-right leading-none">
                    {config.badges.showDiscountStrike && (
                      <div className="line-through text-black/50 text-[9px] font-mono">
                        {strikePrice} ₺
                      </div>
                    )}
                    <div
                      className="font-mono text-black font-black"
                      style={{
                        fontSize: `${config.typography.priceFontSizePt * scale}pt`,
                      }}
                    >
                      {formattedPrice} <span className="text-[10px]">₺</span>
                    </div>
                    {config.badges.showVatInfo && (
                      <div className="text-[7px] text-black/60 font-medium">
                        {config.badges.vatType === 'included' ? 'KDV DAHİLDİR' : '+ KDV'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
