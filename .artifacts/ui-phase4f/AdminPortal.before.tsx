import { useState, useRef } from 'react';
import { Product, Order, Quote, OrderStatus } from '../../types';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  FileText, 
  Package, 
  Clock, 
  CheckCircle2, 
  Truck, 
  Sparkles, 
  Plus, 
  Edit3, 
  Trash2, 
  ShieldCheck, 
  Eye, 
  Send, 
  Search, 
  Filter,
  Lock,
  Unlock,
  AlertCircle,
  TrendingUp,
  User,
  Phone,
  MapPin,
  AlertTriangle,
  BellRing,
  X,
  RotateCcw,
  BarChart3,
  Activity,
  Printer,
  Download,
  Users,
  Receipt,
  Bug,
  Wrench,
  Barcode,
  Camera,
  FileSpreadsheet,
  Tag,
  Percent
} from 'lucide-react';
import confetti from 'canvas-confetti';
import AdminQuoteModal from './AdminQuoteModal';
import ProductManageModal from './ProductManageModal';
import ProductFastEditTable from './ProductFastEditTable';
import BarcodeGeneratorModal from './BarcodeGeneratorModal';
import CameraBarcodeScannerModal from './CameraBarcodeScannerModal';
import SalesAnalyticsDashboard from './SalesAnalyticsDashboard';
import SystemDiagnosticsDashboard from './SystemDiagnosticsDashboard';
import ErrorDiagnosticsCenter from './ErrorDiagnosticsCenter';
import SalesPerformanceTrendChart from './SalesPerformanceTrendChart';
import CariManagementDashboard from './CariManagementDashboard';
import EInvoiceDashboard from './EInvoiceDashboard';
import BulkPriceAdjustmentModal from './BulkPriceAdjustmentModal';
import SupplierPurchaseOrderModal from './SupplierPurchaseOrderModal';
import OrderShipmentPackingModal from './OrderShipmentPackingModal';
import FastPosCheckoutModal from './FastPosCheckoutModal';
import BulkExcelImportExportModal from './BulkExcelImportExportModal';
import CustomerTierManagementModal from './CustomerTierManagementModal';
import DriverDispatchRouteModal from './DriverDispatchRouteModal';
import { AdminReceiptVerificationModal } from './AdminReceiptVerificationModal';
import { OrderPickingInspectionModal } from './OrderPickingInspectionModal';
import { ManagerAgingAndStockReportsModal } from './ManagerAgingAndStockReportsModal';
import { OrderActionDropdown } from './OrderActionDropdown';
import WhatsAppShareModal from '../common/WhatsAppShareModal';
import D3OrderStatusFlow from '../common/D3OrderStatusFlow';
import QuotePDFModal from '../QuotePDFModal';
import OrderPDFModal from '../OrderPDFModal';
import { decryptPayload } from '../../lib/crypto';
import { playNotificationSound } from '../../lib/audio';
import { generateOrderWhatsAppMessage, generateQuoteWhatsAppMessage } from '../../utils/shareUtils';
import { updateOrderStatusInFirestore } from '../../lib/firestoreService';
import { printThermalReceipt80mm } from '../../utils/printUtils';

interface AdminPortalProps {
  products: Product[];
  orders: Order[];
  quotes: Quote[];
  activeTab?: 'home' | 'orders' | 'quotes' | 'products' | 'cariler' | 'invoices' | 'analytics' | 'diagnostics' | 'errors';
  onTabChange?: (tab: 'home' | 'orders' | 'quotes' | 'products' | 'cariler' | 'invoices' | 'analytics' | 'diagnostics' | 'errors') => void;
  onRefresh: () => void;
  onOpenAI: () => void;
  posRequested?: boolean;
  onPosClose?: () => void;
}

export default function AdminPortal({
  products,
  orders,
  quotes,
  activeTab: controlledActiveTab,
  onTabChange,
  onRefresh,
  onOpenAI,
  posRequested = false,
  onPosClose,
}: AdminPortalProps) {
  const [internalTab, setInternalTab] = useState<'home' | 'orders' | 'quotes' | 'products' | 'cariler' | 'invoices' | 'analytics' | 'diagnostics' | 'errors'>('home');
  const activeTab = controlledActiveTab !== undefined ? controlledActiveTab : internalTab;
  const setActiveTab = (tab: 'home' | 'orders' | 'quotes' | 'products' | 'cariler' | 'invoices' | 'analytics' | 'diagnostics' | 'errors') => {
    setInternalTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | Order['status']>('all');
  const [quoteStatusFilter, setQuoteStatusFilter] = useState<'all' | Quote['status']>('all');
  const [selectedQuoteForResponse, setSelectedQuoteForResponse] = useState<Quote | null>(null);
  const [selectedQuoteForPDF, setSelectedQuoteForPDF] = useState<Quote | null>(null);
  const [selectedOrderForPDF, setSelectedOrderForPDF] = useState<Order | null>(null);
  const [selectedProductToEdit, setSelectedProductToEdit] = useState<Product | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [showCameraScannerModal, setShowCameraScannerModal] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [showSalesTrendWidget, setShowSalesTrendWidget] = useState<boolean>(true);
  const [selectedTrendDate, setSelectedTrendDate] = useState<string | null>(null);
  
  // Low stock alert state
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(5);
  const [showLowStockModal, setShowLowStockModal] = useState(false);
  const [isCheckingLowStock, setIsCheckingLowStock] = useState(false);
  const [restockLoadingId, setRestockLoadingId] = useState<string | null>(null);
  const [lowStockFeedback, setLowStockFeedback] = useState<string | null>(null);

  // New Feature States
  const [showBulkPriceModal, setShowBulkPriceModal] = useState(false);
  const [showSupplierPOModal, setShowSupplierPOModal] = useState(false);
  const [internalPosOpen, setInternalPosOpen] = useState(false);
  const showPosModal = posRequested || internalPosOpen;
  const setShowPosModal = (open: boolean) => { setInternalPosOpen(open); if (!open) onPosClose?.(); };
  const [showBulkExcelModal, setShowBulkExcelModal] = useState(false);
  const [showCustomerTierModal, setShowCustomerTierModal] = useState(false);
  const [showDriverDispatchModal, setShowDriverDispatchModal] = useState(false);
  const [selectedOrderForPacking, setSelectedOrderForPacking] = useState<Order | null>(null);
  const [showReceiptVerificationModal, setShowReceiptVerificationModal] = useState(false);
  const [showPickingInspectionModal, setShowPickingInspectionModal] = useState(false);
  const [selectedOrderForPicking, setSelectedOrderForPicking] = useState<Order | null>(null);
  const [showAgingAndDiscountModal, setShowAgingAndDiscountModal] = useState(false);
  const [whatsAppShareState, setWhatsAppShareState] = useState<{
    isOpen: boolean;
    title: string;
    defaultPhone: string;
    defaultMessage: string;
    recipientName: string;
  } | null>(null);

  // Smooth scroll and visual feedback states for action & metric cards
  const contentSectionRef = useRef<HTMLDivElement>(null);
  const [clickedCardId, setClickedCardId] = useState<string | null>(null);
  const [highlightSection, setHighlightSection] = useState<string | null>(null);

  const handleCardNavigate = (
    cardId: string,
    targetTab: 'orders' | 'quotes' | 'products' | 'cariler' | 'invoices' | 'analytics' | 'diagnostics' | 'errors',
    filterSetup?: () => void
  ) => {
    setClickedCardId(cardId);
    if (filterSetup) {
      filterSetup();
    }
    setActiveTab(targetTab);
    setHighlightSection(targetTab);

    // Smooth scroll down to the content section
    setTimeout(() => {
      if (contentSectionRef.current) {
        contentSectionRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    }, 60);

    // Clear click state
    setTimeout(() => {
      setClickedCardId(null);
    }, 800);

    // Clear highlight ring
    setTimeout(() => {
      setHighlightSection(null);
    }, 2500);
  };

  // Tracking number modal / prompt
  const [activeTrackingOrderId, setActiveTrackingOrderId] = useState<string | null>(null);
  const [trackingNumberInput, setTrackingNumberInput] = useState('');
  const [decryptedNotes, setDecryptedNotes] = useState<Record<string, string>>({});

  // Quick stats
  const totalRevenue = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((acc, o) => acc + o.total, 0);
  const pendingOrdersCount = (orders || []).filter(o => o.status === 'pending').length;
  const pendingQuotesCount = (quotes || []).filter(q => q.status === 'pending_review').length;
  const offerSentQuotesCount = (quotes || []).filter(q => q.status === 'offer_sent').length;
  const lowStockProducts = products.filter(p => p.stock <= lowStockThreshold);
  const totalPendingActions = pendingOrdersCount + pendingQuotesCount + (lowStockProducts.length > 0 ? 1 : 0);

  // Trigger manual low stock check & send notifications
  const handleTriggerLowStockAlarm = async () => {
    setIsCheckingLowStock(true);
    try {
      const res = await fetch('/api/products/check-low-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threshold: lowStockThreshold }),
      });
      const data = await res.json();
      if (res.ok) {
        playNotificationSound('alert');
        setLowStockFeedback(`Alarm taraması tamamlandı: ${data.lowStockCount} ürün kritik eşikte (≤ ${lowStockThreshold}). ${data.alertsCreated} yeni bildirim üretildi.`);
        onRefresh();
      }
    } catch (e) {
      console.error('Error checking low stock:', e);
    } finally {
      setIsCheckingLowStock(false);
    }
  };

  // Quick restock single product
  const handleQuickRestock = async (product: Product, addQty: number) => {
    setRestockLoadingId(product.id);
    try {
      const newStock = product.stock + addQty;
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...product, stock: newStock }),
      });
      if (res.ok) {
        playNotificationSound('success');
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRestockLoadingId(null);
    }
  };

  // Batch restock all low stock products (+50)
  const handleBatchRestockAllLow = async (addQty: number = 50) => {
    if (lowStockProducts.length === 0) return;
    if (!confirm(`Eşik değeri (≤ ${lowStockThreshold}) altındaki toplam ${lowStockProducts.length} adet ürüne +${addQty} adet stok eklemek istiyor musunuz?`)) return;

    try {
      const updates = lowStockProducts.map(p => ({
        id: p.id,
        stock: p.stock + addQty,
      }));
      const res = await fetch('/api/products/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      if (res.ok) {
        playNotificationSound('success');
        confetti({ particleCount: 40, spread: 60, origin: { y: 0.5 } });
        setLowStockFeedback(`Tüm kritik stoklu ${lowStockProducts.length} ürüne +${addQty} adet stok başarıyla eklendi.`);
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus, trackingNo?: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, trackingNumber: trackingNo }),
      });

      if (res.ok) {
        if (newStatus === 'approved' || newStatus === 'shipped') {
          confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } });
        }
        playNotificationSound('status');
        updateOrderStatusInFirestore(orderId, newStatus).catch(e => console.warn('Firestore status update note:', e));
        onRefresh();
      }
    } catch (e) {
      console.error('Error updating order status:', e);
    }
  };

  const handleDecryptNote = async (orderId: string, encryptedPayload: string) => {
    const dec = await decryptPayload(encryptedPayload);
    setDecryptedNotes(prev => ({ ...prev, [orderId]: dec }));
  };

  // Toplu Fiyat ve İskonto Güncelleme Handler
  const handleApplyBulkPriceAdjustment = async (updatedProducts: Product[], message: string) => {
    try {
      const updates = updatedProducts.map(p => ({
        id: p.id,
        price: p.price,
        wholesalePrice: p.wholesalePrice,
      }));
      const res = await fetch('/api/products/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      if (res.ok) {
        playNotificationSound('success');
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.5 } });
        onRefresh();
      } else {
        throw new Error('Fiyatlar kaydedilemedi');
      }
    } catch (e: any) {
      console.error(e);
      throw e;
    }
  };

  // Tedarikçi Satın Alma Siparişi Mal Kabul / Stok İkmal Handler
  const handleApplySupplierRestock = async (restockItems: Array<{ id: string; quantity: number }>) => {
    try {
      const productMap = new Map(products.map(p => [p.id, p]));
      const updates = restockItems.map(item => {
        const currentProd = productMap.get(item.id);
        const currentStock = currentProd ? currentProd.stock : 0;
        return {
          id: item.id,
          stock: currentStock + item.quantity,
        };
      });

      const res = await fetch('/api/products/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });

      if (res.ok) {
        playNotificationSound('success');
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.5 } });
        onRefresh();
      } else {
        throw new Error('Stoklar güncellenemedi');
      }
    } catch (e: any) {
      console.error(e);
      throw e;
    }
  };

  // Depo Sevkiyat & Çeki Listesi Tamamlama Handler
  const handleCompleteShipment = async (orderId: string, trackingNumber: string, carrier: string) => {
    try {
      await handleUpdateOrderStatus(orderId, 'shipped', trackingNumber);
      playNotificationSound('success');
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  // Hızlı POS Kasa Sipariş Oluşturma Handler
  const handlePosSaleComplete = async (saleData: {
    customerName: string;
    customerPhone?: string;
    cariId?: string;
    paymentMethod: 'Nakit' | 'Kredi Kartı' | 'Cari Hesap' | 'Havale/EFT';
    items: Array<{ productId: string; quantity: number; unitPrice: number; totalPrice: number }>;
    totalAmount: number;
    discountAmount: number;
    paidAmount: number;
    changeAmount: number;
  }) => {
    try {
      const orderPayload: Partial<Order> = {
        orderNumber: `KASA-${Date.now().toString().slice(-6)}`,
        customerName: saleData.customerName,
        customerPhone: saleData.customerPhone || '5550000000',
        customerAddress: 'Hızlı Kasa / Tezgah Satışı',
        total: saleData.totalAmount,
        status: 'delivered',
        paymentMethod: saleData.paymentMethod,
        notes: `Hızlı POS Kasa Satışı - Ödeme: ${saleData.paymentMethod} (İskonto: ₺${saleData.discountAmount})`,
        items: saleData.items.map(it => {
          const prod = products.find(p => p.id === it.productId);
          return {
            productId: it.productId,
            productName: prod ? prod.name : 'Ürün',
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            totalPrice: it.totalPrice,
            unit: prod?.unit || 'ADET'
          };
        })
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });
      if (res.ok) {
        playNotificationSound('success');
        confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
        onRefresh();
      } else {
        throw new Error('Kasa satışı oluşturulamadı.');
      }
    } catch (e: any) {
      console.error(e);
      throw e;
    }
  };

  // Toplu Excel Ürün ve Fiyat İçe Aktarma Handler
  const handleApplyBulkImportProducts = async (importedProducts: any[]) => {
    try {
      const res = await fetch('/api/products/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: importedProducts }),
      });
      if (res.ok) {
        playNotificationSound('success');
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.5 } });
        onRefresh();
      } else {
        throw new Error('Toplu ürünler kaydedilemedi.');
      }
    } catch (e: any) {
      console.error(e);
      throw e;
    }
  };

  // Şoför Sevkiyat Rota Toplu Sipariş Durum Güncelleme
  const handleMarkOrdersShipped = async (orderIds: string[], trackingPrefix?: string) => {
    try {
      for (const id of orderIds) {
        await handleUpdateOrderStatus(id, 'shipped', `${trackingPrefix || 'SEVK'}-${Date.now().toString().slice(-4)}`);
      }
      playNotificationSound('success');
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.5 } });
      onRefresh();
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const getOrderStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-2.5 py-1 rounded-full bg-bg-warning text-warning-text border border-warning-border text-xs font-bold flex items-center space-x-1 animate-pulse">
            <Clock className="w-3 h-3 text-warning-text" />
            <span>Yeni Sipariş (Onay Bekliyor)</span>
          </span>
        );
      case 'approved':
        return (
          <span className="px-2.5 py-1 rounded-full bg-bg-success text-success-text border border-success-border text-xs font-semibold flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3 text-success-text" />
            <span>Onaylandı</span>
          </span>
        );
      case 'preparing':
        return (
          <span className="px-2.5 py-1 rounded-full bg-base-surface-2 text-text-primary border border-border text-xs font-semibold flex items-center space-x-1">
            <Package className="w-3 h-3 text-text-secondary" />
            <span>Hazırlanıyor</span>
          </span>
        );
      case 'shipped':
        return (
          <span className="px-2.5 py-1 rounded-full bg-bg-warning text-warning-text border border-warning-border text-xs font-semibold flex items-center space-x-1">
            <Truck className="w-3 h-3 text-warning-text" />
            <span>Kargoda</span>
          </span>
        );
      case 'delivered':
        return (
          <span className="px-2.5 py-1 rounded-full bg-bg-info text-info-text border border-info-border text-xs font-semibold flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3 text-info-text" />
            <span>Teslim Edildi</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-1 rounded-full bg-bg-danger text-danger-text border border-danger-border text-xs font-semibold">
            İptal
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Bekleyen Aksiyonlar & Hızlı Yönetim Masası */}
      <div className="bg-base-surface p-4 sm:p-5 rounded-3xl border border-border shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h2 className="text-sm font-extrabold text-text-primary tracking-tight flex items-center space-x-2">
              <span>Bekleyen Aksiyonlar</span>
              {totalPendingActions > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-bg-danger text-danger-text text-[11px] font-mono font-bold border border-danger-border">
                  {totalPendingActions} Öncelikli İşlem
                </span>
              )}
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowCameraScannerModal(true)}
              className="px-3 py-1.5 rounded-xl bg-info-fill/15 hover:bg-info-fill/25 text-info-text border border-info-border text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Kamera ile canlı barkod / QR okuma ve depo stok sayım masası"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Kamera Barkod Okuyucu</span>
            </button>
            <span className="text-[11px] text-text-muted hidden md:inline-block">
              Tek tıkla yönetim paneline geçiş yapın
            </span>
          </div>
        </div>

        {/* Action Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* 1. Bekleyen Siparişler */}
          <div 
            id="card-pending-orders"
            role="button"
            tabIndex={0}
            onClick={() => {
              handleCardNavigate('pending-orders', 'orders', () => setOrderStatusFilter('pending'));
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleCardNavigate('pending-orders', 'orders', () => setOrderStatusFilter('pending'));
              }
            }}
            className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 cursor-pointer select-none active:scale-[0.97] ${
              clickedCardId === 'pending-orders'
                ? 'ring-4 ring-warning-border scale-[0.98] bg-bg-warning shadow-lg'
                : activeTab === 'orders' && orderStatusFilter === 'pending'
                ? 'bg-bg-warning/80 border-warning-border ring-2 ring-warning-border shadow-sm'
                : 'bg-base-surface-2 border-border hover:border-warning-border hover:bg-bg-warning/20'
            }`}
            title="Onay bekleyen siparişlere kaydır ve incele"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-secondary font-bold flex items-center space-x-1.5">
                <span>Bekleyen Siparişler</span>
                {pendingOrdersCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-warning-fill animate-pulse" />
                )}
              </span>
              <div className={`p-1.5 sm:p-2 rounded-xl border transition-transform ${
                clickedCardId === 'pending-orders' ? 'scale-110' : ''
              } ${
                pendingOrdersCount > 0
                  ? 'bg-bg-warning text-warning-text border-warning-border'
                  : 'bg-base-surface text-text-muted border-border'
              }`}>
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-warning-text mt-1.5 font-mono">
              {pendingOrdersCount} <span className="text-xs font-sans font-bold text-text-muted">Sipariş</span>
            </div>
            <div className="flex items-center justify-between mt-1 text-[11px]">
              <span className="text-text-muted font-medium">Onay & Hazırlık</span>
              <span className="text-warning-text font-bold">
                {pendingOrdersCount > 0 ? 'İşlem Bekliyor' : 'Hazır'}
              </span>
            </div>
          </div>

          {/* 2. Bekleyen Teklif Talepleri */}
          <div 
            id="card-pending-quotes"
            role="button"
            tabIndex={0}
            onClick={() => {
              handleCardNavigate('pending-quotes', 'quotes', () => setQuoteStatusFilter('pending_review'));
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleCardNavigate('pending-quotes', 'quotes', () => setQuoteStatusFilter('pending_review'));
              }
            }}
            className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 cursor-pointer select-none active:scale-[0.97] ${
              clickedCardId === 'pending-quotes'
                ? 'ring-4 ring-warning-border scale-[0.98] bg-bg-warning shadow-lg'
                : activeTab === 'quotes' && quoteStatusFilter === 'pending_review'
                ? 'bg-bg-warning/80 border-warning-border ring-2 ring-warning-border shadow-sm'
                : 'bg-base-surface-2 border-border hover:border-warning-border hover:bg-bg-warning/20'
            }`}
            title="Fiyatlandırma bekleyen teklif taleplerine kaydır"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-secondary font-bold flex items-center space-x-1.5">
                <span>Bekleyen Teklifler</span>
                {pendingQuotesCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-warning-fill animate-ping" />
                )}
              </span>
              <div className={`p-1.5 sm:p-2 rounded-xl border transition-transform ${
                clickedCardId === 'pending-quotes' ? 'scale-110' : ''
              } ${
                pendingQuotesCount > 0
                  ? 'bg-bg-warning text-warning-text border-warning-border'
                  : 'bg-base-surface text-text-muted border-border'
              }`}>
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-warning-text mt-1.5 font-mono">
              {pendingQuotesCount} <span className="text-xs font-sans font-bold text-text-muted">Talep</span>
            </div>
            <div className="flex items-center justify-between mt-1 text-[11px]">
              <span className="text-text-muted font-medium">Fiyatlandırma Bekliyor</span>
              <span className="text-warning-text font-bold">
                {pendingQuotesCount > 0 ? 'Fiyatlandır' : 'Tamamlandı'}
              </span>
            </div>
          </div>

          {/* 3. Müşteri Yanıtı Bekleyen Teklifler */}
          <div 
            id="card-offer-sent-quotes"
            role="button"
            tabIndex={0}
            onClick={() => {
              handleCardNavigate('offer-sent-quotes', 'quotes', () => setQuoteStatusFilter('offer_sent'));
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleCardNavigate('offer-sent-quotes', 'quotes', () => setQuoteStatusFilter('offer_sent'));
              }
            }}
            className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 cursor-pointer select-none active:scale-[0.97] ${
              clickedCardId === 'offer-sent-quotes'
                ? 'ring-4 ring-info-border scale-[0.98] bg-bg-info shadow-lg'
                : activeTab === 'quotes' && quoteStatusFilter === 'offer_sent'
                ? 'bg-bg-info/80 border-info-border ring-2 ring-info-border shadow-sm'
                : 'bg-base-surface-2 border-border hover:border-info-border hover:bg-bg-info/20'
            }`}
            title="Müşteriye iletilen tekliflere kaydır"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-secondary font-bold flex items-center space-x-1.5">
                <span>İletilen Teklifler</span>
                {offerSentQuotesCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-info-fill" />
                )}
              </span>
              <div className={`p-1.5 sm:p-2 rounded-xl border transition-transform ${
                clickedCardId === 'offer-sent-quotes' ? 'scale-110' : ''
              } ${
                offerSentQuotesCount > 0
                  ? 'bg-bg-info text-info-text border-info-border'
                  : 'bg-base-surface text-text-muted border-border'
              }`}>
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-info-text mt-1.5 font-mono">
              {offerSentQuotesCount} <span className="text-xs font-sans font-bold text-text-muted">Hazır Teklif</span>
            </div>
            <div className="flex items-center justify-between mt-1 text-[11px]">
              <span className="text-text-muted font-medium">Müşteri Onayında</span>
              <span className="text-info-text font-bold">
                {offerSentQuotesCount > 0 ? 'Takipte' : 'Aktif Yok'}
              </span>
            </div>
          </div>

          {/* 4. Düşük Stok Alarmları */}
          <div 
            id="card-low-stock-alert"
            role="button"
            tabIndex={0}
            onClick={() => {
              if (lowStockProducts.length > 0) {
                setShowLowStockModal(true);
              } else {
                handleCardNavigate('low-stock', 'products');
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                if (lowStockProducts.length > 0) setShowLowStockModal(true);
                else handleCardNavigate('low-stock', 'products');
              }
            }}
            className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 cursor-pointer select-none active:scale-[0.97] ${
              clickedCardId === 'low-stock'
                ? 'ring-4 ring-danger-border scale-[0.98] bg-bg-danger shadow-lg'
                : lowStockProducts.length > 0 
                ? 'bg-bg-danger/80 border-danger-border hover:bg-bg-danger ring-1 ring-danger-border' 
                : 'bg-base-surface-2 border-border hover:border-border-strong'
            }`}
            title="Düşük stok detaylarını incele ve hızlı ikmal yap"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-secondary font-bold flex items-center space-x-1.5">
                <span>Düşük Stok</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-base-surface text-text-secondary font-mono border border-border">≤{lowStockThreshold}</span>
              </span>
              <div className={`p-1.5 sm:p-2 rounded-xl border ${
                lowStockProducts.length > 0 
                  ? 'bg-bg-danger text-danger-text border-danger-border animate-pulse' 
                  : 'bg-base-surface text-text-muted border-border'
              }`}>
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className={`text-xl sm:text-2xl font-black mt-1.5 font-mono ${
              lowStockProducts.length > 0 ? 'text-danger-text' : 'text-text-primary'
            }`}>
              {lowStockProducts.length} <span className="text-xs font-sans font-bold text-text-muted">Kritik Ürün</span>
            </div>
            <div className="flex items-center justify-between mt-1 text-[11px]">
              <span className={lowStockProducts.length > 0 ? 'text-danger-text font-semibold' : 'text-text-muted'}>
                {lowStockProducts.length > 0 ? 'Hızlı İkmal ➔' : 'Stoklar Yeterli'}
              </span>
              <span className="text-text-muted">Toplam: {products.length}</span>
            </div>
          </div>

        </div>
      </div>

      {/* Overview Analytics Bar (Toplam Sipariş & Aktif Ürün Adacıkları) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        
        {/* Toplam Sipariş / Ciro Adacığı */}
        <div 
          id="card-total-orders-island"
          role="button"
          tabIndex={0}
          onClick={() => {
            handleCardNavigate('total-orders-island', 'orders', () => setOrderStatusFilter('all'));
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleCardNavigate('total-orders-island', 'orders', () => setOrderStatusFilter('all'));
            }
          }}
          className={`p-4 rounded-2xl border shadow-xs transition-all duration-200 cursor-pointer select-none active:scale-[0.98] flex items-center justify-between ${
            clickedCardId === 'total-orders-island'
              ? 'ring-4 ring-success-border scale-[0.98] bg-bg-success shadow-lg'
              : activeTab === 'orders' && orderStatusFilter === 'all'
              ? 'bg-bg-success/80 border-success-border ring-2 ring-success-border'
              : 'bg-base-surface border-border hover:border-success-border hover:bg-bg-success/20'
          }`}
          title="Tüm sipariş yönetimi listesine kaydır"
        >
          <div className="flex items-center space-x-3.5">
            <div className={`p-3 rounded-2xl border transition-transform ${
              clickedCardId === 'total-orders-island' ? 'scale-110' : ''
            } bg-bg-success text-success-text border-success-border shadow-2xs`}>
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-text-secondary">Toplam Sipariş & Ciro</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-bg-success text-success-text border border-success-border font-mono font-bold">Canlı Siparişler</span>
              </div>
              <div className="text-xl font-black text-success-text font-mono mt-0.5">
                {totalRevenue.toLocaleString('tr-TR')} ₺
              </div>
              <p className="text-[11px] text-text-muted mt-0.5 font-medium">
                {orders.length} Adet Kayıtlı Sipariş
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-xs font-bold text-success-text block">
              Siparişleri İncele
            </span>
            <span className="block text-[10px] text-text-muted mt-0.5">Yönetim Masası</span>
          </div>
        </div>

        {/* Aktif Ürün Adacığı */}
        <div 
          id="card-active-products-island"
          role="button"
          tabIndex={0}
          onClick={() => {
            handleCardNavigate('active-products-island', 'products', () => setSearchFilter(''));
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleCardNavigate('active-products-island', 'products', () => setSearchFilter(''));
            }
          }}
          className={`p-4 rounded-2xl border shadow-xs transition-all duration-200 cursor-pointer select-none active:scale-[0.98] flex items-center justify-between ${
            clickedCardId === 'active-products-island'
              ? 'ring-4 ring-border-strong scale-[0.98] bg-base-surface-2 shadow-lg'
              : activeTab === 'products'
              ? 'bg-base-surface-2 border-border-strong ring-2 ring-border-strong'
              : 'bg-base-surface border-border hover:border-border-strong hover:bg-base-surface-2/60'
          }`}
          title="Aktif ürün kataloğu ve fiyat tablosuna kaydır"
        >
          <div className="flex items-center space-x-3.5">
            <div className={`p-3 rounded-2xl border transition-transform ${
              clickedCardId === 'active-products-island' ? 'scale-110' : ''
            } bg-base-surface-2 text-text-primary border-border shadow-2xs`}>
              <Package className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-text-secondary">Aktif Ürün Kataloğu & Fiyatlar</span>
              <div className="text-xl font-black text-text-primary font-mono mt-0.5">
                {products.length} <span className="text-xs font-sans font-bold text-text-muted">Ürün Tanımlı</span>
              </div>
              <p className="text-[11px] text-text-muted mt-0.5 font-medium">Kategori, stok ve KDV yönetimi</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-xs font-bold text-text-primary block">
              Kataloğu Yönet
            </span>
            <span className="block text-[10px] text-text-muted mt-0.5">Fiyat & Stok</span>
          </div>
        </div>

      </div>

      {/* Prominent Low Stock Alert Banner (Real-time & threshold driven) */}
      {lowStockProducts.length > 0 && (
        <div className="p-4 bg-bg-danger/40 border-2 border-danger-border rounded-2xl shadow-sm space-y-3 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-danger-fill text-base shadow-xs animate-bounce shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2 flex-wrap">
                  <h3 className="font-extrabold text-sm text-danger-text">
                    🚨 Otomatik 'Düşük Stok' Alarmı Aktif
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-bg-danger text-danger-text font-bold text-xs border border-danger-border">
                    {lowStockProducts.length} Üründe Stok Kritik (≤ {lowStockThreshold} Adet)
                  </span>
                </div>
                <p className="text-xs text-text-secondary mt-0.5">
                  Sipariş ve satış akışında stok tükenmesi riskini önlemek için aşağıdaki ürünlere hızlı ikmal yapabilir veya sistem alarmı gönderebilirsiniz.
                </p>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={() => setShowLowStockModal(true)}
                className="px-3.5 py-1.5 bg-danger-fill hover:opacity-90 text-base rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Kritik Ürünleri İncele & İkmal Et</span>
              </button>

              <button
                onClick={() => setActiveTab('products')}
                className="px-3 py-1.5 bg-base-surface hover:bg-base-surface-2 text-text-primary border border-border rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                <span>Ürün Tablosunda Aç</span>
              </button>

              <button
                onClick={handleTriggerLowStockAlarm}
                disabled={isCheckingLowStock}
                className="px-3 py-1.5 bg-warning-fill hover:opacity-90 text-base rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                title="Sisteme yeni bildirim alarmı fırlat"
              >
                <BellRing className="w-3.5 h-3.5" />
                <span>{isCheckingLowStock ? 'Taranıyor...' : 'Alarm Bildirimi Gönder'}</span>
              </button>
            </div>
          </div>

          {/* Quick Preview Chips of Top Low Stock Products */}
          <div className="pt-2 border-t border-danger-border/50 flex items-center gap-2 overflow-x-auto custom-scrollbar text-xs">
            <span className="text-text-muted font-bold text-[11px] shrink-0">En Kritikler:</span>
            {lowStockProducts.slice(0, 8).map(p => (
              <div key={p.id} className="flex items-center space-x-1.5 bg-base-surface px-2.5 py-1 rounded-lg border border-border shrink-0 shadow-xs">
                <span className="font-semibold text-text-primary truncate max-w-[140px]">{p.name}</span>
                <span className="font-mono font-bold text-danger-text bg-bg-danger px-1.5 py-0.2 rounded text-[10px] border border-danger-border">
                  {p.stock} {p.unit}
                </span>
                <button
                  type="button"
                  onClick={() => handleQuickRestock(p, 50)}
                  disabled={restockLoadingId === p.id}
                  className="text-[10px] font-bold text-success-text bg-bg-success hover:opacity-90 px-1.5 py-0.5 rounded transition-colors cursor-pointer border border-success-border"
                  title="+50 Adet Hızlı İkmal"
                >
                  {restockLoadingId === p.id ? '...' : '+50'}
                </button>
              </div>
            ))}
            {lowStockProducts.length > 8 && (
              <button 
                onClick={() => setShowLowStockModal(true)}
                className="text-danger-text font-bold text-[11px] hover:underline shrink-0"
              >
                +{lowStockProducts.length - 8} ürün daha ➔
              </button>
            )}
          </div>
        </div>
      )}

      {/* Feedback Banner */}
      {lowStockFeedback && (
        <div className="p-3 bg-bg-success border border-success-border text-success-text rounded-xl text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-success-text shrink-0" />
            <span>{lowStockFeedback}</span>
          </div>
          <button onClick={() => setLowStockFeedback(null)} className="text-success-text font-bold hover:underline cursor-pointer">
            Kapat
          </button>
        </div>
      )}

      {/* Sektörel Hızlı Aksiyon & Entegrasyon Masası */}
      <div className="bg-base-surface p-3 sm:p-4 rounded-2xl border border-border shadow-md">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center space-x-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold text-text-primary uppercase tracking-wider">
              ALPHA HIZLI OPERASYON MASASI
            </span>
          </div>
          <span className="text-[11px] text-text-secondary font-medium hidden sm:inline">
            Tesisat & Hırdavat Operasyon Modülleri
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-9 gap-2">
          {/* POS Kasa */}
          <button
            onClick={() => setShowPosModal(true)}
            className="p-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 flex items-center space-x-2 transition-all cursor-pointer group text-left"
          >
            <div className="p-1.5 rounded-lg bg-emerald-500/30 group-hover:scale-110 transition-transform">
              <ShoppingBag className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">Hızlı POS Kasa</div>
              <div className="text-[10px] text-emerald-400/80 truncate">Barkod & Perakende</div>
            </div>
          </button>

          {/* Havale & Dekont Onay Masası */}
          <button
            onClick={() => setShowReceiptVerificationModal(true)}
            className="p-2.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 flex items-center space-x-2 transition-all cursor-pointer group text-left"
          >
            <div className="p-1.5 rounded-lg bg-amber-500/30 group-hover:scale-110 transition-transform">
              <Receipt className="w-4 h-4 text-amber-400" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">Dekont Onay</div>
              <div className="text-[10px] text-amber-400/80 truncate">Havale / EFT Eşleme</div>
            </div>
          </button>

          {/* WMS Depo Toplama (Picking) */}
          <button
            onClick={() => {
              setSelectedOrderForPicking(null);
              setShowPickingInspectionModal(true);
            }}
            className="p-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 flex items-center space-x-2 transition-all cursor-pointer group text-left"
          >
            <div className="p-1.5 rounded-lg bg-indigo-500/30 group-hover:scale-110 transition-transform">
              <Barcode className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">WMS Toplama</div>
              <div className="text-[10px] text-indigo-400/80 truncate">Barkod / Raf Sayım</div>
            </div>
          </button>

          {/* Stok Yaşlandırma & B2B İskonto Matrisi */}
          <button
            onClick={() => setShowAgingAndDiscountModal(true)}
            className="p-2.5 rounded-xl bg-teal-600/20 hover:bg-teal-600/30 border border-teal-500/40 text-teal-300 flex items-center space-x-2 transition-all cursor-pointer group text-left"
          >
            <div className="p-1.5 rounded-lg bg-teal-500/30 group-hover:scale-110 transition-transform">
              <Clock className="w-4 h-4 text-teal-400" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">Stok Yaşlandırma</div>
              <div className="text-[10px] text-teal-400/80 truncate">B2B İskonto Matrisi</div>
            </div>
          </button>

          {/* Excel / CSV Import */}
          <button
            onClick={() => setShowBulkExcelModal(true)}
            className="p-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 flex items-center space-x-2 transition-all cursor-pointer group text-left"
          >
            <div className="p-1.5 rounded-lg bg-blue-500/30 group-hover:scale-110 transition-transform">
              <FileSpreadsheet className="w-4 h-4 text-blue-400" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">Excel Stok / Fiyat</div>
              <div className="text-[10px] text-blue-400/80 truncate">Toplu İçe / Dışa Aktar</div>
            </div>
          </button>

          {/* Şoför Rota Sevkiyat */}
          <button
            onClick={() => setShowDriverDispatchModal(true)}
            className="p-2.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 flex items-center space-x-2 transition-all cursor-pointer group text-left"
          >
            <div className="p-1.5 rounded-lg bg-amber-500/30 group-hover:scale-110 transition-transform">
              <Truck className="w-4 h-4 text-amber-400" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">Şoför Sevkiyat</div>
              <div className="text-[10px] text-amber-400/80 truncate">Rota & Teslim Çizelgesi</div>
            </div>
          </button>

          {/* Müşteri Grupları & İskonto */}
          <button
            onClick={() => setShowCustomerTierModal(true)}
            className="p-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 flex items-center space-x-2 transition-all cursor-pointer group text-left"
          >
            <div className="p-1.5 rounded-lg bg-purple-500/30 group-hover:scale-110 transition-transform">
              <Tag className="w-4 h-4 text-purple-400" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">Müşteri Grupları</div>
              <div className="text-[10px] text-purple-400/80 truncate">Usta & Bayi İskontosu</div>
            </div>
          </button>

          {/* Toplu Fiyatlandırma Motoru */}
          <button
            onClick={() => setShowBulkPriceModal(true)}
            className="p-2.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 flex items-center space-x-2 transition-all cursor-pointer group text-left"
          >
            <div className="p-1.5 rounded-lg bg-cyan-500/30 group-hover:scale-110 transition-transform">
              <Percent className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">Fiyat Ayarlama</div>
              <div className="text-[10px] text-cyan-400/80 truncate">Zam / İskonto Motoru</div>
            </div>
          </button>

          {/* Tedarikçi Satın Alma (PO) */}
          <button
            onClick={() => setShowSupplierPOModal(true)}
            className="p-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 flex items-center space-x-2 transition-all cursor-pointer group text-left"
          >
            <div className="p-1.5 rounded-lg bg-rose-500/30 group-hover:scale-110 transition-transform">
              <FileText className="w-4 h-4 text-rose-400" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">Tedarikçi (PO)</div>
              <div className="text-[10px] text-rose-400/80 truncate">Otomatik Mal Kabul</div>
            </div>
          </button>
        </div>
      </div>

      {/* Admin Tab Navigation & Actions */}
      <div className="bg-base-surface p-2.5 sm:p-3 rounded-2xl border border-border shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-2">
          
          {/* Tab 1: Siparişler */}
          <button
            id="tab-admin-orders"
            onClick={() => setActiveTab('orders')}
            className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              activeTab === 'orders'
                ? 'bg-bg-success text-success-text border-success-border shadow-xs ring-1 ring-success-border'
                : 'bg-base-surface-2/60 hover:bg-base-surface-2 text-text-secondary hover:text-text-primary border-border/40'
            }`}
            title="Müşteri ve Bayi Siparişleri"
          >
            <div className="flex items-center space-x-2 min-w-0">
              <ShoppingBag className={`w-4 h-4 shrink-0 ${activeTab === 'orders' ? 'text-success-text' : 'text-text-secondary'}`} />
              <span className="truncate">Siparişler</span>
            </div>
            <div className="flex items-center space-x-1 shrink-0 ml-1">
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                activeTab === 'orders' ? 'bg-success-fill/20 text-success-text' : 'bg-base-surface text-text-muted border border-border/50'
              }`}>
                {orders.length}
              </span>
              {pendingOrdersCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-warning-fill text-base text-[9px] font-extrabold animate-pulse">
                  {pendingOrdersCount}
                </span>
              )}
            </div>
          </button>

          {/* Tab 2: Pratik Teklif Masası */}
          <button
            id="tab-admin-quotes"
            onClick={() => setActiveTab('quotes')}
            className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              activeTab === 'quotes'
                ? 'bg-bg-warning text-warning-text border-warning-border shadow-xs ring-1 ring-warning-border'
                : 'bg-base-surface-2/60 hover:bg-base-surface-2 text-text-secondary hover:text-text-primary border-border/40'
            }`}
            title="Özel Fiyat Teklif Talepleri & AI Fiyatlandırma"
          >
            <div className="flex items-center space-x-2 min-w-0">
              <FileText className={`w-4 h-4 shrink-0 ${activeTab === 'quotes' ? 'text-warning-text' : 'text-text-secondary'}`} />
              <span className="truncate">Teklif Masası</span>
            </div>
            <div className="flex items-center space-x-1 shrink-0 ml-1">
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                activeTab === 'quotes' ? 'bg-warning-fill/20 text-warning-text' : 'bg-base-surface text-text-muted border border-border/50'
              }`}>
                {quotes.length}
              </span>
              {pendingQuotesCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-danger-fill text-base text-[9px] font-extrabold animate-pulse">
                  {pendingQuotesCount}
                </span>
              )}
            </div>
          </button>

          {/* Tab 3: Ürün & Stok */}
          <button
            id="tab-admin-products"
            onClick={() => setActiveTab('products')}
            className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              activeTab === 'products'
                ? 'bg-base-surface text-text-primary border-border-strong shadow-xs ring-1 ring-border-strong'
                : 'bg-base-surface-2/60 hover:bg-base-surface-2 text-text-secondary hover:text-text-primary border-border/40'
            }`}
            title="Ürün Fiyat, Stok ve Katalog Yönetimi"
          >
            <div className="flex items-center space-x-2 min-w-0">
              <Package className={`w-4 h-4 shrink-0 ${activeTab === 'products' ? 'text-text-primary' : 'text-text-secondary'}`} />
              <span className="truncate">Ürün & Stok</span>
            </div>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold shrink-0 ml-1 ${
              activeTab === 'products' ? 'bg-base-surface-2 text-text-primary border border-border' : 'bg-base-surface text-text-muted border border-border/50'
            }`}>
              {products.length}
            </span>
          </button>

          {/* Tab 4: Cariler (Borç/Alacak & Finans) */}
          <button
            id="tab-admin-cariler"
            onClick={() => setActiveTab('cariler')}
            className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              activeTab === 'cariler'
                ? 'bg-bg-info text-info-text border-info-border shadow-xs ring-1 ring-info-border'
                : 'bg-base-surface-2/60 hover:bg-base-surface-2 text-text-secondary hover:text-text-primary border-border/40'
            }`}
            title="Cari Hesaplar, Borç/Alacak Bakiyeleri ve Ekstreler"
          >
            <div className="flex items-center space-x-2 min-w-0">
              <Users className={`w-4 h-4 shrink-0 ${activeTab === 'cariler' ? 'text-info-text' : 'text-text-secondary'}`} />
              <span className="truncate">Cariler</span>
            </div>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold shrink-0 ml-1 ${
              activeTab === 'cariler' ? 'bg-info-fill/20 text-info-text' : 'bg-base-surface text-text-muted border border-border/50'
            }`}>
              Finans
            </span>
          </button>

          {/* Tab 5: E-Fatura & E-Arşiv (GİB Standartları) */}
          <button
            id="tab-admin-invoices"
            onClick={() => setActiveTab('invoices')}
            className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              activeTab === 'invoices'
                ? 'bg-danger-fill/15 text-danger-text border-danger-border shadow-xs ring-1 ring-danger-border'
                : 'bg-base-surface-2/60 hover:bg-base-surface-2 text-text-secondary hover:text-text-primary border-border/40'
            }`}
            title="Gelir İdaresi Başkanlığı GİB UBL-TR 2.1 E-Fatura ve E-Arşiv Yönetimi"
          >
            <div className="flex items-center space-x-2 min-w-0">
              <Receipt className={`w-4 h-4 shrink-0 ${activeTab === 'invoices' ? 'text-danger-text' : 'text-text-secondary'}`} />
              <span className="truncate">E-Fatura</span>
            </div>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold shrink-0 ml-1 ${
              activeTab === 'invoices' ? 'bg-danger-fill/25 text-danger-text' : 'bg-base-surface text-text-muted border border-border/50'
            }`}>
              GİB
            </span>
          </button>

          {/* Tab 6: D3 Satış Trendi & Analiz */}
          <button
            id="tab-admin-analytics"
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              activeTab === 'analytics'
                ? 'bg-bg-success text-success-text border-success-border shadow-xs ring-1 ring-success-border'
                : 'bg-base-surface-2/60 hover:bg-base-surface-2 text-text-secondary hover:text-text-primary border-border/40'
            }`}
            title="D3 Satış Trendi & Kategori Performans Analizleri"
          >
            <div className="flex items-center space-x-2 min-w-0">
              <BarChart3 className={`w-4 h-4 shrink-0 ${activeTab === 'analytics' ? 'text-success-text' : 'text-text-secondary'}`} />
              <span className="truncate">Satış Trendi</span>
            </div>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold shrink-0 ml-1 ${
              activeTab === 'analytics' ? 'bg-success-fill/20 text-success-text' : 'bg-base-surface text-text-muted border border-border/50'
            }`}>
              D3
            </span>
          </button>

          {/* Tab 7: Sistem Tanılama */}
          <button
            id="tab-admin-diagnostics"
            onClick={() => setActiveTab('diagnostics')}
            className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              activeTab === 'diagnostics'
                ? 'bg-bg-info text-info-text border-info-border shadow-xs ring-1 ring-info-border'
                : 'bg-base-surface-2/60 hover:bg-base-surface-2 text-text-secondary hover:text-text-primary border-border/40'
            }`}
            title="Veritabanı bağlantıları ve gerçek zamanlı SSE senkronizasyon durumunu incele"
          >
            <div className="flex items-center space-x-2 min-w-0">
              <Activity className={`w-4 h-4 shrink-0 ${activeTab === 'diagnostics' ? 'text-info-text animate-pulse' : 'text-text-secondary'}`} />
              <span className="truncate">Sistem Tanı</span>
            </div>
            <span className="flex items-center space-x-1 shrink-0 ml-1">
              <span className="w-2 h-2 rounded-full bg-success-fill animate-pulse"></span>
              <span className="text-[10px] text-text-muted font-medium">Canlı</span>
            </span>
          </button>

          {/* Tab 8: Hata Tespit & Onarım Merkezi (Fix It AI) */}
          <button
            id="tab-admin-errors"
            onClick={() => setActiveTab('errors')}
            className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              activeTab === 'errors'
                ? 'bg-bg-danger text-danger-text border-danger-border shadow-xs ring-1 ring-danger-border'
                : 'bg-base-surface-2/60 hover:bg-base-surface-2 text-text-secondary hover:text-text-primary border-border/40'
            }`}
            title="Kullanıcı arayüzü ve sistem hatalarını tespit et, Fix It ile AI onarımı yap"
          >
            <div className="flex items-center space-x-2 min-w-0">
              <Bug className={`w-4 h-4 shrink-0 ${activeTab === 'errors' ? 'text-danger-text animate-pulse' : 'text-text-secondary'}`} />
              <span className="truncate">Hata & Fix It</span>
            </div>
            <span className="flex items-center space-x-1 shrink-0 ml-1">
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-danger-fill/20 text-danger-text border border-danger-border/40">
                Fix It
              </span>
            </span>
          </button>

        </div>
      </div>

      {/* ACTIVE TAB CONTENT VIEW WRAPPER WITH SMOOTH SCROLL TARGET AND HIGHLIGHT */}
      <div 
        ref={contentSectionRef} 
        id="admin-active-content-section" 
        className={`transition-all duration-500 rounded-3xl ${
          highlightSection 
            ? 'ring-4 ring-offset-4 ring-offset-base ring-border-strong p-1 sm:p-2 bg-base-surface/30' 
            : ''
        }`}
      >
        {highlightSection && (
          <div className="mb-3 px-4 py-2 rounded-2xl bg-base-surface-2 border border-border-strong text-xs font-bold text-text-primary flex items-center justify-between animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-success-fill animate-pulse" />
              <span>
                {highlightSection === 'orders' && 'Sipariş Yönetimi Odaklandı'}
                {highlightSection === 'quotes' && 'Teklif Talepleri Masası Odaklandı'}
                {highlightSection === 'products' && 'Ürün Kataloğu & Fiyat Tablosu Odaklandı'}
                {highlightSection === 'cariler' && 'Cari Hesaplar & Finans Ekranı Odaklandı'}
                {highlightSection === 'invoices' && 'E-Fatura & E-Arşiv Masası Odaklandı'}
                {highlightSection === 'analytics' && 'Satış Trendi & Analiz Masası Odaklandı'}
                {highlightSection === 'diagnostics' && 'Sistem Tanı & Canlı Veri Odaklandı'}
                {highlightSection === 'errors' && 'Hata Tespit & Fix It Merkezi Odaklandı'}
              </span>
            </div>
            <span className="text-[11px] text-text-muted font-normal">Otomatik Kaydırıldı</span>
          </div>
        )}

        {/* TAB 1: ORDER MANAGEMENT */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-text-primary flex items-center space-x-2">
                <ShoppingBag className="w-5 h-5 text-success-text" />
                <span>Gelen Siparişler & Canlı Onay/Kargo Akışı</span>
              </h2>
              <span className="text-xs text-text-muted">
                Canlı güncellemeler otomatik olarak tüm kullanıcılara yansır.
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowSalesTrendWidget(prev => !prev)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                showSalesTrendWidget
                  ? 'bg-bg-success text-success-text border-success-border shadow-2xs'
                  : 'bg-base-surface text-text-secondary border-border hover:bg-base-surface-2'
              }`}
              title="D3 Son 7 Günlük Satış Performans Trendi grafiğini aç/kapat"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{showSalesTrendWidget ? 'Trend Grafiğini Gizle' : 'D3 Satış Trendini Göster'}</span>
            </button>
          </div>

          {/* D3 7-Day Sales Performance Trend Chart Widget */}
          {showSalesTrendWidget && (
            <SalesPerformanceTrendChart
              orders={orders}
              products={products}
              onSelectDate={(dateKey) => {
                setSelectedTrendDate(prev => prev === dateKey ? null : dateKey);
              }}
            />
          )}

          {/* Date Filter Active Notification */}
          {selectedTrendDate && (
            <div className="p-3 bg-bg-success border border-success-border text-success-text rounded-2xl text-xs flex items-center justify-between animate-in fade-in">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-success-text shrink-0" />
                <span>
                  Grafikten seçilen gün: <strong>{new Date(selectedTrendDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</strong> tarihli siparişler listeleniyor.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTrendDate(null)}
                className="px-2.5 py-1 bg-success-fill hover:opacity-90 text-base rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
              >
                Tüm Siparişleri Göster
              </button>
            </div>
          )}

          {/* Status Filter Active Notification */}
          {orderStatusFilter !== 'all' && (
            <div className="p-3 bg-bg-warning border border-warning-border text-warning-text rounded-2xl text-xs flex items-center justify-between animate-in fade-in">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-warning-text shrink-0" />
                <span>
                  Filtre Aktif: <strong>{orderStatusFilter === 'pending' ? 'Yalnızca Onay Bekleyen Siparişler' : orderStatusFilter}</strong> listeleniyor ({(orders || []).filter(o => o.status === orderStatusFilter).length} adet).
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOrderStatusFilter('all')}
                className="px-2.5 py-1 bg-warning-fill hover:opacity-90 text-base rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
              >
                Tüm Durumları Göster
              </button>
            </div>
          )}

          {(() => {
            const filteredOrders = (orders || []).filter(o => {
              if (orderStatusFilter !== 'all' && o.status !== orderStatusFilter) {
                return false;
              }
              if (selectedTrendDate) {
                const oDate = new Date(o.createdAt).toISOString().split('T')[0];
                if (oDate !== selectedTrendDate) return false;
              }
              if (searchFilter.trim()) {
                const q = searchFilter.toLowerCase();
                const matchNum = o.orderNumber.toLowerCase().includes(q);
                const matchName = o.customerName.toLowerCase().includes(q);
                const matchAddr = (o.customerAddress || '').toLowerCase().includes(q);
                if (!matchNum && !matchName && !matchAddr) return false;
              }
              return true;
            });

            if (filteredOrders.length === 0) {
              return (
                <div className="p-12 text-center bg-base-surface rounded-2xl border border-border text-text-muted text-xs shadow-xs space-y-2">
                  <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-30 text-text-muted" />
                  <p className="font-semibold text-text-primary">
                    {selectedTrendDate ? 'Seçili tarihte sipariş bulunamadı.' : 'Henüz gelen sipariş bulunmuyor.'}
                  </p>
                  {selectedTrendDate && (
                    <button
                      type="button"
                      onClick={() => setSelectedTrendDate(null)}
                      className="text-xs text-success-text font-bold hover:underline cursor-pointer"
                    >
                      Tüm günlerin siparişlerini listele ➔
                    </button>
                  )}
                </div>
              );
            }

            return (
              <div className="space-y-4">
                {filteredOrders.map(order => (
                <div
                  key={order.id}
                  id={`admin-order-${order.id}`}
                  className={`p-5 rounded-2xl border transition-all shadow-xs ${
                    order.status === 'pending'
                      ? 'bg-base-surface border-warning-border ring-1 ring-warning-border'
                      : 'bg-base-surface border-border'
                  }`}
                >
                  {/* Order Top Bar */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-border pb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-bg-success text-success-text border border-success-border flex items-center justify-center font-bold text-xs">
                        SIP
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-text-primary">{order.orderNumber}</span>
                          {getOrderStatusBadge(order.status)}
                          {order.sourceQuoteId && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-bg-warning text-warning-text border border-warning-border font-mono font-semibold">
                              Tekliften Üretildi
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-text-muted font-mono">
                          {new Date(order.createdAt).toLocaleString('tr-TR')}
                        </span>
                      </div>
                    </div>

                    {/* Status & Operational Action Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      {order.status === 'pending' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(order.id, 'approved')}
                          className="px-3.5 py-1.5 bg-success-fill hover:opacity-90 text-base rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-xs cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Siparişi Onayla</span>
                        </button>
                      )}

                      {order.status === 'approved' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(order.id, 'preparing')}
                          className="px-3.5 py-1.5 bg-base-surface-2 hover:bg-base-surface text-text-primary border border-border rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-xs cursor-pointer"
                        >
                          <Package className="w-3.5 h-3.5" />
                          <span>Hazırlanıyor Yap</span>
                        </button>
                      )}

                      {['approved', 'preparing'].includes(order.status) && (
                        <button
                          onClick={() => {
                            setActiveTrackingOrderId(order.id);
                            setTrackingNumberInput(`YK-${Math.floor(10000000 + Math.random() * 90000000)}TR`);
                          }}
                          className="px-3.5 py-1.5 bg-warning-fill hover:opacity-90 text-base rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-xs cursor-pointer"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Kargoya Ver (Takip No)</span>
                        </button>
                      )}

                      {order.status === 'shipped' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(order.id, 'delivered')}
                          className="px-3.5 py-1.5 bg-success-fill hover:opacity-90 text-base rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-xs cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Teslim Edildi Yap</span>
                        </button>
                      )}

                      {/* A4 PDF İrsaliye */}
                      <button
                        onClick={() => setSelectedOrderForPDF(order)}
                        className="px-2.5 py-1.5 bg-bg-success text-success-text border border-success-border rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer hover:opacity-90"
                        title="Resmi İrsaliye & Sipariş PDF Belgesi"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">A4 İrsaliye</span>
                      </button>

                      {/* WhatsApp Share */}
                      <button
                        onClick={() => {
                          setWhatsAppShareState({
                            isOpen: true,
                            title: `Sipariş #${order.orderNumber} - ${order.customerName}`,
                            defaultPhone: order.customerPhone || '',
                            defaultMessage: generateOrderWhatsAppMessage(order),
                            recipientName: order.customerName,
                          });
                        }}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
                        title="Müşteriye WhatsApp ile Sipariş Özeti ve Takip Kodu Gönder"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </button>

                      {/* Diğer İşlemler (WMS Toplama, Sevkiyat Çeki, Dekont, 80mm Fiş, E-Fatura, İptal) */}
                      <OrderActionDropdown
                        order={order}
                        onOpenPicking={() => {
                          setSelectedOrderForPicking(order);
                          setShowPickingInspectionModal(true);
                        }}
                        onOpenPacking={() => setSelectedOrderForPacking(order)}
                        onOpenReceipts={() => setShowReceiptVerificationModal(true)}
                        onPrintThermalReceipt={() => {
                          printThermalReceipt80mm({
                            title: 'ALPHA TEKNİK',
                            orderNumber: order.orderNumber || 'Sipariş',
                            customerName: order.customerName || 'Müşteri',
                            customerPhone: order.customerPhone,
                            items: (order.items || []).map(i => ({
                              name: i.productName || 'Ürün',
                              qty: i.quantity || 1,
                              unit: i.unit || 'ADET',
                              price: i.unitPrice || 0,
                              total: i.totalPrice || 0
                            })),
                            totalAmount: order.total || 0,
                            taxAmount: Math.round((order.total || 0) * (20 / 120)),
                            notes: order.trackingNumber ? `Kargo Takip: ${order.trackingNumber}` : undefined,
                            documentType: 'SIPARIS_FISI'
                          });
                        }}
                        onOpenInvoices={() => setActiveTab('invoices')}
                        onCancelOrder={order.status !== 'cancelled' && order.status !== 'delivered' ? () => handleUpdateOrderStatus(order.id, 'cancelled') : undefined}
                      />
                    </div>
                  </div>

                  {/* D3.js Canlı Sipariş Durum & Manuel İlerleme Akış Çizelgesi & Durum Geçmişi */}
                  <D3OrderStatusFlow
                    status={order.status}
                    orderId={order.id}
                    orderNumber={order.orderNumber}
                    trackingNumber={order.trackingNumber}
                    statusHistory={order.statusHistory}
                    createdAt={order.createdAt}
                    updatedAt={order.updatedAt}
                    isEditable={true}
                    showControls={true}
                    onStatusChange={async (newStatus, customTracking) => {
                      await handleUpdateOrderStatus(order.id, newStatus, customTracking);
                    }}
                  />

                  {/* Customer Info and Address */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 bg-base-surface-2 rounded-xl border border-border text-xs">
                    <div className="flex items-start space-x-2">
                      <User className="w-4 h-4 text-warning-text shrink-0 mt-0.5" />
                      <div>
                        <span className="text-text-muted block text-[10px]">Müşteri & Kurum:</span>
                        <strong className="text-text-primary">{order.customerName}</strong>
                        <div className="text-text-muted text-[11px]">{order.customerEmail}</div>
                      </div>
                    </div>

                    <div className="flex items-start space-x-2">
                      <Phone className="w-4 h-4 text-success-text shrink-0 mt-0.5" />
                      <div>
                        <span className="text-text-muted block text-[10px]">Telefon:</span>
                        <span className="text-text-secondary">{order.customerPhone}</span>
                        {order.trackingNumber && (
                          <div className="text-warning-text text-[11px] font-mono mt-0.5">
                            Takip: {order.trackingNumber}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start space-x-2">
                      <MapPin className="w-4 h-4 text-info-text shrink-0 mt-0.5" />
                      <div>
                        <span className="text-text-muted block text-[10px]">Teslimat Adresi:</span>
                        <span className="text-text-secondary leading-snug">{order.customerAddress}</span>
                      </div>
                    </div>
                  </div>

                  {/* Order Items Table */}
                  <div className="divide-y divide-border bg-base-surface-2 rounded-xl border border-border overflow-hidden text-xs">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="p-2.5 flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-text-primary">{item.productName}</span>
                          <span className="text-text-muted text-[11px] ml-2">
                            {item.quantity} {item.unit} x {item.unitPrice} ₺
                          </span>
                        </div>
                        <span className="font-bold text-success-text font-mono">
                          {(item.totalPrice || 0).toLocaleString('tr-TR')} ₺
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Pricing Footer & E2EE Note */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-2 border-t border-border text-xs">
                    <div>
                      {order.encryptedPayload ? (
                        <div className="flex items-center space-x-2">
                          <Lock className="w-3.5 h-3.5 text-success-text" />
                          <span className="text-text-muted text-[11px]">E2EE Şifreli Müşteri Notu:</span>
                          {decryptedNotes[order.id] ? (
                            <span className="text-success-text font-mono text-[11px] bg-bg-success border border-success-border px-2 py-0.5 rounded">
                              {decryptedNotes[order.id]}
                            </span>
                          ) : (
                            <button
                              onClick={() => handleDecryptNote(order.id, order.encryptedPayload!)}
                              className="text-[11px] text-success-text hover:underline font-semibold cursor-pointer"
                            >
                              (AES-256 Şifresini Çöz)
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-text-secondary">Not: {order.notes || 'Yok'}</span>
                      )}
                    </div>

                    <div className="flex items-baseline space-x-2">
                      <span className="text-text-muted">Genel Toplam (KDV Dahil):</span>
                      <span className="text-lg font-black text-success-text font-mono">
                        {(order.total || 0).toLocaleString('tr-TR')} ₺
                      </span>
                    </div>
                  </div>

                </div>
              ))}
            </div>
            );
          })()}
        </div>
      )}

      {/* TAB 2: QUOTES MANAGEMENT DESK */}
      {activeTab === 'quotes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-text-primary flex items-center space-x-2">
              <FileText className="w-5 h-5 text-warning-text" />
              <span>Gelen Teklif Talepleri & Hızlı Fiyatlandırma Masası</span>
            </h2>
            <span className="text-xs text-warning-text font-semibold bg-bg-warning px-2.5 py-1 rounded-lg border border-warning-border">
              Gemini 3.7 Flash AI Teklif Asistanı Entegre
            </span>
          </div>

          {/* Status Filter Active Notification */}
          {quoteStatusFilter !== 'all' && (
            <div className="p-3 bg-bg-warning border border-warning-border text-warning-text rounded-2xl text-xs flex items-center justify-between animate-in fade-in">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-warning-text shrink-0" />
                <span>
                  Filtre Aktif: <strong>{quoteStatusFilter === 'pending_review' ? 'Yalnızca Fiyatlandırma Bekleyen Talepler' : quoteStatusFilter}</strong> listeleniyor ({(quotes || []).filter(q => q.status === quoteStatusFilter).length} talep).
                </span>
              </div>
              <button
                type="button"
                onClick={() => setQuoteStatusFilter('all')}
                className="px-2.5 py-1 bg-warning-fill hover:opacity-90 text-base rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
              >
                Tüm Talepleri Göster
              </button>
            </div>
          )}

          {(() => {
            const filteredQuotes = quotes.filter(q => {
              if (quoteStatusFilter !== 'all' && q.status !== quoteStatusFilter) {
                return false;
              }
              return true;
            });

            if (filteredQuotes.length === 0) {
              return (
                <div className="p-12 text-center bg-base-surface rounded-2xl border border-border text-text-muted text-xs shadow-xs space-y-2">
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-30 text-text-muted" />
                  <p>{quoteStatusFilter !== 'all' ? 'Filtreye uygun teklif talebi bulunamadı.' : 'Henüz teklif talebi bulunmuyor.'}</p>
                  {quoteStatusFilter !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setQuoteStatusFilter('all')}
                      className="text-xs text-warning-text font-bold hover:underline cursor-pointer"
                    >
                      Tüm talepleri göster ➔
                    </button>
                  )}
                </div>
              );
            }

            return (
              <div className="space-y-4">
                {filteredQuotes.map(quote => (
                <div
                  key={quote.id}
                  id={`admin-quote-${quote.id}`}
                  className={`p-5 rounded-2xl border transition-all shadow-xs ${
                    quote.status === 'pending_review'
                      ? 'bg-base-surface border-warning-border ring-1 ring-warning-border'
                      : 'bg-base-surface border-border'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-bg-warning text-warning-text border border-warning-border flex items-center justify-center font-bold text-xs">
                        TKL
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-text-primary">{quote.quoteNumber}</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            quote.status === 'pending_review' ? 'bg-bg-warning text-warning-text border border-warning-border' :
                            quote.status === 'offer_sent' ? 'bg-bg-info text-info-text border border-info-border' :
                            quote.status === 'accepted' ? 'bg-bg-success text-success-text border border-success-border' : 'bg-base-surface-2 text-text-secondary border border-border'
                          }`}>
                            {quote.status === 'pending_review' ? 'Fiyatlandırma Bekliyor' :
                             quote.status === 'offer_sent' ? 'Teklif İletildi' :
                             quote.status === 'accepted' ? 'Müşteri Onayladı' : quote.status}
                          </span>
                        </div>
                        <span className="text-[11px] text-text-muted">
                          {quote.customerName} ({quote.customerCompany || 'Kurumsal'}) - {quote.deliveryCity}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        onClick={() => setSelectedQuoteForPDF(quote)}
                        className="px-3 py-1.5 bg-base-surface-2 hover:bg-base-surface text-text-primary border border-border rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
                        title="Resmi Antetli Teklif PDF İncele / Yazdır"
                      >
                        <Printer className="w-3.5 h-3.5 text-success-text" />
                        <span>A4 Teklif</span>
                      </button>

                      {/* 80mm POS Thermal Quote Print Button */}
                      <button
                        onClick={() => {
                          const items = (quote.offeredItems && quote.offeredItems.length > 0)
                            ? quote.offeredItems.map(i => ({
                                name: i.productName,
                                qty: i.quantity,
                                unit: i.unit || 'ADET',
                                price: i.offeredUnitPrice,
                                total: i.totalPrice
                              }))
                            : (quote.requestedItems || []).map(i => ({
                                name: i.productName || 'Ürün',
                                qty: i.requestedQuantity || 1,
                                unit: i.unit || 'ADET',
                                price: i.targetUnitPrice || 0,
                                total: (i.requestedQuantity || 1) * (i.targetUnitPrice || 0)
                              }));

                          const totalCalc = quote.grandTotal || quote.subtotal || items.reduce((s, x) => s + (x.total || 0), 0);

                          printThermalReceipt80mm({
                            title: 'ALPHA TEKNİK',
                            orderNumber: quote.quoteNumber,
                            customerName: quote.customerName,
                            customerPhone: quote.customerPhone,
                            items,
                            totalAmount: totalCalc,
                            taxAmount: quote.taxAmount || Math.round(totalCalc * (20 / 120)),
                            notes: quote.deliveryCity ? `Teslimat Şehri: ${quote.deliveryCity}` : undefined,
                            documentType: 'TEKLIF_FISI'
                          });
                        }}
                        className="px-2.5 py-1.5 bg-base-surface-2 hover:bg-base-surface text-text-primary border border-border rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer shadow-2xs"
                        title="80mm / 58mm Termal Teklif Fişi Yazdır"
                      >
                        <Printer className="w-3.5 h-3.5 text-emerald-500" />
                        <span>80mm Fiş</span>
                      </button>

                      {/* WhatsApp Share Button */}
                      <button
                        onClick={() => {
                          setWhatsAppShareState({
                            isOpen: true,
                            title: `Teklif #${quote.quoteNumber} - ${quote.customerName}`,
                            defaultPhone: quote.customerPhone || '',
                            defaultMessage: generateQuoteWhatsAppMessage(quote),
                            recipientName: quote.customerName,
                          });
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
                        title="Müşteriye WhatsApp ile Teklif Bilgilerini İlet"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveTab('invoices');
                        }}
                        className="px-3.5 py-1.5 bg-danger-fill/15 hover:bg-danger-fill/25 text-danger-text border border-danger-border rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
                        title="GİB UBL-TR 2.1 E-Fatura veya E-Arşiv Oluştur"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Faturaya Dönüştür</span>
                      </button>

                      {quote.status !== 'accepted' && (
                        <button
                          onClick={() => setSelectedQuoteForResponse(quote)}
                          className="px-4 py-1.5 bg-warning-fill hover:opacity-90 text-base font-bold rounded-lg text-xs flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{quote.status === 'offer_sent' ? 'Teklifi Revize Et' : 'AI ile Fiyatlandır & Gönder'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Requested Items Preview */}
                  <div className="p-3.5 bg-base-surface-2 rounded-xl border border-border text-xs space-y-2 mt-3">
                    <div className="font-semibold text-text-muted uppercase tracking-wider text-[10px]">
                      Müşterinin Talep Ettiği Kalemler:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(quote.requestedItems || []).map((item, i) => (
                        <div key={i} className="p-2.5 bg-base-surface rounded-lg border border-border shadow-xs">
                          <span className="font-medium text-text-primary">{item.productName || 'Ürün'}</span>
                          <div className="text-[11px] text-text-muted mt-0.5">
                            Miktar: <strong className="text-text-primary">{item.requestedQuantity || 1} {item.unit || 'ADET'}</strong>
                            {item.targetUnitPrice && (
                              <span className="ml-2 text-success-text font-semibold">Hedef Fiyat: {item.targetUnitPrice} ₺</span>
                            )}
                          </div>
                          {item.note && (
                            <div className="text-[10px] text-text-muted italic mt-0.5">{item.note}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Offered totals if offer already prepared */}
                  {quote.grandTotal && (
                    <div className="flex justify-between items-center text-xs text-text-secondary pt-3 border-t border-border">
                      <span>Vade: <strong className="text-text-primary">{quote.paymentTerms}</strong></span>
                      <span className="text-success-text font-mono text-sm font-bold">
                        Hazırlanan Teklif: {(quote.grandTotal || 0).toLocaleString('tr-TR')} ₺
                      </span>
                    </div>
                  )}

                </div>
              ))}
            </div>
            );
          })()}
        </div>
      )}

      {/* TAB 3: PRODUCT CATALOG & STOCK MANAGEMENT */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-base-surface rounded-2xl border border-border shadow-xs">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-success-fill/15 border border-success-border flex items-center justify-center text-success-text shrink-0">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-text-primary">
                  Ürün & Fiyat Yönetim Masası
                </h2>
                <p className="text-xs text-text-muted">
                  stok.pdf kataloğu hızlı fiyat, barkod ve stok güncelleme masası
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              {/* Bulk Price Adjustment Engine Modal Trigger */}
              <button
                type="button"
                onClick={() => setShowBulkPriceModal(true)}
                className="px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Kategori bazında veya tüm listede toplu iskonto ve zam motoru"
              >
                <TrendingUp className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Toplu İskonto / Zam Motoru</span>
              </button>

              {/* Supplier Purchase Order Modal Trigger */}
              <button
                type="button"
                onClick={() => setShowSupplierPOModal(true)}
                className="px-3 py-1.5 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Kritik stoktaki ürünleri tespit edip tedarikçiye otomatik sipariş fişi oluştur"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Tedarikçi Satın Alma (PO)</span>
              </button>

              <span className="px-2.5 py-1.5 rounded-xl bg-base-surface-2 border border-border text-xs font-mono font-bold text-text-secondary">
                {products.length} Aktif Ürün
              </span>
            </div>
          </div>

          <ProductFastEditTable
            products={products}
            onRefresh={onRefresh}
            onOpenAddModal={() => {
              setSelectedProductToEdit(null);
              setShowProductModal(true);
            }}
            onEditProduct={(product) => {
              setSelectedProductToEdit(product);
              setShowProductModal(true);
            }}
          />
        </div>
      )}

      {/* TAB 4: CARI HESAP & BORÇ/ALACAK YÖNETİMİ DASHBOARD */}
      {activeTab === 'cariler' && (
        <CariManagementDashboard
          onRefreshParent={onRefresh}
        />
      )}

      {/* TAB 5: GİB E-FATURA & E-ARŞİV YÖNETİMİ DASHBOARD */}
      {activeTab === 'invoices' && (
        <EInvoiceDashboard
          orders={orders}
          quotes={quotes}
          products={products}
        />
      )}

      {/* TAB 6: D3 SALES TREND & CATEGORY ANALYTICS DASHBOARD */}
      {activeTab === 'analytics' && (
        <SalesAnalyticsDashboard
          orders={orders}
          products={products}
          onRefresh={onRefresh}
        />
      )}

      {/* TAB 7: SYSTEM DIAGNOSTICS & REAL-TIME SYNC DASHBOARD */}
      {activeTab === 'diagnostics' && (
        <SystemDiagnosticsDashboard
          products={products}
          orders={orders}
          quotes={quotes}
          onRefresh={onRefresh}
        />
      )}

      {/* TAB 8: ERROR DIAGNOSTICS & FIX IT AI REPAIR CENTER */}
      {activeTab === 'errors' && (
        <ErrorDiagnosticsCenter
          onRefresh={onRefresh}
        />
      )}

      </div>

      {/* Tracking Number Input Modal */}
      {activeTrackingOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-base-surface border border-border rounded-2xl w-full max-w-md p-5 text-text-primary shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-text-primary flex items-center space-x-2">
              <Truck className="w-4 h-4 text-warning-text" />
              <span>Kargo Takip Numarası Girin</span>
            </h3>
            <input
              type="text"
              value={trackingNumberInput}
              onChange={e => setTrackingNumberInput(e.target.value)}
              placeholder="Örn: YK-88392019TR"
              className="w-full px-3 py-2 bg-base-surface-2 border border-border rounded-lg text-xs text-text-primary focus:outline-none focus:border-border-strong font-mono"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setActiveTrackingOrderId(null)}
                className="px-3.5 py-1.5 bg-base-surface-2 hover:bg-base-surface text-text-primary rounded-lg text-xs font-semibold cursor-pointer border border-border"
              >
                Vazgeç
              </button>
              <button
                onClick={() => {
                  handleUpdateOrderStatus(activeTrackingOrderId, 'shipped', trackingNumberInput);
                  setActiveTrackingOrderId(null);
                }}
                className="px-4 py-1.5 bg-success-fill hover:opacity-90 text-base font-bold rounded-lg text-xs cursor-pointer shadow-sm"
              >
                Kargoya Verildi Olarak Güncelle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Quote Response Modal */}
      {selectedQuoteForResponse && (
        <AdminQuoteModal
          quote={selectedQuoteForResponse}
          products={products}
          onClose={() => setSelectedQuoteForResponse(null)}
          onSuccess={onRefresh}
        />
      )}

      {/* Product Add/Edit Modal */}
      {showProductModal && (
        <ProductManageModal
          productToEdit={selectedProductToEdit}
          products={products}
          onClose={() => setShowProductModal(false)}
          onSuccess={onRefresh}
        />
      )}

      {/* Quote PDF View Modal */}
      {selectedQuoteForPDF && (
        <QuotePDFModal
          quote={selectedQuoteForPDF}
          onClose={() => setSelectedQuoteForPDF(null)}
        />
      )}

      {/* Order PDF View / Print Modal */}
      {selectedOrderForPDF && (
        <OrderPDFModal
          order={selectedOrderForPDF}
          onClose={() => setSelectedOrderForPDF(null)}
        />
      )}

      {/* DÜŞÜK STOK ALARM & HIZLI İKMAL MODALI */}
      {showLowStockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-base-surface border border-border rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col text-text-primary shadow-2xl overflow-hidden">
            
            {/* Header */}
            <div className="p-5 bg-base-surface-2 border-b border-border flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-bg-danger text-danger-text border border-danger-border">
                  <AlertTriangle className="w-5 h-5 text-danger-text animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-primary flex items-center space-x-2">
                    <span>Kritik Düşük Stok Takip & Hızlı İkmal Masası</span>
                    <span className="px-2 py-0.5 rounded-full bg-bg-danger text-danger-text text-xs font-bold border border-danger-border">
                      {lowStockProducts.length} Ürün
                    </span>
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    Stok miktarı ≤ {lowStockThreshold} olan ürünler listelenmiştir. Tek tıkla stok ekleyebilir veya toplu ikmal yapabilirsiniz.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {/* Threshold selector */}
                <div className="flex items-center space-x-1.5 bg-base-surface px-3 py-1.5 rounded-xl border border-border text-xs">
                  <span className="text-text-muted font-medium">Eşik:</span>
                  <select
                    value={lowStockThreshold}
                    onChange={e => setLowStockThreshold(Number(e.target.value))}
                    className="bg-transparent font-bold text-text-primary focus:outline-none cursor-pointer text-xs"
                  >
                    <option value={3}>≤ 3 Adet</option>
                    <option value={5}>≤ 5 Adet (Standart)</option>
                    <option value={10}>≤ 10 Adet</option>
                    <option value={15}>≤ 15 Adet</option>
                    <option value={20}>≤ 20 Adet</option>
                    <option value={50}>≤ 50 Adet</option>
                  </select>
                </div>

                <button
                  onClick={() => setShowLowStockModal(false)}
                  className="p-2 text-text-muted hover:text-text-primary rounded-xl hover:bg-base-surface-2 transition-colors cursor-pointer border border-border"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content List */}
            <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
              
              {/* Batch Actions Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-bg-danger/40 border border-danger-border rounded-2xl">
                <div className="text-xs text-danger-text font-semibold">
                  Tüm bu {lowStockProducts.length} adet ürünü tek tıkla ikmal etmek için:
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleBatchRestockAllLow(25)}
                    className="px-3 py-1.5 bg-danger-fill hover:opacity-90 text-base rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    Tümüne +25 Adet Ekle
                  </button>
                  <button
                    onClick={() => handleBatchRestockAllLow(50)}
                    className="px-3 py-1.5 bg-success-fill hover:opacity-90 text-base rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    Tümüne +50 Adet Ekle
                  </button>
                </div>
              </div>

              {/* Table / Cards */}
              <div className="bg-base-surface rounded-2xl border border-border overflow-hidden shadow-xs">
                {/* DESKTOP TABLE */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-base-surface-2 text-text-secondary uppercase font-bold text-[11px] tracking-wider border-b border-border">
                      <tr>
                        <th className="py-3 px-3 w-8">#</th>
                        <th className="py-3 px-3 min-w-[200px]">Ürün Adı & Kodları</th>
                        <th className="py-3 px-3">Kategori</th>
                        <th className="py-3 px-3 text-right">Birim Fiyat</th>
                        <th className="py-3 px-3 text-center min-w-[100px]">Mevcut Stok</th>
                        <th className="py-3 px-3 text-center min-w-[160px]">Hızlı İkmal İşlemleri</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-text-primary">
                      {lowStockProducts.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-text-muted">
                            Tebrikler! Belirlenen eşik (≤ {lowStockThreshold}) altında hiçbir ürün bulunmuyor.
                          </td>
                        </tr>
                      ) : (
                        lowStockProducts.map((product, idx) => (
                          <tr key={product.id} className="hover:bg-base-surface-2 transition-colors">
                            <td className="py-3 px-3 text-text-muted font-mono text-[11px]">
                              {idx + 1}
                            </td>

                            <td className="py-3 px-3">
                              <div className="font-bold text-text-primary">{product.name}</div>
                              <div className="flex items-center space-x-2 mt-0.5 text-[11px] text-text-muted">
                                <span className="font-mono bg-base-surface-2 px-1.5 py-0.5 rounded border border-border">
                                  {product.sku}
                                </span>
                                {product.barcode && (
                                  <span className="font-mono text-text-muted">
                                    Barkod: {product.barcode}
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-3 px-3">
                              <span className="inline-block px-2 py-0.5 rounded-md bg-base-surface-2 text-text-secondary font-semibold text-[10px] border border-border">
                                {product.category}
                              </span>
                            </td>

                            <td className="py-3 px-3 text-right font-mono font-bold text-text-primary">
                              {product.price.toLocaleString('tr-TR')} ₺
                            </td>

                            <td className="py-3 px-3 text-center">
                              <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-bg-danger text-danger-text border border-danger-border font-mono font-extrabold text-xs">
                                <AlertTriangle className="w-3 h-3 text-danger-text animate-pulse" />
                                <span>{product.stock} {product.unit}</span>
                              </div>
                            </td>

                            <td className="py-3 px-3 text-center">
                              <div className="flex items-center justify-center space-x-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleQuickRestock(product, 10)}
                                  disabled={restockLoadingId === product.id}
                                  className="px-2 py-1 bg-base-surface-2 hover:bg-bg-success text-text-primary hover:text-success-text border border-border rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                  title="+10 Adet Ekle"
                                >
                                  +10
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuickRestock(product, 25)}
                                  disabled={restockLoadingId === product.id}
                                  className="px-2 py-1 bg-base-surface-2 hover:bg-bg-success text-text-primary hover:text-success-text border border-border rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                  title="+25 Adet Ekle"
                                >
                                  +25
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuickRestock(product, 50)}
                                  disabled={restockLoadingId === product.id}
                                  className="px-2.5 py-1 bg-success-fill hover:opacity-90 text-base rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer"
                                  title="+50 Adet Ekle"
                                >
                                  {restockLoadingId === product.id ? '...' : '+50'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuickRestock(product, 100)}
                                  disabled={restockLoadingId === product.id}
                                  className="px-2 py-1 bg-warning-fill hover:opacity-90 text-base rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer"
                                  title="+100 Adet Ekle"
                                >
                                  +100
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* MOBILE LIST CARDS */}
                <div className="block md:hidden divide-y divide-border">
                  {lowStockProducts.length === 0 ? (
                    <div className="py-8 px-4 text-center text-text-muted text-xs">
                      Tebrikler! Belirlenen eşik (≤ {lowStockThreshold}) altında hiçbir ürün bulunmuyor.
                    </div>
                  ) : (
                    lowStockProducts.map((product) => (
                      <div key={product.id} className="p-3.5 space-y-2.5 hover:bg-base-surface-2/40 transition-colors">
                        
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center space-x-1.5 flex-wrap">
                            <span className="font-mono font-bold text-xs bg-base-surface-2 px-2 py-0.5 rounded border border-border">
                              {product.sku}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-base-surface-2 text-text-secondary text-[10px] font-semibold">
                              {product.category}
                            </span>
                          </div>

                          <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-bg-danger text-danger-text border border-danger-border font-mono font-black text-[11px] shrink-0">
                            <AlertTriangle className="w-3 h-3 text-danger-text animate-pulse" />
                            <span>{product.stock} {product.unit}</span>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-bold text-xs text-text-primary leading-snug">{product.name}</h4>
                          <div className="flex items-center justify-between mt-1 text-[11px]">
                            {product.barcode && (
                              <span className="text-text-muted font-mono">Barkod: {product.barcode}</span>
                            )}
                            <span className="font-mono font-black text-success-text ml-auto">
                              {product.price.toLocaleString('tr-TR')} ₺
                            </span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
                          <span className="text-[11px] font-medium text-text-muted">Hızlı Stok İkmali:</span>
                          <div className="flex items-center space-x-1.5">
                            <button
                              type="button"
                              onClick={() => handleQuickRestock(product, 10)}
                              disabled={restockLoadingId === product.id}
                              className="px-2.5 py-1.5 bg-base-surface-2 hover:bg-bg-success text-text-primary rounded-lg text-xs font-bold transition-colors cursor-pointer active:scale-95"
                            >
                              +10
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickRestock(product, 25)}
                              disabled={restockLoadingId === product.id}
                              className="px-2.5 py-1.5 bg-base-surface-2 hover:bg-bg-success text-text-primary rounded-lg text-xs font-bold transition-colors cursor-pointer active:scale-95"
                            >
                              +25
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickRestock(product, 50)}
                              disabled={restockLoadingId === product.id}
                              className="px-3 py-1.5 bg-success-fill hover:opacity-90 text-base rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer active:scale-95"
                            >
                              {restockLoadingId === product.id ? '...' : '+50'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickRestock(product, 100)}
                              disabled={restockLoadingId === product.id}
                              className="px-2.5 py-1.5 bg-warning-fill hover:opacity-90 text-base rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer active:scale-95"
                            >
                              +100
                            </button>
                          </div>
                        </div>

                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 bg-base-surface-2 border-t border-border flex items-center justify-between text-xs text-text-secondary">
              <div>
                Toplam Kritik Ürün: <strong>{lowStockProducts.length}</strong> / Toplam Katalog: <strong>{products.length}</strong>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    setShowLowStockModal(false);
                    setShowSupplierPOModal(true);
                  }}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Tedarikçi Satın Alma (PO) Başlat</span>
                </button>
                <button
                  onClick={() => {
                    setShowLowStockModal(false);
                    setActiveTab('products');
                  }}
                  className="px-3.5 py-1.5 bg-base-surface hover:bg-base-surface-2 border border-border text-text-primary rounded-xl font-semibold cursor-pointer"
                >
                  Ürün Tablosunda Yönet
                </button>
                <button
                  onClick={() => setShowLowStockModal(false)}
                  className="px-4 py-1.5 bg-success-fill hover:opacity-90 text-base font-bold rounded-xl cursor-pointer shadow-xs"
                >
                  Kapat
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Barcode & Shelf Label Generator Modal */}
      <BarcodeGeneratorModal
        isOpen={showBarcodeModal}
        onClose={() => setShowBarcodeModal(false)}
        products={products}
      />

      {/* Camera Barcode & QR Scanner Modal */}
      <CameraBarcodeScannerModal
        isOpen={showCameraScannerModal}
        onClose={() => setShowCameraScannerModal(false)}
        products={products}
        onProductUpdated={onRefresh}
        onOpenProductEdit={(product) => {
          setShowCameraScannerModal(false);
          setSelectedProductToEdit(product);
          setShowProductModal(true);
        }}
        onOpenCreateWithBarcode={(_barcode) => {
          setShowCameraScannerModal(false);
          setSelectedProductToEdit(null);
          setShowProductModal(true);
        }}
        onOpenBarcodeGenerator={(ids) => {
          setShowCameraScannerModal(false);
          setShowBarcodeModal(true);
        }}
      />

      {/* Toplu İskonto ve Zam Motoru Modalı */}
      <BulkPriceAdjustmentModal
        isOpen={showBulkPriceModal}
        onClose={() => setShowBulkPriceModal(false)}
        products={products}
        onApplyAdjustment={handleApplyBulkPriceAdjustment}
      />

      {/* Kritik Stok & Otomatik Tedarikçi Satın Alma Siparişi (PO) Modalı */}
      <SupplierPurchaseOrderModal
        isOpen={showSupplierPOModal}
        onClose={() => setShowSupplierPOModal(false)}
        products={products}
        onApplyRestock={handleApplySupplierRestock}
      />

      {/* Depo Sevkiyat & Çeki Listesi Barkod Doğrulama Modalı */}
      {selectedOrderForPacking && (
        <OrderShipmentPackingModal
          isOpen={!!selectedOrderForPacking}
          onClose={() => setSelectedOrderForPacking(null)}
          order={selectedOrderForPacking}
          products={products}
          onCompleteShipment={handleCompleteShipment}
        />
      )}

      {/* Hızlı POS Kasa & Barkod Satış Modalı */}
      <FastPosCheckoutModal
        isOpen={showPosModal}
        onClose={() => setShowPosModal(false)}
        products={products}
        onCompleteSale={handlePosSaleComplete}
      />

      {/* Toplu Excel & CSV Stok / Fiyat Masası */}
      <BulkExcelImportExportModal
        isOpen={showBulkExcelModal}
        onClose={() => setShowBulkExcelModal(false)}
        products={products}
        onApplyBulkImport={handleApplyBulkImportProducts}
      />

      {/* Müşteri Kademeleri ve Kademeli İskonto Matrisi */}
      <CustomerTierManagementModal
        isOpen={showCustomerTierModal}
        onClose={() => setShowCustomerTierModal(false)}
      />

      {/* Şoför Sevkiyat & Rota Dağıtım Çizelgesi (A4) Modalı */}
      <DriverDispatchRouteModal
        isOpen={showDriverDispatchModal}
        onClose={() => setShowDriverDispatchModal(false)}
        orders={orders}
        onMarkOrdersShipped={handleMarkOrdersShipped}
      />

      {/* Evrensel WhatsApp Paylaşım Modalı */}
      {whatsAppShareState && (
        <WhatsAppShareModal
          isOpen={whatsAppShareState.isOpen}
          onClose={() => setWhatsAppShareState(null)}
          title={whatsAppShareState.title}
          defaultPhone={whatsAppShareState.defaultPhone}
          defaultMessage={whatsAppShareState.defaultMessage}
          recipientName={whatsAppShareState.recipientName}
        />
      )}

      {/* Havale / EFT & Banka Dekont Onay Masası */}
      {showReceiptVerificationModal && (
        <AdminReceiptVerificationModal
          isOpen={showReceiptVerificationModal}
          onClose={() => setShowReceiptVerificationModal(false)}
          orders={orders}
          onReceiptApproved={() => {
            onRefresh();
            playNotificationSound('success');
            confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
          }}
        />
      )}

      {/* WMS Depo Toplama (Picking List) & Barkod Masası */}
      {showPickingInspectionModal && (
        <OrderPickingInspectionModal
          isOpen={showPickingInspectionModal}
          onClose={() => {
            setShowPickingInspectionModal(false);
            setSelectedOrderForPicking(null);
          }}
          order={selectedOrderForPicking || (orders.length > 0 ? orders[0] : null)}
          onPickingComplete={() => {
            onRefresh();
            playNotificationSound('success');
            confetti({ particleCount: 60, spread: 70, origin: { y: 0.5 } });
          }}
        />
      )}

      {/* Stok Yaşlandırma Analizi & B2B Kategori İskonto Matrisi */}
      {showAgingAndDiscountModal && (
        <ManagerAgingAndStockReportsModal
          isOpen={showAgingAndDiscountModal}
          onClose={() => setShowAgingAndDiscountModal(false)}
          products={products}
          orders={orders}
          onApplyDiscountRule={() => {
            onRefresh();
            playNotificationSound('success');
          }}
        />
      )}

    </div>
  );
}
