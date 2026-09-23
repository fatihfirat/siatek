import React, { useState, useEffect } from 'react';
import { Product, Order, Quote, CartItem, User } from '../../types';
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  Plus, 
  Minus, 
  FileText, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  Truck, 
  Package, 
  ShieldCheck, 
  ArrowRight, 
  Eye, 
  Trash2,
  Lock,
  ChevronRight,
  AlertCircle,
  LayoutGrid,
  List,
  Barcode,
  Tag,
  RotateCcw,
  Check,
  X,
  User as UserIcon,
  Building2,
  LogIn,
  Printer,
  Download,
  Wallet,
  Send,
  CreditCard,
  Building,
  Copy,
  MapPin,
  Layers,
  UploadCloud
} from 'lucide-react';
import confetti from 'canvas-confetti';
import QuickQuoteModal from './QuickQuoteModal';
import CustomerFinancialModal from './CustomerFinancialModal';
import CategoryDrawer from './CategoryDrawer';
import ProductSearchAutocomplete from './ProductSearchAutocomplete';
import HighlightText from '../common/HighlightText';
import WhatsAppShareModal from '../common/WhatsAppShareModal';
import D3OrderStatusFlow from '../common/D3OrderStatusFlow';
import QuotePDFModal from '../QuotePDFModal';
import OrderPDFModal from '../OrderPDFModal';
import { BankAccountsAndReceiptModal } from '../common/BankAccountsAndReceiptModal';
import { QuickBulkOrderModal } from './QuickBulkOrderModal';
import { ProjectPackagesModal } from './ProjectPackagesModal';
import { ConstructionSiteModal } from './ConstructionSiteModal';
import { ConstructionSite } from '../../types';
import { encryptPayload } from '../../lib/crypto';
import { playNotificationSound } from '../../lib/audio';
import { searchProductsWithFuzzy } from '../../lib/searchUtils';
import { generateOrderWhatsAppMessage, generateQuoteWhatsAppMessage } from '../../utils/shareUtils';
import { printThermalReceipt80mm } from '../../utils/printUtils';
import { saveOrderToFirestore, saveQuoteToFirestore } from '../../lib/firestoreService';

interface CustomerPortalProps {
  products: Product[];
  orders: Order[];
  quotes: Quote[];
  currentUser: User | null;
  activeTab?: 'home' | 'catalog' | 'orders' | 'quotes';
  onTabChange?: (tab: 'home' | 'catalog' | 'orders' | 'quotes') => void;
  onOpenAuth: (initialTab?: 'login' | 'register', targetRole?: 'customer' | 'admin') => void;
  onOpenAI: () => void;
  onRefresh: () => void;
  cartRequested?: boolean;
  onCartClose?: () => void;
  onCartCountChange?: (count: number) => void;
}

export default function CustomerPortal({
  products,
  orders,
  quotes,
  currentUser,
  activeTab: controlledActiveTab,
  onTabChange,
  onOpenAuth,
  onOpenAI,
  onRefresh,
  cartRequested = false,
  onCartClose,
  onCartCountChange,
}: CustomerPortalProps) {
  const [internalTab, setInternalTab] = useState<'home' | 'catalog' | 'orders' | 'quotes'>('home');
  const activeTab = controlledActiveTab !== undefined ? controlledActiveTab : internalTab;
  const setActiveTab = (tab: 'home' | 'catalog' | 'orders' | 'quotes') => {
    setInternalTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | undefined>(undefined);
  const [isCategoryDrawerOpen, setIsCategoryDrawerOpen] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    const saved = localStorage.getItem('customer_stock_view_mode');
    return (saved === 'grid' || saved === 'table') ? saved : 'table';
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(36);

  // Sync viewMode preference to localStorage
  useEffect(() => {
    localStorage.setItem('customer_stock_view_mode', viewMode);
  }, [viewMode]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});
  const [internalCartOpen, setInternalCartOpen] = useState(false);
  const showCartDrawer = cartRequested || internalCartOpen;
  const setShowCartDrawer = (open: boolean) => { setInternalCartOpen(open); if (!open) onCartClose?.(); };
  useEffect(() => { onCartCountChange?.(cart.reduce((sum, item) => sum + item.quantity, 0)); }, [cart, onCartCountChange]);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showFinancialModal, setShowFinancialModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showBulkOrderModal, setShowBulkOrderModal] = useState(false);
  const [showPackagesModal, setShowPackagesModal] = useState(false);
  const [showSiteModal, setShowSiteModal] = useState(false);
  const [selectedSite, setSelectedSite] = useState<ConstructionSite | null>(null);
  const [activeOrderForReceipt, setActiveOrderForReceipt] = useState<Order | null>(null);
  const [selectedQuoteForPDF, setSelectedQuoteForPDF] = useState<Quote | null>(null);
  const [selectedOrderForPDF, setSelectedOrderForPDF] = useState<Order | null>(null);
  
  // Checkout Form State
  const [customerName, setCustomerName] = useState(currentUser?.name || '');
  const [customerEmail, setCustomerEmail] = useState(currentUser?.email || '');
  const [customerPhone, setCustomerPhone] = useState(currentUser?.phone || '');
  const [customerAddress, setCustomerAddress] = useState(currentUser?.address || '');
  const [orderNotes, setOrderNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'bank_transfer' | 'credit_card' | 'on_delivery' | 'current_account'>('bank_transfer');
  const [selectedBankIndex, setSelectedBankIndex] = useState(0);
  const [copiedIban, setCopiedIban] = useState<string | null>(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderSuccessMsg, setOrderSuccessMsg] = useState('');
  const [lastCreatedOrder, setLastCreatedOrder] = useState<Order | null>(null);
  const [whatsAppShareState, setWhatsAppShareState] = useState<{
    isOpen: boolean;
    title: string;
    defaultPhone: string;
    defaultMessage: string;
    recipientName: string;
  } | null>(null);

  useEffect(() => {
    if (currentUser) {
      setCustomerName(currentUser.name);
      setCustomerEmail(currentUser.email);
      setCustomerPhone(currentUser.phone || '');
      setCustomerAddress(currentUser.address || (currentUser.city ? `${currentUser.city}, Türkiye` : ''));
    }
  }, [currentUser]);

  const categories = ['all', ...Array.from(new Set(products.map(p => p.category)))];

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setActiveSearch(val.trim());
    setCurrentPage(1);
  };

  const handleSearchSubmit = (val?: string | React.FormEvent) => {
    if (typeof val === 'object' && val !== null && 'preventDefault' in val) {
      val.preventDefault();
      setActiveSearch(searchQuery.trim());
    } else if (typeof val === 'string') {
      setSearchQuery(val);
      setActiveSearch(val.trim());
    } else {
      setActiveSearch(searchQuery.trim());
    }
    setCurrentPage(1);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setActiveSearch('');
    setCurrentPage(1);
  };

  const handleCategorySelect = (cat: string, subCat?: string) => {
    setSelectedCategory(cat);
    setSelectedSubCategory(subCat);
    setCurrentPage(1);
  };

  // Real-time Turkish-aware fuzzy & multi-token filtered products
  const filteredProducts = React.useMemo(() => {
    const effectiveQuery = searchQuery.trim() || activeSearch.trim();
    const results = searchProductsWithFuzzy(products, effectiveQuery, {
      category: selectedCategory,
      subCategory: selectedSubCategory,
      inStockOnly,
    });
    return results.map(r => r.product);
  }, [products, searchQuery, activeSearch, selectedCategory, selectedSubCategory, inStockOnly]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedProducts = filteredProducts.slice((safePage - 1) * pageSize, safePage * pageSize);

  const cartTotalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartSubtotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  const cartTax = Math.round(cartSubtotal * 0.2);
  const cartGrandTotal = cartSubtotal + cartTax;

  const getProductSelectedQty = (product: Product) => {
    return selectedQuantities[product.id] || product.minOrderQuantity || 1;
  };

  const handleSetSelectedQty = (productId: string, val: number, minQty = 1) => {
    const safeVal = Math.max(minQty, isNaN(val) ? minQty : val);
    setSelectedQuantities(prev => ({
      ...prev,
      [productId]: safeVal,
    }));
  };

  const handleAddToCart = (product: Product, quantity?: number) => {
    const qtyToAdd = quantity !== undefined 
      ? Math.max(product.minOrderQuantity || 1, quantity)
      : getProductSelectedQty(product);

    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + qtyToAdd }
            : item
        );
      }
      return [...prev, { product, quantity: qtyToAdd }];
    });
    playNotificationSound('status');
  };

  const handleBulkAddItems = (items: Array<{ product: Product; quantity: number }>) => {
    setCart(prev => {
      let currentCart = [...prev];
      for (const it of items) {
        const existingIdx = currentCart.findIndex(ci => ci.product.id === it.product.id);
        if (existingIdx !== -1) {
          currentCart[existingIdx] = {
            ...currentCart[existingIdx],
            quantity: currentCart[existingIdx].quantity + it.quantity,
          };
        } else {
          currentCart.push({
            product: it.product,
            quantity: it.quantity,
          });
        }
      }
      return currentCart;
    });
    setShowCartDrawer(true);
    playNotificationSound('success');
  };

  const handleSetCartQty = (productId: string, qty: number) => {
    setCart(prev => {
      if (qty <= 0) {
        return prev.filter(item => item.product.id !== productId);
      }
      return prev.map(item =>
        item.product.id === productId
          ? { ...item, quantity: qty }
          : item
      );
    });
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
    playNotificationSound('status');
  };

  const handleUpdateCartQty = (productId: string, delta: number) => {
    setCart(prev => {
      return prev
        .map(item => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const COMPANY_BANK_ACCOUNTS = [
    {
      bankName: 'Ziraat Bankası',
      accountName: 'ALPHA TEKNİK TESİSAT VE ENDÜSTRİYEL SİST. TİC. LTD. ŞTİ.',
      iban: 'TR44 0001 0001 2345 6789 0001 01',
      branch: 'Merkez Şube (0123)'
    },
    {
      bankName: 'Garanti BBVA',
      accountName: 'ALPHA TEKNİK TESİSAT VE ENDÜSTRİYEL SİST. TİC. LTD. ŞTİ.',
      iban: 'TR62 0006 2000 9876 5432 1000 02',
      branch: 'Organize Sanayi Şubesi (4567)'
    },
    {
      bankName: 'İş Bankası',
      accountName: 'ALPHA TEKNİK TESİSAT VE ENDÜSTRİYEL SİST. TİC. LTD. ŞTİ.',
      iban: 'TR12 0006 4000 0012 3456 7890 03',
      branch: 'Ticari Şube (7890)'
    }
  ];

  const handleCopyIban = (iban: string) => {
    navigator.clipboard.writeText(iban.replace(/\s+/g, ''));
    setCopiedIban(iban);
    setTimeout(() => setCopiedIban(null), 2000);
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    setIsSubmittingOrder(true);
    setOrderSuccessMsg('');

    try {
      const paymentInfo = paymentMethod === 'bank_transfer'
        ? `Banka Havalesi / EFT (${COMPANY_BANK_ACCOUNTS[selectedBankIndex]?.bankName})`
        : paymentMethod === 'credit_card'
        ? 'Kredi Kartı / Online Ödeme'
        : paymentMethod === 'on_delivery'
        ? 'Kapıda Teslimatta Ödeme'
        : 'Cari Hesap Bakiye / Açık Hesap';

      const fullNotes = orderNotes 
        ? `${orderNotes} | Ödeme: ${paymentInfo}`
        : `Ödeme Yöntemi: ${paymentInfo}`;

      // Encrypt confidential notes
      const encryptedNote = await encryptPayload({
        notes: fullNotes,
        clientDate: new Date().toISOString(),
        orderType: 'Standard E-Commerce Order',
        paymentMethod,
      });

      const payload = {
        customerName,
        customerEmail,
        customerPhone,
        customerAddress,
        items: cart.map(item => ({
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
          unit: item.product.unit,
          unitPrice: item.product.price,
          note: item.customerNote,
        })),
        notes: fullNotes,
        encryptedPayload: encryptedNote,
      };

      let createdOrder: any = null;
      try {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.order) {
            createdOrder = data.order;
          }
        }
      } catch (apiErr) {
        console.warn('API /api/orders unreachable, falling back to client-side Firestore order creation:', apiErr);
      }

      if (!createdOrder) {
        const orderNumber = `SIP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        createdOrder = {
          id: `ord-${Date.now()}`,
          orderNumber,
          customerName,
          customerEmail,
          customerPhone,
          customerAddress,
          items: payload.items,
          total: cartGrandTotal,
          status: 'pending',
          paymentMethod,
          notes: fullNotes,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          statusHistory: [{
            id: `hist-${Date.now()}`,
            status: 'pending',
            timestamp: new Date().toISOString(),
            updatedBy: customerName,
            note: 'Sipariş oluşturuldu'
          }]
        };
        await saveOrderToFirestore(createdOrder);
      }

      setCart([]);
      setShowCartDrawer(false);
      setLastCreatedOrder(createdOrder);
      setOrderSuccessMsg(`Siparişiniz başarıyla oluşturuldu! Sipariş No: ${createdOrder.orderNumber}`);
      setActiveTab('orders');
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      playNotificationSound('success');

      if (createdOrder) {
        saveOrderToFirestore(createdOrder).catch(e => console.warn('Firestore order save note:', e));
      }
    } catch (err: any) {
      alert('Sipariş gönderilirken hata oluştu: ' + err.message);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleSendQuoteRequest = async (quoteData: any) => {
    const res = await fetch('/api/quotes/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quoteData),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      setActiveTab('quotes');
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
      playNotificationSound('quote');
      if (data.quote) {
        saveQuoteToFirestore(data.quote).catch(e => console.warn('Firestore quote save note:', e));
      }
    }
  };

  const handleAcceptQuote = async (quoteId: string) => {
    try {
      const res = await fetch(`/api/quotes/${quoteId}/accept`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
        playNotificationSound('success');
        if (data.quote) {
          saveQuoteToFirestore(data.quote).catch(e => console.warn('Firestore quote save note:', e));
        }
        if (data.order) {
          saveOrderToFirestore(data.order).catch(e => console.warn('Firestore order save note:', e));
        }
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return <span className="px-2.5 py-1 rounded-full bg-bg-warning text-warning-text border border-warning-border text-xs font-semibold flex items-center space-x-1"><Clock className="w-3 h-3 text-warning-text" /><span>Onay Bekliyor</span></span>;
      case 'approved':
        return <span className="px-2.5 py-1 rounded-full bg-bg-success text-success-text border border-success-border text-xs font-semibold flex items-center space-x-1"><CheckCircle2 className="w-3 h-3 text-success-text" /><span>Onaylandı</span></span>;
      case 'preparing':
        return <span className="px-2.5 py-1 rounded-full bg-bg-info text-info-text border border-info-border text-xs font-semibold flex items-center space-x-1"><Package className="w-3 h-3 text-info-text" /><span>Hazırlanıyor</span></span>;
      case 'shipped':
        return <span className="px-2.5 py-1 rounded-full bg-bg-warning text-warning-text border border-warning-border text-xs font-semibold flex items-center space-x-1"><Truck className="w-3 h-3 text-warning-text" /><span>Kargoya Verildi</span></span>;
      case 'delivered':
        return <span className="px-2.5 py-1 rounded-full bg-bg-success text-success-text border border-success-border text-xs font-semibold flex items-center space-x-1"><CheckCircle2 className="w-3 h-3 text-success-text" /><span>Teslim Edildi</span></span>;
      case 'cancelled':
        return <span className="px-2.5 py-1 rounded-full bg-bg-danger text-danger-text border border-danger-border text-xs font-semibold flex items-center space-x-1"><span>İptal Edildi</span></span>;
    }
  };

  const getQuoteStatusBadge = (status: Quote['status']) => {
    switch (status) {
      case 'pending_review':
        return <span className="px-2.5 py-1 rounded-full bg-bg-warning text-warning-text border border-warning-border text-xs font-semibold flex items-center space-x-1"><Clock className="w-3 h-3" /><span>İnceleniyor</span></span>;
      case 'offer_sent':
        return <span className="px-2.5 py-1 rounded-full bg-bg-success text-success-text border border-success-border text-xs font-bold flex items-center space-x-1 animate-pulse"><Sparkles className="w-3 h-3 text-success-text" /><span>Teklif Geldi (Onay Bekliyor)</span></span>;
      case 'accepted':
        return <span className="px-2.5 py-1 rounded-full bg-bg-info text-info-text border border-info-border text-xs font-semibold flex items-center space-x-1"><CheckCircle2 className="w-3 h-3" /><span>Siparişe Dönüştü</span></span>;
      case 'rejected':
        return <span className="px-2.5 py-1 rounded-full bg-bg-danger text-danger-text border border-danger-border text-xs font-semibold">Reddedildi</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full bg-base-surface-2 text-text-secondary border border-border text-xs">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      
      {/* Top Navigation Sub-Bar */}
      <div className="flex items-center justify-between gap-2 bg-base-surface p-1.5 sm:p-2.5 rounded-2xl border border-border shadow-xs">
        
        {/* Navigation Tabs Segmented Group */}
        <div 
          role="tablist" 
          aria-label="Müşteri Portalı Sekmeleri"
          className="grid grid-cols-3 flex-1 min-w-0 sm:flex sm:items-center space-x-0 sm:space-x-1 gap-0.5 sm:gap-0 bg-base-surface-2 p-1 rounded-xl border border-border"
        >
          <button
            id="tab-customer-catalog"
            role="tab"
            aria-selected={activeTab === 'catalog'}
            onClick={() => setActiveTab('catalog')}
            className={`flex items-center justify-center space-x-1.5 px-1 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer select-none min-w-0 ${
              activeTab === 'catalog'
                ? 'bg-success-fill text-base shadow-xs'
                : 'text-text-secondary hover:text-text-primary hover:bg-base-surface'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 shrink-0 hidden sm:inline" />
            <span className="hidden sm:inline whitespace-nowrap">Ürün Kataloğu</span>
            <span className="sm:hidden whitespace-nowrap">Katalog</span>
          </button>

          <button
            id="tab-customer-quotes"
            role="tab"
            aria-selected={activeTab === 'quotes'}
            onClick={() => setActiveTab('quotes')}
            className={`relative flex items-center justify-center space-x-1.5 px-1 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer select-none min-w-0 ${
              activeTab === 'quotes'
                ? 'bg-warning-fill text-base shadow-xs'
                : 'text-text-secondary hover:text-text-primary hover:bg-base-surface'
            }`}
          >
            <FileText className="w-3.5 h-3.5 shrink-0 hidden sm:inline" />
            <span className="hidden sm:inline whitespace-nowrap">Teklif Taleplerim</span>
            <span className="sm:hidden whitespace-nowrap">Teklifler</span>
            {(quotes || []).filter(q => q.status === 'offer_sent').length > 0 && (
              <span className="w-2 h-2 rounded-full bg-warning-fill animate-ping ml-0.5 shrink-0" />
            )}
          </button>

          <button
            id="tab-customer-orders"
            role="tab"
            aria-selected={activeTab === 'orders'}
            onClick={() => setActiveTab('orders')}
            className={`flex items-center justify-center space-x-1 sm:space-x-1.5 px-1 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer select-none min-w-0 ${
              activeTab === 'orders'
                ? 'bg-base-surface text-text-primary border border-border shadow-xs'
                : 'text-text-secondary hover:text-text-primary hover:bg-base-surface'
            }`}
          >
            <Clock className="w-3.5 h-3.5 shrink-0 hidden sm:inline" />
            <span className="hidden sm:inline whitespace-nowrap">Siparişlerim</span>
            <span className="sm:hidden whitespace-nowrap">Siparişler</span>
            {orders.length > 0 && (
              <span className={`px-1 sm:px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold shrink-0 ${
                activeTab === 'orders' ? 'bg-base-surface-2 text-text-primary' : 'bg-base-surface text-text-muted'
              }`}>
                {orders.length}
              </span>
            )}
          </button>
        </div>

        {/* Quick Action Cart Button */}
        <button
          id="btn-cart-toggle"
          onClick={() => setShowCartDrawer(true)}
          className="relative flex items-center justify-center space-x-1.5 px-2.5 sm:px-4 py-2 bg-info-fill hover:opacity-90 text-base rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-[0.98] shrink-0"
          title="Sepeti Görüntüle"
        >
          <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">Sepetim</span>
          {cartTotalItems > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-bg-info text-info-text border border-info-border text-[10px] sm:text-[11px] font-extrabold shadow-2xs shrink-0">
              {cartTotalItems}
            </span>
          )}
        </button>

      </div>

      {/* Bekleyen Aksiyonlar & Müşteri Hızlı İşlemleri */}
      {(() => {
        const readyQuotesCount = (quotes || []).filter(q => q.status === 'offer_sent').length;
        const pendingQuotesCount = (quotes || []).filter(q => q.status === 'pending_review').length;
        const activeOrdersCount = (orders || []).filter(o => o.status === 'pending' || o.status === 'preparing' || o.status === 'shipped').length;
        const totalDebitEstimated = (orders || []).reduce((sum, o) => sum + (o.status !== 'cancelled' ? (o.total || 0) : 0), 0) || 38450;

        return (
          <div className="bg-base-surface p-3.5 sm:p-4 rounded-3xl border border-border shadow-xs space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
              <div className="flex items-center space-x-2 flex-wrap gap-1">
                <h2 className="text-xs sm:text-sm font-extrabold text-text-primary tracking-tight flex items-center space-x-2 flex-wrap gap-1">
                  <span>Bekleyen Aksiyonlar</span>
                  {readyQuotesCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-bg-warning text-warning-text border border-warning-border text-[10px] font-mono font-bold animate-pulse">
                      {readyQuotesCount} Hazır Teklif Onay Bekliyor
                    </span>
                  )}
                  {readyQuotesCount === 0 && activeOrdersCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-bg-success text-success-text border border-success-border text-[10px] font-mono font-bold">
                      {activeOrdersCount} İşlemde Sipariş
                    </span>
                  )}
                </h2>
              </div>
              <span className="text-[11px] text-text-secondary hidden sm:inline-block">
                Hızlı işlem, sipariş takibi ve cari bakiye masası
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              {/* 1. Hazır / Bekleyen Teklifler Kartı */}
              <div
                id="bar-customer-quotes"
                role="button"
                tabIndex={0}
                onClick={() => setActiveTab('quotes')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setActiveTab('quotes');
                }}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between shadow-xs select-none ${
                  readyQuotesCount > 0
                    ? 'bg-bg-warning border-warning-border hover:opacity-95'
                    : 'bg-base-surface border-border hover:border-border-strong'
                }`}
                title="Tekliflerinizi incelemek ve onaylamak için tıklayın"
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2.5 rounded-xl border ${
                    readyQuotesCount > 0
                      ? 'bg-warning-border text-warning-text border-warning-border'
                      : 'bg-base-surface-2 text-text-secondary border-border'
                  }`}>
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-bold text-text-primary">
                        {readyQuotesCount > 0 ? 'Hazır Fiyat Teklifi' : 'Teklif Talepleri'}
                      </span>
                      {readyQuotesCount > 0 && (
                        <span className="w-2 h-2 rounded-full bg-warning-fill animate-ping" />
                      )}
                    </div>
                    <p className="text-[11px] text-text-secondary">
                      {readyQuotesCount > 0
                        ? `${readyQuotesCount} adet onay bekliyor`
                        : pendingQuotesCount > 0
                        ? `${pendingQuotesCount} talep inceleniyor`
                        : 'Toplam ' + quotes.length + ' teklif kaydı'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-1 text-xs font-bold text-warning-text hover:underline shrink-0">
                  <span>{readyQuotesCount > 0 ? 'Onayla' : 'İncele'}</span>
                  <span>➔</span>
                </div>
              </div>

              {/* 2. Aktif Siparişler Kartı */}
              <div
                id="bar-customer-orders"
                role="button"
                tabIndex={0}
                onClick={() => setActiveTab('orders')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setActiveTab('orders');
                }}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between shadow-xs select-none ${
                  activeOrdersCount > 0
                    ? 'bg-bg-success border-success-border hover:opacity-95'
                    : 'bg-base-surface border-border hover:border-border-strong'
                }`}
                title="Siparişlerinizin durumunu ve kargo takibini görüntülemek için tıklayın"
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2.5 rounded-xl border ${
                    activeOrdersCount > 0
                      ? 'bg-success-border text-success-text border-success-border'
                      : 'bg-base-surface-2 text-text-secondary border-border'
                  }`}>
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-bold text-text-primary">
                        {activeOrdersCount > 0 ? 'İşlemdeki Siparişler' : 'Sipariş Geçmişi'}
                      </span>
                      {activeOrdersCount > 0 && (
                        <span className="w-2 h-2 rounded-full bg-success-fill animate-pulse" />
                      )}
                    </div>
                    <p className="text-[11px] text-text-secondary">
                      {activeOrdersCount > 0
                        ? `${activeOrdersCount} adet hazırlanıyor/kargo`
                        : 'Toplam ' + orders.length + ' sipariş kaydı'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-1 text-xs font-bold text-success-text hover:underline shrink-0">
                  <span>Takip Et</span>
                  <span>➔</span>
                </div>
              </div>

              {/* 3. Pratik Teklif Oluştur Kartı */}
              <div
                id="bar-customer-quick-quote"
                role="button"
                tabIndex={0}
                onClick={() => setShowQuoteModal(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setShowQuoteModal(true);
                }}
                className="p-3.5 rounded-2xl border border-info-border bg-bg-info hover:opacity-95 transition-all cursor-pointer flex items-center justify-between shadow-xs select-none"
                title="Yeni bir proje için hızlı fiyat teklifi talep edin"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl border bg-info-border text-info-text border-info-border">
                    <Sparkles className="w-4 h-4 text-info-text" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-text-primary">Pratik Teklif Oluştur</span>
                    <p className="text-[11px] text-text-secondary">Özel liste veya proje kalemleri</p>
                  </div>
                </div>
                <div className="flex items-center space-x-1 text-xs font-bold text-info-text hover:underline shrink-0">
                  <span>Talep İlet</span>
                  <span>➔</span>
                </div>
              </div>

              {/* 4. Cari Bakiyem & Hesap Özeti Kartı */}
              <div
                id="bar-customer-financial"
                role="button"
                tabIndex={0}
                onClick={() => setShowFinancialModal(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setShowFinancialModal(true);
                }}
                className="p-3.5 rounded-2xl border border-danger-border bg-bg-danger hover:opacity-95 transition-all cursor-pointer flex items-center justify-between shadow-xs select-none"
                title="Cari hesap ekstresi, borç/alacak durumu ve banka hesap bilgilerini görüntüleyin"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl border bg-danger-border text-danger-text border-danger-border">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-bold text-text-primary">Cari Bakiyem</span>
                      <span className="px-1.5 py-0.2 rounded bg-danger-border text-danger-text font-mono font-bold text-[9px]">
                        Borç
                      </span>
                    </div>
                    <p className="text-[11px] font-mono font-bold text-text-primary">
                      {totalDebitEstimated.toLocaleString('tr-TR')} ₺ <span className="text-[10px] text-text-muted font-normal">/ Ekstre</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-1 text-xs font-bold text-danger-text hover:underline shrink-0">
                  <span>Özet</span>
                  <span>➔</span>
                </div>
              </div>
            </div>

            {/* B2B Hızlı İşlemler: Excel, Paketler, Dekont & Şantiye */}
            <div className="pt-2 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider shrink-0">
                B2B Pratik Araçlar:
              </span>
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowBulkOrderModal(true)}
                  className="px-2.5 sm:px-3 py-1.5 bg-base-surface-2 hover:bg-base-surface text-text-primary border border-border rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-2xs hover:border-primary/40 text-center"
                  title="Excel veya metin formatında malzeme listesi yükleyin"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="truncate hidden sm:inline">Toplu Sipariş (Excel / Liste)</span>
                  <span className="truncate sm:hidden">Toplu Sipariş</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPackagesModal(true)}
                  className="px-2.5 sm:px-3 py-1.5 bg-base-surface-2 hover:bg-base-surface text-text-primary border border-border rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-2xs hover:border-primary/40 text-center"
                  title="3+1 Daire, Yerden Isıtma ve Kombi montaj paketlerini sepete ekleyin"
                >
                  <Package className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="truncate hidden sm:inline">Hazır Proje Paketleri</span>
                  <span className="truncate sm:hidden">Proje Paketleri</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveOrderForReceipt(null);
                    setShowReceiptModal(true);
                  }}
                  className="px-2.5 sm:px-3 py-1.5 bg-base-surface-2 hover:bg-base-surface text-text-primary border border-border rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-2xs hover:border-primary/40 text-center"
                  title="Banka hesaplarını inceleyin, havale dekontu yükleyin veya Sanal POS ile ödeyin"
                >
                  <CreditCard className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="truncate hidden sm:inline">Banka & Dekont Bildirimi</span>
                  <span className="truncate sm:hidden">Banka / Dekont</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowSiteModal(true)}
                  className="px-2.5 sm:px-3 py-1.5 bg-base-surface-2 hover:bg-base-surface text-text-primary border border-border rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-2xs hover:border-primary/40 text-center"
                  title="Kayıtlı şantiyelerinizi ve teslimat adreslerinizi yönetin"
                >
                  <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="truncate">Şantiyelerim {selectedSite ? `(${selectedSite.siteName})` : ''}</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Success Notification Banner */}
      {orderSuccessMsg && (
        <div className="p-4 bg-bg-success border border-success-border text-success-text rounded-2xl flex items-center justify-between text-xs animate-in fade-in shadow-xs">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-success-text shrink-0" />
            <span className="font-bold text-text-primary">{orderSuccessMsg}</span>
          </div>
          <button onClick={() => setOrderSuccessMsg('')} className="text-success-text hover:text-text-primary font-semibold cursor-pointer">
            Kapat
          </button>
        </div>
      )}

      {/* TAB 1: PRODUCT CATALOG */}
      {activeTab === 'catalog' && (
        <div className="space-y-5">
          
          {/* Guest User Authentication Prompt Banner */}
          {!currentUser && (
            <div className="p-4 sm:p-5 rounded-2xl bg-base-surface border border-warning-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center space-x-3.5">
                <div className="w-10 h-10 rounded-2xl bg-bg-warning text-warning-text border border-warning-border flex items-center justify-center shrink-0 shadow-sm">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-text-primary flex items-center space-x-2">
                    <span>Fiyat Bilgileri & Toptan İskonto Tablosu Bayilere Özeldir</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-bg-warning text-warning-text border border-warning-border">
                      B2B Korumalı
                    </span>
                  </h4>
                  <p className="text-xs text-text-secondary mt-0.5 max-w-2xl">
                    Güncel perakende ve toptan liste fiyatlarını görüntülemek, sepet oluşturup doğrudan sipariş vermek ve firmanıza özel iskonto teklifi almak için lütfen giriş yapınız.
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={() => onOpenAuth('login', 'customer')}
                  className="px-4 py-2.5 bg-warning-fill text-base rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Bayi Girişi Yap</span>
                </button>
                <button
                  onClick={() => onOpenAuth('register', 'customer')}
                  className="px-3.5 py-2.5 bg-base-surface-2 hover:bg-base-surface text-text-primary border border-border rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center space-x-1"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Yeni Kayıt</span>
                </button>
              </div>
            </div>
          )}

          {/* Search, Filter & View Controls Bar */}
          <div className="bg-base-surface p-4 rounded-2xl border border-border shadow-xs space-y-3.5">
            
            {/* Live Autocomplete Product Search with Suggestions Dropdown */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 min-w-0">
                <ProductSearchAutocomplete
                  products={products}
                  searchQuery={searchQuery}
                  onSearchChange={handleSearchChange}
                  onSearchSubmit={handleSearchSubmit}
                  onClearSearch={handleClearSearch}
                  onAddToCart={(product, qty) => handleAddToCart(product, qty)}
                  selectedCategory={selectedCategory}
                  selectedSubCategory={selectedSubCategory}
                  placeholder="Ürün adı, ST kodu, barkod veya alt seri ara (Örn: Musluk, Kalde, ST00567)..."
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  id="btn-product-search"
                  onClick={() => handleSearchSubmit(searchQuery)}
                  className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-5 py-2.5 bg-info-fill hover:opacity-90 text-base rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer shrink-0"
                  title="Aramayı Uygula"
                >
                  <Search className="w-4 h-4" />
                  <span>Ürün Ara</span>
                </button>

                {Boolean(searchQuery.trim() || activeSearch.trim()) && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="px-3 py-2.5 bg-base-surface-2 hover:bg-base-surface text-text-secondary hover:text-text-primary rounded-xl text-xs font-semibold border border-border transition-colors cursor-pointer shrink-0"
                    title="Aramayı Sıfırla"
                  >
                    Sıfırla
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter Drawer & View Toggles */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border">
              
              {/* Category Drawer Trigger (Clean Hamburger Button only) */}
              <div className="flex items-center space-x-2">
                <CategoryDrawer
                  products={products}
                  selectedCategory={selectedCategory}
                  selectedSubCategory={selectedSubCategory}
                  onSelectCategory={handleCategorySelect}
                  isOpen={isCategoryDrawerOpen}
                  onOpenChange={setIsCategoryDrawerOpen}
                />

                {selectedCategory !== 'all' && (
                  <button
                    type="button"
                    onClick={() => handleCategorySelect('all')}
                    className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-bg-warning text-warning-text border border-warning-border hover:opacity-90 transition-colors cursor-pointer"
                    title="Kategori filtresini kaldır ve tüm ürünleri göster"
                  >
                    <span>{selectedCategory}</span>
                    {selectedSubCategory && <span className="text-text-muted">/ {selectedSubCategory}</span>}
                    <X className="w-3.5 h-3.5 ml-1 text-warning-text" />
                  </button>
                )}
              </div>

              {/* In-Stock Filter & View Switcher */}
              <div className="flex items-center space-x-3 shrink-0">
                <label className="flex items-center space-x-1.5 text-xs text-text-secondary cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={e => setInStockOnly(e.target.checked)}
                    className="w-4 h-4 rounded text-success-text focus:ring-success-border bg-base-surface-2 border-border"
                  />
                  <span className="hidden sm:inline">Stokta Olanlar</span>
                  <span className="sm:hidden">Stokta</span>
                </label>

                <div className="flex items-center bg-base-surface-2 p-1 rounded-xl border border-border">
                  <button
                    id="btn-view-mode-table"
                    onClick={() => setViewMode('table')}
                    className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer text-xs font-semibold ${
                      viewMode === 'table'
                        ? 'bg-base-surface text-text-primary border border-border shadow-xs'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                    title="Fiyat & Stok Tablosu Görünümü (Varsayılan)"
                    aria-label="Tablo Görünümü"
                  >
                    <List className="w-4 h-4" />
                    <span className="hidden md:inline text-[11px]">Tablo</span>
                  </button>
                  <button
                    id="btn-view-mode-grid"
                    onClick={() => setViewMode('grid')}
                    className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer text-xs font-semibold ${
                      viewMode === 'grid'
                        ? 'bg-base-surface text-text-primary border border-border shadow-xs'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                    title="Katalog Kartları Görünümü"
                    aria-label="Katalog Görünümü"
                  >
                    <LayoutGrid className="w-4 h-4" />
                    <span className="hidden md:inline text-[11px]">Katalog</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Active Category / Subcategory indicator bar if filtered */}
            {(selectedCategory !== 'all' || selectedSubCategory) && (
              <div className="p-2.5 bg-bg-warning rounded-xl border border-warning-border text-xs flex items-center justify-between text-warning-text animate-in fade-in">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-text-primary">Filtrelenen Kategori:</span>
                  <span className="px-2 py-0.5 bg-base-surface rounded-md border border-border font-bold text-text-primary">
                    {selectedCategory}
                  </span>
                  {selectedSubCategory && (
                    <>
                      <span>/</span>
                      <span className="px-2 py-0.5 bg-base-surface rounded-md border border-border font-bold text-text-primary">
                        {selectedSubCategory}
                      </span>
                    </>
                  )}
                  <span className="text-[11px] text-text-muted">({filteredProducts.length} ürün)</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCategorySelect('all')}
                  className="px-2 py-0.5 bg-base-surface hover:bg-base-surface-2 text-warning-text border border-warning-border rounded-md font-bold text-[11px] flex items-center space-x-1 cursor-pointer transition-colors"
                >
                  <X className="w-3 h-3" />
                  <span>Kategori Filtresini Temizle</span>
                </button>
              </div>
            )}

          </div>

          {/* Active Filter Notice & Results Count */}
          <div className="flex items-center justify-between text-xs text-text-secondary px-1">
            <div>
              {activeSearch ? (
                <span>"<strong>{activeSearch}</strong>" için bulunan: <strong>{filteredProducts.length}</strong> ürün</span>
              ) : (
                <span>Listelenen Ürün Sayısı: <strong>{filteredProducts.length}</strong> / {products.length}</span>
              )}
            </div>
            <div className="text-[11px] text-text-muted">
              KDV Oranı: %20 Dahil / Hariç Belirtilen Fiyatlar
            </div>
          </div>

          {/* VIEW MODE 1: GRID / CARD VIEW */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.length === 0 ? (
                <div className="col-span-full py-14 px-4 text-center bg-base-surface rounded-2xl border border-border text-text-muted space-y-3 shadow-xs">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-base-surface-2 border border-border flex items-center justify-center text-text-muted">
                    <Package className="w-7 h-7 opacity-40 text-text-muted" />
                  </div>
                  <div className="max-w-md mx-auto">
                    <p className="text-base font-bold text-text-primary">
                      {activeSearch ? `"${activeSearch}" için eşleşen ürün bulunamadı` : 'Seçili filtrelere uygun ürün bulunamadı'}
                    </p>
                    <p className="text-xs text-text-muted mt-1 leading-relaxed">
                      Arama terimini değiştirebilir, filtreleri temizleyebilir veya toptan proje listeniz için teklif isteyebilirsiniz.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    <button 
                      type="button"
                      onClick={handleClearSearch} 
                      className="px-3.5 py-2 bg-base-surface-2 hover:bg-base-surface text-text-primary border border-border rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                    >
                      Filtreleri Temizle
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowQuoteModal(true)}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center space-x-1.5"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Özel Malzeme Teklifi İste</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowBulkOrderModal(true)}
                      className="px-3.5 py-2 bg-base-surface-2 hover:bg-base-surface text-text-primary border border-border rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center space-x-1.5"
                    >
                      <UploadCloud className="w-3.5 h-3.5 text-primary" />
                      <span>Toplu Excel / Liste</span>
                    </button>
                  </div>
                </div>
              ) : (
                paginatedProducts.map(product => {
                  const inCart = cart.find(i => i.product.id === product.id);

                  return (
                    <div
                      key={product.id}
                      id={`product-card-${product.id}`}
                      className="bg-base-surface border border-border rounded-2xl p-4.5 hover:border-border-strong hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-3.5 shadow-xs"
                    >
                      {/* Product Header & Badges */}
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="font-mono text-[11px] font-bold bg-base-surface-2 text-text-secondary px-2 py-0.5 rounded-md border border-border">
                            <HighlightText text={product.sku} query={searchQuery} />
                          </span>
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-base-surface-2 text-text-primary border border-border">
                            {product.category}
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-text-primary leading-snug group-hover:text-success-text transition-colors">
                          <HighlightText text={product.name} query={searchQuery} />
                        </h3>

                        {product.subCategory && (
                          <span className="text-[11px] text-text-muted font-medium block mt-1">
                            Seri: <HighlightText text={product.subCategory} query={searchQuery} />
                          </span>
                        )}

                        {product.barcode && (
                          <div className="text-[10px] text-text-muted font-mono flex items-center space-x-1 mt-0.5">
                            <Barcode className="w-3 h-3 inline" />
                            <span><HighlightText text={product.barcode} query={searchQuery} /></span>
                          </div>
                        )}
                      </div>

                      {/* Pricing & Stock Details */}
                      <div className="space-y-2.5 pt-3 border-t border-border">
                        <div className="flex items-baseline justify-between">
                          <div>
                            <span className="text-lg font-extrabold text-success-text font-mono">
                              {product.price.toLocaleString('tr-TR')} ₺
                            </span>
                            <span className="text-xs text-text-muted ml-1">/ {product.unit}</span>
                          </div>
                          {currentUser && product.wholesalePrice ? (
                            <div className="text-[11px] text-warning-text font-bold bg-bg-warning px-2 py-0.5 rounded-md border border-warning-border font-mono">
                              Toptan: {product.wholesalePrice.toLocaleString('tr-TR')} ₺
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onOpenAuth('login', 'customer')}
                              className="text-[10px] text-warning-text hover:underline font-semibold flex items-center space-x-1"
                              title="Özel bayi iskontosu için giriş yapın"
                            >
                              <Lock className="w-2.5 h-2.5" />
                              <span>Bayi İskontosu</span>
                            </button>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-text-secondary bg-base-surface-2 p-2 rounded-xl border border-border">
                          <span>
                            Stok: <strong className={product.stock <= 5 ? 'text-danger-text font-bold' : 'text-text-primary'}>
                              {product.stock > 0 ? `${product.stock} ${product.unit}` : 'Tükendi'}
                            </strong>
                          </span>
                          <span>
                            Min. Sipariş: <strong>{product.minOrderQuantity} {product.unit}</strong>
                          </span>
                        </div>

                        {/* Quantity Selector & Action buttons */}
                        <div className="space-y-2 pt-1">
                          {inCart ? (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between bg-bg-success border border-success-border p-1.5 rounded-xl">
                                <span className="text-[11px] font-bold text-success-text pl-1 flex items-center space-x-1">
                                  <Check className="w-3.5 h-3.5 text-success-text" />
                                  <span>Sepette:</span>
                                </span>
                                <div className="flex items-center space-x-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateCartQty(product.id, -1)}
                                    className="w-7 h-7 sm:w-6 sm:h-6 flex items-center justify-center bg-base-surface hover:bg-base-surface-2 active:scale-90 text-text-primary rounded-lg border border-border transition-all cursor-pointer shadow-2xs"
                                    title="1 Azalt"
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <input
                                    type="number"
                                    min="1"
                                    value={inCart.quantity}
                                    onChange={(e) => handleSetCartQty(product.id, parseInt(e.target.value) || 0)}
                                    className="w-14 h-7 text-center font-extrabold font-mono py-0 px-1 bg-base-surface border border-success-border rounded-lg text-xs text-success-text focus:outline-none"
                                    title="Sipariş adedini buraya yazabilirsiniz"
                                  />
                                  <span className="text-[10px] text-text-muted font-medium pr-0.5">{product.unit}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateCartQty(product.id, 1)}
                                    className="w-7 h-7 sm:w-6 sm:h-6 flex items-center justify-center bg-base-surface hover:bg-base-surface-2 active:scale-90 text-text-primary rounded-lg border border-border transition-all cursor-pointer shadow-2xs"
                                    title="1 Arttır"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-1.5">
                                <button
                                  type="button"
                                  onClick={() => setShowCartDrawer(true)}
                                  className="flex-1 py-2 bg-success-fill text-base rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-xs transition-transform active:scale-[0.98] cursor-pointer"
                                >
                                  <ShoppingBag className="w-3.5 h-3.5" />
                                  <span>Sepeti İncele</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setShowQuoteModal(true)}
                                  className="p-2 bg-base-surface-2 hover:bg-base-surface text-warning-text border border-border rounded-xl transition-colors shrink-0 cursor-pointer"
                                  title="Özel Fiyat Teklifi İste"
                                >
                                  <FileText className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              {/* Quantity Stepper Input */}
                              <div className="flex items-center justify-between bg-base-surface-2 border border-border p-1.5 rounded-xl">
                                <span className="text-[11px] font-medium text-text-secondary pl-1">
                                  Miktar ({product.unit}):
                                </span>
                                <div className="flex items-center space-x-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const current = getProductSelectedQty(product);
                                      const min = product.minOrderQuantity || 1;
                                      handleSetSelectedQty(product.id, Math.max(min, current - 1), min);
                                    }}
                                    className="w-7 h-7 sm:w-6 sm:h-6 flex items-center justify-center bg-base-surface hover:bg-base-surface-2 active:scale-90 text-text-primary rounded-lg border border-border transition-all cursor-pointer shadow-2xs"
                                    title="Azalt"
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <input
                                    type="number"
                                    min={product.minOrderQuantity || 1}
                                    value={getProductSelectedQty(product)}
                                    onChange={(e) => handleSetSelectedQty(product.id, parseInt(e.target.value) || (product.minOrderQuantity || 1), product.minOrderQuantity || 1)}
                                    className="w-14 h-7 text-center font-bold font-mono py-0 px-1 bg-base-surface border border-border rounded-lg text-xs text-text-primary focus:outline-none focus:border-border-strong"
                                    title="İstediğiniz sipariş sayısını yazın"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const current = getProductSelectedQty(product);
                                      const min = product.minOrderQuantity || 1;
                                      handleSetSelectedQty(product.id, current + 1, min);
                                    }}
                                    className="w-7 h-7 sm:w-6 sm:h-6 flex items-center justify-center bg-base-surface hover:bg-base-surface-2 active:scale-90 text-text-primary rounded-lg border border-border transition-all cursor-pointer shadow-2xs"
                                    title="Arttır"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Add to Cart & Quote Request Buttons */}
                              <div className="flex items-center space-x-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleAddToCart(product)}
                                  className="flex-1 py-2 bg-success-fill hover:opacity-90 text-base rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-xs transition-transform active:scale-[0.98] cursor-pointer"
                                >
                                  <ShoppingBag className="w-3.5 h-3.5" />
                                  <span>{getProductSelectedQty(product)} {product.unit} Ekle</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setShowQuoteModal(true)}
                                  className="p-2 bg-base-surface-2 hover:bg-base-surface text-warning-text border border-border rounded-xl transition-colors shrink-0 cursor-pointer"
                                  title="Özel Fiyat Teklifi İste"
                                >
                                  <FileText className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* VIEW MODE 2: TABLE / LIST VIEW */}
          {viewMode === 'table' && (
            <div className="bg-base-surface rounded-2xl border border-border overflow-hidden shadow-xs">
              
              {/* DESKTOP TABLE (Hidden on Mobile) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-base-surface-2 text-text-secondary uppercase font-bold text-[11px] tracking-wider border-b border-border">
                    <tr>
                      <th className="py-3 px-3">Kod & Barkod</th>
                      <th className="py-3 px-3">Ürün Adı & Seri</th>
                      <th className="py-3 px-3">Kategori</th>
                      <th className="py-3 px-3 text-right">Perakende Fiyat</th>
                      <th className="py-3 px-3 text-right">Toptan Fiyat</th>
                      <th className="py-3 px-3 text-center">Stok</th>
                      <th className="py-3 px-3 text-center">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-text-primary">
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-text-muted">
                          Aranan kritere uygun ürün bulunamadı.
                        </td>
                      </tr>
                    ) : (
                      paginatedProducts.map((product) => {
                        const inCart = cart.find(i => i.product.id === product.id);

                        return (
                          <tr key={product.id} className="hover:bg-base-surface-2 transition-colors">
                            <td className="py-2.5 px-3">
                              <span className="font-mono font-bold text-text-primary bg-base-surface-2 px-1.5 py-0.5 rounded border border-border">
                                <HighlightText text={product.sku} query={searchQuery} />
                              </span>
                              {product.barcode && (
                                <div className="text-[10px] text-text-muted font-mono mt-0.5">
                                  <HighlightText text={product.barcode} query={searchQuery} />
                                </div>
                              )}
                            </td>

                            <td className="py-2.5 px-3">
                              <div className="font-bold text-text-primary">
                                <HighlightText text={product.name} query={searchQuery} />
                              </div>
                              {product.subCategory && (
                                <div className="text-[10px] text-text-muted">
                                  <HighlightText text={product.subCategory} query={searchQuery} />
                                </div>
                              )}
                            </td>

                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded-md bg-base-surface-2 text-text-primary border border-border text-[10px] font-semibold">
                                {product.category}
                              </span>
                            </td>

                            <td className="py-2.5 px-3 text-right">
                              <span className="font-mono font-extrabold text-success-text text-xs">
                                {product.price.toLocaleString('tr-TR')} ₺
                              </span>
                              <span className="text-[10px] text-text-muted font-normal block">/ {product.unit}</span>
                            </td>

                            <td className="py-2.5 px-3 text-right">
                              {currentUser && product.wholesalePrice ? (
                                <span className="font-mono font-bold text-warning-text text-xs">
                                  {product.wholesalePrice.toLocaleString('tr-TR')} ₺
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => onOpenAuth('login', 'customer')}
                                  className="text-text-muted hover:text-warning-text text-[10px] font-semibold flex items-center space-x-1 justify-end ml-auto"
                                  title="Bayi girişi yapın"
                                >
                                  <Lock className="w-2.5 h-2.5" />
                                  <span>İskontolu</span>
                                </button>
                              )}
                            </td>

                            <td className="py-2.5 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full font-mono text-[11px] font-bold ${
                                product.stock > 10 ? 'bg-bg-success text-success-text border border-success-border' :
                                product.stock > 0 ? 'bg-bg-warning text-warning-text border border-warning-border' :
                                'bg-bg-danger text-danger-text border border-danger-border'
                              }`}>
                                {product.stock} {product.unit}
                              </span>
                            </td>

                            <td className="py-2.5 px-3 text-center">
                              {inCart ? (
                                <div className="inline-flex items-center bg-bg-success border border-success-border p-0.5 rounded-lg">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateCartQty(product.id, -1)}
                                    className="p-1 hover:bg-base-surface rounded text-text-primary cursor-pointer"
                                    title="Azalt"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <input
                                    type="number"
                                    min="1"
                                    value={inCart.quantity}
                                    onChange={(e) => handleSetCartQty(product.id, parseInt(e.target.value) || 0)}
                                    className="w-11 text-center font-extrabold font-mono py-0.5 bg-base-surface border border-success-border rounded text-xs text-success-text focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateCartQty(product.id, 1)}
                                    className="p-1 hover:bg-base-surface rounded text-text-primary cursor-pointer"
                                    title="Arttır"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <div className="inline-flex items-center space-x-1">
                                  <div className="flex items-center bg-base-surface border border-border rounded-lg">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const current = getProductSelectedQty(product);
                                        const min = product.minOrderQuantity || 1;
                                        handleSetSelectedQty(product.id, Math.max(min, current - 1), min);
                                      }}
                                      className="p-1 text-text-muted hover:text-text-primary cursor-pointer"
                                    >
                                      <Minus className="w-2.5 h-2.5" />
                                    </button>
                                    <input
                                      type="number"
                                      min={product.minOrderQuantity || 1}
                                      value={getProductSelectedQty(product)}
                                      onChange={(e) => handleSetSelectedQty(product.id, parseInt(e.target.value) || (product.minOrderQuantity || 1), product.minOrderQuantity || 1)}
                                      className="w-10 text-center font-bold font-mono py-0.5 text-xs text-text-primary focus:outline-none bg-transparent"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const current = getProductSelectedQty(product);
                                        const min = product.minOrderQuantity || 1;
                                        handleSetSelectedQty(product.id, current + 1, min);
                                      }}
                                      className="p-1 text-text-muted hover:text-text-primary cursor-pointer"
                                    >
                                      <Plus className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleAddToCart(product)}
                                    className="px-2.5 py-1 bg-success-fill text-base rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center space-x-1"
                                    title="Sepete Ekle"
                                  >
                                    <ShoppingBag className="w-3 h-3" />
                                    <span>Ekle</span>
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* MOBILE COMPACT LIST CARDS (Visible only on Mobile & Small Screens) */}
              <div className="block md:hidden divide-y divide-border">
                {filteredProducts.length === 0 ? (
                  <div className="py-12 px-4 text-center text-text-muted space-y-2">
                    <Package className="w-8 h-8 mx-auto opacity-30 text-text-muted" />
                    <p className="text-xs font-bold text-text-primary">Aradığınız kritere uygun ürün bulunamadı.</p>
                  </div>
                ) : (
                  paginatedProducts.map((product) => {
                    const inCart = cart.find(i => i.product.id === product.id);

                    return (
                      <div key={product.id} className="p-3.5 space-y-2.5 hover:bg-base-surface-2/40 transition-colors">
                        
                        {/* Top Meta: SKU, Category & Stock */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center space-x-1.5 flex-wrap">
                            <span className="font-mono font-bold text-xs text-text-primary bg-base-surface-2 px-2 py-0.5 rounded-md border border-border">
                              <HighlightText text={product.sku} query={searchQuery} />
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-base-surface-2 text-text-secondary border border-border text-[10px] font-semibold">
                              {product.category}
                            </span>
                          </div>

                          <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-extrabold shrink-0 ${
                            product.stock > 10 ? 'bg-bg-success text-success-text border border-success-border' :
                            product.stock > 0 ? 'bg-bg-warning text-warning-text border border-warning-border' :
                            'bg-bg-danger text-danger-text border border-danger-border'
                          }`}>
                            Stok: {product.stock} {product.unit}
                          </span>
                        </div>

                        {/* Product Title */}
                        <div>
                          <h4 className="font-bold text-xs text-text-primary leading-snug">
                            <HighlightText text={product.name} query={searchQuery} />
                          </h4>
                          {product.barcode && (
                            <div className="text-[10px] text-text-muted font-mono mt-0.5 flex items-center space-x-1">
                              <Barcode className="w-3 h-3" />
                              <span>{product.barcode}</span>
                            </div>
                          )}
                        </div>

                        {/* Price & Cart Actions */}
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/60">
                          <div>
                            <div className="font-mono font-black text-sm text-success-text">
                              {product.price.toLocaleString('tr-TR')} ₺
                              <span className="text-[10px] text-text-muted font-normal ml-1">/ {product.unit}</span>
                            </div>
                            {currentUser && product.wholesalePrice ? (
                              <div className="text-[10px] font-mono text-warning-text font-bold">
                                Bayi: {product.wholesalePrice.toLocaleString('tr-TR')} ₺
                              </div>
                            ) : null}
                          </div>

                          {/* Quick Stepper & Cart Button */}
                          <div>
                            {inCart ? (
                              <div className="flex items-center space-x-1 bg-bg-success border border-success-border p-1 rounded-xl shadow-2xs">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateCartQty(product.id, -1)}
                                  className="w-7 h-7 flex items-center justify-center bg-base-surface text-text-primary rounded-lg active:scale-90 transition-transform cursor-pointer"
                                  title="Azalt"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="w-8 text-center font-extrabold font-mono text-xs text-success-text">
                                  {inCart.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateCartQty(product.id, 1)}
                                  className="w-7 h-7 flex items-center justify-center bg-base-surface text-text-primary rounded-lg active:scale-90 transition-transform cursor-pointer"
                                  title="Arttır"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-1.5">
                                <div className="flex items-center bg-base-surface-2 border border-border rounded-xl">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const current = getProductSelectedQty(product);
                                      const min = product.minOrderQuantity || 1;
                                      handleSetSelectedQty(product.id, Math.max(min, current - 1), min);
                                    }}
                                    className="w-7 h-7 flex items-center justify-center text-text-muted hover:text-text-primary active:scale-90 cursor-pointer"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <input
                                    type="number"
                                    min={product.minOrderQuantity || 1}
                                    value={getProductSelectedQty(product)}
                                    onChange={(e) => handleSetSelectedQty(product.id, parseInt(e.target.value) || (product.minOrderQuantity || 1), product.minOrderQuantity || 1)}
                                    className="w-9 text-center font-extrabold font-mono text-xs text-text-primary focus:outline-none bg-transparent"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const current = getProductSelectedQty(product);
                                      const min = product.minOrderQuantity || 1;
                                      handleSetSelectedQty(product.id, current + 1, min);
                                    }}
                                    className="w-7 h-7 flex items-center justify-center text-text-muted hover:text-text-primary active:scale-90 cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleAddToCart(product)}
                                  className="px-3 py-1.5 bg-success-fill hover:opacity-90 active:scale-95 text-base rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center space-x-1"
                                  title="Sepete Ekle"
                                >
                                  <ShoppingBag className="w-3.5 h-3.5" />
                                  <span>Ekle</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>

            </div>
          )}

          {/* Pagination Navigation Bar */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-base-surface p-3.5 rounded-2xl border border-border shadow-xs">
              <div className="text-xs text-text-secondary">
                Sayfa <strong>{safePage}</strong> / <strong>{totalPages}</strong> (Toplam <strong>{filteredProducts.length}</strong> ürün)
              </div>

              <div className="flex items-center space-x-1">
                <button
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-base-surface-2 border border-border text-text-secondary hover:text-text-primary hover:bg-base-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  &larr; Önceki
                </button>

                {/* Page Jump buttons */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                  let pNum = safePage;
                  if (totalPages <= 5) {
                    pNum = idx + 1;
                  } else if (safePage <= 3) {
                    pNum = idx + 1;
                  } else if (safePage >= totalPages - 2) {
                    pNum = totalPages - 4 + idx;
                  } else {
                    pNum = safePage - 2 + idx;
                  }

                  return (
                    <button
                      key={pNum}
                      onClick={() => setCurrentPage(pNum)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        safePage === pNum
                          ? 'bg-success-fill text-base shadow-xs'
                          : 'bg-base-surface-2 border border-border text-text-secondary hover:text-text-primary hover:bg-base-surface'
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}

                <button
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-base-surface-2 border border-border text-text-secondary hover:text-text-primary hover:bg-base-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  Sonraki &rarr;
                </button>

                {/* Page size picker */}
                <select
                  value={pageSize}
                  onChange={e => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="ml-2 px-2.5 py-1.5 bg-base-surface-2 border border-border rounded-lg text-xs font-medium text-text-primary focus:outline-none"
                >
                  <option value={24}>24 Ürün/Sayfa</option>
                  <option value={36}>36 Ürün/Sayfa</option>
                  <option value={60}>60 Ürün/Sayfa</option>
                  <option value={120}>120 Ürün/Sayfa</option>
                  <option value={500}>500 Ürün/Sayfa</option>
                </select>
              </div>
            </div>
          )}

        </div>
      )}

      {/* TAB 2: MY QUOTES */}
      {activeTab === 'quotes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-text-primary flex items-center space-x-2">
              <FileText className="w-5 h-5 text-warning-text" />
              <span>Teklif Taleplerim & Gelen Özel Fiyatlar</span>
            </h2>
            <button
              onClick={() => {
                if (!currentUser) {
                  onOpenAuth('login', 'customer');
                  return;
                }
                setShowQuoteModal(true);
              }}
              className="px-3.5 py-1.5 bg-warning-fill hover:opacity-90 text-base rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Yeni Teklif İste</span>
            </button>
          </div>

          {!currentUser ? (
            <div className="p-12 text-center bg-base-surface rounded-3xl border border-border shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-bg-warning text-warning-text border border-warning-border flex items-center justify-center mx-auto mb-4">
                <Lock className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-text-primary mb-1.5">
                Teklif Taleplerinizi Görmek İçin Bayi Girişi Yapın
              </h3>
              <p className="text-xs text-text-secondary max-w-md mx-auto mb-5">
                Firmamıza ilettiğiniz proforma teklif taleplerini, tedarikçi özel iskontolarını ve PDF teklif mektuplarını incelemek için oturum açınız.
              </p>
              <button
                onClick={() => onOpenAuth('login', 'customer')}
                className="px-6 py-2.5 bg-warning-fill text-base rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center space-x-2 cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>Bayi Girişi Yap</span>
              </button>
            </div>
          ) : quotes.length === 0 ? (
            <div className="p-12 text-center bg-base-surface rounded-2xl border border-border text-text-muted text-xs shadow-xs">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-30 text-warning-text" />
              <p>Henüz kayıtlı teklif talebiniz bulunmuyor.</p>
              <button
                onClick={() => setShowQuoteModal(true)}
                className="mt-3 px-4 py-2 bg-warning-fill text-base rounded-xl text-xs font-semibold cursor-pointer"
              >
                İlk Teklifinizi İsteyin
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {quotes.map(quote => (
                <div
                  key={quote.id}
                  id={`quote-card-${quote.id}`}
                  className={`p-5 rounded-2xl border transition-all shadow-xs ${
                    quote.status === 'offer_sent'
                      ? 'bg-base-surface border-warning-border ring-1 ring-warning-border/30'
                      : 'bg-base-surface border-border'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3 mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-bg-warning text-warning-text border border-warning-border flex items-center justify-center font-bold text-xs">
                        TKL
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-text-primary">{quote.quoteNumber}</span>
                          {getQuoteStatusBadge(quote.status)}
                        </div>
                        <span className="text-[11px] text-text-muted">
                          {new Date(quote.createdAt).toLocaleDateString('tr-TR')} - {quote.deliveryCity}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedQuoteForPDF(quote)}
                        className="px-3.5 py-1.5 bg-base-surface-2 hover:bg-base-surface text-text-primary border border-border rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
                        title="Resmi Antetli Teklif PDF İncele / Yazdır"
                      >
                        <Printer className="w-3.5 h-3.5 text-success-text" />
                        <span>PDF Olarak Kaydet / Yazdır</span>
                      </button>

                      {quote.status === 'offer_sent' && (
                        <button
                          onClick={() => handleAcceptQuote(quote.id)}
                          className="px-4 py-1.5 bg-success-fill hover:opacity-90 text-base font-bold rounded-lg text-xs flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Onayla & Siparişe Dönüştür</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Items list preview */}
                  <div className="space-y-2 text-xs">
                    {quote.offeredItems && quote.offeredItems.length > 0 ? (
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                          Tedarikçi Tarafından Sunulan Fiyatlar:
                        </div>
                        <div className="divide-y divide-border bg-base-surface-2 rounded-xl border border-border overflow-hidden">
                          {quote.offeredItems.map((item, idx) => (
                            <div key={idx} className="p-2.5 flex items-center justify-between">
                              <div>
                                <span className="font-medium text-text-primary">{item.productName}</span>
                                <span className="text-[11px] text-text-muted ml-2">
                                  ({item.quantity} {item.unit} x <strong className="text-text-primary">{item.offeredUnitPrice} ₺</strong>)
                                </span>
                                {item.discountRate > 0 && (
                                  <span className="ml-2 px-1.5 py-0.5 rounded bg-bg-success text-success-text border border-success-border font-bold text-[10px]">
                                    %{item.discountRate} İskonto
                                  </span>
                                )}
                              </div>
                              <span className="font-bold text-success-text">
                                {item.totalPrice.toLocaleString('tr-TR')} ₺
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-text-muted text-xs">
                        Talep Edilen: {(quote.requestedItems || []).map(i => `${i.requestedQuantity || 1} ${i.unit || 'ADET'} ${i.productName || 'Ürün'}`).join(', ')}
                      </div>
                    )}

                    {/* Admin Response Note */}
                    {quote.adminResponseNote && (
                      <div className="p-3 bg-bg-warning rounded-xl border border-warning-border text-warning-text text-xs">
                        <span className="font-semibold block mb-0.5 text-text-primary">Tedarikçi Mesajı:</span>
                        {quote.adminResponseNote}
                      </div>
                    )}

                    {/* Summary Bar */}
                    {quote.grandTotal && (
                      <div className="flex items-center justify-between pt-2 border-t border-border text-xs">
                        <span className="text-text-secondary">
                          Ödeme Koşulu: <strong className="text-text-primary">{quote.paymentTerms || 'Peşin'}</strong>
                        </span>
                        <div className="text-right">
                          <span className="text-text-muted mr-2">Teklif Toplamı (KDV Dahil):</span>
                          <span className="text-base font-extrabold text-success-text">
                            {(quote.grandTotal || 0).toLocaleString('tr-TR')} ₺
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MY ORDERS */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-text-primary flex items-center space-x-2">
            <Clock className="w-5 h-5 text-success-text" />
            <span>Canlı Sipariş Takip & Geçmişim</span>
          </h2>

          {orders.length === 0 ? (
            <div className="p-12 text-center bg-base-surface rounded-2xl border border-border text-text-muted text-xs shadow-xs">
              <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-30 text-success-text" />
              <p>Henüz aktif veya tamamlanan siparişiniz bulunmuyor.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map(order => (
                <div
                  key={order.id}
                  id={`order-card-${order.id}`}
                  className="bg-base-surface border border-border rounded-2xl p-5 shadow-xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border pb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-bg-success text-success-text border border-success-border flex items-center justify-center font-bold text-xs shrink-0">
                          SIP
                        </div>
                        <div>
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <span className="font-bold text-sm text-text-primary">{order.orderNumber}</span>
                            {getStatusBadge(order.status)}
                          </div>
                          <span className="text-[11px] text-text-muted">
                            {new Date(order.createdAt).toLocaleString('tr-TR')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-3 flex-wrap">
                        <div className="text-left md:text-right pr-1">
                          <div className="text-base font-extrabold text-success-text font-mono">
                            {(order.total || 0).toLocaleString('tr-TR')} ₺
                          </div>
                          <span className="text-[10px] text-text-muted font-mono">
                            KDV Dahil
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <button
                            onClick={() => setSelectedOrderForPDF(order)}
                            className="px-2.5 py-1.5 bg-base-surface-2 hover:bg-base-surface text-text-primary border border-border rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
                            title="Resmi Sipariş & İrsaliye PDF İndir / Yazdır"
                          >
                            <Printer className="w-3.5 h-3.5 text-success-text" />
                            <span className="hidden sm:inline">A4 İrsaliye</span>
                          </button>

                          {/* 80mm POS Thermal Receipt Button */}
                          <button
                            onClick={() => {
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
                            className="px-2.5 py-1.5 bg-base-surface-2 hover:bg-base-surface text-text-primary border border-border rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer shadow-2xs"
                            title="80mm / 58mm Termal Fiş Yazdır"
                          >
                            <Printer className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="hidden sm:inline">80mm Fiş</span>
                          </button>

                          {/* Bank Receipt Button */}
                          <button
                            onClick={() => {
                              setActiveOrderForReceipt(order);
                              setShowReceiptModal(true);
                            }}
                            className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/25 rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer shadow-2xs"
                            title="Bu sipariş için banka havale/EFT dekontu yükleyin"
                          >
                            <CreditCard className="w-3.5 h-3.5 text-amber-500" />
                            <span>Dekont Bildir</span>
                          </button>

                          {/* WhatsApp Share Button */}
                          <button
                            onClick={() => {
                              setWhatsAppShareState({
                                isOpen: true,
                                title: `Sipariş #${order.orderNumber}`,
                                defaultPhone: order.customerPhone || '05443210000',
                                defaultMessage: generateOrderWhatsAppMessage(order),
                                recipientName: 'ALPHA TEKNİK Müşteri Hizmetleri',
                              });
                            }}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
                            title="Sipariş onayını WhatsApp ile müşteri temsilcisine iletin"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">WhatsApp</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* D3.js Canlı Sipariş Durum & Durum Geçmişi Çizelgesi */}
                  <D3OrderStatusFlow
                    status={order.status}
                    orderId={order.id}
                    orderNumber={order.orderNumber}
                    trackingNumber={order.trackingNumber}
                    statusHistory={order.statusHistory}
                    createdAt={order.createdAt}
                    updatedAt={order.updatedAt}
                    isEditable={false}
                    showControls={false}
                  />

                  {/* Item breakdown */}
                  <div className="divide-y divide-border bg-base-surface-2 rounded-xl border border-border overflow-hidden text-xs">
                    {(order.items || []).map((item, idx) => (
                      <div key={idx} className="p-2.5 flex items-center justify-between">
                        <div>
                          <span className="font-medium text-text-primary">{item.productName || 'Ürün'}</span>
                          <span className="text-[11px] text-text-muted ml-2">
                            x {item.quantity || 1} {item.unit || 'ADET'}
                          </span>
                        </div>
                        <span className="font-bold text-text-primary">
                          {(item.totalPrice || 0).toLocaleString('tr-TR')} ₺
                        </span>
                      </div>
                    ))}
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Slide-out Cart & Checkout Drawer */}
      {showCartDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-base-surface border-l border-border h-full flex flex-col p-5 shadow-2xl text-text-primary overflow-y-auto">
            
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="w-5 h-5 text-success-text" />
                <h3 className="text-base font-bold text-text-primary">Sipariş Sepeti ({cartTotalItems} Ürün)</h3>
              </div>
              <button
                onClick={() => setShowCartDrawer(false)}
                className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-base-surface-2 transition-colors cursor-pointer"
              >
                Kapat
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-text-muted text-xs space-y-2">
                <ShoppingBag className="w-12 h-12 opacity-30 text-text-muted" />
                <p>Sepetiniz boş.</p>
                <button
                  onClick={() => setShowCartDrawer(false)}
                  className="px-4 py-2 bg-success-fill text-base font-bold rounded-xl text-xs cursor-pointer"
                >
                  Ürünleri İncele
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateOrder} className="flex-1 flex flex-col justify-between space-y-4 pt-4">
                
                {/* Cart Items List */}
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                  {cart.map(item => (
                    <div
                      key={item.product.id}
                      className="p-3 bg-base-surface-2 rounded-xl border border-border flex items-center justify-between text-xs shadow-xs gap-2"
                    >
                      <div className="flex-1 min-w-0 pr-1">
                        <div className="font-bold text-text-primary truncate" title={item.product.name}>
                          {item.product.name}
                        </div>
                        <div className="text-[11px] text-text-muted mt-0.5 flex items-center space-x-2">
                          <span>{item.product.price.toLocaleString('tr-TR')} ₺/{item.product.unit}</span>
                          <span className="font-mono font-bold text-success-text">
                            = {(item.product.price * item.quantity).toLocaleString('tr-TR')} ₺
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleUpdateCartQty(item.product.id, -1)}
                          className="p-1.5 bg-base-surface hover:bg-base-surface-2 rounded-lg text-text-primary cursor-pointer border border-border"
                          title="1 Azalt"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleSetCartQty(item.product.id, parseInt(e.target.value) || 0)}
                          className="w-14 text-center font-bold font-mono py-1 px-1 bg-base-surface border border-border rounded-lg text-xs text-text-primary focus:outline-none focus:border-border-strong"
                          title="Sipariş adedini yazın"
                        />
                        <span className="text-[10px] text-text-muted font-medium px-0.5">{item.product.unit}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateCartQty(item.product.id, 1)}
                          className="p-1.5 bg-base-surface hover:bg-base-surface-2 rounded-lg text-text-primary cursor-pointer border border-border"
                          title="1 Arttır"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(item.product.id)}
                          className="p-1.5 text-text-muted hover:text-danger-text hover:bg-bg-danger rounded-lg transition-colors cursor-pointer ml-1"
                          title="Ürünü sepetten çıkar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Customer Checkout Form */}
                <div className="space-y-2.5 p-3.5 bg-base-surface-2 rounded-xl border border-border text-xs shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-text-primary uppercase tracking-wider text-[11px]">
                      Teslimat & İletişim Bilgileri
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSiteModal(true)}
                      className="text-primary hover:underline text-[11px] font-bold flex items-center space-x-1 cursor-pointer"
                    >
                      <MapPin className="w-3 h-3" />
                      <span>{selectedSite ? selectedSite.siteName : 'Şantiyelerimden Seç'}</span>
                    </button>
                  </div>

                  <div>
                    <input
                      type="text"
                      required
                      placeholder="Yetkili Adı Soyadı *"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-base-surface border border-border rounded-lg text-text-primary text-xs focus:outline-none focus:border-border-strong"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="email"
                      required
                      placeholder="E-Posta *"
                      value={customerEmail}
                      onChange={e => setCustomerEmail(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-base-surface border border-border rounded-lg text-text-primary text-xs focus:outline-none focus:border-border-strong"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Telefon *"
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-base-surface border border-border rounded-lg text-text-primary text-xs focus:outline-none focus:border-border-strong"
                    />
                  </div>

                  <div>
                    <textarea
                      rows={2}
                      required
                      placeholder="Teslimat Adresi *"
                      value={customerAddress}
                      onChange={e => setCustomerAddress(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-base-surface border border-border rounded-lg text-text-primary text-xs focus:outline-none focus:border-border-strong resize-none"
                    />
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="Sipariş Notu (Opsiyonel)"
                      value={orderNotes}
                      onChange={e => setOrderNotes(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-base-surface border border-border rounded-lg text-text-primary text-xs focus:outline-none focus:border-border-strong"
                    />
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div className="space-y-2.5 p-3.5 bg-base-surface-2 rounded-xl border border-border text-xs shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-text-primary uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-success-text" />
                      <span>Ödeme Şekli</span>
                    </span>
                    <span className="text-[10px] text-text-muted">Güvenli Tahsilat</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('bank_transfer')}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        paymentMethod === 'bank_transfer'
                          ? 'border-emerald-500 bg-emerald-500/10 text-text-primary font-bold shadow-2xs'
                          : 'border-border bg-base-surface hover:bg-base-surface-2 text-text-secondary'
                      }`}
                    >
                      <div className="flex items-center space-x-1.5 mb-0.5">
                        <Building className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-xs">Havale / EFT</span>
                      </div>
                      <p className="text-[10px] text-text-muted font-normal">Banka IBAN ile doğrudan transfer</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('current_account')}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        paymentMethod === 'current_account'
                          ? 'border-emerald-500 bg-emerald-500/10 text-text-primary font-bold shadow-2xs'
                          : 'border-border bg-base-surface hover:bg-base-surface-2 text-text-secondary'
                      }`}
                    >
                      <div className="flex items-center space-x-1.5 mb-0.5">
                        <Wallet className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="text-xs">Cari Hesap</span>
                      </div>
                      <p className="text-[10px] text-text-muted font-normal">Açık hesap / Vadeli bakiye</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('credit_card')}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        paymentMethod === 'credit_card'
                          ? 'border-emerald-500 bg-emerald-500/10 text-text-primary font-bold shadow-2xs'
                          : 'border-border bg-base-surface hover:bg-base-surface-2 text-text-secondary'
                      }`}
                    >
                      <div className="flex items-center space-x-1.5 mb-0.5">
                        <CreditCard className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-xs">Kredi Kartı</span>
                      </div>
                      <p className="text-[10px] text-text-muted font-normal">Online Sanal POS veya Mail Order</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('on_delivery')}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        paymentMethod === 'on_delivery'
                          ? 'border-emerald-500 bg-emerald-500/10 text-text-primary font-bold shadow-2xs'
                          : 'border-border bg-base-surface hover:bg-base-surface-2 text-text-secondary'
                      }`}
                    >
                      <div className="flex items-center space-x-1.5 mb-0.5">
                        <Truck className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-xs">Kapıda Teslim</span>
                      </div>
                      <p className="text-[10px] text-text-muted font-normal">Kargo tesliminde nakit / kart</p>
                    </button>
                  </div>

                  {/* Bank Account Details (When Havale/EFT is selected) */}
                  {paymentMethod === 'bank_transfer' && (
                    <div className="mt-2 space-y-2 p-2.5 bg-base-surface rounded-xl border border-border">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-text-secondary">Hesap Seçin:</span>
                        <div className="flex space-x-1">
                          {COMPANY_BANK_ACCOUNTS.map((acc, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setSelectedBankIndex(idx)}
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                                selectedBankIndex === idx
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-base-surface-2 text-text-muted hover:text-text-primary'
                              }`}
                            >
                              {acc.bankName}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="p-2 bg-base-surface-2 rounded-lg border border-border space-y-1">
                        <div className="text-[11px] font-bold text-text-primary">
                          {COMPANY_BANK_ACCOUNTS[selectedBankIndex].accountName}
                        </div>
                        <div className="text-[10px] text-text-muted">
                          {COMPANY_BANK_ACCOUNTS[selectedBankIndex].bankName} - {COMPANY_BANK_ACCOUNTS[selectedBankIndex].branch}
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-border">
                          <span className="font-mono text-[11px] font-bold text-text-primary tracking-wider">
                            {COMPANY_BANK_ACCOUNTS[selectedBankIndex].iban}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyIban(COMPANY_BANK_ACCOUNTS[selectedBankIndex].iban)}
                            className="px-2 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 rounded-md text-[10px] font-bold flex items-center space-x-1 cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{copiedIban === COMPANY_BANK_ACCOUNTS[selectedBankIndex].iban ? 'Kopyalandı!' : 'Kopyala'}</span>
                          </button>
                        </div>
                      </div>
                      <p className="text-[10px] text-text-muted italic">
                        * Havale/EFT açıklamasına Ad-Soyad veya Sipariş No yazmayı unutmayınız.
                      </p>
                    </div>
                  )}
                </div>

                {/* Pricing Totals */}
                <div className="space-y-1.5 pt-2 border-t border-border text-xs">
                  <div className="flex justify-between text-text-secondary">
                    <span>Ara Toplam:</span>
                    <span>{cartSubtotal.toLocaleString('tr-TR')} ₺</span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>KDV (%20):</span>
                    <span>{cartTax.toLocaleString('tr-TR')} ₺</span>
                  </div>
                  <div className="flex justify-between text-sm font-extrabold text-text-primary pt-1 border-t border-border">
                    <span>Ödenecek Toplam:</span>
                    <span className="text-success-text font-mono">{cartGrandTotal.toLocaleString('tr-TR')} ₺</span>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSubmittingOrder}
                  className="w-full py-3 bg-success-fill hover:opacity-90 text-base font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isSubmittingOrder ? 'Mühürleniyor...' : 'Siparişi Onayla & Gönder (E2EE)'}</span>
                </button>

              </form>
            )}

          </div>
        </div>
      )}

      {/* Quick Quote Modal */}
      {showQuoteModal && (
        <QuickQuoteModal
          products={products}
          currentUser={currentUser}
          onClose={() => setShowQuoteModal(false)}
          onSubmit={handleSendQuoteRequest}
        />
      )}

      {/* Customer Financial / Account Balance Statement Modal */}
      {showFinancialModal && (
        <CustomerFinancialModal
          isOpen={showFinancialModal}
          onClose={() => setShowFinancialModal(false)}
          currentUser={currentUser}
          orders={orders}
        />
      )}

      {/* Quote PDF Preview Modal */}
      {selectedQuoteForPDF && (
        <QuotePDFModal
          quote={selectedQuoteForPDF}
          onClose={() => setSelectedQuoteForPDF(null)}
          onAccept={() => handleAcceptQuote(selectedQuoteForPDF.id)}
        />
      )}

      {/* Order PDF Preview Modal */}
      {selectedOrderForPDF && (
        <OrderPDFModal
          order={selectedOrderForPDF}
          onClose={() => setSelectedOrderForPDF(null)}
        />
      )}

      {/* WhatsApp Universal Share Modal */}
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

      {/* B2B Quick Bulk Order (Excel / Multi-line list) Modal */}
      {showBulkOrderModal && (
        <QuickBulkOrderModal
          isOpen={showBulkOrderModal}
          onClose={() => setShowBulkOrderModal(false)}
          products={products}
          onAddItemsToCart={handleBulkAddItems}
        />
      )}

      {/* B2B Ready Project Packages Modal */}
      {showPackagesModal && (
        <ProjectPackagesModal
          isOpen={showPackagesModal}
          onClose={() => setShowPackagesModal(false)}
          products={products}
          onAddPackageToCart={handleBulkAddItems}
        />
      )}

      {/* B2B Bank Accounts, EFT/Havale Receipt Upload & Sanal POS Modal */}
      {showReceiptModal && (
        <BankAccountsAndReceiptModal
          isOpen={showReceiptModal}
          onClose={() => {
            setShowReceiptModal(false);
            setActiveOrderForReceipt(null);
          }}
          order={activeOrderForReceipt || (orders.length > 0 ? orders[0] : null)}
          orders={orders}
          currentUser={currentUser}
          onReceiptSubmitted={() => {
            playNotificationSound('success');
          }}
        />
      )}

      {/* B2B Construction Sites & Delivery Addresses Modal */}
      {showSiteModal && (
        <ConstructionSiteModal
          isOpen={showSiteModal}
          onClose={() => setShowSiteModal(false)}
          currentUser={currentUser}
          onSelectSite={(site) => {
            setSelectedSite(site);
            setCustomerAddress(`${site.fullAddress}, ${site.district}/${site.city}`);
            setCustomerPhone(site.contactPhone || customerPhone);
            setCustomerName(site.contactPerson || customerName);
            if (site.deliveryNotes) {
              setOrderNotes(prev => prev ? `${prev} | Şantiye: ${site.deliveryNotes}` : `Şantiye: ${site.deliveryNotes}`);
            }
          }}
        />
      )}

      {/* Mobile Sticky Cart Bar (Always accessible when items are in cart) */}
      {cart.length > 0 && (
        <div 
          id="mobile-sticky-cart-bar"
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-base-surface/95 backdrop-blur-md border-t border-border px-4 py-2.5 shadow-2xl safe-area-bottom animate-in slide-in-from-bottom duration-200"
        >
          <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
            <button
              type="button"
              onClick={() => setShowCartDrawer(true)}
              className="flex items-center space-x-2.5 text-left cursor-pointer min-w-0 flex-1"
            >
              <div className="relative p-2 rounded-xl bg-info-fill/15 text-info-text shrink-0">
                <ShoppingBag className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-4.5 px-1 bg-emerald-600 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-xs">
                  {cartTotalItems}
                </span>
              </div>
              <div className="min-w-0">
                <div className="text-[11px] text-text-muted font-semibold truncate">
                  Sepet Toplamı ({cart.length} çeşit)
                </div>
                <div className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono leading-tight">
                  {cartGrandTotal.toLocaleString('tr-TR')} ₺
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setShowCartDrawer(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shrink-0 shadow-md cursor-pointer transition-all"
            >
              <span>Sepeti İncele</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
