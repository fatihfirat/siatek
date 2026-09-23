import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, BarChart3, Box, Check, CheckCircle2, Clock3, FileText, Package, Plus, Receipt, Settings2, ShoppingBag, Store, TrendingUp, Users, Wallet, X } from 'lucide-react';
import type { KasaHareketi, Order, Product, Quote } from '../../types';
import type { CariAccount } from '../../types';
import { MobileOverview } from '../mobile/MobileERP';

type Tab = 'pos' | 'orders' | 'quotes' | 'products' | 'cariler' | 'invoices' | 'analytics' | 'kasa';
type Props = { userName: string; orders: Order[]; quotes: Quote[]; products: Product[]; cariAccounts: CariAccount[]; cashMovements: KasaHareketi[]; loading?: boolean; error?: string; onRetry?: () => void; onOpenNotifications?: () => void; onToggleTheme?: () => void; onOpenAI?: () => void; pendingOrders: number; pendingQuotes: number; lowStock: number; onNavigate: (tab: Tab) => void; };

const QUICK_ACTIONS = [
  { id: 'orders', label: 'Siparişleri yönet', description: 'Sipariş listesini aç', icon: ShoppingBag },
  { id: 'quotes', label: 'Teklif oluştur', description: 'Teklif merkezine git', icon: FileText },
  { id: 'kasa', label: 'Tahsilat ekle', description: 'Kasa ve banka işlemleri', icon: Wallet },
  { id: 'products', label: 'Ürün ekle', description: 'Stok yönetimini aç', icon: Package },
  { id: 'pos', label: 'Hızlı POS', description: 'Yeni satış başlat', icon: Store },
  { id: 'cariler', label: 'Cari hesap aç', description: 'Müşteri ve tedarikçiler', icon: Users },
  { id: 'invoices', label: 'Fatura oluştur', description: 'Faturalama ekranını aç', icon: Receipt },
  { id: 'analytics', label: 'Raporları görüntüle', description: 'Satış analizini aç', icon: BarChart3 },
] satisfies Array<{ id: Tab; label: string; description: string; icon: typeof ShoppingBag }>;
const DEFAULT_QUICK_ACTIONS: Tab[] = ['orders', 'quotes', 'kasa', 'products'];
const QUICK_ACTIONS_STORAGE_KEY = 'siatek_admin_quick_actions';
const MAX_QUICK_ACTIONS = 6;

function loadQuickActions(): Tab[] {
  try {
    const saved = JSON.parse(localStorage.getItem(QUICK_ACTIONS_STORAGE_KEY) || 'null');
    if (!Array.isArray(saved)) return DEFAULT_QUICK_ACTIONS;
    const valid = saved.filter((id): id is Tab => QUICK_ACTIONS.some((action) => action.id === id));
    return [...new Set(valid)].slice(0, MAX_QUICK_ACTIONS);
  } catch {
    return DEFAULT_QUICK_ACTIONS;
  }
}

const money = (value: number) => `${value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;
const orderStatus: Record<string, { label: string; tone: string }> = {
  pending: { label: 'Onay bekliyor', tone: 'amber' }, approved: { label: 'Onaylandı', tone: 'emerald' }, preparing: { label: 'Hazırlanıyor', tone: 'blue' }, shipped: { label: 'Sevkiyatta', tone: 'slate' }, delivered: { label: 'Tamamlandı', tone: 'emerald' },
};
const formatDay = () => new Intl.DateTimeFormat('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()).toLocaleUpperCase('tr-TR');

export default function AdminDashboardOverview({ userName, orders, quotes: _quotes, products, cariAccounts, cashMovements, loading, error, onRetry, onOpenNotifications, onToggleTheme, onOpenAI, pendingOrders, pendingQuotes, lowStock, onNavigate }: Props) {
  const [quickActionIds, setQuickActionIds] = useState<Tab[]>(loadQuickActions);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [customizingQuickActions, setCustomizingQuickActions] = useState(false);
  const quickActionsDialogRef = useRef<HTMLDivElement>(null);
  const quickActions = quickActionIds.flatMap((id) => {
    const action = QUICK_ACTIONS.find((item) => item.id === id);
    return action ? [action] : [];
  });

  useEffect(() => {
    localStorage.setItem(QUICK_ACTIONS_STORAGE_KEY, JSON.stringify(quickActionIds));
  }, [quickActionIds]);

  useEffect(() => {
    const openFromWorkspaceHeader = () => {
      setCustomizingQuickActions(false);
      setQuickActionsOpen(true);
    };
    document.addEventListener('siatek:open-quick-actions', openFromWorkspaceHeader);
    return () => document.removeEventListener('siatek:open-quick-actions', openFromWorkspaceHeader);
  }, []);

  useEffect(() => {
    if (!quickActionsOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const dialog = quickActionsDialogRef.current;
    dialog?.querySelector<HTMLElement>('button')?.focus();
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setQuickActionsOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;
      const focusable = [...dialog.querySelectorAll<HTMLElement>('button:not(:disabled)')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      previousFocus?.focus();
    };
  }, [quickActionsOpen]);

  const openQuickActions = () => { setCustomizingQuickActions(false); setQuickActionsOpen(true); };
  const runQuickAction = (tab: Tab) => { setQuickActionsOpen(false); onNavigate(tab); };
  const addQuickAction = (tab: Tab) => setQuickActionIds((current) => current.length < MAX_QUICK_ACTIONS && !current.includes(tab) ? [...current, tab] : current);
  const removeQuickAction = (tab: Tab) => setQuickActionIds((current) => current.filter((id) => id !== tab));
  const moveQuickAction = (index: number, direction: -1 | 1) => setQuickActionIds((current) => {
    const target = index + direction;
    if (target < 0 || target >= current.length) return current;
    const next = [...current];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });
  const activeOrders = orders.filter((order) => order.status !== 'cancelled');
  const revenue = activeOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
  const deliveredRevenue = activeOrders.filter((order) => order.status === 'delivered').reduce((sum, order) => sum + (Number(order.total) || 0), 0);
  const recentOrders = [...activeOrders].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 5);
  const monthlySales = Array.from({ length: 6 }, (_, index) => {
    const month = new Date(); month.setDate(1); month.setMonth(month.getMonth() - (5 - index));
    const value = activeOrders.filter((order) => { const created = new Date(order.createdAt); return created.getMonth() === month.getMonth() && created.getFullYear() === month.getFullYear(); }).reduce((sum, order) => sum + (Number(order.total) || 0), 0);
    return { label: month.toLocaleDateString('tr-TR', { month: 'short' }).replace('.', ''), value };
  });
  const chartMax = Math.max(...monthlySales.map((item) => item.value), 1);
  const chartPoints = monthlySales.map((item, index) => `${index * 20},${94 - (item.value / chartMax) * 78}`).join(' ');
  const agenda = [
    pendingOrders > 0 && { time: '09:30', title: `${pendingOrders} siparişi onayla`, category: 'Satış', tab: 'orders' as Tab },
    pendingQuotes > 0 && { time: '11:00', title: `${pendingQuotes} teklifi fiyatlandır`, category: 'Teklif', tab: 'quotes' as Tab },
    lowStock > 0 && { time: '14:00', title: `${lowStock} kritik stok kalemini incele`, category: 'Stok', tab: 'products' as Tab },
    activeOrders.some((order) => order.status === 'preparing') && { time: '16:30', title: 'Hazırlanan sevkiyatları kontrol et', category: 'Operasyon', tab: 'orders' as Tab },
  ].filter(Boolean) as Array<{ time: string; title: string; category: string; tab: Tab }>;

  return <><div className="admin-dashboard-mobile-only"><MobileOverview userName={userName} products={products} cariAccounts={cariAccounts} cashMovements={cashMovements} loading={loading} error={error} onRetry={onRetry} onOpenNotifications={onOpenNotifications} onToggleTheme={onToggleTheme} onOpenAI={onOpenAI} setActive={onNavigate} onCreate={() => document.dispatchEvent(new CustomEvent('siatek:open-mobile-quick-actions'))} /></div><section className="admin-dashboard-overview" aria-labelledby="admin-dashboard-title">
    <header className="admin-dashboard-overview__intro"><div><p className="admin-dashboard-overview__eyebrow">{formatDay()}</p><h2 id="admin-dashboard-title">Günaydın, Alpha Teknik</h2><p>İşletmende bugün olup bitenlere hızlıca göz at.</p></div><button type="button" onClick={() => onNavigate('analytics')} className="admin-dashboard-overview__report"><FileText size={18} /> Raporları aç</button></header>

    <div className="admin-dashboard-overview__metrics">
      <button type="button" onClick={() => onNavigate('analytics')} className="admin-dashboard-metric admin-dashboard-metric--coral"><span className="admin-dashboard-metric__icon"><BarChart3 /></span><span className="admin-dashboard-metric__copy"><small>Toplam satış</small><strong>{money(revenue)}</strong><em><TrendingUp /> Canlı sipariş verisi</em></span></button>
      <button type="button" onClick={() => onNavigate('orders')} className="admin-dashboard-metric admin-dashboard-metric--amber"><span className="admin-dashboard-metric__icon"><ShoppingBag /></span><span className="admin-dashboard-metric__copy"><small>Bekleyen sipariş</small><strong>{pendingOrders}</strong><em>{pendingOrders ? 'Aksiyon bekliyor' : 'Tümü güncel'}</em></span></button>
      <button type="button" onClick={() => onNavigate('kasa')} className="admin-dashboard-metric admin-dashboard-metric--emerald"><span className="admin-dashboard-metric__icon"><Wallet /></span><span className="admin-dashboard-metric__copy"><small>Tamamlanan satış</small><strong>{money(deliveredRevenue)}</strong><em><CheckCircle2 /> Tahsilat görünümü</em></span></button>
      <button type="button" onClick={() => onNavigate('products')} className="admin-dashboard-metric admin-dashboard-metric--slate"><span className="admin-dashboard-metric__icon"><Box /></span><span className="admin-dashboard-metric__copy"><small>Kritik stok</small><strong>{lowStock}</strong><em>{lowStock ? 'Aksiyon gerekli' : 'Stoklar yeterli'}</em></span></button>
    </div>

    <div className="admin-dashboard-overview__content"><div className="admin-dashboard-overview__main">
      <article className="admin-dashboard-panel admin-dashboard-chart"><div className="admin-dashboard-panel__heading"><div><h3>Satış performansı</h3><p>Son 6 aylık net sipariş görünümü</p></div><button type="button" onClick={() => onNavigate('analytics')} className="admin-dashboard-text-button">Detaylı analiz <ArrowUpRight size={15} /></button></div><div className="admin-dashboard-chart__value"><strong>{money(revenue)}</strong><span><TrendingUp /> Güncel toplam</span></div><div className="admin-dashboard-chart__plot" aria-label="Son altı aylık satış grafiği"><svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img"><defs><linearGradient id="salesArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#10b981" stopOpacity=".25" /><stop offset="1" stopColor="#10b981" stopOpacity="0" /></linearGradient></defs><path d={`M0,94 L${chartPoints.replaceAll(' ', ' L')} L100,100 L0,100 Z`} fill="url(#salesArea)" /><polyline points={chartPoints} fill="none" stroke="#059669" strokeWidth="2.2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" /></svg><div className="admin-dashboard-chart__labels">{monthlySales.map((item) => <span key={item.label}>{item.label}</span>)}</div></div></article>
      <article className="admin-dashboard-panel admin-dashboard-recent"><div className="admin-dashboard-panel__heading"><div><h3>Son siparişler</h3><p>En son oluşturulan müşteri siparişleri</p></div><button type="button" onClick={() => onNavigate('orders')} className="admin-dashboard-text-button">Tümünü gör <ArrowRight size={15} /></button></div>{recentOrders.length === 0 ? <div className="admin-dashboard-empty"><ShoppingBag /><b>Henüz sipariş yok</b><span>Yeni siparişler burada görünecek.</span></div> : <div className="admin-dashboard-orders">{recentOrders.map((order) => { const status = orderStatus[order.status] || { label: order.status, tone: 'slate' }; return <button type="button" key={order.id} onClick={() => onNavigate('orders')} className="admin-dashboard-order"><span className="admin-dashboard-order__number"><b>{order.orderNumber}</b><small>{new Date(order.createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</small></span><span className="admin-dashboard-order__customer"><i>{order.customerName.slice(0, 2).toLocaleUpperCase('tr-TR')}</i><b>{order.customerName}</b></span><strong>{money(Number(order.total) || 0)}</strong><em className={`admin-dashboard-status admin-dashboard-status--${status.tone}`}>{status.label}</em></button>; })}</div>}</article>
    </div><aside className="admin-dashboard-overview__aside">
      <article className="admin-dashboard-panel admin-dashboard-quick"><div className="admin-dashboard-panel__heading"><div><h3>Hızlı işlemler</h3><p>Sık kullandığın kısayollar</p></div><button type="button" className="admin-dashboard-quick__configure" onClick={openQuickActions}><Settings2 /> Ayarla</button></div>{quickActions.length === 0 ? <button type="button" className="admin-dashboard-quick__empty" onClick={() => { setCustomizingQuickActions(true); setQuickActionsOpen(true); }}><Plus /><b>İlk kısayolunu ekle</b><span>Sık kullandığın işlemlere tek tıkla ulaş.</span></button> : <div className="admin-dashboard-quick__grid">{quickActions.map(({ id, label, icon: Icon }) => <button type="button" key={id} onClick={() => onNavigate(id)}><span><Icon /></span><b>{label}</b><ArrowRight /></button>)}</div>}</article>
      <article className="admin-dashboard-panel admin-dashboard-agenda"><div className="admin-dashboard-panel__heading"><div><h3>Bugünün ajandası</h3><p>{agenda.length} tamamlanmamış görev</p></div><Clock3 size={18} /></div>{agenda.length === 0 ? <div className="admin-dashboard-empty"><CheckCircle2 /><b>Ajanda temiz</b><span>Bekleyen operasyon bulunmuyor.</span></div> : <div className="admin-dashboard-agenda__list">{agenda.map((item) => <button type="button" key={item.title} onClick={() => onNavigate(item.tab)}><span className="admin-dashboard-agenda__check" /><time>{item.time}</time><span><b>{item.title}</b><small>{item.category}</small></span></button>)}</div>}<button type="button" className="admin-dashboard-agenda__add" onClick={() => onNavigate('orders')}><Plus /> Yeni görev ekle</button></article>
      <button type="button" onClick={() => onNavigate('products')} className="admin-dashboard-stock-alert"><span><AlertTriangle /></span><span><small>STOK UYARISI</small><strong>{lowStock} ürün kritik seviyede</strong><em>Stok tükenmeden satın alma planını oluştur.</em><b>Stokları incele <ArrowRight /></b></span></button>
    </aside></div>
    {quickActionsOpen && <div className="admin-quick-actions-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setQuickActionsOpen(false); }}>
      <div ref={quickActionsDialogRef} className="admin-quick-actions-dialog" role="dialog" aria-modal="true" aria-labelledby="quick-actions-title">
        <header className="admin-quick-actions-dialog__header">
          <div className="admin-quick-actions-dialog__mark"><Settings2 aria-hidden="true" /></div>
          <button type="button" className="admin-quick-actions-dialog__close" onClick={() => setQuickActionsOpen(false)} aria-label="Hızlı işlemleri kapat"><X /></button>
        </header>
        <div className="admin-quick-actions-dialog__title">
          <h2 id="quick-actions-title">{customizingQuickActions ? 'Hızlı işlemleri düzenle' : 'Ne yapmak istersin?'}</h2>
          <p>{customizingQuickActions ? `En fazla ${MAX_QUICK_ACTIONS} işlem seç ve sıralamayı belirle.` : 'İş akışını hızlandıracak bir işlem seç.'}</p>
        </div>

        {customizingQuickActions ? <div className="admin-quick-actions-editor">
          <section aria-labelledby="selected-actions-title">
            <div className="admin-quick-actions-editor__heading"><h3 id="selected-actions-title">Seçilenler</h3><span>{quickActionIds.length}/{MAX_QUICK_ACTIONS}</span></div>
            {quickActions.length === 0 ? <div className="admin-quick-actions-editor__empty"><Plus /><b>Henüz kısayol yok</b><span>Aşağıdaki listeden işlem ekle.</span></div> : <div className="admin-quick-actions-editor__selected">{quickActions.map(({ id, label, icon: Icon }, index) => <div key={id} className="admin-quick-actions-editor__row"><span className="admin-quick-actions-editor__icon"><Icon /></span><b>{label}</b><div><button type="button" onClick={() => moveQuickAction(index, -1)} disabled={index === 0} aria-label={`${label} işlemini yukarı taşı`}><ArrowUp /></button><button type="button" onClick={() => moveQuickAction(index, 1)} disabled={index === quickActions.length - 1} aria-label={`${label} işlemini aşağı taşı`}><ArrowDown /></button><button type="button" className="is-remove" onClick={() => removeQuickAction(id)} aria-label={`${label} kısayolunu kaldır`}><X /></button></div></div>)}</div>}
          </section>
          <section aria-labelledby="available-actions-title"><div className="admin-quick-actions-editor__heading"><h3 id="available-actions-title">Eklenebilir işlemler</h3></div><div className="admin-quick-actions-editor__available">{QUICK_ACTIONS.filter((action) => !quickActionIds.includes(action.id)).map(({ id, label, description, icon: Icon }) => <button type="button" key={id} onClick={() => addQuickAction(id)} disabled={quickActionIds.length >= MAX_QUICK_ACTIONS}><span><Icon /></span><span><b>{label}</b><small>{description}</small></span><Plus /></button>)}</div></section>
          <footer><button type="button" className="admin-quick-actions-dialog__back" onClick={() => setCustomizingQuickActions(false)}><ArrowLeft /> İşlemlere dön</button><button type="button" className="admin-quick-actions-dialog__done" onClick={() => setCustomizingQuickActions(false)}><Check /> Tamam</button></footer>
        </div> : <>
          {quickActions.length === 0 ? <div className="admin-quick-actions-empty"><Settings2 /><b>Hızlı işlem seçilmedi</b><span>Kullandığın işlemleri ekleyerek başla.</span></div> : <div className="admin-quick-actions-list">{quickActions.map(({ id, label }, index) => <button type="button" key={id} onClick={() => runQuickAction(id)}><span>{String(index + 1).padStart(2, '0')}</span><b>{label}</b><ArrowRight /></button>)}</div>}
          <button type="button" className="admin-quick-actions-customize" onClick={() => setCustomizingQuickActions(true)}><Settings2 /> Hızlı işlemleri özelleştir</button>
        </>}
      </div>
    </div>}
  </section></>;
}
