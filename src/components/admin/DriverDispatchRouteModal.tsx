import React, { useState, useMemo, useEffect } from 'react';
import { 
  RefreshCw, Plus, ChevronRight,
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
  ExternalLink, ChevronDown, Filter, AlertCircle
} from 'lucide-react';
import { Order, Product } from '../../types';
import { printDispatchRouteSheet } from '../../utils/printUtils';
import { useCompanySettings } from '../../lib/companySettings';
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
  const { fleetVehicles = [], dispatchPersonnel = [] } = useCompanySettings();
  const drivers = dispatchPersonnel;
  const vehicles = fleetVehicles;

  const [activeTab, setActiveTab] = useState<DispatchModalTab>(initialTab);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [routeRegion, setRouteRegion] = useState('Şanlıurfa Merkez & Karaköprü Şantiye Hattı');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Şoför ve araç sefer bazında bağımsız seçilir; seçim silinmişse varsayılana düşer.
  const activeDriver = useMemo(
    () => drivers.find(d => d.id === selectedDriverId) || drivers.find(d => d.isDefault) || drivers[0],
    [drivers, selectedDriverId]
  );
  const activeVehicle = useMemo(
    () => vehicles.find(v => v.id === selectedVehicleId) || vehicles.find(v => v.isDefault) || vehicles[0],
    [vehicles, selectedVehicleId]
  );

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
    if (selectedOrdersData.length === 0 || !activeDriver || !activeVehicle) return;

    printDispatchRouteSheet({
      driverName: activeDriver?.name ?? '',
      vehiclePlate: activeVehicle?.plate ?? '',
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
    if (selectedOrdersData.length === 0 || !activeDriver || !activeVehicle) return;
    setIsProcessing(true);
    setFeedback(null);
    try {
      const shippedIds = selectedOrdersData.map(o => o.id);
      if (onMarkOrdersShipped) {
        await onMarkOrdersShipped(shippedIds, `SEVK-${activeVehicle.plate.replace(/\s+/g, '')}`);
      }

      setFeedback(`${shippedIds.length} adet sipariş ${activeDriver.name} zimmetine (${activeVehicle.plate}) verildi ve sevkiyata çıkarıldı!`);
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

  const shippedOrders = orders.filter(o => o.status === 'shipped');
  const shippedTotal = shippedOrders.reduce((sum, o) => sum + o.total, 0);
  const formatTry = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';

  const kpis: { key: string; label: string; value: string; hint: string; tone: string; tab: DispatchModalTab }[] = [
    { key: 'active', label: 'Aktif görev', value: String(dispatchableOrders.length), hint: 'Dağıtıma uygun sipariş', tone: 'text-text-muted', tab: 'dispatch' },
    { key: 'shipped', label: 'Sevkiyatta', value: String(shippedOrders.length), hint: formatTry(shippedTotal), tone: 'text-emerald-600', tab: 'map' },
    { key: 'ontime', label: 'Zamanında teslim', value: '%96,4', hint: '+1,8 puan', tone: 'text-emerald-600', tab: 'map' },
    { key: 'prep', label: 'Ort. hazırlama', value: '42 dk', hint: '−6 dk', tone: 'text-emerald-600', tab: 'preparation' },
  ];

  const tabs: { id: DispatchModalTab; label: string; Icon: typeof Truck }[] = [
    { id: 'preparation', label: 'Teslimat Hazırlığı', Icon: Package },
    { id: 'dispatch', label: 'Şoför Atama & Rota', Icon: Truck },
    { id: 'fleet', label: 'Araçlar & Şoförler', Icon: UserCheck },
    { id: 'map', label: 'Canlı Rota', Icon: Navigation },
  ];

  const canDispatch = selectedOrdersData.length > 0 && !!activeDriver && !!activeVehicle && !isProcessing;

  if (!isOpen) return null;

  return (
    <div 
      className={displayMode === 'modal'
        ? 'fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs p-3 sm:p-6'
        : 'w-full'}
      onClick={displayMode === 'modal' ? onClose : undefined}
    >
      <div className={displayMode === 'modal' ? 'min-h-full flex items-center justify-center py-4 sm:py-6' : 'w-full'}>
        {displayMode === 'page' && (
          <div className="mb-5 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-text-primary">Teslimat & Sevkiyat</h1>
                <p className="text-sm text-text-muted">Özmal filo ile dağıtım yönetimi</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => window.location.reload()} className="min-h-11 flex items-center gap-2 px-4 bg-base-surface border border-border rounded-xl text-sm font-semibold text-text-primary hover:bg-base-surface-2 transition-colors active:scale-[0.98] cursor-pointer">
                  <RefreshCw className="w-4 h-4" />
                  <span>Yenile</span>
                </button>
                <button type="button" className="min-h-11 flex items-center gap-2 px-4 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors active:scale-[0.98] cursor-pointer">
                  <Plus className="w-4 h-4" />
                  <span>Görev oluştur</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {kpis.map(k => (
                <button
                  key={k.key}
                  type="button"
                  onClick={() => setActiveTab(k.tab)}
                  className="group relative text-left px-[18px] py-3.5 min-h-11 bg-base-surface border border-border rounded-xl shadow-xs hover:border-emerald-600 hover:shadow-md transition-all active:scale-[0.98] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                >
                  <ChevronRight className="absolute right-3.5 top-3.5 w-4 h-4 text-text-muted group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" aria-hidden="true" />
                  <div className="text-xs text-text-muted">{k.label}</div>
                  <div className="mt-0.5 flex items-baseline gap-2">
                    <span className="text-2xl font-semibold text-text-primary tabular-nums">{k.value}</span>
                    <span className={`text-xs font-medium tabular-nums ${k.tone}`}>{k.hint}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex items-end justify-between gap-3 border-b border-border">
              <div role="tablist" aria-label="Sevkiyat bölümleri" className="flex gap-1 overflow-x-auto custom-scrollbar">
                {tabs.map(({ id, label, Icon }) => {
                  const on = activeTab === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={on}
                      onClick={() => setActiveTab(id)}
                      className={`-mb-px min-h-11 flex items-center gap-2 px-5 py-2.5 rounded-t-xl text-sm font-medium whitespace-nowrap transition-colors cursor-pointer border ${
                        on
                          ? 'bg-base-surface border-border border-b-2 border-b-emerald-600 text-text-primary shadow-[0_-2px_8px_rgba(15,23,42,0.06),0_2px_6px_-2px_rgba(5,150,105,0.25)]'
                          : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-base-surface-2'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${on ? 'text-emerald-600' : ''}`} />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
              <button type="button" className="hidden sm:flex mb-1.5 min-h-9 items-center gap-2 bg-base-surface border border-border px-3.5 rounded-xl text-sm font-medium text-text-primary hover:bg-base-surface-2 transition-colors cursor-pointer">
                <Filter className="w-4 h-4 text-text-secondary" />
                <span>Tüm Sevkiyatlar</span>
                <ChevronDown className="w-4 h-4 text-text-secondary" />
              </button>
            </div>
          </div>
        )}

        <div 
          className={`w-full flex flex-col text-text-primary ${displayMode === 'modal' ? 'bg-base-surface border border-border rounded-3xl overflow-hidden max-w-5xl shadow-2xl max-h-[92vh]' : ''}`}
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

        <div className={`flex-1 space-y-5 custom-scrollbar ${displayMode === 'modal' ? 'p-4 sm:p-6 overflow-y-auto' : ''}`}>

          {/* ═══════════════════════════════════════════════════════════════
              TAB 1: TESLİMAT HAZIRLIĞI & PAKETLEME
          ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'preparation' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-base-surface-2 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-bold text-amber-500 uppercase tracking-wider mb-0.5">Teslimat Hazırlığı & Paketleme</div>
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
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-5 items-start animate-in fade-in">
              {/* Sol: sipariş listesi */}
              <section className="bg-base-surface rounded-xl border border-border overflow-hidden" aria-label="Dağıtıma hazır siparişler">
                <div className="px-4 py-3.5 border-b border-border flex items-center justify-between gap-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dispatchableOrders.length > 0 && selectedOrderIds.length === dispatchableOrders.length}
                      disabled={dispatchableOrders.length === 0}
                      onChange={handleSelectAll}
                      className="w-[18px] h-[18px] accent-emerald-600 cursor-pointer"
                    />
                    <span className="text-sm font-semibold text-text-primary">
                      Dağıtıma hazır siparişler <span className="font-normal text-text-muted tabular-nums">({dispatchableOrders.length})</span>
                    </span>
                  </label>
                  <span className="text-xs text-text-muted tabular-nums">
                    {selectedOrdersData.length} / {dispatchableOrders.length} seçili
                  </span>
                </div>

                {dispatchableOrders.length === 0 ? (
                  <div className="px-6 py-14 text-center">
                    <div className="mx-auto mb-3 w-11 h-11 rounded-xl bg-base-surface-2 border border-border flex items-center justify-center text-text-muted">
                      <Package className="w-5 h-5" />
                    </div>
                    <div className="text-sm font-semibold text-text-primary">Dağıtıma hazır sipariş yok</div>
                    <p className="text-xs text-text-muted mt-1">Siparişler onaylandığında veya hazırlandığında burada listelenir.</p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('preparation')}
                      className="mt-4 min-h-11 px-4 bg-base-surface border border-border rounded-xl text-sm font-semibold text-text-primary hover:bg-base-surface-2 transition-colors active:scale-[0.98] cursor-pointer"
                    >
                      Teslimat Hazırlığı'na git
                    </button>
                  </div>
                ) : (
                  <div className="max-h-[32rem] overflow-y-auto divide-y divide-border">
                    {dispatchableOrders.map(order => {
                      const isSelected = selectedOrderIds.includes(order.id);
                      return (
                        <label
                          key={order.id}
                          className={`min-h-14 px-4 py-3 grid grid-cols-[18px_1fr_auto] sm:grid-cols-[18px_88px_1fr_120px_72px] items-center gap-3 cursor-pointer transition-colors ${
                            isSelected ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'hover:bg-base-surface-2'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleOrder(order.id)}
                            className="w-[18px] h-[18px] accent-emerald-600 cursor-pointer"
                          />
                          <span className="hidden sm:block font-mono text-xs text-text-muted">#{order.orderNumber}</span>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-text-primary truncate">{order.customerName}</div>
                            <div className="text-xs text-text-muted truncate">{order.customerAddress}</div>
                          </div>
                          <div className="text-right text-sm font-semibold text-text-primary tabular-nums">
                            {formatTry(order.total)}
                            <span className="block text-[11px] font-normal text-text-muted">{order.items.length} kalem</span>
                          </div>
                          <span className={`hidden sm:inline-flex justify-self-end px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                            order.status === 'shipped' ? 'bg-bg-info text-info-text border-info-border' :
                            order.status === 'preparing' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30' :
                            'bg-base-surface-2 text-text-secondary border-border'
                          }`}>
                            {order.status === 'shipped' ? 'Yolda' : order.status === 'preparing' ? 'Hazır' : 'Onaylı'}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Sağ: sefer planı */}
              <aside className="bg-base-surface rounded-xl border border-border lg:sticky lg:top-4" aria-label="Sefer planı">
                <div className="px-4 py-3.5 border-b border-border">
                  <h3 className="text-sm font-semibold text-text-primary">Şoför Atama & Rota Çizelgesi</h3>
                </div>

                <div className="p-4 space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="dispatch-driver" className="text-xs font-medium text-text-muted">Sevkiyat Şoförü</label>
                      <button type="button" onClick={() => setActiveTab('fleet')} className="text-xs font-medium text-emerald-600 hover:underline cursor-pointer">Yönet</button>
                    </div>
                    <select
                      id="dispatch-driver"
                      value={activeDriver?.id ?? ''}
                      onChange={e => setSelectedDriverId(e.target.value)}
                      disabled={drivers.length === 0}
                      className="w-full min-h-11 px-3 bg-base-surface border border-border rounded-xl text-sm text-text-primary cursor-pointer disabled:opacity-60"
                    >
                      {drivers.length === 0 && <option value="">Şoför tanımlı değil</option>}
                      {drivers.map(d => (
                        <option key={d.id} value={d.id}>{d.name} · {d.role}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="dispatch-vehicle" className="text-xs font-medium text-text-muted">Özmal Araç / Plaka</label>
                      <button type="button" onClick={() => setActiveTab('fleet')} className="text-xs font-medium text-emerald-600 hover:underline cursor-pointer">Yönet</button>
                    </div>
                    <select
                      id="dispatch-vehicle"
                      value={activeVehicle?.id ?? ''}
                      onChange={e => setSelectedVehicleId(e.target.value)}
                      disabled={vehicles.length === 0}
                      className="w-full min-h-11 px-3 bg-base-surface border border-border rounded-xl text-sm text-text-primary cursor-pointer disabled:opacity-60"
                    >
                      {vehicles.length === 0 && <option value="">Araç tanımlı değil</option>}
                      {vehicles.map(v => (
                        <option key={v.id} value={v.id}>{v.plate} · {v.type}{v.capacity ? ` ${v.capacity}` : ''}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="dispatch-route" className="block text-xs font-medium text-text-muted mb-1.5">Dağıtım Hattı / Güzergah</label>
                    <input
                      id="dispatch-route"
                      type="text"
                      value={routeRegion}
                      onChange={e => setRouteRegion(e.target.value)}
                      placeholder="Örn: Karaköprü & Haliliye Şantiye Hattı"
                      className="w-full min-h-11 px-3 bg-base-surface border border-border rounded-xl text-sm text-text-primary"
                    />
                  </div>

                  {(drivers.length === 0 || vehicles.length === 0) && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-bg-warning text-warning-text border border-warning-border text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>Sevkiyat için en az bir şoför ve bir araç tanımlı olmalı. <button type="button" onClick={() => setActiveTab('fleet')} className="font-semibold underline cursor-pointer">Araçlar & Şoförler</button> sekmesinden ekleyin.</span>
                    </div>
                  )}
                </div>

                <dl className="px-4 py-3.5 border-t border-border space-y-2 text-sm tabular-nums">
                  <div className="flex justify-between"><dt className="text-text-muted">Seçili sipariş</dt><dd>{selectedOrdersData.length}</dd></div>
                  <div className="flex justify-between"><dt className="text-text-muted">Kapıda tahsilat</dt><dd>{formatTry(totalCashToCollect)}</dd></div>
                  <div className="flex justify-between text-base font-semibold text-text-primary"><dt>Toplam</dt><dd>{formatTry(totalRevenue)}</dd></div>
                </dl>

                <div className="p-4 border-t border-border space-y-2">
                  <div role="status" aria-live="polite">
                    {feedback && (
                      <div className={`mb-2 p-3 rounded-xl text-xs font-medium border ${feedback.includes('hata') ? 'bg-bg-danger text-danger-text border-danger-border' : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30'}`}>
                        {feedback}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleDispatchAndMarkShipped}
                    disabled={!canDispatch}
                    className="w-full min-h-11 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-45 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98]"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isProcessing ? 'Sevk ediliyor…' : `Sevkiyata & Yola Çıkar (${selectedOrdersData.length})`}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePrintSheet}
                    disabled={selectedOrdersData.length === 0 || !activeDriver || !activeVehicle}
                    className="w-full min-h-11 px-4 bg-base-surface hover:bg-base-surface-2 disabled:opacity-45 disabled:cursor-not-allowed text-text-primary font-semibold text-sm rounded-xl border border-border flex items-center justify-center gap-2 transition-colors cursor-pointer active:scale-[0.98]"
                  >
                    <Printer className="w-4 h-4 text-text-secondary" />
                    <span>Çizelgeyi Yazdır (A4)</span>
                  </button>
                </div>
              </aside>
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

        <div className={`text-xs text-text-muted ${displayMode === 'modal' ? 'px-5 py-3 bg-base-surface-2 border-t border-border shrink-0' : 'pt-4 text-center'}`}>
          * Tüm teslimatlar firmamızın özmal araç filosu ve personeli tarafından yapılmaktadır.
        </div>
      </div>
      </div>
    </div>
  );
}
