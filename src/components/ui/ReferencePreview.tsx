import { useEffect, useState } from 'react';
import { ArrowRight, Package, ShoppingCart, ScanLine, FileText, Truck } from 'lucide-react';
import MobileBottomNav from '../common/MobileBottomNav';
import { Button, SearchInput, QuantityStepper, StatusBadge, Section, KPI, Modal, Select, FeedbackState, Skeleton } from './index';
import './reference.css';

const products = [
  { id: 'VLV-025', name: 'Pirinç küresel vana', detail: 'E.C.A. · 1 inç · Tam geçişli', category: 'Vanalar', stock: 48, price: 285 },
  { id: 'PPR-020', name: 'PPRC dirsek 90°', detail: 'Fırat · 20 mm · PN20', category: 'Bağlantı', stock: 240, price: 12.5 },
  { id: 'RAD-060', name: 'Panel radyatör bağlantı seti', detail: 'Termostatik · 1/2 inç · Beyaz', category: 'Isıtma', stock: 6, price: 890 },
  { id: 'VLV-032', name: 'Filtreli basınç düşürücü ve bağlantı adaptörü', detail: 'E.C.A. · 1¼ inç · Pirinç', category: 'Vanalar', stock: 0, price: 1450 },
];
const money = (n: number) => n.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
type Screen = 'home' | 'catalog' | 'admin';

export default function ReferencePreview() {
  const [screen, setScreen] = useState<Screen>('home');
  const [theme, setTheme] = useState('dark');
  const [state, setState] = useState('ready');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Tümü');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [cart, setCart] = useState<Record<string, number>>({});
  const [dialog, setDialog] = useState('');
  const [message, setMessage] = useState('');
  const admin = screen === 'admin';
  const count = products.reduce((sum: number, product) => sum + (cart[product.id] || 0), 0);
  const total = products.reduce((sum, p) => sum + (cart[p.id] || 0) * p.price, 0);
  useEffect(() => {
    const previous = document.documentElement.dataset.theme;
    document.documentElement.dataset.theme = theme;
    document.body.classList.add('ui-preview-active');
    return () => { if (previous) document.documentElement.dataset.theme = previous; else delete document.documentElement.dataset.theme; document.body.classList.remove('ui-preview-active'); };
  }, [theme]);
  const visible = products.filter(p => (category === 'Tümü' || p.category === category) && `${p.name} ${p.id} ${p.detail}`.toLocaleLowerCase('tr-TR').includes(query.toLocaleLowerCase('tr-TR')));
  const add = (id: string, stock: number) => {
    const amount = Math.min(quantities[id] || 1, stock - (cart[id] || 0));
    if (amount <= 0) return;
    setCart(old => ({ ...old, [id]: (old[id] || 0) + amount }));
    setMessage(`${amount} adet sepete eklendi.`);
  };
  const productList = (items: typeof products) => <div className="reference-products">{items.map(p => {
    const remaining = p.stock - (cart[p.id] || 0);
    return <article className="reference-product" key={p.id}>
      <div className="reference-product-title"><Package aria-hidden="true"/><div><h3>{p.name}</h3><p className="ui-hint">{p.detail}</p><p className="ui-hint">{p.id}</p></div></div>
      <div className="reference-price"><strong>{money(p.price)} <small>/ adet</small></strong><StatusBadge tone={p.stock === 0 ? 'error' : p.stock < 10 ? 'warning' : 'success'}>{p.stock === 0 ? 'Stokta yok' : `${p.stock} adet stokta`}</StatusBadge></div>
      <div className="reference-buy"><QuantityStepper label={`${p.name} miktarı`} value={Math.min(quantities[p.id] || 1, Math.max(remaining, 1))} min={1} max={Math.max(remaining, 1)} disabled={remaining <= 0} onChange={n => setQuantities(old => ({...old, [p.id]: n}))}/><Button disabled={remaining <= 0} onClick={() => add(p.id, p.stock)}><ShoppingCart aria-hidden="true"/>Sepete ekle</Button></div>
      <p className="ui-hint">{cart[p.id] ? `Sepette: ${cart[p.id]} adet` : 'Henüz sepette yok'}</p>
    </article>;
  })}</div>;
  return <div className="ui-scope reference-app">
    <aside className="reference-controls" aria-label="Önizleme kontrolleri"><p>Faz 4C · Örnek veriler</p><Select label="Referans ekran" value={screen} onChange={e => {setScreen(e.target.value as Screen);setState('ready');setDialog('');}}><option value="home">Müşteri ana sayfası</option><option value="catalog">Ürün kataloğu</option><option value="admin">Yönetici ana sayfası</option></Select><Select label="Tema" value={theme} onChange={e => setTheme(e.target.value)}><option value="dark">Koyu</option><option value="light">Açık</option></Select><Select label="Veri durumu" value={state} onChange={e => setState(e.target.value)}><option value="ready">Normal</option><option value="loading">Yükleniyor</option><option value="empty">Boş</option><option value="error">Hata</option><option value="guest">Girişsiz</option></Select></aside>
    <header className="reference-header"><a href="/reference-preview" aria-label="Alpha Teknik ana sayfa">ALPHA <span>TEKNİK</span></a><Button variant="ghost" onClick={() => setDialog(state === 'guest' ? 'Giriş yap' : 'Hesabım')}>{state === 'guest' ? 'Giriş yap' : admin ? 'Yönetici hesabı' : 'Hesabım'}</Button></header>
    <main className="reference-main shell-main" data-has-cart={!admin && count > 0}>
      <div className="reference-heading"><p className="ui-hint">{admin ? 'OPERASYON MERKEZİ' : 'ALPHA TEKNİK'}</p><h1>{screen === 'catalog' ? 'Ürün kataloğu' : admin ? 'Bugünün işleri' : 'İşiniz için gerekenler.'}</h1><p>{admin ? 'Önce bekleyen işler, sonra günün özeti.' : screen === 'catalog' ? 'Ürünü bulun, miktarı seçin, sepetinize ekleyin.' : 'Malzemenizi bulun. Siparişinizi takip edin.'}</p></div>
      {state === 'loading' ? <Section title="Bilgiler yükleniyor"><Skeleton/><Skeleton/><Skeleton/></Section> : state === 'error' ? <FeedbackState kind="error" title="Bilgiler yüklenemedi" description="Bağlantınızı kontrol edip tekrar deneyin." action={<Button onClick={() => setState('ready')}>Tekrar dene</Button>}/> : state === 'guest' && admin ? <FeedbackState kind="unauthorized" title="Giriş gerekli" description="Yönetici alanını görmek için yetkili hesabınızla giriş yapın." action={<Button onClick={() => setDialog('Giriş yap')}>Giriş yap</Button>}/> : <>
      {!admin && <div className="reference-search"><SearchInput value={query} onValueChange={v => {setQuery(v);if(screen !== 'catalog')setScreen('catalog');}}/><Button variant="secondary" onClick={() => setDialog('Barkod okut')}><ScanLine aria-hidden="true"/>Barkod</Button></div>}
      {screen === 'home' && <>
        <Section title="Aktif siparişiniz">{state === 'guest' ? <FeedbackState kind="unauthorized" title="Siparişlerinizi takip edin" description="Sipariş ve teslimat bilgilerinizi görmek için giriş yapın." action={<Button onClick={() => setDialog('Giriş yap')}>Giriş yap</Button>}/> : state === 'empty' ? <FeedbackState kind="empty" title="Aktif siparişiniz yok" description="Yeni siparişiniz için ürünlere göz atabilirsiniz."/> : <div className="reference-active"><div><StatusBadge tone="info">Hazırlanıyor</StatusBadge><h3>SİP-2026-0042</h3><p>8 kalem · {money(4850)}</p><p className="ui-hint">Teslimat: 14 Eylül · 09.00–12.00</p></div><Button variant="secondary" onClick={() => setDialog('Sipariş ayrıntısı')}>Siparişi incele<ArrowRight aria-hidden="true"/></Button></div>}</Section>
        <Section title="Hızlı işlemler"><div className="reference-shortcuts"><Button onClick={() => setScreen('catalog')}><Package aria-hidden="true"/>Ürünleri bul</Button><Button variant="secondary" onClick={() => setDialog('Teklif iste')}><FileText aria-hidden="true"/>Teklif iste</Button><Button variant="secondary" onClick={() => setDialog(state === 'guest' ? 'Giriş yap' : 'Siparişlerim')}><Truck aria-hidden="true"/>Siparişlerim</Button></div></Section>
        <Section title={state === 'guest' || state === 'empty' ? 'Ürünlere göz atın' : 'Sık aldığınız ürünler'}>{productList(products.slice(0,2))}</Section>
      </>}
      {screen === 'catalog' && <Section title="Malzemeler"><div className="reference-filters" aria-label="Kategoriler">{['Tümü','Vanalar','Bağlantı','Isıtma'].map(c => <Button key={c} variant={category === c ? 'primary' : 'secondary'} aria-pressed={category === c} onClick={() => setCategory(c)}>{c}</Button>)}</div><p className="ui-hint" role="status">{state === 'empty' ? 0 : visible.length} ürün · Fiyatlara KDV dahildir</p>{state === 'empty' || visible.length === 0 ? <FeedbackState kind="empty" title="Ürün bulunamadı" description="Başka bir kelime deneyin veya filtreleri temizleyin." action={<Button variant="secondary" onClick={() => {setQuery('');setCategory('Tümü');setState('ready');}}>Filtreleri temizle</Button>}/> : productList(visible)}</Section>}
      {admin && <>
        <Section title="Bugünün özeti"><div className="reference-kpis"><KPI label="Bugünkü satış" value={state === 'empty' ? money(0) : money(24850)}/><KPI label="Yeni sipariş" value={state === 'empty' ? '0' : '12'}/><KPI label="Bekleyen teklif" value={state === 'empty' ? '0' : '4'}/><KPI label="Kritik stok" value={state === 'empty' ? '0' : '7 ürün'}/></div></Section>
        <Section title="İşlem bekleyenler">{state === 'empty' ? <FeedbackState kind="empty" title="Bekleyen iş yok" description="Yeni işler burada görünecek."/> : <div className="reference-tasks">{[['6 sipariş onay bekliyor','Müşterileriniz yanıt bekliyor.','Siparişleri incele'],['3 teslimata personel atanmalı','Hazırlanan siparişler çıkış bekliyor.','Teslimatları incele'],['7 ürün kritik stokta','Tedarik gerektiren ürünleri kontrol edin.','Stokları incele']].map(([title,description,action]) => <article key={title}><div><h3>{title}</h3><p className="ui-hint">{description}</p></div><Button variant="secondary" onClick={() => setDialog(action)}>{action}<ArrowRight aria-hidden="true"/></Button></article>)}</div>}</Section>
        <Section title="Hızlı işlemler"><div className="reference-shortcuts"><Button onClick={() => setDialog('Hızlı POS')}>Hızlı POS</Button>{['Barkod okut','Yeni sipariş','Stok say'].map(label => <Button key={label} variant="secondary" onClick={() => setDialog(label)}>{label}</Button>)}</div></Section>
        <Section title="Son işlemler">{state === 'empty' ? <p>Henüz işlem yok.</p> : <div className="reference-tasks"><article><div><h3>SİP-2026-0041</h3><p className="ui-hint">Örnek Mekanik Tesisat · 14.32</p></div><StatusBadge tone="success">Teslim edildi</StatusBadge><strong>{money(3250)}</strong></article><article><div><h3>SİP-2026-0040</h3><p className="ui-hint">Örnek Yapı · 14.18</p></div><StatusBadge tone="info">Hazırlanıyor</StatusBadge><strong>{money(1680)}</strong></article></div>}</Section>
      </>}
      </>}
      <p className="reference-feedback" role="status" aria-live="polite">{message}</p>
    </main>
    {!admin && count > 0 && <div className="reference-cart shell-preview-cart"><div><strong>{money(total)}</strong><p className="ui-hint">{count} adet ürün</p></div><Button onClick={() => setDialog('Sepet')}>Sepeti incele<ArrowRight aria-hidden="true"/></Button></div>}
    <MobileBottomNav currentRole={admin ? 'admin' : 'customer'} activeNav={screen === 'catalog' ? 'catalog' : 'home'} cartItemCount={count} onNavChange={next => {if(next === 'home')setScreen(admin ? 'admin' : 'home');else if(next === 'catalog')setScreen('catalog');else setDialog(next === 'cart' ? 'Sepet' : next === 'pos' ? 'Hızlı POS' : next === 'orders' ? state === 'guest' ? 'Giriş yap' : 'Siparişlerim' : next === 'products' ? 'Stoklar' : 'Hesabım');}}/>
    <Modal open={!!dialog} title={dialog} onClose={() => setDialog('')}>
      {dialog === 'Sepet' ? <>{count ? <>{products.filter(p => cart[p.id]).map(p => <article className="reference-cart-item" key={p.id}><div><h3>{p.name}</h3><p>{cart[p.id]} adet · {money(p.price * cart[p.id])}</p></div><Button variant="ghost" aria-label={`${p.name} sepetten çıkar`} onClick={() => setCart(old => {const next = {...old};delete next[p.id];return next;})}>Çıkar</Button></article>)}<p><strong>Toplam: {money(total)}</strong></p></> : <p>Sepetiniz boş.</p>}<p className="ui-hint">Örnek sepet. Gerçek sipariş oluşturulmaz.</p></> : <><p>Bu işlem sonraki fazda ayrıntılandırılacak.</p><p className="ui-hint">Referans ekran · Örnek veriler. Gerçek işlem yapılmaz.</p></>}
    </Modal>
  </div>;
}
