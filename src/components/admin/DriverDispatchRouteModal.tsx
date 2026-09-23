import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Truck, 
  Printer, 
  CheckCircle2, 
  Calendar, 
  UserCheck, 
  MapPin, 
  Package, 
  Wallet, 
  Building2,
  FileText,
  Clock,
  ArrowRight,
  Navigation,
  Compass,
  Check,
  Phone,
  Layers,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { Order, Product } from '../../types';
import { printDispatchRouteSheet } from '../../utils/printUtils';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import AlphaEnterpriseSuiteModal from './AlphaEnterpriseSuiteModal';

export type DispatchModalTab = 'preparation' | 'dispatch' | 'fleet' | 'map';

interface DriverDispatchRouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  displayMode?: 'modal' | 'page';
  orders: Order[];
  products?: Product[];
  initialTab?: DispatchModalTab;
  onMarkOrdersShipped?: (orderIds: string[], trackingPrefix?: string) => Promise<void>;
  onOpenPackingDetail?: (order: Order) => void;
}

const FLEET_DRIVERS = [
  { id: 'd1', name: 'Ahmet Yılmaz (Kendi Şoförümüz)', plate: '63 AT 941', vehicle: 'Alpha Kamyon (Özmal)', phone: '0544 440 91 80' },
  { id: 'd2', name: 'Mehmet Kaya (Kendi Şoförümüz)', plate: '63 ALP 102', vehicle: 'Alpha Panelvan Dağıtım', phone: '0542 312 44 55' },
  { id: 'd3', name: 'Mustafa Demir (Kendi Şoförümüz)', plate: '63 TK 520', vehicle: 'Alpha Kamyonet Hızlı Servis', phone: '0533 987 65 43' }
];

export default function DriverDispatchRouteModal({
  isOpen,
  onClose,
  displayMode = 'modal',
  orders = [],
  products = [],
  initialTab = 'dispatch',
  onMarkOrdersShipped,
  onOpenPackingDetail
}: DriverDispatchRouteModalProps) {
  useModalBehavior(isOpen && displayMode === 'modal', onClose);
  const [activeTab, setActiveTab] = useState<DispatchModalTab>(initialTab);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('d1');
  const [routeRegion, setRouteRegion] = useState('Şanlıurfa Merkez & Karaköprü Şantiye Hattı');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const activeDriver = useMemo(() => {
    return FLEET_DRIVERS.find(d => d.id === selectedDriverId) || FLEET_DRIVERS[0];
  }, [selectedDriverId]);

  // Eligible orders for delivery dispatch (pending, approved, preparing, shipped)
  const dispatchableOrders = useMemo(() => {
    return orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled');
  }, [orders]);

  // Toggle selection
  const handleToggleOrder = (id: string) => {
    setSelectedOrderIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedOrderIds.length === dispatchableOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(dispatchableOrders.map(o => o.id));
    }
  };

  const selectedOrdersData = useMemo(() => {
    return dispatchableOrders.filter(o => selectedOrderIds.includes(o.id));
  }, [dispatchableOrders, selectedOrderIds]);

  const totalCashToCollect = useMemo(() => {
    return selectedOrdersData.reduce((sum, o) => {
      const isCod = o.notes?.toLowerCase().includes('kapıda') || !o.notes?.toLowerCase().includes('havale');
      return sum + (isCod ? o.total : 0);
    }, 0);
  }, [selectedOrdersData]);

  const totalRevenue = useMemo(() => {
    return selectedOrdersData.reduce((sum, o) => sum + o.total, 0);
  }, [selectedOrdersData]);

  // Print Route Sheet (A4)
  const handlePrintSheet = () => {
    if (selectedOrdersData.length === 0) return;

    printDispatchRouteSheet({
      driverName: activeDriver.name,
      vehiclePlate: activeDriver.plate,
      routeRegion,
      date: new Date().toLocaleDateString('tr-TR'),
      orders: selectedOrdersData.map(o => ({
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        phone: o.customerPhone,
        address: o.customerAddress,
        parcelCount: 1,
        paymentType: o.notes?.includes('Kapıda') ? 'Kapıda Nakit/POS' : 'Cari / Havale',
        cashOnDeliveryAmount: o.notes?.includes('Kapıda') ? o.total : undefined,
        totalAmount: o.total
      }))
    });
  };

  // Mark all selected orders as Shipped & Print
  const handleDispatchAndMarkShipped = async () => {
    if (selectedOrdersData.length === 0) return;
    setIsProcessing(true);
    try {
      handlePrintSheet();

      if (onMarkOrdersShipped) {
        await onMarkOrdersShipped(selectedOrderIds, `SEVK-${activeDriver.plate.replace(/\s+/g, '')}`);
      }

      setFeedback(`${selectedOrderIds.length} adet sipariş ${activeDriver.name} zimmetine verildi ve sevkiyata çıkarıldı!`);
      setTimeout(() => {
        setFeedback(null);
        onClose();
      }, 2000);
    } catch (err) {
      console.error(err);
      setFeedback('Sevkiyat durumu güncellenirken hata oluştu.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className={displayMode === 'modal'
        ? 'fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs p-3 sm:p-6'
        : 'w-full'}
      onClick={displayMode === 'modal' ? onClose : undefined}
    >
      <div className={displayMode === 'modal' ? 'min-h-full flex items-center justify-center py-4 sm:py-6' : 'w-full'}>
        <div 
          className={`bg-base-surface border border-border rounded-3xl w-full flex flex-col text-text-primary overflow-hidden ${displayMode === 'modal' ? 'max-w-5xl shadow-2xl max-h-[92vh]' : 'shadow-sm'}`}
          onClick={(e) => e.stopPropagation()}
        >
        
        {/* Modal Header */}
        {displayMode === 'modal' && (
        <div className="px-5 sm:px-6 py-4 bg-base-surface-2 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0 shadow-xs">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold text-text-primary">
                  Özmal Filo & Teslimat Yönetim Masası
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-base-surface text-text-secondary border border-border font-bold">
                  Alpha Teknik Dağıtım
                </span>
              </div>
              <p className="text-xs text-text-muted">Tüm teslimatlar doğrudan kendi özmal araç ve saha şoförlerimizle gerçekleştirilir.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-base-surface text-text-muted hover:text-text-primary rounded-xl transition-colors self-end sm:self-auto cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        )}

        {/* 3 Step Navigation Tabs */}
        <div className="flex items-center border-b border-border bg-base-surface px-4 sm:px-6 gap-2 overflow-x-auto custom-scrollbar shrink-0">
          <button
            id="tab-dispatch-prep"
            type="button"
            onClick={() => setActiveTab('preparation')}
            className={`flex items-center space-x-2 py-3 px-3.5 border-b-2 font-bold text-xs transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'preparation'
                ? 'border-brand-amber text-brand-amber'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>1. Teslimat Hazırlığı & Paketleme</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-base-surface-2 text-text-muted">
              {dispatchableOrders.filter(o => o.status === 'preparing' || o.status === 'approved').length}
            </span>
          </button>

          <button
            id="tab-dispatch-route"
            type="button"
            onClick={() => setActiveTab('dispatch')}
            className={`flex items-center space-x-2 py-3 px-3.5 border-b-2 font-bold text-xs transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'dispatch'
                ? 'border-brand-amber text-brand-amber'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>2. Şoför Atama & Rota Çizelgesi</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-base-surface-2 text-text-muted">
              {dispatchableOrders.length}
            </span>
          </button>

          <button
            id="tab-dispatch-fleet"
            type="button"
            onClick={() => setActiveTab('fleet')}
            className={`flex items-center space-x-2 py-3 px-3.5 border-b-2 font-bold text-xs transition-colors whitespace-nowrap cursor-pointer min-h-[44px] active:scale-[0.98] ${
              activeTab === 'fleet'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>3. Araçlar & Şoförler</span>
          </button>

          <button
            id="tab-dispatch-map"
            type="button"
            onClick={() => setActiveTab('map')}
            className={`flex items-center space-x-2 py-3 px-3.5 border-b-2 font-bold text-xs transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'map'
                ? 'border-brand-amber text-brand-amber'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>4. Canlı Rota & Teslimatlar</span>
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className="bg-bg-success border-b border-success-border px-6 py-2.5 text-xs text-success-text flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-4 h-4" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Modal Body Container */}
        <div className={`p-4 sm:p-6 flex-1 space-y-5 custom-scrollbar ${displayMode === 'modal' ? 'overflow-y-auto' : ''}`}>
          
          {/* ═══════════════════════════════════════════════════════════════
              TAB 1: TESLİMAT HAZIRLIĞI & PAKETLEME
          ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'preparation' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-base-surface-2 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-sm text-text-primary flex items-center space-x-2">
                    <Package className="w-4 h-4 text-warning-text" />
                    <span>Depo Çeki Listesi & Malzeme Hazırlık Kontrolü</span>
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    Depoda toplanan siparişlerin koli adetlerini ve teslimat referans numaralarını doğrulayın.
                  </p>
                </div>
                <div className="text-xs font-semibold text-text-secondary bg-base-surface px-3 py-1.5 rounded-xl border border-border">
                  Kendi Sevkiyat Aracımızla Sevk
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {dispatchableOrders.length === 0 ? (
                  <div className="col-span-2 p-8 text-center bg-base-surface rounded-2xl border border-border text-xs text-text-muted">
                    Hazırlık bekleyen açık sipariş bulunmuyor.
                  </div>
                ) : (
                  dispatchableOrders.map(order => {
                    const totalQty = order.items.reduce((sum, it) => sum + it.quantity, 0);
                    return (
                      <div key={order.id} className="p-4 rounded-2xl bg-base-surface border border-border hover:border-border-strong transition-all space-y-3 shadow-xs">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-mono font-bold text-xs text-text-primary">#{order.orderNumber}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                                order.status === 'preparing' ? 'bg-bg-warning text-warning-text border border-warning-border' :
                                order.status === 'shipped' ? 'bg-bg-info text-info-text border border-info-border' :
                                'bg-bg-success text-success-text border border-success-border'
                              }`}>
                                {order.status === 'preparing' ? 'Toplama / Pakette' : order.status === 'shipped' ? 'Sevkiyatta' : 'Onaylandı'}
                              </span>
                            </div>
                            <h4 className="font-bold text-sm text-text-primary mt-1">{order.customerName}</h4>
                            <p className="text-[11px] text-text-muted line-clamp-1">{order.customerAddress}</p>
                          </div>
                          <div className="text-right">
                            <span className="font-bold font-mono text-sm text-text-primary">{order.total.toLocaleString('tr-TR')} ₺</span>
                            <span className="text-[10px] text-text-muted block">{order.items.length} Kalem ({totalQty} Adet)</span>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-base-surface-2 border border-border text-xs space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-text-muted">Sevkiyat Ref No:</span>
                            <span className="font-mono font-bold text-text-primary">{order.trackingNumber || `SEVK-${order.orderNumber.replace(/[^0-9]/g, '')}`}</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-text-muted">Taşıyıcı Filo:</span>
                            <span className="font-bold text-text-secondary">ALPHA TEKNİK Özmal Dağıtım</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[11px] text-text-muted">
                            {order.constructionSiteName ? `🏗️ ${order.constructionSiteName}` : '📍 Doğrudan Şantiye Adresi'}
                          </span>
                          {onOpenPackingDetail && <button
                            type="button"
                            onClick={() => onOpenPackingDetail?.(order)}
                            className="px-3 py-1.5 bg-base-surface-2 hover:bg-base-surface text-text-primary border border-border rounded-xl text-xs font-bold transition-colors cursor-pointer"
                          >
                            Çeki Listesi Masası
                          </button>}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              TAB 2: ŞOFÖR ATAMA & ROTA ÇİZELGESİ
          ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'dispatch' && (
            <div className="space-y-5 animate-in fade-in">
              
              {/* Driver & Vehicle Selection Panel */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-base-surface-2 p-4 rounded-2xl border border-border text-xs">
                <div>
                  <label className="text-text-secondary font-bold block mb-1.5 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-warning-text" />
                    Sevkiyat Şoförü:
                  </label>
                  <select
                    value={selectedDriverId}
                    onChange={e => setSelectedDriverId(e.target.value)}
                    className="w-full px-3 py-2 bg-base-surface border border-border rounded-xl text-text-primary font-bold focus:border-border-strong cursor-pointer"
                  >
                    {FLEET_DRIVERS.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.plate})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-text-secondary font-bold block mb-1.5 flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-info-text" />
                    Özmal Araç / Plaka:
                  </label>
                  <div className="px-3 py-2 bg-base-surface border border-border rounded-xl text-text-primary font-mono font-bold flex items-center justify-between">
                    <span>{activeDriver.plate}</span>
                    <span className="text-[10px] font-sans font-semibold text-text-muted">{activeDriver.vehicle}</span>
                  </div>
                </div>

                <div>
                  <label className="text-text-secondary font-bold block mb-1.5 flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-success-text" />
                    Dağıtım Hattı / Güzergah:
                  </label>
                  <input
                    type="text"
                    value={routeRegion}
                    onChange={e => setRouteRegion(e.target.value)}
                    placeholder="Örn: Karaköprü & Haliliye Şantiye Hattı"
                    className="w-full px-3 py-2 bg-base-surface border border-border rounded-xl text-text-primary font-medium focus:border-border-strong"
                  />
                </div>
              </div>

              {/* KPI Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-base-surface p-3.5 rounded-2xl border border-border shadow-xs">
                  <span className="text-[10px] text-text-muted font-bold uppercase block">Seçili Sipariş</span>
                  <span className="text-xl font-black text-text-primary font-mono">{selectedOrdersData.length} Adet</span>
                </div>
                <div className="bg-base-surface p-3.5 rounded-2xl border border-border shadow-xs">
                  <span className="text-[10px] text-text-muted font-bold uppercase block">Toplam Koli / Kap</span>
                  <span className="text-xl font-black text-info-text font-mono">{selectedOrdersData.length} Koli</span>
                </div>
                <div className="bg-base-surface p-3.5 rounded-2xl border border-border shadow-xs">
                  <span className="text-[10px] text-warning-text font-bold uppercase block">Kapıda Tahsilat (Şoför)</span>
                  <span className="text-xl font-black text-warning-text font-mono">{totalCashToCollect.toLocaleString('tr-TR')} ₺</span>
                </div>
                <div className="bg-base-surface p-3.5 rounded-2xl border border-border shadow-xs">
                  <span className="text-[10px] text-success-text font-bold uppercase block">Toplam Sevk Tutarı</span>
                  <span className="text-xl font-black text-success-text font-mono">{totalRevenue.toLocaleString('tr-TR')} ₺</span>
                </div>
              </div>

              {/* Order Selection Table */}
              <div className="bg-base-surface rounded-2xl border border-border overflow-hidden flex flex-col shadow-xs">
                <div className="px-4 py-3 bg-base-surface-2 border-b border-border flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={dispatchableOrders.length > 0 && selectedOrderIds.length === dispatchableOrders.length}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded text-success-fill cursor-pointer"
                    />
                    <span className="font-bold text-text-primary">
                      Dağıtıma Hazır Şantiye Siparişleri ({dispatchableOrders.length} Sipariş)
                    </span>
                  </div>
                  <span className="text-text-muted text-[11px] font-mono font-bold">
                    {selectedOrderIds.length} / {dispatchableOrders.length} seçili
                  </span>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-border">
                  {dispatchableOrders.length === 0 ? (
                    <div className="p-8 text-center text-text-muted text-xs">
                      Şu anda dağıtıma uygun aktif sipariş bulunmuyor.
                    </div>
                  ) : (
                    dispatchableOrders.map(order => {
                      const isSelected = selectedOrderIds.includes(order.id);
                      return (
                        <div
                          key={order.id}
                          onClick={() => handleToggleOrder(order.id)}
                          className={`px-4 py-3 grid grid-cols-12 items-center text-xs cursor-pointer transition-colors ${
                            isSelected ? 'bg-base-surface-2 font-semibold' : 'hover:bg-base-surface-2/60'
                          }`}
                        >
                          <div className="col-span-1 flex items-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="w-4 h-4 rounded text-success-fill cursor-pointer"
                            />
                          </div>

                          <div className="col-span-2 font-mono font-bold text-text-primary text-[11px]">
                            #{order.orderNumber}
                          </div>

                          <div className="col-span-4 pr-2">
                            <div className="font-bold text-text-primary truncate">{order.customerName}</div>
                            <div className="text-[11px] text-text-muted truncate">{order.customerAddress}</div>
                          </div>

                          <div className="col-span-2 text-text-secondary font-mono text-[11px]">
                            {order.customerPhone}
                          </div>

                          <div className="col-span-2 text-right">
                            <span className="font-bold text-text-primary font-mono">{order.total.toLocaleString('tr-TR')} ₺</span>
                            <span className="text-[10px] text-text-muted block">{order.items.length} Kalem</span>
                          </div>

                          <div className="col-span-1 text-right">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              order.status === 'shipped' ? 'bg-bg-info text-info-text border border-info-border' :
                              order.status === 'preparing' ? 'bg-bg-warning text-warning-text border border-warning-border' : 
                              'bg-bg-success text-success-text border border-success-border'
                            }`}>
                              {order.status === 'shipped' ? 'Yolda' : order.status === 'preparing' ? 'Hazır' : 'Onaylı'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ARAÇLAR & ŞOFÖRLER */}
          {activeTab === 'fleet' && (
            <div className="animate-in fade-in">
              <AlphaEnterpriseSuiteModal
                isOpen
                displayMode="page"
                fleetOnly
                onClose={() => {}}
                currentTheme="system"
                onThemeChange={() => {}}
                initialTab="fleet"
              />
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              TAB 4: CANLI SEVKİYAT HARİTASI & ŞANTİYELER
          ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'map' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-base-surface-2 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-base-surface border border-border text-info-text shadow-xs">
                    <Navigation className="w-5 h-5 text-info-text" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-text-primary">Canlı Şantiye Sevkiyat Haritası</h3>
                    <p className="text-xs text-text-muted">Dağıtım rotasındaki şantiyelerin teslimat sırası ve adres güzergahı</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-text-secondary bg-base-surface px-3 py-1.5 rounded-xl border border-border">
                    {dispatchableOrders.length} Aktif Şantiye Noktası
                  </span>
                </div>
              </div>

              {/* Delivery Route List with Navigation Links */}
              <div className="space-y-2.5">
                {dispatchableOrders.length === 0 ? (
                  <div className="p-12 text-center bg-base-surface rounded-2xl border border-border text-xs text-text-muted">
                    Haritada gösterilecek aktif teslimat adresi bulunmuyor.
                  </div>
                ) : (
                  dispatchableOrders.map((order, idx) => (
                    <div key={order.id} className="p-4 rounded-2xl bg-base-surface border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:border-border-strong transition-all">
                      <div className="flex items-start space-x-3.5">
                        <div className="w-8 h-8 rounded-xl bg-base-surface-2 border border-border font-mono font-black text-sm flex items-center justify-center text-text-primary shrink-0">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-bold text-sm text-text-primary">{order.customerName}</h4>
                            <span className="font-mono text-xs text-text-muted font-bold">#{order.orderNumber}</span>
                            {order.constructionSiteName && (
                              <span className="px-2 py-0.5 rounded-md bg-category-logistics-bg text-category-logistics-text text-[10px] font-bold border border-category-logistics-border">
                                🏗️ {order.constructionSiteName}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-text-secondary mt-0.5 flex items-center space-x-1">
                            <MapPin className="w-3.5 h-3.5 text-danger-text shrink-0" />
                            <span>{order.customerAddress}</span>
                          </p>
                          <div className="flex items-center space-x-3 mt-1.5 text-[11px] text-text-muted">
                            <span className="flex items-center space-x-1 font-mono">
                              <Phone className="w-3 h-3 text-text-muted" />
                              <span>{order.customerPhone}</span>
                            </span>
                            <span>•</span>
                            <span className="font-mono font-bold text-text-primary">{order.total.toLocaleString('tr-TR')} ₺</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 self-end sm:self-auto shrink-0">
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.customerAddress || 'Şanlıurfa')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 bg-base-surface-2 hover:bg-base-surface text-text-primary rounded-xl border border-border text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-text-muted" />
                          <span>Navigasyonda Aç</span>
                        </a>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-base-surface-2 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
          <div className="text-xs text-text-muted">
            * Tüm teslimatlar firmamızın özmal araç filosu ve personeli tarafından yapılmaktadır.
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handlePrintSheet}
              disabled={selectedOrdersData.length === 0}
              className="px-4 py-2 bg-base-surface hover:bg-base-surface-2 disabled:opacity-40 text-text-primary font-semibold text-xs rounded-xl border border-border flex items-center gap-2 transition-colors cursor-pointer shadow-2xs"
            >
              <Printer className="w-4 h-4 text-text-secondary" />
              <span>Çizelgeyi Yazdır (A4)</span>
            </button>

            <button
              type="button"
              onClick={handleDispatchAndMarkShipped}
              disabled={selectedOrdersData.length === 0 || isProcessing}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer active:scale-[0.98]"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Sevkiyata & Yola Çıkar ({selectedOrdersData.length})</span>
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
