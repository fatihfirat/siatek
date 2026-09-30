import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { AlertTriangle, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, BarChart3, Bell, BellRing, Check, CheckCircle2, ChevronDown, Clock3, FileText, Package, Plus, Receipt, Search, Send, Settings2, ShoppingBag, Store, Target, Trash2, TrendingDown, TrendingUp, Truck, Users, Wallet, X } from 'lucide-react';
import type { KasaHareketi, Order, Product, Quote } from '../../types';
import type { CariAccount } from '../../types';
import { MobileOverview } from '../mobile/MobileERP';

type Tab = 'pos' | 'orders' | 'quotes' | 'products' | 'cariler' | 'invoices' | 'analytics' | 'kasa';
type Props = {
  userName: string; orders: Order[]; quotes: Quote[]; products: Product[]; cariAccounts: CariAccount[]; cashMovements: KasaHareketi[];
  loading?: boolean; error?: string; onRetry?: () => void; onOpenNotifications?: () => void; onToggleTheme?: () => void; onOpenAI?: () => void;
  pendingOrders: number; pendingQuotes: number; lowStock: number; onNavigate: (tab: Tab) => void;
  lowStockItems?: Product[]; offerSentQuotes?: number;
  onOpenLowStock?: () => void; onOpenPendingOrders?: () => void; onOpenPendingQuotes?: () => void; onOpenOfferSentQuotes?: () => void;
};
type Tone = 'amber' | 'blue' | 'red' | 'emerald' | 'slate';
type Reminder = { id: string; title: string; time: string; done: boolean };

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
type CreateItem = { id: string; label: string; icon: typeof ShoppingBag; tab?: Tab; action?: 'goal' | 'reminder' };
const CREATE_GROUPS: Array<{ title: string; items: CreateItem[] }> = [
  { title: 'Satış', items: [
    { id: 'new-order', label: 'Yeni sipariş', icon: ShoppingBag, tab: 'orders' },
    { id: 'new-quote', label: 'Yeni teklif', icon: FileText, tab: 'quotes' },
    { id: 'new-invoice', label: 'Yeni fatura', icon: Receipt, tab: 'invoices' },
  ] },
  { title: 'Kayıt', items: [
    { id: 'new-product', label: 'Yeni ürün', icon: Package, tab: 'products' },
    { id: 'new-cari', label: 'Yeni cari hesap', icon: Users, tab: 'cariler' },
    { id: 'new-collection', label: 'Tahsilat ekle', icon: Wallet, tab: 'kasa' },
  ] },
  { title: 'Kişisel', items: [
    { id: 'new-reminder', label: 'Hatırlatıcı ekle', icon: Clock3, action: 'reminder' },
    { id: 'new-goal', label: 'Aylık hedef belirle', icon: Target, action: 'goal' },
  ] },
];
const DEFAULT_QUICK_ACTIONS: Tab[] = ['orders', 'quotes', 'kasa', 'products'];
const QUICK_ACTIONS_STORAGE_KEY = 'siatek_admin_quick_actions';
const GOAL_STORAGE_KEY = 'siatek_admin_monthly_goal';
const REMINDERS_STORAGE_KEY = 'siatek_admin_reminders';
const MAX_QUICK_ACTIONS = 4;
const MAX_REMINDERS = 20;

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

function loadGoal(): number {
  try {
    const value = Number(localStorage.getItem(GOAL_STORAGE_KEY));
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

function loadReminders(): Reminder[] {
  try {
    const saved = JSON.parse(localStorage.getItem(REMINDERS_STORAGE_KEY) || 'null');
    if (!Array.isArray(saved)) return [];
    return saved
      .filter((item): item is Reminder => item && typeof item.id === 'string' && typeof item.title === 'string' && typeof item.time === 'string')
      .map((item) => ({ id: item.id, title: item.title.slice(0, 80), time: item.time, done: Boolean(item.done) }))
      .slice(0, MAX_REMINDERS);
  } catch {
    return [];
  }
}

const money = (value: number) => `${value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;
const orderStatus: Record<string, { label: string; tone: string }> = {
  pending: { label: 'Onay bekliyor', tone: 'amber' }, approved: { label: 'Onaylandı', tone: 'emerald' }, preparing: { label: 'Hazırlanıyor', tone: 'blue' }, shipped: { label: 'Sevkiyatta', tone: 'slate' }, delivered: { label: 'Tamamlandı', tone: 'emerald' },
};
const formatDay = () => new Intl.DateTimeFormat('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()).toLocaleUpperCase('tr-TR');
const greeting = () => { const hour = new Date().getHours(); return hour < 12 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar'; };
const currentTime = () => { const now = new Date(); return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`; };

function motivation(goal: number, monthRevenue: number, hasOrders: boolean, pendingTotal: number): string {
  if (goal > 0) {
    const percent = Math.floor((monthRevenue / goal) * 100);
    if (percent >= 100) return 'Aylık hedefi tamamladın. Tebrikler, ekibinle kutlamaya değer.';
    if (percent >= 75) return `Hedefe çok yakınsın, %${percent} tamam. Son ilerleyiş için harika bir gün.`;
    if (percent >= 25) return `İyi gidiyorsun, aylık hedefin %${percent}'i tamam.`;
    if (monthRevenue > 0) return `Güzel bir başlangıç yaptın, hedefin %${percent}'i tamam.`;
  }
  if (!hasOrders) return 'Bugün ilk siparişi almak için güzel bir gün.';
  if (pendingTotal > 0) return `Bugün ${pendingTotal} işlem seni bekliyor, birlikte hızlıca halledelim.`;
  return 'Bugün bekleyen iş yok, yeni fırsatlar için harika bir zaman.';
}

export default function AdminDashboardOverview({ userName, orders, quotes: _quotes, products, cariAccounts, cashMovements, loading, error, onRetry, onOpenNotifications, onToggleTheme, onOpenAI, pendingOrders, pendingQuotes, lowStock, lowStockItems = [], offerSentQuotes = 0, onOpenLowStock, onOpenPendingOrders, onOpenPendingQuotes, onOpenOfferSentQuotes, onNavigate }: Props) {
  const [quickActionIds, setQuickActionIds] = useState<Tab[]>(loadQuickActions);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [customizingQuickActions, setCustomizingQuickActions] = useState(false);
  const [goal, setGoal] = useState<number>(loadGoal);
  const [goalEditing, setGoalEditing] = useState(false);
  const [goalDraft, setGoalDraft] = useState('');
  const [reminders, setReminders] = useState<Reminder[]>(loadReminders);
  const [reminderFormOpen, setReminderFormOpen] = useState(false);
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderTime, setReminderTime] = useState('09:00');
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const quickActionsDialogRef = useRef<HTMLDivElement>(null);
  const newMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const quickActions = quickActionIds.flatMap((id) => {
    const action = QUICK_ACTIONS.find((item) => item.id === id);
    return action ? [action] : [];
  });

  useEffect(() => {
    localStorage.setItem(QUICK_ACTIONS_STORAGE_KEY, JSON.stringify(quickActionIds));
  }, [quickActionIds]);

  useEffect(() => {
    try {
      if (goal > 0) localStorage.setItem(GOAL_STORAGE_KEY, String(goal)); else localStorage.removeItem(GOAL_STORAGE_KEY);
    } catch { /* depolama kapalıysa hedef yalnızca oturumda kalır */ }
  }, [goal]);

  useEffect(() => {
    try { localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(reminders)); } catch { /* depolama kapalıysa hatırlatıcılar yalnızca oturumda kalır */ }
  }, [reminders]);

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

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (newMenuRef.current && !newMenuRef.current.contains(event.target as Node)) setNewMenuOpen(false);
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) setSearchOpen(false);
    };
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
        setSearchOpen(true);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onShortcut);
    return () => { document.removeEventListener('mousedown', onPointerDown); document.removeEventListener('keydown', onShortcut); };
  }, []);

  useEffect(() => {
    if (newMenuOpen) newMenuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [newMenuOpen]);

  const openQuickActions = () => { setCustomizingQuickActions(false); setQuickActionsOpen(true); };
  const editQuickActions = () => { setCustomizingQuickActions(true); setQuickActionsOpen(true); };
  const runCreateItem = (item: CreateItem) => {
    setNewMenuOpen(false);
    if (item.action === 'goal') { setGoalDraft(goal > 0 ? String(goal) : ''); setGoalEditing(true); return; }
    if (item.action === 'reminder') { setReminderFormOpen(true); return; }
    if (item.tab) onNavigate(item.tab);
  };
  const onMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') { setNewMenuOpen(false); newMenuRef.current?.querySelector<HTMLElement>('button')?.focus(); return; }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const items = [...event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]')];
    const index = items.indexOf(document.activeElement as HTMLElement);
    items[(index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
  };
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

  const saveGoal = () => {
    const value = Number(goalDraft.replace(/\./g, '').replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) return;
    setGoal(Math.round(value));
    setGoalEditing(false);
  };
  const clearGoal = () => { setGoal(0); setGoalDraft(''); setGoalEditing(false); };
  const addReminder = () => {
    const title = reminderTitle.trim();
    if (!title || reminders.length >= MAX_REMINDERS) return;
    setReminders((current) => [...current, { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, title, time: reminderTime || '09:00', done: false }]);
    setReminderTitle('');
    setReminderFormOpen(false);
  };
  const toggleReminder = (id: string) => setReminders((current) => current.map((item) => item.id === id ? { ...item, done: !item.done } : item));
  const removeReminder = (id: string) => setReminders((current) => current.filter((item) => item.id !== id));

  const activeOrders = orders.filter((order) => order.status !== 'cancelled');
  const revenue = activeOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
  const deliveredRevenue = activeOrders.filter((order) => order.status === 'delivered').reduce((sum, order) => sum + (Number(order.total) || 0), 0);
  const recentOrders = [...activeOrders].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 5);
  const monthlySales = Array.from({ length: 6 }, (_, index) => {
    const month = new Date(); month.setDate(1); month.setMonth(month.getMonth() - (5 - index));
    const value = activeOrders.filter((order) => { const created = new Date(order.createdAt); return created.getMonth() === month.getMonth() && created.getFullYear() === month.getFullYear(); }).reduce((sum, order) => sum + (Number(order.total) || 0), 0);
    return { label: month.toLocaleDateString('tr-TR', { month: 'short' }).replace('.', ''), value };
  });
  const monthRevenue = monthlySales[5].value;
  const previousMonthRevenue = monthlySales[4].value;
  const salesDelta = previousMonthRevenue > 0 ? Math.round(((monthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100) : null;
  const collectionRate = revenue > 0 ? Math.round((deliveredRevenue / revenue) * 100) : 0;
  const chartMax = Math.max(...monthlySales.map((item) => item.value), goal, 1);
  const chartPoints = monthlySales.map((item, index) => `${index * 20},${94 - (item.value / chartMax) * 78}`).join(' ');
  const goalLineY = goal > 0 ? 94 - (goal / chartMax) * 78 : null;
  const sparkMax = Math.max(...monthlySales.map((item) => item.value), 1);
  const sparkPoints = monthlySales.map((item, index) => `${index * 20},${26 - (item.value / sparkMax) * 22}`).join(' ');
  const goalPercent = goal > 0 ? Math.min(100, Math.floor((monthRevenue / goal) * 100)) : 0;
  const ringOffset = 175.9 - (175.9 * goalPercent) / 100;
  const preparingCount = activeOrders.filter((order) => order.status === 'preparing').length;
  const stockScale = Math.max(5, ...lowStockItems.map((item) => Number(item.stock) || 0));
  const outOfStock = lowStockItems.some((item) => (Number(item.stock) || 0) <= 0);
  const criticalItems = [...lowStockItems].sort((a, b) => (Number(a.stock) || 0) - (Number(b.stock) || 0)).slice(0, 3);
  const nowTime = currentTime();
  const sortedReminders = useMemo(() => [...reminders].sort((a, b) => Number(a.done) - Number(b.done) || a.time.localeCompare(b.time)), [reminders]);
  const openReminders = reminders.filter((item) => !item.done).length;
  const focusItems = [
    pendingOrders > 0 && { key: 'orders', tone: 'amber' as Tone, icon: ShoppingBag, title: `${pendingOrders} sipariş onay bekliyor`, meta: 'Onay ve hazırlık', run: onOpenPendingOrders ?? (() => onNavigate('orders')) },
    pendingQuotes > 0 && { key: 'quotes', tone: 'amber' as Tone, icon: FileText, title: `${pendingQuotes} teklif fiyatlandırma bekliyor`, meta: 'Teklif merkezi', run: onOpenPendingQuotes ?? (() => onNavigate('quotes')) },
    offerSentQuotes > 0 && { key: 'offers', tone: 'blue' as Tone, icon: Send, title: `${offerSentQuotes} teklif müşteri onayında`, meta: 'Takipte', run: onOpenOfferSentQuotes ?? (() => onNavigate('quotes')) },
    preparingCount > 0 && { key: 'shipping', tone: 'slate' as Tone, icon: Truck, title: `${preparingCount} sevkiyat hazırlanıyor`, meta: 'Operasyon', run: () => onNavigate('orders') },
  ].filter(Boolean) as Array<{ key: string; tone: Tone; icon: typeof ShoppingBag; title: string; meta: string; run: () => void }>;
  const hasFocusWork = focusItems.length > 0 || lowStock > 0 || sortedReminders.length > 0;
  const intro = motivation(goal, monthRevenue, activeOrders.length > 0, pendingOrders + pendingQuotes + (lowStock > 0 ? 1 : 0));
  const visibleCreateGroups = CREATE_GROUPS
    .map((group) => ({ ...group, items: group.items.filter((item) => !item.tab || !quickActionIds.includes(item.tab)) }))
    .filter((group) => group.items.length > 0);
  const searchResults = useMemo(() => {
    const term = searchTerm.trim().toLocaleLowerCase('tr-TR');
    if (term.length < 2) return [];
    const has = (...values: Array<string | undefined>) => values.some((value) => value?.toLocaleLowerCase('tr-TR').includes(term));
    return [
      ...orders.filter((order) => has(order.orderNumber, order.customerName)).slice(0, 3).map((order) => ({ key: `o-${order.id}`, tab: 'orders' as Tab, icon: ShoppingBag, title: order.orderNumber, meta: `Sipariş · ${order.customerName}` })),
      ...products.filter((product) => has(product.name, product.sku)).slice(0, 3).map((product) => ({ key: `p-${product.id}`, tab: 'products' as Tab, icon: Package, title: product.name, meta: `Ürün · ${product.stock} ${product.unit}` })),
      ...cariAccounts.filter((account) => has(account.name, account.companyName, account.code)).slice(0, 3).map((account) => ({ key: `c-${account.id}`, tab: 'cariler' as Tab, icon: Users, title: account.companyName || account.name, meta: `Cari · ${account.code}` })),
    ];
  }, [searchTerm, orders, products, cariAccounts]);
  const openStock = onOpenLowStock ?? (() => onNavigate('products'));

  return <><div className="admin-dashboard-mobile-only"><MobileOverview userName={userName} products={products} cariAccounts={cariAccounts} cashMovements={cashMovements} loading={loading} error={error} onRetry={onRetry} onOpenNotifications={onOpenNotifications} onToggleTheme={onToggleTheme} onOpenAI={onOpenAI} setActive={onNavigate} onCreate={() => document.dispatchEvent(new CustomEvent('siatek:open-mobile-quick-actions'))} /></div><section className="admin-dashboard-overview" aria-labelledby="admin-dashboard-title">
    <header className="admin-dashboard-overview__intro admin-dashboard-topbar"><div className="admin-dashboard-topbar__title"><p className="admin-dashboard-overview__eyebrow">{formatDay()}</p><h2 id="admin-dashboard-title">{greeting()}, Alpha Teknik</h2><p className="admin-dashboard-overview__motivation">{intro}</p></div>
      <div className="admin-dashboard-topbar__tools">
        <div className="admin-dashboard-search" ref={searchRef} role="search"><Search size={16} aria-hidden="true" /><input ref={searchInputRef} value={searchTerm} onChange={(event) => { setSearchTerm(event.target.value); setSearchOpen(true); }} onFocus={() => setSearchOpen(true)} onKeyDown={(event) => { if (event.key === 'Escape') { setSearchOpen(false); event.currentTarget.blur(); } }} placeholder="Sipariş, ürün, cari ara…" aria-label="Sipariş, ürün veya cari ara" autoComplete="off" /><kbd aria-hidden="true">⌘K</kbd>
          {searchOpen && searchTerm.trim().length >= 2 && <div className="admin-dashboard-search__results" role="listbox" aria-label="Arama sonuçları">{searchResults.length === 0 ? <p>Sonuç bulunamadı. Başka bir arama dene.</p> : searchResults.map(({ key, tab, icon: Icon, title, meta }) => <button type="button" role="option" aria-selected={false} key={key} onClick={() => { setSearchOpen(false); setSearchTerm(''); onNavigate(tab); }}><span><Icon /></span><span><b>{title}</b><small>{meta}</small></span><ArrowRight size={14} /></button>)}</div>}
        </div>
        {error ? <button type="button" className="admin-dashboard-status-pill is-warn" onClick={onRetry}><i />Bağlantı sorunu · Tekrar dene</button> : <span className="admin-dashboard-status-pill"><i />Sistem çalışıyor</span>}
        <button type="button" className="admin-dashboard-topbar__bell" onClick={onOpenNotifications} aria-label={pendingOrders > 0 ? `Bildirimler, ${pendingOrders} bekleyen sipariş` : 'Bildirimler'}><Bell size={18} />{pendingOrders > 0 && <span className="w-2 h-2 rounded-full bg-warning-fill animate-pulse motion-reduce:animate-none" aria-hidden="true" />}</button>
        <div className="admin-dashboard-newmenu" ref={newMenuRef}><button type="button" className="admin-dashboard-overview__new" onClick={() => setNewMenuOpen((open) => !open)} aria-haspopup="menu" aria-expanded={newMenuOpen}><Plus size={18} /> Yeni <ChevronDown size={14} /></button>
          {newMenuOpen && <div className="admin-dashboard-newmenu__list" role="menu" aria-label="Yeni oluştur" onKeyDown={onMenuKeyDown}>{visibleCreateGroups.map((group) => <div key={group.title} role="group" aria-label={group.title}><p>{group.title}</p>{group.items.map((item) => <button type="button" role="menuitem" key={item.id} onClick={() => runCreateItem(item)}><item.icon />{item.label}</button>)}</div>)}</div>}
        </div>
      </div></header>

    {error && <div className="admin-dashboard-error" role="alert"><AlertTriangle size={18} /><span><b>Veriler güncellenemedi</b><small>{error}</small></span>{onRetry && <button type="button" onClick={onRetry}>Tekrar dene</button>}</div>}

    {loading ? <div className="admin-dashboard-skeleton" aria-busy="true" aria-label="Genel bakış yükleniyor"><i /><i /><i /><i /><i /><i /></div> : <>
    <div className="admin-dashboard-overview__top">
      <article className="admin-dashboard-panel admin-dashboard-focus">
        <div className="admin-dashboard-panel__heading"><div><h3>Bugünün odağı</h3><p>{hasFocusWork ? `${focusItems.length + (lowStock > 0 ? 1 : 0) + openReminders} işlem seni bekliyor` : 'Bekleyen işlem yok'}</p></div><button type="button" className="admin-dashboard-text-button" onClick={() => setReminderFormOpen((open) => !open)} aria-expanded={reminderFormOpen}><Plus size={15} /> Hatırlatıcı</button></div>
        {reminderFormOpen && <form className="admin-dashboard-reminder-form" onSubmit={(event) => { event.preventDefault(); addReminder(); }}><input value={reminderTitle} onChange={(event) => setReminderTitle(event.target.value)} maxLength={80} placeholder="Örn. Tedarikçiyi ara" aria-label="Hatırlatıcı metni" autoFocus /><input type="time" value={reminderTime} onChange={(event) => setReminderTime(event.target.value)} aria-label="Hatırlatıcı saati" /><button type="submit" disabled={!reminderTitle.trim()}>Ekle</button></form>}
        <div className="admin-dashboard-focus__list">
          {lowStock > 0 ? <div className={`admin-dashboard-focus__stock admin-dashboard-focus__stock--${outOfStock ? 'red' : 'amber'}`}>
            <div className="admin-dashboard-focus__stock-head"><span className="admin-dashboard-focus__icon"><AlertTriangle /></span><span><b>{outOfStock ? `${lowStock} üründe stok tükendi veya kritik` : `${lowStock} ürün kritik seviyede`}</b><small>Tükenmeden satın alma planını oluştur</small></span><button type="button" onClick={openStock}>İncele ve ikmal et <ArrowRight size={14} /></button></div>
            <ul>{criticalItems.map((item) => { const stock = Number(item.stock) || 0; return <li key={item.id}><span>{item.name}</span><i aria-hidden="true"><em style={{ width: `${Math.max(4, Math.min(100, (stock / stockScale) * 100))}%` }} /></i><b>{stock} {item.unit}</b></li>; })}</ul>
          </div> : <div className="admin-dashboard-focus__row admin-dashboard-focus__row--calm"><span className="admin-dashboard-focus__icon admin-dashboard-focus__icon--emerald"><CheckCircle2 /></span><span><b>Stok sağlıklı</b><small>{products.length.toLocaleString('tr-TR')} ürün yeterli seviyede</small></span></div>}
          {focusItems.map(({ key, tone, icon: Icon, title, meta, run }) => <button type="button" key={key} onClick={run} className="admin-dashboard-focus__row"><span className={`admin-dashboard-focus__icon admin-dashboard-focus__icon--${tone}`}><Icon /></span><span><b>{title}</b><small>{meta}</small></span><ArrowRight size={16} /></button>)}
          {sortedReminders.map((item) => { const due = !item.done && item.time <= nowTime; return <div key={item.id} className={`admin-dashboard-focus__row admin-dashboard-focus__row--reminder${item.done ? ' is-done' : ''}`}><button type="button" className="admin-dashboard-focus__check" onClick={() => toggleReminder(item.id)} aria-pressed={item.done} aria-label={item.done ? `${item.title} işaretini kaldır` : `${item.title} tamamlandı olarak işaretle`}>{item.done && <Check size={14} />}</button><span><b>{item.title}</b><small><Clock3 size={12} /> {item.time}{due ? ' · zamanı geldi' : ''}</small></span>{due && <BellRing className="admin-dashboard-focus__due" size={16} aria-hidden="true" />}<button type="button" className="admin-dashboard-focus__remove" onClick={() => removeReminder(item.id)} aria-label={`${item.title} hatırlatıcısını sil`}><Trash2 size={15} /></button></div>; })}
        </div>
        {!hasFocusWork && <p className="admin-dashboard-focus__clear">Her şey yolunda. İstersen bir hatırlatıcı ekle.</p>}
      </article>

      <article className="admin-dashboard-panel admin-dashboard-goal">
        <div className="admin-dashboard-panel__heading"><div><h3>Aylık hedef</h3><p>{new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' }).format(new Date())}</p></div>{goal > 0 && !goalEditing && <button type="button" className="admin-dashboard-text-button" onClick={() => { setGoalDraft(String(goal)); setGoalEditing(true); }}>Düzenle</button>}</div>
        {goalEditing ? <form className="admin-dashboard-goal__form" onSubmit={(event) => { event.preventDefault(); saveGoal(); }}><label htmlFor="admin-goal-input">Bu ay hedeflediğin satış tutarı</label><div><input id="admin-goal-input" inputMode="numeric" value={goalDraft} onChange={(event) => setGoalDraft(event.target.value.replace(/[^\d.,]/g, ''))} placeholder="50.000" autoFocus /><span>₺</span></div><div className="admin-dashboard-goal__buttons"><button type="submit" disabled={!goalDraft.trim()}>Kaydet</button><button type="button" onClick={() => setGoalEditing(false)}>Vazgeç</button>{goal > 0 && <button type="button" className="is-quiet" onClick={clearGoal}>Hedefi kaldır</button>}</div></form>
        : goal > 0 ? <div className="admin-dashboard-goal__body"><svg width="84" height="84" viewBox="0 0 72 72" role="img" aria-label={`Aylık hedef yüzde ${goalPercent}`}><circle cx="36" cy="36" r="28" fill="none" stroke="#e2e8f0" strokeWidth="7" /><circle cx="36" cy="36" r="28" fill="none" stroke="#059669" strokeWidth="7" strokeLinecap="round" strokeDasharray="175.9" strokeDashoffset={ringOffset} transform="rotate(-90 36 36)" /><text x="36" y="41" textAnchor="middle" fontSize="15" fontWeight="800" fill="#0f172a">%{goalPercent}</text></svg><div><strong>{money(monthRevenue)}</strong><span>/ {money(goal)}</span><small>{goalPercent >= 100 ? 'Hedef tamamlandı' : monthRevenue > 0 ? `Hedefe ${money(goal - monthRevenue)} kaldı` : 'İlk sipariş bu ayın ilk adımı olacak'}</small></div></div>
        : <div className="admin-dashboard-goal__empty"><Target /><b>Aylık hedef belirle</b><span>Hedefini yaz, ilerlemeni halka ve grafikte takip et.</span><button type="button" onClick={() => { setGoalDraft(''); setGoalEditing(true); }}>Hedef belirle</button></div>}
      </article>

      <article className="admin-dashboard-panel admin-dashboard-quick"><div className="admin-dashboard-panel__heading"><div><h3>Hızlı işlemler</h3><p>Sık kullandığın kısayollar</p></div><button type="button" className="admin-dashboard-quick__configure" onClick={editQuickActions}><Settings2 /> Ayarla</button></div>{quickActions.length === 0 ? <button type="button" className="admin-dashboard-quick__empty" onClick={editQuickActions}><Plus /><b>İlk kısayolunu ekle</b><span>Sık kullandığın işlemlere tek tıkla ulaş.</span></button> : <div className="admin-dashboard-quick__grid">{quickActions.map(({ id, label, icon: Icon }) => <button type="button" key={id} onClick={() => onNavigate(id)}><span><Icon /></span><ArrowRight /><b>{label}</b></button>)}</div>}</article>
    </div>

    <div className="admin-dashboard-overview__metrics">
      <button type="button" onClick={() => onNavigate('analytics')} className="admin-dashboard-metric admin-dashboard-metric--coral"><span className="admin-dashboard-metric__icon"><BarChart3 /></span><span className="admin-dashboard-metric__copy"><small>Toplam satış</small><strong>{money(revenue)}</strong><em>{salesDelta === null ? 'Geçen ay karşılaştırması yok' : <>{salesDelta >= 0 ? <TrendingUp /> : <TrendingDown />} Geçen aya göre %{Math.abs(salesDelta)} {salesDelta >= 0 ? 'artış' : 'düşüş'}</>}</em></span><svg className="admin-dashboard-metric__spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><polyline points={sparkPoints} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
      <button type="button" onClick={() => onNavigate('kasa')} className="admin-dashboard-metric admin-dashboard-metric--emerald"><span className="admin-dashboard-metric__icon"><Wallet /></span><span className="admin-dashboard-metric__copy"><small>Tamamlanan satış</small><strong>{money(deliveredRevenue)}</strong><em><CheckCircle2 /> Satışın %{collectionRate}'i tamamlandı</em></span><span className="admin-dashboard-metric__bar" aria-hidden="true"><i style={{ width: `${collectionRate}%` }} /></span></button>
      <button type="button" onClick={onOpenPendingOrders ?? (() => onNavigate('orders'))} className="admin-dashboard-metric admin-dashboard-metric--amber"><span className="admin-dashboard-metric__icon"><ShoppingBag /></span><span className="admin-dashboard-metric__copy"><small>Bekleyen sipariş</small><strong>{pendingOrders}</strong><em>{pendingOrders ? 'Aksiyon bekliyor' : 'Tümü güncel'}</em></span></button>
    </div>

    <div className="admin-dashboard-overview__bottom">
      <article className="admin-dashboard-panel admin-dashboard-chart"><div className="admin-dashboard-panel__heading"><div><h3>Satış performansı</h3><p>Son 6 aylık net sipariş görünümü</p></div><button type="button" onClick={() => onNavigate('analytics')} className="admin-dashboard-text-button">Detaylı analiz <ArrowUpRight size={15} /></button></div><div className="admin-dashboard-chart__value"><strong>{money(revenue)}</strong><span><TrendingUp /> Güncel toplam</span></div><div className="admin-dashboard-chart__plot" aria-label="Son altı aylık satış grafiği"><svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img"><defs><linearGradient id="salesArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#10b981" stopOpacity=".25" /><stop offset="1" stopColor="#10b981" stopOpacity="0" /></linearGradient></defs>{goalLineY !== null && <line x1="0" x2="100" y1={goalLineY} y2={goalLineY} stroke="#059669" strokeWidth="1.2" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />}<path d={`M0,94 L${chartPoints.replaceAll(' ', ' L')} L100,100 L0,100 Z`} fill="url(#salesArea)" /><polyline points={chartPoints} fill="none" stroke="#059669" strokeWidth="2.2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" /></svg><div className="admin-dashboard-chart__labels">{monthlySales.map((item) => <span key={item.label}>{item.label}</span>)}</div></div>{goal > 0 && <p className="admin-dashboard-chart__legend"><i /> Aylık hedef {money(goal)}</p>}</article>
      <article className="admin-dashboard-panel admin-dashboard-recent"><div className="admin-dashboard-panel__heading"><div><h3>Son siparişler</h3><p>En son oluşturulan müşteri siparişleri</p></div><button type="button" onClick={() => onNavigate('orders')} className="admin-dashboard-text-button">Tümünü gör <ArrowRight size={15} /></button></div>{recentOrders.length === 0 ? <div className="admin-dashboard-empty"><ShoppingBag /><b>Henüz sipariş yok</b><span>İlk siparişini oluşturunca burada görünecek.</span><button type="button" className="admin-dashboard-empty__cta" onClick={() => onNavigate('pos')}>İlk satışı başlat</button></div> : <div className="admin-dashboard-orders">{recentOrders.map((order) => { const status = orderStatus[order.status] || { label: order.status, tone: 'slate' }; return <button type="button" key={order.id} onClick={() => onNavigate('orders')} className="admin-dashboard-order"><span className="admin-dashboard-order__number"><b>{order.orderNumber}</b><small>{new Date(order.createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</small></span><span className="admin-dashboard-order__customer"><i>{order.customerName.slice(0, 2).toLocaleUpperCase('tr-TR')}</i><b>{order.customerName}</b></span><strong>{money(Number(order.total) || 0)}</strong><em className={`admin-dashboard-status admin-dashboard-status--${status.tone}`}>{status.label}</em></button>; })}</div>}</article>
    </div>
    </>}
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
