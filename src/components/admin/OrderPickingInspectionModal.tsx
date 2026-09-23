import React, { useState, useEffect, useRef } from 'react';
import useModalBehavior from '../../hooks/useModalBehavior';
import { 
  X, 
  Boxes, 
  CheckCircle2, 
  Printer, 
  Camera, 
  Barcode, 
  Package, 
  Truck, 
  AlertCircle,
  User as UserIcon,
  MapPin,
  Check,
  Building,
  Phone,
  CreditCard,
  FileText,
  Zap,
  ZapOff,
  SwitchCamera,
  ShieldCheck,
  QrCode,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Order, PickingListItem, Product } from '../../types';
import { playNotificationSound } from '../../lib/audio';
import confetti from 'canvas-confetti';
import { BarcodeViewfinderIcon } from '../common/FloatingScannerButton';
import { printElementById, printShippingLabel100x150, printThermalReceipt80mm } from '../../utils/printUtils';

export interface PickingRecipientDetails {
  recipientName?: string;
  recipientPhone?: string;
  recipientIdNumber?: string;
  recipientTitle?: string;
  deliveryAddressOverride?: string;
  waybillNotes?: string;
}

interface OrderPickingInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  products?: Product[];
  onCompletePicking?: (
    orderId: string, 
    packageCount: number, 
    shippingCompany: string, 
    waybillNumber: string,
    recipientDetails?: PickingRecipientDetails
  ) => Promise<void>;
  onPickingComplete?: () => void;
  onOpenBarcodeScanner?: () => void;
}

const CARRIERS = [
  'ALPHA TEKNİK Özmal Dağıtım Aracı (63 AT 941)',
  'ALPHA TEKNİK Panelvan Sevkiyat (63 ALP 102)',
  'Yurtiçi Kargo / Öz Ambar',
  'Şantiye Özel Şoförlü Teslimat',
  'Müşteri Depodan Kendisi Teslim Aldı'
];

const RECIPIENT_PRESETS = [
  { label: 'Şantiye Şefi', icon: '👷' },
  { label: 'Tesisat Ustası', icon: '🔧' },
  { label: 'Depo Sorumlusu', icon: '📦' },
  { label: 'Şoför / Nakliye', icon: '🚚' },
  { label: 'Firma Yetkilisi', icon: '👤' }
];

export const OrderPickingInspectionModal: React.FC<OrderPickingInspectionModalProps> = ({
  isOpen,
  onClose,
  order,
  products = [],
  onCompletePicking,
  onPickingComplete,
  onOpenBarcodeScanner
}) => {
  // Bu modalda hic kaydirma kilidi yoktu: acikken arka plandaki liste
  // kayiyordu ve barkod okuturken yanlis satir isaretlenebiliyordu.
  useModalBehavior(isOpen && !!order, onClose);

  // Safe products array
  const safeProducts = Array.isArray(products) ? products : [];

  // Initialize picking items
  const [pickingItems, setPickingItems] = useState<PickingListItem[]>(() => {
    const items = order?.items || [];
    return items.map((it, idx) => {
      const prod = safeProducts.find(p => p && (p.id === it.productId || (p.name || '').toLowerCase() === (it.productName || '').toLowerCase()));
      return {
        productId: it.productId || `prod-${idx}`,
        productName: it.productName || 'Ürün',
        sku: prod?.sku || `ST00${idx + 1}`,
        barcode: prod?.barcode || `86900000000${idx + 1}`,
        warehouseLocation: prod?.warehouseLocation || `Raf ${String.fromCharCode(65 + (idx % 4))}-0${(idx % 3) + 1}-0${(idx % 8) + 1}`,
        requestedQuantity: it.quantity || 1,
        pickedQuantity: order?.pickingStatus === 'completed' ? (it.quantity || 1) : 0,
        unit: it.unit || 'ADET',
        isCompleted: order?.pickingStatus === 'completed'
      };
    });
  });

  // Shipment & Package State
  const [packageCount, setPackageCount] = useState<number>(order?.packageCount || 1);
  const [shippingCompany, setShippingCompany] = useState<string>(order?.shippingCompany || 'ALPHA TEKNİK Özmal Dağıtım Aracı (63 AT 941)');
  const [waybillNumber, setWaybillNumber] = useState<string>(
    order?.waybillNumber || `SEVK-2026-${order?.orderNumber ? order.orderNumber.replace(/\D/g, '') : Date.now()}`
  );

  // Recipient (Teslim Alan Kişi) Management State
  const [isRecipientDifferent, setIsRecipientDifferent] = useState<boolean>(() => {
    return Boolean(order?.recipientName && order?.recipientName.trim() !== order?.customerName.trim());
  });
  const [recipientName, setRecipientName] = useState<string>(order?.recipientName || '');
  const [recipientPhone, setRecipientPhone] = useState<string>(order?.recipientPhone || '');
  const [recipientIdNumber, setRecipientIdNumber] = useState<string>(order?.recipientIdNumber || '');
  const [recipientTitle, setRecipientTitle] = useState<string>(order?.recipientTitle || 'Şantiye Yetkilisi');
  const [deliveryAddressOverride, setDeliveryAddressOverride] = useState<string>(
    order?.deliveryAddressOverride || order?.customerAddress || ''
  );
  const [waybillNotes, setWaybillNotes] = useState<string>(order?.waybillNotes || order?.notes || '');

  // UI & Scan Engine States
  const [isSaving, setIsSaving] = useState(false);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [showPrintView, setShowPrintView] = useState(false);
  const [manualBarcodeInput, setManualBarcodeInput] = useState<string>('');
  const [scanToast, setScanToast] = useState<{ type: 'success' | 'warning' | 'info'; text: string } | null>(null);

  // Embedded Camera Barcode Scanner States
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const cameraScannerElementId = 'order-picking-scanner-element';
  const scanCooldownRef = useRef(false);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Clean up camera when modal closes or view toggles
  useEffect(() => {
    if (!isOpen || !isCameraOpen) {
      stopCameraScanner();
    }
    return () => {
      stopCameraScanner();
    };
  }, [isOpen, isCameraOpen]);

  // Camera start / stop lifecycle
  const startCameraScanner = async () => {
    setCameraError(null);
    try {
      await stopCameraScanner();

      const html5QrCode = new Html5Qrcode(cameraScannerElementId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
        ],
        verbose: false
      });

      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode },
        {
          fps: 15,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minSize = Math.min(viewfinderWidth, viewfinderHeight);
            return {
              width: Math.floor(minSize * 0.8),
              height: Math.floor(minSize * 0.55),
            };
          },
          aspectRatio: 1.33333,
        },
        (decodedText) => {
          handleProcessScannedCode(decodedText);
        },
        () => {
          // Frame without barcode
        }
      );
    } catch (err: any) {
      console.error('Kamera başlatılamadı:', err);
      setCameraError('Kamera başlatılamadı. Cihaz kamerasına erişim izni verildiğinden emin olun.');
    }
  };

  const stopCameraScanner = async () => {
    try {
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    } catch (e) {
      console.warn('Kamera durdurma:', e);
    } finally {
      setTorchOn(false);
    }
  };

  // Toggle Torch/Flash
  const handleToggleTorch = async () => {
    if (!scannerRef.current || !scannerRef.current.isScanning) return;
    try {
      const nextTorch = !torchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch } as any]
      });
      setTorchOn(nextTorch);
    } catch (e) {
      console.warn('Flaş açılamadı:', e);
    }
  };

  // Switch between front and back camera
  const handleSwitchCamera = async () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    await stopCameraScanner();
    setTimeout(() => {
      startCameraScanner();
    }, 150);
  };

  // Toggle Camera Viewfinder
  const handleToggleCamera = () => {
    if (isCameraOpen) {
      stopCameraScanner();
      setIsCameraOpen(false);
    } else {
      setIsCameraOpen(true);
      setTimeout(() => {
        startCameraScanner();
      }, 100);
    }
  };

  // Handle scanned barcode (from camera or manual input)
  const handleProcessScannedCode = (rawCode: string) => {
    const query = rawCode.trim().toLowerCase();
    if (!query) return;

    if (scanCooldownRef.current) return;
    scanCooldownRef.current = true;
    setTimeout(() => {
      scanCooldownRef.current = false;
    }, 850);

    // Try finding matching item in current picking list
    const matchIndex = pickingItems.findIndex(it => {
      const prod = safeProducts.find(p => p && p.id === it.productId);
      const matchBarcode = it.barcode && it.barcode.toLowerCase() === query;
      const matchProdBarcode = prod?.barcode && prod.barcode.toLowerCase() === query;
      const matchSku = it.sku && it.sku.toLowerCase() === query;
      const matchProdSku = prod?.sku && prod.sku.toLowerCase() === query;
      const matchName = it.productName.toLowerCase() === query;
      return matchBarcode || matchProdBarcode || matchSku || matchProdSku || matchName;
    });

    if (matchIndex === -1) {
      playNotificationSound('alert');
      setScanToast({
        type: 'warning',
        text: `⚠️ [${rawCode.trim()}] bu siparişin çeki listesinde BULUNMUYOR! Hatalı malzeme toplamayın.`
      });
      return;
    }

    const item = pickingItems[matchIndex];
    if (item.pickedQuantity >= item.requestedQuantity) {
      playNotificationSound('status');
      setScanToast({
        type: 'info',
        text: `ℹ️ [${item.productName}] ürününün tüm adedi (${item.requestedQuantity} ${item.unit}) zaten toplandı!`
      });
      return;
    }

    // Increment item
    setPickingItems(prev => {
      const copy = [...prev];
      const target = copy[matchIndex];
      const nextQty = target.pickedQuantity + 1;
      const done = nextQty >= target.requestedQuantity;
      copy[matchIndex] = {
        ...target,
        pickedQuantity: nextQty,
        isCompleted: done
      };
      return copy;
    });

    playNotificationSound('success');
    setScanToast({
      type: 'success',
      text: `✅ [${item.productName}] okutuldu: (${item.pickedQuantity + 1}/${item.requestedQuantity} ${item.unit})`
    });

    // Native vibration if available
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([40, 20, 50]);
      }
    } catch {}
  };

  const handleManualBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBarcodeInput.trim()) return;
    handleProcessScannedCode(manualBarcodeInput.trim());
    setManualBarcodeInput('');
  };

  if (!isOpen || !order) return null;

  // Calculation Metrics
  const totalRequested = pickingItems.reduce((sum, it) => sum + it.requestedQuantity, 0);
  const totalPicked = pickingItems.reduce((sum, it) => sum + it.pickedQuantity, 0);
  const progressPercent = Math.round((totalPicked / (totalRequested || 1)) * 100);
  const isAllPicked = totalRequested > 0 && pickingItems.every(it => it.pickedQuantity >= it.requestedQuantity);

  const handleIncrementPicked = (idx: number) => {
    setPickingItems(prev => {
      const copy = [...prev];
      const it = copy[idx];
      if (it.pickedQuantity < it.requestedQuantity) {
        it.pickedQuantity += 1;
        if (it.pickedQuantity >= it.requestedQuantity) {
          it.isCompleted = true;
          playNotificationSound('success');
        } else {
          playNotificationSound('status');
        }
      }
      return copy;
    });
  };

  const handleDecrementPicked = (idx: number) => {
    setPickingItems(prev => {
      const copy = [...prev];
      const it = { ...copy[idx] };
      if (it.pickedQuantity > 0) {
        it.pickedQuantity -= 1;
        it.isCompleted = it.pickedQuantity >= it.requestedQuantity;
      }
      copy[idx] = it;
      return copy;
    });
  };

  const handleCompleteAll = () => {
    setPickingItems(prev => prev.map(it => ({
      ...it,
      pickedQuantity: it.requestedQuantity,
      isCompleted: true
    })));
    playNotificationSound('success');
    setScanToast({ type: 'success', text: 'Tüm kalemler eksiksiz toplandı olarak işaretlendi.' });
  };

  const handleResetAll = () => {
    setPickingItems(prev => prev.map(it => ({
      ...it,
      pickedQuantity: 0,
      isCompleted: false
    })));
    setScanToast({ type: 'info', text: 'ℹ️ Tüm toplama miktarları sıfırlandı. Baştan sayabilirsiniz.' });
  };

  // Finalize picking & create waybill
  const handleSaveAndFinalize = async () => {
    if (!isAllPicked) {
      if (!confirm('Tüm ürünler henüz toplanmadı. Kısmi toplama olarak sevk hazırlığını onaylamak istiyor musunuz?')) {
        return;
      }
    }

    setIsSaving(true);
    setSaveErrorMessage(null);

    const recipientPayload: PickingRecipientDetails = isRecipientDifferent ? {
      recipientName: recipientName.trim(),
      recipientPhone: recipientPhone.trim(),
      recipientIdNumber: recipientIdNumber.trim(),
      recipientTitle: recipientTitle.trim(),
      deliveryAddressOverride: deliveryAddressOverride.trim(),
      waybillNotes: waybillNotes.trim()
    } : {
      recipientName: order.customerName,
      recipientPhone: order.customerPhone,
      recipientTitle: 'Müşteri (Kendisi)',
      deliveryAddressOverride: order.customerAddress,
      waybillNotes: waybillNotes.trim()
    };

    try {
      if (typeof onCompletePicking === 'function') {
        await onCompletePicking(order.id, packageCount, shippingCompany, waybillNumber, recipientPayload);
      } else {
        // Direct API Fallback to ensure it never fails
        const res = await fetch(`/api/orders/${order.id}/picking`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            packageCount,
            shippingCompany,
            waybillNumber,
            ...recipientPayload
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Sipariş toplama bilgisi kaydedilemedi.');
        }
      }

      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      playNotificationSound('success');
      if (onPickingComplete) {
        onPickingComplete();
      }
      setShowPrintView(true);
    } catch (e: any) {
      console.error(e);
      setSaveErrorMessage(e.message || 'Toplama kaydedilirken sunucu hatası oluştu.');
    } finally {
      setIsSaving(false);
    }
  };

  // Thermal Label 100x150mm Print
  const handlePrint100x150ThermalLabel = () => {
    const finalRecipient = isRecipientDifferent && recipientName.trim() ? recipientName.trim() : order.customerName;
    const finalPhone = isRecipientDifferent && recipientPhone.trim() ? recipientPhone.trim() : order.customerPhone;
    const finalAddress = deliveryAddressOverride.trim() || order.customerAddress;

    printShippingLabel100x150({
      orderNumber: order.orderNumber,
      trackingNumber: waybillNumber,
      customerName: finalRecipient,
      customerCompany: isRecipientDifferent ? `${order.customerName} (Yetkili: ${recipientName})` : order.customerName,
      customerPhone: finalPhone,
      customerAddress: finalAddress,
      parcelCount: packageCount,
      currentParcel: 1,
      paymentType: order.notes?.includes('Kapıda') ? 'Kapıda Nakit' : 'Cari Hesap',
      cashOnDeliveryAmount: order.notes?.includes('Kapıda') ? order.total : undefined,
      itemsSummary: pickingItems.map(i => ({
        name: i.productName,
        qty: i.pickedQuantity || i.requestedQuantity,
        unit: i.unit,
      })),
      notes: `${shippingCompany} | ${waybillNotes || 'Hasarsız teslim ediniz.'}`
    });
  };

  // A4 Printable Packing Slip & Waybill
  const handlePrintA4Waybill = () => {
    printElementById('order-picking-printable-slip', `Sevk İrsaliyesi & Çeki Listesi - ${order.orderNumber}`);
  };

  // 80mm Thermal Receipt Print
  const handlePrint80mmReceipt = () => {
    const finalRecipient = isRecipientDifferent && recipientName.trim() ? recipientName.trim() : order.customerName;
    printThermalReceipt80mm({
      title: 'ALPHA TEKNİK SEVKİYAT',
      orderNumber: order.orderNumber,
      customerName: `${order.customerName}${isRecipientDifferent ? ' (Alan: ' + finalRecipient + ')' : ''}`,
      customerPhone: order.customerPhone,
      items: pickingItems.map(it => ({
        name: it.productName,
        qty: it.pickedQuantity,
        unit: it.unit,
      })),
      notes: `Sevk İrsaliye No: ${waybillNumber} | Taşıyıcı: ${shippingCompany} | Koli: ${packageCount} Adet`,
      documentType: 'SEVK_IRSALIYESI'
    });
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md p-3 sm:p-4 md:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div className="min-h-full flex items-center justify-center py-4 sm:py-6">
        <div 
          className="relative w-full max-w-4xl bg-base-surface border border-border rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-base-surface-2/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shadow-xs">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold text-text-primary tracking-tight">
                  Sipariş Hazırlama & Çeki Listesi
                </h2>
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 bg-primary/10 text-primary rounded-lg border border-primary/20">
                  {order.orderNumber}
                </span>
              </div>
              <p className="text-xs text-text-muted">
                {order.customerName} • Malzeme çekimi, barkod doğrulama ve sevk irsaliyesi hazırlığı.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text-primary hover:bg-base-surface rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scan / Alert Toast */}
        {scanToast && (
          <div className={`px-6 py-2.5 border-b text-xs flex items-center justify-between transition-all ${
            scanToast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300' :
            scanToast.type === 'warning' ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300 animate-pulse' :
            'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300'
          }`}>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="font-bold">{scanToast.text}</span>
            </div>
            <button 
              type="button" 
              onClick={() => setScanToast(null)} 
              className="text-[11px] underline font-semibold cursor-pointer opacity-80 hover:opacity-100"
            >
              Kapat
            </button>
          </div>
        )}

        {/* Content */}
        {!showPrintView ? (
          <div className="p-5 sm:p-6 space-y-5 max-h-[76vh] overflow-y-auto custom-scrollbar">
            
            {/* Top Stats & Progress Bar */}
            <div className="p-4 bg-base-surface-2 border border-border rounded-2xl space-y-3 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-text-muted text-[11px] block font-medium">Müşteri / Şantiye:</span>
                  <span className="font-bold text-text-primary">
                    {order.constructionSiteName ? `${order.constructionSiteName} (${order.customerName})` : order.customerName}
                  </span>
                </div>
                <div>
                  <span className="text-text-muted text-[11px] block font-medium">Toplam Toplanan:</span>
                  <span className="font-bold text-text-primary font-mono">
                    {totalPicked} / {totalRequested} Birim
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-text-muted text-[11px] block font-medium">Toplama İlerlemesi:</span>
                  <span className="font-extrabold text-primary font-mono">%{progressPercent}</span>
                </div>
              </div>

              {/* Animated Progress Bar */}
              <div className="w-full h-2.5 bg-base-surface border border-border rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 rounded-full ${
                    isAllPicked ? 'bg-emerald-500' : 'bg-primary'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Live Camera Scanner Viewfinder (Collapsible) */}
            {isCameraOpen && (
              <div className="p-4 bg-slate-900 border border-emerald-500/40 rounded-2xl text-white space-y-3 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                    <BarcodeViewfinderIcon className="w-4 h-4 animate-pulse" />
                    <span>CANLI KAMERA İLE BARKOD OKUTMA</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleToggleTorch}
                      className={`p-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                        torchOn ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                      title="Flaş / Meşale Aç/Kapa"
                    >
                      {torchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={handleSwitchCamera}
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 hover:text-white text-xs cursor-pointer"
                      title="Ön / Arka Kamera Geçişi"
                    >
                      <SwitchCamera className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleToggleCamera}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30 text-xs font-bold cursor-pointer"
                    >
                      Kamerayı Kapat
                    </button>
                  </div>
                </div>

                {cameraError ? (
                  <div className="p-3 bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{cameraError}</span>
                  </div>
                ) : (
                  <div className="relative rounded-xl overflow-hidden bg-black flex items-center justify-center min-h-[220px]">
                    <div id={cameraScannerElementId} className="w-full max-w-md mx-auto" />
                    {/* Visual Laser Line */}
                    <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-emerald-500 shadow-[0_0_12px_#10b981] pointer-events-none opacity-85 animate-pulse" />
                  </div>
                )}
                <p className="text-[11px] text-slate-400 text-center">
                  Barkodu kameranın yeşil hedef çizgisine tutun. Okutulduğunda toplanan adedi otomatik güncellenir.
                </p>
              </div>
            )}

            {/* Quick Barcode / SKU Input Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-3 bg-base-surface-2 border border-border rounded-2xl">
              <form onSubmit={handleManualBarcodeSubmit} className="flex-1 flex gap-2">
                <div className="relative flex-1">
                  <Barcode className="w-4 h-4 text-text-muted absolute left-3 top-2.5 opacity-70" />
                  <input
                    type="text"
                    value={manualBarcodeInput}
                    onChange={(e) => setManualBarcodeInput(e.target.value)}
                    placeholder="El terminali / Barkod okutun veya SKU yazıp Enter'a basın..."
                    className="w-full pl-9 pr-3 py-2 bg-base-surface border border-border rounded-xl text-xs font-mono font-bold text-text-primary focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0 active:scale-95"
                >
                  Okut / Doğrula
                </button>
              </form>

              <div className="flex items-center space-x-2 justify-end">
                <button
                  type="button"
                  onClick={handleToggleCamera}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer border ${
                    isCameraOpen 
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' 
                      : 'bg-[#2D7B31]/10 text-[#2D7B31] border-[#2D7B31]/30 hover:bg-[#2D7B31]/20'
                  }`}
                >
                  <BarcodeViewfinderIcon className="w-4 h-4" />
                  <span>{isCameraOpen ? 'Kamerayı Gizle' : 'Kamera ile Tara'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCompleteAll}
                  className="px-3.5 py-2 bg-base-surface hover:bg-base-surface-2 text-text-primary border border-border rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Tümünü Toplandı İşaretle
                </button>
              </div>
            </div>

            {/* Picking Items Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-text-secondary px-1">
                <span>Toplanacak Malzemeler ({pickingItems.length} Kalem)</span>
                <span className="text-[11px] text-text-muted font-mono">
                  {totalPicked} / {totalRequested} Adet
                </span>
              </div>

              <div className="space-y-2 max-h-64 sm:max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                {pickingItems.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-3 sm:p-3.5 border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 transition-all ${
                      item.isCompleted
                        ? 'bg-emerald-500/5 border-emerald-500/25'
                        : 'bg-base-surface-2/60 border-border hover:bg-base-surface-2'
                    }`}
                  >
                    <div className="flex items-start sm:items-center space-x-3 min-w-0 flex-1">
                      {/* Warehouse Rack Badge */}
                      <div className="px-2.5 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary font-mono text-xs font-bold shrink-0 text-center shadow-2xs">
                        <span className="text-[9px] block text-text-muted uppercase">Raf Yeri</span>
                        {item.warehouseLocation}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs sm:text-sm font-bold text-text-primary leading-snug line-clamp-1">
                          {item.productName}
                        </h4>
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-text-muted font-mono mt-0.5">
                          <span>SKU: {item.sku}</span>
                          {item.barcode && <span>• Barkod: {item.barcode}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Quantity & Increment/Decrement Controls */}
                    <div className="flex items-center justify-between sm:justify-end space-x-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                      <div className="text-left sm:text-right mr-1">
                        <div className="text-xs font-bold text-text-primary font-mono">
                          {item.pickedQuantity} / {item.requestedQuantity} {item.unit}
                        </div>
                        <span className={`text-[10px] font-semibold ${
                          item.isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                        }`}>
                          {item.isCompleted ? 'Toplandı' : 'Toplama Bekliyor'}
                        </span>
                      </div>

                      {/* −1 Geri Al butonu: pickedQuantity > 0 olduğu sürece herzaman etkin */}
                      <button
                        type="button"
                        onClick={() => handleDecrementPicked(idx)}
                        disabled={item.pickedQuantity === 0}
                        title="Yanlış işaretlemeyi geri al (−1)"
                        className={`min-h-[38px] min-w-[38px] px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer active:scale-[0.97] border ${
                          item.pickedQuantity === 0
                            ? 'bg-base-surface border-border text-text-muted opacity-40 cursor-not-allowed'
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20'
                        }`}
                      >
                        <span className="text-sm leading-none">−1</span>
                      </button>

                      {/* +1 Okut butonu */}
                      <button
                        type="button"
                        onClick={() => handleIncrementPicked(idx)}
                        disabled={item.isCompleted}
                        className={`min-h-[38px] px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer active:scale-[0.97] ${
                          item.isCompleted
                            ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 cursor-default'
                            : 'bg-primary hover:bg-primary/90 text-white shadow-xs'
                        }`}
                      >
                        {item.isCompleted ? <Check className="w-4 h-4" /> : <span>+1 Okut</span>}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Standard Shipping & Waybill Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 sm:p-4 bg-base-surface-2 border border-border rounded-2xl">
              <div>
                <label className="block text-[11px] font-bold text-text-secondary mb-1">
                  Koli / Paket Adedi
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="1"
                    value={packageCount}
                    onChange={(e) => setPackageCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 bg-base-surface border border-border rounded-xl text-xs text-text-primary font-bold font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                  <span className="text-[11px] text-text-muted font-medium">Kap</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-text-secondary mb-1">
                  Sevkiyat Aracı / Şoför / Ekip
                </label>
                <select
                  value={shippingCompany}
                  onChange={(e) => setShippingCompany(e.target.value)}
                  className="w-full px-3 py-2 bg-base-surface border border-border rounded-xl text-xs text-text-primary font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                >
                  {CARRIERS.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-text-secondary mb-1">
                  Sevk İrsaliye Numarası
                </label>
                <input
                  type="text"
                  value={waybillNumber}
                  onChange={(e) => setWaybillNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-base-surface border border-border rounded-xl text-xs text-text-primary font-mono font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>
            </div>

            {/* PREMIUM SECTION: TESLİM ALAN KİŞİ & SEVKİYAT İRSALİYESİ BİLGİLERİ */}
            <div className="p-4 bg-base-surface-2/80 border border-primary/20 rounded-2xl space-y-3.5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/80">
                <div className="flex items-center space-x-2">
                  <UserIcon className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-text-primary">
                    İrsaliye Alıcı & Teslim Alma Bilgileri
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                    Resmi İrsaliye
                  </span>
                </div>

                {/* Switch / Checkbox to toggle custom recipient */}
                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isRecipientDifferent}
                    onChange={(e) => {
                      setIsRecipientDifferent(e.target.checked);
                      if (e.target.checked && !recipientName) {
                        setRecipientName(order.constructionSiteContact || '');
                        setRecipientPhone(order.constructionSitePhone || '');
                      }
                    }}
                    className="rounded text-primary focus:ring-primary/20 w-4 h-4"
                  />
                  <span className="text-xs font-bold text-text-secondary">
                    Teslim Alan Kişi Fatura Müşterisinden Farklı
                  </span>
                </label>
              </div>

              {isRecipientDifferent ? (
                <div className="space-y-3 animate-in fade-in duration-200">
                  {/* Preset Role Quick Selector */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-text-muted font-medium mr-1">Hızlı Unvan:</span>
                    {RECIPIENT_PRESETS.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setRecipientTitle(p.label)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center space-x-1 transition-all cursor-pointer ${
                          recipientTitle === p.label
                            ? 'bg-primary text-white shadow-xs'
                            : 'bg-base-surface hover:bg-base-surface-2 text-text-secondary border border-border'
                        }`}
                      >
                        <span>{p.icon}</span>
                        <span>{p.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Recipient Details Form Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-text-secondary mb-1">
                        Teslim Alan Adı Soyadı *
                      </label>
                      <input
                        type="text"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        placeholder="Örn: Ahmet Usta / Ali Şef"
                        className="w-full px-3 py-2 bg-base-surface border border-border rounded-xl text-xs text-text-primary font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-text-secondary mb-1">
                        Teslim Alan Cep Telefonu
                      </label>
                      <input
                        type="text"
                        value={recipientPhone}
                        onChange={(e) => setRecipientPhone(e.target.value)}
                        placeholder="Örn: 0532 000 00 00"
                        className="w-full px-3 py-2 bg-base-surface border border-border rounded-xl text-xs text-text-primary font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-text-secondary mb-1">
                        Görevi / Unvanı
                      </label>
                      <input
                        type="text"
                        value={recipientTitle}
                        onChange={(e) => setRecipientTitle(e.target.value)}
                        placeholder="Örn: Şantiye Şefi / Formen"
                        className="w-full px-3 py-2 bg-base-surface border border-border rounded-xl text-xs text-text-primary focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-text-secondary mb-1">
                        T.C. Kimlik / Sicil / İmza No
                      </label>
                      <input
                        type="text"
                        value={recipientIdNumber}
                        onChange={(e) => setRecipientIdNumber(e.target.value)}
                        placeholder="Resmi teslim tutanağı için"
                        className="w-full px-3 py-2 bg-base-surface border border-border rounded-xl text-xs text-text-primary font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      />
                    </div>
                  </div>

                  {/* Delivery Address Override & Waybill Notes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-text-secondary mb-1 flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                        <span>Fiili Sevk / Şantiye Teslim Adresi</span>
                      </label>
                      <textarea
                        rows={2}
                        value={deliveryAddressOverride}
                        onChange={(e) => setDeliveryAddressOverride(e.target.value)}
                        placeholder="Malzemenin teslim edileceği şantiye veya depo adresi..."
                        className="w-full px-3 py-1.5 bg-base-surface border border-border rounded-xl text-xs text-text-primary resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-text-secondary mb-1 flex items-center space-x-1">
                        <FileText className="w-3.5 h-3.5 text-primary" />
                        <span>İrsaliye Sevk Notu & Özel Talimat</span>
                      </label>
                      <textarea
                        rows={2}
                        value={waybillNotes}
                        onChange={(e) => setWaybillNotes(e.target.value)}
                        placeholder="Örn: Kapıda kaşe-imza alınacak, vinç ile B blok girişine indirilecek..."
                        className="w-full px-3 py-1.5 bg-base-surface border border-border rounded-xl text-xs text-text-primary resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 bg-base-surface border border-border rounded-xl flex items-center justify-between text-xs text-text-muted">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>
                      Malzeme doğrudan kayıtlı müşteri/cari yetkilisine (<strong>{order.customerName}</strong>) teslim edilecek.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsRecipientDifferent(true)}
                    className="text-primary hover:underline font-bold text-[11px] cursor-pointer"
                  >
                    + Farklı Kişi Tanımla
                  </button>
                </div>
              )}
            </div>

            {/* Error Banner if any */}
            {saveErrorMessage && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center space-x-2 text-xs text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="font-semibold">{saveErrorMessage}</span>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-t border-border gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-semibold text-text-muted hover:text-text-primary cursor-pointer text-center"
              >
                Kapat
              </button>

              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveAndFinalize}
                className="px-6 py-3 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSaving ? 'Kaydediliyor...' : 'Toplama Tamamlandı & Koli Etiketi Oluştur'}</span>
              </button>
            </div>

          </div>
        ) : (
          /* Label / Waybill Print View */
          <div className="p-5 sm:p-6 space-y-5 max-h-[76vh] overflow-y-auto custom-scrollbar">
            
            {/* Success Header */}
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2.5 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-bold">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Sipariş Başarıyla Toplandı ve Sevk Hazırlığına Alındı!</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrint100x150ThermalLabel}
                  className="px-3.5 py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer active:scale-95 transition-all shadow-2xs"
                  title="100x150 mm Barkodlu Koli Etiketi Yazdır"
                >
                  <QrCode className="w-4 h-4 text-amber-500" />
                  <span>100x150mm Koli Etiketi</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintA4Waybill}
                  className="px-3.5 py-2 bg-primary text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs cursor-pointer active:scale-95 transition-all"
                  title="Resmi A4 Çeki Listesi & Sevk İrsaliyesi Yazdır"
                >
                  <Printer className="w-4 h-4" />
                  <span>A4 İrsaliye & Çeki Listesi</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint80mmReceipt}
                  className="px-3 py-2 bg-base-surface hover:bg-base-surface-2 text-text-primary border border-border rounded-xl text-xs font-bold cursor-pointer"
                  title="80mm Termal Bilgi Fişi Yazdır"
                >
                  <span>80mm Fiş</span>
                </button>
              </div>
            </div>

            {/* Printable Visual Waybill Slip & Label */}
            <div 
              id="order-picking-printable-slip" 
              className="border-2 border-slate-300 p-6 sm:p-7 rounded-2xl bg-white text-slate-900 max-w-2xl mx-auto space-y-4 shadow-lg font-sans text-xs"
            >
              {/* Header */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3">
                <div>
                  <h2 className="font-black text-base tracking-wider text-slate-900">
                    ALPHA TEKNİK DOĞALGAZ & SIHHİ TESİSAT
                  </h2>
                  <p className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">
                    DEPO ÇEKİ LİSTESİ & SEVK İRSALİYESİ
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Şanlıurfa Şube / Merkez Depo Sevkiyat Birimi
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono font-extrabold text-slate-900">
                    İRSALİYE: {waybillNumber}
                  </div>
                  <div className="text-[11px] font-mono text-slate-600">
                    Sipariş: #{order.orderNumber}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {new Date().toLocaleString('tr-TR')}
                  </div>
                </div>
              </div>

              {/* Party Boxes: Fatura / Cari Müşteri vs. Fiili Teslim Alan */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                    Fatura & Cari Müşteri
                  </span>
                  <div className="font-extrabold text-sm text-slate-900 leading-tight">
                    {order.customerName}
                  </div>
                  <div className="text-[11px] text-slate-600 font-mono">
                    Tel: {order.customerPhone}
                  </div>
                  {order.customerEmail && (
                    <div className="text-[10px] text-slate-500">
                      {order.customerEmail}
                    </div>
                  )}
                </div>

                <div className="space-y-1 border-l pl-3 border-slate-200">
                  <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider block">
                    Fiili Teslim Alan Yetkili / Şantiye
                  </span>
                  <div className="font-extrabold text-sm text-emerald-950 leading-tight">
                    {isRecipientDifferent && recipientName.trim() ? recipientName.trim() : order.customerName}
                  </div>
                  <div className="text-[11px] text-slate-700 font-semibold">
                    Unvan: {isRecipientDifferent && recipientTitle.trim() ? recipientTitle.trim() : 'Müşteri (Kendisi)'}
                  </div>
                  <div className="text-[11px] text-slate-600 font-mono">
                    Tel: {isRecipientDifferent && recipientPhone.trim() ? recipientPhone.trim() : order.customerPhone}
                  </div>
                  {recipientIdNumber.trim() && (
                    <div className="text-[10px] text-slate-500 font-mono">
                      T.C. / Sicil: {recipientIdNumber.trim()}
                    </div>
                  )}
                </div>
              </div>

              {/* Delivery Address & Route info */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  Teslimat & Sevk Adresi
                </div>
                <div className="font-medium text-slate-800 leading-snug">
                  {deliveryAddressOverride.trim() || order.customerAddress}
                </div>
                {order.constructionSiteName && (
                  <div className="text-[11px] font-bold text-blue-700 pt-0.5">
                    Şantiye: {order.constructionSiteName}
                  </div>
                )}
                {waybillNotes.trim() && (
                  <div className="text-[11px] italic text-slate-600 pt-1 border-t border-slate-200">
                    <strong>Sevkiyat Notu:</strong> {waybillNotes.trim()}
                  </div>
                )}
              </div>

              {/* Logistics Details */}
              <div className="grid grid-cols-3 gap-2 py-2 border-t border-b border-slate-300 text-center font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 block font-sans">Koli / Paket</span>
                  <strong className="text-sm font-black text-slate-900">1 / {packageCount}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block font-sans">Sevkiyat Aracı</span>
                  <span className="text-[11px] font-bold text-slate-800 block truncate">{shippingCompany}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block font-sans">Kalem Sayısı</span>
                  <strong className="text-sm font-black text-slate-900">{pickingItems.length} Kalem</strong>
                </div>
              </div>

              {/* Items List Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="border-b border-slate-300 text-slate-500 uppercase text-[10px]">
                      <th className="py-1.5 w-8">#</th>
                      <th className="py-1.5">Malzeme Adı & Kod</th>
                      <th className="py-1.5 text-center">Raf</th>
                      <th className="py-1.5 text-right">Miktar</th>
                      <th className="py-1.5 text-center w-16">Durum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-sans">
                    {pickingItems.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-1.5 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-1.5">
                          <div className="font-bold text-slate-900">{it.productName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{it.sku}</div>
                        </td>
                        <td className="py-1.5 text-center font-mono font-bold text-slate-700">{it.warehouseLocation}</td>
                        <td className="py-1.5 text-right font-mono font-black text-slate-900">
                          {it.pickedQuantity} {it.unit}
                        </td>
                        <td className="py-1.5 text-center">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[9px]">
                            Tamam
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Official Signature Lines */}
              <div className="grid grid-cols-2 gap-6 pt-5 border-t-2 border-slate-900 text-center">
                <div className="space-y-6">
                  <div className="text-[11px] font-bold text-slate-700">
                    Teslim Eden (Depo Sorumlusu)
                  </div>
                  <div className="text-[10px] text-slate-400 italic">Kaşe / İmza</div>
                </div>

                <div className="space-y-6 border-l border-slate-200 pl-4">
                  <div className="text-[11px] font-bold text-slate-700">
                    Teslim Alan ({isRecipientDifferent && recipientName ? recipientName : 'Alıcı Yetkili'})
                  </div>
                  <div className="text-[10px] text-slate-400 italic">Ad Soyad / T.C. / Kaşe / İmza</div>
                </div>
              </div>
            </div>

            {/* Back Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-base-surface-2 hover:bg-base-surface text-text-primary rounded-xl text-xs font-bold border border-border cursor-pointer transition-colors"
              >
                Kapat ve Sipariş Listesine Dön
              </button>
            </div>

          </div>
        )}

        </div>
      </div>
    </div>
  );
};
export default OrderPickingInspectionModal;
