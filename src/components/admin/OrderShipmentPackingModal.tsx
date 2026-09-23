import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Truck, 
  Package, 
  CheckCircle2, 
  AlertTriangle, 
  Barcode, 
  Printer, 
  Camera, 
  Check, 
  ShieldCheck, 
  QrCode, 
  ArrowRight, 
  Play, 
  Volume2,
  Minus,
  Plus,
  Car,
  UserCheck,
  Edit2
} from 'lucide-react';
import { Order, Product } from '../../types';
import { printElementById, printThermalReceipt80mm, printShippingLabel100x150 } from '../../utils/printUtils';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import { useCompanySettings, FleetVehicle, DispatchDriver } from '../../lib/companySettings';

interface OrderShipmentPackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  products: Product[];
  onCompleteShipment: (
    orderId: string, 
    trackingNumber: string, 
    carrier: string,
    vehiclePlate?: string,
    driverName?: string,
    packagesCount?: number
  ) => Promise<void>;
  onOpenEnterpriseSuite?: () => void;
}

interface PackingItemStatus {
  productId: string;
  productName: string;
  sku?: string;
  barcode?: string;
  orderedQty: number;
  packedQty: number;
  unit: string;
  packageNo: number;
}

export default function OrderShipmentPackingModal({
  isOpen,
  onClose,
  order,
  products = [],
  onCompleteShipment,
  onOpenEnterpriseSuite,
}: OrderShipmentPackingModalProps) {
  const companySettings = useCompanySettings();
  const fleetVehicles = companySettings.fleetVehicles && companySettings.fleetVehicles.length > 0
    ? companySettings.fleetVehicles
    : [
        { id: 'v1', plate: '63 AT 941', name: 'ALPHA TEKNİK Özmal Dağıtım Aracı', type: 'Kamyon', isDefault: true },
        { id: 'v2', plate: '63 ALP 102', name: 'ALPHA TEKNİK Panelvan Sevkiyat', type: 'Panelvan', isDefault: false },
        { id: 'v3', plate: '63 TK 520', name: 'Alpha Kamyonet Hızlı Servis', type: 'Kamyonet', isDefault: false }
      ];

  const dispatchPersonnel = companySettings.dispatchPersonnel && companySettings.dispatchPersonnel.length > 0
    ? companySettings.dispatchPersonnel
    : [
        { id: 'd1', name: 'Ahmet Yılmaz', phone: '+90 544 440 91 80', role: 'Şoför & Sevkiyat Sorumlusu', isDefault: true },
        { id: 'd2', name: 'Mehmet Kaya', phone: '+90 542 312 44 55', role: 'Panelvan Şoförü', isDefault: false },
        { id: 'd3', name: 'Mustafa Demir', phone: '+90 533 987 65 43', role: 'Depo & Hızlı Dağıtım', isDefault: false }
      ];

  const defaultVehicle = fleetVehicles.find(v => v.isDefault) || fleetVehicles[0];
  const defaultDriver = dispatchPersonnel.find(d => d.isDefault) || dispatchPersonnel[0];

  const [packingItems, setPackingItems] = useState<PackingItemStatus[]>([]);
  const [selectedCarrier, setSelectedCarrier] = useState<string>(() => 
    defaultVehicle ? `${defaultVehicle.name} (${defaultVehicle.plate})` : 'ALPHA TEKNİK Özmal Dağıtım Aracı (63 AT 941)'
  );
  const [trackingNumber, setTrackingNumber] = useState<string>(() => 
    order?.trackingNumber || `SEVK-${Math.floor(10000000 + Math.random() * 90000000)}`
  );
  const [carrierVehiclePlate, setCarrierVehiclePlate] = useState<string>(() => 
    defaultVehicle?.plate || '63 AT 941'
  );
  const [driverName, setDriverName] = useState<string>(() => 
    defaultDriver ? `${defaultDriver.name} (${defaultDriver.role})` : 'Ahmet Yılmaz (Kendi Şoförümüz)'
  );
  const [isCustomCarrier, setIsCustomCarrier] = useState<boolean>(false);
  const [isCustomDriver, setIsCustomDriver] = useState<boolean>(false);
  const [scannedInput, setScannedInput] = useState<string>('');
  const [totalPackages, setTotalPackages] = useState<number>(1);
  const [currentPackageNo, setCurrentPackageNo] = useState<number>(1);
  const [scanMessage, setScanMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const scanInputRef = useRef<HTMLInputElement>(null);

  const safeProducts = Array.isArray(products) ? products : [];

  // Initialize packing list matching products and update trackingNumber
  useEffect(() => {
    if (order && order.items) {
      setTrackingNumber(order.trackingNumber || `SEVK-${Math.floor(10000000 + Math.random() * 90000000)}`);
      const items: PackingItemStatus[] = order.items.map(it => {
        const prod = safeProducts.find(p => p && (p.id === it.productId || (p.name || '').toLowerCase() === (it.productName || '').toLowerCase()));
        return {
          productId: it.productId,
          productName: it.productName,
          sku: prod?.sku,
          barcode: prod?.barcode,
          orderedQty: it.quantity,
          packedQty: order.status === 'shipped' || order.status === 'delivered' ? it.quantity : 0,
          unit: it.unit || 'ADET',
          packageNo: 1,
        };
      });
      setPackingItems(items);
    } else {
      setPackingItems([]);
    }
  }, [order, products]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        scanInputRef.current?.focus();
      }, 200);
    }
  }, [isOpen]);

  useModalBehavior(isOpen, onClose);

  if (!isOpen || !order) return null;

  // Total packing metrics
  const totalOrderedQty = packingItems.reduce((acc, it) => acc + it.orderedQty, 0);
  const totalPackedQty = packingItems.reduce((acc, it) => acc + it.packedQty, 0);
  const isFullyPacked = totalOrderedQty > 0 && totalPackedQty >= totalOrderedQty;
  const packedPercentage = totalOrderedQty > 0 ? Math.min(100, Math.round((totalPackedQty / totalOrderedQty) * 100)) : 0;

  // Handle Barcode Scanning
  const handleBarcodeSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const raw = scannedInput.trim();
    if (!raw) return;

    const query = raw.toLowerCase();
    
    // Find matching item in order
    const matchIndex = packingItems.findIndex(it => {
      const prod = products.find(p => p.id === it.productId);
      const matchBarcode = it.barcode && it.barcode.toLowerCase() === query;
      const matchProdBarcode = prod?.barcode && prod.barcode.toLowerCase() === query;
      const matchSku = it.sku && it.sku.toLowerCase() === query;
      const matchProdSku = prod?.sku && prod.sku.toLowerCase() === query;
      const matchName = it.productName.toLowerCase().includes(query);
      return matchBarcode || matchProdBarcode || matchSku || matchProdSku || matchName;
    });

    if (matchIndex === -1) {
      setScanMessage({
        type: 'error',
        text: `⚠️ DİKKAT: Okutulan [${raw}] bu siparişin çeki listesinde BULUNMUYOR! Hatalı ürün toplamayınız.`
      });
      setScannedInput('');
      return;
    }

    const item = packingItems[matchIndex];
    if (item.packedQty >= item.orderedQty) {
      setScanMessage({
        type: 'info',
        text: `ℹ️ [${item.productName}] ürününün tüm adedi (${item.orderedQty} ${item.unit}) zaten eksiksiz toplandı!`
      });
      setScannedInput('');
      return;
    }

    // Increment packed quantity
    const updated = [...packingItems];
    updated[matchIndex] = {
      ...item,
      packedQty: item.packedQty + 1,
      packageNo: currentPackageNo,
    };
    setPackingItems(updated);

    setScanMessage({
      type: 'success',
      text: `✅ ${item.productName} okundu: (${updated[matchIndex].packedQty}/${item.orderedQty} ${item.unit}) [Koli #${currentPackageNo}]`
    });
    setScannedInput('');
  };

  // Quick Pack All
  const handlePackAllItems = () => {
    setPackingItems(prev => prev.map(it => ({ ...it, packedQty: it.orderedQty })));
    setScanMessage({ type: 'success', text: 'Tüm kalemler eksiksiz toplandı olarak işaretlendi!' });
  };

  // Adjust item qty manually
  const handleSetItemPackedQty = (idx: number, newQty: number) => {
    const updated = [...packingItems];
    updated[idx].packedQty = Math.max(0, Math.min(updated[idx].orderedQty, newQty));
    setPackingItems(updated);
  };

  // 80mm Thermal Receipt Print
  const handlePrint80mm = () => {
    printThermalReceipt80mm({
      title: 'ALPHA TEKNİK SEVKİYAT',
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      items: packingItems.map(it => ({
        name: it.productName,
        qty: it.packedQty,
        unit: it.unit,
      })),
      notes: `Taşıyıcı: ${selectedCarrier} | Plaka: ${carrierVehiclePlate} | Şoför: ${driverName} | Takip: ${trackingNumber} | Koli: ${totalPackages} Adet`,
      documentType: 'DEPO_CEKI_LISTESI'
    });
  };

  // 100x150 mm Standard Sevkiyat & Koli Etiketi
  const handlePrintShippingLabel = () => {
    printShippingLabel100x150({
      orderNumber: order.orderNumber,
      trackingNumber,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerAddress: order.customerAddress,
      parcelCount: totalPackages,
      currentParcel: currentPackageNo,
      paymentType: order.notes?.includes('Kapıda') ? 'Kapıda Nakit' : 'Cari Hesap',
      cashOnDeliveryAmount: order.notes?.includes('Kapıda') ? order.total : undefined,
      itemsSummary: packingItems.map(i => ({
        name: i.productName,
        qty: i.packedQty || i.orderedQty,
        unit: i.unit,
      })),
      notes: `${selectedCarrier} [Plaka: ${carrierVehiclePlate}] - Şoför: ${driverName}`
    });
  };

  // A4 Printable Packing Slip
  const handlePrintA4 = () => {
    printElementById('order-shipment-printable-slip', `Çeki Listesi & Sevk İrsaliyesi - ${order.orderNumber}`);
  };

  // Complete Shipment
  const handleFinalizeShipment = async () => {
    setIsSubmitting(true);
    try {
      await onCompleteShipment(
        order.id, 
        trackingNumber, 
        selectedCarrier, 
        carrierVehiclePlate, 
        driverName, 
        totalPackages
      );
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err: any) {
      setScanMessage({ type: 'error', text: `Hata: ${err?.message || 'Sevkiyat kaydedilemedi.'}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-base-surface border border-border w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-emerald-500/10 dark:bg-emerald-950/30">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-emerald-600 text-white shadow-md">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-text-primary flex items-center space-x-2">
                <span>Teslimat Hazırlığı & Çeki Listesi Masası</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-mono font-bold">
                  Sipariş #{order.orderNumber}
                </span>
              </h3>
              <p className="text-xs text-text-muted">
                Barkod okutarak sipariş kalemlerini doğrulayın, kolileyin ve teslimat sevk irsaliyesi oluşturun.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text-primary hover:bg-base-surface-2 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5 text-xs">
          
          {/* Top Bar: Progress & Barcode Scan Engine */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* Left 2 Cols: Barcode Input & Scanner */}
            <div className="lg:col-span-2 p-4 bg-base-surface-2 rounded-2xl border border-border space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-bold text-text-primary flex items-center space-x-2 text-[11px] uppercase tracking-wider">
                  <Barcode className="w-4 h-4 text-emerald-500" />
                  <span>Depo Barkod / SKU Doğrulama Alanı</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] text-text-muted">Aktif Koli:</span>
                  <select
                    value={currentPackageNo}
                    onChange={(e) => setCurrentPackageNo(parseInt(e.target.value) || 1)}
                    className="px-2 py-1 bg-base-surface border border-border rounded-lg text-xs font-bold text-emerald-600 dark:text-emerald-400"
                  >
                    {Array.from({ length: totalPackages }).map((_, i) => (
                      <option key={i + 1} value={i + 1}>Koli #{i + 1}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setTotalPackages(prev => prev + 1)}
                    className="px-2 py-1 rounded-lg bg-base-surface hover:bg-base-surface-2 border border-border font-bold text-[10px]"
                    title="Yeni Koli Ekle"
                  >
                    + Koli Ekle
                  </button>
                </div>
              </div>

              <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    ref={scanInputRef}
                    type="text"
                    placeholder="Barkod okutun veya SKU / Ürün adı yazıp Enter'a basın..."
                    value={scannedInput}
                    onChange={(e) => setScannedInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-base-surface border-2 border-emerald-500/40 focus:border-emerald-500 rounded-xl text-text-primary font-mono font-bold text-xs"
                  />
                  <Camera className="w-4 h-4 text-emerald-500 absolute left-3 top-3 opacity-80" />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <Check className="w-4 h-4" />
                  <span>Okut / Doğrula</span>
                </button>
              </form>

              {/* Feedback Alert */}
              {scanMessage && (
                <div className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                  scanMessage.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300' :
                  scanMessage.type === 'error' ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300 animate-pulse' :
                  'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300'
                }`}>
                  <div className="flex items-center space-x-2">
                    {scanMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                    <span className="font-semibold">{scanMessage.text}</span>
                  </div>
                  <button onClick={() => setScanMessage(null)} className="text-[10px] underline cursor-pointer">
                    Kapat
                  </button>
                </div>
              )}
            </div>

            {/* Right 1 Col: Progress & Fast Actions */}
            <div className="p-4 bg-base-surface-2 rounded-2xl border border-border flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-text-primary">
                  <span>Paketleme İlerlemesi</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black">
                    %{packedPercentage}
                  </span>
                </div>
                {/* Progress Bar */}
                <div className="w-full h-3 bg-base-surface rounded-full overflow-hidden border border-border mt-1.5">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      isFullyPacked ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${packedPercentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-text-muted mt-1 font-mono">
                  <span>Toplanan: {totalPackedQty} Adet</span>
                  <span>Hedef: {totalOrderedQty} Adet</span>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={handlePackAllItems}
                  className="flex-1 py-1.5 bg-base-surface hover:bg-base-surface-2 text-text-primary border border-border rounded-xl font-bold text-[11px] transition-colors cursor-pointer text-center"
                >
                  ⚡ Tümünü Hazır Say
                </button>
              </div>
            </div>

          </div>

          {/* Carrier, Vehicle, Driver & Tracking Options */}
          <div className="p-4 bg-base-surface-2 rounded-2xl border border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-text-primary text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Sevkiyat Filosu & Teslimat Ekibi Bilgileri</span>
              </span>
              {onOpenEnterpriseSuite && (
                <button
                  type="button"
                  onClick={onOpenEnterpriseSuite}
                  className="text-[11px] font-bold text-brand-600 hover:underline flex items-center gap-1 cursor-pointer"
                  title="Araç ve şoför listesini Enterprise ayarlarından yönet"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Filoyu Yönet (Enterprise)</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* 1. Vehicle Selection */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-text-muted text-[11px] font-semibold flex items-center gap-1">
                    <Car className="w-3 h-3 text-emerald-500" />
                    <span>Sevkiyat Aracı:</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomCarrier(!isCustomCarrier)}
                    className="text-[10px] text-emerald-600 hover:underline cursor-pointer"
                  >
                    {isCustomCarrier ? 'Listeden Seç' : 'Özel Yaz'}
                  </button>
                </div>
                {isCustomCarrier ? (
                  <input
                    type="text"
                    placeholder="Plaka / Araç adı girin"
                    value={carrierVehiclePlate}
                    onChange={(e) => {
                      setCarrierVehiclePlate(e.target.value);
                      setSelectedCarrier(e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-base-surface border border-emerald-500 rounded-xl font-mono font-bold text-text-primary text-xs"
                  />
                ) : (
                  <select
                    value={carrierVehiclePlate}
                    onChange={(e) => {
                      const plate = e.target.value;
                      setCarrierVehiclePlate(plate);
                      const veh = fleetVehicles.find(v => v.plate === plate);
                      if (veh) {
                        setSelectedCarrier(`${veh.name} (${veh.plate})`);
                      } else {
                        setSelectedCarrier(plate);
                      }
                    }}
                    className="w-full px-3 py-2 bg-base-surface border border-border rounded-xl font-bold text-text-primary text-xs focus:border-emerald-500"
                  >
                    {fleetVehicles.map(v => (
                      <option key={v.id} value={v.plate}>
                        {v.plate} - {v.name} ({v.type})
                      </option>
                    ))}
                    <option value="Müşteri Depodan Aldı">Müşteri Depodan Kendisi Aldı</option>
                    <option value="Şantiye Özel Teslimat">Şantiye Özel Şoförlü Dağıtım</option>
                  </select>
                )}
              </div>

              {/* 2. Driver / Personnel Selection */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-text-muted text-[11px] font-semibold flex items-center gap-1">
                    <UserCheck className="w-3 h-3 text-emerald-500" />
                    <span>Şoför / Teslim Eden:</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomDriver(!isCustomDriver)}
                    className="text-[10px] text-emerald-600 hover:underline cursor-pointer"
                  >
                    {isCustomDriver ? 'Listeden Seç' : 'Özel Yaz'}
                  </button>
                </div>
                {isCustomDriver ? (
                  <input
                    type="text"
                    placeholder="Şoför adı soyadı ve telefon girin"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full px-3 py-2 bg-base-surface border border-emerald-500 rounded-xl font-bold text-text-primary text-xs"
                  />
                ) : (
                  <select
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full px-3 py-2 bg-base-surface border border-border rounded-xl font-bold text-text-primary text-xs focus:border-emerald-500"
                  >
                    {dispatchPersonnel.map(d => (
                      <option key={d.id} value={`${d.name} (${d.phone})`}>
                        {d.name} ({d.role})
                      </option>
                    ))}
                    <option value="Müşteri Teslim Aldı">Müşteri Kendisi Teslim Aldı</option>
                  </select>
                )}
              </div>

              {/* 3. Tracking Reference No */}
              <div>
                <label className="text-text-muted block text-[11px] mb-1 font-semibold">Teslimat & İrsaliye No:</label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-base-surface border border-border rounded-xl font-mono font-bold text-text-primary text-xs focus:border-emerald-500"
                />
              </div>

              {/* 4. Packages Count */}
              <div>
                <label className="text-text-muted block text-[11px] mb-1 font-semibold">Toplam Koli / Kap Sayısı:</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="1"
                    value={totalPackages}
                    onChange={(e) => setTotalPackages(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 px-3 py-2 bg-base-surface border border-border rounded-xl font-mono font-bold text-center text-text-primary text-xs"
                  />
                  <span className="text-text-muted text-[11px]">Koli / Bağ</span>
                </div>
              </div>
            </div>
          </div>

          {/* Printable Packing Sheet & Items Table */}
          <div id="order-shipment-printable-slip" className="bg-base-surface rounded-2xl border border-border p-5 shadow-xs space-y-4">
            
            {/* Header for Printed Slip */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border gap-3">
              <div>
                <div className="text-base font-black text-text-primary">
                  ALPHA TEKNİK DOĞALGAZ SIHHİ TESİSAT
                </div>
                <div className="text-[11px] text-text-muted">
                  Depo Çeki Listesi & Sevk İrsaliyesi Doğrulama Belgesi
                </div>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  Sipariş No: #{order.orderNumber}
                </div>
                <div className="text-[11px] text-text-muted">
                  Tarih: {new Date().toLocaleString('tr-TR')}
                </div>
              </div>
            </div>

            {/* Customer Info Box */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-base-surface-2 rounded-xl border border-border text-xs">
              <div>
                <span className="text-[10px] text-text-muted block font-semibold">Alıcı / Müşteri:</span>
                <strong className="text-text-primary text-sm">{order.customerName}</strong>
                <div className="text-text-muted">{order.customerPhone}</div>
              </div>
              <div>
                <span className="text-[10px] text-text-muted block font-semibold">Teslimat Adresi:</span>
                <div className="text-text-secondary leading-snug">{order.customerAddress}</div>
              </div>
            </div>

            {/* Items Table / Cards */}
            <div className="rounded-xl border border-border overflow-hidden">
              {/* DESKTOP & PRINT TABLE */}
              <div className="hidden sm:block print:block overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-base-surface-2 text-text-muted uppercase text-[10px] border-b border-border">
                    <tr>
                      <th className="p-2.5 w-10 text-center">#</th>
                      <th className="p-2.5">Ürün Adı & Kod</th>
                      <th className="p-2.5 text-center">Sipariş Edilen</th>
                      <th className="p-2.5 text-center font-bold text-emerald-600 dark:text-emerald-400">Toplanan / Hazır</th>
                      <th className="p-2.5 text-center">Koli No</th>
                      <th className="p-2.5 text-center">Durum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {packingItems.map((item, idx) => {
                      const isItemDone = item.packedQty >= item.orderedQty;
                      return (
                        <tr key={idx} className={`transition-colors ${isItemDone ? 'bg-emerald-500/5' : 'hover:bg-base-surface-2'}`}>
                          <td className="p-2.5 text-center font-mono text-text-muted">{idx + 1}</td>
                          <td className="p-2.5">
                            <div className="font-bold text-text-primary">{item.productName}</div>
                            <div className="text-[10px] text-text-muted font-mono">
                              {item.sku ? `SKU: ${item.sku}` : ''} {item.barcode ? `| Barkod: ${item.barcode}` : ''}
                            </div>
                          </td>
                          <td className="p-2.5 text-center font-mono font-semibold">
                            {item.orderedQty} {item.unit}
                          </td>
                          <td className="p-2.5 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                type="button"
                                onClick={() => handleSetItemPackedQty(idx, Math.max(0, item.packedQty - 1))}
                                disabled={item.packedQty <= 0}
                                className="w-7 h-7 rounded-lg bg-base-surface hover:bg-base-surface-2 border border-border flex items-center justify-center text-text-primary hover:text-emerald-600 disabled:opacity-30 disabled:hover:text-text-primary transition-colors cursor-pointer active:scale-95 shadow-2xs font-black text-sm"
                                title="1 Azalt (-)"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <input
                                type="number"
                                min="0"
                                max={item.orderedQty}
                                value={item.packedQty}
                                onChange={(e) => handleSetItemPackedQty(idx, parseInt(e.target.value) || 0)}
                                className={`w-12 h-7 text-center font-black font-mono rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                  isItemDone 
                                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300' 
                                    : 'bg-base-surface border-border text-text-primary'
                                }`}
                              />
                              <button
                                type="button"
                                onClick={() => handleSetItemPackedQty(idx, Math.min(item.orderedQty, item.packedQty + 1))}
                                disabled={item.packedQty >= item.orderedQty}
                                className="w-7 h-7 rounded-lg bg-base-surface hover:bg-base-surface-2 border border-border flex items-center justify-center text-text-primary hover:text-emerald-600 disabled:opacity-30 disabled:hover:text-text-primary transition-colors cursor-pointer active:scale-95 shadow-2xs font-black text-sm"
                                title="1 Arttır (+)"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-[10px] text-text-muted ml-0.5 whitespace-nowrap">{item.unit}</span>
                              {!isItemDone && (
                                <button
                                  type="button"
                                  onClick={() => handleSetItemPackedQty(idx, item.orderedQty)}
                                  className="ml-1.5 px-2 py-1 text-[9px] font-extrabold uppercase rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-2xs cursor-pointer active:scale-95 transition-all whitespace-nowrap"
                                  title="Tüm miktarı topla"
                                >
                                  Tamamla
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="p-2.5 text-center font-mono text-text-muted">
                            Koli #{item.packageNo}
                          </td>
                          <td className="p-2.5 text-center">
                            {isItemDone ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] inline-flex items-center space-x-1">
                                <Check className="w-3 h-3" />
                                <span>Hazır</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-[10px]">
                                {item.orderedQty - item.packedQty} Eksik
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* MOBILE TOUCH-FIRST PACKING CARDS */}
              <div className="block sm:hidden print:hidden divide-y divide-border">
                {packingItems.map((item, idx) => {
                  const isItemDone = item.packedQty >= item.orderedQty;
                  return (
                    <div
                      key={idx}
                      className={`p-3.5 space-y-2.5 transition-colors ${
                        isItemDone ? 'bg-emerald-500/5' : 'bg-base-surface'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-xs text-text-primary leading-snug">
                            {item.productName}
                          </div>
                          <div className="text-[10px] text-text-muted font-mono mt-0.5 flex flex-wrap gap-1.5">
                            {item.sku && <span>SKU: {item.sku}</span>}
                            {item.barcode && <span>• Barkod: {item.barcode}</span>}
                          </div>
                        </div>

                        {isItemDone ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] inline-flex items-center gap-1 shrink-0">
                            <Check className="w-3 h-3" />
                            <span>Hazır</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-[10px] shrink-0 font-mono">
                            {item.orderedQty - item.packedQty} {item.unit} Eksik
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-border/60 gap-2">
                        <div className="flex items-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => handleSetItemPackedQty(idx, Math.max(0, item.packedQty - 1))}
                            className="w-8 h-8 rounded-lg bg-base-surface-2 border border-border flex items-center justify-center font-bold text-sm text-text-primary active:scale-95 cursor-pointer"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            max={item.orderedQty}
                            value={item.packedQty}
                            onChange={(e) => handleSetItemPackedQty(idx, parseInt(e.target.value) || 0)}
                            className={`w-14 h-8 text-center font-bold font-mono px-1 rounded-lg border text-xs ${
                              isItemDone 
                                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300' 
                                : 'bg-base-surface border-border text-text-primary'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => handleSetItemPackedQty(idx, Math.min(item.orderedQty, item.packedQty + 1))}
                            className="w-8 h-8 rounded-lg bg-base-surface-2 border border-border flex items-center justify-center font-bold text-sm text-text-primary active:scale-95 cursor-pointer"
                          >
                            +
                          </button>
                          <span className="text-[11px] font-mono text-text-muted">
                            / {item.orderedQty} {item.unit}
                          </span>
                        </div>

                        <div className="flex items-center space-x-1.5">
                          {!isItemDone && (
                            <button
                              type="button"
                              onClick={() => handleSetItemPackedQty(idx, item.orderedQty)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-[10px] cursor-pointer active:scale-95 shadow-2xs"
                            >
                              Tamamla
                            </button>
                          )}
                          <span className="text-[10px] text-text-muted font-mono bg-base-surface-2 px-1.5 py-1 rounded border border-border">
                            Koli #{item.packageNo}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Signature Area */}
            <div className="pt-3 border-t border-border grid grid-cols-3 text-center text-[10px] text-text-muted">
              <div>
                <strong className="text-text-primary">Depo Sorumlusu (Toplayan)</strong>
                <div className="h-7 mt-1 flex items-center justify-center font-mono">İmza & Teslim</div>
              </div>
              <div>
                <strong className="text-text-primary">Kontrol & Paketleme</strong>
                <div className="h-7 mt-1 flex items-center justify-center font-mono">Onay & Mühür</div>
              </div>
              <div>
                <strong className="text-text-primary">Şoför / Sevkiyat Ekibi Teslim</strong>
                <div className="text-[11px] font-bold text-text-primary mt-1 truncate">{driverName || 'Teslim Alan Şoför'}</div>
                <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">{carrierVehiclePlate}</div>
              </div>
            </div>

          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-border bg-base-surface-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePrint80mm}
              className="px-3 py-2 rounded-xl bg-base-surface hover:bg-base-surface-2 text-text-primary border border-border font-bold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
              title="80mm Termal Depo Fişi Yazdır"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-500" />
              <span>80mm Termal Fiş</span>
            </button>

            <button
              type="button"
              onClick={handlePrintShippingLabel}
              className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
              title="100x150mm Termal Koli / Sevkiyat Etiketi Yazdır"
            >
              <QrCode className="w-3.5 h-3.5 text-amber-500" />
              <span>100x150mm Koli Etiketi</span>
            </button>

            <button
              type="button"
              onClick={handlePrintA4}
              className="px-3 py-2 rounded-xl bg-base-surface hover:bg-base-surface-2 text-text-primary border border-border font-bold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
              title="Resmi A4 Çeki Listesi & İrsaliye Yazdır"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>A4 Çeki Listesi Yazdır</span>
            </button>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            >
              Kapat
            </button>

            <button
              type="button"
              onClick={handleFinalizeShipment}
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center space-x-2 shadow-md transition-all cursor-pointer disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
            >
              {isSubmitting ? (
                <span>Sevkiyat İşleniyor...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Sevkiyata Çıkarıldı Olarak Onayla ➔</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
