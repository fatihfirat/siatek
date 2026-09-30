import {
  AlertTriangle,
  ArrowRight,
  Box,
  FileText,
  Bell,
  ChevronDown,
  Eye,
  EyeOff,
  Menu,
  Search,
  Sun,
  Home,
  Sparkles,
  Truck,
  X,
  ReceiptText,
  ShoppingCart,
  Users,
  WalletCards,
  Building2,
  Package,
  Clock,
  CheckCircle2,
  CreditCard,
  Plus,
  Landmark,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import type { User, Product, Order, Quote } from '../../types';
import { db, collection, getDocs, query, where } from '../../lib/firebase';
import { useModalBehavior } from '../../hooks/useModalBehavior';

interface Props {
  user: User | null;
  products: Product[];
  orders: Order[];
  quotes: Quote[];
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  onNavigateTab: (tab: 'home' | 'catalog' | 'orders' | 'quotes') => void;
  onOpenQuickOrder: () => void;
  onOpenQuickQuote: () => void;
  onOpenSites: () => void;
  onOpenFinancial: () => void;
  onOpenReceipt: () => void;
  onOpenPackages: () => void;
  onOpenAuth: (tab?: 'login' | 'register', role?: 'customer') => void;
  onOpenNotifications: () => void;
  onToggleTheme: () => void;
  onOpenAI: () => void;
  onAddToCart: (product: Product, quantity?: number) => void;
  onViewOrderDetails?: (order: Order) => void;
}

const money = (value: number) =>
  `${Number.isFinite(value) ? value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'} ₺`;

const day = () =>
  new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' }).format(new Date());

const firstName = (name: string) =>
  name.replace(/\s*\([^)]*\)\s*/g, ' ').trim().split(/\s+/)[0] || 'Değerli';

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toLocaleUpperCase('tr-TR') || 'BY';

export function MobileDealerOverview({
  user,
  products,
  orders,
  quotes,
  loading = false,
  error = '',
  onRetry,
  onNavigateTab,
  onOpenQuickOrder,
  onOpenQuickQuote,
  onOpenSites,
  onOpenFinancial,
  onOpenReceipt,
  onOpenPackages,
  onOpenAuth,
  onOpenNotifications,
  onToggleTheme,
  onOpenAI,
  onAddToCart,
  onViewOrderDetails,
}: Props) {
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [period, setPeriod] = useState<'today' | 'month' | 'year'>('month');
  const [cariInfo, setCariInfo] = useState<{
    balance: number;
    creditLimit: number;
    paymentTermDays: number;
    status: string;
  } | null>(null);

  // Cari hesap bakiyesini Firestore'dan canlı oku
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.email) return;
      try {
        const snap = await getDocs(
          query(collection(db, 'cari_accounts'), where('email', '==', user.email.toLowerCase()))
        );
        if (cancelled) return;
        snap.forEach((d) => {
          const data = d.data() as any;
          setCariInfo({
            balance: Number(data.balance) || 0,
            creditLimit: Number(data.creditLimit) || 100000,
            paymentTermDays: Number(data.paymentTermDays) || 30,
            status: data.status || 'active',
          });
        });
      } catch {
        /* kural kısıtlaması durumunda sessiz */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.email]);

  const userName = user?.name || user?.companyName || 'Bayi Temsilcisi';
  const companyName = user?.companyName || 'Alpha Teknik Bayi Portalı';

  // Finansal hesaplamalar
  const currentBalance = cariInfo?.balance ?? 0;
  const creditLimit = cariInfo?.creditLimit ?? 100000;
  const availableLimit = Math.max(creditLimit - currentBalance, 0);

  // Bekleyen işler
  const pendingQuotes = (quotes || []).filter((q) => q.status === 'offer_sent');
  const activeOrders = (orders || []).filter((o) =>
    ['pending', 'approved', 'preparing', 'shipped', 'out_for_delivery'].includes(o.status)
  );
  const shippedOrders = (orders || []).filter((o) => ['shipped', 'out_for_delivery'].includes(o.status));

  // Son siparişler (en güncel 4 sipariş)
  const recentOrders = useMemo(() => {
    return [...(orders || [])]
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, 4);
  }, [orders]);

  // Aylık sipariş hacmi bar grafiği (son 10 ay)
  const monthTotals = useMemo(() => {
    return Array.from({ length: 10 }, (_, index) => {
      const date = new Date();
      date.setDate(1);
      date.setMonth(date.getMonth() - (9 - index));
      return (orders || [])
        .filter((o) => {
          if (o.status === 'cancelled') return false;
          const created = new Date(o.createdAt);
          return (
            created.getMonth() === date.getMonth() &&
            created.getFullYear() === date.getFullYear()
          );
        })
        .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    });
  }, [orders]);

  const maxMonth = Math.max(...monthTotals.map(Math.abs), 1);
  const currentMonthTotal = monthTotals.at(-1) || 0;

  // Hızlı vitrin ürünleri (ilk 6 stoktaki ürün)
  const featuredProducts = useMemo(() => {
    return (products || []).filter((p) => p.stock > 0).slice(0, 6);
  }, [products]);

  if (loading) return <MobileDealerOverviewSkeleton />;

  if (error) {
    return (
      <section className="mobile-erp-state" role="alert">
        <AlertTriangle />
        <h2>Bayi portalı verileri yüklenemedi</h2>
        <p>{error}</p>
        {onRetry && (
          <button type="button" onClick={onRetry}>
            Yeniden Dene
          </button>
        )}
      </section>
    );
  }

  return (
    <section className="mobile-erp-overview" aria-label="Alpha Teknik mobil bayi özeti">
      {/* 1. Karşılama Başlığı */}
      <header className="mobile-erp-welcome">
        <div>
          <small>{day()}</small>
          <h1>Hoş Geldiniz, {firstName(userName)}</h1>
          <p>{companyName}</p>
        </div>
        <button
          type="button"
          aria-label="Cari hesap ve bayi bilgileri"
          onClick={onOpenFinancial}
          title="Finansal Durum & Hesap"
        >
          <span>{initials(companyName || userName)}</span>
          <i />
        </button>
      </header>

      {/* 3. Bayi Cari Bakiye ve Finansal Durum Kartı (Lüks Slate & Emerald) */}
      <article className="mobile-erp-balance">
        <div className="mobile-erp-balance__head">
          <span>
            <b>Bayi Cari Bakiyeniz</b>
            <small>Canlı ERP ve Cari Senkronizasyonu</small>
          </span>
          <span className="mobile-erp-balance__tools">
            <button type="button" onClick={onOpenFinancial}>
              TRY <ChevronDown />
            </button>
            <button
              type="button"
              aria-label={balanceVisible ? 'Bakiyeyi gizle' : 'Bakiyeyi göster'}
              onClick={() => setBalanceVisible((v) => !v)}
            >
              {balanceVisible ? (
                <>
                  <Eye className="w-3.5 h-3.5" /> Gizle
                </>
              ) : (
                <>
                  <EyeOff className="w-3.5 h-3.5" /> Göster
                </>
              )}
            </button>
          </span>
        </div>

        <strong>
          {balanceVisible
            ? currentBalance > 0
              ? `${money(currentBalance)} (Borç)`
              : currentBalance < 0
              ? `${money(Math.abs(currentBalance))} (Alacak)`
              : '0,00 ₺'
            : '•••••• ₺'}
        </strong>

        <div className="mobile-erp-balance__change">
          <span>{cariInfo?.status === 'active' ? 'Aktif Bayi' : 'Canlı Bakiye'}</span>
          <span>Vade: {cariInfo?.paymentTermDays || 30} Gün</span>
          {user?.discountTier && <span>İskonto: {user.discountTier}</span>}
        </div>

        <div className="mobile-erp-period" aria-label="Görünüm dönemi">
          {([
            ['today', 'Bugün'],
            ['month', 'Bu Ay'],
            ['year', 'Bu Yıl'],
          ] as const).map(([id, label]) => (
            <button
              type="button"
              key={id}
              aria-pressed={period === id}
              onClick={() => setPeriod(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mobile-erp-balance__split">
          <button type="button" onClick={onOpenFinancial}>
            <i className="is-income">
              <Landmark />
            </i>
            <span>
              Kredi Limiti
              <b>{money(creditLimit)}</b>
            </span>
          </button>
          <button type="button" onClick={onOpenFinancial}>
            <i className="is-expense">
              <CreditCard />
            </i>
            <span>
              Kullanılabilir Limit
              <b>{money(availableLimit)}</b>
            </span>
          </button>
        </div>
      </article>

      {/* 4. Hızlı İşlemler Kartları (4 Temel Touch Aksiyonu) */}
      <section className="mobile-erp-section">
        <div className="mobile-erp-title">
          <h2>Hızlı Bayi İşlemleri</h2>
          <button type="button" onClick={() => onNavigateTab('catalog')}>
            Kataloğa Git <ArrowRight />
          </button>
        </div>
        <div className="mobile-erp-actions">
          <button type="button" onClick={onOpenQuickOrder} title="Hızlı Toplu Sipariş">
            <i>
              <ReceiptText />
            </i>
            <span>Hızlı Sipariş</span>
          </button>
          <button type="button" onClick={onOpenQuickQuote} title="Özel Fiyat Teklifi İste">
            <i>
              <FileText />
            </i>
            <span>Teklif İste</span>
          </button>
          <button type="button" onClick={() => onNavigateTab('catalog')} title="Stok ve Ürün Kataloğu">
            <i>
              <Package />
            </i>
            <span>Katalog & Stok</span>
          </button>
          <button type="button" onClick={onOpenSites} title="Kayıtlı Şantiyeler">
            <i>
              <Building2 />
            </i>
            <span>Şantiyelerim</span>
          </button>
        </div>
      </section>

      {/* 5. Bildirim & Aksiyon Kartları (Bekleyen Teklif / Sevkiyat) */}
      {pendingQuotes.length > 0 ? (
        <button
          type="button"
          className="mobile-erp-alert"
          style={{ borderColor: 'var(--border-warning-color, #fde68a)', background: 'var(--bg-warning-color, #fffbeb)', color: 'var(--text-warning-color, #92400e)' }}
          onClick={() => onNavigateTab('quotes')}
        >
          <span style={{ background: '#fef3c7', color: '#b45309' }}>
            <Sparkles className="w-4 h-4" />
          </span>
          <span>
            <strong>{pendingQuotes.length} adet fiyat teklifiniz onay bekliyor</strong>
            <small style={{ color: '#b45309' }}>İnceleyip tek dokunuşla siparişe dönüştürün.</small>
          </span>
          <b style={{ color: '#b45309' }}>
            İncele <ArrowRight className="w-3.5 h-3.5" />
          </b>
        </button>
      ) : shippedOrders.length > 0 ? (
        <button
          type="button"
          className="mobile-erp-alert"
          style={{ borderColor: '#bae6fd', background: '#f0f9ff', color: '#0369a1' }}
          onClick={() => onNavigateTab('orders')}
        >
          <span style={{ background: '#e0f2fe', color: '#0284c7' }}>
            <Truck className="w-4 h-4" />
          </span>
          <span>
            <strong>{shippedOrders.length} adet siparişiniz sevkiyatta</strong>
            <small style={{ color: '#0284c7' }}>Araçlarımız doğrudan şantiye adresinize sevk ediyor.</small>
          </span>
          <b style={{ color: '#0284c7' }}>
            Takip Et <ArrowRight className="w-3.5 h-3.5" />
          </b>
        </button>
      ) : (
        <div className="mobile-erp-clear">
          <span>✓</span>
          <span>
            <strong>Tüm sipariş ve teklifleriniz güncel</strong>
            <small>Aktif sevkiyat ve bekleyen teklif bulunmuyor.</small>
          </span>
        </div>
      )}

      {/* 6. Aylık Sipariş Hacmi Trendi */}
      <section className="mobile-erp-section">
        <div className="mobile-erp-title">
          <h2>Sipariş Hacmi Trendi</h2>
          <button type="button" onClick={() => onNavigateTab('orders')}>
            Siparişlerim <ArrowRight />
          </button>
        </div>
        <article className="mobile-erp-cashflow">
          <div>
            <span>
              {new Date().toLocaleDateString('tr-TR', { month: 'long' }).toLocaleUpperCase('tr-TR')}
            </span>
            <strong>{money(currentMonthTotal)}</strong>
            <small>Bu ayki toplam sipariş tutarınız</small>
          </div>
          <div className="mobile-erp-bars">
            {monthTotals.map((value, index) => (
              <i
                key={index}
                className={index >= 8 ? 'is-active' : ''}
                style={{ height: `${Math.max(12, (Math.abs(value) / maxMonth) * 100)}%` }}
                title={`${value.toLocaleString('tr-TR')} ₺`}
              />
            ))}
          </div>
        </article>
      </section>

      {/* 7. Son Siparişler Akışı */}
      <section className="mobile-erp-section">
        <div className="mobile-erp-title">
          <h2>Son Siparişlerim</h2>
          <button type="button" onClick={() => onNavigateTab('orders')}>
            Tümünü Gör <ArrowRight />
          </button>
        </div>
        {recentOrders.length === 0 ? (
          <div className="mobile-erp-empty">
            <ReceiptText />
            <strong>Henüz verilmiş bir siparişiniz yok</strong>
            <span>Katalogdan ürün seçerek hemen ilk siparişinizi oluşturun.</span>
            <button
              type="button"
              onClick={() => onNavigateTab('catalog')}
              className="mt-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xs active:scale-[0.98]"
            >
              Kataloğu Aç
            </button>
          </div>
        ) : (
          <div className="mobile-erp-transactions">
            {recentOrders.map((order) => {
              const statusLabel =
                order.status === 'delivered'
                  ? 'Teslim Edildi'
                  : order.status === 'shipped'
                  ? 'Sevkiyatta'
                  : order.status === 'preparing'
                  ? 'Hazırlanıyor'
                  : order.status === 'approved'
                  ? 'Onaylandı'
                  : 'Onay Bekliyor';
              const isDelivered = order.status === 'delivered';
              const isShipped = order.status === 'shipped';

              return (
                <button
                  type="button"
                  key={order.id}
                  onClick={() => {
                    if (onViewOrderDetails) {
                      onViewOrderDetails(order);
                    } else {
                      onNavigateTab('orders');
                    }
                  }}
                >
                  <i>{order.orderNumber ? order.orderNumber.slice(-3) : 'SIP'}</i>
                  <span>
                    <strong>
                      {order.orderNumber || `#SIP-${order.id.slice(0, 6)}`}
                    </strong>
                    <small>
                      {new Date(order.createdAt).toLocaleDateString('tr-TR')} · {order.items?.length || 0} Kalem Ürün
                    </small>
                  </span>
                  <b className={isDelivered ? 'text-emerald-600' : isShipped ? 'text-sky-600' : ''}>
                    {money(order.total)}
                    <small className={isDelivered ? '' : isShipped ? 'text-sky-600' : 'text-amber-600'}>
                      {statusLabel}
                    </small>
                  </b>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* 8. Hızlı Stok & Çok Satan Ürünler Vitrini */}
      {featuredProducts.length > 0 && (
        <section className="mobile-erp-section">
          <div className="mobile-erp-title">
            <h2>Hızlı İkmal & Stoktaki Ürünler</h2>
            <button type="button" onClick={() => onNavigateTab('catalog')}>
              Tüm Liste ({products.length}) <ArrowRight />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {featuredProducts.map((product) => (
              <div
                key={product.id}
                className="p-3 bg-base-surface border border-border hover:border-border-strong rounded-2xl flex flex-col justify-between gap-2 shadow-xs transition-all"
              >
                <div>
                  <div className="flex items-center justify-between text-[10px] text-text-muted mb-1">
                    <span className="font-mono">{product.sku || 'STOK'}</span>
                    <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                      {product.stock} {product.unit || 'Adet'}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-text-primary line-clamp-2 leading-tight">
                    {product.name}
                  </h4>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-border mt-1">
                  <div className="text-xs font-mono font-bold text-text-primary tabular-nums">
                    {money(product.price)}
                  </div>
                  <button
                    type="button"
                    onClick={() => onAddToCart(product, product.minOrderQuantity || 1)}
                    className="w-7 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-2xs active:scale-[0.95] cursor-pointer"
                    title="Sepete Ekle"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 9. Doğrudan Sevkiyat & Şantiye Güvencesi */}
      <button
        type="button"
        className="mobile-erp-stock"
        style={{ borderColor: 'var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-primary-color)' }}
        onClick={onOpenSites}
      >
        <span style={{ background: 'var(--bg-surface-2)', color: 'var(--ui-primary)' }}>
          <Truck className="w-5 h-5" />
        </span>
        <span>
          <strong>Alpha Teknik Özmal Araç Sevkiyatı</strong>
          <small style={{ color: 'var(--text-secondary-color)' }}>
            Şanlıurfa ve bölge şantiyelerine doğrudan adrese teslimat garantisi.
          </small>
        </span>
        <ArrowRight className="w-4 h-4 text-text-muted" />
      </button>
    </section>
  );
}

interface HeaderProps {
  userName: string;
  companyName: string;
  pendingQuotesCount: number;
  activeOrdersCount: number;
  onNavigateTab: (tab: 'home' | 'catalog' | 'orders' | 'quotes') => void;
  onOpenQuickOrder: () => void;
  onOpenQuickQuote: () => void;
  onOpenSites: () => void;
  onOpenFinancial: () => void;
  onOpenReceipt: () => void;
  onOpenNotifications: () => void;
  onToggleTheme: () => void;
  onOpenAI: () => void;
}

export function MobileDealerHeader({
  userName,
  companyName,
  pendingQuotesCount,
  activeOrdersCount,
  onNavigateTab,
  onOpenQuickOrder,
  onOpenQuickQuote,
  onOpenSites,
  onOpenFinancial,
  onOpenReceipt,
  onOpenNotifications,
  onToggleTheme,
  onOpenAI,
}: HeaderProps) {
  const [open, setOpen] = useState(false);
  useModalBehavior(open, () => setOpen(false));

  useEffect(() => {
    const show = () => setOpen(true);
    document.addEventListener('siatek:open-mobile-dealer-menu', show);
    return () => document.removeEventListener('siatek:open-mobile-dealer-menu', show);
  }, []);

  const go = (tab: 'home' | 'catalog' | 'orders' | 'quotes') => {
    setOpen(false);
    onNavigateTab(tab);
  };

  const menuItems = [
    { id: 'home', label: 'Ana Sayfa & Özet', icon: Home, count: 0 },
    { id: 'catalog', label: 'Ürün Kataloğu & Stok', icon: Package, count: 0 },
    { id: 'orders', label: 'Siparişlerim & Sevkiyat', icon: Truck, count: activeOrdersCount },
    { id: 'quotes', label: 'Fiyat Tekliflerim', icon: FileText, count: pendingQuotesCount },
  ];

  return (
    <>
      <header className="mobile-erp-appbar">
        <button
          type="button"
          aria-label="Menüyü aç"
          onClick={() => setOpen(true)}
        >
          <Menu />
        </button>
        <img className="mobile-erp-appbar__logo" src="/branding/siatek-icon.png" alt="Siatek" />
        <span className="mobile-erp-appbar__company">
          <small>Bayi Portalı</small>
          <strong>{companyName}</strong>
        </span>
        <button
          type="button"
          aria-label="Katalogda Ara"
          onClick={() => onNavigateTab('catalog')}
        >
          <Search />
        </button>
        <button
          type="button"
          aria-label="Temayı değiştir"
          onClick={onToggleTheme}
        >
          <Sun />
        </button>
        <button
          type="button"
          aria-label="Bildirimleri aç"
          onClick={onOpenNotifications}
        >
          <Bell />
          {pendingQuotesCount > 0 && <i />}
        </button>
      </header>

      {open && (
        <div
          className="mobile-admin-drawer-backdrop"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <aside
            className="mobile-admin-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Bayi menüsü"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <img className="mobile-admin-drawer__logo" src="/branding/siatek-icon.png" alt="Siatek" />
              <div>
                <strong>SIATEK</strong>
                <small>B2B Bayi Portalı</small>
              </div>
              <button
                type="button"
                aria-label="Menüyü kapat"
                onClick={() => setOpen(false)}
              >
                <X />
              </button>
            </header>

            <div className="mobile-admin-workspace">
              <img src="/branding/siatek-icon.png" alt="Alpha Teknik çalışma alanı" />
              <div>
                <small>Kayıtlı Bayi</small>
                <strong>{companyName}</strong>
              </div>
            </div>

            <small className="mobile-admin-drawer__label">BAYİ İŞLEMLERİ</small>
            <nav>
              {menuItems.map(({ id, label, icon: Icon, count }) => (
                <button
                  type="button"
                  key={id}
                  onClick={() => go(id as any)}
                >
                  <Icon />
                  <span>{label}</span>
                  {count ? <b>{count}</b> : null}
                </button>
              ))}

              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onOpenQuickOrder();
                }}
              >
                <ReceiptText />
                <span>Hızlı Toplu Sipariş</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onOpenSites();
                }}
              >
                <Building2 />
                <span>Şantiyelerim & Adresler</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onOpenFinancial();
                }}
              >
                <WalletCards />
                <span>Cari Hesap & Finans</span>
              </button>
            </nav>

            <footer>
              <span>{initials(companyName || userName)}</span>
              <div>
                <strong>{userName}</strong>
                <small>Yetkili Bayi</small>
              </div>
            </footer>
          </aside>
        </div>
      )}
    </>
  );
}

function MobileDealerOverviewSkeleton() {
  return (
    <section
      className="mobile-erp-overview mobile-erp-skeleton"
      aria-label="Bayi özeti yükleniyor"
      aria-busy="true"
    >
      <div className="skeleton-line is-head" />
      <div className="skeleton-card is-balance" />
      <div className="skeleton-line" />
      <div className="skeleton-actions">
        {[0, 1, 2, 3].map((item) => (
          <i key={item} />
        ))}
      </div>
      <div className="skeleton-card" />
      <div className="skeleton-card is-list" />
    </section>
  );
}
