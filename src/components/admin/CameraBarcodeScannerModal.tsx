import React, { useState, useEffect, useRef } from 'react';
import { saveProductToFirestore, bulkUpdateProductsInFirestore } from '../../lib/firestoreService';
import { Product } from '../../types';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  Camera,
  X,
  Zap,
  ZapOff,
  SwitchCamera,
  Volume2,
  VolumeX,
  CheckCircle2,
  Package,
  Search,
  Plus,
  Minus,
  Edit3,
  Barcode as BarcodeIcon,
  Layers,
  Upload,
  Copy,
  Check,
  Download,
  AlertTriangle,
  Play,
  Square,
  RefreshCw,
  Tag,
  Trash2,
  FileSpreadsheet,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import { copyToClipboard } from '../../utils/shareUtils';
import confetti from 'canvas-confetti';

import { BarcodeViewfinderIcon } from '../common/FloatingScannerButton';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import { Haptics } from '../../utils/haptics';

interface CameraBarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onProductUpdated?: () => void;
  onOpenProductEdit?: (product: Product) => void;
  onOpenCreateWithBarcode?: (barcode: string) => void;
  onOpenBarcodeGenerator?: (productIds: string[]) => void;
  originRect?: DOMRect | null;
  onScannedProduct?: (product: Product, barcode: string) => void;
  isWmsMode?: boolean;
}

export type ScannerMode = 'lookup' | 'inventory_count' | 'batch_log';

interface ScannedCountItem {
  barcode: string;
  product?: Product;
  count: number;
  lastScannedAt: Date;
}

interface BatchLogItem {
  id: string;
  barcode: string;
  formatName: string;
  timestamp: Date;
  matchedProduct?: Product;
}

// Dual Haptic Feedback Utility (Capacitor Native / Web Vibration API)
function triggerHapticFeedback() {
  Haptics.success();
}

// Audio beep synthesized with Web Audio API
function playScanBeep(success: boolean = true) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (success) {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08); // E6
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(150, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    }

    osc.start();
    osc.stop(ctx.currentTime + (success ? 0.12 : 0.2));
  } catch (e) {
    // audio context might be blocked if no user interaction
  }
}

export default function CameraBarcodeScannerModal({
  isOpen,
  onClose,
  products,
  onProductUpdated,
  onOpenProductEdit,
  onOpenCreateWithBarcode,
  onOpenBarcodeGenerator,
  originRect,
  onScannedProduct,
  isWmsMode = false,
}: CameraBarcodeScannerModalProps) {
  useModalBehavior(isOpen, onClose);
  const [activeMode, setActiveMode] = useState<ScannerMode>('inventory_count');
  
  // Camera & Stream states
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showPermissionHelp, setShowPermissionHelp] = useState(false);
  
  // Visual Flash & HUD Toast states for successful scan
  const [scanSuccessFlash, setScanSuccessFlash] = useState(false);
  const [scannedToastProduct, setScannedToastProduct] = useState<{
    name: string;
    barcode: string;
    sku?: string;
    stock?: number;
    price?: number;
  } | null>(null);
  
  // Last Scan Data
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [lastScannedFormat, setLastScannedFormat] = useState<string | null>(null);
  const [matchedProduct, setMatchedProduct] = useState<Product | null>(null);
  const [scanCooldown, setScanCooldown] = useState(false);
  const [stockUpdating, setStockUpdating] = useState(false);
  const [manualCodeInput, setManualCodeInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  // MODE 2: Inventory Counts (Sayım Masası)
  const [countedItems, setCountedItems] = useState<Record<string, ScannedCountItem>>({});
  const [isApplyingStockCounts, setIsApplyingStockCounts] = useState(false);
  const [stockSuccessMessage, setStockSuccessMessage] = useState<string | null>(null);
  
  // Quick count input behavior: 'prompt_quantity' (ask for quantity) or 'increment_single' (auto +1)
  const [countBehavior, setCountBehavior] = useState<'prompt_quantity' | 'increment_single'>('prompt_quantity');
  
  // Currently Active Scanned Product for immediate Quantity Entry
  const [activeCountBarcode, setActiveCountBarcode] = useState<string>('');
  const [activeCountProduct, setActiveCountProduct] = useState<Product | null>(null);
  const [activeCountQuantity, setActiveCountQuantity] = useState<number | string>(1);
  const [catalogSearchTerm, setCatalogSearchTerm] = useState('');
  const [showCatalogSearch, setShowCatalogSearch] = useState(false);

  // Mode 3: Batch Logs
  const [batchLogs, setBatchLogs] = useState<BatchLogItem[]>([]);

  // Refs
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const countInputRef = useRef<HTMLInputElement>(null);
  const readerElementId = 'alpha-camera-scanner-view';

  // Helper: Find product by Barcode, SKU or ID
  const findProductByCode = (code: string): Product | undefined => {
    const clean = code.trim().toLowerCase();
    return products.find(p => 
      (p.barcode && p.barcode.toLowerCase() === clean) ||
      p.sku.toLowerCase() === clean ||
      p.id.toLowerCase() === clean
    );
  };

  // Enumerate cameras when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    const initCameraList = async () => {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (!isMounted) return;

        if (devices && devices.length > 0) {
          setCameras(devices.map(d => ({ id: d.id, label: d.label || `Kamera ${d.id.substring(0, 4)}` })));
          // Prefer environment / back camera
          const backCam = devices.find(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('arka') || 
            d.label.toLowerCase().includes('environment')
          );
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        } else {
          // Fallback to environment facing mode
          setSelectedCameraId('environment');
        }
      } catch (err) {
        if (!isMounted) return;
        console.warn('Kamera listesi alınamadı, facingMode denenecek:', err);
        setSelectedCameraId('environment');
      }
    };

    initCameraList();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Start / Stop camera scanner lifecycle
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    if (selectedCameraId) {
      startCamera(selectedCameraId);
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, selectedCameraId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Auto-focus quantity input when active count product appears
  useEffect(() => {
    if (activeCountProduct || activeCountBarcode) {
      setTimeout(() => {
        if (countInputRef.current) {
          countInputRef.current.focus();
          countInputRef.current.select();
        }
      }, 80);
    }
  }, [activeCountProduct, activeCountBarcode]);

  const startCamera = async (targetCameraId?: string) => {
    try {
      setCameraError(null);

      // Clean up previous scanner and active media streams
      await stopCamera();

      // Clean element DOM
      const readerEl = document.getElementById(readerElementId);
      if (readerEl) {
        const videos = readerEl.getElementsByTagName('video');
        for (let i = 0; i < videos.length; i++) {
          const v = videos[i];
          if (v.srcObject) {
            try {
              (v.srcObject as MediaStream).getTracks().forEach(t => t.stop());
              v.srcObject = null;
            } catch {
              // ignore
            }
          }
        }
      }

      const html5QrCode = new Html5Qrcode(readerElementId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
          Html5QrcodeSupportedFormats.ITF
        ],
        verbose: false
      });

      scannerRef.current = html5QrCode;

      const qrConfig = {
        fps: 15,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdgePercentage = 0.75;
          const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
          const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
          return {
            width: qrboxSize,
            height: Math.floor(qrboxSize * 0.65)
          };
        },
        aspectRatio: 1.333334,
      };

      const cameraCandidates: any[] = [];
      if (targetCameraId && targetCameraId !== 'environment' && targetCameraId !== 'user') {
        cameraCandidates.push({ deviceId: { exact: targetCameraId } });
      }
      cameraCandidates.push({ facingMode: 'environment' });
      cameraCandidates.push({ facingMode: 'user' });

      let startedSuccessfully = false;
      let lastErrorMessage = '';

      for (const candidate of cameraCandidates) {
        try {
          await html5QrCode.start(
            candidate,
            qrConfig,
            (decodedText, decodedResult) => {
              const formatName = decodedResult?.result?.format?.formatName || 'BARCODE';
              handleBarcodeDecoded(decodedText, formatName);
            },
            () => {
              // frame scanned without barcode
            }
          );
          startedSuccessfully = true;
          setIsScanning(true);
          setCameraError(null);
          break;
        } catch (candidateErr: any) {
          lastErrorMessage = candidateErr?.message || String(candidateErr);
        }
      }

      if (!startedSuccessfully) {
        setIsScanning(false);
        if (lastErrorMessage.includes('NotReadableError') || lastErrorMessage.includes('video source')) {
          setCameraError('Kamera başlatılamadı: Kamera donanımı başka bir uygulama/sekme tarafından kullanılıyor olabilir. Lütfen diğer sekmeleri kapatıp tekrar deneyin.');
        } else if (lastErrorMessage.includes('NotAllowedError') || lastErrorMessage.includes('Permission')) {
          setCameraError('Kamera izni verilmedi. Lütfen adres çubuğundaki kilit simgesinden kamera iznini onaylayın.');
        } else {
          setCameraError(`Kamera başlatılamadı (${lastErrorMessage || 'Bağlantı hatası'}). Manuel arama veya görsel yükleme yapabilirsiniz.`);
        }
      }
    } catch (err: any) {
      console.error('Kamera başlatma hatası:', err);
      setIsScanning(false);
      setCameraError('Kamera başlatılamadı. Cihaz kamerası meşgul veya engellenmiş olabilir.');
    }
  };

  const stopCamera = async () => {
    try {
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    } catch (err) {
      console.warn('Kamera durdurma uyarısı:', err);
    } finally {
      setIsScanning(false);
      setTorchOn(false);
    }
  };

  // Toggle Torch
  const handleToggleTorch = async () => {
    if (!scannerRef.current || !isScanning) return;
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

  // Handle scanned barcode decoded
  const handleBarcodeDecoded = (decodedText: string, formatName: string = 'BARCODE') => {
    if (!decodedText || scanCooldown) return;

    // Trigger audio beep
    if (soundEnabled) {
      playScanBeep(true);
    }

    // Trigger green flash feedback & haptic vibration
    setScanSuccessFlash(true);
    setTimeout(() => setScanSuccessFlash(false), 260);
    triggerHapticFeedback();

    // Cooldown
    const cooldownDuration = activeMode === 'inventory_count' && countBehavior === 'prompt_quantity' ? 1200 : 700;
    setScanCooldown(true);
    setTimeout(() => setScanCooldown(false), cooldownDuration);

    const code = decodedText.trim();
    setLastScannedCode(code);
    setLastScannedFormat(formatName);

    const found = findProductByCode(code);
    setMatchedProduct(found || null);

    // Trigger Scanned Product HUD Toast
    setScannedToastProduct({
      name: found ? found.name : 'Tanımsız Barkod / Yeni Ürün',
      barcode: code,
      sku: found?.sku || '-',
      stock: found?.stock,
      price: found?.price,
    });
    setTimeout(() => setScannedToastProduct(null), 3800);

    // Save into localStorage recent scans
    try {
      const existingScans = JSON.parse(localStorage.getItem('app_recent_scans') || '[]');
      const updatedScans = [
        { barcode: code, name: found?.name || 'Yeni Barkod', timestamp: new Date().toISOString() },
        ...existingScans.filter((s: any) => s.barcode !== code)
      ].slice(0, 15);
      localStorage.setItem('app_recent_scans', JSON.stringify(updatedScans));
    } catch {
      // ignore
    }

    // Callback if provided (e.g. WMS or POS)
    if (onScannedProduct) {
      onScannedProduct(found || { id: code, name: code, sku: code, barcode: code } as any, code);
    }

    // MODE 1: Lookup
    if (activeMode === 'lookup') {
      if (found) {
        confetti({ particleCount: 25, spread: 45, origin: { y: 0.6 } });
      }
    }

    // MODE 2: Inventory Count
    if (activeMode === 'inventory_count') {
      if (countBehavior === 'prompt_quantity') {
        // Show immediate quantity entry prompt for this product
        setActiveCountBarcode(code);
        setActiveCountProduct(found || null);
        const existing = countedItems[code];
        // If already counted, prefill existing count; otherwise default to 1
        setActiveCountQuantity(existing ? existing.count : 1);
      } else {
        // Increment single automatically (+1)
        setCountedItems(prev => {
          const existing = prev[code];
          const newCount = existing ? existing.count + 1 : 1;
          return {
            ...prev,
            [code]: {
              barcode: code,
              product: found,
              count: newCount,
              lastScannedAt: new Date(),
            }
          };
        });
      }
    }

    // MODE 3: Batch Log
    if (activeMode === 'batch_log') {
      const logEntry: BatchLogItem = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        barcode: code,
        formatName,
        timestamp: new Date(),
        matchedProduct: found,
      };
      setBatchLogs(prev => [logEntry, ...prev]);
    }
  };

  // Save active count quantity into the count sheet
  const handleSaveActiveCount = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeCountBarcode) return;

    const parsedCount = typeof activeCountQuantity === 'string' ? parseInt(activeCountQuantity, 10) : activeCountQuantity;
    const finalCount = isNaN(parsedCount) || parsedCount < 0 ? 0 : parsedCount;

    setCountedItems(prev => ({
      ...prev,
      [activeCountBarcode]: {
        barcode: activeCountBarcode,
        product: activeCountProduct || undefined,
        count: finalCount,
        lastScannedAt: new Date(),
      }
    }));

    if (soundEnabled) {
      playScanBeep(true);
    }
    
    confetti({ particleCount: 20, spread: 40, origin: { y: 0.7 } });

    // Close or clear active product prompt
    setActiveCountBarcode('');
    setActiveCountProduct(null);
  };

  // Manual code input search
  const handleManualSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!manualCodeInput.trim()) return;
    handleBarcodeDecoded(manualCodeInput.trim(), 'MANUAL');
    setManualCodeInput('');
  };

  // Pick product directly from catalog for counting
  const handlePickCatalogProduct = (p: Product) => {
    const code = p.barcode || p.sku || p.id;
    handleBarcodeDecoded(code, 'CATALOG_SELECT');
    setShowCatalogSearch(false);
    setCatalogSearchTerm('');
  };

  // Scan from Image file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let tempScanner = scannerRef.current;
      if (!tempScanner) {
        tempScanner = new Html5Qrcode(readerElementId);
      }
      const decodedResult = await tempScanner.scanFile(file, true);
      handleBarcodeDecoded(decodedResult, 'IMAGE_FILE');
    } catch (err) {
      alert('Yüklenen fotoğrafta okunabilir bir barkod veya QR kod bulunamadı.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Quick Stock Adjustment for matched product in Lookup mode
  const handleAdjustStock = async (product: Product, delta: number) => {
    setStockUpdating(true);
    try {
      const newStock = Math.max(0, product.stock + delta);
      // Firestore'a yaz. Eskiden olu /api/products/:id cagriliyordu; res.ok true
      // donuyor, beep caliyor ve ekranda yeni stok gosteriliyordu ama modal
      // kapaninca eski degere donuyordu. (19.09.2026)
      await saveProductToFirestore({ ...product, stock: newStock });

      if (soundEnabled) playScanBeep(true);
      setMatchedProduct({ ...product, stock: newStock });
      if (onProductUpdated) onProductUpdated();
    } catch (e) {
      console.error('Stok güncellenemedi:', e);
      if (soundEnabled) playScanBeep(false);
    } finally {
      setStockUpdating(false);
    }
  };

  // Apply all counted items to products in bulk
  const handleApplyCountedStock = async () => {
    const allCountedList = Object.values(countedItems) as ScannedCountItem[];
    const itemsToUpdate = allCountedList.filter(item => Boolean(item.product));
    if (itemsToUpdate.length === 0) {
      alert('Sayım listesinde eşleşen bir ürün bulunmuyor.');
      return;
    }

    if (!confirm(`Sayımı tamamlanan ${itemsToUpdate.length} ürünün yeni stok miktarları sisteme işlenecektir. Onaylıyor musunuz?`)) {
      return;
    }

    setIsApplyingStockCounts(true);
    try {
      const updates = itemsToUpdate.map(item => ({
        id: item.product!.id,
        stock: item.count,
      }));

      await bulkUpdateProductsInFirestore(updates);

      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
      setStockSuccessMessage(`${itemsToUpdate.length} ürünün sayım sonucu stoklara başarıyla uygulandı!`);
      if (onProductUpdated) onProductUpdated();
      setTimeout(() => setStockSuccessMessage(null), 4000);
    } catch (e) {
      console.error(e);
      alert('Stoklar güncellenirken hata oluştu.');
    } finally {
      setIsApplyingStockCounts(false);
    }
  };

  // Copy last scanned code
  const handleCopyCode = async (text: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // Export inventory count as CSV
  const handleExportCountSheetCSV = () => {
    const list = Object.values(countedItems) as ScannedCountItem[];
    if (list.length === 0) return;

    const headers = ['Barkod / Kod', 'Ürün Adı', 'SKU', 'Kategori', 'Sistemdeki Stok', 'Sayılan Miktar', 'Fark (Varyans)', 'Durum'];
    const rows = list.map(item => {
      const systemStock = item.product?.stock ?? 0;
      const diff = item.count - systemStock;
      const status = diff === 0 ? 'EŞİT' : diff < 0 ? `EKSİK (${diff})` : `FAZLA (+${diff})`;
      return [
        `"${item.barcode}"`,
        `"${(item.product?.name || 'Tanımsız Barkod').replace(/"/g, '""')}"`,
        item.product?.sku || '-',
        `"${item.product?.category || '-'}"`,
        systemStock.toString(),
        item.count.toString(),
        diff.toString(),
        status
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ALPHA_Stok_Sayim_Raporu_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export batch logs as CSV
  const handleExportLogsCSV = () => {
    if (batchLogs.length === 0) return;
    const headers = ['Zaman', 'Barkod / Kod', 'Format', 'Ürün Adı', 'SKU', 'Mevcut Stok', 'Birim Fiyat'];
    const rows = batchLogs.map(l => [
      l.timestamp.toLocaleTimeString('tr-TR'),
      `"${l.barcode}"`,
      l.formatName,
      `"${(l.matchedProduct?.name || 'Tanımsız Ürün').replace(/"/g, '""')}"`,
      l.matchedProduct?.sku || '-',
      l.matchedProduct?.stock?.toString() || '-',
      l.matchedProduct?.price ? `${l.matchedProduct.price} TL` : '-',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Barkod_Kamera_Tarama_Raporu_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate summary metrics for counted items
  const countedList = Object.values(countedItems) as ScannedCountItem[];
  const totalCountedKinds = countedList.length;
  const totalCountedQuantity = countedList.reduce((sum, it) => sum + it.count, 0);
  const totalSystemQuantity = countedList.reduce((sum, it) => sum + (it.product?.stock ?? 0), 0);
  const netVariance = totalCountedQuantity - totalSystemQuantity;

  // Filter catalog products for fast search
  const filteredCatalog = catalogSearchTerm.trim()
    ? products.filter(p => 
        p.name.toLowerCase().includes(catalogSearchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(catalogSearchTerm.toLowerCase()) ||
        (p.barcode && p.barcode.toLowerCase().includes(catalogSearchTerm.toLowerCase()))
      ).slice(0, 10)
    : [];

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[70] overflow-y-auto bg-black/85 backdrop-blur-md p-2 sm:p-4 md:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div className="min-h-full flex items-center justify-center py-2 sm:py-4">
        <div 
          className="relative bg-base-surface border border-border rounded-3xl w-full max-w-6xl max-h-[96vh] flex flex-col shadow-2xl overflow-hidden text-text-primary scanner-modal-expand-animation"
          onClick={(e) => e.stopPropagation()}
          style={{
            transformOrigin: originRect ? `${originRect.left + originRect.width / 2}px ${originRect.top + originRect.height / 2}px` : 'bottom right'
          }}
        >
        
        {/* MODAL HEADER */}
        <div className="px-5 py-3.5 bg-base-surface-2 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div 
              className="w-10 h-10 rounded-2xl text-white flex items-center justify-center shadow-xs"
              style={{ background: 'linear-gradient(145deg, #38933D 0%, #2D7B31 52%, #226126 100%)' }}
            >
              <BarcodeViewfinderIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-text-primary">
                  Barkod & QR Okuyucu ile Hızlı Depo Sayımı
                </h2>
                <span 
                  className="px-2 py-0.5 rounded-md text-[10px] font-extrabold text-white"
                  style={{ backgroundColor: '#2D7B31' }}
                >
                  Canlı Lazer Sayım
                </span>
              </div>
              <p className="text-xs text-text-secondary">
                ALPHA TEKNİK 1.198 ürün kataloğunda anında barkod okutun, adet girin ve stok farklarını görüntüleyin.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-base-surface transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TOP MODE SWITCHER TABS */}
        <div className="px-5 py-2.5 bg-base-surface border-b border-border flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="inline-flex p-1 bg-base-surface-2 border border-border rounded-2xl">
            <button
              onClick={() => setActiveMode('inventory_count')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeMode === 'inventory_count'
                  ? 'bg-[#2D7B31] text-white shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>1. Hızlı Depo / Raf Sayım Masası</span>
              {totalCountedKinds > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-warning-fill text-black text-[10px] font-mono font-bold">
                  {totalCountedKinds}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveMode('lookup')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeMode === 'lookup'
                  ? 'bg-[#2D7B31] text-white shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>2. Tekil Ürün Sorgula & Stok Düzenle</span>
            </button>

            <button
              onClick={() => setActiveMode('batch_log')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeMode === 'batch_log'
                  ? 'bg-[#2D7B31] text-white shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <BarcodeIcon className="w-3.5 h-3.5" />
              <span>3. Seri Okuma Listesi</span>
              {batchLogs.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-info-fill text-white text-[10px] font-mono font-bold">
                  {batchLogs.length}
                </span>
              )}
            </button>
          </div>

          {/* Quick Audio & File Upload Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                soundEnabled
                  ? 'bg-base-surface text-text-primary border-border hover:bg-base-surface-2'
                  : 'bg-danger-fill/15 text-danger-text border-danger-border'
              }`}
              title={soundEnabled ? 'Okuma Sesini Kapat' : 'Okuma Sesini Aç'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-success-text" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Upload image to scan */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl bg-base-surface hover:bg-base-surface-2 border border-border text-xs font-bold text-text-primary flex items-center space-x-1.5 transition-colors cursor-pointer"
              title="Fotoğraftan / Barkod Resminden Tara"
            >
              <Upload className="w-3.5 h-3.5 text-text-muted" />
              <span className="hidden sm:inline">Görsel Yükle</span>
            </button>
          </div>
        </div>

        {/* MAIN BODY: 2 COLUMNS (CAMERA STREAM & RESULTS PANEL) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* LEFT: CAMERA VIEWFINDER & INPUTS (5 Cols) */}
          <div className="lg:col-span-5 space-y-3 flex flex-col">
            
            {/* Viewfinder Container */}
            <div className="relative w-full rounded-2xl overflow-hidden bg-black aspect-4/3 flex items-center justify-center border-2 border-neutral-800 shadow-inner group">
              
              {/* HTML5 QRCODE MOUNT TARGET */}
              <div id={readerElementId} className="w-full h-full object-cover"></div>

              {/* OVERLAY SCANNER HUD GUIDE */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                
                {/* Target Frame Box with Glowing Corners */}
                <div className="relative w-56 sm:w-64 h-36 sm:h-44 border border-white/30 rounded-2xl flex items-center justify-center">
                  
                  {/* Animated Laser Beam */}
                  {isScanning && (
                    <div className="absolute left-2 right-2 h-0.5 bg-[#2D7B31] shadow-[0_0_14px_#34D399] animate-pulse"></div>
                  )}

                  {/* Corner Crosshairs with Alpha Green */}
                  <div className="absolute top-0 left-0 w-5 h-5 border-t-3 border-l-3 border-[#4ADE80] rounded-tl-lg"></div>
                  <div className="absolute top-0 right-0 w-5 h-5 border-t-3 border-r-3 border-[#4ADE80] rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-5 h-5 border-b-3 border-l-3 border-[#4ADE80] rounded-bl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-5 h-5 border-b-3 border-r-3 border-[#4ADE80] rounded-br-lg"></div>

                  {/* Center Crosshair icon */}
                  <div className="w-2 h-2 rounded-full bg-[#4ADE80]/90"></div>
                </div>

                <p className="mt-3 text-[11px] text-white/90 font-medium bg-black/70 px-3 py-1 rounded-full backdrop-blur-xs shadow-xs">
                  Barkodu veya QR Kodu çerçeveye hizalayın
                </p>
              </div>

              {/* SUCCESS GREEN FLASH OVERLAY */}
              {scanSuccessFlash && (
                <div
                  aria-hidden="true"
                  className="absolute inset-0 z-30 pointer-events-none bg-emerald-500/45 border-4 border-emerald-400 rounded-2xl animate-scan-flash"
                />
              )}

              {/* SCANNED PRODUCT HUD TOAST OVERLAY */}
              {scannedToastProduct && (
                <div
                  role="status"
                  className="absolute top-3 left-3 right-3 z-30 p-2.5 rounded-2xl bg-neutral-900/95 text-white border border-[#2D7B31] shadow-2xl backdrop-blur-md flex items-center justify-between gap-2 animate-in slide-in-from-top-3 duration-200"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-xl bg-[#2D7B31] text-white flex items-center justify-center shrink-0 shadow-md">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-emerald-300 truncate">
                        {scannedToastProduct.name}
                      </p>
                      <p className="text-[10px] text-neutral-300 font-mono">
                        Barkod: {scannedToastProduct.barcode} {scannedToastProduct.sku !== '-' ? `• SKU: ${scannedToastProduct.sku}` : ''}
                        {scannedToastProduct.stock !== undefined ? ` • Stok: ${scannedToastProduct.stock} ADET` : ''}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 font-bold border border-emerald-600/50 shrink-0">
                    Başarılı
                  </span>
                </div>
              )}

              {/* CAMERA ERROR BANNER & FRIENDLY PERMISSION GUIDE */}
              {cameraError && (
                <div className="absolute inset-0 bg-neutral-950/95 p-4 sm:p-5 flex flex-col items-center justify-center text-center space-y-2.5 z-20 overflow-y-auto">
                  <div className="w-11 h-11 rounded-2xl bg-warning-fill/20 border border-warning-border flex items-center justify-center text-warning-text shadow-sm">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Kamera İzni Gerekli
                    </h3>
                    <p className="text-xs text-neutral-300 font-normal max-w-sm leading-relaxed px-2 mt-1">
                      {cameraError}
                    </p>
                  </div>

                  {/* Step-by-Step Permission Helper */}
                  <div className="w-full max-w-sm bg-neutral-900/90 border border-neutral-800 rounded-xl p-2.5 text-left text-[11px] text-neutral-300 space-y-1">
                    <div className="font-bold text-emerald-400 flex items-center space-x-1">
                      <Info className="w-3.5 h-3.5" />
                      <span>İzni Nasıl Açarsınız?</span>
                    </div>
                    <ol className="list-decimal list-inside space-y-0.5 text-[10.5px] text-neutral-300 leading-snug">
                      <li>Tarayıcının adres çubuğundaki kilit 🔒 veya site ayarları simgesine tıklayın.</li>
                      <li>Kamera seçeneğini <strong className="text-white">"İzin Ver"</strong> konumuna getirin.</li>
                      <li>Aşağıdaki <strong className="text-white">"Kamerayı Yeniden Başlat"</strong> butonuna dokunun.</li>
                    </ol>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <button
                      onClick={() => startCamera(selectedCameraId || 'environment')}
                      className="px-3.5 py-2 rounded-xl text-white text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-sm hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: '#2D7B31' }}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Kamerayı Yeniden Başlat</span>
                    </button>

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold flex items-center space-x-1.5 border border-neutral-700 cursor-pointer transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5 text-text-muted" />
                      <span>Fotoğraf Yükle</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* CAMERA CONTROLS BAR */}
            <div className="p-3 rounded-2xl bg-base-surface-2 border border-border flex items-center justify-between gap-2">
              
              {/* Camera Switcher Dropdown */}
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <SwitchCamera className="w-4 h-4 text-text-muted shrink-0" />
                <select
                  value={selectedCameraId}
                  onChange={e => setSelectedCameraId(e.target.value)}
                  className="w-full bg-base-surface border border-border rounded-xl px-2.5 py-1 text-xs text-text-primary font-medium truncate"
                >
                  <option value="environment">Arka Kamera (Varsayılan)</option>
                  <option value="user">Ön / Selfie Kamera</option>
                  {cameras.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Torch Button */}
              <button
                onClick={handleToggleTorch}
                disabled={!isScanning}
                className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  torchOn
                    ? 'bg-warning-fill text-black border-warning-border shadow-xs'
                    : 'bg-base-surface text-text-secondary border-border hover:text-text-primary'
                }`}
                title="Kamera Flaşı / Feneri Aç-Kapa"
              >
                {torchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
              </button>

              {/* Start / Stop Scanner */}
              <button
                onClick={() => {
                  if (isScanning) stopCamera();
                  else startCamera(selectedCameraId || 'environment');
                }}
                className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  isScanning
                    ? 'bg-danger-fill/15 text-danger-text border-danger-border'
                    : 'bg-success-fill/15 text-success-text border-success-border'
                }`}
                title={isScanning ? 'Kamerayı Durdur' : 'Kamerayı Başlat'}
              >
                {isScanning ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
            </div>

            {/* MANUAL CODE ENTRY FORM */}
            <form onSubmit={handleManualSubmit} className="flex items-center space-x-2">
              <div className="relative flex-1">
                <BarcodeIcon className="w-3.5 h-3.5 text-text-muted absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={manualCodeInput}
                  onChange={e => setManualCodeInput(e.target.value)}
                  placeholder="Barkod no veya SKU yazıp Enter'a basın..."
                  className="w-full pl-9 pr-3 py-1.5 bg-base-surface border border-border rounded-xl text-xs text-text-primary placeholder:text-text-muted focus:border-info-border"
                />
              </div>
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-info-fill hover:opacity-90 text-base text-xs font-bold rounded-xl transition-opacity cursor-pointer shrink-0"
              >
                Sorgula
              </button>
            </form>

            {/* DIRECT PRODUCT SEARCH FROM 1.198 PRODUCTS (If barcode missing/damaged) */}
            <div className="p-3 rounded-2xl bg-base-surface-2/70 border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-text-secondary flex items-center space-x-1.5">
                  <Search className="w-3.5 h-3.5 text-info-text" />
                  <span>Katalogdan Ürün Arayıp Sayıma Ekle</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowCatalogSearch(!showCatalogSearch)}
                  className="text-[10px] text-info-text hover:underline font-bold"
                >
                  {showCatalogSearch ? 'Gizle' : 'Listeden Seç'}
                </button>
              </div>

              {showCatalogSearch && (
                <div className="space-y-2 pt-1">
                  <input
                    type="text"
                    value={catalogSearchTerm}
                    onChange={e => setCatalogSearchTerm(e.target.value)}
                    placeholder="Ürün adı, boru, vana, fittings ara..."
                    className="w-full px-3 py-1.5 bg-base-surface border border-border rounded-xl text-xs text-text-primary focus:border-info-border"
                  />
                  {filteredCatalog.length > 0 && (
                    <div className="max-h-44 overflow-y-auto space-y-1 bg-base-surface border border-border rounded-xl p-1.5">
                      {filteredCatalog.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handlePickCatalogProduct(p)}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-base-surface-2 flex items-center justify-between text-xs transition-colors cursor-pointer"
                        >
                          <div className="truncate pr-2">
                            <p className="font-bold text-text-primary text-[11px] truncate">{p.name}</p>
                            <p className="text-[10px] text-text-muted font-mono">{p.sku} • {p.barcode || 'Barkodsuz'}</p>
                          </div>
                          <span className="text-[10px] font-mono font-bold bg-base-surface-2 px-1.5 py-0.5 rounded text-text-secondary shrink-0">
                            Stok: {p.stock} {p.unit}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* RIGHT: RESULTS / COUNT MANAGEMENT PANEL (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* MODE 1: INVENTORY COUNT (HIZLI DEPO / RAF SAYIM MASASI) */}
            {activeMode === 'inventory_count' && (
              <div className="space-y-4">

                {/* 1. TOP SUMMARY CARDS (YANYANA ANLAŞILIR ÖZET KARTLARI) */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="p-3 rounded-2xl bg-base-surface-2 border border-border flex flex-col justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                      Sayılan Çeşit
                    </span>
                    <div className="flex items-baseline space-x-1 mt-1">
                      <span className="text-xl font-black font-mono text-text-primary">
                        {totalCountedKinds}
                      </span>
                      <span className="text-[10px] text-text-muted">kalem</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-base-surface-2 border border-border flex flex-col justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                      Toplam Sayılan
                    </span>
                    <div className="flex items-baseline space-x-1 mt-1">
                      <span className="text-xl font-black font-mono text-info-text">
                        {totalCountedQuantity}
                      </span>
                      <span className="text-[10px] text-text-muted">adet</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-base-surface-2 border border-border flex flex-col justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                      Net Stok Farkı
                    </span>
                    <div className="flex items-baseline space-x-1 mt-1">
                      <span className={`text-xl font-black font-mono ${
                        netVariance === 0 ? 'text-success-text' : netVariance < 0 ? 'text-danger-text' : 'text-warning-text'
                      }`}>
                        {netVariance > 0 ? `+${netVariance}` : netVariance}
                      </span>
                      <span className="text-[10px] text-text-muted">
                        {netVariance === 0 ? 'Uyumlu' : netVariance < 0 ? 'Eksik' : 'Fazla'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. PROMPT / DIRECT QUANTITY ENTRY BOX FOR CURRENTLY SCANNED PRODUCT */}
                {(activeCountProduct || activeCountBarcode) && (
                  <form 
                    onSubmit={handleSaveActiveCount}
                    className="p-4 rounded-3xl bg-base-surface border-2 border-info-border shadow-lg space-y-3 animate-in zoom-in-95 duration-150"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 rounded-md bg-info-fill/15 text-info-text text-[10px] font-bold uppercase tracking-wider">
                            Aktif Sayılan Ürün
                          </span>
                          <span className="font-mono text-xs font-bold text-text-muted">
                            Barkod: {activeCountBarcode}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-text-primary mt-1">
                          {activeCountProduct ? activeCountProduct.name : 'Stokta Tanımsız Barkod'}
                        </h4>
                        {activeCountProduct && (
                          <p className="text-[11px] text-text-secondary">
                            Mevcut Sistem Stoğu: <strong className="font-mono text-text-primary">{activeCountProduct.stock} {activeCountProduct.unit}</strong> ({activeCountProduct.category})
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveCountBarcode('');
                          setActiveCountProduct(null);
                        }}
                        className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-base-surface-2 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Numeric Input & Quick Presets */}
                    <div className="pt-2 border-t border-border space-y-2">
                      <label className="block text-xs font-bold text-text-primary">
                        Sayılan Miktarı Girin (Adet / Koli):
                      </label>

                      <div className="flex items-center space-x-2">
                        <div className="relative flex-1">
                          <input
                            ref={countInputRef}
                            type="number"
                            min="0"
                            step="1"
                            value={activeCountQuantity}
                            onChange={e => setActiveCountQuantity(e.target.value)}
                            className="w-full px-4 py-2.5 bg-base-surface-2 border-2 border-info-border rounded-xl text-lg font-black font-mono text-text-primary focus:bg-base-surface"
                            placeholder="Örn: 50"
                          />
                          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-text-muted">
                            {activeCountProduct?.unit || 'Adet'}
                          </span>
                        </div>

                        <button
                          type="submit"
                          className="px-5 py-2.5 bg-info-fill hover:opacity-90 text-base text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-md cursor-pointer transition-opacity shrink-0"
                        >
                          <Check className="w-4 h-4" />
                          <span>Sayımı Onayla & Listeye Ekle</span>
                        </button>
                      </div>

                      {/* Quick preset chips */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] text-text-muted font-bold mr-1">Hızlı Adet:</span>
                        {[1, 5, 10, 20, 50, 100].map(val => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => {
                              const cur = parseInt(String(activeCountQuantity), 10) || 0;
                              setActiveCountQuantity(cur + val);
                            }}
                            className="px-2 py-1 rounded-lg bg-base-surface-2 hover:bg-base-surface border border-border text-[11px] font-mono font-bold text-text-primary cursor-pointer transition-colors"
                          >
                            +{val}
                          </button>
                        ))}
                        {activeCountProduct && (
                          <button
                            type="button"
                            onClick={() => setActiveCountQuantity(activeCountProduct.stock)}
                            className="px-2.5 py-1 rounded-lg bg-base-surface-2 hover:bg-base-surface border border-border text-[11px] font-bold text-text-secondary cursor-pointer"
                            title="Sistemdeki mevcut stok kadar yaz"
                          >
                            Mevcut Stok ({activeCountProduct.stock})
                          </button>
                        )}
                      </div>
                    </div>
                  </form>
                )}

                {/* 3. MODE CONTROLS & BEHAVIOR TOGGLE */}
                <div className="p-3 rounded-2xl bg-base-surface-2 border border-border flex flex-wrap items-center justify-between gap-2">
                  
                  {/* Scan Behavior: Prompt Quantity vs Auto +1 */}
                  <div className="flex items-center space-x-1 bg-base-surface border border-border rounded-xl p-1">
                    <button
                      type="button"
                      onClick={() => setCountBehavior('prompt_quantity')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        countBehavior === 'prompt_quantity'
                          ? 'bg-info-fill text-base shadow-xs'
                          : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      ⚡ Miktar Sor (Önerilen)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCountBehavior('increment_single')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        countBehavior === 'increment_single'
                          ? 'bg-info-fill text-base shadow-xs'
                          : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      ➕ Seri +1 Modu
                    </button>
                  </div>

                  {/* Actions: Export CSV, Reset, Apply */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleExportCountSheetCSV}
                      disabled={totalCountedKinds === 0}
                      className="px-3 py-1.5 rounded-xl bg-base-surface hover:bg-base-surface-2 border border-border text-xs font-bold text-text-primary disabled:opacity-40 transition-colors cursor-pointer flex items-center space-x-1.5"
                      title="Sayım tablosunu Excel / CSV olarak indir"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-success-text" />
                      <span className="hidden sm:inline">CSV İndir</span>
                    </button>

                    <button
                      onClick={() => {
                        if (confirm('Sayım çetelesini sıfırlamak istediğinize emin misiniz?')) {
                          setCountedItems({});
                        }
                      }}
                      disabled={totalCountedKinds === 0}
                      className="px-2.5 py-1.5 rounded-xl bg-base-surface hover:bg-base-surface-2 border border-border text-xs font-bold text-text-secondary hover:text-danger-text disabled:opacity-40 transition-colors cursor-pointer"
                      title="Listeyi Temizle"
                    >
                      Sıfırla
                    </button>

                    <button
                      onClick={handleApplyCountedStock}
                      disabled={isApplyingStockCounts || totalCountedKinds === 0}
                      className="px-4 py-1.5 rounded-xl bg-success-fill hover:opacity-90 text-base text-xs font-bold flex items-center space-x-1.5 transition-opacity disabled:opacity-50 cursor-pointer shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isApplyingStockCounts ? 'İşleniyor...' : 'Sayımı Stoklara Uygula'}</span>
                    </button>
                  </div>
                </div>

                {stockSuccessMessage && (
                  <div className="p-3 rounded-xl bg-success-fill/15 text-success-text border border-success-border text-xs font-bold flex items-center space-x-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{stockSuccessMessage}</span>
                  </div>
                )}

                {/* 4. SIDE-BY-SIDE COUNT TABLE (YANYANA NET VE ANLAŞILIR SAYIM TABLOSU) */}
                <div className="border border-border rounded-2xl overflow-hidden bg-base-surface shadow-xs">
                  <div className="max-h-[380px] overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="sticky top-0 z-10 bg-base-surface-2 shadow-xs">
                        <tr className="border-b border-border text-[10px] uppercase font-bold text-text-secondary tracking-wider">
                          <th className="py-2.5 px-3">Ürün Bilgisi & Barkod</th>
                          <th className="py-2.5 px-3 text-center whitespace-nowrap">Sistem Stoğu</th>
                          <th className="py-2.5 px-3 text-center whitespace-nowrap">Sayılan Miktar</th>
                          <th className="py-2.5 px-3 text-center whitespace-nowrap">Stok Farkı (Varyans)</th>
                          <th className="py-2.5 px-3 text-right">İşlem</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border font-sans">
                        {countedList.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-text-muted space-y-2">
                              <Layers className="w-8 h-8 text-text-muted/40 mx-auto" />
                              <p className="font-bold text-xs text-text-secondary">Henüz sayım çetelesine ürün eklenmedi</p>
                              <p className="text-[11px] text-text-muted max-w-sm mx-auto">
                                Barkodları kameraya tutarak veya yukarıdaki manuel arama/katalogdan ürün seçerek hızlı sayım yapabilirsiniz.
                              </p>
                            </td>
                          </tr>
                        ) : (
                          countedList.map(item => {
                            const sysStock = item.product?.stock ?? 0;
                            const diff = item.count - sysStock;
                            return (
                              <tr key={item.barcode} className="hover:bg-base-surface-2/50 transition-colors">
                                
                                {/* Product info */}
                                <td className="py-2.5 px-3">
                                  {item.product ? (
                                    <div>
                                      <p className="font-bold text-text-primary text-xs">{item.product.name}</p>
                                      <div className="flex items-center space-x-2 text-[10px] text-text-muted mt-0.5">
                                        <span className="font-mono font-bold text-text-secondary">{item.barcode}</span>
                                        <span>•</span>
                                        <span>{item.product.sku}</span>
                                        <span>•</span>
                                        <span>{item.product.category}</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div>
                                      <span className="text-warning-text font-bold text-xs">Tanımsız Barkod</span>
                                      <p className="font-mono text-[10px] text-text-muted">{item.barcode}</p>
                                    </div>
                                  )}
                                </td>

                                {/* Current System Stock */}
                                <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                  <span className="font-mono font-bold text-text-secondary text-xs">
                                    {item.product ? `${sysStock} ${item.product.unit}` : '-'}
                                  </span>
                                </td>

                                {/* Editable Counted Quantity */}
                                <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                  <div className="inline-flex items-center space-x-1">
                                    <input
                                      type="number"
                                      min="0"
                                      value={item.count}
                                      onChange={e => {
                                        const val = parseInt(e.target.value, 10);
                                        const newCount = isNaN(val) || val < 0 ? 0 : val;
                                        setCountedItems(prev => ({
                                          ...prev,
                                          [item.barcode]: { ...prev[item.barcode], count: newCount }
                                        }));
                                      }}
                                      className="w-18 px-2 py-1 bg-base-surface-2 border border-border rounded-lg text-center font-mono font-black text-xs text-text-primary focus:bg-base-surface focus:border-info-border"
                                    />
                                    <span className="text-[10px] text-text-muted font-bold">
                                      {item.product?.unit || 'Adet'}
                                    </span>
                                  </div>
                                </td>

                                {/* Stock Variance / Difference Status */}
                                <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                  {diff === 0 ? (
                                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-success-fill/15 text-success-text border border-success-border font-mono font-bold text-[11px]">
                                      <Check className="w-3 h-3" />
                                      <span>0 (Tam Eşit)</span>
                                    </span>
                                  ) : diff < 0 ? (
                                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-danger-fill/15 text-danger-text border border-danger-border font-mono font-bold text-[11px]">
                                      <TrendingDown className="w-3 h-3" />
                                      <span>{diff} Adet Eksik</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-warning-fill/15 text-warning-text border border-warning-border font-mono font-bold text-[11px]">
                                      <TrendingUp className="w-3 h-3" />
                                      <span>+{diff} Adet Fazla</span>
                                    </span>
                                  )}
                                </td>

                                {/* Row quick actions */}
                                <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                  <div className="flex items-center justify-end space-x-1">
                                    <button
                                      onClick={() => {
                                        setCountedItems(prev => {
                                          const cur = prev[item.barcode];
                                          if (!cur || cur.count <= 1) {
                                            const copy = { ...prev };
                                            delete copy[item.barcode];
                                            return copy;
                                          }
                                          return {
                                            ...prev,
                                            [item.barcode]: { ...cur, count: cur.count - 1 }
                                          };
                                        });
                                      }}
                                      className="p-1 rounded-lg bg-base-surface-2 hover:bg-base-surface text-text-secondary hover:text-text-primary border border-border"
                                      title="1 Azalt"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>

                                    <button
                                      onClick={() => {
                                        setCountedItems(prev => {
                                          const cur = prev[item.barcode];
                                          return {
                                            ...prev,
                                            [item.barcode]: { ...cur, count: cur.count + 1 }
                                          };
                                        });
                                      }}
                                      className="p-1 rounded-lg bg-base-surface-2 hover:bg-base-surface text-text-secondary hover:text-text-primary border border-border"
                                      title="1 Artır"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>

                                    <button
                                      onClick={() => {
                                        setCountedItems(prev => {
                                          const copy = { ...prev };
                                          delete copy[item.barcode];
                                          return copy;
                                        });
                                      }}
                                      className="p-1 rounded-lg bg-base-surface-2 hover:bg-danger-fill/15 text-text-muted hover:text-danger-text border border-border ml-1"
                                      title="Listeden Kaldır"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
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

              </div>
            )}

            {/* MODE 2: PRODUCT LOOKUP & FAST STOCK ADJUST */}
            {activeMode === 'lookup' && (
              <div className="space-y-4">
                
                {/* Last Scanned Code Banner */}
                <div className="p-3.5 rounded-2xl bg-base-surface-2 border border-border flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2 min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                      Son Okunan Barkod:
                    </span>
                    <span className="font-mono font-black text-sm text-text-primary truncate">
                      {lastScannedCode || 'Henüz tarama yapılmadı'}
                    </span>
                    {lastScannedFormat && (
                      <span className="px-1.5 py-0.5 rounded bg-info-fill/15 text-info-text text-[9px] font-mono font-bold">
                        {lastScannedFormat}
                      </span>
                    )}
                  </div>

                  {lastScannedCode && (
                    <button
                      onClick={() => handleCopyCode(lastScannedCode)}
                      className="p-1.5 rounded-lg bg-base-surface hover:bg-base-surface-2 border border-border text-text-secondary hover:text-text-primary text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1 shrink-0"
                      title="Kodu Kopyala"
                    >
                      {copiedCode ? <Check className="w-3 h-3 text-success-text" /> : <Copy className="w-3 h-3" />}
                      <span className="text-[10px]">{copiedCode ? 'Kopyalandı' : 'Kopyala'}</span>
                    </button>
                  )}
                </div>

                {/* MATCHED PRODUCT CARD OR UNRECOGNIZED ALERT */}
                {matchedProduct ? (
                  <div className="p-4 sm:p-5 rounded-3xl bg-base-surface border-2 border-success-border shadow-md space-y-4 animate-in fade-in">
                    
                    {/* Header: Name, SKU, Category, Price */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 rounded-md bg-success-fill/15 text-success-text text-[10px] font-bold">
                            Ürün Eşleşti
                          </span>
                          <span className="font-mono text-xs text-text-secondary font-bold">
                            SKU: {matchedProduct.sku}
                          </span>
                        </div>
                        <h3 className="text-base font-extrabold text-text-primary">
                          {matchedProduct.name}
                        </h3>
                        <p className="text-xs text-text-secondary">
                          {matchedProduct.category} • KDV: %{matchedProduct.vatRate}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-bold text-text-muted uppercase">Liste Fiyatı</span>
                        <p className="text-lg font-black text-info-text font-mono">
                          {matchedProduct.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
                        </p>
                      </div>
                    </div>

                    {/* Stock status & Adjustment controls */}
                    <div className="p-3.5 rounded-2xl bg-base-surface-2 border border-border flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-text-muted">
                          Mevcut Stok Miktarı
                        </span>
                        <div className="flex items-center space-x-2 mt-0.5">
                          <span className={`text-2xl font-black font-mono ${
                            matchedProduct.stock <= 5 ? 'text-danger-text' : 'text-text-primary'
                          }`}>
                            {matchedProduct.stock} {matchedProduct.unit}
                          </span>
                          {matchedProduct.stock <= 5 && (
                            <span className="px-1.5 py-0.5 rounded bg-danger-fill/15 text-danger-text text-[10px] font-bold">
                              Kritik Stok!
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Fast stock buttons (+1, +5, -1) */}
                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => handleAdjustStock(matchedProduct, -1)}
                          disabled={stockUpdating || matchedProduct.stock <= 0}
                          className="px-2.5 py-2 rounded-xl bg-base-surface hover:bg-base-surface-2 border border-border text-xs font-bold text-text-primary flex items-center space-x-1 disabled:opacity-40 transition-colors cursor-pointer"
                          title="Stoktan 1 Düş"
                        >
                          <Minus className="w-3.5 h-3.5 text-danger-text" />
                          <span>-1</span>
                        </button>
                        <button
                          onClick={() => handleAdjustStock(matchedProduct, 1)}
                          disabled={stockUpdating}
                          className="px-3 py-2 rounded-xl bg-success-fill/15 hover:bg-success-fill/25 border border-success-border text-xs font-bold text-success-text flex items-center space-x-1 disabled:opacity-40 transition-colors cursor-pointer"
                          title="Stoğa 1 Ekle"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+1 Ekle</span>
                        </button>
                        <button
                          onClick={() => handleAdjustStock(matchedProduct, 5)}
                          disabled={stockUpdating}
                          className="px-3 py-2 rounded-xl bg-info-fill/15 hover:bg-info-fill/25 border border-info-border text-xs font-bold text-info-text flex items-center space-x-1 disabled:opacity-40 transition-colors cursor-pointer"
                          title="Stoğa 5 Ekle (Koli/Paket)"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+5 Koli</span>
                        </button>
                      </div>
                    </div>

                    {/* Secondary Actions: Edit Product / Print Label */}
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                      {onOpenBarcodeGenerator && (
                        <button
                          onClick={() => onOpenBarcodeGenerator([matchedProduct.id])}
                          className="px-3 py-2 rounded-xl bg-base-surface hover:bg-base-surface-2 border border-border text-xs font-bold text-text-primary flex items-center space-x-1.5 transition-colors cursor-pointer"
                        >
                          <BarcodeIcon className="w-3.5 h-3.5 text-info-text" />
                          <span>Barkod Etiketi Bas</span>
                        </button>
                      )}

                      {onOpenProductEdit && (
                        <button
                          onClick={() => onOpenProductEdit(matchedProduct)}
                          className="px-3 py-2 rounded-xl bg-info-fill hover:opacity-90 text-base text-xs font-bold flex items-center space-x-1.5 transition-opacity cursor-pointer shadow-xs"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Ürün Kartını Düzenle</span>
                        </button>
                      )}
                    </div>

                  </div>
                ) : lastScannedCode ? (
                  // Unrecognized barcode
                  <div className="p-5 rounded-3xl bg-base-surface border border-border shadow-xs text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-warning-fill/15 text-warning-text border border-warning-border flex items-center justify-center mx-auto">
                      <BarcodeIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-text-primary">
                        Ürün Stok Veritabanında Bulunamadı
                      </h4>
                      <p className="text-xs text-text-secondary mt-1">
                        Okunan <strong className="font-mono text-text-primary">{lastScannedCode}</strong> barkoduna sahip kayıtlı bir ürün bulunamadı.
                      </p>
                    </div>

                    {onOpenCreateWithBarcode && (
                      <button
                        onClick={() => onOpenCreateWithBarcode(lastScannedCode)}
                        className="px-4 py-2.5 rounded-xl bg-info-fill hover:opacity-90 text-base text-xs font-bold inline-flex items-center space-x-2 transition-opacity cursor-pointer shadow-sm mt-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Bu Barkodla Yeni Ürün Tanımla</span>
                      </button>
                    )}
                  </div>
                ) : (
                  // Initial Waiting State
                  <div className="p-8 rounded-3xl bg-base-surface-2/50 border border-dashed border-border text-center space-y-2">
                    <Camera className="w-10 h-10 text-text-muted mx-auto" />
                    <h4 className="text-sm font-bold text-text-primary">
                      Kamera Taramaya Hazır
                    </h4>
                    <p className="text-xs text-text-secondary max-w-sm mx-auto">
                      Stoktaki herhangi bir ürünün üzerindeki barkodu kameraya tuttuğunuzda ürün özellikleri ve hızlı stok butonları burada anında belirecektir.
                    </p>
                  </div>
                )}

              </div>
            )}

            {/* MODE 3: BATCH LOGS */}
            {activeMode === 'batch_log' && (
              <div className="space-y-4">
                
                <div className="p-3.5 rounded-2xl bg-base-surface-2 border border-border flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-text-primary">
                      Seri Okuma & Tarama Geçmişi ({batchLogs.length} Kayıt)
                    </h4>
                    <p className="text-[11px] text-text-secondary mt-0.5">
                      Kameradan okutulan tüm barkodlar zaman damgasıyla listelenir.
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setBatchLogs([])}
                      disabled={batchLogs.length === 0}
                      className="px-3 py-1.5 rounded-xl bg-base-surface hover:bg-base-surface-2 border border-border text-xs font-bold text-text-secondary hover:text-danger-text disabled:opacity-40 transition-colors cursor-pointer"
                    >
                      Temizle
                    </button>
                    <button
                      onClick={handleExportLogsCSV}
                      disabled={batchLogs.length === 0}
                      className="px-3.5 py-1.5 rounded-xl bg-info-fill hover:opacity-90 text-base text-xs font-bold flex items-center space-x-1.5 transition-opacity disabled:opacity-50 cursor-pointer shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>CSV İndir</span>
                    </button>
                  </div>
                </div>

                <div className="border border-border rounded-2xl overflow-hidden bg-base-surface max-h-[360px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-base-surface-2 border-b border-border text-[10px] uppercase font-bold text-text-secondary tracking-wider">
                        <th className="py-2.5 px-3">Saat</th>
                        <th className="py-2.5 px-3">Barkod / Veri</th>
                        <th className="py-2.5 px-3">Eşleşen Ürün</th>
                        <th className="py-2.5 px-3 text-right">Kopyala</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-sans">
                      {batchLogs.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-text-muted">
                            Kayıtlı tarama geçmişi bulunmuyor.
                          </td>
                        </tr>
                      ) : (
                        batchLogs.map(log => (
                          <tr key={log.id} className="hover:bg-base-surface-2/40">
                            <td className="py-2.5 px-3 text-text-muted font-mono text-[11px]">
                              {log.timestamp.toLocaleTimeString('tr-TR')}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-text-primary text-xs">
                              {log.barcode}
                            </td>
                            <td className="py-2.5 px-3">
                              {log.matchedProduct ? (
                                <span className="text-success-text font-bold">
                                  {log.matchedProduct.name}
                                </span>
                              ) : (
                                <span className="text-text-muted">-</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                onClick={() => handleCopyCode(log.barcode)}
                                className="p-1 rounded hover:bg-base-surface-2 text-text-secondary hover:text-text-primary"
                                title="Kopyala"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            )}

          </div>

        </div>

      </div>
      </div>

      {/* Embedded CSS for expanding modal transition & green scan flash */}
      <style>{`
        @keyframes scannerModalExpand {
          0% {
            clip-path: circle(30px at calc(100% - 44px) calc(100% - 44px));
            transform: scale(0.92);
            opacity: 0.5;
          }
          100% {
            clip-path: circle(150% at 50% 50%);
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes scanFlashOverlay {
          0% {
            opacity: 0.9;
            transform: scale(1.01);
          }
          50% {
            opacity: 0.6;
          }
          100% {
            opacity: 0;
            transform: scale(1);
          }
        }

        .scanner-modal-expand-animation {
          animation: scannerModalExpand 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .animate-scan-flash {
          animation: scanFlashOverlay 0.26s ease-out forwards;
        }

        @media (prefers-reduced-motion: reduce) {
          .scanner-modal-expand-animation {
            animation: none !important;
            transform: none !important;
            clip-path: none !important;
          }
          .animate-scan-flash {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
