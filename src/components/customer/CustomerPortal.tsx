import OrderTracking from './OrderTracking';
import { updateQuoteInFirestore } from '../../lib/firestoreService';
import QuoteTracking from './QuoteTracking';
import {customerOrders} from '../../utils/orderTracking';
import { shoppingService as defaultShoppingService, type ShoppingService } from '../../lib/shoppingService';
import { getStoredToken } from '../../lib/auth';
import React, { useState, useEffect, useRef } from 'react';
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
import { addShoppingItems, setShoppingQuantity } from '../../utils/shoppingCart';
import ShoppingCatalog from './ShoppingCatalog';
import ShoppingCheckout from './ShoppingCheckout';
import { Button, SearchInput, Select, Modal, FeedbackState } from '../ui';
import QuickQuoteModal from './QuickQuoteModal';
import CustomerFinancialModal from './CustomerFinancialModal';
import WhatsAppShareModal from '../common/WhatsAppShareModal';
import QuotePDFModal from '../QuotePDFModal';
import OrderPDFModal from '../OrderPDFModal';
import { OrderSuccessModal } from './OrderSuccessModal';
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

interface CustomerPortalProps {
  shoppingService?: ShoppingService;
  products: Product[];
  productsLoading?: boolean;
  productsError?: string;
  orders: Order[];
  ordersLoading?: boolean;
  ordersError?: string;
  quotes: Quote[];
  quotesLoading?: boolean;
  quotesError?: string;
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
  shoppingService = defaultShoppingService,
  products = [],
  productsLoading = false,
  productsError,
  orders: allOrders = [],
  ordersLoading = false,
  ordersError,
  quotes = [],
  quotesLoading = false,
  quotesError,
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
  const orders = customerOrders(allOrders, currentUser);
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
  useEffect(() => { setCart(prev => prev.map(item => ({...item, product: products.find(p=>p.id===item.product.id) || {...item.product,stock:0}}))); }, [products]);
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
  const submissionLock = useRef(false);
  const [orderError, setOrderError] = useState('');
  const [quoteActionError, setQuoteActionError] = useState('');
  const acceptingQuote = useRef(false);
  const [cartFeedback, setCartFeedback] = useState('');
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
  const cartSubtotal = Math.round(cart.reduce((acc, item) => acc + Math.round((item.product.price * item.quantity) * 100) / 100, 0) * 100) / 100;
  const cartTax = Math.round(cartSubtotal * 0.20 * 100) / 100;
  const cartGrandTotal = Math.round((cartSubtotal + cartTax) * 100) / 100;

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

    if (!currentUser) { onOpenAuth('login','customer'); return; }
    setCart(prev => addShoppingItems(prev, [{product,quantity:qtyToAdd}]));
    setCartFeedback(`${product.name}: sepet güncellendi.`);
    playNotificationSound('status');
  };

  const handleBulkAddItems = (items: Array<{ product: Product; quantity: number }>) => {
    if (!currentUser) { onOpenAuth('login','customer'); return; }
    setCart(prev => addShoppingItems(prev,items));
    setShowCartDrawer(true);
    playNotificationSound('success');
  };

  const handleSetCartQty = (productId: string, qty: number) => {
    setCart(prev => setShoppingQuantity(prev,productId,qty));
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
    if (submissionLock.current || cart.length === 0) return;
    if (!currentUser) { onOpenAuth('login', 'customer'); return; }
    if (cart.some(i => !Number.isFinite(i.quantity) || i.quantity < (i.product.minOrderQuantity || 1) || i.quantity > (products.find(p=>p.id===i.product.id)?.stock ?? i.product.stock ?? 0))) { setOrderError('Sepetteki miktarları güncel stok sınırına göre düzenleyin.'); return; }
    submissionLock.current = true;
    setOrderError('');
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
        // Guvenlik: e-posta formdan degil OTURUMDAN alinir. Firestore kurali
        // customerEmail == token e-postasi sartini arar; boylece kimse baskasinin
        // adina siparis olusturamaz.
        customerEmail: currentUser.email,
        customerPhone,
        customerAddress,
        paymentMethod: paymentMethod === 'bank_transfer' ? 'Havale/EFT' : (paymentMethod === 'credit_card' ? 'Kredi Kartı' : (paymentMethod === 'current_account' ? 'Cari Hesap' : 'Kapıda Ödeme')),
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

      const createdOrder = await shoppingService.createOrder(payload);

      setCart([]);
      setShowCartDrawer(false);
      setLastCreatedOrder(createdOrder);
      setOrderSuccessMsg(`Siparişiniz başarıyla oluşturuldu! Sipariş No: ${createdOrder.orderNumber}`);
      setActiveTab('orders');
      onRefresh();

      playNotificationSound('success');

    } catch (err: any) {
      console.error('handleCreateOrder error:', err);
      const msg = err?.message && typeof err.message === 'string' && !err.message.includes('fetch') && !err.message.includes('Network')
        ? err.message
        : 'Siparişin kaydı doğrulanamadı. Sepetiniz korundu. Yeniden göndermeden önce Siparişlerim bölümünü kontrol edin.';
      setOrderError(msg);
    } finally {
      submissionLock.current = false;
      setIsSubmittingOrder(false);
    }
  };

  const handleSendQuoteRequest = async (quoteData: any) => {
    await shoppingService.requestQuote(quoteData);
    setActiveTab('quotes');
    playNotificationSound('quote');
    onRefresh();
  };

  const handleAcceptQuote = async (quoteId: string) => {
    if (acceptingQuote.current) return;
    acceptingQuote.current = true;
    setQuoteActionError('');
    try {
      // Firestore'a yaz. Eskiden olu /api/quotes/:id/accept cagriliyordu;
      // musteri teklifi KABUL EDEMIYORDU. Kurallar musteriye yalnizca 'status'
      // alanini 'accepted'/'rejected' yapma izni verir. (19.09.2026)
      await updateQuoteInFirestore(quoteId, { status: 'accepted' } as any);
      playNotificationSound('success');
      onRefresh();
    } catch (e: any) {
      console.error('Teklif kabul hatası:', e);
      setQuoteActionError('Teklif kabul edilemedi: ' + (e?.message || 'bilinmeyen hata'));
    } finally {
      acceptingQuote.current = false;
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
        return <span className="px-2.5 py-1 rounded-full bg-bg-warning text-warning-text border border-warning-border text-xs font-semibold flex items-center space-x-1"><Truck className="w-3 h-3 text-warning-text" /><span>Sevkiyatta / Yolda</span></span>;
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
    <div className="premium-section-six space-y-6 pb-24 md:pb-6">
      
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
            aria-selected={activeTab === 'catalog' || activeTab === 'home'}
            onClick={() => setActiveTab('catalog')}
            className={`flex items-center justify-center space-x-1.5 px-2 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer select-none min-w-0 ${
              activeTab === 'catalog' || activeTab === 'home'
                ? 'bg-base-surface text-text-primary border border-border shadow-xs'
                : 'text-text-secondary hover:text-text-primary hover:bg-base-surface'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 shrink-0 hidden sm:inline" />
            <span className="whitespace-nowrap">Ürün Kataloğu</span>
          </button>

          <button
            id="tab-customer-quotes"
            role="tab"
            aria-selected={activeTab === 'quotes'}
            onClick={() => setActiveTab('quotes')}
            className={`relative flex items-center justify-center space-x-1.5 px-2 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer select-none min-w-0 ${
              activeTab === 'quotes'
                ? 'bg-warning-fill text-slate-950 font-bold shadow-xs'
                : 'text-text-secondary hover:text-text-primary hover:bg-base-surface'
            }`}
          >
            <FileText className="w-3.5 h-3.5 shrink-0 hidden sm:inline" />
            <span className="whitespace-nowrap">Tekliflerim</span>
            {(quotes || []).filter((q) => q.status === 'offer_sent').length > 0 && (
              <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping ml-0.5 shrink-0" />
            )}
          </button>

          <button
            id="tab-customer-orders"
            role="tab"
            aria-selected={activeTab === 'orders'}
            onClick={() => setActiveTab('orders')}
            className={`flex items-center justify-center space-x-1 sm:space-x-1.5 px-2 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer select-none min-w-0 ${
              activeTab === 'orders'
                ? 'bg-base-surface text-text-primary border border-border shadow-xs'
                : 'text-text-secondary hover:text-text-primary hover:bg-base-surface'
            }`}
          >
            <Clock className="w-3.5 h-3.5 shrink-0 hidden sm:inline" />
            <span className="whitespace-nowrap">Siparişlerim</span>
            {orders.length > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold shrink-0 tabular-nums ${
                  activeTab === 'orders' ? 'bg-base-surface-2 text-text-primary' : 'bg-base-surface text-text-muted'
                }`}
              >
                {orders.length}
              </span>
            )}
            {orders.filter(o => ['pending', 'preparing', 'shipped'].includes(o.status)).length > 0 && activeTab !== 'orders' && (
              <span className="w-2 h-2 rounded-full bg-info-fill animate-pulse shrink-0" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Quick Action Cart Button */}
        <button
          id="btn-cart-toggle"
          onClick={() => setShowCartDrawer(true)}
          className="relative flex items-center justify-center space-x-1.5 px-3 sm:px-4 py-2 bg-info-fill hover:opacity-90 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-[0.98] shrink-0"
          title="Sepeti Görüntüle"
        >
          <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">Sepetim</span>
          {cartTotalItems > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-white text-info-text text-[10px] sm:text-[11px] font-extrabold shadow-2xs shrink-0">
              {cartTotalItems}
            </span>
          )}
        </button>
      </div>

      {/* Actionable Notification Banner (when user has active quotes/orders) */}
      {(() => {
        const readyQuotesCount = (quotes || []).filter((q) => q.status === 'offer_sent').length;
        const activeOrdersCount = (orders || []).filter((o) => o.status === 'pending' || o.status === 'preparing' || o.status === 'shipped').length;

        if (readyQuotesCount > 0) {
          return (
            <div
              role="button"
              tabIndex={0}
              onClick={() => setActiveTab('quotes')}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setActiveTab('quotes')}
              className="p-3 sm:p-4 rounded-2xl bg-bg-warning border border-warning-border flex items-center justify-between shadow-xs cursor-pointer hover:opacity-95 transition-all select-none"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-warning-border text-warning-text border border-warning-border shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs sm:text-sm font-bold text-text-primary">
                      {readyQuotesCount} adet hazır fiyat teklifiniz onay bekliyor
                    </span>
                    <span className="w-2 h-2 rounded-full bg-warning-fill animate-ping shrink-0" />
                  </div>
                  <p className="text-[11px] text-text-secondary">
                    İnceleyip tek tıkla siparişe dönüştürmek için tıklayın.
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-1 text-xs font-bold text-warning-text hover:underline shrink-0">
                <span>Teklifi İncele</span>
                <span>➔</span>
              </div>
            </div>
          );
        } else if (activeOrdersCount > 0 && (activeTab === 'home' || activeTab === 'catalog')) {
          return (
            <div
              role="button"
              tabIndex={0}
              onClick={() => setActiveTab('orders')}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setActiveTab('orders')}
              className="p-3 sm:p-4 rounded-2xl bg-bg-success border border-success-border flex items-center justify-between shadow-xs cursor-pointer hover:opacity-95 transition-all select-none"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-success-border text-success-text border border-success-border shrink-0">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs sm:text-sm font-bold text-text-primary">
                    {activeOrdersCount} adet işlemde siparişiniz hazırlanıyor / sevkiyatta
                  </span>
                  <p className="text-[11px] text-text-secondary">
                    Teslimat aşamasını ve canlı sevkiyat durumunu görüntülemek için tıklayın.
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-1 text-xs font-bold text-success-text hover:underline shrink-0">
                <span>Takip Et</span>
                <span>➔</span>
              </div>
            </div>
          );
        }
        return null;
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

      {/* TAB 1: PRODUCT CATALOG (Active on 'catalog' or 'home') */}
      {(activeTab === 'catalog' || activeTab === 'home') && (
        <div className="space-y-4 ui-tab-fade">
          {/* Horizontal Category Scroll Pills */}
          <div className="ui-scroll-pills-container">
            <div className="ui-scroll-pills custom-scrollbar">
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategorySelect(cat)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border select-none active:scale-[0.98] shrink-0 ${
                      isSelected
                        ? 'bg-base-surface-2 text-text-primary border-border-strong shadow-xs font-bold'
                        : 'bg-base-surface text-text-secondary border-border hover:border-border-strong hover:text-text-primary'
                    }`}
                  >
                    {cat === 'all' ? 'Tüm Ürünler' : cat}
                  </button>
                );
              })}
            </div>
            <div className="ui-scroll-fade-edge" aria-hidden="true" />
          </div>

          <ShoppingCatalog
            products={paginatedProducts}
            allProducts={products}
            cart={cart}
            user={currentUser}
            search={<SearchInput value={searchQuery} onValueChange={handleSearchChange} label="Ürün adı, stok kodu veya barkod" />}
            filters={
              <>
                <Select label="Alt kategori" value={selectedSubCategory || ''} onChange={(e) => handleCategorySelect(selectedCategory, e.target.value || undefined)}>
                  <option value="">Tüm alt kategoriler</option>
                  {Array.from(new Set(products.filter((p) => selectedCategory === 'all' || p.category === selectedCategory).map((p) => p.subCategory).filter(Boolean))).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer px-2 py-2">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => {
                      setInStockOnly(e.target.checked);
                      setCurrentPage(1);
                    }}
                    className="accent-ui-primary w-4 h-4"
                  />
                  <span>Yalnızca stoktakiler</span>
                </label>
              </>
            }
            query={searchQuery}
            total={filteredProducts.length}
            page={safePage}
            pages={totalPages}
            pageSize={pageSize}
            view={viewMode}
            onView={setViewMode}
            onPage={setCurrentPage}
            onPageSize={(n) => {
              setPageSize(n);
              setCurrentPage(1);
            }}
            onReset={() => {
              handleClearSearch();
              handleCategorySelect('all');
              setInStockOnly(false);
            }}
            onLogin={() => onOpenAuth('login', 'customer')}
            onQuote={() => setShowQuoteModal(true)}
            onBulk={() => setShowBulkOrderModal(true)}
            getQuantity={getProductSelectedQty}
            onQuantity={handleSetSelectedQty}
            onAdd={handleAddToCart}
          />
        </div>
      )}
      {cartFeedback && <p className="ui-scope text-xs text-success-text font-semibold px-2" role="status" aria-live="polite">{cartFeedback}</p>}

      {/* TAB 2: MY QUOTES */}
      {activeTab === 'quotes' && (
        <QuoteTracking
          quotes={quotes}
          user={currentUser}
          loading={quotesLoading}
          error={quotesError}
          actionError={quoteActionError}
          isAccepting={acceptingQuote.current}
          onRetry={onRefresh}
          onLogin={() => onOpenAuth('login', 'customer')}
          onNewQuote={() => {
            if (!currentUser) {
              onOpenAuth('login', 'customer');
              return;
            }
            setShowQuoteModal(true);
          }}
          onAcceptQuote={handleAcceptQuote}
          onViewPdf={(quote) => setSelectedQuoteForPDF(quote)}
          onShareWhatsApp={(quote) => {
            const msg = generateQuoteWhatsAppMessage(quote);
            setWhatsAppShareState({
              isOpen: true,
              title: `Teklif Paylaşımı - #${quote.quoteNumber}`,
              defaultPhone: quote.customerPhone || currentUser?.phone || '',
              defaultMessage: msg,
              recipientName: quote.customerName || currentUser?.name || 'Müşteri'
            });
          }}
          onGoToCatalog={() => setActiveTab('catalog')}
        />
      )}

      {activeTab === 'orders' && <OrderTracking orders={orders} user={currentUser} loading={ordersLoading} error={ordersError} onRetry={onRefresh} onLogin={()=>onOpenAuth('login','customer')} onPrint={setSelectedOrderForPDF} onReceipt={order=>{setActiveOrderForReceipt(order);setShowReceiptModal(true);}}/>}

      <ShoppingCheckout open={showCartDrawer} onClose={()=>setShowCartDrawer(false)} cart={cart} user={currentUser}
        onLogin={()=>{setShowCartDrawer(false);onOpenAuth('login','customer');}} onQuantity={handleSetCartQty} onRemove={handleRemoveFromCart} onClear={()=>setCart([])}
        fields={{name:customerName,email:customerEmail,phone:customerPhone,address:customerAddress,notes:orderNotes}}
        onField={(key,value)=>({name:setCustomerName,email:setCustomerEmail,phone:setCustomerPhone,address:setCustomerAddress,notes:setOrderNotes}[key])(value)}
        onSite={()=>{setShowCartDrawer(false);setShowSiteModal(true);}}
        payment={paymentMethod} onPayment={setPaymentMethod} banks={COMPANY_BANK_ACCOUNTS} bankIndex={selectedBankIndex} onBank={setSelectedBankIndex} onCopy={handleCopyIban} copied={copiedIban}
        subtotal={cartSubtotal} tax={cartTax} total={cartGrandTotal} busy={isSubmittingOrder} error={orderError} onSubmit={handleCreateOrder}/>

      {/* Premium B2B Order Success & Confirmation Modal */}
      <OrderSuccessModal
        isOpen={!!orderSuccessMsg && !!lastCreatedOrder}
        order={lastCreatedOrder}
        onClose={() => {
          setOrderSuccessMsg('');
          setLastCreatedOrder(null);
        }}
        onGoToOrders={() => {
          setOrderSuccessMsg('');
          setLastCreatedOrder(null);
          setActiveTab('orders');
        }}
        onViewPdf={(order) => {
          setSelectedOrderForPDF(order);
        }}
        onUploadReceipt={(order) => {
          setActiveOrderForReceipt(order);
          setShowReceiptModal(true);
        }}
        onShareWhatsApp={(order) => {
          const msg = generateOrderWhatsAppMessage(order);
          setWhatsAppShareState({
            isOpen: true,
            title: `Sipariş Bilgilendirmesi - #${order.orderNumber}`,
            defaultPhone: order.customerPhone || currentUser?.phone || '',
            defaultMessage: msg,
            recipientName: order.customerName || currentUser?.name || 'Müşteri'
          });
        }}
      />

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
          selectedOrder={activeOrderForReceipt || (orders.length > 0 ? orders[0] : null)}
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
            setShowCartDrawer(true);
            setCustomerAddress(`${site.fullAddress}, ${site.district}/${site.city}`);
            setCustomerPhone(site.contactPhone || customerPhone);
            setCustomerName(site.contactPerson || customerName);
            if (site.deliveryNotes) {
              setOrderNotes(prev => prev ? `${prev} | Şantiye: ${site.deliveryNotes}` : `Şantiye: ${site.deliveryNotes}`);
            }
          }}
        />
      )}

      {/* Mobile Sticky Cart Action Bar */}
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
                <ShoppingBag className="w-5 h-5 text-info-text" />
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-4.5 px-1 bg-info-fill text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-xs tabular-nums">
                  {cartTotalItems}
                </span>
              </div>
              <div className="min-w-0">
                <div className="text-[11px] text-text-muted font-semibold truncate">
                  Sepet Toplamı ({cart.length} çeşit)
                </div>
                <div className="text-base font-black text-text-primary font-mono leading-tight tabular-nums">
                  {cartGrandTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setShowCartDrawer(true)}
              className="px-4 py-2.5 bg-info-fill hover:opacity-90 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shrink-0 shadow-md cursor-pointer transition-all"
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
