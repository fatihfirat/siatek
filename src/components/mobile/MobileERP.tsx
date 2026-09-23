import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Box,
  FileText,
  Landmark,
  Bell,
  ChevronDown,
  Eye,
  EyeOff,
  Menu,
  Search,
  Sun,
  BarChart3,
  Home,
  Settings,
  Sparkles,
  Truck,
  X,
  ReceiptText,
  ShoppingCart,
  Users,
  WalletCards,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { AdminTab, CariAccount, KasaHareketi, Product } from '../../types';

type Props = {
  userName: string;
  products: Product[];
  cariAccounts: CariAccount[];
  cashMovements: KasaHareketi[];
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  onOpenNotifications?: () => void;
  onToggleTheme?: () => void;
  onOpenAI?: () => void;
  setActive: (name: AdminTab) => void;
  onCreate: () => void;
};

const money = (value: number) => `${Number.isFinite(value) ? value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'} ₺`;
const day = () => new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' }).format(new Date());
const firstName = (name: string) => name.replace(/\s*\([^)]*\)\s*/g, ' ').trim().split(/\s+/)[0] || 'Fatih';
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toLocaleUpperCase('tr-TR');

export function MobileOverview({ userName, products, cariAccounts, cashMovements, loading = false, error = '', onRetry, onOpenNotifications, onToggleTheme, onOpenAI, setActive, onCreate }: Props) {
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [period, setPeriod] = useState<'today' | 'month' | 'year'>('month');
  const receivables = cariAccounts.reduce((sum, cari) => sum + Math.max(Number(cari.balance) || 0, 0), 0);
  const payables = cariAccounts.reduce((sum, cari) => sum + Math.max(-(Number(cari.balance) || 0), 0), 0);
  const net = receivables - payables;
  const now = Date.now();
  const overdue = cariAccounts.filter((cari) => {
    if (cari.balance <= 0 || !cari.lastTransactionDate) return false;
    const dueAt = Date.parse(cari.lastTransactionDate) + Math.max(cari.paymentTermDays || 0, 0) * 86_400_000;
    return Number.isFinite(dueAt) && dueAt < now;
  });
  const overdueTotal = overdue.reduce((sum, cari) => sum + Math.max(cari.balance, 0), 0);
  const lowStock = products.filter((product) => Number(product.stock) <= 5);
  const recentMovements = [...cashMovements].sort((a, b) => Date.parse(b.tarih) - Date.parse(a.tarih)).slice(0, 3);
  const monthTotals = Array.from({ length: 10 }, (_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - (9 - index));
    return cashMovements.filter((movement) => {
      const created = new Date(movement.tarih);
      return created.getMonth() === date.getMonth() && created.getFullYear() === date.getFullYear();
    }).reduce((sum, movement) => sum + (movement.tip === 'giris' ? 1 : -1) * (Number(movement.tutar) || 0), 0);
  });
  const maxMonth = Math.max(...monthTotals.map(Math.abs), 1);
  const currentMonthTotal = monthTotals.at(-1) || 0;

  if (loading) return <MobileOverviewSkeleton />;
  if (error) return <section className="mobile-erp-state" role="alert"><AlertTriangle /><h2>Veriler yüklenemedi</h2><p>{error}</p>{onRetry && <button type="button" onClick={onRetry}>Yeniden dene</button>}</section>;

  return (
    <section className="mobile-erp-overview" aria-label="Alpha Teknik mobil ERP özeti">
      <MobileAdminHeader userName={userName} pendingOrders={0} lowStock={lowStock.length} setActive={setActive} onOpenNotifications={onOpenNotifications} onToggleTheme={onToggleTheme} onOpenAI={onOpenAI} />
      <header className="mobile-erp-welcome">
        <div><small>{day()}</small><h1>Günaydın, {firstName(userName)}</h1><p>Alpha Teknik yönetim özeti</p></div>
        <button type="button" aria-label="Profil ve hesap ayarları" onClick={() => setActive('settings')}><span>{initials(userName)}</span><i /></button>
      </header>

      <article className="mobile-erp-balance">
        <div className="mobile-erp-balance__head"><span><b>Net finansal durum</b><small>Canlı cari verisi</small></span><span className="mobile-erp-balance__tools"><button type="button">TRY <ChevronDown /></button><button type="button" aria-label={balanceVisible ? 'Bakiyeyi gizle' : 'Bakiyeyi göster'} onClick={() => setBalanceVisible((visible) => !visible)}>{balanceVisible ? <><Eye /> Gizle</> : <><EyeOff /> Göster</>}</button></span></div>
        <strong>{balanceVisible ? money(net) : '•••••• ₺'}</strong>
        <div className="mobile-erp-balance__change"><span>Canlı</span> güncel cari bakiyesi</div>
        <div className="mobile-erp-period" aria-label="Finans dönemi">{([['today', 'Bugün'], ['month', 'Bu ay'], ['year', 'Bu yıl']] as const).map(([id, label]) => <button type="button" key={id} aria-pressed={period === id} onClick={() => setPeriod(id)}>{label}</button>)}</div>
        <div className="mobile-erp-balance__split">
          <button type="button" onClick={() => setActive('cariler')}><i className="is-income"><ArrowDownLeft /></i><span>Toplam alacak<b>{money(receivables)}</b></span></button>
          <button type="button" onClick={() => setActive('cariler')}><i className="is-expense"><ArrowUpRight /></i><span>Toplam borç<b>{money(payables)}</b></span></button>
        </div>
      </article>

      <section className="mobile-erp-section">
        <div className="mobile-erp-title"><h2>Hızlı işlemler</h2><button type="button" onClick={onCreate}>Tümü</button></div>
        <div className="mobile-erp-actions">
          <button type="button" onClick={onCreate}><i><ReceiptText /></i><span>Satış</span></button>
          <button type="button" onClick={() => setActive('alis-faturalari')}><i><ShoppingCart /></i><span>Alış</span></button>
          <button type="button" onClick={() => setActive('kasa')}><i><WalletCards /></i><span>Tahsilat</span></button>
          <button type="button" onClick={() => setActive('kasa')}><i><FileText /></i><span>Ödeme</span></button>
        </div>
      </section>

      {overdue.length > 0 ? <button type="button" className="mobile-erp-alert" onClick={() => setActive('cariler')}><span>!</span><span><strong>{money(overdueTotal)} vadesi geçmiş alacak</strong><small>{overdue.length} cari hesap için tahsilat bekleniyor.</small></span><b>İncele <ArrowRight /></b></button> : <div className="mobile-erp-clear"><span>✓</span><span><strong>Geciken alacak yok</strong><small>Cari hesaplar güncel görünüyor.</small></span></div>}

      <section className="mobile-erp-section">
        <div className="mobile-erp-title"><h2>Nakit akışı</h2><button type="button" onClick={() => setActive('kasa')}>Detaylar <ArrowRight /></button></div>
        <article className="mobile-erp-cashflow"><div><span>{new Date().toLocaleDateString('tr-TR', { month: 'long' }).toLocaleUpperCase('tr-TR')}</span><strong className={currentMonthTotal < 0 ? 'is-negative' : ''}>{currentMonthTotal >= 0 ? '+' : ''}{money(currentMonthTotal)}</strong><small>Net nakit akışı</small></div><div className="mobile-erp-bars">{monthTotals.map((value, index) => <i key={index} className={index >= 8 ? 'is-active' : ''} style={{ height: `${Math.max(12, (Math.abs(value) / maxMonth) * 100)}%` }} />)}</div></article>
      </section>

      <section className="mobile-erp-section">
        <div className="mobile-erp-title"><h2>Son hesap hareketleri</h2><button type="button" onClick={() => setActive('orders')}>Tümünü gör</button></div>
        {recentMovements.length === 0 ? <div className="mobile-erp-empty"><ReceiptText /><strong>Henüz hareket yok</strong><span>Kasa hareketleri burada görünecek.</span></div> : <div className="mobile-erp-transactions">{recentMovements.map((movement) => <button type="button" key={movement.id} onClick={() => setActive('kasa')}><i>{initials(movement.cariAdi || 'Alpha Teknik')}</i><span><strong>{movement.cariAdi || movement.aciklama}</strong><small>{movement.aciklama} · {new Date(movement.tarih).toLocaleDateString('tr-TR')}</small></span><b className={movement.tip === 'cikis' ? 'is-expense' : ''}>{movement.tip === 'giris' ? '+' : '-'}{money(Number(movement.tutar) || 0)}</b></button>)}</div>}
      </section>

      <button type="button" className="mobile-erp-stock" onClick={() => setActive('products')}><span><Box /></span><span><strong>{lowStock.length} ürün kritik stokta</strong><small>{lowStock.length ? 'Satın alma planını kontrol edin.' : 'Stok seviyeleri yeterli.'}</small></span><ArrowRight /></button>
    </section>
  );
}

type HeaderProps = Pick<Props, 'userName' | 'setActive' | 'onOpenNotifications' | 'onToggleTheme' | 'onOpenAI'> & { pendingOrders: number; lowStock: number };
export function MobileAdminHeader({ userName, pendingOrders, lowStock, setActive, onOpenNotifications, onToggleTheme, onOpenAI }: HeaderProps) {
  const [open, setOpen] = useState(false);
  useEffect(() => { const show = () => setOpen(true); document.addEventListener('siatek:open-mobile-admin-menu', show); return () => document.removeEventListener('siatek:open-mobile-admin-menu', show); }, []);
  const go = (tab: AdminTab) => { setOpen(false); setActive(tab); };
  const items: Array<[AdminTab, string, typeof Home, number?]> = [['home','Genel Bakış',Home],['orders','Satış',ReceiptText,pendingOrders],['cariler','Cari Hesaplar',Users],['kasa','Kasa / Banka',WalletCards],['products','Stok Yönetimi',Box,lowStock],['alis-faturalari','Satın Alma',ShoppingCart],['invoices','Faturalama',FileText],['analytics','Raporlar',BarChart3],['ops-dispatch','Operasyon',Truck],['settings','Ayarlar',Settings]];
  return <><header className="mobile-erp-appbar"><button type="button" aria-label="Menüyü aç" onClick={() => setOpen(true)}><Menu /></button><span className="mobile-erp-appbar__mark">AT</span><span className="mobile-erp-appbar__company"><small>Çalışma alanı</small><strong>Alpha Teknik</strong></span><button type="button" aria-label="Ara" onClick={() => document.dispatchEvent(new CustomEvent('siatek:open-command-palette'))}><Search /></button><button type="button" aria-label="Temayı değiştir" onClick={onToggleTheme}><Sun /></button><button type="button" aria-label="Bildirimleri aç" onClick={onOpenNotifications}><Bell /><i /></button></header>{open&&<div className="mobile-admin-drawer-backdrop" role="presentation" onClick={() => setOpen(false)}><aside className="mobile-admin-drawer" role="dialog" aria-modal="true" aria-label="Yönetim menüsü" onClick={(event)=>event.stopPropagation()}><header><span>S</span><div><strong>SIATEK</strong><small>İş Yönetim Platformu</small></div><button type="button" aria-label="Menüyü kapat" onClick={()=>setOpen(false)}><X /></button></header><div className="mobile-admin-workspace"><span>AT</span><div><small>Çalışma alanı</small><strong>Alpha Teknik</strong></div></div><small className="mobile-admin-drawer__label">YÖNETİM</small><nav>{items.map(([id,label,Icon,count])=><button type="button" key={id} className={id==='home'?'is-active':''} onClick={()=>go(id)}><Icon/><span>{label}</span>{count? <b>{count}</b>:null}</button>)}</nav><button type="button" className="mobile-admin-ai" onClick={()=>{setOpen(false);onOpenAI?.()}}><Sparkles/><strong>SIATEK AI</strong><small>İşlerinizi hızlandırmak için buradayım.</small><b>Asistana sor</b></button><footer><span>{initials(userName)}</span><div><strong>{userName}</strong><small>Yönetici</small></div></footer></aside></div>}</>;
}

export function MobileCariOverview({ userName, accounts, loading, setActive, onAdd, ...header }: { userName:string; accounts:CariAccount[]; loading?:boolean; setActive:(tab:AdminTab)=>void; onAdd?:()=>void } & Partial<HeaderProps>) {
  const receivables=accounts.reduce((s,c)=>s+Math.max(c.balance,0),0), payables=accounts.reduce((s,c)=>s+Math.max(-c.balance,0),0); const overdue=accounts.filter(c=>c.balance>0&&c.lastTransactionDate&&Date.parse(c.lastTransactionDate)+c.paymentTermDays*86400000<Date.now());
  return <section className="mobile-module"><MobileAdminHeader userName={userName} pendingOrders={header.pendingOrders||0} lowStock={header.lowStock||0} setActive={setActive} onOpenNotifications={header.onOpenNotifications} onToggleTheme={header.onToggleTheme} onOpenAI={header.onOpenAI}/><header className="mobile-module-title"><div><small>CARİ YÖNETİMİ</small><h1>Cari Hesaplar</h1><p>Müşteri bakiyelerini, riskleri ve hesap hareketlerini izleyin.</p></div><button type="button" aria-label="Yeni cari ekle" onClick={onAdd}>+</button></header><div className="mobile-module-kpis"><article><small>Toplam alacak</small><strong>{money(receivables)}</strong><b>Canlı bakiye</b></article><article><small>Vadesi geçen</small><strong>{money(overdue.reduce((s,c)=>s+c.balance,0))}</strong><b className="danger">{overdue.length} hesap</b></article><article><small>Toplam borç</small><strong>{money(payables)}</strong><b>Bakiye</b></article><article><small>Aktif cari</small><strong>{accounts.filter(c=>c.status==='active').length}</strong><b>hesap</b></article></div><section className="mobile-module-list"><nav><b>Tüm cariler</b><span>Borçlu hesaplar</span><span>Alacaklı hesaplar</span></nav><header><div><h2>Tüm cariler</h2><small>{accounts.length} kayıt · Canlı veri</small></div></header>{loading?<MobileOverviewSkeleton/>:accounts.length===0?<div className="mobile-erp-empty"><Users/><strong>Henüz cari yok</strong></div>:accounts.map(c=><button type="button" key={c.id} onClick={()=>setActive('cariler')}><i>{initials(c.companyName)}</i><span><strong>{c.companyName}</strong><small>{c.name} · {money(c.creditLimit)}</small></span><b>{money(Math.abs(c.balance))}<small>{c.balance>=0?'Alacaklı':'Borçlu'}</small></b><ArrowRight/></button>)}</section></section>;
}

export function MobileStockOverview({ userName, products, setActive, onAdd, ...header }: { userName:string; products:Product[]; setActive:(tab:AdminTab)=>void; onAdd?:()=>void } & Partial<HeaderProps>) {
 const low=products.filter(p=>p.stock<=5), value=products.reduce((s,p)=>s+(p.stock||0)*(p.price||0),0); return <section className="mobile-module"><MobileAdminHeader userName={userName} pendingOrders={header.pendingOrders||0} lowStock={low.length} setActive={setActive} onOpenNotifications={header.onOpenNotifications} onToggleTheme={header.onToggleTheme} onOpenAI={header.onOpenAI}/><header className="mobile-module-title"><div><small>STOK & DEPO</small><h1>Stok Yönetimi</h1><p>Ürünleri, depoları ve kritik ikmal süreçlerini yönetin.</p></div><button type="button" aria-label="Yeni ürün ekle" onClick={onAdd}>+</button></header><div className="mobile-module-kpis"><article><small>Stok değeri</small><strong>{money(value)}</strong><b>Canlı değer</b></article><article><small>Toplam ürün</small><strong>{products.length}</strong><b>{products.filter(p=>p.stock>0).length} aktif</b></article><article><small>Kritik stok</small><strong>{low.length}</strong><b className="danger">Aksiyon gerekli</b></article><article><small>Stokta</small><strong>{products.reduce((s,p)=>s+(p.stock||0),0)}</strong><b>birim</b></article></div><section className="mobile-module-list"><nav><b>Ürünler</b><span>Stok hareketleri</span><span>Depolar</span><span>Sayım</span></nav><header><div><h2>Ürünler</h2><small>{products.length} kayıt · Canlı veri</small></div></header>{products.slice(0,12).map(p=><button type="button" key={p.id} onClick={()=>setActive('products')}><i>{p.name[0]}</i><span><strong>{p.sku||p.name}</strong><small>{p.name} · {p.category}</small></span><b>{p.stock} {p.unit}<small className={p.stock<=5?'danger':''}>{p.stock<=5?'Kritik':'Yeterli'}</small></b><ArrowRight/></button>)}</section></section>;
}

export function MobileQuickActionSheet({ open,onClose,onSelect }:{open:boolean;onClose:()=>void;onSelect:(tab:AdminTab)=>void}){if(!open)return null;const actions:Array<[AdminTab,string]>= [['pos','Satış faturası oluştur'],['alis-faturalari','Alış faturası oluştur'],['kasa','Tahsilat kaydet'],['kasa','Ödeme kaydet'],['gider','Gider ekle'],['products','Stok hareketi gir']];return <div className="mobile-quick-backdrop" role="presentation" onClick={onClose}><section className="mobile-quick-sheet" role="dialog" aria-modal="true" aria-labelledby="mobile-quick-title" onClick={e=>e.stopPropagation()}><i/><header><Sparkles/><button type="button" aria-label="Kapat" onClick={onClose}><X/></button></header><h2 id="mobile-quick-title">Hızlı işlem</h2><p>Kaydetmek istediğiniz finansal işlemi seçin.</p><div>{actions.map(([tab,label],index)=><button type="button" key={`${tab}-${label}`} onClick={()=>{onClose();onSelect(tab)}}><small>{String(index+1).padStart(2,'0')}</small><strong>{label}</strong><ArrowRight/></button>)}</div></section></div>}

function MobileOverviewSkeleton() {
  return <section className="mobile-erp-overview mobile-erp-skeleton" aria-label="Yönetim özeti yükleniyor" aria-busy="true"><div className="skeleton-line is-head" /><div className="skeleton-card is-balance" /><div className="skeleton-line" /><div className="skeleton-actions">{[0, 1, 2, 3].map((item) => <i key={item} />)}</div><div className="skeleton-card" /><div className="skeleton-card is-list" /></section>;
}
